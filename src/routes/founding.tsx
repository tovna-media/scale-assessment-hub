import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2, Check, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/scale/Logo";
import { useAuth } from "@/lib/auth-context";
import { getStripeEnvironment, isStripeConfigured } from "@/lib/stripe";
import { createFoundingCheckout, FOUNDING_COUPON_ID } from "@/lib/founding.functions";
import { createSubscriptionCheckout } from "@/lib/payments.functions";
import { MONTHLY_PRICE_ID } from "@/components/PlansDialog";

const TITLE = "Founding membership — Fully Resourced";
const DESCRIPTION =
  "Start your Fully Resourced membership with 20% off your first month. No coupon code needed — the founding discount applies automatically at checkout.";

export const Route = createFileRoute("/founding")({
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
  component: FoundingPage,
});

const INCLUDED = [
  "Your assessments and gap report",
  "The Optimized Leader Guide, week by week",
  "The Leadership Performance Dashboard",
  "The Fully Resourced AI Coach",
  "The book, inside the app",
];

function FoundingPage() {
  const { session } = useAuth();
  const [busy, setBusy] = useState(false);
  const startPublicCheckout = useServerFn(createFoundingCheckout);
  const startMemberCheckout = useServerFn(createSubscriptionCheckout);

  const handleStart = useCallback(async () => {
    if (!isStripeConfigured()) {
      toast.error("Payments are not configured yet.");
      return;
    }
    setBusy(true);
    try {
      const origin = window.location.origin;
      const environment = getStripeEnvironment();
      const result = session
        ? await startMemberCheckout({
            data: {
              priceId: MONTHLY_PRICE_ID,
              returnUrl: `${origin}/checkout/activating?session_id={CHECKOUT_SESSION_ID}`,
              environment,
              acceptedTerms: true,
              couponId: FOUNDING_COUPON_ID,
            },
          })
        : await startPublicCheckout({
            data: {
              priceId: MONTHLY_PRICE_ID,
              returnUrl: `${origin}/founding/success?session_id={CHECKOUT_SESSION_ID}`,
              cancelUrl: `${origin}/founding`,
              environment,
            },
          });

      if ("error" in result && result.error) throw new Error(result.error);
      const url = "url" in result ? result.url : "";
      if (!url) throw new Error("No checkout URL returned");
      (window.top ?? window).location.href = url;
    } catch (e) {
      console.error("[founding] checkout failed", e);
      toast.error(e instanceof Error ? e.message : "Could not start checkout.");
      setBusy(false);
    }
  }, [session, startMemberCheckout, startPublicCheckout]);

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
            Founding Member Offer
          </p>
          <h1 className="mt-3 text-3xl font-bold leading-tight text-rl-purple-deep sm:text-4xl">
            Unlock the full Fully Resourced app
          </h1>
          <p className="mt-3 text-base text-muted-foreground">
            Everything you need to close your leadership gaps, in one app.
          </p>
          <p className="mx-auto mt-4 max-w-md rounded-xl bg-rl-purple/5 px-4 py-3 text-sm font-medium text-rl-purple">
            No coupon code needed. Your 20% founding discount is applied
            automatically when you check out.
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
            $97<span className="text-base font-medium text-muted-foreground">/month</span>
          </p>
          <p className="mt-2 inline-flex rounded-full bg-rl-purple/10 px-3 py-1 text-xs font-semibold text-rl-purple">
            Founding member: 20% off your first month
          </p>
          <p className="mt-4 text-[15px] font-medium text-foreground">
            First month $77.60, then $97/month. Cancel anytime.
          </p>

          <Button
            size="lg"
            className="mt-5 h-12 w-full text-base"
            onClick={handleStart}
            disabled={busy}
          >
            {busy ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Opening secure checkout...
              </>
            ) : (
              "Start my founding membership"
            )}
          </Button>

          <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5" />
            Secure checkout through Stripe.
          </p>
        </section>
      </div>
    </main>
  );
}
