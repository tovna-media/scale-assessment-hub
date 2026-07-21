import { createFileRoute, Link } from '@tanstack/react-router';

export const Route = createFileRoute('/privacy')({
  head: () => ({
    meta: [
      { title: 'Privacy Policy — SCALE' },
      { name: 'description', content: 'Privacy Policy for SCALE and the Fully Resourced membership.' },
      { name: 'robots', content: 'noindex' },
    ],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-14 sm:px-6 sm:py-20">
      <p className="text-xs font-medium uppercase tracking-widest text-[var(--accent-blue)]">
        Legal
      </p>
      <h1 className="mt-2 font-display text-3xl font-semibold sm:text-4xl">Privacy Policy</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Placeholder — final Privacy Policy copy to be provided.
      </p>

      <div className="mt-8 space-y-4 text-sm text-foreground">
        <p>
          SCALE collects the information you provide (name, email, phone, and assessment responses)
          to generate your personalized SCALE Gap Report and, for members, to power your Fully
          Resourced membership. Payment information is handled by Stripe; we never see your card
          details.
        </p>
        <p>
          Full Privacy Policy will be published here. For any questions or data requests, contact
          Rich at rich@richlohman.com.
        </p>
      </div>

      <div className="mt-10 text-sm">
        <Link to="/dashboard" className="underline">
          Back to Dashboard
        </Link>
      </div>
    </main>
  );
}