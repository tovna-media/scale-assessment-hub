-- Organizations / team signup: data model only (PR 1 of the org-signup build).
-- No signup UI, checkout, or portal yet -- those are later PRs. This lands the
-- schema so PR 2+ have a stable table to build against.
--
-- Submitter auth model (locked decision): the org submitter is a lightweight
-- credential pair (email + password_hash) living directly on the organizations
-- row -- there is exactly one submitter per org, so a separate table would be
-- pure ceremony. They are NOT a row in profiles/auth.users, which keeps them
-- out of every member-facing query by construction rather than a role check
-- that could be missed. Portal login (built in a later PR) will verify the
-- hash server-side via the service-role client and mint its own session --
-- it does not go through Supabase Auth.

CREATE TABLE IF NOT EXISTS public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  submitter_full_name TEXT NOT NULL,
  submitter_email TEXT NOT NULL,
  submitter_password_hash TEXT NOT NULL,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- One org portal login per submitter email.
CREATE UNIQUE INDEX IF NOT EXISTS idx_organizations_submitter_email
  ON public.organizations (lower(submitter_email));

CREATE TRIGGER trg_organizations_updated
  BEFORE UPDATE ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Roster of an org's team. A row exists from the moment someone is added to
-- the list (invited), through account creation (active), through removal
-- (removed -- kept for history, never deleted). profile_id is null until the
-- invited person creates/merges their account; email/full_name are the
-- source of truth for who's invited until then.
CREATE TABLE IF NOT EXISTS public.organization_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'invited' CHECK (status IN ('invited', 'active', 'removed')),
  invited_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  joined_at TIMESTAMPTZ,
  removed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_organization_members_org
  ON public.organization_members (organization_id);

CREATE INDEX IF NOT EXISTS idx_organization_members_profile
  ON public.organization_members (profile_id);

-- A currently-invited-or-active email can only sit on one org's roster at a
-- time (removed rows are excluded, so the same email can be re-invited to a
-- different org later without hitting this).
CREATE UNIQUE INDEX IF NOT EXISTS idx_organization_members_active_email
  ON public.organization_members (lower(email))
  WHERE status <> 'removed';

-- Same guarantee once an invite resolves to an actual account: a profile
-- can't be on two orgs' active rosters simultaneously.
CREATE UNIQUE INDEX IF NOT EXISTS idx_organization_members_active_profile
  ON public.organization_members (profile_id)
  WHERE status <> 'removed' AND profile_id IS NOT NULL;

CREATE TRIGGER trg_organization_members_updated
  BEFORE UPDATE ON public.organization_members
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- RLS: writes only ever happen server-side (signup, payment webhook, portal
-- actions, coach admin actions all go through server functions using the
-- service-role client -- same pattern as member removal elsewhere in this
-- app). Coaches get direct read access for the /coach admin section; no
-- other authenticated or anon access is granted.

GRANT ALL ON public.organizations TO service_role;
GRANT ALL ON public.organization_members TO service_role;

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Service role can manage organizations"
    ON public.organizations FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Service role can manage organization members"
    ON public.organization_members FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "coaches read all organizations" ON public.organizations
    FOR SELECT TO authenticated
    USING (public.has_role(auth.uid(), 'coach'::public.app_role));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "coaches read all organization members" ON public.organization_members
    FOR SELECT TO authenticated
    USING (public.has_role(auth.uid(), 'coach'::public.app_role));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
