
CREATE TABLE public.optimizer_section_progress (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  section_number INT NOT NULL,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  priority_gap TEXT,
  priority_gap_score INT,
  completed BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, section_number)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.optimizer_section_progress TO authenticated;
GRANT ALL ON public.optimizer_section_progress TO service_role;

ALTER TABLE public.optimizer_section_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members manage own progress"
  ON public.optimizer_section_progress FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Coaches can view all progress"
  ON public.optimizer_section_progress FOR SELECT
  USING (public.has_role(auth.uid(), 'coach'::app_role));

CREATE TRIGGER trg_optimizer_updated_at
  BEFORE UPDATE ON public.optimizer_section_progress
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
