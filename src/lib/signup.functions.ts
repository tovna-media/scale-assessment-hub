import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const InputSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  phone: z.string().min(1),
});

export const signupUser = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const fullName = `${data.firstName} ${data.lastName}`.trim();

    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        first_name: data.firstName,
        last_name: data.lastName,
        phone: data.phone,
      },
    });

    if (error || !created?.user) {
      return { ok: false as const, error: error?.message ?? "Signup failed" };
    }

    // Fire welcome email server-side (admin path, no session needed).
    try {
      const { sendTransactionalEmailServer } = await import("@/lib/email/send.server");
      await sendTransactionalEmailServer({
        templateName: "welcome",
        recipientEmail: data.email,
        idempotencyKey: `welcome-${created.user.id}`,
        templateData: { name: data.firstName || fullName },
      });
    } catch (e) {
      console.error("[signup] welcome email failed", e);
    }

    // Tag in GHL. Only reached when a new auth user was actually created
    // above (a retry with the same email fails createUser and returns
    // early), so this can't double-fire for one account.
    try {
      const { notifyGhlTag } = await import("@/lib/ghl-notify.server");
      await notifyGhlTag({
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        fullName,
        phone: data.phone,
        event: "signup",
        tag: "fully resourced sign up",
      });
    } catch (e) {
      console.error("[signup] GHL tag failed", e);
    }

    return { ok: true as const };
  });