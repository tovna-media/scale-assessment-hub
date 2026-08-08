import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, Loader2, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/scale/Logo";
import { useAuth } from "@/lib/auth-context";
import { getPasswordSetupToken } from "@/lib/password-setup.functions";

export const Route = createFileRoute("/30-day-trial_/success")({
  head: () => ({
    meta: [
      { title: "You're in — Fully Resourced" },
      {
        name: "description",
        content:
          "Your Fully Resourced membership is active. Check your email for your sign-in link.",
      },
      { property: "og:title", content: "You're in — Fully Resourced" },
      {
        property: "og:description",
        content: "Your membership is active. Sign in and start closing your gaps.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  validateSearch: (search: Record<string, unknown>) => ({
    session_id: typeof search.session_id === "string" ? search.session_id : undefined,
  }),
  component: TrialSuccessPage,
});

function TrialSuccessPage() {
  const { session } = useAuth();
  const { session_id } = Route.useSearch();
  const navigate = useNavigate();
  const getToken = useServerFn(getPasswordSetupToken);
  const [waited, setWaited] = useState(0);

  // Brand-new signups: poll for the password-setup token the webhook issues,
  // then send them straight to /set-password. Existing accounts (already
  // signed in, or paying anonymously with an email that already has one)
  // never get a token here and fall through to the "check your email" copy.
  useEffect(() => {
    if (session || !session_id) return;
    let cancelled = false;
    let attempts = 0;
    const started = Date.now();

    async function poll() {
      if (cancelled) return;
      try {
        const { token } = await getToken({ data: { sessionId: session_id as string } });
        if (cancelled) return;
        if (token) {
          navigate({ to: "/set-password/$token", params: { token }, replace: true });
          return;
        }
      } catch {
        /* keep polling */
      }
      attempts += 1;
      setWaited(Math.round((Date.now() - started) / 1000));
      if (attempts >= 20) return; // ~45s of polling, then fall back to the email copy below
      const delay = attempts < 6 ? 1500 : 3000;
      setTimeout(poll, delay);
    }
    void poll();
    return () => {
      cancelled = true;
    };
  }, [session, session_id, getToken, navigate]);

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
              Your membership is active. Head to your dashboard to get started.
            </p>
            <Button asChild size="lg" className="mt-6 w-full">
              <Link to="/dashboard">Go to my dashboard</Link>
            </Button>
          </>
        ) : (
          <>
            <p className="mt-3 text-sm text-muted-foreground">
              Your payment went through and your account is being set up right now — no signup form
              needed.
            </p>
            {waited < 45 ? (
              <p className="mt-4 flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Setting up your account…
              </p>
            ) : (
              <p className="mt-4 flex items-start gap-2 rounded-xl bg-rl-purple/5 px-4 py-3 text-left text-sm text-rl-purple">
                <Mail className="mt-0.5 h-4 w-4 shrink-0" />
                Check your email for your sign-in link. It arrives within a minute of your payment.
              </p>
            )}
          </>
        )}
      </div>
    </main>
  );
}
