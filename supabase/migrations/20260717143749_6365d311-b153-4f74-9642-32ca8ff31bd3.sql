
CREATE TABLE public.leadership_dashboard_snapshots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cycle_number INTEGER NOT NULL DEFAULT 1,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.leadership_dashboard_snapshots TO authenticated;
GRANT ALL ON public.leadership_dashboard_snapshots TO service_role;

ALTER TABLE public.leadership_dashboard_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own dashboard snapshots"
  ON public.leadership_dashboard_snapshots FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Coaches read all dashboard snapshots"
  ON public.leadership_dashboard_snapshots FOR SELECT
  USING (public.has_role(auth.uid(), 'coach'::app_role));

CREATE INDEX idx_lds_user_created ON public.leadership_dashboard_snapshots(user_id, created_at DESC);

CREATE TRIGGER set_lds_updated_at
  BEFORE UPDATE ON public.leadership_dashboard_snapshots
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
