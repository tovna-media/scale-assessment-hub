import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { requireSectionAccess } from "@/lib/access.functions";
import { toast } from "sonner";

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
  const [allowed, setAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    void check()
      .then((res) => {
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
        setAllowed(true);
      })
      .catch(() => {
        // Fail closed — if we can't verify, treat as not allowed.
        navigate({
          to: "/dashboard",
          search: { upgrade: true } as never,
          replace: true,
        });
      });
    return () => {
      cancelled = true;
    };
  }, [check, navigate]);

  if (allowed !== true) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-[var(--fr-muted-ink)]">
        Checking access…
      </div>
    );
  }

  return <Outlet />;
}