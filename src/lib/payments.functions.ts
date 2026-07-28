import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const StripeEnvSchema = z.enum(["sandbox", "live"]);

type CheckoutResult = { url: string } | { error: string };
type PortalResult = { url: string } | { error: string };
type StatusResult = {
  active: boolean;
  status: string | null;
  cancel_at_period_end: boolean;
  current_period_end: string | null;
  past_due_since: string | null;
};

async function resolveOrCreateCustomer(
  stripe: import("stripe").default,
  options: { email?: string; userId: string },
): Promise<string> {
  if (!/^[a-zA-Z0-9_-]+$/.test(options.userId)) throw new Error("Invalid userId");
  const found = await stripe.customers.search({
    query: `metadata['userId']:'${options.userId}'`,
    limit: 1,
  });
  if (found.data.length) return found.data[0].id;
  if (options.email) {
    const existing = await stripe.customers.list({ email: options.email, limit: 1 });
    if (existing.data.length) {
      const c = existing.data[0];
      if (c.metadata?.userId !== options.userId) {
        await stripe.customers.update(c.id, {
          metadata: { ...c.metadata, userId: options.userId },
        });
      }
      return c.id;
    }
  }
  const created = await stripe.customers.create({
    ...(options.email && { email: options.email }),
    metadata: { userId: options.userId },
  });
  return created.id;
}

export const createSubscriptionCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        plan: z.enum(["monthly", "annual"]),
        returnUrl: z.string().url(),
        environment: StripeEnvSchema,
        acceptedTerms: z.boolean(),
        // Founding-member upgrade path. The coupon itself is applied server-side
        // from env — the client only signals which flow it is.
        founding: z.boolean().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }): Promise<CheckoutResult> => {
    try {
      if (!data.acceptedTerms) return { error: "You must accept the Terms and Privacy Policy." };

      const { createStripeClient, getStripeErrorMessage, getPriceId, getFoundingCoupon } =
        await import("@/lib/stripe.server");
      const stripe = createStripeClient(data.environment);

      const priceId = getPriceId(data.plan);
      const coupon = data.founding ? getFoundingCoupon() : null;

      const { userId, supabase } = context;
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const email = user?.email ?? undefined;

      const customerId = await resolveOrCreateCustomer(stripe, { email, userId });

      const session = await stripe.checkout.sessions.create({
        line_items: [{ price: priceId, quantity: 1 }],
        mode: "subscription",
        ...(coupon ? { discounts: [{ coupon }] } : {}),
        success_url: data.returnUrl,
        cancel_url: `${new URL(data.returnUrl).origin}/dashboard`,
        customer: customerId,
        metadata: {
          userId,
          accepted_terms_at: new Date().toISOString(),
        },
        subscription_data: {
          metadata: {
            userId,
            accepted_terms_at: new Date().toISOString(),
          },
        },
      });

      // Log that the user accepted terms and initiated checkout
      try {
        await supabase.from("funnel_events").insert({
          user_id: userId,
          event_type: "accepted_terms",
          metadata: { price_id: priceId, session_id: session.id },
        } as never);
        await supabase.from("funnel_events").insert({
          user_id: userId,
          event_type: "started_checkout",
          metadata: { price_id: priceId, session_id: session.id },
        } as never);
      } catch (e) {
        console.error("[funnel] checkout events insert failed", e);
      }

      return { url: session.url ?? "" };
    } catch (error) {
      const { getStripeErrorMessage } = await import("@/lib/stripe.server");
      return { error: getStripeErrorMessage(error) };
    }
  });

export const createBillingPortalSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        returnUrl: z.string().url(),
        environment: StripeEnvSchema,
      })
      .parse(input),
  )
  .handler(async ({ data, context }): Promise<PortalResult> => {
    try {
      const { supabase, userId } = context;
      const { data: sub } = await supabase
        .from("subscriptions")
        .select("stripe_customer_id")
        .eq("user_id", userId)
        .eq("environment", data.environment)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!sub?.stripe_customer_id) return { error: "No subscription found for this account." };

      const { createStripeClient, getStripeErrorMessage } = await import("@/lib/stripe.server");
      const stripe = createStripeClient(data.environment);
      const portal = await stripe.billingPortal.sessions.create({
        customer: sub.stripe_customer_id,
        return_url: data.returnUrl,
      });
      return { url: portal.url };
    } catch (error) {
      const { getStripeErrorMessage } = await import("@/lib/stripe.server");
      return { error: getStripeErrorMessage(error) };
    }
  });

// Access-truth server function the app calls to know whether the caller
// has a currently-active subscription (active/trialing, past_due within 7d, or
// canceled but still within the paid period). The subscriptions table's own
// row is what backs this — reads are RLS-scoped to the current user.
export const getSubscriptionStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<StatusResult> => {
    const { supabase, userId } = context;
    const { data } = await supabase
      .from("subscriptions")
      .select("status, cancel_at_period_end, current_period_end, past_due_since")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!data) {
      return {
        active: false,
        status: null,
        cancel_at_period_end: false,
        current_period_end: null,
        past_due_since: null,
      };
    }
    const row = data as {
      status: string;
      cancel_at_period_end: boolean;
      current_period_end: string | null;
      past_due_since: string | null;
    };
    const now = Date.now();
    const periodEndMs = row.current_period_end ? Date.parse(row.current_period_end) : null;
    const pastDueSinceMs = row.past_due_since ? Date.parse(row.past_due_since) : null;
    const active =
      row.status === "active" ||
      row.status === "trialing" ||
      (row.status === "past_due" &&
        pastDueSinceMs !== null &&
        now - pastDueSinceMs < 7 * 24 * 60 * 60 * 1000) ||
      (row.status === "canceled" && periodEndMs !== null && periodEndMs > now);

    return {
      active,
      status: row.status,
      cancel_at_period_end: row.cancel_at_period_end,
      current_period_end: row.current_period_end,
      past_due_since: row.past_due_since,
    };
  });

// Convenience export used by the "activating" page: same as getSubscriptionStatus
// but the client polls it. Kept separate in case we later want to add pending-state
// telemetry here.
export const pollSubscriptionStatus = getSubscriptionStatus;

// Explicit signal from the checkout return page that the user reached success.
// Access is granted by the webhook, but we log the funnel step here.
export const logCheckoutReturn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ sessionId: z.string().optional() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await supabase.from("funnel_events").insert({
      user_id: userId,
      event_type: "reached_checkout_return",
      metadata: { session_id: data.sessionId ?? null },
    } as never);
    return { ok: true };
  });
