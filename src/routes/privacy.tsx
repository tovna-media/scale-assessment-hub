import { createFileRoute, Link } from "@tanstack/react-router";

const CANONICAL = "https://app.getfullyresourced.com/privacy";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — Fully Resourced" },
      {
        name: "description",
        content:
          "Privacy Policy for the Fully Resourced Leadership System app: what we collect, how we use it, and the choices you have.",
      },
      { property: "og:title", content: "Privacy Policy — Fully Resourced" },
      {
        property: "og:description",
        content:
          "Read how the Fully Resourced Leadership System app collects, uses, and protects your personal information.",
      },
      { property: "og:url", content: CANONICAL },
    ],
    links: [{ rel: "canonical", href: CANONICAL }],
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
      <p className="mt-2 text-sm font-medium text-muted-foreground">
        Effective date: July 23, 2026
      </p>

      <div className="mt-8 space-y-8 text-[15px] leading-relaxed text-foreground">
        <p>
          This Privacy Policy explains what WOOHOOing LLC dba Lohman Leadership Group ("we," "us,"
          or "our") collects when you use the Fully Resourced Leadership System® application at{" "}
          <a href="https://app.getfullyresourced.com" className="underline">
            app.getfullyresourced.com
          </a>{" "}
          (the "App"), how we use it, and the choices you have. By using the App, you agree to this
          policy.
        </p>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">1. Information we collect</h2>
          <p className="font-semibold">Information you give us:</p>
          <ul className="ml-5 list-disc space-y-1.5">
            <li>Account details: your name, email address, and phone number.</li>
            <li>
              Assessment responses: your answers to the Inner Capacity, Leadership, and Business
              assessments, and any notes, action plans, and self-ratings you enter during a cycle.
            </li>
            <li>
              Communications: messages you send us, including to the Fully Resourced AI Coach.
            </li>
          </ul>
          <p className="font-semibold">Payment information:</p>
          <ul className="ml-5 list-disc space-y-1.5">
            <li>
              Your subscription is billed through Stripe. Stripe collects and processes your card
              details directly. We do not store your full card number. We receive limited billing
              information such as the last four digits, card brand, subscription status, and renewal
              dates.
            </li>
          </ul>
          <p className="font-semibold">Information we collect automatically:</p>
          <ul className="ml-5 list-disc space-y-1.5">
            <li>
              Usage data: which assessments and sections you complete, when you log in, and how you
              move through the App, so we can run the product and see where people get stuck.
            </li>
            <li>Device and log data: IP address, browser type, and similar technical details.</li>
            <li>
              Cookies and similar technology used to keep you logged in and to understand usage.
            </li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">2. How we use your information</h2>
          <p>We use your information to:</p>
          <ul className="ml-5 list-disc space-y-1.5">
            <li>Create and manage your account and your one free pass.</li>
            <li>Generate your gap report and run your 12-week cycle and dashboard.</li>
            <li>
              Process your subscription payments and manage renewals, failed payments, and
              cancellations.
            </li>
            <li>
              Send you service messages, such as password resets, receipts, and new-section notices.
            </li>
            <li>
              Power the Fully Resourced AI Coach responses using your relevant assessment context.
            </li>
            <li>Improve the App and understand where users drop off.</li>
            <li>Protect the App against fraud and abuse and meet legal obligations.</li>
          </ul>
          <p>We do not sell your personal information.</p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">3. How we share your information</h2>
          <p>We share information only as needed to run the App:</p>
          <ul className="ml-5 list-disc space-y-1.5">
            <li>
              <span className="font-semibold">Stripe</span> processes payments and stores your card
              details.
            </li>
            <li>
              <span className="font-semibold">Our email and messaging provider</span> (including
              GoHighLevel for certain notices) sends account and marketing messages.
            </li>
            <li>
              <span className="font-semibold">
                The provider behind the Fully Resourced AI Coach
              </span>{" "}
              processes the messages and context needed to answer you.
            </li>
            <li>
              <span className="font-semibold">Our hosting and database provider</span> stores your
              account and app data.
            </li>
            <li>
              <span className="font-semibold">Rich Lohman and authorized staff</span> can see member
              accounts, assessment results, and progress in the App's admin area to support you and
              run the coaching business.
            </li>
          </ul>
          <p>
            We may also share information if the law requires it, to protect our rights or users'
            safety, or as part of a business transfer such as a sale or merger.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">4. How long we keep your information</h2>
          <p>
            We keep your account and app data while your account is active. If you cancel, we keep
            your cycle progress and inputs for 90 days in case you resubscribe, then remove or
            anonymize them unless we need to keep them for legal, tax, or fraud-prevention reasons.
            Billing records are kept as long as the law requires.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">5. Your choices and rights</h2>
          <p>You can:</p>
          <ul className="ml-5 list-disc space-y-1.5">
            <li>View and update your account details in the App.</li>
            <li>Cancel your subscription anytime from the billing page.</li>
            <li>
              Ask us to access, correct, or delete your personal information by emailing{" "}
              <a href="mailto:support@getfullyresourced.com" className="underline">
                support@getfullyresourced.com
              </a>
              . We will respond as required by applicable law.
            </li>
          </ul>
          <p>
            Depending on where you live, you may have additional rights over your data, such as the
            right to access, delete, correct, or limit its use. Contact us to exercise them.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">6. Security</h2>
          <p>
            We use reasonable technical and organizational measures to protect your information,
            including access controls and encryption in transit. No system is perfectly secure, so
            we cannot guarantee absolute security. Keep your password private.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">7. Children</h2>
          <p>
            The App is for adults and is not intended for anyone under 18. We do not knowingly
            collect information from children under 18. If you believe a child gave us information,
            contact us and we will remove it.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">8. Cookies</h2>
          <p>
            We use cookies and similar technology to keep you signed in and to understand how the
            App is used. You can control cookies through your browser settings, though some features
            may not work without them.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">9. Changes to this policy</h2>
          <p>
            We may update this Privacy Policy. If we make a material change, we will post the new
            version with a new effective date and, where appropriate, notify you. Continuing to use
            the App after a change means you accept the updated policy.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">10. Contact</h2>
          <p>
            Questions about your privacy or this policy: WOOHOOing LLC dba Lohman Leadership Group,
            71 Dennis Ave, Fruitport, MI 49415.{" "}
            <a href="mailto:support@getfullyresourced.com" className="underline">
              support@getfullyresourced.com
            </a>
          </p>
        </section>
      </div>

      <div className="mt-12 border-t border-[var(--fr-hairline)] pt-6 text-sm">
        <Link to="/terms" className="underline">
          Terms of Service
        </Link>
        <span className="mx-2 text-muted-foreground">·</span>
        <Link to="/" className="underline">
          Return to Fully Resourced
        </Link>
      </div>
    </main>
  );
}
