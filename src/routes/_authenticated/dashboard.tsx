import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { ASSESSMENT_LIST, ASSESSMENTS, maxScoreFor, type AssessmentType } from "@/lib/assessments";
import { Button } from "@/components/ui/button";
import { ArrowRight, FileText, Lock, Sparkles } from "lucide-react";
import { format } from "date-fns";
import { logFunnelEvent } from "@/lib/funnel.functions";
import { createBillingPortalSession, getSubscriptionStatus } from "@/lib/payments.functions";
import { getGapReportEligibility } from "@/lib/report.functions";
import { getStripeEnvironment, isStripeConfigured } from "@/lib/stripe";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Your dashboard — SCALE" }] }),
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

function DashboardPage() {
  const { user } = useAuth();
  const { checkout } = Route.useSearch();
  const navigate = Route.useNavigate();
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
  const [eligibility, setEligibility] = useState<{
    reportsGenerated: number;
    readyCount: number;
    total: number;
    allowed: boolean;
    isFirstRound: boolean;
    perTypeReady: Record<AssessmentType, boolean>;
  } | null>(null);
  const logEvent = useServerFn(logFunnelEvent);
  const openPortal = useServerFn(createBillingPortalSession);
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
      .select("free_pass_used")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        const p = data as { free_pass_used?: boolean } | null;
        setFreePassUsed(Boolean(p?.free_pass_used));
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
  }, [user, checkSub, checkEligibility]);

  const paywalled = freePassUsed && !subscribed;

  function handleSubscribeClick() {
    void logEvent({ data: { event_type: "clicked_subscribe" } }).catch(() => {});
  }

  async function handleManageBilling() {
    if (!isStripeConfigured()) {
      toast.error("Payments are not configured yet.");
      return;
    }
    try {
      const result = await openPortal({
        data: {
          returnUrl: `${window.location.origin}/dashboard`,
          environment: getStripeEnvironment(),
        },
      });
      if ("error" in result) throw new Error(result.error);
      window.open(result.url, "_blank", "noopener,noreferrer");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not open billing portal.");
    }
  }

  function lastFor(type: AssessmentType) {
    return sessions.find((s) => s.assessment_type === type);
  }

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
  const latestSession = sessions[0];
  const readyCount = eligibility?.readyCount ?? 0;
  const canGenerate = Boolean(eligibility?.allowed);
  const isFirstRound = eligibility?.isFirstRound ?? true;
  // Show the report banner if we're still waiting on this round's retakes,
  // OR (first round) still missing assessments. Hide once the current round's
  // report has been generated and no retakes have started yet.
  const showGapBanner =
    eligibility !== null &&
    (canGenerate || readyCount > 0 || (isFirstRound && completedTypes.size < 3));

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="mb-8">
        <p className="text-xs font-medium uppercase tracking-widest text-[var(--accent-blue)]">
          Your assessments
        </p>
        <h1 className="mt-2 font-display text-3xl font-semibold text-foreground sm:text-4xl">
          Build the leader your business needs.
        </h1>
        <p className="mt-2 text-muted-foreground">
          Take any assessment to generate your personalized SCALE Gap Report.
        </p>
      </div>

      <div className="grid gap-5 md:grid-cols-3">
        {ASSESSMENT_LIST.map((a) => {
          const last = lastFor(a.type);
          return (
            <div key={a.type} className="flex flex-col rounded-xl border border-border bg-card p-6 shadow-sm transition hover:shadow-md">
              <h2 className="font-display text-lg font-semibold text-foreground">
                {a.shortTitle}
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">{a.tagline}</p>
              <div className="mt-6 flex-1">
                {last ? (
                  <div className="rounded-lg bg-muted/40 px-4 py-3 text-sm">
                    <div className="text-muted-foreground">Last score</div>
                    <div className="mt-1 font-display text-2xl font-semibold text-foreground">
                      {last.overall_score}
                      <span className="text-sm text-muted-foreground">/{maxScoreFor(a.type)}</span>
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      Taken {format(new Date(last.created_at), "MMM d, yyyy")}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Not yet taken.</p>
                )}
              </div>
              <Button asChild className="mt-6 w-full">
                <Link to="/assessment/$type" params={{ type: a.type }}>
                  {last ? "Retake assessment" : "Take assessment"}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          );
        })}
      </div>

      {paywalled && (
        <div className="mt-8 flex flex-col items-start justify-between gap-4 rounded-2xl border border-amber-300 bg-amber-50 p-6 sm:flex-row sm:items-center">
          <div className="flex items-start gap-3">
            <Lock className="mt-0.5 h-5 w-5 text-amber-700" />
            <div>
              <p className="text-xs font-medium uppercase tracking-widest text-amber-800">
                Free pass used
              </p>
              <h2 className="mt-1 font-display text-xl font-semibold text-foreground">
                You've used your 1-free gap report
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Get the full system for $97/month: your 90-day guided leadership plan, Coach Rich AI, a live dashboard that tracks your growth, the digital "Fully Resourced" book, and unlimited assessments and gap reports.
              </p>
            </div>
          </div>
          <Button
            size="lg"
            className="bg-[#433993] text-white hover:bg-[#433993]/90"
            onClick={handleSubscribeClick}
            asChild
          >
            <Link to="/fully-resourced">
              Get Fully Resourced <span className="ml-2 text-sm opacity-80">$97/mo</span>
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      )}

      {subscribed && (
        <div className="mt-8 flex flex-col items-start justify-between gap-4 rounded-2xl border border-border bg-muted/40 p-6 sm:flex-row sm:items-center">
          <div>
            <p className="text-xs font-medium uppercase tracking-widest text-[#433993]">
              Fully Resourced Member
            </p>
            <h2 className="mt-1 font-display text-lg font-semibold text-foreground">
              Manage your subscription
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Update your card, download invoices, or cancel anytime.
            </p>
          </div>
          <Button variant="outline" onClick={handleManageBilling}>
            Manage billing
          </Button>
        </div>
      )}

      {showGapBanner && (
        <div className="mt-8 flex flex-col items-start justify-between gap-4 rounded-2xl border border-border bg-muted/40 p-6 sm:flex-row sm:items-center">
          <div>
            <p className="text-xs font-medium uppercase tracking-widest text-[#433993]">
              SCALE Gap Report
            </p>
            <h2 className="mt-1 font-display text-xl font-semibold text-foreground">
              {canGenerate
                ? isFirstRound
                  ? "You're ready to generate your full SCALE Gap Report"
                  : "You're ready to generate your next SCALE Gap Report"
                : isFirstRound
                  ? `Complete all 3 assessments to unlock your Gap Report (${completedTypes.size}/3 done)`
                  : `Retake all 3 assessments to unlock your next Gap Report (${readyCount} of 3 retaken)`}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {canGenerate
                ? "Combine your results into one unified report with cross-connection analysis."
                : isFirstRound
                  ? "Your personalized report ties together Inner Capacity, Personal Leadership, and Business Audit."
                  : "Each new report requires a fresh set of all three assessments so it reflects where you are now."}
            </p>
          </div>
          {canGenerate && latestSession ? (
            <Button
              asChild
              size="lg"
              className="bg-[#433993] text-white hover:bg-[#433993]/90"
            >
              <Link to="/report/$sessionId" params={{ sessionId: latestSession.id }}>
                <Sparkles className="mr-2 h-4 w-4" />
                Generate Gap Report
              </Link>
            </Button>
          ) : (
            <Button
              asChild
              size="lg"
              className="bg-[#433993] text-white hover:bg-[#433993]/90"
            >
              <Link to="/assessment/$type" params={{ type: nextTarget.type }}>
                <ArrowRight className="mr-2 h-4 w-4" />
                {nextLabel}
              </Link>
            </Button>
          )}
        </div>
      )}

      <section className="mt-14">
        <h2 className="font-display text-xl font-semibold text-foreground">My history</h2>
        <div className="mt-4 overflow-x-auto rounded-xl border border-border bg-card">
          {loading ? (
            <div className="px-6 py-10 text-center text-sm text-muted-foreground">Loading…</div>
          ) : sessions.length === 0 ? (
            <div className="px-6 py-10 text-center text-sm text-muted-foreground">
              No assessments taken yet. Start with one above.
            </div>
          ) : (
            <table className="w-full min-w-[640px] text-sm">
              <thead className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Assessment</th>
                  <th className="px-4 py-3 font-medium">Date taken</th>
                  <th className="px-4 py-3 font-medium">Overall score</th>
                  <th className="px-4 py-3 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((s) => (
                  <tr key={s.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3 font-medium text-foreground">
                      {ASSESSMENTS[s.assessment_type].shortTitle}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {format(new Date(s.created_at), "MMM d, yyyy")}
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-display font-semibold">{s.overall_score}</span>
                      <span className="text-muted-foreground">/{maxScoreFor(s.assessment_type)}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button variant="ghost" size="sm" asChild>
                        <Link to="/report/$sessionId" params={{ sessionId: s.id }}>
                          <FileText className="mr-2 h-4 w-4" />
                          View report
                        </Link>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </main>
  );
}