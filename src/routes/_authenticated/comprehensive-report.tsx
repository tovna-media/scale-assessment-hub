import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { useServerFn } from "@tanstack/react-start";
import { generateComprehensiveReport } from "@/lib/comprehensive.functions";
import { ASSESSMENTS, gapLabel, type AssessmentType } from "@/lib/assessments";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Calendar, Download, Loader2, RefreshCcw } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/comprehensive-report")({
  head: () => ({ meta: [{ title: "Comprehensive SCALE Gap Report" }] }),
  component: ComprehensivePage,
});

type SessionLite = {
  assessment_type: AssessmentType;
  overall_score: number;
  overall_level: string | null;
  subcategory_scores: Record<string, number>;
};

const STRATEGY_URL = "https://richlohman.com/strategy-call-with-rich";

function ComprehensivePage() {
  const { user } = useAuth();
  const run = useServerFn(generateComprehensiveReport);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);
  const [markdown, setMarkdown] = useState<string>("");
  const [pdfUrl, setPdfUrl] = useState<string>("");
  const [sessions, setSessions] = useState<Record<string, SessionLite>>({});
  const [complete, setComplete] = useState(false);

  async function load(force = false) {
    if (!user) return;
    if (force) setRegenerating(true);
    else setLoading(true);
    try {
      const { data: sess } = await supabase.auth.getSession();
      const accessToken = sess.session?.access_token;
      if (!accessToken) throw new Error("Your session expired. Please sign in again.");
      const result = await run({ data: { accessToken, force } });
      setMarkdown(result.markdown);
      setPdfUrl(result.pdfUrl);
      setSessions(result.sessions as Record<string, SessionLite>);
      setComplete(result.complete);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not generate report.");
    } finally {
      setLoading(false);
      setRegenerating(false);
    }
  }

  useEffect(() => {
    load(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  if (loading) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-24 text-center">
        <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-primary/5">
          <Loader2 className="h-8 w-8 animate-spin text-[var(--accent-blue)]" />
        </div>
        <h1 className="mt-6 font-display text-2xl font-semibold text-foreground">
          Building your Comprehensive SCALE Gap Report…
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">This takes about 20 seconds.</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-2">
        <Button variant="ghost" asChild>
          <Link to="/dashboard">
            <ArrowLeft className="mr-2 h-4 w-4" /> Dashboard
          </Link>
        </Button>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => load(true)} disabled={regenerating}>
            {regenerating ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Regenerating…</>
            ) : (
              <><RefreshCcw className="mr-2 h-4 w-4" /> Regenerate</>
            )}
          </Button>
          {pdfUrl && (
            <Button variant="outline" asChild>
              <a href={pdfUrl} target="_blank" rel="noopener noreferrer">
                <Download className="mr-2 h-4 w-4" /> Download PDF
              </a>
            </Button>
          )}
          <Button asChild>
            <a href={STRATEGY_URL} target="_blank" rel="noopener noreferrer">
              <Calendar className="mr-2 h-4 w-4" /> Book a Strategy Call
            </a>
          </Button>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-10">
        <p className="text-xs font-medium uppercase tracking-widest text-[var(--accent-blue)]">
          Comprehensive SCALE Gap Report
        </p>
        <h1 className="mt-2 font-display text-3xl font-semibold text-foreground sm:text-4xl">
          Your full leadership diagnostic
        </h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          A unified view across Inner Capacity, Personal Leadership, and Business Audit — plus how the gaps in one area cascade into the others.
        </p>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {(["inner_capacity", "personal_leadership", "business_audit"] as AssessmentType[]).map((t) => {
            const s = sessions[t];
            const def = ASSESSMENTS[t];
            return (
              <div key={t} className="rounded-xl border border-border bg-background p-5">
                <div className="text-xs font-medium uppercase tracking-wider text-[var(--accent-blue)]">
                  {def.shortTitle}
                </div>
                {s ? (
                  <>
                    <div className="mt-3 font-display text-4xl font-semibold text-foreground">
                      {s.overall_score}
                      <span className="text-base text-muted-foreground">/100</span>
                    </div>
                    {s.overall_level && (
                      <div className="mt-1 text-sm text-muted-foreground">{s.overall_level}</div>
                    )}
                  </>
                ) : (
                  <>
                    <div className="mt-3 text-sm text-muted-foreground">Not yet taken.</div>
                    <Button asChild variant="outline" size="sm" className="mt-3">
                      <Link to="/assessment/$type" params={{ type: t }}>
                        Take it now
                      </Link>
                    </Button>
                  </>
                )}
              </div>
            );
          })}
        </div>

        {!complete && (
          <div className="mt-6 rounded-lg border border-[var(--warning)]/40 bg-[var(--warning)]/10 px-4 py-3 text-sm text-foreground">
            Complete all three assessments for the most precise comprehensive report.
          </div>
        )}
      </div>

      {/* Subcategory breakdowns per assessment */}
      <div className="mt-8 grid gap-6 md:grid-cols-3">
        {(["inner_capacity", "personal_leadership", "business_audit"] as AssessmentType[]).map((t) => {
          const s = sessions[t];
          if (!s) return null;
          return (
            <div key={t} className="rounded-2xl border border-border bg-card p-5">
              <div className="font-display text-lg font-semibold text-foreground">
                {ASSESSMENTS[t].shortTitle}
              </div>
              <div className="mt-3 space-y-2">
                {Object.entries(s.subcategory_scores).map(([name, score]) => {
                  const label = gapLabel(score);
                  const tone =
                    label === "Strength"
                      ? "bg-[var(--success)]/10 text-[var(--success)]"
                      : label === "Moderate Gap"
                      ? "bg-[var(--warning)]/15 text-[var(--warning)]"
                      : "bg-destructive/10 text-destructive";
                  return (
                    <div key={name} className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm">
                      <div>
                        <div className="font-medium text-foreground">{name}</div>
                        <div className={"mt-0.5 inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium " + tone}>
                          {label}
                        </div>
                      </div>
                      <div className="font-display text-base font-semibold">{score}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <article className="prose mt-10 max-w-none rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-10">
        <Markdown text={markdown} />
      </article>

      <div className="mt-10 grid gap-4 sm:grid-cols-3">
        <PathCard title="DIY Path" desc="Self-directed implementation using the SCALE framework." />
        <PathCard title="Leaders Edge" desc="Group coaching program with peer leaders on the same journey." />
        <PathCard title="1:1 Coaching with Rich" desc="Personalized executive coaching with Rich Lohman." recommended />
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        <Button asChild size="lg">
          <a href={STRATEGY_URL} target="_blank" rel="noopener noreferrer">
            Book a Strategy Call with Rich
          </a>
        </Button>
        {pdfUrl && (
          <Button variant="outline" size="lg" asChild>
            <a href={pdfUrl} target="_blank" rel="noopener noreferrer">
              Download My Comprehensive Report (PDF)
            </a>
          </Button>
        )}
      </div>
    </main>
  );
}

function PathCard({ title, desc, recommended }: { title: string; desc: string; recommended?: boolean }) {
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
      <h3 className={"font-display text-lg font-semibold " + (recommended ? "" : "text-foreground")}>
        {title}
      </h3>
      <p className={"mt-1 text-sm " + (recommended ? "text-primary-foreground/80" : "text-muted-foreground")}>
        {desc}
      </p>
    </div>
  );
}

function Markdown({ text }: { text: string }) {
  const lines = text.split("\n");
  const nodes: React.ReactNode[] = [];
  let listBuf: string[] = [];
  let olBuf: string[] = [];
  const flushUl = () => {
    if (listBuf.length) {
      nodes.push(
        <ul key={`ul-${nodes.length}`} className="my-3 ml-5 list-disc space-y-1 text-foreground">
          {listBuf.map((l, i) => (
            <li key={i} dangerouslySetInnerHTML={{ __html: inline(l) }} />
          ))}
        </ul>,
      );
      listBuf = [];
    }
  };
  const flushOl = () => {
    if (olBuf.length) {
      nodes.push(
        <ol key={`ol-${nodes.length}`} className="my-3 ml-5 list-decimal space-y-1 text-foreground">
          {olBuf.map((l, i) => (
            <li key={i} dangerouslySetInnerHTML={{ __html: inline(l) }} />
          ))}
        </ol>,
      );
      olBuf = [];
    }
  };
  const flushAll = () => { flushUl(); flushOl(); };
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
      flushAll();
      nodes.push(
        <h2 key={nodes.length} className="mt-8 font-display text-2xl font-semibold text-foreground">
          {line.replace(/^# /, "")}
        </h2>,
      );
    } else if (/^## /.test(line)) {
      flushAll();
      nodes.push(
        <h3 key={nodes.length} className="mt-6 font-display text-lg font-semibold text-foreground">
          {line.replace(/^## /, "")}
        </h3>,
      );
    } else if (/^[-*] /.test(line)) {
      flushOl();
      listBuf.push(line.replace(/^[-*] /, ""));
    } else if (/^\d+\.\s/.test(line)) {
      flushUl();
      olBuf.push(line.replace(/^\d+\.\s/, ""));
    } else if (line === "") {
      flushAll();
    } else {
      flushAll();
      nodes.push(
        <p
          key={nodes.length}
          className="my-3 leading-relaxed text-foreground"
          dangerouslySetInnerHTML={{ __html: inline(line) }}
        />,
      );
    }
  }
  flushAll();
  return <>{nodes}</>;
}