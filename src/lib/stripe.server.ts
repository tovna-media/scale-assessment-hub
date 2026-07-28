import Stripe from "stripe";
import type { StripeEnv } from "@/lib/stripe-env";

export type { StripeEnv } from "@/lib/stripe-env";

const getEnv = (key: string): string => {
  const value = process.env[key];
  if (!value) throw new Error(`${key} is not configured`);
  return value;
};

// BYOK Stripe: talks to api.stripe.com directly using the user-provided
// secret key. Sandbox uses STRIPE_SECRET_KEY (test mode, sk_test_...).
// Live uses STRIPE_LIVE_SECRET_KEY once go-live is done.
export function getSecretKey(env: StripeEnv): string {
  return env === "sandbox" ? getEnv("STRIPE_SECRET_KEY") : getEnv("STRIPE_LIVE_SECRET_KEY");
}

export function createStripeClient(env: StripeEnv): Stripe {
  return new Stripe(getSecretKey(env), {
    apiVersion: "2026-03-25.dahlia",
    httpClient: Stripe.createFetchHttpClient(),
  });
}

export type PlanId = "monthly" | "annual";

// Price IDs come from env — never hardcoded and never sent by the client. The
// client only names a plan; the server maps it to the real Stripe price.
export function getPriceId(plan: PlanId): string {
  return plan === "annual" ? getEnv("STRIPE_PRICE_ANNUAL") : getEnv("STRIPE_PRICE_MONTHLY");
}

// Founding-member coupon, applied server-side so it can't be spoofed or reused
// on the wrong flow. Returns null when not configured so checkout still works.
export function getFoundingCoupon(): string | null {
  return process.env.STRIPE_FOUNDING_COUPON || null;
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
    env === "sandbox" ? getEnv("STRIPE_WEBHOOK_SECRET") : getEnv("STRIPE_LIVE_WEBHOOK_SECRET");

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
