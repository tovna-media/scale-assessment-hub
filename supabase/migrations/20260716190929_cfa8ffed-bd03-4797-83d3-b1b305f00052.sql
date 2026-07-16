
-- 1. Free pass + subscription flags on profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS free_pass_used boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS subscribed boolean NOT NULL DEFAULT false;

-- Backfill: anyone with an existing gap_reports row has already used their free pass.
UPDATE public.profiles p
SET free_pass_used = true
WHERE EXISTS (SELECT 1 FROM public.gap_reports g WHERE g.user_id = p.id);

-- 2. Funnel events table
CREATE TABLE IF NOT EXISTS public.funnel_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_funnel_events_user_created
  ON public.funnel_events(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_funnel_events_type_created
  ON public.funnel_events(event_type, created_at DESC);

GRANT SELECT, INSERT ON public.funnel_events TO authenticated;
GRANT ALL ON public.funnel_events TO service_role;

ALTER TABLE public.funnel_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users insert own funnel events"
  ON public.funnel_events FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users read own funnel events"
  ON public.funnel_events FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "coaches read all funnel events"
  ON public.funnel_events FOR SELECT
  USING (public.has_role(auth.uid(), 'coach'::app_role));
