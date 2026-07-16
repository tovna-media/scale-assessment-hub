import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const FUNNEL_EVENT_TYPES = [
  "signed_up",
  "started_assessment",
  "finished_assessment",
  "generated_gap_report",
  "viewed_gap_report",
  "clicked_subscribe",
] as const;

const InputSchema = z.object({
  event_type: z.enum(FUNNEL_EVENT_TYPES),
  metadata: z.record(z.string(), z.unknown()).optional().default({}),
});

export const logFunnelEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase.from("funnel_events").insert({
      user_id: userId,
      event_type: data.event_type,
      metadata: (data.metadata ?? {}) as Record<string, unknown>,
    } as never);
    if (error) {
      // Non-fatal for the caller — analytics only.
      console.error("[funnel] insert failed", error);
      return { ok: false as const, error: error.message };
    }
    return { ok: true as const };
  });