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
        How the Fully Resourced Leadership System collects, uses, and protects your data.
      </p>

      <div className="mt-8 space-y-4 text-sm leading-relaxed text-foreground">
        <h2 className="text-lg font-semibold">Information we collect</h2>
        <p>
          When you create an account we collect your name, email address, and phone number. When
          you complete an assessment we store your responses, the scores computed from them, and
          any coach notes attached to your profile. If you subscribe to Fully Resourced, Stripe
          collects and processes your payment information on our behalf; we never see or store
          your card details.
        </p>

        <h2 className="text-lg font-semibold">How we use your information</h2>
        <p>
          Your data is used to generate your personalized SCALE Gap Report, power your Fully
          Resourced membership dashboard, deliver transactional emails tied to your account
          (report delivery, password resets, receipts), and let coach Rich Lohman review your
          progress inside the coaching workspace. We do not sell your data and do not use it for
          third-party advertising.
        </p>

        <h2 className="text-lg font-semibold">Sharing and processors</h2>
        <p>
          We share only what is needed with the processors that run the service: Stripe (payment
          processing), Supabase (database and authentication hosting), Resend (transactional
          email), and Lovable AI Gateway (AI-generated report content). Each processor sees only
          the fields required to perform its function.
        </p>

        <h2 className="text-lg font-semibold">Data retention</h2>
        <p>
          Your assessment history and gap reports are retained for the life of your account so you
          can track progress across cycles. You can request deletion of your account and
          associated data at any time by emailing rich@richlohman.com.
        </p>

        <h2 className="text-lg font-semibold">Your rights</h2>
        <p>
          You can request a copy of the data we hold about you, correct inaccuracies, or ask us to
          delete it. To exercise any of these rights, contact rich@richlohman.com and we will
          respond within a reasonable time.
        </p>

        <h2 className="text-lg font-semibold">Contact</h2>
        <p>
          Questions about this policy can be sent to Rich Lohman at rich@richlohman.com.
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