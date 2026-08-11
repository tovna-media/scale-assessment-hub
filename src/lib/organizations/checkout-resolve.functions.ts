import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/**
 * Org checkout equivalent of resolveCheckoutSession (checkout-resolve.functions.ts):
 * called from the return page right after Stripe redirects back, so the
 * browser doesn't have to wait for the webhook (which can lag seconds behind).
 * Idempotent with the webhook via handleOrgCheckoutCompleted's own claim
 * mechanism — whichever gets there first does the work.
 *
 * Safe to expose without auth: the session id is only known to whoever just
 * completed a real Stripe checkout, and this reads authoritative payment
 * state from Stripe's own API rather than trusting anything else the client
 * supplies.
 */
export const resolveOrgCheckoutSession = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({
        sessionId: z.string().min(1),
        environment: z.enum(["sandbox", "live"]),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { createStripeClient } = await import("@/lib/stripe.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { handleOrgCheckoutCompleted } =
      await import("@/lib/organizations/checkout-completion.server");
    type CheckoutSession = Parameters<typeof handleOrgCheckoutCompleted>[1];

    const stripe = createStripeClient(data.environment);
    const session = await stripe.checkout.sessions.retrieve(data.sessionId);

    if (session.status !== "complete" || session.mode !== "subscription" || !session.subscription) {
      return { ready: false as const, verificationFailed: false as const };
    }
    if (!session.metadata?.organizationId) {
      return { ready: false as const, verificationFailed: false as const };
    }

    const result = await handleOrgCheckoutCompleted(
      supabaseAdmin,
      session as unknown as CheckoutSession,
      data.environment,
    );

    if (result.blocked) {
      return { ready: true as const, verificationFailed: true as const };
    }
    return { ready: true as const, verificationFailed: false as const };
  });
