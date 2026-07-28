# Decisions log

Dated, newest first. The "why" so we don't re-litigate or accidentally reverse them.

## 2026-07-24
- Tooling moved from Lovable to Claude Code + this GitHub repo (Lovable too credit-heavy; Claude Code stronger and has the whole repo).
- Menu: "My Cycle" (the section work) and "Performance" (the tracking) are correctly separate. Add "Fully Resourced AI Coach" to the menu, visible-but-locked for free. Optional "Performance" -> "My Progress" (preference).
- Pre-gap-report free home shows only the "take your assessments" focus; the big upgrade bar is held until the gap report exists.
- Password update moved out of Edit Profile into its own "Password & Security" screen between Edit Profile and Manage Billing (`security.tsx`).
- Action reminder email sent from the app (not GHL), twice a week off due dates. Daily Success Image reminder email deferred until Rich delivers 12-week daily prompts.

## 2026-07-23
- Coach-lens dashboard greenlit and built: Success Image box (daily rotation of the five categories, verbatim, read streak) + "Your actions" box (one card, two groups, always collapsed by default, empty groups hidden, overdue handled by carry-or-close, no pile-up).
- Free-member preview built: after the gap report, the free home becomes a locked preview of the paid coaching space using the member's real priority gap plus sample/illustration content.
- Fully Resourced AI Coach: it's an EXTERNAL CoachVox tool not connected to app data. Free members get it visible-but-locked (click -> plans modal); no free "taste" (a generic chat would underwhelm and it can't personalize). Market as "trained on Rich's decades," never "knows your gaps." Renamed from "Coach Rich AI."
- Plans: single pop-up replaced the separate offer/checkout pages. Annual added at $984/yr ($82/mo, Save 15%).

## Earlier
- App-first pivot: sell the software/system, not just coaching. Free = assessments + one gap report; paid ($97/mo) = the full coaching system. The leak being fixed is warm gap-report viewers who won't book a call.
- Honest measurement rule and the coach-lens principle established (see principles.md).

## 2026-07-28
- Repo relocated to `Apps/get fully resourced/`; shared engineering standards for all Tovna apps in `Apps/CLAUDE.md`.
- Password update feature for registered members built.
- Founding member flow confirmed: temporary launch-period page, 20% off first month, logic built and working. Retire the page + coupon after launch.
- Preparing to publish to the public (see billing-and-launch.md for the launch checklist).
