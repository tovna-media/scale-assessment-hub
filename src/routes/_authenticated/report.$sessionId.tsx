import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import {
  ASSESSMENTS,
  maxScoreFor,
  scoreInnerCapacity,
  scoreLeadership,
  scoreBusiness,
  combinedScaleLevel,
  COMBINED_MAX,
  type AssessmentType,
} from "@/lib/assessments";
import { generateGapReport } from "@/lib/report.functions";
import { generatePdfReport } from "@/lib/pdf-report.functions";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, ArrowRight, Download, Loader2, Calendar, Sparkles } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/report/$sessionId")({
  head: () => ({ meta: [{ title: "Your assessment results" }] }),
  component: ReportPage,
});

interface SessionFull {
  id: string;
  assessment_type: AssessmentType;
  overall_score: number;
  overall_level: string | null;
  subcategory_scores: Record<string, number>;
  responses: Record<string, number>;
  gap_report: string | null;
  created_at: string;
}

interface LatestResponses {
  inner_capacity?: Record<number, number>;
  personal_leadership?: Record<number, number>;
  business_audit?: Record<number, number>;
}

const ALL_TYPES: AssessmentType[] = [
  "inner_capacity",
  "personal_leadership",
  "business_audit",
];

function ReportPage() {
  const { sessionId } = Route.useParams();
  const { user } = useAuth();
  const generate = useServerFn(generateGapReport);
  const generatePdf = useServerFn(generatePdfReport);
  const [session, setSession] = useState<SessionFull | null>(null);
  const [takenTypes, setTakenTypes] = useState<Set<AssessmentType>>(new Set());
  const [latestResponses, setLatestResponses] = useState<LatestResponses>({});
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState("Generating your report...");

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        // Retry briefly — the session may have just been inserted.
        let sess: SessionFull | null = null;
        for (let i = 0; i < 8 && !sess; i++) {
          const { data } = await supabase
            .from("assessment_sessions")
            .select(
              "id, assessment_type, overall_score, overall_level, subcategory_scores, responses, gap_report, created_at",
            )
            .eq("id", sessionId)
            .maybeSingle();
          if (data) sess = data as unknown as SessionFull;
          else await new Promise((r) => setTimeout(r, 300));
        }
        const { data: all } = await supabase
          .from("assessment_sessions")
          .select("assessment_type, responses, created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });
        if (cancelled) return;
        setSession(sess);
        setTakenTypes(new Set((all ?? []).map((r) => r.assessment_type as AssessmentType)));
        const latest: LatestResponses = {};
        for (const row of all ?? []) {
          const t = row.assessment_type as AssessmentType;
          if (!latest[t]) {
            const r: Record<number, number> = {};
            for (const [k, v] of Object.entries(
              (row.responses as Record<string, number> | null) ?? {},
            )) {
              r[Number(k)] = Number(v);
            }
            latest[t] = r;
          }
        }
        setLatestResponses(latest);
      } catch (e) {
        if (!cancelled) {
          toast.error(e instanceof Error ? e.message : "Could not load session.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sessionId, user]);

  // Animated progress while generating gap report
  useEffect(() => {
    if (!generating) return;
    const startedAt = Date.now();
    const messages = [
      { at: 0, text: "Generating your report..." },
      { at: 3000, text: "Analyzing your answers..." },
      { at: 7000, text: "Building your personalized results..." },
      { at: 13000, text: "Almost done..." },
    ];
    const interval = setInterval(() => {
      const elapsed = Date.now() - startedAt;
      let next: number;
      if (elapsed < 6000) next = (elapsed / 6000) * 85;
      else next = 85 + (1 - Math.exp(-(elapsed - 6000) / 8000)) * 10;
      setProgress((prev) => (next > prev && prev < 95 ? next : prev));
      const current = [...messages].reverse().find((m) => elapsed >= m.at);
      if (current) setStatusMessage((p) => (p === "Report ready!" ? p : current.text));
    }, 200);
    return () => clearInterval(interval);
  }, [generating]);

  async function handleGenerateGapReport() {
    setGenerating(true);
    setProgress(0);
    setStatusMessage("Generating your report...");
    try {
      const result = await generate({ data: { sessionId } });
      setProgress(100);
      setStatusMessage("Report ready!");
      setSession(result.session as SessionFull);
      if (result.delivery && "error" in result.delivery) {
        toast.error(`Report generated, but GHL delivery failed: ${result.delivery.error}`);
      }
      setTimeout(() => setGenerating(false), 400);
    } catch (e) {
      setGenerating(false);
      toast.error(e instanceof Error ? e.message : "Could not generate report.");
    }
  }

  async function handleDownloadPdf() {
    // Open a tab synchronously inside the click handler so mobile Safari /
    // Chrome don't block it as a popup once the await resolves. We then
    // redirect that tab to the PDF URL when ready (or fall back to same-tab
    // navigation if the browser still blocked it).
    const pdfWindow = typeof window !== "undefined" ? window.open("", "_blank") : null;
    if (pdfWindow) {
      try {
        pdfWindow.document.write(
          "<title>Preparing your report…</title><p style='font-family:sans-serif;padding:24px'>Preparing your report…</p>",
        );
      } catch {
        // some mobile browsers disallow document.write on the new window — ignore
      }
    }
    setDownloadingPdf(true);
    try {
      const { data: sess } = await supabase.auth.getSession();
      const accessToken = sess.session?.access_token;
      if (!accessToken) throw new Error("Your session expired. Please sign in again.");
      const result = await generatePdf({ data: { sessionId, accessToken } });
      if (pdfWindow && !pdfWindow.closed) {
        pdfWindow.location.href = result.pdfUrl;
      } else {
        // Popup was blocked — navigate the current tab instead so mobile users
        // still get the PDF.
        window.location.href = result.pdfUrl;
      }
    } catch (e) {
      if (pdfWindow && !pdfWindow.closed) pdfWindow.close();
      toast.error(e instanceof Error ? e.message : "Could not generate PDF.");
    } finally {
      setDownloadingPdf(false);
    }
  }

  if (loading) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-24 text-center">
        <Loader2 className="mx-auto h-8 w-8 animate-spin text-[var(--accent-blue)]" />
        <p className="mt-4 text-sm text-muted-foreground">Loading your results…</p>
      </main>
    );
  }
  if (!session) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-20 text-center">
        <p className="text-muted-foreground">Session not found.</p>
        <Button asChild className="mt-4">
          <Link to="/dashboard">Back to dashboard</Link>
        </Button>
      </main>
    );
  }

  if (generating) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-24 text-center">
        <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-primary/5">
          <Loader2 className="h-8 w-8 animate-spin text-[var(--accent-blue)]" />
        </div>
        <h1 className="mt-6 font-display text-2xl font-semibold text-foreground">
          {statusMessage}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">This takes about 15 seconds.</p>
        <div className="mx-auto mt-6 h-2 w-full max-w-sm overflow-hidden rounded-full bg-primary/10">
          <div
            className="h-full rounded-full bg-[var(--accent-blue)] transition-[width] duration-500 ease-out"
            style={{ width: `${Math.min(100, Math.round(progress))}%` }}
          />
        </div>
        <p className="mt-2 text-xs tabular-nums text-muted-foreground">
          {Math.min(100, Math.round(progress))}%
        </p>
      </main>
    );
  }

  // Gap report is ready → show it
  if (session.gap_report) {
    return (
      <ReportView
        session={session}
        latestResponses={latestResponses}
        onDownloadPdf={handleDownloadPdf}
        downloadingPdf={downloadingPdf}
      />
    );
  }

  // Otherwise → single-assessment results screen
  return (
    <AssessmentResultView
      session={session}
      takenTypes={takenTypes}
      onGenerateGapReport={handleGenerateGapReport}
    />
  );
}

/* ───────────────── Per-assessment results screen ───────────────── */

function AssessmentResultView({
  session,
  takenTypes,
  onGenerateGapReport,
}: {
  session: SessionFull;
  takenTypes: Set<AssessmentType>;
  onGenerateGapReport: () => void;
}) {
  const def = ASSESSMENTS[session.assessment_type];
  const max = maxScoreFor(session.assessment_type);
  const allComplete = ALL_TYPES.every((t) => takenTypes.has(t));
  const missing = ALL_TYPES.filter((t) => !takenTypes.has(t));

  // Re-derive structured result from stored raw responses
  const numericResponses = useMemo(() => {
    const r: Record<number, number> = {};
    for (const [k, v] of Object.entries(session.responses ?? {})) {
      r[Number(k)] = Number(v);
    }
    return r;
  }, [session.responses]);

  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <div className="mb-6">
        <Button variant="ghost" asChild className="self-start">
          <Link to="/dashboard">
            <ArrowLeft className="mr-2 h-4 w-4" /> Dashboard
          </Link>
        </Button>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-10">
        <p className="text-xs font-medium uppercase tracking-widest text-[var(--accent-blue)]">
          {def.shortTitle} · Your results
        </p>
        <h1 className="mt-2 font-display text-3xl font-semibold text-foreground sm:text-4xl">
          {def.title} complete
        </h1>

        <div className="mt-8 flex flex-col items-start gap-2">
          <div className="font-display text-5xl font-semibold text-foreground">
            {session.overall_score}
            <span className="ml-1 text-2xl text-muted-foreground">/ {max}</span>
          </div>
          {session.overall_level && (
            <div className="text-base font-medium text-[var(--accent-blue)]">
              {session.overall_level}
            </div>
          )}
        </div>

        <div className="mt-8">
          {session.assessment_type === "inner_capacity" && (
            <InnerCapacityBreakdown responses={numericResponses} />
          )}
          {session.assessment_type === "personal_leadership" && (
            <LeadershipBreakdown responses={numericResponses} />
          )}
          {session.assessment_type === "business_audit" && (
            <BusinessBreakdown responses={numericResponses} />
          )}
        </div>
      </div>

      {/* Next-step nudge */}
      <div className="mt-8 rounded-2xl border border-[var(--accent-blue)]/30 bg-primary/5 p-6 sm:p-8">
        {allComplete ? (
          <>
            <p className="text-xs font-medium uppercase tracking-widest text-[var(--accent-blue)]">
              You're ready
            </p>
            <h2 className="mt-1 font-display text-2xl font-semibold text-foreground">
              All three assessments complete — generate your Gap Report
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Combine Inner Capacity, Personal Leadership, and Business Audit into a single,
              personalized SCALE Gap Report with cross-connection analysis.
            </p>
            <Button size="lg" className="mt-5" onClick={onGenerateGapReport}>
              <Sparkles className="mr-2 h-4 w-4" /> Generate Gap Report
            </Button>
          </>
        ) : (
          <>
            <p className="text-xs font-medium uppercase tracking-widest text-[var(--accent-blue)]">
              Your next step
            </p>
            <h2 className="mt-1 font-display text-xl font-semibold text-foreground">
              {missing.length === 1
                ? `Take the ${ASSESSMENTS[missing[0]].shortTitle} assessment next`
                : `Take the ${ASSESSMENTS[missing[0]].shortTitle} and ${ASSESSMENTS[missing[1]].shortTitle} assessments next`}
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {missing.length === 1
                ? "One assessment left. Complete it to unlock your full SCALE Gap Report."
                : "Complete both to unlock your full SCALE Gap Report — they're designed to work together."}
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              {missing.map((t) => (
                <Button key={t} asChild>
                  <Link to="/assessment/$type" params={{ type: t }}>
                    Take {ASSESSMENTS[t].shortTitle}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              ))}
            </div>
          </>
        )}
      </div>
    </main>
  );
}

function InnerCapacityBreakdown({ responses }: { responses: Record<number, number> }) {
  const r = scoreInnerCapacity(responses);
  return (
    <div>
      <h3 className="font-display text-lg font-semibold text-foreground">Category breakdown</h3>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {r.categories.map((c) => (
          <CategoryRow key={c.name} name={c.name} score={c.score} max={c.max} level={c.level} />
        ))}
      </div>
      <p className="mt-4 text-sm text-muted-foreground">
        Lowest area: <span className="font-medium text-foreground">{r.primary.name}</span>
        {r.secondary ? (
          <>
            {" "}
            · Also watch: <span className="font-medium text-foreground">{r.secondary.name}</span>
          </>
        ) : null}
      </p>
    </div>
  );
}

function LeadershipBreakdown({ responses }: { responses: Record<number, number> }) {
  const r = scoreLeadership(responses);
  return (
    <div className="space-y-5">
      <div>
        <h3 className="font-display text-lg font-semibold text-foreground">Areas to develop</h3>
        {r.themeGroups.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">
            No flagged areas — strong performance across the board.
          </p>
        ) : (
          <ul className="mt-3 space-y-1.5 text-sm">
            {r.themeGroups.map((g) => (
              <li key={g.theme}>
                <span className="font-medium text-foreground">{g.theme}</span>
                <span className="text-muted-foreground"> — {g.descriptors.length} signal{g.descriptors.length === 1 ? "" : "s"}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
      {r.strengthCategories.length > 0 && (
        <div>
          <h3 className="font-display text-lg font-semibold text-foreground">Your strengths</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            {r.strengthCategories.join(" · ")}
          </p>
        </div>
      )}
    </div>
  );
}

function BusinessBreakdown({ responses }: { responses: Record<number, number> }) {
  const r = scoreBusiness(responses);
  const Group = ({ title, items, tone }: { title: string; items: typeof r.critical; tone: string }) =>
    items.length === 0 ? null : (
      <div>
        <div className={"text-xs font-semibold uppercase tracking-wider " + tone}>{title}</div>
        <ul className="mt-1.5 text-sm text-foreground">
          {items.map((c) => (
            <li key={c.name}>• {c.name}</li>
          ))}
        </ul>
      </div>
    );
  return (
    <div className="grid gap-5 sm:grid-cols-2">
      <Group title="Critical gaps" items={r.critical} tone="text-destructive" />
      <Group title="Moderate gaps" items={r.moderate} tone="text-[var(--warning)]" />
      <Group title="Developing" items={r.developing} tone="text-muted-foreground" />
      <Group title="Strengths" items={r.strengths} tone="text-[var(--success)]" />
    </div>
  );
}

function CategoryRow({
  name,
  score,
  max,
  level,
}: {
  name: string;
  score: number;
  max: number;
  level: string;
}) {
  const tone =
    level === "Strength"
      ? "bg-[var(--success)]/10 text-[var(--success)]"
      : level === "Moderate Gap"
        ? "bg-[var(--warning)]/15 text-[var(--warning)]"
        : "bg-destructive/10 text-destructive";
  return (
    <div className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
      <div>
        <div className="text-sm font-medium text-foreground">{name}</div>
        <div className={"mt-1 inline-flex rounded-full px-2 py-0.5 text-xs font-medium " + tone}>
          {level}
        </div>
      </div>
      <div className="font-display text-base font-semibold">
        {score}
        <span className="ml-0.5 text-xs text-muted-foreground">/ {max}</span>
      </div>
    </div>
  );
}

/* ───────────────── Gap report view (only when all 3 done) ───────────────── */

function ScoreRing({ score }: { score: number }) {
  return (
    <div className="relative flex h-36 w-36 items-center justify-center rounded-full border-4 border-[var(--accent-blue)]/30 bg-primary/5">
      <div className="font-display text-4xl font-semibold text-foreground">{score}</div>
    </div>
  );
}

function BreakdownTile({ label, score }: { label: string; score: number }) {
  return (
    <div className="rounded-lg border border-border bg-card px-4 py-3">
      <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 font-display text-2xl font-semibold text-foreground">{score}</div>
    </div>
  );
}

function ReportView({
  session,
  latestResponses,
  onDownloadPdf,
  downloadingPdf,
}: {
  session: SessionFull;
  latestResponses: LatestResponses;
  onDownloadPdf: () => void;
  downloadingPdf: boolean;
}) {
  const ic = useMemo(
    () => scoreInnerCapacity(latestResponses.inner_capacity ?? {}),
    [latestResponses.inner_capacity],
  );
  const lead = useMemo(
    () => scoreLeadership(latestResponses.personal_leadership ?? {}),
    [latestResponses.personal_leadership],
  );
  const biz = useMemo(
    () => scoreBusiness(latestResponses.business_audit ?? {}),
    [latestResponses.business_audit],
  );
  const combinedTotal = ic.total + lead.total + biz.total;
  const combinedLevel = combinedScaleLevel(combinedTotal);
  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6 print-bg-white">
      <div className="mb-6 flex flex-col gap-3 no-print sm:flex-row sm:items-center sm:justify-between">
        <Button variant="ghost" asChild className="self-start">
          <Link to="/dashboard">
            <ArrowLeft className="mr-2 h-4 w-4" /> Dashboard
          </Link>
        </Button>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button variant="outline" onClick={onDownloadPdf} disabled={downloadingPdf}>
            {downloadingPdf ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Preparing…
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" /> Download PDF
              </>
            )}
          </Button>
          <Button asChild>
            <a
              href="https://richlohman.com/strategy-call-with-rich"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Calendar className="mr-2 h-4 w-4" /> Book a Strategy Call
            </a>
          </Button>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-10 print-break-inside-avoid">
        <p className="text-xs font-medium uppercase tracking-widest text-[var(--accent-blue)]">
          SCALE Gap Report
        </p>
        <h1 className="mt-2 font-display text-3xl font-semibold text-foreground sm:text-4xl">
          Your SCALE Gap Report
        </h1>
        <div className="mt-8 flex flex-col items-center gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Combined SCALE Score</p>
            <p className="mt-1 font-display text-lg font-semibold text-foreground">
              {combinedLevel}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">out of {COMBINED_MAX}</p>
          </div>
          <ScoreRing score={combinedTotal} />
        </div>

        <div className="mt-8 grid gap-3 sm:grid-cols-3">
          <BreakdownTile label="Inner Capacity" score={ic.total} />
          <BreakdownTile label="Personal Leadership" score={lead.total} />
          <BreakdownTile label="Business Audit" score={biz.total} />
        </div>
      </div>

      <article className="prose mt-10 max-w-none rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-10 print-break-inside-avoid">
        <Markdown text={session.gap_report ?? ""} />
      </article>

      <div className="mt-10 grid gap-4 sm:grid-cols-3 no-print">
        <PathCard
          title="DIY Path"
          desc="Self-directed implementation using the SCALE framework."
        />
        <PathCard
          title="Leaders Edge"
          desc="Group coaching program with peer leaders on the same journey."
          href="https://richlohman.com/the-leaders-edge"
        />
        <PathCard
          title="1:1 Coaching with Rich"
          desc="Personalized executive coaching with Rich Lohman."
          href="https://richlohman.com/strategy-call-with-rich"
          recommended
        />
      </div>

      <div className="mt-8 flex flex-wrap gap-3 no-print">
        <Button asChild size="lg">
          <a
            href="https://richlohman.com/strategy-call-with-rich"
            target="_blank"
            rel="noopener noreferrer"
          >
            Book a Strategy Call with Rich
          </a>
        </Button>
        <Button variant="outline" size="lg" onClick={onDownloadPdf} disabled={downloadingPdf}>
          {downloadingPdf ? "Preparing…" : "Download My Report (PDF)"}
        </Button>
      </div>
    </main>
  );
}

function PathCard({
  title,
  desc,
  recommended,
  href,
}: {
  title: string;
  desc: string;
  recommended?: boolean;
  href?: string;
}) {
  const classes =
    "rounded-xl border p-5 " +
    (recommended
      ? "border-[var(--accent-blue)] bg-primary text-primary-foreground shadow-md"
      : "border-border bg-card") +
    (href ? " hover:shadow-md transition-shadow" : "");
  const content = (
    <>
      {recommended && (
        <div className="mb-2 inline-flex rounded-full bg-primary-foreground/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider">
          Recommended
        </div>
      )}
      <h3
        className={"font-display text-lg font-semibold " + (recommended ? "" : "text-foreground")}
      >
        {title}
      </h3>
      <p
        className={
          "mt-1 text-sm " + (recommended ? "text-primary-foreground/80" : "text-muted-foreground")
        }
      >
        {desc}
      </p>
    </>
  );
  if (href) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={classes + " block"}
      >
        {content}
      </a>
    );
  }
  return <div className={classes}>{content}</div>;
}

function Markdown({ text }: { text: string }) {
  const lines = text.split("\n");
  const nodes: React.ReactNode[] = [];
  let listBuf: string[] = [];
  const flushList = () => {
    if (listBuf.length) {
      nodes.push(
        <ul key={nodes.length} className="my-3 ml-5 list-disc space-y-1 text-foreground">
          {listBuf.map((l, i) => (
            <li key={i} dangerouslySetInnerHTML={{ __html: inline(l) }} />
          ))}
        </ul>,
      );
      listBuf = [];
    }
  };
  function inline(s: string) {
    return s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/_(.+?)_/g, "<em>$1</em>")
      .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="underline hover:opacity-80">$1</a>');
  }
  for (const raw of lines) {
    const line = raw.trimEnd();
    if (/^# /.test(line)) {
      flushList();
      nodes.push(
        <h2 key={nodes.length} className="mt-8 font-display text-2xl font-semibold text-foreground">
          {line.replace(/^# /, "")}
        </h2>,
      );
    } else if (/^## /.test(line)) {
      flushList();
      nodes.push(
        <h3 key={nodes.length} className="mt-6 font-display text-lg font-semibold text-foreground">
          {line.replace(/^## /, "")}
        </h3>,
      );
    } else if (/^[-*] /.test(line)) {
      listBuf.push(line.replace(/^[-*] /, ""));
    } else if (line === "") {
      flushList();
    } else {
      flushList();
      nodes.push(
        <p
          key={nodes.length}
          className="my-3 leading-relaxed text-foreground"
          dangerouslySetInnerHTML={{ __html: inline(line) }}
        />,
      );
    }
  }
  flushList();
  return <>{nodes}</>;
}
