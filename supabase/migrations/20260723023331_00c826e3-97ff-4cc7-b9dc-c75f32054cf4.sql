
-- Restrict writes to optimizer_section_progress to active subscribers only.
-- Free members (including those who used their free pass) can still SELECT
-- their prior rows (needed for eligibility calculations), but cannot insert
-- or update section progress. Only paid members can work through the 12
-- Optimized Leader Guide sections.

DROP POLICY IF EXISTS "Members manage own progress" ON public.optimizer_section_progress;

CREATE POLICY "Members read own progress"
  ON public.optimizer_section_progress FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Subscribers insert own progress"
  ON public.optimizer_section_progress FOR INSERT
  WITH CHECK (auth.uid() = user_id AND public.has_active_subscription(auth.uid()));

CREATE POLICY "Subscribers update own progress"
  ON public.optimizer_section_progress FOR UPDATE
  USING (auth.uid() = user_id AND public.has_active_subscription(auth.uid()))
  WITH CHECK (auth.uid() = user_id AND public.has_active_subscription(auth.uid()));

CREATE POLICY "Subscribers delete own progress"
  ON public.optimizer_section_progress FOR DELETE
  USING (auth.uid() = user_id AND public.has_active_subscription(auth.uid()));
