import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { ASSESSMENT_LIST, maxScoreFor, COMBINED_MAX, type AssessmentType, type AssessmentDef } from "@/lib/assessments";
import { Button } from "@/components/ui/button";
import { ArrowRight, ArrowUpRight, ArrowDownRight, Lock, Sparkles, Minus, Target, FileText, BookOpen, RefreshCw, MessageCircle, LineChart, Download, CheckSquare, Quote } from "lucide-react";
import { logFunnelEvent } from "@/lib/funnel.functions";
import { getSubscriptionStatus } from "@/lib/payments.functions";
import { getGapReportEligibility } from "@/lib/report.functions";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { usePlansDialog } from "@/components/PlansDialog";
import { sectionUnlockStatus, formatUnlockDate } from "@/lib/section-unlock";
import { SuccessImageHero } from "@/components/scale/SuccessImageHero";
import { YourActionsCard } from "@/components/scale/YourActionsCard";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Home — Fully Resourced" }] }),
  validateSearch: (search: Record<string, unknown>) => ({
    checkout: search.checkout === "success" ? ("success" as const) : undefined,
    upgrade: search.upgrade === true || search.upgrade === "true" || search.upgrade === "1" ? true : undefined,
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
  const { checkout, upgrade } = Route.useSearch();
  const navigate = useNavigate();
  const shownCheckoutToast = useRef(false);
  const shownUpgradePrompt = useRef(false);

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
  const [cycleStart, setCycleStart] = useState<Date | null>(null);
  const [eligibility, setEligibility] = useState<{
    reportsGenerated: number;
    readyCount: number;
    total: number;
    allowed: boolean;
    isFirstRound: boolean;
    perTypeReady: Record<AssessmentType, boolean>;
    reassessmentUnlocked: boolean;
    retakeLocked: boolean;
  } | null>(null);
  const logEvent = useServerFn(logFunnelEvent);
  const checkSub = useServerFn(getSubscriptionStatus);
  const checkEligibility = useServerFn(getGapReportEligibility);
  const plansDialog = usePlansDialog();

  useEffect(() => {
    if (!upgrade || shownUpgradePrompt.current) return;
    shownUpgradePrompt.current = true;
    plansDialog.open();
    navigate({ to: "/dashboard", search: {}, replace: true });
  }, [upgrade, navigate, plansDialog]);

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
          reassessmentUnlocked: Boolean(e.reassessmentUnlocked),
          retakeLocked: Boolean(e.retakeLocked),
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
    supabase
      .from("gap_reports")
      .select("generated_at")
      .eq("user_id", user.id)
      .order("generated_at", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.generated_at) setCycleStart(new Date(data.generated_at));
      });
  }, [user, checkSub, checkEligibility]);

  const paywalled = freePassUsed && !subscribed;

  function handleSubscribeClick() {
    void logEvent({ data: { event_type: "clicked_subscribe" } }).catch(() => {});
    plansDialog.open();
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

  // Only show a Gap Report score once the member has actually generated a
  // SCALE Gap Report. Raw assessment averages don't represent the report.
  const reportSessions = sessions.filter((s) => s.gap_report);
  const hasGeneratedReport = reportSessions.length > 0;
  const gapReportScore = hasGeneratedReport
    ? Math.round(
        assessmentStats
          .filter((s) => s.latest)
          .reduce((sum, s) => sum + s.percent, 0) /
          Math.max(1, assessmentStats.filter((s) => s.latest).length),
      )
    : null;
  const gapReportTrend: number | null = (() => {
    if (!hasGeneratedReport) return null;
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
  // Drip-schedule status for the next section — must match the /cycle page.
  const nextSectionStatus = sectionUnlockStatus(cycleStart, nextSection, true);
  const nextSectionUnlocked = nextSectionStatus.unlocked;
  const nextUnlockAt = nextSectionStatus.unlockAt;

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
  const hasAnyReport = (eligibility?.reportsGenerated ?? 0) > 0;
  const nextAssessmentTo = `/assessment/${nextTarget.type}`;
  const nextSectionTo = `/guide/section-${nextSection}`;

  // Paywalled view: free member who has already used their free pass.
  // Rich preview of the paid coaching dashboard, designed to drive upgrades.
  if (!loading && paywalled) {
    const reportSessionId = reportSessions[0]?.id ?? latestSession?.id ?? null;

    // Priority gap: prefer Section-1 declared gap; otherwise pick the
    // lowest-scoring assessment as an honest "top gap right now".
    const lowest = [...assessmentStats]
      .filter((s) => s.latest)
      .sort((a, b) => a.percent - b.percent)[0];
    const topGapName =
      priorityGap?.name ||
      (lowest ? lowest.def.shortTitle : "Your first priority");

    // If we don't have their real report yet, keep the current
    // "finish your assessments to get your gap report" flow unchanged.
    if (!hasGeneratedReport || !reportSessionId) {
      // fall through to the standard (non-paywalled) render below
    } else {
    const openPlans = () => {
      void logEvent({ data: { event_type: "clicked_subscribe" } }).catch(() => {});
      plansDialog.open();
    };
    return (
      <FreeMemberPreview
        displayName={displayName}
        reportSessionId={reportSessionId}
        topGapName={topGapName}
        onOpenPlans={openPlans}
      />
    );
    }
  }

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

      {/* Order is driven by member state:
          - Before the first Gap Report: nudge (take assessments) first, then locked cycle.
          - Paid + has a Gap Report: cycle first. The retake nudge only appears
            once all 12 sections of the current cycle are complete
            (eligibility.reassessmentUnlocked). Mid-cycle, the retake box is hidden. */}
      {subscribed && (
        <SuccessImageHero cycleStart={cycleStart} section1Complete={section1Complete} />
      )}
      {subscribed && (
        <YourActionsCard
          unlockedSections={Array.from({ length: Math.max(1, cycleWeek + (nextSectionUnlocked ? 1 : 0)) }, (_, i) => i + 1).filter((n) => n <= CYCLE_LENGTH)}
          currentSection={nextSectionUnlocked ? nextSection : Math.max(1, cycleWeek)}
        />
      )}
      {(() => {
        const reassessmentUnlocked = Boolean(eligibility?.reassessmentUnlocked);
        const showNudge = isFirstRound || reassessmentUnlocked;
        const cycleFirst = subscribed && hasAnyReport;
        const showCycle = subscribed || hasAnyReport;
        const nudge = showNudge ? (
          <AssessmentNudgeCard
            takenCount={takenCount}
            canGenerate={canGenerate}
            isFirstRound={isFirstRound}
            readyCount={readyCount}
            latestSession={latestSession}
            nextTarget={nextTarget}
            nextLabel={nextLabel}
          />
        ) : null;
        const cycle = showCycle ? (
          <CycleCard
            inCycle={inCycle}
            cycleWeek={cycleWeek}
            cycleLength={CYCLE_LENGTH}
            cycleProgressPct={cycleProgressPct}
            nextSection={nextSection}
            priorityGap={priorityGap}
            section1Complete={section1Complete}
            hasAnyReport={hasAnyReport}
            nextAssessmentTo={nextAssessmentTo}
            nextSectionTo={nextSectionTo}
            nextSectionUnlocked={nextSectionUnlocked}
            nextUnlockAt={nextUnlockAt}
          />
        ) : null;
        return cycleFirst ? (
          <>
            {cycle}
            {nudge}
          </>
        ) : (
          <>
            {nudge}
            {cycle}
          </>
        );
      })()}

      {!subscribed && (
        <div
          className="mt-6 flex flex-col gap-4 rounded-2xl p-6 text-white shadow-[0_16px_40px_rgba(42,10,100,0.35)] sm:flex-row sm:items-center sm:justify-between"
          style={{ background: "linear-gradient(135deg, #2a0a64 0%, #5B2D8E 100%)" }}
        >
          <div className="min-w-0">
            <h3 className="text-xl font-semibold tracking-tight sm:text-2xl">
              Ready to close your gaps?
            </h3>
            <p className="mt-1 text-sm text-white/85">
              Everything that turns your gaps into your next level as a leader is one click away.
            </p>
          </div>
          <Button
            size="lg"
            className="w-full shrink-0 bg-white text-[#2a0a64] hover:bg-white/90 sm:w-auto"
            onClick={handleSubscribeClick}
          >
            <Sparkles className="mr-2 h-4 w-4" /> Upgrade Now
          </Button>
        </div>
      )}

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
          empty={gapReportScore === null ? "Generate your SCALE Gap Report to see your score" : undefined}
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
          subValue={
            inCycle && cycleWeek < CYCLE_LENGTH
              ? nextSectionUnlocked
                ? "Available now"
                : nextUnlockAt
                  ? `Available ${formatUnlockDate(nextUnlockAt)}`
                  : undefined
              : undefined
          }
          icon={<Lock className="h-4 w-4" />}
          empty={!inCycle ? "Locked until Section 1 is done" : undefined}
        />
      </div>

      {/* Assessment performance */}
      {/* Gap Report banner */}
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
                Get the full system for $97/month: your guided cycle, Fully Resourced AI Coach, live dashboard, the digital book, and unlimited assessments.
              </p>
            </div>
          </div>
          <Button size="lg" onClick={handleSubscribeClick}>
            Get Fully Resourced <span className="ml-2 text-sm opacity-80">$97/mo</span>
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

function AssessmentNudgeCard({
  takenCount,
  canGenerate,
  isFirstRound,
  readyCount,
  latestSession,
  nextTarget,
  nextLabel,
}: {
  takenCount: number;
  canGenerate: boolean;
  isFirstRound: boolean;
  readyCount: number;
  latestSession: SessionRow | undefined;
  nextTarget: AssessmentDef | undefined;
  nextLabel: string;
}) {
  const ringValue = takenCount;
  const ringMax = 3;
  let eyebrow = "SCALE Gap Report";
  let heading: string;
  let body: string;
  let ctaLabel: string;
  let ctaTo: string;

  if (canGenerate) {
    heading = isFirstRound
      ? "You're ready to generate your full SCALE Gap Report"
      : "You're ready to generate your next SCALE Gap Report";
    body = "All three assessments are in. Combine them into one unified report with cross-connection analysis.";
    ctaLabel = "Generate my Gap Report";
    ctaTo = latestSession ? `/report/${latestSession.id}` : "#";
  } else if (isFirstRound) {
    if (takenCount === 0) {
      heading = "Take your 3 assessments to unlock your SCALE Gap Report";
      body = "Your personalized report ties together Inner Capacity, Personal Leadership, and Business Audit. Each assessment takes about 5 minutes.";
      ctaLabel = "Start your first assessment";
    } else {
      heading = `Complete ${3 - takenCount} more assessment${3 - takenCount === 1 ? "" : "s"} to generate your report`;
      body = "You’re on your way. Finish the remaining assessments so we can build your full SCALE Gap Report.";
      ctaLabel = "Continue your assessments";
    }
    ctaTo = nextTarget ? `/assessment/${nextTarget.type}` : "#";
  } else {
    heading = `Retake all 3 assessments for your next Gap Report (${readyCount} of 3 retaken)`;
    body = "Refresh your scores before generating your next report.";
    ctaLabel = nextLabel;
    ctaTo = nextTarget ? `/assessment/${nextTarget.type}` : "#";
  }

  return (
    <div
      className="relative mb-6 overflow-hidden rounded-3xl border border-[var(--fr-hairline)] p-6 shadow-[var(--shadow-card)] sm:p-8"
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

          <div className="mt-6 flex flex-wrap items-center gap-3">
            {canGenerate && latestSession ? (
              <Button asChild size="lg">
                <Link to="/report/$sessionId" params={{ sessionId: latestSession.id }}>
                  <FileText className="mr-2 h-4 w-4" /> {ctaLabel}
                </Link>
              </Button>
            ) : (
              <Button asChild size="lg">
                <Link to="/assessment/$type" params={{ type: nextTarget?.type ?? "business_audit" }}>
                  <ArrowRight className="mr-2 h-4 w-4" /> {ctaLabel}
                </Link>
              </Button>
            )}
            <span className="text-xs text-[var(--fr-muted-ink)]">
              {takenCount === 3 ? "All 3 assessments done" : "Takes about 5 minutes each"}
            </span>
          </div>
        </div>

        <div className="shrink-0 self-center">
          <Ring value={ringValue} max={ringMax} size={132} stroke={10}>
            <div className="text-3xl font-bold text-[var(--fr-ink)] leading-none">
              {ringValue}<span className="text-lg font-medium text-[var(--fr-muted-ink)]"> / {ringMax}</span>
            </div>
            <div className="mt-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--fr-muted-ink)]">
              TAKEN
            </div>
          </Ring>
        </div>
      </div>
    </div>
  );
}

function CycleCard({
  inCycle,
  cycleWeek,
  cycleLength,
  cycleProgressPct,
  nextSection,
  priorityGap,
  section1Complete,
  hasAnyReport,
  nextAssessmentTo,
  nextSectionTo,
  nextSectionUnlocked,
  nextUnlockAt,
}: {
  inCycle: boolean;
  cycleWeek: number;
  cycleLength: number;
  cycleProgressPct: number;
  nextSection: number;
  priorityGap: { name: string; score: number | null } | null;
  section1Complete: boolean;
  hasAnyReport: boolean;
  nextAssessmentTo: string;
  nextSectionTo: string;
  nextSectionUnlocked: boolean;
  nextUnlockAt: Date | null;
}) {
  let eyebrow = "Cycle · Locked";
  let heading = "Your Leadership Optimization Cycle is almost ready";
  let body = "Once you complete all three assessments and generate your SCALE Gap Report, you'll be able to start Section 1 and begin your Leadership Optimization Cycle.";
  let ctaLabel = "Continue your assessments";
  let ctaTo: string = nextAssessmentTo;
  let ctaDisabled = true;

  if (inCycle && cycleWeek < cycleLength) {
    eyebrow = `WEEK ${cycleWeek || 1} OF ${cycleLength}`;
    if (nextSectionUnlocked) {
      heading = priorityGap
        ? `Focus your work on ${priorityGap.name}`
        : "Continue your cycle";
      body = priorityGap
        ? `Your Priority Gap is ${priorityGap.name}. Complete Section ${nextSection} to keep your cycle moving.`
        : `Complete Section ${nextSection} to keep your cycle moving.`;
      ctaLabel = `Continue Section ${nextSection}`;
      ctaTo = nextSectionTo;
      ctaDisabled = false;
    } else {
      // Latest section is complete, next one hasn't unlocked by date yet.
      const latest = cycleWeek; // sections completed so far
      const dateStr = nextUnlockAt ? formatUnlockDate(nextUnlockAt) : "soon";
      heading = `Nice work finishing Section ${latest}`;
      body = `Section ${nextSection} unlocks ${dateStr}. Review Section ${latest} anytime while you wait.`;
      ctaLabel = `Review Section ${latest}`;
      ctaTo = `/guide/section-${latest}`;
      ctaDisabled = false;
    }
  } else if (inCycle && cycleWeek >= cycleLength) {
    eyebrow = "Cycle complete";
    heading = "You've completed your 12-week cycle";
    body = "Retake your assessments to measure your growth and start a new cycle.";
    ctaLabel = "Retake assessments";
    ctaTo = nextAssessmentTo;
    ctaDisabled = false;
  } else if (hasAnyReport && section1Complete) {
    // In cycle but not inCycle? Actually if section1Complete then inCycle is true.
    // Keep as fallback for locked state.
  } else if (hasAnyReport && !section1Complete) {
    eyebrow = "Cycle · Section 1";
    heading = "Begin your Leadership Optimization Cycle";
    body = "Confirm your assessments, lock in your Priority Gap, and answer five reflection questions.";
    ctaLabel = "Start Section 1";
    ctaTo = "/guide/section-1";
    ctaDisabled = false;
  }

  return (
    <div
      className="mb-6 overflow-hidden rounded-3xl border border-[var(--fr-hairline)] bg-white p-6 shadow-[var(--shadow-card)] sm:p-8"
    >
      <div className="grid gap-6 md:grid-cols-[1fr_auto] md:items-center">
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
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-[var(--fr-lilac)]">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${cycleProgressPct}%`, background: `linear-gradient(90deg, ${PURPLE} 0%, ${PURPLE_SOFT} 100%)` }}
                />
              </div>
            </div>
          )}

          <div className="mt-6">
            {ctaDisabled ? (
              <Button size="lg" disabled>
                {ctaLabel} <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button asChild size="lg">
                <Link to={ctaTo}>{ctaLabel} <ArrowRight className="ml-2 h-4 w-4" /></Link>
              </Button>
            )}
          </div>
        </div>

        <div className="shrink-0 self-center">
          <Ring value={inCycle ? cycleWeek : 0} max={cycleLength} size={132} stroke={10}>
            <div className="text-3xl font-bold text-[var(--fr-ink)] leading-none">
              {inCycle ? cycleWeek : 0}<span className="text-lg font-medium text-[var(--fr-muted-ink)]"> / {cycleLength}</span>
            </div>
            <div className="mt-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--fr-muted-ink)]">
              WEEKS
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

function LockedFeatureCard({
  icon,
  title,
  body,
  onUpgrade,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  onUpgrade: () => void;
}) {
  return (
    <div className="relative flex flex-col rounded-2xl border border-[var(--fr-hairline)] bg-white p-5 shadow-[var(--shadow-card)]">
      <div className="mb-3 flex items-start justify-between">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--fr-lilac)] text-[var(--rl-purple)]">
          {icon}
        </span>
        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-600">
          <Lock className="h-3 w-3" /> Locked
        </span>
      </div>
      <h4 className="text-base font-semibold text-[var(--fr-ink)]">{title}</h4>
      <p className="mt-1 text-sm text-[var(--fr-muted-ink)]">{body}</p>
      <div className="mt-4">
        <Button size="sm" variant="outline" onClick={onUpgrade} className="w-full">
          <Sparkles className="mr-2 h-3.5 w-3.5" /> Upgrade to unlock
        </Button>
      </div>
    </div>
  );
}

function FreeMemberPreview({
  displayName,
  reportSessionId,
  topGapName,
  onOpenPlans,
}: {
  displayName: string;
  reportSessionId: string;
  topGapName: string;
  onOpenPlans: () => void;
}) {
  const BRAND = "#5B2D8E";
  const BRAND_DEEP = "#2a0a64";
  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-8 sm:py-10">
      {/* Eyebrow + headline */}
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: BRAND }}>
          Your Gap Report is ready
        </p>
        <h2 className="mt-2 text-3xl font-bold tracking-tight text-[var(--fr-ink)] sm:text-4xl">
          {displayName ? `${displayName}, ` : ""}you've seen your gaps. Here's how you close them.
        </h2>
      </div>

      {/* Top priority gap card */}
      <div className="mb-8 overflow-hidden rounded-3xl border border-[var(--fr-hairline)] bg-white p-6 shadow-[var(--shadow-card)] sm:p-8">
        <div className="flex items-start gap-4">
          <div
            className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl text-white"
            style={{ background: `linear-gradient(135deg, ${BRAND_DEEP} 0%, ${BRAND} 100%)` }}
          >
            <Target className="h-6 w-6" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: BRAND }}>
              Your top gap right now
            </p>
            <h3 className="mt-1 text-2xl font-bold tracking-tight text-[var(--fr-ink)] sm:text-3xl">
              {topGapName}
            </h3>
            <p className="mt-2 text-sm text-[var(--fr-muted-ink)] sm:text-base">
              This is the first domino. Most of your other gaps get easier once you close this one.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button asChild variant="outline" size="sm">
                <Link to="/report/$sessionId" params={{ sessionId: reportSessionId }}>
                  <FileText className="mr-2 h-4 w-4" /> View full report
                </Link>
              </Button>
              <Button asChild variant="ghost" size="sm">
                <Link to="/report/$sessionId" params={{ sessionId: reportSessionId }} hash="download">
                  <Download className="mr-2 h-4 w-4" /> Download PDF
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Your coaching space (preview) */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <h3 className="text-xl font-bold tracking-tight text-[var(--fr-ink)] sm:text-2xl">
          Your coaching space
        </h3>
        <span
          className="inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-white"
          style={{ background: BRAND }}
        >
          Preview
        </span>
        <span className="text-xs text-[var(--fr-muted-ink)]">unlocks when you upgrade</span>
      </div>

      <div className="relative mb-8">
        {/* Dimmed non-interactive preview — all three sections in one card */}
        <div
          aria-hidden="true"
          className="pointer-events-none select-none overflow-hidden rounded-3xl border border-[var(--fr-hairline)] bg-white shadow-[var(--shadow-card)]"
          style={{ opacity: 0.55, filter: "saturate(0.9)" }}
        >
          {/* Success Image sample */}
          <div className="p-6 sm:p-8">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: BRAND }}>
              <Sparkles className="h-4 w-4" /> Your Success Image · daily
            </div>
            <p className="mt-3 text-2xl font-semibold leading-snug tracking-tight text-[var(--fr-ink)] sm:text-3xl">
              {"\u201CI coach instead of rescue. My people make the call.\u201D"}
            </p>
            <p className="mt-2 text-xs font-medium text-[var(--fr-muted-ink)] sm:text-sm">
              Wake up to a piece of the leader you're becoming, a different part each morning.
            </p>
          </div>

          <div className="h-px bg-[var(--fr-hairline)]" />

          {/* Your actions sample */}
          <div className="p-6 sm:p-8">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: BRAND }}>
                  Your actions
                </div>
                <div className="mt-1 text-base font-semibold text-[var(--fr-ink)]">
                  1 of 3 habits today · 2 this week
                </div>
                <p className="mt-1 text-xs text-[var(--fr-muted-ink)]">
                  Daily habits and weekly steps that turn your gap report into real change.
                </p>
              </div>
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[var(--fr-lilac)] text-[var(--rl-purple)]">
                <CheckSquare className="h-5 w-5" />
              </span>
            </div>
          </div>

          <div className="h-px bg-[var(--fr-hairline)]" />

          {/* AI Coach sample */}
          <div className="p-6 sm:p-8">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: BRAND }}>
                  Fully Resourced AI Coach
                </div>
                <div className="mt-1 text-base font-semibold text-[var(--fr-ink)]">
                  Ask anything. Anytime.
                </div>
                <p className="mt-1 text-xs text-[var(--fr-muted-ink)]">
                  A coach trained on Rich's decades of experience, on call whenever you're stuck.
                </p>
              </div>
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[var(--fr-lilac)] text-[var(--rl-purple)]">
                <MessageCircle className="h-5 w-5" />
              </span>
            </div>
          </div>
        </div>

        {/* Click-catcher + centered lock badge */}
        <button
          type="button"
          onClick={onOpenPlans}
          className="absolute inset-0 flex items-center justify-center rounded-3xl"
          aria-label="Unlock your coaching space"
        >
          <span
            className="inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold text-white shadow-[0_16px_40px_rgba(42,10,100,0.45)]"
            style={{ background: BRAND }}
          >
            <Lock className="h-4 w-4" /> Unlock your coaching space
          </span>
        </button>
      </div>

      {/* Purple CTA card */}
      <div
        className="overflow-hidden rounded-3xl p-6 text-white shadow-[0_16px_40px_rgba(42,10,100,0.35)] sm:p-8"
        style={{ background: `linear-gradient(135deg, ${BRAND_DEEP} 0%, ${BRAND} 100%)` }}
      >
        <h3 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Stop staring at the report. Start closing the gaps.
        </h3>
        <p className="mt-2 max-w-2xl text-sm text-white/85 sm:text-base">
          Upgrade and the app walks you through it, day by day, with the Fully Resourced System in your pocket.
        </p>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <Button
            size="lg"
            onClick={onOpenPlans}
            className="bg-white hover:bg-white/90"
            style={{ color: BRAND_DEEP }}
          >
            <Sparkles className="mr-2 h-4 w-4" /> See plans
          </Button>
          <span className="text-sm font-medium text-white/85">from $82/mo</span>
        </div>
      </div>

      <p className="mt-6 text-center text-xs text-[var(--fr-muted-ink)]">
        Your free gap report is yours to keep. Upgrading is how you act on it.
      </p>
    </div>
  );
}

