import { createFileRoute, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { AppShell } from "@/components/scale/AppShell";

export const Route = createFileRoute("/_authenticated")({
  component: AuthLayout,
});

function AuthLayout() {
  const { session, role, loading } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    if (loading) return;
    if (!session) {
      navigate({ to: "/" });
      return;
    }
    if (role === "coach") {
      // Coach should land in coach dashboard
      navigate({ to: "/coach" });
    }
  }, [session, role, loading, navigate]);

  if (loading || !session) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted-foreground">
        Loading…
      </div>
    );
  }

  const pageTitle = titleFor(pathname);
  return (
    <AppShell pageTitle={pageTitle}>
      <Outlet />
    </AppShell>
  );
}

function titleFor(path: string): string {
  if (path.startsWith("/dashboard")) return "Home";
  if (path.startsWith("/cycle")) return "My Cycle";
  if (path.startsWith("/performance")) return "Performance";
  if (path.startsWith("/profile")) return "Edit profile";
  if (path.startsWith("/assessment")) return "Assessment";
  if (path.startsWith("/report")) return "Gap Report";
  if (path.startsWith("/guide")) return "Optimization Cycle";
  if (path.startsWith("/checkout")) return "Activating";
  return "Fully Resourced";
}