import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type DeleteResult =
  | { ok: true; canceledSubscription: boolean; emailedCancellation: boolean }
  | { error: string };

// Coaches are the admins. Server functions verify the role with the service-role
// client (not the caller's RLS client) so the check can't be sidestepped.
async function assertCoach(userId: string): Promise<boolean> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "coach")
    .maybeSingle();
  return Boolean(data);
}

/**
 * Remove a user from the system (coaches only). If they're a paying member we
 * cancel their Stripe subscription immediately and email them the cancellation
 * notice BEFORE deleting, because once the account is gone the webhook can no
 * longer resolve them to send it. Deleting the auth user cascades every app
 * table (all reference auth.users ON DELETE CASCADE), including subscriptions.
 */
export const deleteUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ userId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }): Promise<DeleteResult> => {
    const { userId: callerId } = context;
    if (!(await assertCoach(callerId))) return { error: "Not authorized." };
    if (data.userId === callerId) return { error: "You can't delete your own account." };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Refuse to delete another coach/admin — avoids locking admins out.
    const { data: targetRole } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", data.userId)
      .eq("role", "coach")
      .maybeSingle();
    if (targetRole) return { error: "Can't delete an admin account." };

    // Capture what we need BEFORE the account (and its rows) disappear.
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("email, full_name")
      .eq("id", data.userId)
      .maybeSingle();
    const { data: sub } = await supabaseAdmin
      .from("subscriptions")
      .select("stripe_subscription_id, status, environment")
      .eq("user_id", data.userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const p = profile as { email: string | null; full_name: string | null } | null;
    const s = sub as {
      stripe_subscription_id: string | null;
      status: string | null;
      environment: string;
    } | null;

    const hadLiveSub =
      !!s?.stripe_subscription_id &&
      ["active", "trialing", "past_due", "unpaid"].includes((s.status ?? "").toLowerCase());

    // 1) Cancel the Stripe subscription BEFORE deleting the account, and abort
    //    the whole delete if we can't stop billing — deleting the account while
    //    the card keeps getting charged is the worst outcome, and once the
    //    account is gone we've lost the subscription id to retry with.
    //    Cancellation runs through the Lovable connector gateway. The SDK's
    //    immediate cancel() is a DELETE, which the gateway may not forward, so
    //    on any failure we fall back to cancel_at_period_end (a POST), which the
    //    gateway proxies reliably and still stops all future billing.
    let canceledSubscription = false;
    if (hadLiveSub && s?.stripe_subscription_id) {
      const { createStripeClient, getStripeErrorMessage } = await import("@/lib/stripe.server");
      const subId = s.stripe_subscription_id;
      const env = s.environment === "live" ? "live" : "sandbox";
      try {
        const stripe = createStripeClient(env);
        try {
          await stripe.subscriptions.cancel(subId); // immediate (DELETE)
          canceledSubscription = true;
        } catch (immediateErr) {
          console.error(
            "[admin] immediate cancel failed, falling back to period-end",
            immediateErr,
          );
          await stripe.subscriptions.update(subId, { cancel_at_period_end: true }); // POST
          canceledSubscription = true;
        }
      } catch (err) {
        console.error("[admin] stripe cancel failed, aborting delete", err);
        return {
          error: `Couldn't cancel this member's Stripe subscription (${getStripeErrorMessage(
            err,
          )}). They were NOT removed. Cancel the subscription in Stripe, then try again.`,
        };
      }
    }

    // 2) Delete the auth user — cascades all app data (profiles, subscriptions,
    //    sessions, progress, etc.) via ON DELETE CASCADE.
    const { error: delErr } = await supabaseAdmin.auth.admin.deleteUser(data.userId);
    if (delErr) {
      console.error("[admin] deleteUser failed", delErr);
      return { error: `Could not remove the user: ${delErr.message}` };
    }

    // 3) Email the cancellation notice ourselves — the webhook can't now that
    //    the account is gone (so there's no duplicate either).
    let emailedCancellation = false;
    if (hadLiveSub && p?.email) {
      try {
        const { sendTransactionalEmailServer } = await import("@/lib/email/send.server");
        await sendTransactionalEmailServer({
          templateName: "subscription-canceled",
          recipientEmail: p.email,
          idempotencyKey: `subscription-canceled-admin-delete-${data.userId}`,
          templateData: { name: p.full_name ?? undefined },
        });
        emailedCancellation = true;
      } catch (e) {
        console.error("[admin] cancellation email during delete failed", e);
      }

      try {
        const { notifyGhlTag } = await import("@/lib/ghl-notify.server");
        await notifyGhlTag({
          email: p.email,
          fullName: p.full_name,
          event: "subscription_canceled_admin_delete",
          tag: "fully resourced cancelled",
        });
      } catch (e) {
        console.error("[admin] GHL cancellation tag during delete failed", e);
      }
    }

    return { ok: true, canceledSubscription, emailedCancellation };
  });
