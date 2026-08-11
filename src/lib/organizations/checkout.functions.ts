import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const RosterEntrySchema = z.object({
  fullName: z.string().min(1),
  email: z.string().email(),
});

const InputSchema = z.object({
  orgName: z.string().min(1),
  submitterFullName: z.string().min(1),
  submitterEmail: z.string().email(),
  submitterPassword: z.string().min(8),
  roster: z.array(RosterEntrySchema).min(1),
  returnUrl: z.string().url(),
  environment: z.enum(["sandbox", "live"]),
});

type CheckoutResult = { clientSecret: string } | { error: string };

/**
 * Public org checkout — no account required, mirrors createFoundingCheckout's
 * shape. Unlike individual checkout, the org + its roster are persisted here,
 * before payment: Stripe checkout session metadata is capped at 500
 * chars/value, nowhere near enough to carry a roster of up to hundreds of
 * people. The checkout session only ever carries the organizationId; the
 * webhook (see checkout-completion.server.ts in this directory) reads the
 * roster back from organization_members once payment succeeds.
 */
export const createOrganizationCheckout = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data }): Promise<CheckoutResult> => {
    try {
      const seen = new Set<string>();
      for (const r of data.roster) {
        const key = r.email.toLowerCase();
        if (seen.has(key))
          return { error: `"${r.email}" appears more than once in your team list.` };
        seen.add(key);
      }

      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { hashSubmitterPassword } = await import("@/lib/organizations/submitter-auth.server");

      // Reuse a prior unpaid attempt for this submitter email instead of
      // failing on the unique-submitter-email index — lets someone who
      // abandoned checkout retry cleanly with a (possibly edited) roster.
      const { data: existingOrg } = await supabaseAdmin
        .from("organizations")
        .select("id, stripe_subscription_id")
        .ilike("submitter_email", data.submitterEmail)
        .maybeSingle();

      let organizationId: string;
      const passwordHash = await hashSubmitterPassword(data.submitterPassword);

      if (existingOrg && !existingOrg.stripe_subscription_id) {
        organizationId = existingOrg.id;
        const { error: updateError } = await supabaseAdmin
          .from("organizations")
          .update({
            name: data.orgName,
            submitter_full_name: data.submitterFullName,
            submitter_password_hash: passwordHash,
          })
          .eq("id", organizationId);
        if (updateError) {
          console.error("[org-checkout] failed to update pending org", updateError);
          return { error: "Something went wrong starting checkout. Please try again." };
        }
        const { error: deleteError } = await supabaseAdmin
          .from("organization_members")
          .delete()
          .eq("organization_id", organizationId);
        if (deleteError) {
          console.error("[org-checkout] failed to clear pending roster", deleteError);
          return { error: "Something went wrong starting checkout. Please try again." };
        }
      } else if (existingOrg) {
        // Already paid — this email owns an active org, not a fresh signup.
        return {
          error:
            "This email already manages an organization on Fully Resourced. Log in to your team portal instead.",
        };
      } else {
        const { data: created, error: createError } = await supabaseAdmin
          .from("organizations")
          .insert({
            name: data.orgName,
            submitter_full_name: data.submitterFullName,
            submitter_email: data.submitterEmail,
            submitter_password_hash: passwordHash,
          })
          .select("id")
          .single();
        if (createError || !created) {
          console.error("[org-checkout] failed to create org", createError);
          return { error: "Something went wrong starting checkout. Please try again." };
        }
        organizationId = created.id;
      }

      const { error: membersError } = await supabaseAdmin.from("organization_members").insert(
        data.roster.map((r) => ({
          organization_id: organizationId,
          email: r.email,
          full_name: r.fullName,
          status: "invited",
        })),
      );
      if (membersError) {
        // Most likely: someone in this roster is already an active/invited
        // member of a different org (the partial unique index on active
        // emails). Surface a clear message instead of a raw DB error.
        console.error("[org-checkout] failed to insert roster", membersError);
        return {
          error:
            "One or more people on your list are already part of another organization's team on Fully Resourced. Please remove them and try again.",
        };
      }

      const { createStripeClient, getStripeErrorMessage } = await import("@/lib/stripe.server");
      const { resolveOrgSeatPriceId } = await import("@/lib/organizations/stripe-sync.server");
      const { getSeatTier } = await import("@/lib/organizations/seat-pricing");

      const stripe = createStripeClient(data.environment);
      const tier = getSeatTier(data.roster.length);
      let priceId: string;
      try {
        priceId = await resolveOrgSeatPriceId(stripe, data.environment, tier);
      } catch (error) {
        console.error("[org-checkout] failed to resolve seat price", error);
        return { error: getStripeErrorMessage(error) };
      }

      const customer = await stripe.customers.create({
        name: data.orgName,
        email: data.submitterEmail,
        metadata: { organizationId },
      });

      const session = await stripe.checkout.sessions.create({
        line_items: [{ price: priceId, quantity: data.roster.length }],
        mode: "subscription",
        ui_mode: "embedded_page",
        return_url: data.returnUrl,
        customer: customer.id,
        metadata: { organizationId },
        subscription_data: { metadata: { organizationId } },
      });

      return { clientSecret: session.client_secret ?? "" };
    } catch (error) {
      const { getStripeErrorMessage } = await import("@/lib/stripe.server");
      return { error: getStripeErrorMessage(error) };
    }
  });
