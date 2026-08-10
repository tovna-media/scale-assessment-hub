import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, Loader2, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/scale/Logo";
import { useAuth } from "@/lib/auth-context";
import { getStripeEnvironment } from "@/lib/stripe";
import { resolveCheckoutSession } from "@/lib/checkout-resolve.functions";

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
  const resolve = useServerFn(resolveCheckoutSession);
  const [existingAccount, setExistingAccount] = useState(false);
  const [failed, setFailed] = useState(false);

  // This page is the return URL ONLY for the not-signed-in (public) checkout.
  // Decide create-password vs. welcome from the checkout itself — never from
  // whatever session happens to already be in this browser. Supabase persists
  // sessions in localStorage, so a leftover login from an earlier visit
  // survives the Stripe redirect; gating on `session` here made a brand-new
  // paid signup skip the create-password step entirely whenever the browser
  // still held any prior session. We always resolve the checkout: a token means
  // a brand-new account (redirect to /set-password), `ready` with no token
  // means the email already had an account.
  useEffect(() => {
    if (!session_id) {
      setFailed(true);
      return;
    }
    let cancelled = false;

    async function run(attempt: number): Promise<void> {
      try {
        const { token, ready } = await resolve({
          data: { sessionId: session_id as string, environment: getStripeEnvironment() },
        });
        if (cancelled) return;
        if (token) {
          navigate({ to: "/set-password/$token", params: { token }, replace: true });
          return;
        }
        if (ready) {
          setExistingAccount(true);
          return;
        }
        // Stripe hasn't marked the session complete yet — extremely rare this
        // soon after redirect, but retry a couple of times before giving up.
        if (attempt < 3) {
          setTimeout(() => void run(attempt + 1), 1000);
        } else {
          setFailed(true);
        }
      } catch {
        if (cancelled) return;
        if (attempt < 3) {
          setTimeout(() => void run(attempt + 1), 1000);
        } else {
          setFailed(true);
        }
      }
    }
    void run(1);
    return () => {
      cancelled = true;
    };
  }, [session_id, resolve, navigate]);

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
        {existingAccount ? (
          session ? (
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
                Your membership is active. This email already has an account with us.
              </p>
              <p className="mt-4 flex items-start gap-2 rounded-xl bg-rl-purple/5 px-4 py-3 text-left text-sm text-rl-purple">
                <Mail className="mt-0.5 h-4 w-4 shrink-0" />
                Check your email for your sign-in link. It arrives within a minute of your payment.
              </p>
            </>
          )
        ) : failed ? (
          <p className="mt-4 text-sm text-muted-foreground">
            Your payment went through, but we couldn't finish setting up your account automatically.
            Contact us and we'll get you sorted.
          </p>
        ) : (
          <>
            <p className="mt-3 text-sm text-muted-foreground">
              Your payment went through and your account is being set up right now — no signup form
              needed.
            </p>
            <p className="mt-4 flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Verifying your payment…
            </p>
          </>
        )}
      </div>
    </main>
  );
}
