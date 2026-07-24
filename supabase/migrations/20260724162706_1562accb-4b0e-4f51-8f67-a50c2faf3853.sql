
CREATE TABLE public.daily_habit_checks (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  habit_key TEXT NOT NULL,
  check_date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, habit_key, check_date)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.daily_habit_checks TO authenticated;
GRANT ALL ON public.daily_habit_checks TO service_role;
ALTER TABLE public.daily_habit_checks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own habit checks" ON public.daily_habit_checks
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.weekly_action_state (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action_key TEXT NOT NULL,
  done_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  carried_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, action_key)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.weekly_action_state TO authenticated;
GRANT ALL ON public.weekly_action_state TO service_role;
ALTER TABLE public.weekly_action_state ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own action state" ON public.weekly_action_state
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER weekly_action_state_updated_at
  BEFORE UPDATE ON public.weekly_action_state
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
