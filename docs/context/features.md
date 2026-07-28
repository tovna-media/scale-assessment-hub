# Features (mapped to files)

How each piece behaves. File is the source of truth; this is the intent.

## Home dashboard — paid (`src/routes/_authenticated/dashboard.tsx`)
Coach-lens home. Two boxes:
- Success Image box (`SuccessImageHero.tsx`): shows ONE of the five Success Image categories per day, rotating in order, skipping blanks, changing once per calendar day (member timezone). Category text is verbatim, wrapped in quotes, with a small description line under it. Read-streak pill + "Mark as read today" (one read/day -> `daily_read_log`). "See full image" expands all five.
- Your actions box (`YourActionsCard.tsx`): ONE card, TWO groups. "Today" = daily habits from the member's Daily Behaviors (`daily_action_check`, reset each morning). "This week" = dated Execute-step actions from unlocked sections (`section_action`), with due / done / still-open states. Always collapsed by default, never remembers open state. Empty groups hidden. Overdue handled by carry-or-close at each new-section unlock (no pile-up). Small description line under the title.

## Home dashboard — free
Before gap report: focused "take your 3 assessments" card is the primary action; no big upgrade bar. After gap report: locked coaching preview (see gating doc).

## Fully Resourced AI Coach (`AICoachWidget.tsx`)
External CoachVox embed (`https://app.coachvox.ai/avatar/mtybCyZrwODb9uv9MIJq/embed`) as a floating bottom-right bubble; the menu item opens the same panel. Paid only for the real embed. Free members: visible but locked, click opens the plans modal, and the embed/URL is never in their DOM. Not connected to app data.

## Assessments + Gap Report (`assessment.$type.tsx`, `report.$sessionId.tsx`, `GapReportPanel.tsx`)
Three assessments feed a personalized PDF gap report (pdf-lib). Gap report PDF lives at a permanent URL (no expiring signed links). Priority Gap is computed here and drives the dashboard and the free preview.

## The cycle + sections (`cycle.tsx`, `guide.tsx`, `guide.section-1..12.tsx`, `SectionVideo.tsx`)
12 sections, drip one per Monday. Each section page has a "Watch first" video slot (`SectionVideo.tsx`); Sections 1 and 2 have videos (S1 https://youtu.be/HA6aX1EJ06k, S2 https://youtu.be/MNomJ1zXrSI), 3-12 pending from Rich (slot hidden until a video exists). Sections capture inputs incl. Success Image, Daily Behaviors, and Execute-step actions.

## Performance (`performance.tsx`)
The Leadership Performance Dashboard — growth tracking over cycles (recharts). Paid.

## Print (`print.all.tsx`, `print.section.$number.tsx`, `PrintDoc.tsx`, `PrintSectionButton.tsx`)
Print / save a completed section, or all completed sections, as a clean branded document.

## Plans / billing UI
Plans modal (Free vs $97/mo; Monthly/Annual toggle, Annual $82/mo billed $984/yr, "Save 15%"). Upgrade -> Stripe Checkout; Downgrade -> Stripe customer portal. Replaced the old offer/checkout pages. See billing-and-launch.md.

## Account (`profile.tsx`, `security.tsx`, `ChangePasswordCard.tsx`)
Edit Profile, and a separate "Password & Security" screen (`security.tsx`) between Edit Profile and Manage Billing. Structure security.tsx as the security home (room for 2FA / sessions later), not just a password form.

## Emails (`src/routes/lovable/email/*`, `src/lib/email`, `api/public/hooks/action-reminders.ts`)
Sent from the app via the Lovable email package, not GHL. Action reminder: twice a week off `section_action` due dates, incl. overdue nudges. Daily Success Image reminder email is deferred until Rich delivers his 12-week daily prompts. Transactional emails (password reset, receipts) stay separate from marketing nudges.

## Coach admin (`_coach/coach.tsx`, `coach.assessee.$userId.tsx`, `settings.tsx`)
Rich-only admin: members, their assessments/progress, settings.

## Founding member flow (`founding.tsx`, `founding_.success.tsx`)
Temporary launch-period page. Founding members get 20% off their first month. The logic is already built and working. This is time-boxed to the launch — retire the page and its Stripe coupon after the launch period ends.

## Password update — built
Registered members can update their own password (built via Claude Code). Lives in the account area alongside `security.tsx` / `ChangePasswordCard.tsx`.
