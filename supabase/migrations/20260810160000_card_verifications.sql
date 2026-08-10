-- Tracks the $1 authorize-and-cancel card verification run once per Stripe
-- subscription, the first time a brand-new card is used to start a paid
-- subscription (new signup, or an existing free member upgrading with a new
-- card). Keyed by stripe_subscription_id so every caller that might see this
-- subscription (the synchronous checkout-return resolver and the Stripe
-- webhook, which can race) converges on the same pass/fail decision instead
-- of running the $1 auth more than once. user_id is stamped for the
-- authenticated upgrade path so the client can poll for a failure and show
-- an on-page error instead of hanging on "activating your account".
CREATE TABLE IF NOT EXISTS public.card_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_subscription_id TEXT NOT NULL UNIQUE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  payment_method_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'passed', 'failed')),
  checks JSONB,
  reason TEXT,
  checked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT ALL ON public.card_verifications TO service_role;

ALTER TABLE public.card_verifications ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Service role can read card verifications"
    ON public.card_verifications FOR SELECT
    USING (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Service role can insert card verifications"
    ON public.card_verifications FOR INSERT
    WITH CHECK (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Service role can update card verifications"
    ON public.card_verifications FOR UPDATE
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Signed-in members poll their own verification outcome from the client
-- (checkout/activating.tsx) using their normal RLS-scoped session — never
-- the service-role admin client.
DO $$ BEGIN
  CREATE POLICY "Users can read their own card verifications"
    ON public.card_verifications FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_card_verifications_subscription ON public.card_verifications(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_card_verifications_user ON public.card_verifications(user_id);
