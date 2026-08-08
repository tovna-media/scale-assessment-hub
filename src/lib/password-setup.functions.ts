import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/**
 * Brand-new-paid-signup password setup. All lookups resolve the account from
 * the server-stored token row — never from a client-submitted email — so a
 * request sent straight to these functions can't set a password on an
 * account other than the one the token was issued for.
 */

export const getPasswordSetupInfo = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => z.object({ token: z.string().min(32) }).parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin
      .from("password_setup_tokens")
      .select("email, expires_at, used_at")
      .eq("token", data.token)
      .maybeSingle();
    if (!row || row.used_at || new Date(row.expires_at).getTime() < Date.now()) {
      return { ok: false as const, error: "This link is invalid or has expired." };
    }
    return { ok: true as const, email: row.email };
  });

export const setInitialPassword = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({ token: z.string().min(32), password: z.string().min(8) }).parse(input),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Atomically claim the token (single-use): only succeeds once, for the
    // first request that gets here, regardless of concurrent double-submits.
    const nowIso = new Date().toISOString();
    const { data: claimed, error: claimError } = await supabaseAdmin
      .from("password_setup_tokens")
      .update({ used_at: nowIso })
      .eq("token", data.token)
      .is("used_at", null)
      .gt("expires_at", nowIso)
      .select("id, user_id, email")
      .maybeSingle();

    if (claimError || !claimed) {
      return { ok: false as const, error: "This link is invalid or has expired." };
    }

    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(claimed.user_id, {
      password: data.password,
    });
    if (updateError) {
      return { ok: false as const, error: updateError.message };
    }

    try {
      const { getUserEmailAndName, sendTransactionalEmailServer } =
        await import("@/lib/email/send.server");
      const { name } = await getUserEmailAndName(claimed.user_id);
      await sendTransactionalEmailServer({
        templateName: "founding-access",
        recipientEmail: claimed.email,
        idempotencyKey: `founding-access-${claimed.id}`,
        templateData: {
          signInUrl: "https://app.getfullyresourced.com/dashboard",
          name: name ?? undefined,
        },
      });
    } catch (e) {
      console.error("[password-setup] welcome email failed", e);
    }

    return { ok: true as const, email: claimed.email };
  });
