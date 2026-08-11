import type Stripe from "stripe";
import type { Admin, CheckoutSession, StripeSubscription } from "@/lib/checkout-completion.server";
import type { StripeEnv } from "@/lib/stripe.server";

const APP_URL = "https://app.getfullyresourced.com";

function generateToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

type ClaimResult = { status: "won"; claimId: string } | { status: "done" } | { status: "blocked" };

const CLAIM_WAIT_MS = 20_000;
const CLAIM_POLL_INTERVAL_MS = 500;

/**
 * Same exclusive-claim mechanism the individual flow uses (shares the
 * checkout_completion_claims table -- it's keyed purely by Stripe
 * subscription id, nothing individual-specific about it). Without this, the
 * reliable webhook and the synchronous checkout-return resolver (both call
 * handleOrgCheckoutCompleted for the same real-world payment) could race:
 * both fetch the same 'invited' roster rows and both try to create the same
 * new email's account, and the loser's createUser call fails, leaving that
 * member stuck 'invited' forever even though an account really was created.
 * "Done" here means every roster member has left the 'invited' state, not an
 * individual `subscriptions` row (that's what the individual flow polls for).
 */
async function resolveOrgCheckoutClaim(
  admin: Admin,
  organizationId: string,
  subscriptionId: string,
): Promise<ClaimResult> {
  const { data: claimed, error: claimError } = await admin
    .from("checkout_completion_claims")
    .insert({ stripe_subscription_id: subscriptionId })
    .select("id")
    .single();
  if (!claimError && claimed) return { status: "won", claimId: claimed.id };

  const deadline = Date.now() + CLAIM_WAIT_MS;
  while (Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, CLAIM_POLL_INTERVAL_MS));
    const { data: pending } = await admin
      .from("organization_members")
      .select("id")
      .eq("organization_id", organizationId)
      .eq("status", "invited")
      .limit(1)
      .maybeSingle();
    if (!pending) return { status: "done" };
    const { data: verification } = await admin
      .from("card_verifications")
      .select("status")
      .eq("stripe_subscription_id", subscriptionId)
      .maybeSingle();
    if (verification?.status === "failed") return { status: "blocked" };
  }

  console.warn("[org-webhook] stale checkout-completion claim, taking over", subscriptionId);
  await admin
    .from("checkout_completion_claims")
    .delete()
    .eq("stripe_subscription_id", subscriptionId);
  const { data: retried, error: retryError } = await admin
    .from("checkout_completion_claims")
    .insert({ stripe_subscription_id: subscriptionId })
    .select("id")
    .single();
  if (retryError || !retried) return { status: "blocked" };
  return { status: "won", claimId: retried.id };
}

type OrgMemberRow = { id: string; email: string; full_name: string };

async function processOrgMember(
  admin: Admin,
  stripe: Stripe,
  ctx: { organizationId: string; orgName: string; member: OrgMemberRow },
): Promise<void> {
  const { organizationId, orgName, member } = ctx;
  const email = member.email.trim().toLowerCase();
  const { findUserIdByEmail } = await import("@/lib/checkout-completion.server");
  const { sendTransactionalEmailServer } = await import("@/lib/email/send.server");

  const existingProfileId = await findUserIdByEmail(admin, email);

  if (!existingProfileId) {
    // Brand-new email: create the account with no phone at all. Phone is
    // only *required* by the individual signup form's own validation, not by
    // Supabase's createUser -- omitting it here is the natural bypass the
    // spec calls for, not a special case to build.
    const [firstName, ...rest] = member.full_name.split(" ").filter(Boolean);
    const { data: created, error } = await admin.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: {
        full_name: member.full_name,
        first_name: firstName ?? "",
        last_name: rest.join(" "),
      },
    });
    let profileId = created?.user?.id ?? null;
    if (error || !profileId) {
      // Race with another signup for the same email — re-resolve instead of failing.
      profileId = await findUserIdByEmail(admin, email);
      if (!profileId)
        throw new Error(`account creation failed for ${email}: ${error?.message ?? "unknown"}`);
    }

    const token = generateToken();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    const { error: tokenError } = await admin.from("password_setup_tokens").insert({
      token,
      user_id: profileId,
      email,
      expires_at: expiresAt,
    });
    if (tokenError) console.error("[org-webhook] password setup token insert failed", tokenError);

    await sendTransactionalEmailServer({
      templateName: "org-invite",
      recipientEmail: email,
      idempotencyKey: `org-invite-${member.id}`,
      templateData: { orgName, actionUrl: `${APP_URL}/set-password/${token}`, isNewAccount: true },
    });

    await admin
      .from("organization_members")
      .update({ profile_id: profileId, status: "active", joined_at: new Date().toISOString() })
      .eq("id", member.id);
    return;
  }

  // Existing account. If it's on an active individual paid subscription,
  // cancel that subscription (never both an individual and an org sub) and
  // send the org-specific cancellation email -- never the generic one.
  const { data: individualSub } = await admin
    .from("subscriptions")
    .select("stripe_subscription_id, status")
    .eq("user_id", existingProfileId)
    .in("status", ["active", "trialing"])
    .maybeSingle();

  if (individualSub?.stripe_subscription_id) {
    try {
      const current = await stripe.subscriptions.retrieve(individualSub.stripe_subscription_id);
      await stripe.subscriptions.update(individualSub.stripe_subscription_id, {
        metadata: { ...current.metadata, orgMergeCanceled: "1" },
      });
      await stripe.subscriptions.cancel(individualSub.stripe_subscription_id);
    } catch (e) {
      console.error("[org-webhook] failed to cancel individual subscription on merge", email, e);
    }
    await sendTransactionalEmailServer({
      templateName: "org-individual-subscription-canceled",
      recipientEmail: email,
      idempotencyKey: `org-individual-subscription-canceled-${member.id}`,
      templateData: { orgName },
    });
  } else {
    // Free tier (or a lapsed/canceled individual sub) — silent merge, just a
    // heads-up pointing at their existing dashboard, no password step needed.
    await sendTransactionalEmailServer({
      templateName: "org-invite",
      recipientEmail: email,
      idempotencyKey: `org-invite-${member.id}`,
      templateData: { orgName, actionUrl: `${APP_URL}/dashboard`, isNewAccount: false },
    });
  }

  await admin
    .from("organization_members")
    .update({
      profile_id: existingProfileId,
      status: "active",
      joined_at: new Date().toISOString(),
    })
    .eq("id", member.id);
}

/**
 * Org checkout completed: mirrors handleCheckoutCompleted's role for
 * individual signups, but fans out over every roster member instead of
 * creating one account. Safe to call twice for the same checkout (webhook +
 * synchronous return-page resolver) — resolveOrgCheckoutClaim serializes the
 * two calls, and each member row's own 'invited' -> 'active' transition
 * means a retry only ever touches members a prior run didn't finish.
 */
export async function handleOrgCheckoutCompleted(
  admin: Admin,
  session: CheckoutSession,
  env: StripeEnv,
): Promise<{ blocked: boolean }> {
  const organizationId = session.metadata?.organizationId;
  const subscriptionId = typeof session.subscription === "string" ? session.subscription : null;
  if (!organizationId || !subscriptionId) {
    throw new Error(`org checkout session missing organizationId or subscription: ${session.id}`);
  }

  const { data: org } = await admin
    .from("organizations")
    .select("id, name")
    .eq("id", organizationId)
    .maybeSingle();
  if (!org) {
    console.error("[org-webhook] organization not found", organizationId);
    return { blocked: false };
  }

  const claim = await resolveOrgCheckoutClaim(admin, organizationId, subscriptionId);
  if (claim.status === "done") {
    console.log("[org-webhook] org checkout completed by a concurrent caller", subscriptionId);
    return { blocked: false };
  }
  if (claim.status === "blocked") {
    console.log("[org-webhook] org checkout blocked by a concurrent caller", subscriptionId);
    return { blocked: true };
  }

  try {
    const { createStripeClient } = await import("@/lib/stripe.server");
    const { ensureCardVerified } = await import("@/lib/checkout-completion.server");
    const stripe = createStripeClient(env);
    const sub = (await stripe.subscriptions.retrieve(
      subscriptionId,
    )) as unknown as StripeSubscription;

    const verification = await ensureCardVerified(admin, env, sub);
    if (!verification.ok) {
      console.warn(
        "[org-webhook] blocking org subscription — card verification failed",
        subscriptionId,
        verification.reason,
      );
      try {
        await stripe.subscriptions.cancel(subscriptionId);
      } catch (e) {
        console.error(
          "[org-webhook] failed to cancel unverified org subscription",
          subscriptionId,
          e,
        );
      }
      return { blocked: true };
    }

    await admin
      .from("organizations")
      .update({
        stripe_customer_id: typeof session.customer === "string" ? session.customer : null,
        stripe_subscription_id: subscriptionId,
      })
      .eq("id", organizationId);

    const { data: members } = await admin
      .from("organization_members")
      .select("id, email, full_name")
      .eq("organization_id", organizationId)
      .eq("status", "invited");

    for (const member of (members ?? []) as OrgMemberRow[]) {
      try {
        await processOrgMember(admin, stripe, { organizationId, orgName: org.name, member });
      } catch (e) {
        console.error("[org-webhook] failed to process org member", member.email, e);
      }
    }

    console.log("[org-webhook] org checkout processed", { organizationId, subscriptionId });
    return { blocked: false };
  } finally {
    await admin.from("checkout_completion_claims").delete().eq("id", claim.claimId);
  }
}

/**
 * Keeps organizations.stripe_customer_id/stripe_subscription_id in sync and
 * runs the card check the first time an org subscription is seen, mirroring
 * (a minimal slice of) handleSubscriptionUpsert. Deliberately does not
 * fan out to member processing (that only ever happens once, in
 * handleOrgCheckoutCompleted) and does not handle ongoing lifecycle
 * (past_due, renewals, org-level cancellation) -- out of scope for this PR.
 */
export async function handleOrgSubscriptionUpsert(
  admin: Admin,
  sub: StripeSubscription,
  env: StripeEnv,
): Promise<void> {
  const organizationId = sub.metadata?.organizationId;
  if (!organizationId) return;

  const { data: org } = await admin
    .from("organizations")
    .select("id, stripe_subscription_id")
    .eq("id", organizationId)
    .maybeSingle();
  if (!org) return;

  if (!org.stripe_subscription_id && (sub.status === "active" || sub.status === "trialing")) {
    const { ensureCardVerified } = await import("@/lib/checkout-completion.server");
    const verification = await ensureCardVerified(admin, env, sub);
    if (!verification.ok) {
      console.warn(
        "[org-webhook] org subscription failed card verification on upsert",
        sub.id,
        verification.reason,
      );
      return;
    }
  }

  await admin
    .from("organizations")
    .update({
      stripe_customer_id: typeof sub.customer === "string" ? sub.customer : null,
      stripe_subscription_id: sub.id,
    })
    .eq("id", organizationId);
}
