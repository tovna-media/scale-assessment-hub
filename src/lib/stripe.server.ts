import Stripe from "stripe";
import type { StripeEnv } from "@/lib/stripe-env";

export type { StripeEnv } from "@/lib/stripe-env";

const getEnv = (key: string): string => {
  const value = process.env[key];
  if (!value) throw new Error(`${key} is not configured`);
  return value;
};

const GATEWAY_STRIPE_BASE = "https://connector-gateway.lovable.dev/stripe";

export function getConnectionApiKey(env: StripeEnv): string {
  return env === "sandbox" ? getEnv("STRIPE_SANDBOX_API_KEY") : getEnv("STRIPE_LIVE_API_KEY");
}

// Built-in payments: Stripe calls are proxied through the connector gateway,
// which holds the real Stripe secret. The *_API_KEY values below are gateway
// connection identifiers, not Stripe secret keys.
export function createStripeClient(env: StripeEnv): Stripe {
  const connectionApiKey = getConnectionApiKey(env);
  const lovableApiKey = getEnv("LOVABLE_API_KEY");

  return new Stripe(connectionApiKey, {
    apiVersion: "2026-03-25.dahlia",
    httpClient: Stripe.createFetchHttpClient((input, init) => {
      const stripeUrl = input instanceof Request ? input.url : input.toString();
      const gatewayUrl = stripeUrl.replace("https://api.stripe.com", GATEWAY_STRIPE_BASE);
      return fetch(gatewayUrl, {
        ...init,
        headers: {
          ...Object.fromEntries(
            new Headers(
              init?.headers ?? (input instanceof Request ? input.headers : undefined),
            ).entries(),
          ),
          "X-Connection-Api-Key": connectionApiKey,
          "Lovable-API-Key": lovableApiKey,
        },
      });
    }),
  });
}

export type PlanId = "monthly" | "annual";

// Human-readable price ids from the product catalog. Stable across test/live.
export function getPriceLookupKey(plan: PlanId): string {
  return plan === "annual" ? "fully_resourced_annual" : "fully_resourced_monthly";
}

// Resolve the human-readable price id to the environment-specific Stripe price.
export async function resolvePrice(stripe: Stripe, plan: PlanId): Promise<Stripe.Price> {
  const lookupKey = getPriceLookupKey(plan);
  const prices = await stripe.prices.list({ lookup_keys: [lookupKey], limit: 1 });
  if (!prices.data.length) throw new Error(`Price "${lookupKey}" not found`);
  return prices.data[0];
}

const FOUNDING_COUPON_ID = "founding20";

// Founding-member discount: 20% off the first month, applied server-side so it
// can't be spoofed. Created on first use, then reused (same id in test + live).
export async function getFoundingCoupon(stripe: Stripe): Promise<string | null> {
  try {
    const existing = await stripe.coupons.retrieve(FOUNDING_COUPON_ID);
    if (existing && !existing.deleted) return existing.id;
  } catch {
    // not created yet in this environment
  }
  try {
    const created = await stripe.coupons.create({
      id: FOUNDING_COUPON_ID,
      percent_off: 20,
      duration: "once",
      name: "Founding member — 20% off first month",
    });
    return created.id;
  } catch (error) {
    console.error("[stripe] founding coupon unavailable", error);
    return null;
  }
}

// Leaders Edge discount: 100% off for the first 3 months, then the normal plan
// price. Rich created this coupon in Stripe; we resolve it by id server-side so
// the client can never inject a coupon or price. If it's missing in an
// environment (e.g. a fresh sandbox) we recreate it with the same id and terms.
const LEADERS_EDGE_COUPON_ID = "1KS7zXTz";

export async function getLeadersEdgeCoupon(stripe: Stripe): Promise<string | null> {
  try {
    const existing = await stripe.coupons.retrieve(LEADERS_EDGE_COUPON_ID);
    if (existing && !existing.deleted) return existing.id;
  } catch {
    // not present in this environment — recreate below
  }
  try {
    const created = await stripe.coupons.create({
      id: LEADERS_EDGE_COUPON_ID,
      percent_off: 100,
      duration: "repeating",
      duration_in_months: 3,
      name: "leaders-edge",
    });
    return created.id;
  } catch (error) {
    console.error("[stripe] leaders edge coupon unavailable", error);
    return null;
  }
}

export function getStripeErrorMessage(error: unknown): string {
  if (error && typeof error === "object") {
    const e = error as {
      message?: string;
      type?: string;
      code?: string;
      raw?: { message?: string; type?: string; code?: string };
    };
    const message = e.raw?.message ?? e.message;
    if (message) return message;
  }
  return "Stripe request failed";
}

export async function verifyWebhook(
  req: Request,
  env: StripeEnv,
): Promise<{ id: string; type: string; data: { object: unknown } }> {
  const signature = req.headers.get("stripe-signature");
  const body = await req.text();
  const secret =
    env === "sandbox"
      ? getEnv("PAYMENTS_SANDBOX_WEBHOOK_SECRET")
      : getEnv("PAYMENTS_LIVE_WEBHOOK_SECRET");

  if (!signature || !body) throw new Error("Missing signature or body");

  let timestamp: string | undefined;
  const v1Signatures: string[] = [];
  for (const part of signature.split(",")) {
    const [key, value] = part.split("=", 2);
    if (key === "t") timestamp = value;
    if (key === "v1") v1Signatures.push(value);
  }
  if (!timestamp || v1Signatures.length === 0) throw new Error("Invalid signature format");

  const age = Math.abs(Date.now() / 1000 - Number(timestamp));
  if (age > 300) throw new Error("Webhook timestamp too old");

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signed = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(`${timestamp}.${body}`),
  );
  const expected = Buffer.from(new Uint8Array(signed)).toString("hex");
  if (!v1Signatures.includes(expected)) throw new Error("Invalid webhook signature");

  return JSON.parse(body);
}
