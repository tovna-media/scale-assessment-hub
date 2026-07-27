import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';

export const FOUNDING_COUPON_ID = 'DblcpNsA';

type CheckoutResult = { url: string } | { error: string };

/**
 * Public founding checkout — no account required. Stripe collects the email on
 * its own checkout screen; the webhook creates/attaches the app account after
 * payment. The 20% founding coupon is applied automatically (no promo code).
 */
export const createFoundingCheckout = createServerFn({ method: 'POST' })
  .inputValidator((input: unknown) =>
    z
      .object({
        priceId: z.string().regex(/^[a-zA-Z0-9_-]+$/),
        returnUrl: z.string().url(),
        cancelUrl: z.string().url(),
        environment: z.enum(['sandbox', 'live']),
      })
      .parse(input),
  )
  .handler(async ({ data }): Promise<CheckoutResult> => {
    try {
      const { createStripeClient } = await import('@/lib/stripe.server');
      const stripe = createStripeClient(data.environment);

      const session = await stripe.checkout.sessions.create({
        line_items: [{ price: data.priceId, quantity: 1 }],
        mode: 'subscription',
        discounts: [{ coupon: FOUNDING_COUPON_ID }],
        success_url: data.returnUrl,
        cancel_url: data.cancelUrl,
        metadata: { founding: '1' },
        subscription_data: { metadata: { founding: '1' } },
      });

      return { url: session.url ?? '' };
    } catch (error) {
      const { getStripeErrorMessage } = await import('@/lib/stripe.server');
      return { error: getStripeErrorMessage(error) };
    }
  });
