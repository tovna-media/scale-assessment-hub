import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { assertSafeWebhookUrl } from "@/lib/webhook-url";

const InputSchema = z.object({
  sessionId: z.string().uuid(),
});

const ASSESSMENT_LABELS: Record<string, string> = {
  inner_capacity: "Inner Capacity Assessment",
  personal_leadership: "Personal Leadership Assessment",
  business_audit: "Business Audit",
};

type SessionRow = {
  id: string;
  assessment_type: string;
  overall_score: number;
  subcategory_scores: Record<string, number> | null;
  gap_report: string | null;
  created_at: string;
};

async function wait(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

export const generateGapReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Gate: only allow gap report when all 3 assessments have been completed.
    {
      const { data: typesRows } = await supabase
        .from("assessment_sessions")
        .select("assessment_type")
        .eq("user_id", userId);
      const distinct = new Set((typesRows ?? []).map((r) => r.assessment_type));
      if (distinct.size < 3) {
        throw new Error(
          "Complete all three assessments to generate your Gap Report.",
        );
      }
    }

    let session: SessionRow | null = null;
    let lastError: { message?: string } | null = null;

    for (let attempt = 0; attempt < 10; attempt++) {
      const result = await supabase
        .from("assessment_sessions")
        .select("id, assessment_type, overall_score, subcategory_scores, gap_report, created_at")
        .eq("id", data.sessionId)
        .eq("user_id", userId)
        .maybeSingle();

      if (result.data) {
        session = result.data as unknown as SessionRow;
        break;
      }

      lastError = result.error;
      await wait(300);
    }

    if (!session) {
      throw new Error(lastError?.message ?? "Session not found");
    }

    if (session.gap_report) {
      return { session };
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, email")
      .eq("id", userId)
      .maybeSingle();

    const { data: allSessions } = await supabase
      .from("assessment_sessions")
      .select("assessment_type, subcategory_scores, overall_score, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    const latestByType: Record<
      string,
      {
        overall_score: number;
        subcategory_scores: Record<string, number>;
      }
    > = {};

    for (const row of allSessions ?? []) {
      if (!latestByType[row.assessment_type]) {
        latestByType[row.assessment_type] = {
          overall_score: row.overall_score,
          subcategory_scores: (row.subcategory_scores ?? {}) as Record<string, number>,
        };
      }
    }

    latestByType[session.assessment_type] = {
      overall_score: session.overall_score,
      subcategory_scores: (session.subcategory_scores ?? {}) as Record<string, number>,
    };

    const userPayload = {
      assessee_name: profile?.full_name || "this leader",
      current_assessment: ASSESSMENT_LABELS[session.assessment_type],
      assessments: Object.entries(latestByType).map(([type, value]) => ({
        name: ASSESSMENT_LABELS[type],
        overall_score: value.overall_score,
        subcategories: value.subcategory_scores,
      })),
    };

    const systemPrompt = `You are Rich Lohman, an executive leadership coach. Generate a personalized SCALE Gap Report for the assessee in a direct, warm, executive-grade voice. No fluff, no AI disclaimers. Address the assessee in second person ("you"). Use the EXACT structure below with markdown headings.

# Overall SCALE Score
One short paragraph describing what the overall score signals.

# Inner Capacity Analysis
For EACH subcategory present, write: "**<Subcategory Name>** — <Critical Gap | Moderate Gap | Strength>: <one to two crisp sentences>". Use < 60 = Critical Gap, 60-79 = Moderate Gap, 80+ = Strength.

# Personal Leadership Analysis
Same format as above for personal leadership subcategories present.

# Business Audit Analysis
Same format as above for business audit subcategories present.

# Cross-Connection Analysis
2-3 paragraphs explaining how gaps in one area cascade into the others. Be specific to the scores.

# Your Next Step
Recommend a path. Briefly describe these three options and which fits this assessee best:
- DIY Path (self-directed)
- Leaders Edge (group program)
- 1:1 Coaching with Rich (recommended for high-impact gaps)

If a section's assessment was not taken, write a single line under that heading: "_Not yet taken — complete this assessment for a fuller picture._"`;

    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("Report generation is not configured.");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: JSON.stringify(userPayload, null, 2) },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        throw new Error("Too many requests right now — please try again in a minute.");
      }
      if (response.status === 402) {
        throw new Error("AI credits exhausted. Please add credits in your workspace settings.");
      }
      throw new Error("Could not generate the report. Please try again.");
    }

    const ai = await response.json();
    const report: string = ai?.choices?.[0]?.message?.content ?? "";
    if (!report) throw new Error("Empty report returned from the AI service.");

    const { error: updateError } = await supabase
      .from("assessment_sessions")
      .update({ gap_report: report })
      .eq("id", data.sessionId)
      .eq("user_id", userId);

    if (updateError) throw new Error(updateError.message);

    // GHL webhook (fire-and-forget; errors logged but don't block the report).
    // Fires as soon as the report is generated, so coaches get the lead in
    // GHL even if the assessee never downloads the PDF.
    try {
      const { data: settings } = await supabaseAdmin
        .from("app_settings")
        .select("ghl_enabled, ghl_webhook_url")
        .eq("id", 1)
        .maybeSingle();

      if (settings?.ghl_enabled && settings.ghl_webhook_url) {
        const { data: fullProfile } = await supabaseAdmin
          .from("profiles")
          .select("email, first_name, last_name, full_name, phone")
          .eq("id", userId)
          .maybeSingle();

        const { data: fullSession } = await supabaseAdmin
          .from("assessment_sessions")
          .select(
            "assessment_type, overall_score, overall_level, primary_gap, primary_gap_score, primary_gap_level, secondary_gap, secondary_gap_score, subcategory_scores",
          )
          .eq("id", data.sessionId)
          .maybeSingle();

        if (fullProfile && fullSession) {
          const payload = {
            email: fullProfile.email,
            first_name: fullProfile.first_name,
            last_name: fullProfile.last_name,
            full_name: fullProfile.full_name,
            phone: fullProfile.phone,
            assessment_type: fullSession.assessment_type,
            overall_score: fullSession.overall_score,
            overall_level: fullSession.overall_level,
            primary_gap: fullSession.primary_gap,
            primary_gap_score: fullSession.primary_gap_score,
            primary_gap_level: fullSession.primary_gap_level,
            secondary_gap: fullSession.secondary_gap,
            secondary_gap_score: fullSession.secondary_gap_score,
            subcategory_scores: fullSession.subcategory_scores,
            pdf_url: null,
            generated_at: new Date().toISOString(),
          };
          try {
            const safeUrl = assertSafeWebhookUrl(settings.ghl_webhook_url);
            const res = await fetch(safeUrl.toString(), {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
            });
            if (!res.ok) {
              console.error("[GHL] webhook non-OK", res.status, await res.text().catch(() => ""));
            } else {
              await supabaseAdmin
                .from("gap_reports")
                .upsert(
                  {
                    user_id: userId,
                    report_data: {
                      session_id: data.sessionId,
                      assessment_type: fullSession.assessment_type,
                      subcategory_scores: fullSession.subcategory_scores,
                    } as never,
                    primary_gap: fullSession.primary_gap,
                    primary_gap_level: fullSession.primary_gap_level,
                    ghl_sent_at: new Date().toISOString(),
                  },
                  { onConflict: "user_id" },
                );
            }
          } catch (e) {
            console.error("[GHL] webhook send failed", (e as Error).message);
          }
        }
      }
    } catch (e) {
      console.error("[GHL] webhook setup failed", e);
    }

    return {
      session: {
        ...session,
        gap_report: report,
      },
    };
  });
