import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { ASSESSMENTS, calculateScores, type AssessmentType } from "@/lib/assessments";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { assertSafeWebhookUrl } from "@/lib/webhook-url";

async function isUserSubscribed(
  supabase: { rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown }> },
  userId: string,
): Promise<boolean> {
  try {
    const { data } = await supabase.rpc("has_active_subscription", { _user_id: userId });
    return Boolean(data);
  } catch {
    return false;
  }
}

const InputSchema = z.object({
  assessment_type: z.enum(["inner_capacity", "personal_leadership", "business_audit"]),
  responses: z.record(z.string(), z.number().int().min(1).max(5)),
});

export const submitAssessment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const def = ASSESSMENTS[data.assessment_type as AssessmentType];
    if (!def) throw new Error("Unknown assessment type");

    // Free-pass gate: after the free pass is used, only subscribers can start/submit assessments.
    {
      const { data: prof } = await supabase
        .from("profiles")
        .select("free_pass_used")
        .eq("id", userId)
        .maybeSingle();
      const freePassUsed = Boolean((prof as { free_pass_used?: boolean } | null)?.free_pass_used);
      const subscribed = await isUserSubscribed(
        supabase as unknown as Parameters<typeof isUserSubscribed>[0],
        userId,
      );
      if (freePassUsed && !subscribed) {
        throw new Error("PAYWALL: You've used your free SCALE report. Subscribe to continue.");
      }
    }

    // Re-derive scores on the server from raw responses (never trust client values)
    const numericResponses: Record<number, number> = {};
    for (const [k, v] of Object.entries(data.responses)) {
      const idx = Number(k);
      if (!Number.isInteger(idx) || idx < 0 || idx >= def.questions.length) {
        throw new Error("Invalid response index");
      }
      numericResponses[idx] = v;
    }
    // Require all questions answered
    for (let i = 0; i < def.questions.length; i++) {
      if (numericResponses[i] === undefined) {
        throw new Error("All questions must be answered");
      }
    }

    const scored = calculateScores(data.assessment_type, numericResponses);

    const { data: row, error } = await supabase
      .from("assessment_sessions")
      .insert({
        user_id: userId,
        assessment_type: data.assessment_type,
        responses: numericResponses as unknown as Record<string, number>,
        subcategory_scores: scored.subcategoryScores,
        overall_score: scored.overall,
        primary_gap: scored.primary_gap,
        primary_gap_score: scored.primary_gap_score,
        primary_gap_level: scored.primary_gap_level,
        secondary_gap: scored.secondary_gap,
        secondary_gap_score: scored.secondary_gap_score,
        overall_level: scored.overall_level,
      } as never)
      .select("id")
      .single();

    if (error || !row) throw new Error(error?.message ?? "Could not save responses");

    // Funnel: assessment finished
    try {
      await supabase.from("funnel_events").insert({
        user_id: userId,
        event_type: "finished_assessment",
        metadata: { assessment_type: data.assessment_type, session_id: row.id, score: scored.overall } as Record<string, unknown>,
      } as never);
    } catch (e) {
      console.error("[funnel] finished_assessment insert failed", e);
    }

    // Per-assessment GHL webhook (fire-and-forget; never blocks the user)
    try {
      const { data: settings } = await supabaseAdmin
        .from("app_settings")
        .select("ghl_enabled, ghl_webhook_url")
        .eq("id", 1)
        .maybeSingle();

      if (settings?.ghl_enabled && settings.ghl_webhook_url) {
        const { data: profile } = await supabaseAdmin
          .from("profiles")
          .select("first_name, last_name, full_name, email, phone")
          .eq("id", userId)
          .maybeSingle();

        if (profile) {
          const payload = {
            event: "assessment_completed",
            first_name: profile.first_name,
            last_name: profile.last_name,
            full_name: profile.full_name,
            email: profile.email,
            phone: profile.phone,
            assessment_type: data.assessment_type,
            score: scored.overall,
            completed_at: new Date().toISOString(),
          };
          try {
            const safeUrl = assertSafeWebhookUrl(settings.ghl_webhook_url);
            const res = await fetch(safeUrl.toString(), {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
            });
            if (!res.ok) {
              console.error("[GHL] per-assessment webhook non-OK", res.status);
            }
          } catch (e) {
            console.error("[GHL] Rejected webhook URL:", (e as Error).message);
          }
        }
      }
    } catch (e) {
      console.error("[GHL] per-assessment webhook failed", e);
    }

    return { sessionId: row.id as string };
  });

// Lightweight access check used by the assessment page loader/effect so the
// UI can bounce a paywalled user before they fill anything in. The real
// enforcement lives in submitAssessment + generateGapReport (which also
// re-check server-side and cannot be bypassed by refreshing).
export const checkAssessmentAccess = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: prof } = await supabase
      .from("profiles")
      .select("free_pass_used")
      .eq("id", userId)
      .maybeSingle();
    const freePassUsed = Boolean((prof as { free_pass_used?: boolean } | null)?.free_pass_used);
    const subscribed = await isUserSubscribed(
      supabase as unknown as Parameters<typeof isUserSubscribed>[0],
      userId,
    );
    const allowed = !freePassUsed || subscribed;
    return {
      allowed,
      reason: allowed
        ? null
        : ("You've used your free SCALE report. Subscribe to continue." as const),
    };
  });