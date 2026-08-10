-- Short-lived mutex so only one concurrent caller of handleCheckoutCompleted
-- (the synchronous checkout-return resolver and the checkout.session.completed
-- webhook both invoke it independently for the same real-world signup, and
-- can race within the same second) actually resolves the account. A losing
-- caller polls for the winner's result instead of redoing account creation
-- itself, which could otherwise land it in the "existing account" branch for
-- a brand-new signup and send a paid-activation email before any password
-- was ever set. Rows are deleted the moment their claim is released (success,
-- blocked, or error) — this table only ever holds in-flight claims, not
-- history. Only ever touched by the service-role admin client.
CREATE TABLE IF NOT EXISTS public.checkout_completion_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_subscription_id TEXT NOT NULL UNIQUE,
  claimed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT ALL ON public.checkout_completion_claims TO service_role;

ALTER TABLE public.checkout_completion_claims ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Service role can read checkout completion claims"
    ON public.checkout_completion_claims FOR SELECT
    USING (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Service role can insert checkout completion claims"
    ON public.checkout_completion_claims FOR INSERT
    WITH CHECK (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Service role can delete checkout completion claims"
    ON public.checkout_completion_claims FOR DELETE
    USING (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_checkout_completion_claims_subscription ON public.checkout_completion_claims(stripe_subscription_id);
