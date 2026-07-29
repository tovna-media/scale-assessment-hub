import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/scale/Logo";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/leaders-edge_/success")({
  head: () => ({
    meta: [
      { title: "You're in — Leaders Edge access" },
      {
        name: "description",
        content: "Your Leaders Edge access is active. Check your email for your sign-in link.",
      },
      { property: "og:title", content: "You're in — Leaders Edge access" },
      {
        property: "og:description",
        content: "Your Leaders Edge access is active. Sign in and start your 12-week cycle.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LeadersEdgeSuccessPage,
});

function LeadersEdgeSuccessPage() {
  const { session } = useAuth();

  return (
    <main
      className="flex min-h-screen items-center justify-center px-4 py-12"
      style={{ background: "#f9f8fb", fontFamily: "Inter, sans-serif" }}
    >
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
        <div className="flex justify-center">
          <Logo className="h-9 w-auto" />
        </div>
        <CheckCircle2 className="mx-auto mt-6 h-12 w-12 text-rl-purple" />
        <h1 className="mt-4 text-2xl font-bold text-rl-purple-deep">
          You're in. Welcome to Fully Resourced.
        </h1>
        {session ? (
          <>
            <p className="mt-3 text-sm text-muted-foreground">
              Your access is active — free for the next 3 months. Head to your dashboard to get
              started.
            </p>
            <Button asChild size="lg" className="mt-6 w-full">
              <Link to="/dashboard">Go to my dashboard</Link>
            </Button>
          </>
        ) : (
          <>
            <p className="mt-3 text-sm text-muted-foreground">
              Your access is set up and free for the next 3 months — no signup form needed.
            </p>
            <p className="mt-4 flex items-start gap-2 rounded-xl bg-rl-purple/5 px-4 py-3 text-left text-sm text-rl-purple">
              <Mail className="mt-0.5 h-4 w-4 shrink-0" />
              Check your email for your sign-in link. It arrives within a minute of you redeeming.
            </p>
          </>
        )}
      </div>
    </main>
  );
}
