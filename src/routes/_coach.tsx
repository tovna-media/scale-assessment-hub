import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { AppHeader } from "@/components/scale/AppHeader";

export const Route = createFileRoute("/_coach")({
  component: CoachLayout,
});

function CoachLayout() {
  const { session, role, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    if (!session) {
      navigate({ to: "/coach/login" });
      return;
    }
    if (role !== "coach") {
      navigate({ to: "/dashboard" });
    }
  }, [session, role, loading, navigate]);

  if (loading || !session || role !== "coach") {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted-foreground">
        Loading…
      </div>
    );
  }

  return (
    <div
      className="min-h-screen"
      style={{ background: "var(--fr-page-gradient)" }}
    >
      <AppHeader variant="coach" />
      <Outlet />
    </div>
  );
}