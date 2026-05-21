import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  IC_CONTENT,
  combinedScaleLevel,
  scoreBusiness,
  scoreInnerCapacity,
  scoreLeadership,
  type AssessmentType,
} from "@/lib/assessments";
import { generateGapReportPdfAndNotify } from "@/lib/gap-report-delivery.server";

const InputSchema = z.object({
  sessionId: z.string().uuid(),
});

type SessionRow = {
  id: string;
  assessment_type: AssessmentType;
  overall_score: number;
  subcategory_scores: Record<string, number> | null;
  responses: Record<string, number> | null;
  gap_report: string | null;
  created_at: string;
};

async function wait(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

function toNumberMap(raw: Record<string, number> | null | undefined): Record<number, number> {
  const out: Record<number, number> = {};
  for (const [k, v] of Object.entries(raw ?? {})) out[Number(k)] = Number(v);
  return out;
}

/* ---------- AI narrative schema ---------- */

const AISchema = z.object({
  executive_summary: z.string().min(1),
  capacity_have: z.array(z.string().min(1)).min(1),
  capacity_lack: z.array(z.string().min(1)).optional().default([]),
  capacity_closing: z.string().optional().default(""),
  leadership_what_this_means: z.string().min(1),
  business_what_this_means: z.string().min(1),
  patterns: z
    .array(
      z.object({
        name: z.string().min(1),
        arrows: z.array(z.string().min(1)).min(1),
        summary: z.string().min(1),
      }),
    )
    .min(1),
  real_problem: z.string().min(1),
  recommendation_reframe: z.string().min(1),
  you_already_have: z.array(z.string().min(1)).min(1),
  now_you_need: z.array(z.string().min(1)).min(1),
  diy_pitch: z.string().min(1),
  diy_bullets: z.array(z.string().min(1)).min(1),
  leaders_edge_pitch: z.string().min(1),
  leaders_edge_bullets: z.array(z.string().min(1)).min(1),
  coaching_pitch: z.string().min(1),
  coaching_bullets: z.array(z.string().min(1)).min(1),
  final_thought: z.string().min(1),
});
type AIPayload = z.infer<typeof AISchema>;

function extractJson(text: string): unknown {
  let cleaned = text.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
  const start = cleaned.search(/[\{\[]/);
  if (start === -1) throw new Error("No JSON in response");
  const openChar = cleaned[start];
  const closeChar = openChar === "{" ? "}" : "]";
  const end = cleaned.lastIndexOf(closeChar);
  cleaned = end > start ? cleaned.substring(start, end + 1) : cleaned.substring(start);
  try {
    return JSON.parse(cleaned);
  } catch {
    // repair: balance braces/brackets
    let braces = 0, brackets = 0, inStr = false, esc = false;
    for (const c of cleaned) {
      if (esc) { esc = false; continue; }
      if (c === "\\") { esc = true; continue; }
      if (c === '"') { inStr = !inStr; continue; }
      if (inStr) continue;
      if (c === "{") braces++;
      else if (c === "}") braces--;
      else if (c === "[") brackets++;
      else if (c === "]") brackets--;
    }
    let repaired = cleaned.replace(/,\s*([}\]])/g, "$1");
    if (inStr) repaired += '"';
    while (brackets-- > 0) repaired += "]";
    while (braces-- > 0) repaired += "}";
    return JSON.parse(repaired);
  }
}

/* ---------- Markdown assembly ---------- */

function fmtList(items: string[]): string {
  return items.map((s) => `- ${s}`).join("\n");
}

function buildInnerCapacityMarkdown(ic: ReturnType<typeof scoreInnerCapacity>): string {
  const parts: string[] = ["# Inner Capacity Analysis", ""];
  for (const cat of ic.categories) {
    const content = IC_CONTENT[cat.name];
    if (!content) continue;
    const tier =
      cat.level === "Critical Gap"
        ? content.critical
        : cat.level === "Moderate Gap"
          ? content.moderate
          : null;

    parts.push(`**${cat.name}** — ${cat.score} — ${cat.level}`);
    parts.push("");
    parts.push("Indicators:");
    const indicators = tier ? tier.indicators : content.strength.indicators;
    parts.push(fmtList(indicators));
    parts.push("");
    if (tier) {
      parts.push("What this means:");
      parts.push(tier.whatThisMeans);
      parts.push("");
    }
  }
  return parts.join("\n");
}

function buildLeadershipMarkdown(
  lead: ReturnType<typeof scoreLeadership>,
  whatThisMeans: string,
): string {
  const parts: string[] = ["# Personal Leadership Analysis", "", `**Score:** ${lead.total}`, ""];
  parts.push("## Areas to Develop", "");
  if (lead.themeGroups.length === 0) {
    parts.push("No flagged areas — your leadership is consistent across the board.");
    parts.push("");
  } else {
    for (const g of lead.themeGroups) {
      parts.push(`**${g.theme}**`);
      parts.push(fmtList(g.descriptors));
      parts.push("");
    }
  }
  parts.push("## Strengths", "");
  if (lead.strengthCategories.length === 0) {
    parts.push("No standout category-level strengths yet — focus on closing the gaps above first.");
  } else {
    parts.push(fmtList(lead.strengthCategories));
  }
  parts.push("", "## What This Means", "", whatThisMeans, "");
  return parts.join("\n");
}

function buildBusinessMarkdown(
  biz: ReturnType<typeof scoreBusiness>,
  whatThisMeans: string,
): string {
  const parts: string[] = ["# Business Audit Analysis", "", `**Score:** ${biz.total}`, ""];
  const section = (title: string, items: typeof biz.critical) => {
    parts.push(`## ${title}`, "");
    if (items.length === 0) parts.push("- None");
    else parts.push(fmtList(items.map((c) => c.name)));
    parts.push("");
  };
  section("Critical Gaps", biz.critical);
  section("Moderate Gaps", biz.moderate);
  section("Strengths", biz.strengths);
  parts.push("## What This Means", "", whatThisMeans, "");
  return parts.join("\n");
}

function buildCrossConnection(ai: AIPayload): string {
  const parts: string[] = ["# Cross-Connection Analysis", ""];
  ai.patterns.forEach((p, i) => {
    parts.push(`## Pattern #${i + 1}: ${p.name}`, "");
    for (const a of p.arrows) parts.push(`- ${a}`);
    parts.push("", p.summary, "");
  });
  parts.push("## The Real Problem", "", ai.real_problem, "");
  return parts.join("\n");
}

function buildRecommendation(ai: AIPayload): string {
  const parts: string[] = [
    "# Recommendation",
    "",
    ai.recommendation_reframe,
    "",
    "**You already have:**",
    fmtList(ai.you_already_have),
    "",
    "**Now you need:**",
    fmtList(ai.now_you_need),
    "",
    "## Three Coaching Options",
    "",
    "**DIY Path** — " + ai.diy_pitch,
    fmtList(ai.diy_bullets),
    "",
    "**Leaders Edge** — " + ai.leaders_edge_pitch,
    fmtList(ai.leaders_edge_bullets),
    "",
    "**1:1 Coaching with Rich** — " + ai.coaching_pitch,
    fmtList(ai.coaching_bullets),
    "",
  ];
  return parts.join("\n");
}

function buildExecutive(ai: AIPayload): string {
  const parts: string[] = [
    "# Executive Summary",
    "",
    ai.executive_summary,
    "",
    "## Capacity Summary",
    "",
    "**You have:**",
    fmtList(ai.capacity_have),
    "",
  ];
  if (ai.capacity_lack && ai.capacity_lack.length > 0) {
    parts.push("**But you lack:**", fmtList(ai.capacity_lack), "");
  } else if (ai.capacity_closing) {
    parts.push(ai.capacity_closing, "");
  }
  return parts.join("\n");
}

/* ---------- Server function ---------- */

export const generateGapReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Gate: require all three assessments
    {
      const { data: typesRows } = await supabase
        .from("assessment_sessions")
        .select("assessment_type")
        .eq("user_id", userId);
      const distinct = new Set((typesRows ?? []).map((r) => r.assessment_type));
      if (distinct.size < 3) {
        throw new Error("Complete all three assessments to generate your Gap Report.");
      }
    }

    // Load triggering session (with retry — may have just been written)
    let session: SessionRow | null = null;
    let lastError: { message?: string } | null = null;
    for (let attempt = 0; attempt < 10; attempt++) {
      const result = await supabase
        .from("assessment_sessions")
        .select("id, assessment_type, overall_score, subcategory_scores, responses, gap_report, created_at")
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
    if (!session) throw new Error(lastError?.message ?? "Session not found");
    if (session.gap_report) {
      let delivery:
        | Awaited<ReturnType<typeof generateGapReportPdfAndNotify>>
        | { webhookSent: false; error: string }
        | null = null;
      try {
        delivery = await generateGapReportPdfAndNotify(userId, session.id);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown delivery error";
        console.error("Gap report PDF/GHL delivery failed", error);
        delivery = { webhookSent: false, error: message };
      }
      return { session, delivery };
    }

    // Profile (for personalized greeting)
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, first_name")
      .eq("id", userId)
      .maybeSingle();
    const firstName =
      profile?.first_name ||
      profile?.full_name?.split(" ")[0] ||
      "";

    // Latest session of each type
    const { data: allSessions } = await supabase
      .from("assessment_sessions")
      .select("id, assessment_type, responses, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    const latestByType: Partial<Record<AssessmentType, { responses: Record<number, number> }>> = {};
    for (const row of allSessions ?? []) {
      const t = row.assessment_type as AssessmentType;
      if (!latestByType[t]) {
        latestByType[t] = { responses: toNumberMap(row.responses as Record<string, number> | null) };
      }
    }
    // Always prefer the triggering session's own responses for its type
    latestByType[session.assessment_type] = {
      responses: toNumberMap(session.responses),
    };

    const icResp = latestByType.inner_capacity?.responses ?? {};
    const leadResp = latestByType.personal_leadership?.responses ?? {};
    const bizResp = latestByType.business_audit?.responses ?? {};

    const ic = scoreInnerCapacity(icResp);
    const lead = scoreLeadership(leadResp);
    const biz = scoreBusiness(bizResp);

    const combinedTotal = ic.total + lead.total + biz.total;
    const combinedLevel = combinedScaleLevel(combinedTotal);

    // Build a compact data payload for the AI — narrative only.
    const aiInput = {
      first_name: firstName,
      combined: { total: combinedTotal, max: 445, level: combinedLevel },
      inner_capacity: {
        total: ic.total,
        level: ic.level,
        primary_gap: ic.primary.name,
        primary_gap_level: ic.primary.level,
        secondary_gap: ic.secondary?.name ?? null,
        categories: ic.categories.map((c) => ({ name: c.name, score: c.score, level: c.level })),
      },
      personal_leadership: {
        total: lead.total,
        themes_flagged: lead.themeGroups.map((g) => ({
          theme: g.theme,
          signals: g.descriptors,
        })),
        strengths: lead.strengthCategories,
      },
      business_audit: {
        total: biz.total,
        critical: biz.critical.map((c) => c.name),
        moderate: biz.moderate.map((c) => c.name),
        developing: biz.developing.map((c) => c.name),
        strengths: biz.strengths.map((c) => c.name),
      },
    };

    const systemPrompt = `You are Rich Lohman, an executive leadership coach writing a personalized SCALE Gap Report for a leader you respect.

VOICE — non-negotiable:
- Speak directly to the leader in second person ("you", "your").
- Short sentences. Plain English. Like a trusted advisor talking, not a consultant writing.
- Warm but direct. Honest, not soft. Specific, not generic.
- BANNED words and phrases: "foundational ambiguity", "stymied", "unequivocally", "synergy", "holistic", "leverage" (as verb), "ecosystem", "robust", "facilitate", "myriad", "paradigm", "actionable insights", "strategic imperative", "unlock potential", "best-in-class", "world-class", "thought leader", "deep dive", "circle back", "double-click", "moving forward", any em-dash-heavy academic prose. No AI disclaimers. No "as your coach". No bullet points stuffed with adjectives.
- Use contractions ("you're", "it's", "won't"). Real speech rhythm.
- Reference the specific scores and gap categories you're given — never speak in the abstract.
- The leader is not failing on effort. Name the actual structural constraint.
- Never use the arrow character "→". Use "->" instead.

You are writing the NARRATIVE pieces of the report. The deterministic scoring sections are assembled separately — do not produce them.

Return ONLY valid JSON matching this exact shape (no markdown, no commentary):

{
  "executive_summary": "2 short paragraphs. Name the combined score and level. State the one core pattern you see across all three assessments. Set up what the rest of the report will show.",
  "capacity_have": ["3-4 short bullet phrases of what this leader genuinely has (strengths the scores show)"],
  "capacity_lack": ["3-4 short bullet phrases of what's actually missing. OMIT this field entirely (or return []) if the leader has NO Critical or Moderate gaps across Inner Capacity and Business Audit."],
  "capacity_closing": "Only include when capacity_lack is empty: 1 short sentence affirming the strong result and pointing to what's next (e.g. compounding, scaling, or sustaining the strength). Omit otherwise.",
  "leadership_what_this_means": "1 paragraph. Connect the flagged leadership themes back to the Inner Capacity primary gap. Show how the inner gap is what's producing the leadership inconsistency.",
  "business_what_this_means": "1 paragraph. Show how the business gaps trace back to the leadership inconsistency and the inner capacity gap. Name the cascade.",
  "patterns": [
    {
      "name": "Short, punchy name for the pattern (≤6 words)",
      "arrows": ["Inner Capacity primary gap -> specific leadership impact", "-> specific business impact"],
      "summary": "One sentence naming what this pattern actually costs the leader."
    },
    {
      "name": "Compounding dynamic name",
      "arrows": ["How one gap reinforces another", "-> second-order effect"],
      "summary": "One sentence on why this gets worse without intervention."
    },
    {
      "name": "Strength being undermined",
      "arrows": ["A real strength they have -> being eroded by the primary constraint"],
      "summary": "One sentence on what's being wasted."
    }
  ],
  "real_problem": "Exactly 3 short sentences. Sentence 1: absolve them of effort failure (this isn't about working harder). Sentence 2: name the actual constraint in plain words. Sentence 3: state the consequence of leaving it unaddressed.",
  "recommendation_reframe": "1 paragraph reframing the path forward. Not 'work on yourself' — name the specific lever.",
  "you_already_have": ["3 short bullets — capabilities to build on"],
  "now_you_need": ["3 short bullets — what to install next, gap-specific"],
  "diy_pitch": "1-2 sentence pitch for self-directed implementation, honest about who it fits.",
  "diy_bullets": ["3 bullets specific to this leader's gaps"],
  "leaders_edge_pitch": "1-2 sentence pitch for the group program.",
  "leaders_edge_bullets": ["3 bullets specific to this leader's gaps"],
  "coaching_pitch": "1-2 sentence pitch for 1:1 coaching, recommended for high-impact gaps.",
  "coaching_bullets": ["3 bullets specific to this leader's gaps"],
  "final_thought": "1 short paragraph. Direct. Warm. End on what's actually possible if they close the constraint."
}`;

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
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: JSON.stringify(aiInput, null, 2) },
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

    const aiRaw = await response.json();
    const rawText: string = aiRaw?.choices?.[0]?.message?.content ?? "";
    if (!rawText) throw new Error("Empty report returned from the AI service.");

    let aiParsed: AIPayload;
    try {
      aiParsed = AISchema.parse(extractJson(rawText));
    } catch (e) {
      console.error("AI payload validation failed:", e, "\nRaw:", rawText.slice(0, 2000));
      throw new Error("The AI returned an unexpected format. Please try again.");
    }

    // Cover header (rendered inside the markdown body too so PDF + UI match)
    const header =
      `# Your SCALE Gap Report\n\n` +
      (firstName ? `${firstName},\n\n` : "") +
      `**Combined SCALE Score:** ${combinedTotal} — ${combinedLevel}\n\n` +
      `Inner Capacity: ${ic.total} · Personal Leadership: ${lead.total} · Business Audit: ${biz.total}\n\n`;

    const finalMarkdown = [
      header,
      buildExecutive(aiParsed),
      buildInnerCapacityMarkdown(ic),
      buildLeadershipMarkdown(lead, aiParsed.leadership_what_this_means),
      buildBusinessMarkdown(biz, aiParsed.business_what_this_means),
      buildCrossConnection(aiParsed),
      buildRecommendation(aiParsed),
      "# Final Thought\n",
      aiParsed.final_thought,
      "",
    ].join("\n");

    const { error: updateError } = await supabase
      .from("assessment_sessions")
      .update({ gap_report: finalMarkdown })
      .eq("id", data.sessionId)
      .eq("user_id", userId);

    if (updateError) throw new Error(updateError.message);

    let delivery:
      | Awaited<ReturnType<typeof generateGapReportPdfAndNotify>>
      | { webhookSent: false; error: string }
      | null = null;
    try {
      delivery = await generateGapReportPdfAndNotify(userId, session.id);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown delivery error";
      console.error("Gap report PDF/GHL delivery failed", error);
      delivery = { webhookSent: false, error: message };
    }

    return {
      session: {
        ...session,
        gap_report: finalMarkdown,
      },
      delivery,
    };
  });