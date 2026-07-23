import { createFileRoute, Outlet, useNavigate, useLocation } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { requireSectionAccess } from "@/lib/access.functions";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { sectionUnlockStatus } from "@/lib/section-unlock";

/**
 * Layout for /guide/section-* routes.
 *
 * Section pages are paid-only. Access is decided from the member's real
 * account state (subscription status) on the server, not from screen layout,
 * so a saved link, a refresh, or a direct URL cannot bypass the paywall.
 */
export const Route = createFileRoute("/_authenticated/guide")({
  component: GuideGate,
});

function GuideGate() {
  const check = useServerFn(requireSectionAccess);
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [allowed, setAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await check();
        if (cancelled) return;
        if (!res.allowed) {
          toast.error("Upgrade to unlock the Optimized Leader Guide.");
          navigate({
            to: "/dashboard",
            search: { upgrade: true } as never,
            replace: true,
          });
          return;
        }

        // Enforce the weekly drip + previous-section rule per section.
        const match = location.pathname.match(/\/guide\/section-(\d+)/);
        const sectionNumber = match ? Number(match[1]) : null;
        if (sectionNumber && sectionNumber >= 2 && user) {
          const [{ data: report }, { data: prev }] = await Promise.all([
            supabase
              .from("gap_reports")
              .select("generated_at")
              .eq("user_id", user.id)
              .order("generated_at", { ascending: false })
              .limit(1)
              .maybeSingle(),
            supabase
              .from("optimizer_section_progress")
              .select("completed")
              .eq("user_id", user.id)
              .eq("section_number", sectionNumber - 1)
              .maybeSingle(),
          ]);
          if (cancelled) return;
          const cycleStart = report?.generated_at ? new Date(report.generated_at) : null;
          const prevComplete = Boolean((prev as { completed?: boolean } | null)?.completed);
          const status = sectionUnlockStatus(cycleStart, sectionNumber, prevComplete);
          if (!status.unlocked) {
            toast.error(
              !status.weekReached
                ? "This section isn't open yet. Come back on its unlock date."
                : "Finish the previous section first.",
            );
            navigate({ to: "/cycle", replace: true });
            return;
          }
        }

        setAllowed(true);
      } catch {
        // Fail closed — if we can't verify, treat as not allowed.
        navigate({
          to: "/dashboard",
          search: { upgrade: true } as never,
          replace: true,
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [check, navigate, location.pathname, user]);

  if (allowed !== true) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-[var(--fr-muted-ink)]">
        Checking access…
      </div>
    );
  }

  return <Outlet />;
}