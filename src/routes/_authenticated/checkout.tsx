import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from '@tanstack/react-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { EmbeddedCheckout, EmbeddedCheckoutProvider } from '@stripe/react-stripe-js';
import { useServerFn } from '@tanstack/react-start';
import { getStripe, getStripeEnvironment, isStripeConfigured } from '@/lib/stripe';
import { createSubscriptionCheckout } from '@/lib/payments.functions';
import { PaymentTestModeBanner } from '@/components/PaymentTestModeBanner';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

export const Route = createFileRoute('/_authenticated/checkout')({
  head: () => ({ meta: [{ title: 'Checkout — Fully Resourced' }] }),
  component: CheckoutPage,
});

const PRICE_ID = 'price_1TtwYbKi9kEwbRKQKPBRgXw7';

function CheckoutPage() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });

  if (pathname !== "/checkout") {
    return <Outlet />;
  }

  const create = useServerFn(createSubscriptionCheckout);
  const [accepted, setAccepted] = useState(false);
  const [starting, setStarting] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const stripePromise = useMemo(() => (isStripeConfigured() ? getStripe() : null), []);
  const navigate = useNavigate();

  const fetchClientSecret = useCallback(async () => {
    return clientSecret ?? '';
  }, [clientSecret]);

  useEffect(() => {
    // If user reloads with an already-created session, we simply start over — clientSecrets
    // are single-use.
  }, []);

  async function handleStart() {
    if (!accepted) {
      toast.error('Please agree to the Terms and Privacy Policy first.');
      return;
    }
    if (!isStripeConfigured()) {
      toast.error('Payments are not configured yet.');
      return;
    }
    setStarting(true);
    try {
      const returnUrl = `${window.location.origin}/checkout/activating?session_id={CHECKOUT_SESSION_ID}`;
      const result = await create({
        data: {
          priceId: PRICE_ID,
          returnUrl,
          environment: getStripeEnvironment(),
          acceptedTerms: true,
        },
      });
      if ('error' in result) throw new Error(result.error);
      if (!result.clientSecret) throw new Error('No client secret returned');
      setClientSecret(result.clientSecret);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not start checkout');
    } finally {
      setStarting(false);
    }
  }

  if (clientSecret && stripePromise) {
    return (
      <div>
        <PaymentTestModeBanner />
        <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
          <div id="checkout">
            <EmbeddedCheckoutProvider
              stripe={stripePromise}
              options={{ fetchClientSecret }}
            >
              <EmbeddedCheckout />
            </EmbeddedCheckoutProvider>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div>
      <PaymentTestModeBanner />
      <main className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
        <Button variant="ghost" onClick={() => navigate({ to: '/fully-resourced' })}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
        <div className="mt-6 rounded-2xl border border-border bg-card p-6 sm:p-10">
          <p className="text-xs font-medium uppercase tracking-widest text-[var(--accent-blue)]">
            Fully Resourced Membership
          </p>
          <h1 className="mt-2 font-display text-3xl font-semibold">
            $97 <span className="text-base font-normal text-muted-foreground">/ month</span>
          </h1>
          <ul className="mt-4 space-y-1 text-sm text-muted-foreground">
            <li>• Billed monthly at $97 and auto-renews until you cancel.</li>
            <li>• Cancel anytime from your account — access continues through the paid period.</li>
            <li>• Applicable taxes calculated at checkout.</li>
          </ul>

          <label className="mt-6 flex items-start gap-3 text-sm">
            <input
              type="checkbox"
              className="mt-1 h-4 w-4"
              checked={accepted}
              onChange={(e) => setAccepted(e.target.checked)}
            />
            <span>
              I agree to the{' '}
              <Link to="/terms" target="_blank" className="underline">
                Terms of Service
              </Link>{' '}
              and{' '}
              <Link to="/privacy" target="_blank" className="underline">
                Privacy Policy
              </Link>
              , and understand my card will be charged $97 today and again each month until I
              cancel.
            </span>
          </label>

          <Button
            size="lg"
            className="mt-6 w-full bg-[#433993] text-white hover:bg-[#433993]/90"
            onClick={handleStart}
            disabled={!accepted || starting}
          >
            {starting ? 'Opening secure checkout…' : 'Continue to payment'}
          </Button>
          <p className="mt-3 text-center text-xs text-muted-foreground">
            Card details are collected securely by Stripe. We never see your card number.
          </p>
        </div>
      </main>
    </div>
  );
}
