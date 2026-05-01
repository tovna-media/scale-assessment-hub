
-- Enums
CREATE TYPE public.app_role AS ENUM ('assessee', 'coach');
CREATE TYPE public.assessment_type AS ENUM ('inner_capacity', 'personal_leadership', 'business_audit');
CREATE TYPE public.assessee_pipeline_status AS ENUM ('New', 'Contacted', 'Booked', 'Client');

-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- User roles (separate table to avoid privilege escalation)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Assessment sessions
CREATE TABLE public.assessment_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assessment_type public.assessment_type NOT NULL,
  responses JSONB NOT NULL DEFAULT '{}'::jsonb,
  subcategory_scores JSONB NOT NULL DEFAULT '{}'::jsonb,
  overall_score INTEGER NOT NULL DEFAULT 0,
  gap_report TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.assessment_sessions ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_sessions_user ON public.assessment_sessions(user_id, created_at DESC);

-- Coach notes
CREATE TABLE public.coach_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessee_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  coach_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  note TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.coach_notes ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_notes_assessee ON public.coach_notes(assessee_id, created_at DESC);

-- Assessee pipeline status (one current per assessee)
CREATE TABLE public.assessee_status (
  assessee_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  status public.assessee_pipeline_status NOT NULL DEFAULT 'New',
  coach_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.assessee_status ENABLE ROW LEVEL SECURITY;

-- ===== RLS POLICIES =====

-- profiles: user can read own; coach reads all
CREATE POLICY "users read own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "coaches read all profiles" ON public.profiles
  FOR SELECT USING (public.has_role(auth.uid(), 'coach'));
CREATE POLICY "users update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "users insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- user_roles: read own; coach reads all; coach writes
CREATE POLICY "users read own role" ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "coaches read all roles" ON public.user_roles
  FOR SELECT USING (public.has_role(auth.uid(), 'coach'));
CREATE POLICY "coaches manage roles" ON public.user_roles
  FOR ALL USING (public.has_role(auth.uid(), 'coach'))
  WITH CHECK (public.has_role(auth.uid(), 'coach'));

-- assessment_sessions: assessee CRUD own; coach reads all
CREATE POLICY "users read own sessions" ON public.assessment_sessions
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "users insert own sessions" ON public.assessment_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "users update own sessions" ON public.assessment_sessions
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "coaches read all sessions" ON public.assessment_sessions
  FOR SELECT USING (public.has_role(auth.uid(), 'coach'));

-- coach_notes: only coaches
CREATE POLICY "coaches read notes" ON public.coach_notes
  FOR SELECT USING (public.has_role(auth.uid(), 'coach'));
CREATE POLICY "coaches insert notes" ON public.coach_notes
  FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'coach') AND coach_id = auth.uid());
CREATE POLICY "coaches update own notes" ON public.coach_notes
  FOR UPDATE USING (public.has_role(auth.uid(), 'coach') AND coach_id = auth.uid());

-- assessee_status: coaches manage
CREATE POLICY "coaches read status" ON public.assessee_status
  FOR SELECT USING (public.has_role(auth.uid(), 'coach'));
CREATE POLICY "coaches upsert status" ON public.assessee_status
  FOR ALL USING (public.has_role(auth.uid(), 'coach'))
  WITH CHECK (public.has_role(auth.uid(), 'coach'));
-- Assessees can read their own status (optional but useful)
CREATE POLICY "users read own status" ON public.assessee_status
  FOR SELECT USING (auth.uid() = assessee_id);

-- ===== Trigger: auto-create profile + assessee role on signup =====
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', '')
  );
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'assessee');
  INSERT INTO public.assessee_status (assessee_id, status)
  VALUES (NEW.id, 'New');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- updated_at trigger for coach_notes
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_coach_notes_updated
  BEFORE UPDATE ON public.coach_notes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_assessee_status_updated
  BEFORE UPDATE ON public.assessee_status
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
