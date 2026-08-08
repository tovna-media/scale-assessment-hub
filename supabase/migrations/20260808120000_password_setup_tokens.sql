-- One-time, single-use tokens for the brand-new-paid-signup "set your password"
-- step (replaces the magic-link email for that path). Expiry mirrors Supabase's
-- own default magic-link/OTP expiry (1 hour). Only ever read/written via the
-- service-role admin client from server functions/webhook — no anon or
-- authenticated policies are granted.
CREATE TABLE IF NOT EXISTS public.password_setup_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token TEXT NOT NULL UNIQUE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  checkout_session_id TEXT,
  email TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT ALL ON public.password_setup_tokens TO service_role;

ALTER TABLE public.password_setup_tokens ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Service role can read setup tokens"
    ON public.password_setup_tokens FOR SELECT
    USING (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Service role can insert setup tokens"
    ON public.password_setup_tokens FOR INSERT
    WITH CHECK (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Service role can mark setup tokens as used"
    ON public.password_setup_tokens FOR UPDATE
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_password_setup_tokens_token ON public.password_setup_tokens(token);
CREATE INDEX IF NOT EXISTS idx_password_setup_tokens_checkout_session ON public.password_setup_tokens(checkout_session_id);
