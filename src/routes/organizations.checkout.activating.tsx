import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/scale/Logo";
import { getStripeEnvironment } from "@/lib/stripe";
import { resolveOrgCheckoutSession } from "@/lib/organizations/checkout-resolve.functions";

export const Route = createFileRoute("/organizations/checkout/activating")({
  head: () => ({ meta: [{ title: "Setting up your team — Fully Resourced" }] }),
  validateSearch: (search: Record<string, unknown>) => ({
    session_id: typeof search.session_id === "string" ? search.session_id : undefined,
  }),
  component: OrgCheckoutActivatingPage,
});

function OrgCheckoutActivatingPage() {
  const { session_id } = Route.useSearch();
  const resolve = useServerFn(resolveOrgCheckoutSession);
  const [status, setStatus] = useState<"pending" | "ready" | "failed" | "verificationFailed">(
    "pending",
  );

  useEffect(() => {
    if (!session_id) {
      setStatus("failed");
      return;
    }
    let cancelled = false;

    async function run(attempt: number): Promise<void> {
      try {
        const result = await resolve({
          data: { sessionId: session_id as string, environment: getStripeEnvironment() },
        });
        if (cancelled) return;
        if (result.verificationFailed) {
          setStatus("verificationFailed");
          return;
        }
        if (result.ready) {
          setStatus("ready");
          return;
        }
        if (attempt < 5) {
          setTimeout(() => void run(attempt + 1), 1500);
        } else {
          setStatus("failed");
        }
      } catch {
        if (cancelled) return;
        if (attempt < 5) {
          setTimeout(() => void run(attempt + 1), 1500);
        } else {
          setStatus("failed");
        }
      }
    }
    void run(1);
    return () => {
      cancelled = true;
    };
  }, [session_id, resolve]);

  return (
    <main
      className="flex min-h-screen items-center justify-center px-4 py-12"
      style={{ background: "var(--fr-signin-gradient)" }}
    >
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
        <div className="flex justify-center">
          <Logo className="h-9 w-auto" />
        </div>

        {status === "verificationFailed" ? (
          <>
            <AlertCircle className="mx-auto mt-6 h-12 w-12 text-destructive" />
            <h1 className="mt-4 text-2xl font-bold text-foreground">
              We couldn't verify your card
            </h1>
            <p className="mt-3 text-sm text-muted-foreground">
              Your card's billing details didn't match what your bank has on file, so we couldn't
              complete your team's signup. Nothing was charged.
            </p>
            <Button asChild size="lg" className="mt-6 w-full">
              <Link to="/organizations/signup">Try a different card</Link>
            </Button>
          </>
        ) : status === "ready" ? (
          <>
            <CheckCircle2 className="mx-auto mt-6 h-12 w-12 text-rl-purple" />
            <h1 className="mt-4 text-2xl font-bold text-foreground">You're set up.</h1>
            <p className="mt-3 text-sm text-muted-foreground">
              Payment went through. Every person on your team is getting an invite email right now
              with a link to create their account.
            </p>
          </>
        ) : status === "failed" ? (
          <>
            <AlertCircle className="mx-auto mt-6 h-12 w-12 text-destructive" />
            <h1 className="mt-4 text-2xl font-bold text-foreground">Something went wrong</h1>
            <p className="mt-3 text-sm text-muted-foreground">
              Your payment may have gone through, but we couldn't confirm it automatically. Contact
              us and we'll get your team sorted.
            </p>
          </>
        ) : (
          <>
            <Loader2 className="mx-auto mt-6 h-10 w-10 animate-spin text-rl-purple" />
            <h1 className="mt-4 text-2xl font-bold text-foreground">Setting up your team…</h1>
            <p className="mt-3 text-sm text-muted-foreground">
              Confirming your payment and sending invites. This usually takes a few seconds.
            </p>
          </>
        )}
      </div>
    </main>
  );
}
