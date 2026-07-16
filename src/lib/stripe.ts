import { loadStripe, type Stripe } from '@stripe/stripe-js';
import { paymentsEnvironmentFromToken, type StripeEnv } from '@/lib/stripe-env';

const publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY as string | undefined;

let stripePromise: Promise<Stripe | null> | null = null;

export function getStripe(): Promise<Stripe | null> {
  if (!stripePromise) {
    paymentsEnvironmentFromToken(publishableKey);
    stripePromise = loadStripe(publishableKey as string);
  }
  return stripePromise;
}

export function getStripeEnvironment(): StripeEnv {
  return paymentsEnvironmentFromToken(publishableKey);
}

export function isStripeConfigured(): boolean {
  return Boolean(publishableKey);
}

export type { StripeEnv };