# Fully Resourced App — Claude Code Guide

> Shared engineering standards for every Tovna Media app live in `../CLAUDE.md` (the Apps folder). Follow those in addition to this file.

This file loads at the start of every session. Keep it lean. Deeper context lives in `docs/context/` — read the relevant file when a task touches that area. The code and `supabase/migrations` + `src/integrations/supabase/types.ts` are the ultimate source of truth; this doc explains intent and where things live.

## What this is
A member coaching app for Rich Lohman's Fully Resourced Leadership System, live at scale.richlohman.com. Members take three SCALE assessments, get a personalized Gap Report, then (paid) work a guided 12-week Leadership Optimization Cycle with a home dashboard, an AI coach, and a digital book. getfullyresourced.com is the marketing front door; this repo is the product.

## Stack
- TanStack Start (React full-stack) + TanStack Router (file-based routes in `src/routes`) + TanStack Query.
- TypeScript, Vite, Tailwind v4, shadcn/ui (`src/components/ui`). App components in `src/components/scale`.
- Supabase: Postgres, auth, storage, edge functions (`src/integrations/supabase`, `supabase/migrations`).
- Stripe subscriptions (`stripe`, `@stripe/react-stripe-js`). Webhook at `src/routes/api/public/payments/webhook.ts`.
- Email via Lovable's email package (`@lovable.dev/email-js`, `src/lib/email`, `src/routes/lovable/email/*`).
- PDF via pdf-lib (gap report + print). Charts via recharts. Forms via react-hook-form + zod.
- Deployed on Cloudflare (Vite plugin + nitro + wrangler).

## Golden rules (do not violate)
1. **Build from the lens of a coach, not a pile of features.** The app coaches people when Rich isn't in the room. Every screen should reinforce that.
2. **Paid vs free must be explicit and enforced server-side.** Never gate with UI/CSS alone. Reuse the existing subscription check as the single source of truth; enforce with route guards (`src/routes/_authenticated.tsx`, `src/integrations/supabase/auth-middleware.ts`), RLS, and server checks. See `docs/context/gating-paid-vs-free.md`.
3. **Honest measurement.** Dashboard numbers are self-report. Never build or label anything to imply the app verifies real-world behavior.
4. **The Fully Resourced AI Coach is external (CoachVox) and NOT connected to app data.** It does not know a member's gap report or scores. Market it as "trained on Rich's decades of experience," never "knows your gaps." Free members: visible but locked (click opens the plans modal); never render the embed/URL in a free member's DOM.
5. **Outcome-driven copy, correctly timed.** Say "start getting coached," not "unlock more assessments." Never sell the upgrade before a member has seen and felt their gaps.

## Working conventions
- Reuse existing components, hooks, and state (subscription status, "has gap report") — don't invent new sources of truth.
- Match the design system: brand purple #5B2D8E, existing shadcn components, existing nav/card styling.
- Keep changes minimal and well-scoped. Propose real refactors before doing them.
- Run `lint`/`format` and any existing tests; add tests where the project covers gating or billing.
- One focused PR per concern, small commits, clear messages; the PR says what changed and how it was verified.

## Deeper context (`docs/context/`)
- `principles.md` — the product philosophy behind the golden rules.
- `architecture.md` — routes, the cycle model, and the data model, with real file paths.
- `gating-paid-vs-free.md` — exactly what free vs paid members get, and how it's enforced.
- `features.md` — how each feature behaves, mapped to its components and routes.
- `billing-and-launch.md` — Stripe setup, webhooks, dunning, and the pre-launch checklist.
- `decisions-log.md` — dated record of locked decisions and why.
