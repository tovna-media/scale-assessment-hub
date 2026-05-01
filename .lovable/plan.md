
# SCALE Assessment Hub — Build Plan

## Design Direction

- **Palette**: Navy Trust — deep navy `#0f1b3d`, mid-navy `#1e3a5f`, blue accent `#3b6fa0`, off-white `#e8edf3`. White surfaces with navy accents for premium executive feel.
- **Typography**: Sora (headings) + Manrope (body) — sharp, modern, confident.
- **Tone**: Generous whitespace, subtle borders, soft shadows. No gradients, no playful elements. Print-friendly report layout.
- **Responsive**: Mobile-first for assessee side; desktop-first dense tables for coach.

---

## Backend (Lovable Cloud / Supabase)

### Tables

- **profiles** — `id` (FK auth.users), `email`, `full_name`, `created_at`. Auto-created on signup via trigger.
- **user_roles** — `id`, `user_id`, `role` enum (`assessee`, `coach`). Separate table to prevent privilege escalation. `has_role()` security-definer function.
- **assessment_sessions** — `id`, `user_id`, `assessment_type` enum (`inner_capacity`, `personal_leadership`, `business_audit`), `responses` jsonb, `subcategory_scores` jsonb, `overall_score` int, `gap_report` text, `created_at`.
- **coach_notes** — `id`, `assessee_id`, `coach_id`, `note`, `status` enum (`New`,`Contacted`,`Booked`,`Client`), `created_at`, `updated_at`.
- **assessee_status** — single current status per assessee (separate from notes feed): `assessee_id` (PK), `coach_id`, `status`, `updated_at`.

### RLS Policies

- Assessees: read/insert their own `assessment_sessions`; read own `profiles`.
- Coaches (`has_role(uid,'coach')`): read all profiles, all sessions, all notes, all statuses; write notes + statuses.
- Roles table: users read their own role; only coaches can assign roles.

### Auth

- Email + password (auto-confirm enabled for smooth dev).
- Signup trigger creates `profiles` row + assigns `assessee` role.
- Rich's coach role assigned manually via SQL.

### Server Functions

- `generateGapReport` (`createServerFn` + `requireSupabaseAuth`): receives session id → fetches the session → calls Lovable AI Gateway (`google/gemini-2.5-pro`) with structured prompt including all three assessments' subcategory scores → saves `gap_report` text and `overall_score` back to the session row → returns report.
- Uses `LOVABLE_API_KEY` (auto-provided). Handles 429/402 with friendly errors.

---

## Routes

```text
/                              → marketing landing (brief intro + Sign in/up)
/login, /signup                → auth
/_authenticated/
  dashboard                    → assessee dashboard (3 cards + history)
  assessment/$type             → take assessment (inner_capacity | personal_leadership | business_audit)
  report/$sessionId            → gap report view (print-friendly)
/_coach/                       → guarded by has_role('coach')
  coach                        → coach dashboard (stats + assessee table)
  coach/assessee/$userId       → assessee profile (history, chart, notes)
```

---

## Assessee Experience

### Dashboard
- Three cards (Inner Capacity, Personal Leadership, Business Audit) with description, last score + date if taken, primary CTA "Take" / "Retake".
- "My History" table below: assessment, date, score, View Report.

### Assessment Flow
- **Grouped by subcategory**: each step shows the subcategory label (e.g. "Energy & Recovery") and its 1–2 questions. Progress bar across the top.
- 1–5 Likert scale buttons with labels (1 = Almost Never … 5 = Almost Always).
- Final step: "Generate My Gap Report" button.

### Loading Screen
- Animated spinner + "Analyzing your responses…" / "~15 seconds".

### Gap Report
- Overall SCALE score with circular score ring.
- Three analysis sections (one per assessment) with subcategories tagged Critical Gap (<60%) / Moderate Gap (60–79%) / Strength (≥80%).
- Cross-Connection Analysis (AI-generated narrative).
- Your Next Step — three path cards, "1:1 Coaching with Rich" highlighted.
- Footer: "Book a Strategy Call" (placeholder link) + "Download My Report (PDF)" (browser print).
- Print CSS: hides nav/buttons, A4-friendly typography, keeps colors.

### Scoring Logic
- Each question 1–5. Subcategory score = avg of its questions × 20 (→ 0–100). Overall score = avg of subcategory scores for that assessment. Stored in `subcategory_scores` jsonb + `overall_score`.

---

## Coach Experience (Rich)

### Coach Dashboard
- Top stats: Total assessments, New this week, Booked calls, Active clients.
- Assessees table: Name, Email, "X of 3" assessments taken, Latest Score, Last Active, Status dropdown (inline edit), Actions (View Profile, Email mailto:).
- Filters: status, assessment type, search.

### Assessee Profile
- Header: name, email, joined date, status dropdown, Send Email button.
- Assessment History list with "View Full Report" → modal with full report text.
- Progress chart (Recharts line chart) — score over time per assessment type, only if 2+ sessions of same type exist.
- Coach Notes: textarea + Save → feed of past notes with timestamps.

---

## Gap Report AI Prompt (structure)

System: "You are Rich Lohman, an executive leadership coach. Generate a personalized SCALE Gap Report. Use direct, warm, executive-grade language. No fluff."

User: structured payload with:
- Assessee name
- For each of the 3 assessments: overall score + subcategory scores (named) + which were taken
- Instructions to produce: per-assessment analysis (label each subcategory Critical Gap / Moderate Gap / Strength with 1–2 sentences), a Cross-Connection Analysis paragraph, and Next Step recommendation rationale.

Returned as markdown; rendered with a small markdown component.

---

## Technical Notes

- Frontend: React + TS + Tailwind, shadcn/ui components, TanStack Router file-based routes, Recharts for chart.
- Server: TanStack `createServerFn` with `requireSupabaseAuth` middleware. No edge functions.
- AI: Lovable AI Gateway (`google/gemini-2.5-pro`) called server-side; never from client.
- Auth guard: `_authenticated` layout route gates assessee routes; `_coach` layout route additionally checks `has_role`.
- Each assessment session is immutable history — never overwrite.
- Status changes write to `assessee_status` (current) AND log to notes feed for audit.

---

## Out of Scope (per spec)

No public coach signup, no email sending, no payment processing, no real Calendly integration (placeholder link), no features beyond those listed.
