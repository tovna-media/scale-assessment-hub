import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type GenerateResult = { code: string } | { error: string };
type CodeRow = {
  code: string;
  created_at: string;
  used_at: string | null;
  redeemed_by_email: string | null;
};
type ListResult = { codes: CodeRow[] } | { error: string };
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

// Unambiguous alphabet — no 0/O/1/I/L so codes read cleanly over email/phone.
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

function randomCode(): string {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  const body = Array.from(bytes, (b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join("");
  return `LE-${body}`;
}

/**
 * Generate a single-use Leaders Edge redemption code (coaches only). Codes are
 * created server-side with the service-role client so they can't be minted from
 * the browser. Returns the plain code for the admin to hand to a member.
 */
export const generateRedemptionCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<GenerateResult> => {
    const { userId } = context;
    if (!(await assertCoach(userId))) return { error: "Not authorized." };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // Retry a couple of times on the (astronomically unlikely) code collision.
    for (let attempt = 0; attempt < 5; attempt++) {
      const code = randomCode();
      const { error } = await supabaseAdmin
        .from("redemption_codes")
        .insert({ code, campaign: "leaders_edge", created_by: userId } as never);
      if (!error) return { code };
      if (error.code !== "23505") {
        console.error("[admin] generate code failed", error);
        return { error: "Could not generate a code. Please try again." };
      }
    }
    return { error: "Could not generate a unique code. Please try again." };
  });

/** List Leaders Edge codes with used/unused status (coaches only). */
export const listRedemptionCodes = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ListResult> => {
    const { userId } = context;
    if (!(await assertCoach(userId))) return { error: "Not authorized." };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("redemption_codes")
      .select("code, created_at, used_at, redeemed_by_email")
      .eq("campaign", "leaders_edge")
      .order("created_at", { ascending: false });
    if (error) {
      console.error("[admin] list codes failed", error);
      return { error: "Could not load codes." };
    }
    return { codes: (data ?? []) as CodeRow[] };
  });

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

    // 1) Cancel the Stripe subscription immediately (no future billing).
    let canceledSubscription = false;
    if (hadLiveSub && s?.stripe_subscription_id) {
      try {
        const { createStripeClient } = await import("@/lib/stripe.server");
        const env = s.environment === "live" ? "live" : "sandbox";
        const stripe = createStripeClient(env);
        await stripe.subscriptions.cancel(s.stripe_subscription_id);
        canceledSubscription = true;
      } catch (e) {
        console.error("[admin] stripe cancel during delete failed", e);
        // Continue with deletion — an orphaned Stripe sub is safer than a
        // half-deleted account, and it can be cleaned up manually if needed.
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
    }

    return { ok: true, canceledSubscription, emailedCancellation };
  });
