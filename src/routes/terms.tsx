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
        The terms that govern your use of the SCALE Gap Report and the Fully Resourced membership.
      </p>

      <div className="mt-8 space-y-4 text-sm leading-relaxed text-foreground">
        <h2 className="text-lg font-semibold">Accepting these terms</h2>
        <p>
          By creating an account, taking an assessment, or subscribing to Fully Resourced you
          agree to these terms. If you do not agree, do not use the service.
        </p>

        <h2 className="text-lg font-semibold">The service</h2>
        <p>
          Fully Resourced provides the three SCALE assessments, a personalized SCALE Gap Report,
          the 12-section Optimized Leader Guide, the Fully Resourced AI Coach, growth tracking,
          and print-to-PDF for your own records. Feature availability depends on your subscription
          state. Content and coaching materials are provided for informational purposes and are
          not a substitute for professional legal, medical, financial, or therapeutic advice.
        </p>

        <h2 className="text-lg font-semibold">Subscription and billing</h2>
        <p>
          Fully Resourced is offered as a monthly or annual subscription. Prices are shown at
          checkout and processed by Stripe. Subscriptions auto-renew until cancelled. You can
          cancel at any time from the billing portal; cancellation stops future billing and keeps
          your paid access until the end of the current paid period. Except where required by
          law, payments are non-refundable.
        </p>

        <h2 className="text-lg font-semibold">Your account</h2>
        <p>
          You are responsible for keeping your login credentials confidential and for all activity
          under your account. Notify us at rich@richlohman.com if you suspect unauthorized use.
          One free Gap Report is included per account; additional reports require an active paid
          subscription and follow the re-assessment rules described inside the app.
        </p>

        <h2 className="text-lg font-semibold">Acceptable use</h2>
        <p>
          Do not resell, reverse engineer, scrape, or attempt to disrupt the service. Do not use
          the service to violate applicable laws or the rights of others. We may suspend or close
          accounts that breach these terms.
        </p>

        <h2 className="text-lg font-semibold">Content ownership</h2>
        <p>
          You own the responses and notes you enter. Fully Resourced owns the assessment
          framework, guide, and report format. We grant you a personal, non-transferable license
          to use your reports and printed guide sections for your own leadership development.
        </p>

        <h2 className="text-lg font-semibold">Disclaimers and liability</h2>
        <p>
          The service is provided "as is" without warranties of any kind. To the maximum extent
          permitted by law, our aggregate liability for any claim relating to the service is
          limited to the amounts you paid us in the twelve months preceding the claim.
        </p>

        <h2 className="text-lg font-semibold">Changes</h2>
        <p>
          We may update these terms as the service evolves. Material changes will be announced in
          the app or by email. Continued use after an update means you accept the revised terms.
        </p>

        <h2 className="text-lg font-semibold">Contact</h2>
        <p>
          Questions about these terms can be sent to Rich Lohman at rich@richlohman.com.
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