import { createFileRoute, Link } from '@tanstack/react-router';

export const Route = createFileRoute('/terms')({
  head: () => ({
    meta: [
      { title: 'Terms of Service — SCALE' },
      { name: 'description', content: 'Terms of Service for the SCALE Gap Report and Fully Resourced membership.' },
      { name: 'robots', content: 'noindex' },
    ],
  }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-14 sm:px-6 sm:py-20">
      <p className="text-xs font-medium uppercase tracking-widest text-[var(--accent-blue)]">
        Legal
      </p>
      <h1 className="mt-2 font-display text-3xl font-semibold sm:text-4xl">Terms of Service</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Placeholder — final Terms of Service copy to be provided.
      </p>

      <div className="mt-8 space-y-4 text-sm text-foreground">
        <p>
          By using SCALE or subscribing to Fully Resourced you agree to these terms. Fully Resourced
          is a monthly subscription billed at $97 that auto-renews until cancelled. You can cancel
          at any time from your account; cancellation stops future billing and keeps your access
          until the end of the current paid period.
        </p>
        <p>
          Full Terms of Service will be published here. For any questions, contact Rich at
          rich@richlohman.com.
        </p>
      </div>

      <div className="mt-10 text-sm">
        <Link to="/fully-resourced" className="underline">
          Back to Fully Resourced
        </Link>
      </div>
    </main>
  );
}