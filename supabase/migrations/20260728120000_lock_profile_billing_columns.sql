-- Lock down billing-sensitive profile columns.
--
-- profiles.free_pass_used and profiles.subscribed are access-control flags.
-- free_pass_used is read directly by the free-pass gate (report generation),
-- and both are written only by trusted server code (the Stripe webhook and
-- report generation, which use the service_role client, plus the internal
-- sync_profile_subscribed trigger).
--
-- The existing RLS policy "users update own profile" (USING auth.uid() = id)
-- lets an authenticated user UPDATE ANY column of their own profile row via the
-- client anon key — including resetting free_pass_used back to false to mint
-- unlimited free gap reports, or flipping subscribed. This BEFORE UPDATE guard
-- forces those two columns back to their previous values for client roles
-- (authenticated / anon) while leaving all server/internal roles untouched, so
-- legitimate profile edits (name, etc.) still succeed.

CREATE OR REPLACE FUNCTION public.enforce_profile_billing_guard()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- PostgREST runs client requests as the 'authenticated' or 'anon' role.
  -- The webhook, report generation, and internal triggers run as other roles
  -- (service_role / postgres) and are allowed to change these flags.
  IF current_user IN ('authenticated', 'anon') THEN
    NEW.free_pass_used := OLD.free_pass_used;
    NEW.subscribed := OLD.subscribed;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_guard_billing_columns ON public.profiles;
CREATE TRIGGER profiles_guard_billing_columns
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.enforce_profile_billing_guard();
