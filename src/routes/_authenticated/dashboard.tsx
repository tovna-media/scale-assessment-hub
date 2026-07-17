import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { ASSESSMENT_LIST, maxScoreFor, type AssessmentType } from "@/lib/assessments";
import { Button } from "@/components/ui/button";
import { ArrowRight, ArrowUpRight, ArrowDownRight, Lock, Sparkles, Minus, Target } from "lucide-react";
import { logFunnelEvent } from "@/lib/funnel.functions";
import { getSubscriptionStatus } from "@/lib/payments.functions";
import { getGapReportEligibility } from "@/lib/report.functions";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Home — Fully Resourced" }] }),
  validateSearch: (search: Record<string, unknown>) => ({
    checkout: search.checkout === "success" ? ("success" as const) : undefined,
  }),
  component: DashboardPage,
});

interface SessionRow {
  id: string;
  assessment_type: AssessmentType;
  overall_score: number;
  created_at: string;
  gap_report: string | null;
}

interface ProfileInfo {
  firstName: string | null;
  fullName: string | null;
}

const CYCLE_LENGTH = 12;
const PURPLE = "#5b19bf";
const PURPLE_SOFT = "#9a5cff";

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

function pctOf(score: number, max: number) {
  if (!max) return 0;
  return Math.round((score / max) * 100);
}

/** Circular progress ring */
function Ring({
  value,
  max,
  size = 96,
  stroke = 8,
  children,
  color = PURPLE,
}: {
  value: number;
  max: number;
  size?: number;
  stroke?: number;
  children?: React.ReactNode;
  color?: string;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = max > 0 ? Math.min(1, Math.max(0, value / max)) : 0;
  const offset = c * (1 - pct);
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} strokeWidth={stroke} stroke="var(--fr-lilac)" fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          strokeWidth={stroke}
          stroke={color}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 600ms ease" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">{children}</div>
    </div>
  );
}

/** Sparkline from a numeric series (0..1 relative) */
function Sparkline({ points, width = 140, height = 40 }: { points: number[]; width?: number; height?: number }) {
  if (points.length < 2) {
    return <div className="h-10 text-xs text-[var(--fr-muted-ink)]">Not enough history yet</div>;
  }
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const step = width / (points.length - 1);
  const coords = points.map((v, i) => {
    const x = i * step;
    const y = height - ((v - min) / range) * (height - 6) - 3;
    return [x, y] as const;
  });
  const d = coords.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const [lx, ly] = coords[coords.length - 1];
  return (
    <svg width={width} height={height} className="overflow-visible">
      <path d={d} fill="none" stroke={PURPLE} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={lx} cy={ly} r={3} fill={PURPLE} />
    </svg>
  );
}

function Delta({ value, unit = "pts" }: { value: number | null; unit?: string }) {
  if (value === null) {
    return <span className="inline-flex items-center gap-1 text-xs text-[var(--fr-muted-ink)]"><Minus className="h-3 w-3" /> —</span>;
  }
  if (value === 0) {
    return <span className="inline-flex items-center gap-1 text-xs text-[var(--fr-muted-ink)]"><Minus className="h-3 w-3" /> 0 {unit}</span>;
  }
  const up = value > 0;
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold ${up ? "text-emerald-600" : "text-rose-600"}`}>
      {up ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
      {up ? "+" : ""}{value} {unit}
    </span>
  );
}

function DashboardPage() {
  const { user } = useAuth();
  const { checkout } = Route.useSearch();
  const navigate = useNavigate();
  const shownCheckoutToast = useRef(false);

  useEffect(() => {
    if (checkout !== "success" || shownCheckoutToast.current) return;
    shownCheckoutToast.current = true;
    toast.success("Welcome to Fully Resourced!", {
      description: "Your subscription is active. You have unlimited access to assessments and Gap Reports.",
    });
    navigate({ to: "/dashboard", search: {}, replace: true });
  }, [checkout, navigate]);

  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [freePassUsed, setFreePassUsed] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [profile, setProfile] = useState<ProfileInfo>({ firstName: null, fullName: null });
  const [priorityGap, setPriorityGap] = useState<{ name: string; score: number | null } | null>(null);
  const [section1Complete, setSection1Complete] = useState(false);
  const [maxSectionCompleted, setMaxSectionCompleted] = useState<number>(0);
  const [eligibility, setEligibility] = useState<{
    reportsGenerated: number;
    readyCount: number;
    total: number;
    allowed: boolean;
    isFirstRound: boolean;
    perTypeReady: Record<AssessmentType, boolean>;
  } | null>(null);
  const logEvent = useServerFn(logFunnelEvent);
  const checkSub = useServerFn(getSubscriptionStatus);
  const checkEligibility = useServerFn(getGapReportEligibility);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("assessment_sessions")
      .select("id, assessment_type, overall_score, created_at, gap_report")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setSessions((data ?? []) as SessionRow[]);
        setLoading(false);
      });
    supabase
      .from("profiles")
      .select("free_pass_used, first_name, full_name")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        const p = data as { free_pass_used?: boolean; first_name?: string | null; full_name?: string | null } | null;
        setFreePassUsed(Boolean(p?.free_pass_used));
        setProfile({ firstName: p?.first_name ?? null, fullName: p?.full_name ?? null });
      });
    void checkSub({})
      .then((s) => setSubscribed(Boolean(s.active)))
      .catch(() => setSubscribed(false));
    void checkEligibility({})
      .then((e) =>
        setEligibility({
          reportsGenerated: e.reportsGenerated,
          readyCount: e.readyCount,
          total: e.total,
          allowed: e.allowed,
          isFirstRound: e.isFirstRound,
          perTypeReady: e.perTypeReady as Record<AssessmentType, boolean>,
        }),
      )
      .catch(() => setEligibility(null));
    supabase
      .from("optimizer_section_progress")
      .select("section_number, priority_gap, priority_gap_score, completed")
      .eq("user_id", user.id)
      .then(({ data }) => {
        if (!data) return;
        const rows = data as { section_number: number; priority_gap: string | null; priority_gap_score: number | null; completed: boolean }[];
        const s1 = rows.find((r) => r.section_number === 1);
        if (s1) {
          setSection1Complete(Boolean(s1.completed));
          if (s1.priority_gap) setPriorityGap({ name: s1.priority_gap, score: s1.priority_gap_score ?? null });
        }
        const completedMax = rows.filter((r) => r.completed).reduce((m, r) => Math.max(m, r.section_number), 0);
        setMaxSectionCompleted(completedMax);
      });
  }, [user, checkSub, checkEligibility]);

  const paywalled = freePassUsed && !subscribed;

  function handleSubscribeClick() {
    void logEvent({ data: { event_type: "clicked_subscribe" } }).catch(() => {});
  }

  const displayName = profile.firstName || profile.fullName?.split(" ")[0] || (user?.email ? user.email.split("@")[0] : "");

  const perType = useMemo(() => {
    const map: Record<AssessmentType, SessionRow[]> = {
      inner_capacity: [],
      personal_leadership: [],
      business_audit: [],
    };
    for (const s of sessions) map[s.assessment_type]?.push(s);
    // sessions are DESC; sort ASC for sparklines
    (Object.keys(map) as AssessmentType[]).forEach((t) => {
      map[t] = [...map[t]].sort((a, b) => a.created_at.localeCompare(b.created_at));
    });
    return map;
  }, [sessions]);

  const assessmentStats = ASSESSMENT_LIST.map((a) => {
    const series = perType[a.type];
    const latest = series[series.length - 1];
    const prev = series[series.length - 2];
    const max = maxScoreFor(a.type);
    const percent = latest ? pctOf(latest.overall_score, max) : 0;
    const delta = latest && prev ? latest.overall_score - prev.overall_score : null;
    return { def: a, latest, prev, max, percent, delta, series: series.map((s) => s.overall_score) };
  });

  const takenCount = assessmentStats.filter((s) => s.latest).length;

  // Gap report score = average of assessment percentages, when at least one taken
  const gapReportScore = takenCount > 0
    ? Math.round(assessmentStats.filter((s) => s.latest).reduce((sum, s) => sum + s.percent, 0) / takenCount)
    : null;
  // Trend: current vs previous average across types that have a prev
  const gapReportTrend: number | null = (() => {
    const withPrev = assessmentStats.filter((s) => s.latest && s.prev);
    if (withPrev.length === 0) return null;
    const cur = withPrev.reduce((s, x) => s + pctOf(x.latest!.overall_score, x.max), 0) / withPrev.length;
    const prv = withPrev.reduce((s, x) => s + pctOf(x.prev!.overall_score, x.max), 0) / withPrev.length;
    return Math.round(cur - prv);
  })();

  const cycleWeek = maxSectionCompleted; // 0..12 sections completed represents cycle progress
  const cycleProgressPct = Math.round((cycleWeek / CYCLE_LENGTH) * 100);
  const nextSection = Math.min(CYCLE_LENGTH, cycleWeek + 1);
  const inCycle = subscribed && section1Complete;

  const latestSession = sessions[0];
  const readyCount = eligibility?.readyCount ?? 0;
  const canGenerate = Boolean(eligibility?.allowed);
  const isFirstRound = eligibility?.isFirstRound ?? true;
  const completedTypes = new Set(sessions.map((s) => s.assessment_type));
  const nextIncomplete = ASSESSMENT_LIST.find((a) => !completedTypes.has(a.type));
  const nextRetake =
    eligibility && !eligibility.isFirstRound
      ? ASSESSMENT_LIST.find((a) => !eligibility.perTypeReady[a.type])
      : undefined;
  const nextTarget = nextRetake ?? nextIncomplete ?? ASSESSMENT_LIST[0];
  const nextLabel = nextRetake
    ? `Retake ${nextRetake.shortTitle}`
    : nextIncomplete
      ? `Take ${nextIncomplete.shortTitle}`
      : "Continue";
  const showGapBanner =
    eligibility !== null &&
    (
      // Before the first Gap Report: show while assessments remain, or when ready to generate.
      (isFirstRound && (completedTypes.size < 3 || canGenerate)) ||
      // After a report exists: only show during the end-of-cycle re-assessment window.
      (!isFirstRound && (canGenerate || readyCount > 0))
    );
  const hasAnyReport = (eligibility?.reportsGenerated ?? 0) > 0;
  const nextAssessmentTo = `/assessment/${nextTarget.type}`;
  const nextSectionTo = `/guide/section-${nextSection}`;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-8 sm:py-10">
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--rl-purple)]">
          Your leadership system
        </p>
        <h2 className="mt-2 text-3xl font-bold tracking-tight text-[var(--fr-ink)] sm:text-4xl">
          {greeting()}{displayName ? `, ${displayName}.` : "."}
        </h2>
        <p className="mt-1 text-sm text-[var(--fr-muted-ink)]">
          {inCycle ? "Here's where to focus this week." : "Take your assessments to unlock your personalized cycle."}
        </p>
      </div>

      {/* Hero focus card */}
      <HeroFocusCard
        inCycle={inCycle}
        cycleWeek={cycleWeek}
        cycleLength={CYCLE_LENGTH}
        cycleProgressPct={cycleProgressPct}
        nextSection={nextSection}
        priorityGap={priorityGap}
        subscribed={subscribed}
        section1Complete={section1Complete}
        takenCount={takenCount}
        nextAssessmentTo={nextAssessmentTo}
        nextSectionTo={nextSectionTo}
      />

      {/* Stat cards */}
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <StatCard
          label="Latest Gap Report"
          value={gapReportScore !== null ? String(gapReportScore) : "—"}
          suffix={gapReportScore !== null ? "/100" : undefined}
          trailing={<Delta value={gapReportTrend} unit="pts" />}
          sparklinePoints={(() => {
            const rounds: number[] = [];
            const maxLen = Math.max(...ASSESSMENT_LIST.map((a) => perType[a.type].length), 0);
            for (let i = 0; i < maxLen; i++) {
              const scores = ASSESSMENT_LIST.map((a) => {
                const list = perType[a.type];
                const s = list[i];
                return s ? pctOf(s.overall_score, maxScoreFor(a.type)) : null;
              }).filter((v): v is number => v !== null);
              if (scores.length > 0) rounds.push(scores.reduce((a, b) => a + b, 0) / scores.length);
            }
            return rounds;
          })()}
          empty={gapReportScore === null ? "Take an assessment to see your first score" : undefined}
        />
        <StatCard
          label="Cycle progress"
          value={inCycle ? `Week ${cycleWeek}` : "Not started"}
          suffix={inCycle ? `of ${CYCLE_LENGTH}` : undefined}
          progress={inCycle ? cycleProgressPct : 0}
          empty={!inCycle ? "Complete Section 1 to start" : undefined}
        />
        <StatCard
          label="Next unlock"
          value={inCycle && cycleWeek < CYCLE_LENGTH ? `Section ${nextSection}` : cycleWeek >= CYCLE_LENGTH ? "Complete" : "—"}
          subValue={inCycle ? "Available now" : undefined}
          icon={<Lock className="h-4 w-4" />}
          empty={!inCycle ? "Locked until Section 1 is done" : undefined}
        />
      </div>

      {/* Assessment performance */}
      {/* Gap Report banner */}
      {showGapBanner && (
        <div className="mt-6 flex flex-col gap-4 rounded-2xl border border-[var(--fr-hairline)] bg-white p-6 shadow-[var(--shadow-card)] sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3 min-w-0">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[var(--fr-lilac)] text-[var(--rl-purple)]">
              <Target className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--rl-purple)]">
                SCALE Gap Report
              </p>
              <h4 className="mt-1 text-lg font-semibold text-[var(--fr-ink)]">
                {canGenerate
                  ? isFirstRound
                    ? "You're ready to generate your full SCALE Gap Report"
                    : "You're ready to generate your next SCALE Gap Report"
                  : isFirstRound
                    ? `Complete all 3 assessments to unlock your Gap Report (${completedTypes.size}/3 done)`
                    : `Retake all 3 assessments for your next Gap Report (${readyCount} of 3 retaken)`}
              </h4>
              <p className="mt-1 text-sm text-[var(--fr-muted-ink)]">
                {canGenerate
                  ? "Combine your results into one unified report with cross-connection analysis."
                  : "Your personalized report ties together Inner Capacity, Personal Leadership, and Business Audit."}
              </p>
            </div>
          </div>
          {canGenerate && latestSession ? (
            <Button asChild size="lg">
              <Link to="/report/$sessionId" params={{ sessionId: latestSession.id }}>
                <Sparkles className="mr-2 h-4 w-4" /> Generate Gap Report
              </Link>
            </Button>
          ) : (
            <Button asChild size="lg">
              <Link to="/assessment/$type" params={{ type: nextTarget.type }}>
                <ArrowRight className="mr-2 h-4 w-4" /> {nextLabel}
              </Link>
            </Button>
          )}
        </div>
      )}

      {/* Paywall */}
      {paywalled && (
        <div className="mt-6 flex flex-col gap-4 rounded-2xl border border-amber-200 bg-amber-50/70 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3 min-w-0">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-amber-100 text-amber-700">
              <Lock className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-700">Free pass used</p>
              <h4 className="mt-1 text-lg font-semibold text-[var(--fr-ink)]">
                You've used your 1-free Gap Report
              </h4>
              <p className="mt-1 text-sm text-[var(--fr-muted-ink)]">
                Get the full system for $97/month: your guided cycle, Coach Rich AI, live dashboard, the digital book, and unlimited assessments.
              </p>
            </div>
          </div>
          <Button size="lg" onClick={handleSubscribeClick} asChild>
            <Link to="/fully-resourced">
              Get Fully Resourced <span className="ml-2 text-sm opacity-80">$97/mo</span>
            </Link>
          </Button>
        </div>
      )}

      {/* Explore Performance — only after the member has generated at least one Gap Report */}
      {hasAnyReport && (
      <div className="mt-10 flex flex-col gap-4 rounded-2xl border border-[var(--fr-hairline)] bg-white p-6 shadow-[var(--shadow-card)] sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--rl-purple)]">Performance</p>
          <h4 className="mt-1 text-base font-semibold text-[var(--fr-ink)]">See your growth over time</h4>
          <p className="mt-1 text-sm text-[var(--fr-muted-ink)]">
            Per-assessment trends, deltas, and every Gap Report you've generated.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link to="/performance">Open Performance <ArrowRight className="ml-2 h-4 w-4" /></Link>
        </Button>
      </div>
      )}
    </div>
  );
}

function HeroFocusCard({
  inCycle,
  cycleWeek,
  cycleLength,
  cycleProgressPct,
  nextSection,
  priorityGap,
  subscribed,
  section1Complete,
  takenCount,
  nextAssessmentTo,
  nextSectionTo,
}: {
  inCycle: boolean;
  cycleWeek: number;
  cycleLength: number;
  cycleProgressPct: number;
  nextSection: number;
  priorityGap: { name: string; score: number | null } | null;
  subscribed: boolean;
  section1Complete: boolean;
  takenCount: number;
  nextAssessmentTo: string;
  nextSectionTo: string;
}) {
  // Determine hero state
  let eyebrow = "Get started";
  let heading = "Take your first assessment";
  let body = "Complete your three SCALE assessments to unlock your personalized Gap Report and 12-week cycle.";
  let ctaLabel = takenCount === 0 ? "Start your first assessment" : "Continue your assessments";
  let ctaTo: string = nextAssessmentTo;
  let ringValue = takenCount;
  let ringMax = 3;
  let ringLabel = "TAKEN";

  if (subscribed && !section1Complete) {
    eyebrow = "Cycle · Section 1";
    heading = "Begin your Leadership Optimization Cycle";
    body = "Confirm your assessments, lock in your Priority Gap, and answer five reflection questions.";
    ctaLabel = "Start Section 1";
    ctaTo = "/guide/section-1";
  } else if (inCycle && cycleWeek < cycleLength) {
    eyebrow = `WEEK ${cycleWeek || 1} OF ${cycleLength}`;
    heading = priorityGap
      ? `Focus your work on ${priorityGap.name}`
      : "Continue your cycle";
    body = priorityGap
      ? `Your Priority Gap is ${priorityGap.name}. Complete Section ${nextSection} to keep your cycle moving.`
      : `Complete Section ${nextSection} to keep your cycle moving.`;
    ctaLabel = `Continue Section ${nextSection}`;
    ctaTo = nextSectionTo;
    ringValue = cycleWeek;
    ringMax = cycleLength;
    ringLabel = "WEEKS";
  } else if (inCycle && cycleWeek >= cycleLength) {
    eyebrow = "Cycle complete";
    heading = "You've completed your 12-week cycle";
    body = "Retake your assessments to measure your growth and start a new cycle.";
    ctaLabel = "Retake assessments";
    ctaTo = nextAssessmentTo;
    ringValue = cycleLength;
    ringMax = cycleLength;
    ringLabel = "WEEKS";
  }

  return (
    <div
      className="relative overflow-hidden rounded-3xl border border-[var(--fr-hairline)] p-6 shadow-[var(--shadow-card)] sm:p-8"
      style={{ background: "linear-gradient(120deg, #f4eeff 0%, #ffffff 55%, #e9deff 100%)" }}
    >
      {/* Decorative chevrons */}
      <div aria-hidden className="pointer-events-none absolute inset-y-0 right-24 hidden items-center gap-4 opacity-30 md:flex">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="h-24 w-24 rotate-45 rounded-2xl border-2"
            style={{ borderColor: PURPLE_SOFT, transform: `translateX(${i * -8}px) rotate(45deg)`, opacity: 0.4 - i * 0.1 }}
          />
        ))}
      </div>

      <div className="relative grid gap-6 md:grid-cols-[1fr_auto] md:items-center">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--rl-purple)]">{eyebrow}</p>
          <h3 className="mt-2 text-2xl font-bold tracking-tight text-[var(--fr-ink)] sm:text-3xl">
            {heading}
          </h3>
          <p className="mt-2 max-w-xl text-sm text-[var(--fr-muted-ink)]">{body}</p>

          {inCycle && (
            <div className="mt-5 max-w-md">
              <div className="flex items-center justify-between text-xs text-[var(--fr-muted-ink)]">
                <span>Cycle progress</span>
                <span className="font-semibold text-[var(--fr-ink)]">{cycleProgressPct}%</span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/70">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${cycleProgressPct}%`, background: `linear-gradient(90deg, ${PURPLE} 0%, ${PURPLE_SOFT} 100%)` }}
                />
              </div>
            </div>
          )}

          <div className="mt-6">
            <Button asChild size="lg">
              <Link to={ctaTo}>{ctaLabel} <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
          </div>
        </div>

        <div className="shrink-0 self-center">
          <Ring value={ringValue} max={ringMax} size={132} stroke={10}>
            <div className="text-3xl font-bold text-[var(--fr-ink)] leading-none">
              {ringValue}<span className="text-lg font-medium text-[var(--fr-muted-ink)]"> / {ringMax}</span>
            </div>
            <div className="mt-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--fr-muted-ink)]">
              {ringLabel}
            </div>
          </Ring>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  suffix,
  subValue,
  trailing,
  progress,
  sparklinePoints,
  icon,
  empty,
}: {
  label: string;
  value: string;
  suffix?: string;
  subValue?: string;
  trailing?: React.ReactNode;
  progress?: number;
  sparklinePoints?: number[];
  icon?: React.ReactNode;
  empty?: string;
}) {
  return (
    <div className="rounded-2xl border border-[var(--fr-hairline)] bg-white p-5 shadow-[var(--shadow-card)]">
      <div className="flex items-start justify-between">
        <p className="text-sm font-medium text-[var(--fr-ink)]">{label}</p>
        {icon && (
          <span className="grid h-8 w-8 place-items-center rounded-full bg-[var(--fr-lilac)] text-[var(--rl-purple)]">
            {icon}
          </span>
        )}
      </div>
      <div className="mt-3 flex items-baseline gap-2">
        <span className="text-3xl font-bold tracking-tight text-[var(--fr-ink)]">{value}</span>
        {suffix && <span className="text-sm text-[var(--fr-muted-ink)]">{suffix}</span>}
        {trailing && <span className="ml-1">{trailing}</span>}
      </div>
      {subValue && <div className="mt-1 text-xs text-[var(--fr-muted-ink)]">{subValue}</div>}
      {typeof progress === "number" && progress > 0 && (
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-[var(--fr-lilac)]">
          <div
            className="h-full rounded-full"
            style={{ width: `${progress}%`, background: `linear-gradient(90deg, ${PURPLE} 0%, ${PURPLE_SOFT} 100%)` }}
          />
        </div>
      )}
      {sparklinePoints && sparklinePoints.length > 0 && (
        <div className="mt-3"><Sparkline points={sparklinePoints} /></div>
      )}
      {empty && (
        <div className="mt-3 text-xs italic text-[var(--fr-muted-ink)]">{empty}</div>
      )}
    </div>
  );
}

