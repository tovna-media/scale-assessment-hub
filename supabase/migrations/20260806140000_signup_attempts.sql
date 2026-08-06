-- IP-based rate limiting for signup.
--
-- signupUser calls supabaseAdmin.auth.admin.createUser() directly, which
-- bypasses Supabase Auth's normal signup rate-limiting. This table lets the
-- server function enforce its own cap (see src/lib/rate-limit.server.ts).
--
-- Service-role only: RLS is enabled with no policies, so it can only be
-- read or written through the trusted server path (supabaseAdmin).

CREATE TABLE IF NOT EXISTS public.signup_attempts (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  ip TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS signup_attempts_ip_created_at_idx
  ON public.signup_attempts (ip, created_at DESC);

ALTER TABLE public.signup_attempts ENABLE ROW LEVEL SECURITY;
