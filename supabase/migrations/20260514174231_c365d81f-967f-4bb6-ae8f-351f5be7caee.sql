
-- 1. Add phone, first_name, last_name to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS first_name text,
  ADD COLUMN IF NOT EXISTS last_name text;

-- 2. Add primary_gap/secondary_gap/report fields to assessment_sessions
ALTER TABLE public.assessment_sessions
  ADD COLUMN IF NOT EXISTS primary_gap text,
  ADD COLUMN IF NOT EXISTS primary_gap_score integer,
  ADD COLUMN IF NOT EXISTS primary_gap_level text,
  ADD COLUMN IF NOT EXISTS secondary_gap text,
  ADD COLUMN IF NOT EXISTS secondary_gap_score integer,
  ADD COLUMN IF NOT EXISTS overall_level text;

-- 3. Comprehensive gap report (one per user, regenerated each time)
CREATE TABLE IF NOT EXISTS public.gap_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  report_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  pdf_path text,
  primary_gap text,
  primary_gap_level text,
  inner_capacity_score integer,
  inner_capacity_level text,
  leadership_score integer,
  business_score integer,
  ghl_sent_at timestamptz,
  generated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.gap_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users read own report" ON public.gap_reports
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "users insert own report" ON public.gap_reports
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "users update own report" ON public.gap_reports
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "coaches read all reports" ON public.gap_reports
  FOR SELECT USING (public.has_role(auth.uid(), 'coach'::app_role));

-- 4. App settings (singleton row managed by coach)
CREATE TABLE IF NOT EXISTS public.app_settings (
  id integer PRIMARY KEY DEFAULT 1,
  ghl_webhook_url text,
  ghl_enabled boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT only_one_row CHECK (id = 1)
);
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "coaches read settings" ON public.app_settings
  FOR SELECT USING (public.has_role(auth.uid(), 'coach'::app_role));
CREATE POLICY "coaches upsert settings" ON public.app_settings
  FOR ALL USING (public.has_role(auth.uid(), 'coach'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'coach'::app_role));

INSERT INTO public.app_settings (id, ghl_enabled) VALUES (1, false)
  ON CONFLICT (id) DO NOTHING;

-- 5. Update handle_new_user to capture phone, first/last name
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, first_name, last_name, phone)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'last_name',
    NEW.raw_user_meta_data->>'phone'
  );
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'assessee');
  INSERT INTO public.assessee_status (assessee_id, status)
  VALUES (NEW.id, 'New');
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 6. Private storage bucket for generated PDFs
INSERT INTO storage.buckets (id, name, public)
VALUES ('reports', 'reports', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "users read own reports" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'reports'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
CREATE POLICY "users upload own reports" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'reports'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
CREATE POLICY "users update own reports" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'reports'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
CREATE POLICY "coaches read all reports storage" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'reports'
    AND public.has_role(auth.uid(), 'coach'::app_role)
  );

-- 7. Clear old assessment_sessions rows because the scoring scale has changed
-- (old rows used 0-100; new rows use sum-based scoring)
DELETE FROM public.assessment_sessions;
