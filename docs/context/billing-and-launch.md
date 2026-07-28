# Billing and launch

Stripe subscriptions. Currently on sandbox/test keys. Webhook: `src/routes/api/public/payments/webhook.ts`.

## Prices
- Monthly: $97/month.
- Annual: $984/year, shown as "$82/mo, Save 15%". The annual Stripe price must exist and its price ID be wired into the plans modal. Test-mode price IDs differ from live-mode; recreate in live at launch.

## Plans modal behavior
- Free vs paid cards, Monthly/Annual toggle (Annual default).
- Free member: "Current plan" on Free, "Upgrade" on paid -> Stripe Checkout for the selected period.
- Paid member: "Current plan" on paid, "Downgrade" on Free -> Stripe customer portal to cancel.

## Correctness rules (do not regress)
- Grant access from the verified Stripe webhook, never the success page. `checkout.activating.tsx` polls subscription status until the webhook lands.
- Verify the Stripe webhook signature; make handling idempotent (store processed event IDs) so retries/duplicates don't double-grant or double-tag.
- Enforce gating and the one-free-pass limit server-side (see gating doc).
- Failed payment: 7-day grace (past_due keeps access, send update-card email, let Stripe retries run), then cancel if still unpaid; restore on success.
- Cancel keeps access to period end and keeps cycle progress; canceling does not restore a free pass.
- Keep Stripe secrets server-side only.

## Legal
`terms.tsx` and `privacy.tsx` exist. At checkout, plainly state price, cadence, auto-renewal, and how to cancel, and link both. Rich still needs to fill entity name / address / governing state and get an attorney review before charging real cards.

## Pre-launch checklist (before flipping to live keys)
- Subscribe with a test card; access granted by webhook even if the success page is closed early.
- Webhook verifies signature and is idempotent.
- Paid content blocked server-side for free/logged-out (not just hidden).
- Free pass: one assessment set + one gap report free; second attempt paywalled; cancel-and-return gives no fresh free pass.
- Declined card -> past_due, 7-day grace, update-card email, then cancel.
- Cancel keeps access to period end and keeps progress.
- Terms + Privacy live, linked at checkout with auto-renewal disclosure, attorney-reviewed.
- New features work on desktop and mobile.
- Switch sandbox -> live keys, secrets server-side, run one real card, then publish.
