// Shared StripeEnv type used by both client and server (no runtime code).
export type StripeEnv = 'sandbox' | 'live';

export function paymentsEnvironmentFromToken(token: string | undefined): StripeEnv {
  if (token?.startsWith('pk_test_')) return 'sandbox';
  if (token?.startsWith('pk_live_')) return 'live';
  throw new Error(
    'Stripe payments are not configured for this build. Complete Stripe go-live to enable production checkout.',
  );
}