import { createFileRoute, Link } from "@tanstack/react-router";

const CANONICAL = "https://app.getfullyresourced.com/terms";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Service — Fully Resourced" },
      {
        name: "description",
        content:
          "Terms of Service for the Fully Resourced Leadership System app, including subscription, billing, and auto-renewal terms.",
      },
      { property: "og:title", content: "Terms of Service — Fully Resourced" },
      { property: "og:url", content: CANONICAL },
    ],
    links: [{ rel: "canonical", href: CANONICAL }],
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
      <p className="mt-2 text-sm font-medium text-muted-foreground">
        Effective date: July 23, 2026
      </p>

      <div className="mt-8 space-y-8 text-[15px] leading-relaxed text-foreground">
        <p>
          These Terms of Service ("Terms") are an agreement between you and WOOHOOing LLC dba Lohman
          Leadership Group ("we," "us," or "our"), which operates the Fully Resourced Leadership
          System® application at{" "}
          <a href="https://app.getfullyresourced.com" className="underline">
            app.getfullyresourced.com
          </a>{" "}
          (the "App"). By creating an account, taking an assessment, or subscribing, you agree to
          these Terms. If you do not agree, do not use the App.
        </p>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">1. What the App is</h2>
          <p>
            The App gives leaders a set of self-assessments, a personalized gap report, a guided
            12-week leadership development cycle, a performance dashboard, a digital book, and
            access to the Fully Resourced AI Coach. It is a self-guided development tool built on
            Rich Lohman's Fully Resourced Leadership System.
          </p>
          <p>
            The App is for leadership growth and education. It is not therapy, counseling, medical
            care, legal advice, or financial advice. The Fully Resourced AI Coach is an automated
            tool, not a licensed professional, and its responses are for general guidance only. Use
            your own judgment and consult a qualified professional when you need one.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">2. Accounts and eligibility</h2>
          <p>
            You need an account to use the App. You must be at least 18 years old and provide
            accurate information, including your name, email, and phone number. You are responsible
            for keeping your login secure and for everything that happens under your account. Tell
            us right away if you think your account has been used without permission.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">3. Your free pass</h2>
          <p>
            Each account gets one free pass. The free pass includes taking all three assessments one
            time and generating one gap report. After you use your free pass, taking the assessments
            again or generating another gap report requires a paid subscription. Canceling a
            subscription does not restore a free pass.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">4. Subscription, billing, and auto-renewal</h2>
          <p>
            The subscription is offered on two plans: a monthly plan at $97 per month, and an annual
            plan at $984 per year (which works out to $82 per month), unless we clearly state a
            different price at checkout. By subscribing, you authorize us and our payment processor,
            Stripe, to charge your payment method for the plan you choose.
          </p>
          <p>
            Your subscription renews automatically at the end of each billing period, monthly for
            the monthly plan and yearly for the annual plan, until you cancel. Each renewal charges
            the payment method on file at the then-current price for your plan. We are not required
            to send a separate reminder before each charge, though we may.
          </p>
          <p>
            You can cancel anytime from your account billing page. When you cancel, you keep access
            until the end of the period you already paid for, and you are not charged again after
            that. We do not provide partial refunds for the time left in a period, except where
            required by law.
          </p>
          <p>
            If a payment fails, your access continues for a 7-day grace period while we retry the
            charge. During that time you can update your card from the billing page. If the charge
            still fails after 7 days, your subscription is canceled and paid features are locked
            until you resubscribe.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">5. Refunds</h2>
          <p>
            Payments are non-refundable except where required by law or where we choose to grant a
            refund at our discretion. Canceling stops future charges; it does not refund past ones.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">6. Price changes</h2>
          <p>
            We may change the subscription price. If we do, we will give you notice before the
            change applies to your renewals. If you do not agree to a new price, you can cancel
            before it takes effect.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">7. Acceptable use</h2>
          <p>
            You agree not to share your account, resell or redistribute the App's content, copy or
            scrape the assessments, guide, or reports, reverse-engineer the App, upload harmful
            code, or use the App to break any law. We can suspend or close accounts that break these
            rules.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">8. Content and intellectual property</h2>
          <p>
            The App, the assessments, the gap report, the Optimized Leader Guide, the Fully
            Resourced Leadership System, and all related content are owned by us or our licensors
            and are protected by intellectual property law. We give you a personal, limited,
            non-transferable license to use them for your own leadership development while your
            account is in good standing. You keep ownership of the information you enter (your
            assessment answers, notes, and plans). You give us permission to store and process that
            information to run the App, as described in our{" "}
            <Link to="/privacy" className="underline">
              Privacy Policy
            </Link>
            .
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">9. Fully Resourced AI Coach</h2>
          <p>
            The Fully Resourced AI Coach is an automated assistant provided through a third-party
            tool and embedded in the App. It can be wrong or incomplete. It does not create a
            coaching, professional, or advisory relationship, and it is not a substitute for
            personal advice from a qualified person. Do not rely on it for medical, legal,
            financial, or emergency matters.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">10. Third-party services</h2>
          <p>
            The App relies on third-party services, including Stripe for payments, our email and
            messaging provider for notifications, and the provider behind the Fully Resourced AI
            Coach. Your use of those features is also subject to those providers' terms. We are not
            responsible for third-party services we do not control.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">11. No guarantee of results</h2>
          <p>
            We work hard to make the App useful, but we do not promise any specific outcome, score
            change, or business result from using it. Your results depend on your own effort and
            circumstances.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">12. Disclaimers</h2>
          <p>
            The App is provided "as is" and "as available." To the fullest extent allowed by law, we
            disclaim all warranties, express or implied, including fitness for a particular purpose,
            merchantability, and non-infringement. We do not warrant that the App will be
            uninterrupted, error-free, or secure.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">13. Limitation of liability</h2>
          <p>
            To the fullest extent allowed by law, we are not liable for indirect, incidental,
            special, consequential, or punitive damages, or for lost profits or data, arising from
            your use of the App. Our total liability for any claim relating to the App is limited to
            the amount you paid us in the 12 months before the claim.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">14. Termination</h2>
          <p>
            You can stop using the App and close your account at any time. We can suspend or end
            your access if you break these Terms or if we stop offering the App. Sections that by
            their nature should survive termination (ownership, disclaimers, limitation of
            liability, and governing law) continue to apply after your account ends.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">15. Changes to these Terms</h2>
          <p>
            We may update these Terms. If we make a material change, we will post the new version
            with a new effective date and, where appropriate, notify you. Continuing to use the App
            after a change means you accept the updated Terms.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">16. Governing law</h2>
          <p>
            These Terms are governed by the laws of the State of Michigan, without regard to its
            conflict-of-laws rules. Any dispute will be handled in the state or federal courts
            located in Michigan, Muskegon County, and you agree to that venue.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">17. Contact</h2>
          <p>
            Questions about these Terms: WOOHOOing LLC dba Lohman Leadership Group, 71 Dennis Ave,
            Fruitport, MI 49415.{" "}
            <a href="mailto:support@getfullyresourced.com" className="underline">
              support@getfullyresourced.com
            </a>
          </p>
        </section>
      </div>

      <div className="mt-12 border-t border-[var(--fr-hairline)] pt-6 text-sm">
        <Link to="/privacy" className="underline">
          Privacy Policy
        </Link>
        <span className="mx-2 text-muted-foreground">·</span>
        <Link to="/" className="underline">
          Return to Fully Resourced
        </Link>
      </div>
    </main>
  );
}
