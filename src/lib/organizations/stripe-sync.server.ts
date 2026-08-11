import Stripe from "stripe";
import type { StripeEnv } from "@/lib/stripe-env";
import { resolvePrice } from "@/lib/stripe.server";
import { getSeatTier, type OrgSeatTier } from "@/lib/organizations/seat-pricing";

// The discounted ($87/seat, 16+ members) org price. Reuses the existing
// individual monthly price ($97/mo == $97/seat) for the standard tier rather
// than duplicating it -- same price, same product, just billed at quantity.
// Test and live mode are separate Stripe accounts, so (like the founding
// coupon) this id is only valid in the environment it was created in.
const DISCOUNTED_ORG_SEAT_PRICE_ID: Partial<Record<StripeEnv, string>> = {
  sandbox: "price_1U3KEZKi9kEwbRKQgmwtVgvr",
};

async function resolveOrgSeatPriceId(
  stripe: Stripe,
  env: StripeEnv,
  tier: OrgSeatTier,
): Promise<string> {
  if (tier === "standard") {
    const price = await resolvePrice(stripe, "monthly");
    return price.id;
  }
  const priceId = DISCOUNTED_ORG_SEAT_PRICE_ID[env];
  if (!priceId) {
    throw new Error(`Discounted org seat price is not configured for the "${env}" environment`);
  }
  return priceId;
}

// Keeps an org's Stripe subscription in sync with its current member count:
// quantity = memberCount, and the seat price swaps between the standard and
// discounted tier as the roster crosses the 16-member line in either
// direction. Crossing tiers repriced the WHOLE subscription (not just the
// seats past 15), so this always sets both quantity and price together,
// never quantity alone.
export async function syncOrganizationSubscriptionQuantity(
  stripe: Stripe,
  env: StripeEnv,
  stripeSubscriptionId: string,
  memberCount: number,
): Promise<Stripe.Subscription> {
  const subscription = await stripe.subscriptions.retrieve(stripeSubscriptionId);
  const item = subscription.items.data[0];
  if (!item) {
    throw new Error(`Subscription ${stripeSubscriptionId} has no items to update`);
  }

  const tier = getSeatTier(memberCount);
  const priceId = await resolveOrgSeatPriceId(stripe, env, tier);

  return stripe.subscriptions.update(stripeSubscriptionId, {
    items: [{ id: item.id, price: priceId, quantity: memberCount }],
    proration_behavior: "create_prorations",
  });
}
