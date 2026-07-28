# Gating: paid vs free

The highest-risk area. Get it wrong and either people pay for nothing or get everything free. Enforce server-side; the UI lock is only a courtesy on top.

## Source of truth
Use the app's existing subscription check (via `src/integrations/supabase/auth-middleware.ts` and the `_authenticated` guard). Never add a second way to decide "is this member paid." Never decide access from the checkout success page — access is granted by the Stripe webhook (`src/routes/api/public/payments/webhook.ts`); `checkout.activating.tsx` polls until it lands.

## What FREE members get
- The three assessments and ONE Gap Report (one free pass per account). A second assessment set or gap report requires paying.
- Home BEFORE the gap report: a focused "take your 3 assessments" screen. Do not push the big upgrade bar here.
- Home AFTER the gap report: a locked preview of the coaching space (their real priority gap as the hook; the Success Image / actions / AI coach shown dimmed with sample content and a single "Unlock" badge; outcome CTA that opens the plans modal). Sample content is illustration, not their data.
- Paid menu items (My Cycle, Performance, The Book, Fully Resourced AI Coach) are visible but LOCKED — clicking opens the plans modal. A locked menu is itself a tease. Never render gated content or the CoachVox embed/URL in a free member's DOM.
- The sidebar "Upgrade Now" button.

## What PAID members get
- The full home dashboard (Success Image box + Your actions box).
- The 12-week cycle and all sections, the Performance dashboard, the digital book, and the working AI coach.
- Unlimited assessment retakes and gap reports.

## Enforcement rules
- Gate on the server (route guards, RLS, server functions), not just by hiding UI.
- The free-pass limit (one assessment set + one gap report) is enforced in the database, not just the screen.
- Free/logged-out users must not be able to reach paid content by typing the URL.
