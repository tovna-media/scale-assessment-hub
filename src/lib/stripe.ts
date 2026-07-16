import { loadStripe, type Stripe } from '@stripe/stripe-js';
import { paymentsEnvironmentFromToken, type StripeEnv } from '@/lib/stripe-env';

const clientToken = import.meta.env.VITE_PAYMENTS_CLIENT_TOKEN as string | undefined;

let stripePromise: Promise<Stripe | null> | null = null;

export function getStripe(): Promise<Stripe | null> {
  if (!stripePromise) {
    paymentsEnvironmentFromToken(clientToken);
    stripePromise = loadStripe(clientToken as string);
  }
  return stripePromise;
}

export function getStripeEnvironment(): StripeEnv {
  return paymentsEnvironmentFromToken(clientToken);
}

export function isStripeConfigured(): boolean {
  return Boolean(clientToken);
}

export type { StripeEnv };