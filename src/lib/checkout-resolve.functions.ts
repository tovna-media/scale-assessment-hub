import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/**
 * Called from the checkout return page right after Stripe redirects back —
 * does the same account-creation/token-issuance work the webhook does, but
 * synchronously, so the browser can redirect straight to /set-password
 * without waiting for Stripe's webhook to arrive (that can lag seconds to
 * tens of seconds behind the browser redirect). Idempotent: whichever of
 * this call or the webhook gets there first does the work; the other is a
 * no-op (see handleCheckoutCompleted's subscriptions-row uniqueness check).
 *
 * Safe to expose without auth: the session id is only known to whoever just
 * completed a real Stripe checkout (Stripe puts it in the return URL), and
 * this reads authoritative payment state from Stripe's own API rather than
 * trusting anything else the client supplies.
 */
export const resolveCheckoutSession = createServerFn({ method: "POST" })
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
    const { handleCheckoutCompleted } = await import("@/lib/checkout-completion.server");
    type CheckoutSession = Parameters<typeof handleCheckoutCompleted>[1];

    const stripe = createStripeClient(data.environment);
    const session = await stripe.checkout.sessions.retrieve(data.sessionId);

    if (session.status !== "complete" || session.mode !== "subscription" || !session.subscription) {
      return { token: null as string | null, ready: false as const };
    }

    await handleCheckoutCompleted(
      supabaseAdmin,
      session as unknown as CheckoutSession,
      data.environment,
    );

    const { data: tokenRow } = await supabaseAdmin
      .from("password_setup_tokens")
      .select("token")
      .eq("checkout_session_id", data.sessionId)
      .is("used_at", null)
      .maybeSingle();

    return { token: tokenRow?.token ?? null, ready: true as const };
  });
