import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

type ValidateResult = { ok: true } | { ok: false; reason: string };
type CheckoutResult = { clientSecret: string } | { error: string };

// Codes are hand-typed, so keep the shape forgiving: trim, uppercase, and strip
// spaces before matching. Generation uses the same normalized alphabet.
function normalizeCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/\s+/g, "");
}

/**
 * Pre-check a Leaders Edge code before revealing the payment form. This does NOT
 * consume the code — it only gives the redeemer instant "wrong / already used"
 * feedback. The real single-use gate is in createLeadersEdgeCheckout, which
 * atomically burns the code when the checkout session is created.
 */
export const validateLeadersEdgeCode = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => z.object({ code: z.string().min(1).max(64) }).parse(input))
  .handler(async ({ data }): Promise<ValidateResult> => {
    const code = normalizeCode(data.code);
    if (!code) return { ok: false, reason: "Enter your access code." };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin
      .from("redemption_codes")
      .select("id, used_at")
      .eq("code", code)
      .maybeSingle();
    if (!row) return { ok: false, reason: "That code isn't valid." };
    if ((row as { used_at: string | null }).used_at) {
      return { ok: false, reason: "That code has already been used." };
    }
    return { ok: true };
  });

/**
 * Public Leaders Edge redemption checkout — no account required, no redirect.
 * Mirrors the founding embedded-checkout flow: Stripe collects the email on the
 * embedded form and the shared webhook creates/attaches the account and grants
 * access after payment.
 *
 * Two things make this the Leaders Edge path specifically, both resolved
 * server-side so the client can't inject a coupon, price, or free access:
 *   1. The 100%-off-for-3-months coupon is looked up from a fixed id.
 *   2. payment_method_collection is forced to "always" so a card is captured
 *      even though $0 is due now — Stripe then auto-bills $97/mo after month 3.
 *
 * Single-use: the code is atomically burned (used_at set) the moment we create
 * the session, so a leaked code can only ever open ONE checkout. If Stripe fails
 * we release the code so the member can retry.
 */
export const createLeadersEdgeCheckout = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({
        code: z.string().min(1).max(64),
        returnUrl: z.string().url(),
        environment: z.enum(["sandbox", "live"]),
      })
      .parse(input),
  )
  .handler(async ({ data }): Promise<CheckoutResult> => {
    const code = normalizeCode(data.code);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Atomically claim the code: only succeeds if it exists AND is unused. The
    // `.is("used_at", null)` filter makes this a single-winner UPDATE, so two
    // people holding the same leaked code can't both open checkout.
    const claimedAt = new Date().toISOString();
    const { data: claimed, error: claimErr } = await supabaseAdmin
      .from("redemption_codes")
      .update({ used_at: claimedAt } as never)
      .eq("code", code)
      .is("used_at", null)
      .select("id")
      .maybeSingle();

    if (claimErr) {
      console.error("[leaders-edge] code claim failed", claimErr);
      return { error: "Could not verify your code. Please try again." };
    }
    if (!claimed) {
      return { error: "That code isn't valid or has already been used." };
    }
    const codeId = (claimed as { id: string }).id;

    try {
      const { createStripeClient, resolvePrice, getLeadersEdgeCoupon } =
        await import("@/lib/stripe.server");
      const stripe = createStripeClient(data.environment);
      const price = await resolvePrice(stripe, "monthly");
      const coupon = await getLeadersEdgeCoupon(stripe);
      if (!coupon) {
        throw new Error("Leaders Edge discount is not available right now.");
      }

      const session = await stripe.checkout.sessions.create({
        line_items: [{ price: price.id, quantity: 1 }],
        mode: "subscription",
        ui_mode: "embedded_page",
        return_url: data.returnUrl,
        discounts: [{ coupon }],
        // Capture a card even though $0 is due now, so billing continues
        // automatically once the 3-month coupon runs out.
        payment_method_collection: "always",
        metadata: { leaders_edge: "1", leaders_edge_code: code },
        subscription_data: { metadata: { leaders_edge: "1", leaders_edge_code: code } },
      });

      await supabaseAdmin
        .from("redemption_codes")
        .update({ stripe_session_id: session.id } as never)
        .eq("id", codeId);

      return { clientSecret: session.client_secret ?? "" };
    } catch (error) {
      // Stripe failed — release the code so the member (or the next legitimate
      // holder) can retry rather than being stranded by a dead code.
      await supabaseAdmin
        .from("redemption_codes")
        .update({ used_at: null, stripe_session_id: null } as never)
        .eq("id", codeId);
      const { getStripeErrorMessage } = await import("@/lib/stripe.server");
      return { error: getStripeErrorMessage(error) };
    }
  });
