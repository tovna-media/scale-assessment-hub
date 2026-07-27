import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/scale/Logo";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/founding_/success")({
  head: () => ({
    meta: [
      { title: "You're in — Fully Resourced founding membership" },
      {
        name: "description",
        content:
          "Your Fully Resourced founding membership is active. Check your email for your sign-in link.",
      },
      { property: "og:title", content: "You're in — Fully Resourced founding membership" },
      {
        property: "og:description",
        content: "Your founding membership is active. Sign in and start closing your gaps.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: FoundingSuccessPage,
});

function FoundingSuccessPage() {
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
          You're in. Welcome, founding member.
        </h1>
        {session ? (
          <>
            <p className="mt-3 text-sm text-muted-foreground">
              Your membership is active. Head to your dashboard to get started.
            </p>
            <Button asChild size="lg" className="mt-6 w-full">
              <Link to="/dashboard">Go to my dashboard</Link>
            </Button>
          </>
        ) : (
          <>
            <p className="mt-3 text-sm text-muted-foreground">
              Your payment went through and your account is being set up right
              now — no signup form needed.
            </p>
            <p className="mt-4 flex items-start gap-2 rounded-xl bg-rl-purple/5 px-4 py-3 text-left text-sm text-rl-purple">
              <Mail className="mt-0.5 h-4 w-4 shrink-0" />
              Check your email for your sign-in link. It arrives within a minute
              of your payment.
            </p>
          </>
        )}
      </div>
    </main>
  );
}
