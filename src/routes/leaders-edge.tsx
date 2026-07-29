import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Check, ShieldCheck, Loader2, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Logo } from "@/components/scale/Logo";
import { SiteFooter } from "@/components/scale/SiteFooter";
import { getStripeEnvironment, isStripeConfigured } from "@/lib/stripe";
import { validateLeadersEdgeCode, createLeadersEdgeCheckout } from "@/lib/leaders-edge.functions";
import { StripeEmbeddedCheckout } from "@/components/StripeEmbeddedCheckout";

const TITLE = "Leaders Edge access — Fully Resourced";
const DESCRIPTION =
  "Redeem your Leaders Edge access: 3 months of the full Fully Resourced app, free. Enter the code Rich gave you to get started.";

export const Route = createFileRoute("/leaders-edge")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESCRIPTION },
    ],
  }),
  component: LeadersEdgePage,
});

const INCLUDED = [
  "Your assessments and gap report",
  "The full 12-week Leadership Optimization Cycle",
  "The Leadership Performance Dashboard",
  "The Fully Resourced AI Coach",
  "The book, inside the app",
];

function LeadersEdgePage() {
  const [code, setCode] = useState("");
  const [validating, setValidating] = useState(false);
  const [codeError, setCodeError] = useState<string | null>(null);
  const [showCheckout, setShowCheckout] = useState(false);
  const validateCode = useServerFn(validateLeadersEdgeCode);
  const startCheckout = useServerFn(createLeadersEdgeCheckout);
  // Read at session-creation time so the fetchClientSecret callback stays stable.
  const codeRef = useRef("");

  const handleRedeem = useCallback(async () => {
    if (!isStripeConfigured()) {
      toast.error("Payments are not configured yet.");
      return;
    }
    const trimmed = code.trim();
    if (!trimmed) {
      setCodeError("Enter your access code.");
      return;
    }
    setValidating(true);
    setCodeError(null);
    try {
      const result = await validateCode({ data: { code: trimmed } });
      if (!result.ok) {
        setCodeError(result.reason);
        return;
      }
      codeRef.current = trimmed;
      setShowCheckout(true);
    } catch (e) {
      console.error("[leaders-edge] code validation failed", e);
      setCodeError("Could not check that code. Please try again.");
    } finally {
      setValidating(false);
    }
  }, [code, validateCode]);

  // Stable identity: remounting the provider breaks Stripe's embedded form.
  const fetchClientSecret = useCallback(async () => {
    const origin = window.location.origin;
    const result = await startCheckout({
      data: {
        code: codeRef.current,
        returnUrl: `${origin}/leaders-edge/success?session_id={CHECKOUT_SESSION_ID}`,
        environment: getStripeEnvironment(),
      },
    });
    if ("error" in result && result.error) throw new Error(result.error);
    const clientSecret = "clientSecret" in result ? result.clientSecret : "";
    if (!clientSecret) throw new Error("No checkout session returned");
    return clientSecret;
  }, [startCheckout]);

  return (
    <main
      className="min-h-screen px-4 py-10 sm:py-16"
      style={{ background: "#f9f8fb", fontFamily: "Inter, sans-serif" }}
    >
      <div className="mx-auto flex w-full max-w-xl flex-col gap-8">
        <div className="flex justify-center">
          <Logo className="h-9 w-auto" />
        </div>

        <header className="text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-rl-purple-soft">
            Leaders Edge
          </p>
          <h1 className="mt-3 text-3xl font-bold leading-tight text-rl-purple-deep sm:text-4xl">
            Your 3 months of full access
          </h1>
          <p className="mt-3 text-base text-muted-foreground">
            Go through the entire 12-week cycle on the house. Enter the code Rich gave you to
            redeem.
          </p>
        </header>

        <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-rl-purple-deep">
            What's inside
          </h2>
          <ul className="mt-4 space-y-3">
            {INCLUDED.map((item) => (
              <li key={item} className="flex items-start gap-3 text-[15px] text-foreground">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-rl-purple/10">
                  <Check className="h-3 w-3 text-rl-purple" />
                </span>
                {item}
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-2xl border border-rl-purple/25 bg-card p-6 shadow-sm">
          <p className="text-3xl font-bold text-rl-purple-deep">
            Free<span className="text-base font-medium text-muted-foreground"> for 3 months</span>
          </p>
          <p className="mt-2 inline-flex rounded-full bg-rl-purple/10 px-3 py-1 text-xs font-semibold text-rl-purple">
            Leaders Edge member offer
          </p>
          <p className="mt-4 text-[15px] font-medium text-foreground">
            $0 today. After 3 months it continues at $97/month unless you cancel. Cancel anytime
            from your billing page in the app.
          </p>

          {showCheckout ? (
            <div className="mt-5">
              <StripeEmbeddedCheckout fetchClientSecret={fetchClientSecret} />
            </div>
          ) : (
            <div className="mt-5">
              <label htmlFor="access-code" className="text-sm font-medium text-foreground">
                Access code
              </label>
              <div className="mt-2 flex flex-col gap-3 sm:flex-row">
                <Input
                  id="access-code"
                  value={code}
                  onChange={(e) => {
                    setCode(e.target.value);
                    if (codeError) setCodeError(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleRedeem();
                  }}
                  placeholder="LE-XXXXXXXX"
                  autoCapitalize="characters"
                  className="h-12 flex-1 text-base uppercase tracking-wider"
                  aria-invalid={codeError ? true : undefined}
                  aria-describedby={codeError ? "access-code-error" : undefined}
                />
                <Button
                  size="lg"
                  className="h-12 text-base"
                  onClick={handleRedeem}
                  disabled={validating}
                >
                  {validating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Checking…
                    </>
                  ) : (
                    "Redeem"
                  )}
                </Button>
              </div>
              {codeError && (
                <p id="access-code-error" className="mt-2 text-sm text-destructive">
                  {codeError}
                </p>
              )}
              <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
                <Lock className="h-3.5 w-3.5" />A valid, unused code is required to redeem.
              </p>
            </div>
          )}

          <p className="mt-4 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5" />
            Secure checkout through Stripe.
          </p>

          <p className="mt-4 text-center text-xs leading-relaxed text-muted-foreground">
            Your first 3 months are free. We collect a card now so your access continues
            automatically after that at $97/month until you cancel. You can cancel anytime from your
            billing page in the app. By continuing you agree to our{" "}
            <Link to="/terms" className="underline">
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link to="/privacy" className="underline">
              Privacy Policy
            </Link>
            .
          </p>
        </section>
      </div>

      <SiteFooter />
    </main>
  );
}
