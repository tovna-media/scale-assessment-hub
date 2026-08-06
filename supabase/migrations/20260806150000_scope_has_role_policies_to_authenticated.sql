-- PHASE 1 of 2 (scoping only -- non-destructive). The anon EXECUTE revoke is a
-- separate follow-up migration: 20260806150100_revoke_has_role_execute_from_anon.sql
--
-- Scope every has_role() RLS policy to the `authenticated` role.
--
-- Why: public.has_role(uuid, app_role) is SECURITY DEFINER and is currently
-- EXECUTE-able by anon. Lovable's linter flags that, and the eventual fix is to
-- revoke anon's EXECUTE (phase 2). The naive fix (REVOKE alone) was tried once
-- and broke the app, because none of the coach policies below were scoped with
-- `TO authenticated`. A permissive policy with no role restriction applies to
-- EVERY role, including anon, so on an anonymous request Postgres still
-- evaluates the policy's USING/WITH CHECK expression -- which calls has_role --
-- for every candidate row. With anon's EXECUTE revoked, that evaluation would
-- raise "permission denied for function has_role" instead of silently returning
-- zero rows. A logged-out visitor would hit this the moment any anon-reachable
-- query touches one of these tables.
--
-- This phase recreates each has_role policy with `TO authenticated`. Postgres
-- then never evaluates these policies (and never calls has_role) for an anon
-- request, so anon simply sees zero rows via the remaining owner policies,
-- exactly as before. This change removes no one's access -- it only narrows
-- which SQL role each policy is evaluated for. Once this lands and anon reads
-- are confirmed still empty (not errors), phase 2 revokes anon's EXECUTE safely.
--
-- Predicates are reproduced verbatim from the original migrations; the ONLY
-- change per policy is the added `TO authenticated`. This also covers three
-- tables beyond the original hardening list -- funnel_events,
-- optimizer_section_progress, leadership_dashboard_snapshots -- which carry the
-- same unscoped has_role pattern and would otherwise break under the revoke.
-- (subscriptions already scopes its coach policy TO authenticated, so it is
-- left untouched. redemption_codes is intentionally omitted: it is dropped by
-- 20260806120000_drop_leaders_edge_redemption_codes.sql, which is applied first.)

BEGIN;

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "coaches read all profiles" ON public.profiles;
CREATE POLICY "coaches read all profiles" ON public.profiles
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'coach'::public.app_role));

-- ---------------------------------------------------------------------------
-- user_roles
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "coaches read all roles" ON public.user_roles;
CREATE POLICY "coaches read all roles" ON public.user_roles
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'coach'::public.app_role));

DROP POLICY IF EXISTS "coaches insert roles" ON public.user_roles;
CREATE POLICY "coaches insert roles" ON public.user_roles
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'coach'::public.app_role));

DROP POLICY IF EXISTS "coaches update roles" ON public.user_roles;
CREATE POLICY "coaches update roles" ON public.user_roles
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'coach'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'coach'::public.app_role));

DROP POLICY IF EXISTS "coaches delete roles" ON public.user_roles;
CREATE POLICY "coaches delete roles" ON public.user_roles
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'coach'::public.app_role));

DROP POLICY IF EXISTS "restrict role inserts to coaches" ON public.user_roles;
CREATE POLICY "restrict role inserts to coaches" ON public.user_roles
  AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'coach'::public.app_role));

DROP POLICY IF EXISTS "restrict role updates to coaches" ON public.user_roles;
CREATE POLICY "restrict role updates to coaches" ON public.user_roles
  AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'coach'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'coach'::public.app_role));

-- ---------------------------------------------------------------------------
-- assessment_sessions
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "coaches read all sessions" ON public.assessment_sessions;
CREATE POLICY "coaches read all sessions" ON public.assessment_sessions
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'coach'::public.app_role));

-- ---------------------------------------------------------------------------
-- coach_notes
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "coaches read notes" ON public.coach_notes;
CREATE POLICY "coaches read notes" ON public.coach_notes
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'coach'::public.app_role));

DROP POLICY IF EXISTS "coaches insert notes" ON public.coach_notes;
CREATE POLICY "coaches insert notes" ON public.coach_notes
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'coach'::public.app_role) AND coach_id = auth.uid());

DROP POLICY IF EXISTS "coaches update own notes" ON public.coach_notes;
CREATE POLICY "coaches update own notes" ON public.coach_notes
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'coach'::public.app_role) AND coach_id = auth.uid());

-- ---------------------------------------------------------------------------
-- assessee_status
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "coaches read status" ON public.assessee_status;
CREATE POLICY "coaches read status" ON public.assessee_status
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'coach'::public.app_role));

DROP POLICY IF EXISTS "coaches upsert status" ON public.assessee_status;
CREATE POLICY "coaches upsert status" ON public.assessee_status
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'coach'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'coach'::public.app_role));

-- ---------------------------------------------------------------------------
-- gap_reports
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "coaches read all reports" ON public.gap_reports;
CREATE POLICY "coaches read all reports" ON public.gap_reports
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'coach'::public.app_role));

-- ---------------------------------------------------------------------------
-- app_settings
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "coaches read settings" ON public.app_settings;
CREATE POLICY "coaches read settings" ON public.app_settings
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'coach'::public.app_role));

DROP POLICY IF EXISTS "coaches upsert settings" ON public.app_settings;
CREATE POLICY "coaches upsert settings" ON public.app_settings
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'coach'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'coach'::public.app_role));

-- ---------------------------------------------------------------------------
-- storage.objects (reports bucket)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "coaches read all reports storage" ON storage.objects;
CREATE POLICY "coaches read all reports storage" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'reports'
    AND public.has_role(auth.uid(), 'coach'::public.app_role)
  );

DROP POLICY IF EXISTS "owners or coaches delete reports" ON storage.objects;
CREATE POLICY "owners or coaches delete reports" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'reports'
    AND (
      auth.uid()::text = (storage.foldername(name))[1]
      OR public.has_role(auth.uid(), 'coach'::public.app_role)
    )
  );

-- ---------------------------------------------------------------------------
-- funnel_events  (not in the original list, same unscoped pattern)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "coaches read all funnel events" ON public.funnel_events;
CREATE POLICY "coaches read all funnel events" ON public.funnel_events
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'coach'::public.app_role));

-- ---------------------------------------------------------------------------
-- optimizer_section_progress  (not in the original list, same pattern)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Coaches can view all progress" ON public.optimizer_section_progress;
CREATE POLICY "Coaches can view all progress" ON public.optimizer_section_progress
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'coach'::public.app_role));

-- ---------------------------------------------------------------------------
-- leadership_dashboard_snapshots  (not in the original list, same pattern)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Coaches read all dashboard snapshots" ON public.leadership_dashboard_snapshots;
CREATE POLICY "Coaches read all dashboard snapshots" ON public.leadership_dashboard_snapshots
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'coach'::public.app_role));

-- redemption_codes is intentionally not handled here: it is dropped by
-- 20260806120000_drop_leaders_edge_redemption_codes.sql (applied before this),
-- so its "coaches read redemption codes" policy no longer exists.

COMMIT;
