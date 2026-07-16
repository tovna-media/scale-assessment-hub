import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { ArrowRight, Check, ShieldCheck } from 'lucide-react';
import { Logo } from '@/components/scale/Logo';

export const Route = createFileRoute('/fully-resourced')({
  head: () => ({
    meta: [
      { title: 'Fully Resourced — $97/month leadership membership' },
      {
        name: 'description',
        content:
          'The full SCALE system for $97/month: a 90-day guided leadership plan, Coach Rich AI, a live Performance Dashboard, the digital "Fully Resourced" book, and unlimited assessments and gap reports.',
      },
      { property: 'og:title', content: 'Fully Resourced — $97/month' },
      {
        property: 'og:description',
        content:
          '90-day guided leadership plan, Coach Rich AI, live Performance Dashboard, the digital book, and unlimited assessments and gap reports.',
      },
    ],
  }),
  component: OfferPage,
});

const PILLARS: Array<{ title: string; body: string }> = [
  {
    title: '90-day guided leadership plan',
    body: 'A structured, coach-designed cycle that moves your biggest gap forward — one focused sprint at a time.',
  },
  {
    title: 'Coach Rich AI',
    body: "Ask questions and get Rich's frameworks and coaching on demand, tuned to your assessment results.",
  },
  {
    title: 'Performance Dashboard',
    body: 'A live view of how your leadership and business are moving — so you can see momentum, not just feel it.',
  },
  {
    title: 'The digital "Fully Resourced" book',
    body: "Rich's full playbook for leaders scaling past their own capacity, available inside your membership.",
  },
  {
    title: 'Unlimited assessments and gap reports',
    body: 'Retake any SCALE assessment and regenerate your Gap Report as often as you need to track progress.',
  },
];

function OfferPage() {
  const { session } = useAuth();
  const navigate = useNavigate();

  function handleSubscribe() {
    if (!session) {
      // Send them to sign-up first, then bring them back here.
      navigate({ to: '/signup', search: { redirect: '/fully-resourced' } as never });
      return;
    }
    navigate({ to: '/checkout' });
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <Link to="/" className="flex items-center gap-3">
            <Logo className="h-9 w-auto" />
          </Link>
          <div className="text-sm">
            {session ? (
              <Link to="/dashboard" className="text-muted-foreground hover:text-foreground">
                Back to dashboard
              </Link>
            ) : (
              <Link to="/login" className="text-muted-foreground hover:text-foreground">
                Sign in
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-14 sm:px-6 sm:py-20">
        <section className="text-center">
          <p className="text-xs font-medium uppercase tracking-widest text-[var(--accent-blue)]">
            Fully Resourced Membership
          </p>
          <h1 className="mt-3 font-display text-4xl font-semibold sm:text-5xl">
            Get the full system.
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
            The SCALE Gap Report shows you where the gap is. Fully Resourced is how you close it — a
            guided 90-day cycle, Coach Rich AI, a live dashboard, the digital book, and unlimited
            assessments.
          </p>

          <div className="mt-8 flex flex-col items-center gap-3">
            <div className="flex items-baseline gap-2">
              <span className="font-display text-5xl font-semibold">$97</span>
              <span className="text-lg text-muted-foreground">/ month</span>
            </div>
            <Button
              size="lg"
              onClick={handleSubscribe}
              className="bg-[#433993] px-8 text-white hover:bg-[#433993]/90"
            >
              Get Fully Resourced <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <p className="max-w-md text-xs text-muted-foreground">
              Billed monthly at $97. Auto-renews each month until you cancel. Cancel anytime from
              your account — you'll keep access through the end of the paid period.
            </p>
          </div>
        </section>

        <section className="mt-16 grid gap-5 sm:grid-cols-2">
          {PILLARS.map((p) => (
            <div
              key={p.title}
              className="rounded-2xl border border-border bg-card p-6 shadow-sm"
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5 rounded-full bg-[#433993]/10 p-1.5 text-[#433993]">
                  <Check className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="font-display text-lg font-semibold">{p.title}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">{p.body}</p>
                </div>
              </div>
            </div>
          ))}
        </section>

        <section className="mt-16 rounded-2xl border border-border bg-muted/40 p-6 sm:p-10">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 h-5 w-5 text-[#433993]" />
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>
                <span className="font-medium text-foreground">Plain-language terms.</span> Fully
                Resourced is $97 per month, billed monthly, and auto-renews until you cancel.
                Applicable taxes are calculated at checkout.
              </p>
              <p>
                <span className="font-medium text-foreground">Cancel anytime.</span> You can cancel
                from your account in one click. Cancellation stops future billing and keeps your
                access through the end of the current paid period. Your data is preserved for 90
                days in case you come back.
              </p>
              <p>
                By subscribing you agree to our{' '}
                <Link to="/terms" className="underline hover:text-foreground">
                  Terms of Service
                </Link>{' '}
                and{' '}
                <Link to="/privacy" className="underline hover:text-foreground">
                  Privacy Policy
                </Link>
                .
              </p>
            </div>
          </div>

          <div className="mt-8 flex flex-col items-center gap-3">
            <Button
              size="lg"
              onClick={handleSubscribe}
              className="bg-[#433993] px-8 text-white hover:bg-[#433993]/90"
            >
              Get Fully Resourced — $97/month <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </section>
      </main>
    </div>
  );
}