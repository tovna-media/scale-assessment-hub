import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type MemberAccessState = "paid" | "free_unused" | "free_used";

export interface MemberAccess {
  state: MemberAccessState;
  subscribed: boolean;
  freePassUsed: boolean;
}

/**
 * Canonical server-side read of the member's access state. Every gate in the
 * app (section pages, assessment start/submit, gap-report generation) must
 * derive access from this — never from screen layout.
 *
 * - paid:        active subscription (full access)
 * - free_unused: no subscription, has not yet generated their first gap report
 *                (may take the three assessments once + generate one gap report)
 * - free_used:   no subscription, free pass already spent
 *                (everything locked except viewing the gap report they made)
 */
export const getAccessState = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<MemberAccess> => {
    const { supabase, userId } = context;

    let subscribed = false;
    try {
      const { data } = await supabase.rpc("has_active_subscription", {
        _user_id: userId,
      });
      subscribed = Boolean(data);
    } catch {
      subscribed = false;
    }

    let freePassUsed = false;
    try {
      const { data: prof } = await supabase
        .from("profiles")
        .select("free_pass_used")
        .eq("id", userId)
        .maybeSingle();
      freePassUsed = Boolean(
        (prof as { free_pass_used?: boolean } | null)?.free_pass_used,
      );
    } catch {
      freePassUsed = false;
    }

    const state: MemberAccessState = subscribed
      ? "paid"
      : freePassUsed
        ? "free_used"
        : "free_unused";

    return { state, subscribed, freePassUsed };
  });

/**
 * Server-side gate for the 12 Optimized Leader Guide section pages.
 * Only paid members may work through sections. Free members (regardless of
 * whether their free pass is spent) are blocked.
 */
export const requireSectionAccess = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ allowed: boolean }> => {
    const { supabase, userId } = context;
    try {
      const { data } = await supabase.rpc("has_active_subscription", {
        _user_id: userId,
      });
      return { allowed: Boolean(data) };
    } catch {
      return { allowed: false };
    }
  });