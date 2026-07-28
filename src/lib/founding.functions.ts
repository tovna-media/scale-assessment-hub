import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

type CheckoutResult = { clientSecret: string } | { error: string };

/**
 * Public founding checkout — no account required. Stripe collects the email on
 * the embedded checkout form; the webhook creates/attaches the app account after
 * payment. The monthly price and the founding discount are both resolved
 * server-side — the client never supplies a price or coupon.
 */
export const createFoundingCheckout = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({
        returnUrl: z.string().url(),
        environment: z.enum(["sandbox", "live"]),
      })
      .parse(input),
  )
  .handler(async ({ data }): Promise<CheckoutResult> => {
    try {
      const { createStripeClient, resolvePrice, getFoundingCoupon } =
        await import("@/lib/stripe.server");
      const stripe = createStripeClient(data.environment);
      const price = await resolvePrice(stripe, "monthly");
      const coupon = await getFoundingCoupon(stripe);

      const session = await stripe.checkout.sessions.create({
        line_items: [{ price: price.id, quantity: 1 }],
        mode: "subscription",
        ui_mode: "embedded_page",
        return_url: data.returnUrl,
        ...(coupon ? { discounts: [{ coupon }] } : {}),
        metadata: { founding: "1" },
        subscription_data: { metadata: { founding: "1" } },
      });

      return { clientSecret: session.client_secret ?? "" };
    } catch (error) {
      const { getStripeErrorMessage } = await import("@/lib/stripe.server");
      return { error: getStripeErrorMessage(error) };
    }
  });
