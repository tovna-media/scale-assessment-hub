import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { ASSESSMENTS, calculateScores, type AssessmentType } from "@/lib/assessments";

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
    return { sessionId: row.id as string };
  });