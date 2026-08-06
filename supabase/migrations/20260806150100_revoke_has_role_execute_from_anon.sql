-- PHASE 2 of 2. Revoke anon's EXECUTE on has_role.
--
-- Prerequisite: 20260806150000_scope_has_role_policies_to_authenticated.sql must
-- be applied first, AND anon reads against every affected table must be verified
-- to still return empty results (not errors). Only then is this safe: no
-- anon-applicable RLS policy references has_role anymore, so anon never needs to
-- execute it. authenticated and service_role keep EXECUTE -- they are the only
-- callers that legitimately evaluate the coach policies.
--
-- Rollback if anything breaks after this:
--   GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO anon;

REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;
