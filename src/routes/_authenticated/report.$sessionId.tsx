import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { ASSESSMENTS, gapLabel, type AssessmentType } from "@/lib/assessments";
import { generateGapReport } from "@/lib/report.functions";
import { generatePdfReport } from "@/lib/pdf-report.functions";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, Download, Loader2, Calendar } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/report/$sessionId")({
  head: () => ({ meta: [{ title: "Your SCALE Gap Report" }] }),
  component: ReportPage,
});

interface SessionFull {
  id: string;
  assessment_type: AssessmentType;
  overall_score: number;
  subcategory_scores: Record<string, number>;
  gap_report: string | null;
  created_at: string;
}

function ReportPage() {
  const { sessionId } = Route.useParams();
  const { user } = useAuth();
  const generate = useServerFn(generateGapReport);
  const generatePdf = useServerFn(generatePdfReport);
  const [session, setSession] = useState<SessionFull | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState("Generating your report...");

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    async function load() {
      setLoading(true);
      setGenerating(true);
      try {
        const result = await generate({ data: { sessionId } });
        if (cancelled) return;
        setProgress(100);
        setStatusMessage("Report ready!");
        setSession(result.session as SessionFull);
      } catch (e) {
        if (cancelled) return;
        console.error("Could not load session", e);
        toast.error(e instanceof Error ? e.message : "Could not load session.");
        setSession(null);
      } finally {
        if (!cancelled) {
          // Small delay so user sees the bar fill to 100%
          setTimeout(() => {
            if (cancelled) return;
            setGenerating(false);
            setLoading(false);
          }, 400);
        }
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [sessionId, user, generate]);

  // Simulated progress + rotating status messages while generating
  const isGenerating = loading || generating || (session && !session.gap_report);
  useEffect(() => {
    if (!isGenerating) return;
    const startedAt = Date.now();
    const messages = [
      { at: 0, text: "Generating your report..." },
      { at: 3000, text: "Analyzing your answers..." },
      { at: 7000, text: "Building your personalized results..." },
      { at: 13000, text: "Almost done..." },
    ];
    const interval = setInterval(() => {
      const elapsed = Date.now() - startedAt;
      // Fast 0 → 85 over ~6s, then slow asymptote toward 95
      let next: number;
      if (elapsed < 6000) {
        next = (elapsed / 6000) * 85;
      } else {
        const extra = elapsed - 6000;
        next = 85 + (1 - Math.exp(-extra / 8000)) * 10;
      }
      setProgress((prev) => (next > prev && prev < 95 ? next : prev));
      const current = [...messages].reverse().find((m) => elapsed >= m.at);
      if (current) setStatusMessage((prev) => (prev === "Report ready!" ? prev : current.text));
    }, 200);
    return () => clearInterval(interval);
  }, [isGenerating]);

  if (loading || generating || (session && !session.gap_report)) {
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

  async function handleDownloadPdf() {
    setDownloadingPdf(true);
    try {
      const { data: sess } = await supabase.auth.getSession();
      const accessToken = sess.session?.access_token;
      if (!accessToken) throw new Error("Your session expired. Please sign in again.");
      const result = await generatePdf({ data: { sessionId, accessToken } });
      window.open(result.pdfUrl, "_blank");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not generate PDF.");
    } finally {
      setDownloadingPdf(false);
    }
  }

  return (
    <ReportView
      session={session}
      onDownloadPdf={handleDownloadPdf}
      downloadingPdf={downloadingPdf}
    />
  );
}

function ScoreRing({ score }: { score: number }) {
  const pct = Math.max(0, Math.min(100, score));
  const r = 56;
  const c = 2 * Math.PI * r;
  const offset = c - (pct / 100) * c;
  return (
    <div className="relative h-36 w-36">
      <svg viewBox="0 0 140 140" className="h-full w-full -rotate-90">
        <circle cx="70" cy="70" r={r} fill="none" stroke="oklch(0.93 0.02 250)" strokeWidth="10" />
        <circle
          cx="70"
          cy="70"
          r={r}
          fill="none"
          stroke="var(--accent-blue)"
          strokeWidth="10"
          strokeDasharray={c}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="font-display text-4xl font-semibold text-foreground">{score}</div>
        <div className="text-xs text-muted-foreground">/ 100</div>
      </div>
    </div>
  );
}

function ReportView({
  session,
  onDownloadPdf,
  downloadingPdf,
}: {
  session: SessionFull;
  onDownloadPdf: () => void;
  downloadingPdf: boolean;
}) {
  const def = ASSESSMENTS[session.assessment_type];
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
          {def.shortTitle} · SCALE Gap Report
        </p>
        <h1 className="mt-2 font-display text-3xl font-semibold text-foreground sm:text-4xl">
          Your SCALE Gap Report
        </h1>
        <div className="mt-8 flex flex-col items-center gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Overall SCALE Score</p>
            <p className="mt-1 max-w-md text-sm text-muted-foreground">
              Your composite score for this assessment. Below 60 signals a critical gap; 60–79 a
              moderate gap; 80+ a strength.
            </p>
          </div>
          <ScoreRing score={session.overall_score} />
        </div>

        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          {Object.entries(session.subcategory_scores).map(([name, score]) => {
            const label = gapLabel(score);
            const tone =
              label === "Strength"
                ? "bg-[var(--success)]/10 text-[var(--success)]"
                : label === "Moderate Gap"
                  ? "bg-[var(--warning)]/15 text-[var(--warning)]"
                  : "bg-destructive/10 text-destructive";
            return (
              <div
                key={name}
                className="flex items-center justify-between rounded-lg border border-border px-4 py-3"
              >
                <div>
                  <div className="text-sm font-medium text-foreground">{name}</div>
                  <div
                    className={
                      "mt-1 inline-flex rounded-full px-2 py-0.5 text-xs font-medium " + tone
                    }
                  >
                    {label}
                  </div>
                </div>
                <div className="font-display text-lg font-semibold">{score}</div>
              </div>
            );
          })}
        </div>
      </div>

      <article className="prose mt-10 max-w-none rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-10 print-break-inside-avoid">
        <Markdown text={session.gap_report ?? ""} />
      </article>

      <div className="mt-10 grid gap-4 sm:grid-cols-3 no-print">
        <PathCard title="DIY Path" desc="Self-directed implementation using the SCALE framework." />
        <PathCard
          title="Leaders Edge"
          desc="Group coaching program with peer leaders on the same journey."
        />
        <PathCard
          title="1:1 Coaching with Rich"
          desc="Personalized executive coaching with Rich Lohman."
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
}: {
  title: string;
  desc: string;
  recommended?: boolean;
}) {
  return (
    <div
      className={
        "rounded-xl border p-5 " +
        (recommended
          ? "border-[var(--accent-blue)] bg-primary text-primary-foreground shadow-md"
          : "border-border bg-card")
      }
    >
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
    </div>
  );
}

// Minimal markdown renderer (headings, bold, italics, lists, paragraphs)
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
      .replace(/_(.+?)_/g, "<em>$1</em>");
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
