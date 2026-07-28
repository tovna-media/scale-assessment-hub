import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

type CheckoutResult = { url: string } | { error: string };

/**
 * Public founding checkout — no account required. Stripe collects the email on
 * its own checkout screen; the webhook creates/attaches the app account after
 * payment. The monthly price and the founding coupon both come from env and are
 * resolved server-side — the client never supplies a price or coupon.
 */
export const createFoundingCheckout = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({
        returnUrl: z.string().url(),
        cancelUrl: z.string().url(),
        environment: z.enum(["sandbox", "live"]),
      })
      .parse(input),
  )
  .handler(async ({ data }): Promise<CheckoutResult> => {
    try {
      const { createStripeClient, getPriceId, getFoundingCoupon } =
        await import("@/lib/stripe.server");
      const stripe = createStripeClient(data.environment);
      const coupon = getFoundingCoupon();

      const session = await stripe.checkout.sessions.create({
        line_items: [{ price: getPriceId("monthly"), quantity: 1 }],
        mode: "subscription",
        ...(coupon ? { discounts: [{ coupon }] } : {}),
        success_url: data.returnUrl,
        cancel_url: data.cancelUrl,
        metadata: { founding: "1" },
        subscription_data: { metadata: { founding: "1" } },
      });

      return { url: session.url ?? "" };
    } catch (error) {
      const { getStripeErrorMessage } = await import("@/lib/stripe.server");
      return { error: getStripeErrorMessage(error) };
    }
  });
