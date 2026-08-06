import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Check, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/scale/Logo";
import { SiteFooter } from "@/components/scale/SiteFooter";
import { useAuth } from "@/lib/auth-context";
import { getStripeEnvironment, isStripeConfigured } from "@/lib/stripe";
import { createFoundingCheckout } from "@/lib/founding.functions";
import { createSubscriptionCheckout } from "@/lib/payments.functions";
import { StripeEmbeddedCheckout } from "@/components/StripeEmbeddedCheckout";

const TITLE = "Founding membership — Fully Resourced";
const DESCRIPTION = "Your first 30 days are free. After that, it's $97/month.";

export const Route = createFileRoute("/founding")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:url", content: "https://app.getfullyresourced.com/founding" },
      { property: "og:type", content: "product" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESCRIPTION },
    ],
    links: [{ rel: "canonical", href: "https://app.getfullyresourced.com/founding" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Service",
          "name": "Fully Resourced Founding Membership",
          "description": DESCRIPTION,
          "url": "https://app.getfullyresourced.com/founding",
          "provider": {
            "@id": "#organization",
            "@type": "Organization",
            "name": "Lohman Leadership Group",
            "url": "https://app.getfullyresourced.com/",
            "founder": {
              "@type": "Person",
              "name": "Rich Lohman",
            },
          },
          "hasOfferCatalog": {
            "@type": "OfferCatalog",
            "name": "Leadership membership",
            "itemListElement": [
              {
                "@type": "ListItem",
                "position": 1,
                "item": {
                  "@type": "Service",
                  "name": "SCALE assessments and personalized Gap Report",
                },
              },
              {
                "@type": "ListItem",
                "position": 2,
                "item": {
                  "@type": "Service",
                  "name": "The Optimized Leader Guide — 12 in-app sections",
                },
              },
              {
                "@type": "ListItem",
                "position": 3,
                "item": {
                  "@type": "Service",
                  "name": "The Fully Resourced AI Coach",
                },
              },
              {
                "@type": "ListItem",
                "position": 4,
                "item": {
                  "@type": "Service",
                  "name": "Leadership Performance Dashboard",
                },
              },
              {
                "@type": "ListItem",
                "position": 5,
                "item": {
                  "@type": "Service",
                  "name": "Monthly 1:1 coaching check-in with Rich Lohman",
                },
              },
            ],
          },
          "termsOfService": "https://app.getfullyresourced.com/terms",
        }),
      },
    ],
  }),
  component: FoundingPage,
});

const INCLUDED = [
  "A monthly check-in with your coach, once a month, sit down with Rich Lohman, a leadership coach with two decades of experience, to review your progress, answer your questions, and keep you moving.",
  "Your assessments and gap report",
  "The Optimized Leader Guide, week by week",
  "The Leadership Performance Dashboard",
  "The Fully Resourced AI Coach",
  "The book, inside the app",
];

function FoundingPage() {
  const { session } = useAuth();
  const [showCheckout, setShowCheckout] = useState(false);
  const startPublicCheckout = useServerFn(createFoundingCheckout);
  const startMemberCheckout = useServerFn(createSubscriptionCheckout);
  const sessionRef = useRef(session);
  sessionRef.current = session;

  const handleStart = useCallback(() => {
    if (!isStripeConfigured()) {
      toast.error("Payments are not configured yet.");
      return;
    }
    setShowCheckout(true);
  }, []);

  // Stable identity: remounting the provider breaks Stripe's embedded form.
  const fetchClientSecret = useCallback(async () => {
    const origin = window.location.origin;
    const environment = getStripeEnvironment();
    const result = sessionRef.current
      ? await startMemberCheckout({
          data: {
            plan: "monthly",
            returnUrl: `${origin}/checkout/activating?session_id={CHECKOUT_SESSION_ID}`,
            environment,
            acceptedTerms: true,
            founding: true,
          },
        })
      : await startPublicCheckout({
          data: {
            returnUrl: `${origin}/founding/success?session_id={CHECKOUT_SESSION_ID}`,
            environment,
          },
        });
    if ("error" in result && result.error) throw new Error(result.error);
    const clientSecret = "clientSecret" in result ? result.clientSecret : "";
    if (!clientSecret) throw new Error("No checkout session returned");
    return clientSecret;
  }, [startMemberCheckout, startPublicCheckout]);

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
            Unlock the Full Fully Resourced App
          </h1>
          <p className="mt-3 text-base text-muted-foreground">
            Seeing your gaps is the easy part. Closing them is the work and that's what this
            system walks you through, one week at a time.
          </p>
          <p className="mx-auto mt-4 max-w-md rounded-xl bg-rl-purple/5 px-4 py-3 text-sm font-medium text-rl-purple">
            Each week for your first month, you'll work through the next step built to close a
            real gap holding you back as a leader.
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
            Your first 30 days are free
          </p>
          <p className="mt-4 text-[15px] font-medium text-foreground">
            Start your 30-day free trial. Your card won't be charged today.
          </p>

          {showCheckout ? (
            <div className="mt-5">
              <StripeEmbeddedCheckout fetchClientSecret={fetchClientSecret} />
            </div>
          ) : (
            <Button size="lg" className="mt-5 h-12 w-full text-base" onClick={handleStart}>
              Start my founding membership
            </Button>
          )}

          <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5" />
            Secure checkout through Stripe.
          </p>

          <p className="mt-4 text-center text-xs leading-relaxed text-muted-foreground">
            Cancel anytime before day 30 and you won't be charged. Your account simply moves to
            the free plan and you keep your gap report. If you don't cancel, your membership
            starts at $97/month after the 30 days. By continuing you agree to our{" "}
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
