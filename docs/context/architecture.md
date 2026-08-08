# Architecture

Source of truth for schema: `supabase/migrations/*` and `src/integrations/supabase/types.ts` (generated DB types). This doc is the map.

## Stack
TanStack Start (React full-stack, SSR) + TanStack Router (file-based, `src/routes`, generated `src/routeTree.gen.ts`) + TanStack Query. TypeScript, Vite, Tailwind v4, shadcn/ui. Supabase backend. Stripe billing. Email via Lovable email package. Deployed on Cloudflare (nitro + wrangler).

## Route groups (`src/routes`)
- Public: `index.tsx`, `signup.tsx`, `forgot-password.tsx`, `terms.tsx`, `privacy.tsx`, `unsubscribe.tsx`, `30-day-trial.tsx` + `30-day-trial_.success.tsx` (30-day free trial checkout flow; `founding.tsx` + `founding_.success.tsx` are now thin redirects to the new paths, kept for previously shared links), `coach.login.tsx`.
- `_authenticated/` (member area, guarded by `_authenticated.tsx`): `dashboard.tsx` (home), `assessment.$type.tsx`, `report.$sessionId.tsx` (gap report), `cycle.tsx` + `guide.tsx` + `guide.section-1..12.tsx`, `performance.tsx`, `print.all.tsx` + `print.section.$number.tsx`, `profile.tsx`, `security.tsx`, `checkout.activating.tsx` (post-checkout "activating" state that polls for the webhook to grant access).
- `_coach/` (admin, guarded by `_coach.tsx`): `coach.tsx`, `coach.assessee.$userId.tsx`, `settings.tsx`.
- API / server: `api/public/payments/webhook.ts` (Stripe), `api/public/hooks/action-reminders.ts` (twice-weekly action reminder email), `email/unsubscribe.ts`, `lovable/email/*` (email queue, transactional send, auth emails, suppression).

## App components (`src/components/scale`)
`AppShell.tsx`, `AppHeader.tsx` (layout + nav), `Logo.tsx`, `SiteFooter.tsx`, `SuccessImageHero.tsx` (Success Image box), `YourActionsCard.tsx` (Your actions box), `AICoachWidget.tsx` (Fully Resourced AI Coach), `GapReportPanel.tsx`, `SectionVideo.tsx`, `PrintDoc.tsx` + `PrintSectionButton.tsx`, `ChangePasswordCard.tsx`, `AboutSectionSheet.tsx`, `JourneyFlowchartDialog.tsx`.

## Auth / gating
`src/integrations/supabase/auth-middleware.ts`, `auth-attacher.ts`, `client.ts`, `client.server.ts`. Route guards `_authenticated.tsx` and `_coach.tsx`. Reuse these for any paid/free decision.

## Member journey
1. Sign up (account required for assessments).
2. Three assessments (Inner Capacity, Personal Leadership, Business Audit) -> generate the SCALE Gap Report. First full pass is free, one per account.
3. After the gap report, the paid product is the next step. Free members see a locked preview and an upgrade path.
4. Subscribe via Stripe ($97/mo or $984/yr). Retaking assessments / more gap reports requires the subscription.
5. Paid onboarding surfaces the Priority Gap, the book, and the AI coach.
6. 12-week cycle: one section unlocks each Monday (drip). Members work sections; the dashboard fills in.
7. Week 12: re-assess, updated gap report, dashboard shows movement, next cycle begins.

## The 12 sections
`guide.section-1..12.tsx`. Each holds content + inputs the member returns to. Section dashboards follow Evaluate -> Identify -> Understand -> Build a Plan -> Execute -> Measure. The Execute step is usually a concrete action with a Completion Date -> feeds the "This week" actions on the home dashboard. Section 2 (Lead Yourself) captures the five Success Image categories and the Daily Behaviors that feed the home dashboard.

## Dashboard data (per current cycle; resets each new cycle)
- Five Success Image category fields (existing).
- `daily_read_log` (member_id, date) -> read streak.
- `daily_action_check` (member_id, behavior_id, date) -> daily habits.
- `section_action` (member_id, cycle_id, source_section, action_text, completion_date, status, week) -> "This week" actions.
- `member.timezone` -> daily reset, streak, email timing.
- Subscription state and "has gap report" state already exist — reuse, don't duplicate. Confirm exact table/column names in `types.ts` and the migrations.
