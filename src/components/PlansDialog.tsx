import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { Check, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { createSubscriptionCheckout, createBillingPortalSession } from "@/lib/payments.functions";
import { getStripeEnvironment, isStripeConfigured } from "@/lib/stripe";
import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

type PlansDialogContextValue = {
  open: (opts?: { source?: string }) => void;
  close: () => void;
};

const PlansDialogContext = createContext<PlansDialogContextValue | null>(null);

export function usePlansDialog() {
  const ctx = useContext(PlansDialogContext);
  if (!ctx) throw new Error("usePlansDialog must be used within PlansDialogProvider");
  return ctx;
}

export function PlansDialogProvider({
  subscribed,
  children,
}: {
  subscribed: boolean;
  children: ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const value = useMemo<PlansDialogContextValue>(
    () => ({
      open: () => setIsOpen(true),
      close: () => setIsOpen(false),
    }),
    [],
  );
  return (
    <PlansDialogContext.Provider value={value}>
      {children}
      {isOpen && <PlansDialog subscribed={subscribed} onClose={() => setIsOpen(false)} />}
    </PlansDialogContext.Provider>
  );
}

function PlansDialog({ subscribed, onClose }: { subscribed: boolean; onClose: () => void }) {
  const [billing, setBilling] = useState<"monthly" | "annual">("annual");
  const [busy, setBusy] = useState<"upgrade" | "downgrade" | null>(null);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const startCheckout = useServerFn(createSubscriptionCheckout);
  const openPortal = useServerFn(createBillingPortalSession);

  const handleUpgrade = useCallback(async () => {
    if (!isStripeConfigured()) {
      toast.error("Payments are not configured yet.");
      return;
    }
    setBusy("upgrade");
    setCheckoutUrl(null);
    try {
      const returnUrl = `${window.location.origin}/checkout/activating?session_id={CHECKOUT_SESSION_ID}`;
      const result = await startCheckout({
        data: {
          plan: billing,
          returnUrl,
          environment: getStripeEnvironment(),
          acceptedTerms: true,
        },
      });
      if ("error" in result) throw new Error(result.error);
      if (!result.url) throw new Error("No checkout URL returned");
      // Navigate the top-level window when possible so mobile browsers (and
      // embedded preview iframes) reliably reach Stripe. Fall back to the
      // current window, then to a visible link if the browser blocks it.
      try {
        if (window.top && window.top !== window.self) {
          window.top.location.href = result.url;
        } else {
          window.location.href = result.url;
        }
        onClose();
      } catch {
        setCheckoutUrl(result.url);
        setBusy(null);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not open checkout.");
      setBusy(null);
    }
  }, [billing, onClose, startCheckout]);

  const handleDowngrade = useCallback(async () => {
    if (!isStripeConfigured()) {
      toast.error("Payments are not configured yet.");
      return;
    }
    setBusy("downgrade");
    try {
      const result = await openPortal({
        data: {
          returnUrl: `${window.location.origin}/dashboard`,
          environment: getStripeEnvironment(),
        },
      });
      if ("error" in result) throw new Error(result.error);
      if (!result.url) throw new Error("No billing portal URL returned");
      try {
        if (window.top && window.top !== window.self) {
          window.top.location.href = result.url;
        } else {
          window.location.href = result.url;
        }
        onClose();
      } catch (navErr) {
        console.error("[PlansDialog] portal navigation failed", navErr);
        window.location.href = result.url;
      }
    } catch (e) {
      console.error("[PlansDialog] downgrade failed", e);
      toast.error(e instanceof Error ? e.message : "Could not open billing portal.");
      setBusy(null);
    }
  }, [onClose, openPortal]);

  const paidPrice = billing === "annual" ? "$82" : "$97";

  return (
    <div
      className="fixed inset-0 z-[100] overflow-y-auto bg-black/60 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="relative mx-auto my-8 w-full max-w-4xl rounded-2xl bg-white p-6 pt-14 shadow-2xl sm:p-8 sm:pt-8"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          className="absolute right-4 top-4 z-10 rounded-full bg-white p-2 text-[var(--fr-muted-ink)] shadow-sm hover:bg-[var(--fr-surface)]"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Billing toggle */}
        <div className="flex justify-center">
          <div className="inline-flex rounded-full border border-[var(--fr-hairline)] bg-[var(--fr-surface)] p-1">
            <ToggleButton active={billing === "monthly"} onClick={() => setBilling("monthly")}>
              Monthly
            </ToggleButton>
            <ToggleButton active={billing === "annual"} onClick={() => setBilling("annual")}>
              Annual
              <span className="ml-2 rounded-full bg-[#5B2D8E] px-2 py-0.5 text-[10px] font-semibold text-white">
                Save 15%
              </span>
            </ToggleButton>
          </div>
        </div>

        {/* Plans grid */}
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {/* Free plan */}
          <PlanCard
            eyebrow="Free"
            tagline="For getting started."
            price="Free"
            features={[
              "Your three assessments, one time",
              "One personalized Gap Report",
              "Your dashboard for that one cycle",
            ]}
            action={
              subscribed ? (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={handleDowngrade}
                  disabled={busy !== null}
                >
                  {busy === "downgrade" ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Opening…
                    </>
                  ) : (
                    "Downgrade"
                  )}
                </Button>
              ) : (
                <Button variant="outline" className="w-full" disabled>
                  Current plan
                </Button>
              )
            }
          />

          {/* Paid plan */}
          <PlanCard
            highlighted
            eyebrow="Fully Resourced"
            tagline="For leaders who want the full system."
            price={paidPrice}
            priceSuffix="/mo"
            priceBadge={billing === "annual" ? "Save 15%" : undefined}
            priceSubtext={billing === "annual" ? "billed annually at $984" : "billed monthly"}
            features={[
              "Everything in Free",
              "Unlimited assessments and Gap Reports",
              "Your full 90-day leadership cycle, a new section every week",
              "The Fully Resourced AI Coach, on demand",
              "The Fully Resourced digital book",
              "A Leadership Performance Dashboard that tracks your growth over time",
              "Print or save your completed work each week",
            ]}
            action={
              subscribed ? (
                <Button className="w-full" disabled>
                  Current plan
                </Button>
              ) : checkoutUrl ? (
                <Button className="w-full bg-[#5B2D8E] text-white hover:bg-[#5B2D8E]/90" asChild>
                  <a href={checkoutUrl} target="_blank" rel="noopener noreferrer">
                    Continue to secure checkout
                  </a>
                </Button>
              ) : (
                <Button
                  className="w-full bg-[#5B2D8E] text-white hover:bg-[#5B2D8E]/90"
                  onClick={handleUpgrade}
                  disabled={busy !== null}
                >
                  {busy === "upgrade" ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Opening checkout…
                    </>
                  ) : (
                    "Upgrade"
                  )}
                </Button>
              )
            }
          />
        </div>

        {!subscribed && (
          <p className="mx-auto mt-5 max-w-2xl text-center text-xs leading-relaxed text-[var(--fr-muted-ink)]">
            {billing === "annual"
              ? "The Fully Resourced plan is $984/year (works out to $82/month). Your subscription renews automatically every year until you cancel."
              : "The Fully Resourced plan is $97/month. Your subscription renews automatically every month until you cancel."}{" "}
            You can cancel anytime from Manage billing. By upgrading you agree to our{" "}
            <Link to="/terms" className="underline">
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link to="/privacy" className="underline">
              Privacy Policy
            </Link>
            .
          </p>
        )}
      </div>
    </div>
  );
}

function ToggleButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center rounded-full px-5 py-2 text-sm font-medium transition",
        active
          ? "bg-white text-[var(--fr-ink)] shadow-sm"
          : "text-[var(--fr-muted-ink)] hover:text-[var(--fr-ink)]",
      )}
    >
      {children}
    </button>
  );
}

function PlanCard({
  eyebrow,
  tagline,
  price,
  priceSuffix,
  priceBadge,
  priceSubtext,
  features,
  action,
  highlighted,
}: {
  eyebrow: string;
  tagline: string;
  price: string;
  priceSuffix?: string;
  priceBadge?: string;
  priceSubtext?: string;
  features: string[];
  action: ReactNode;
  highlighted?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-col rounded-2xl border p-6",
        highlighted
          ? "border-[#5B2D8E] bg-gradient-to-b from-[#5B2D8E]/[0.04] to-white shadow-[0_8px_32px_rgba(91,45,142,0.12)]"
          : "border-[var(--fr-hairline)] bg-white",
      )}
    >
      <p
        className={cn(
          "text-xs font-semibold uppercase tracking-[0.16em]",
          highlighted ? "text-[#5B2D8E]" : "text-[var(--fr-muted-ink)]",
        )}
      >
        {eyebrow}
      </p>
      <p className="mt-1 text-sm text-[var(--fr-muted-ink)]">{tagline}</p>
      <div className="mt-4 flex items-baseline gap-1">
        <span className="text-4xl font-semibold text-[var(--fr-ink)]">{price}</span>
        {priceSuffix && <span className="text-base text-[var(--fr-muted-ink)]">{priceSuffix}</span>}
        {priceBadge && (
          <span className="ml-2 rounded-full bg-[#5B2D8E]/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[#5B2D8E]">
            {priceBadge}
          </span>
        )}
      </div>
      {priceSubtext && <p className="mt-1 text-xs text-[var(--fr-muted-ink)]">{priceSubtext}</p>}
      <ul className="mt-5 flex-1 space-y-2.5">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2 text-sm text-[var(--fr-ink)]">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#5B2D8E]" />
            <span>{f}</span>
          </li>
        ))}
      </ul>
      <div className="mt-6">{action}</div>
    </div>
  );
}
