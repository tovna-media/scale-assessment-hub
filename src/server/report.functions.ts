import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

const InputSchema = z.object({
  sessionId: z.string().uuid(),
  accessToken: z.string().min(1),
});

export const generateGapReport = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data }) => {
    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY;
    if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
      throw new Error("Supabase environment variables are not configured.");
    }

    const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      global: { headers: { Authorization: `Bearer ${data.accessToken}` } },
      auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    });

    const { data: claims, error: claimsErr } = await supabase.auth.getClaims(data.accessToken);
    if (claimsErr || !claims?.claims?.sub) {
      throw new Error("Unauthorized");
    }
    const userId = claims.claims.sub;

    // Load the target session
    const { data: session, error: sErr } = await supabase
      .from("assessment_sessions")
      .select("*")
      .eq("id", data.sessionId)
      .eq("user_id", userId)
      .maybeSingle();

    if (sErr) throw new Error(sErr.message);
    if (!session) throw new Error("Session not found");

    // If we already have a report, return it (idempotent)
    if (session.gap_report) {
      return { report: session.gap_report, overall: session.overall_score };
    }

    // Load the user's most recent session per assessment type for cross-context
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

    const latestByType: Record<string, {
      overall_score: number;
      subcategory_scores: Record<string, number>;
    }> = {};
    for (const s of allSessions ?? []) {
      if (!latestByType[s.assessment_type]) {
        latestByType[s.assessment_type] = {
          overall_score: s.overall_score,
          subcategory_scores: (s.subcategory_scores ?? {}) as Record<string, number>,
        };
      }
    }

    // Ensure the current session is reflected as latest
    latestByType[session.assessment_type] = {
      overall_score: session.overall_score,
      subcategory_scores: (session.subcategory_scores ?? {}) as Record<string, number>,
    };

    const ASSESSMENT_LABELS: Record<string, string> = {
      inner_capacity: "Inner Capacity Assessment",
      personal_leadership: "Personal Leadership Assessment",
      business_audit: "Business Audit",
    };

    const userPayload = {
      assessee_name: profile?.full_name || "this leader",
      current_assessment: ASSESSMENT_LABELS[session.assessment_type],
      assessments: Object.entries(latestByType).map(([type, v]) => ({
        name: ASSESSMENT_LABELS[type],
        overall_score: v.overall_score,
        subcategories: v.subcategory_scores,
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
    if (!apiKey) throw new Error("LOVABLE_API_KEY not configured");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
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
      const text = await response.text();
      console.error("AI gateway error", response.status, text);
      throw new Error("Could not generate the report. Please try again.");
    }

    const ai = await response.json();
    const report: string = ai?.choices?.[0]?.message?.content ?? "";
    if (!report) throw new Error("Empty report returned from the AI service.");

    // Persist
    const { error: updateErr } = await supabase
      .from("assessment_sessions")
      .update({ gap_report: report })
      .eq("id", data.sessionId);
    if (updateErr) console.error("Failed to save report", updateErr);

    return { report, overall: session.overall_score };
  });