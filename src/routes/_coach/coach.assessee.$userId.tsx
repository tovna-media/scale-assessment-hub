import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ASSESSMENTS, gapLabel, type AssessmentType } from "@/lib/assessments";
import { ArrowLeft, Mail, Phone, Calendar, Download, FileText } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

export const Route = createFileRoute("/_coach/coach/assessee/$userId")({
  head: () => ({ meta: [{ title: "Assessee Detail — SCALE Coach" }] }),
  component: AssesseeDetail,
});

interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  created_at: string;
}

interface SessionRow {
  id: string;
  assessment_type: AssessmentType;
  overall_score: number;
  overall_level: string | null;
  subcategory_scores: Record<string, number>;
  primary_gap: string | null;
  primary_gap_level: string | null;
  secondary_gap: string | null;
  gap_report: string | null;
  created_at: string;
}

interface GapReport {
  pdf_path: string | null;
  report_data: Record<string, unknown>;
  generated_at: string;
}

function AssesseeDetail() {
  const { userId } = Route.useParams();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [gapReport, setGapReport] = useState<GapReport | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const [p, s, g] = await Promise.all([
        supabase.from("profiles").select("id, email, full_name, first_name, last_name, phone, created_at").eq("id", userId).maybeSingle(),
        supabase.from("assessment_sessions").select("id, assessment_type, overall_score, overall_level, subcategory_scores, primary_gap, primary_gap_level, secondary_gap, gap_report, created_at").eq("user_id", userId).order("created_at", { ascending: false }),
        supabase.from("gap_reports").select("pdf_path, report_data, generated_at").eq("user_id", userId).maybeSingle(),
      ]);
      if (cancelled) return;
      if (p.error || !p.data) {
        toast.error("Could not load assessee.");
        setLoading(false);
        return;
      }
      setProfile(p.data as Profile);
      setSessions((s.data ?? []) as unknown as SessionRow[]);
      setGapReport((g.data ?? null) as GapReport | null);
      setLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, [userId]);

  if (loading) {
    return <main className="mx-auto max-w-5xl px-4 py-16 text-center text-sm text-muted-foreground">Loading…</main>;
  }
  if (!profile) {
    return <main className="mx-auto max-w-5xl px-4 py-16 text-center text-sm text-muted-foreground">Assessee not found.</main>;
  }

  // Latest of each type
  const latestByType = new Map<AssessmentType, SessionRow>();
  for (const s of sessions) {
    if (!latestByType.has(s.assessment_type)) latestByType.set(s.assessment_type, s);
  }

  const reportData = (gapReport?.report_data ?? {}) as Record<string, unknown>;
  const comprehensiveMarkdown = typeof reportData.comprehensive_markdown === "string" ? (reportData.comprehensive_markdown as string) : null;

  let pdfPublicUrl: string | null = null;
  if (gapReport?.pdf_path) {
    const { data } = supabase.storage.from("reports").getPublicUrl(gapReport.pdf_path);
    pdfPublicUrl = data.publicUrl;
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <Button variant="ghost" asChild className="mb-4">
        <Link to="/coach"><ArrowLeft className="mr-2 h-4 w-4" /> Back to dashboard</Link>
      </Button>

      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <h1 className="font-display text-3xl font-semibold text-foreground">{profile.full_name || `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim() || "—"}</h1>
        <div className="mt-3 flex flex-wrap gap-4 text-sm text-muted-foreground">
          <a href={`mailto:${profile.email}`} className="inline-flex items-center gap-1 hover:text-foreground"><Mail className="h-4 w-4" />{profile.email}</a>
          {profile.phone && <a href={`tel:${profile.phone}`} className="inline-flex items-center gap-1 hover:text-foreground"><Phone className="h-4 w-4" />{profile.phone}</a>}
          <span className="inline-flex items-center gap-1"><Calendar className="h-4 w-4" />Joined {format(new Date(profile.created_at), "MMM d, yyyy")}</span>
        </div>
      </div>

      <h2 className="mt-10 font-display text-xl font-semibold text-foreground">Assessments</h2>
      {latestByType.size === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">This assessee has not taken any assessments yet.</p>
      ) : (
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          {(["inner_capacity", "personal_leadership", "business_audit"] as AssessmentType[]).map((t) => {
            const s = latestByType.get(t);
            const def = ASSESSMENTS[t];
            return (
              <div key={t} className="rounded-xl border border-border bg-card p-5">
                <div className="text-xs font-medium uppercase tracking-wider text-[var(--accent-blue)]">{def.shortTitle}</div>
                {s ? (
                  <>
                    <div className="mt-3 font-display text-4xl font-semibold text-foreground">{s.overall_score}<span className="text-base text-muted-foreground">/{maxScoreFor(t)}</span></div>
                    {s.overall_level && <div className="mt-1 text-sm text-muted-foreground">{s.overall_level}</div>}
                    <div className="mt-2 text-xs text-muted-foreground">{format(new Date(s.created_at), "MMM d, yyyy")}</div>
                  </>
                ) : (
                  <div className="mt-3 text-sm text-muted-foreground">Not yet taken.</div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Per-assessment subcategory + gap report */}
      <div className="mt-8 space-y-8">
        {Array.from(latestByType.entries()).map(([t, s]) => (
          <section key={t} className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="font-display text-lg font-semibold text-foreground">{ASSESSMENTS[t].shortTitle}</h3>
              <span className="text-sm text-muted-foreground">Score {s.overall_score}/{maxScoreFor(t)} · {format(new Date(s.created_at), "MMM d, yyyy")}</span>
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {Object.entries(s.subcategory_scores ?? {}).map(([name, score]) => {
                const label = gapLabel(score);
                const tone =
                  label === "Strength" ? "bg-[var(--success)]/10 text-[var(--success)]"
                  : label === "Moderate Gap" ? "bg-[var(--warning)]/15 text-[var(--warning)]"
                  : "bg-destructive/10 text-destructive";
                return (
                  <div key={name} className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm">
                    <div>
                      <div className="font-medium text-foreground">{name}</div>
                      <div className={"mt-0.5 inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium " + tone}>{label}</div>
                    </div>
                    <div className="font-display text-base font-semibold">{score}</div>
                  </div>
                );
              })}
            </div>
            {s.gap_report && (
              <details className="mt-5 rounded-lg border border-border bg-background p-4">
                <summary className="cursor-pointer text-sm font-medium text-foreground">View gap report</summary>
                <article className="prose mt-4 max-w-none">
                  <Markdown text={s.gap_report} />
                </article>
              </details>
            )}
          </section>
        ))}
      </div>

      {/* Comprehensive report */}
      {(comprehensiveMarkdown || pdfPublicUrl) && (
        <section className="mt-10 rounded-2xl border border-border bg-card p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-display text-xl font-semibold text-foreground inline-flex items-center gap-2"><FileText className="h-5 w-5" /> Comprehensive Gap Report</h2>
            {pdfPublicUrl && (
              <Button variant="outline" asChild>
                <a href={pdfPublicUrl} target="_blank" rel="noopener noreferrer"><Download className="mr-2 h-4 w-4" /> PDF</a>
              </Button>
            )}
          </div>
          {comprehensiveMarkdown && (
            <article className="prose mt-6 max-w-none">
              <Markdown text={comprehensiveMarkdown} />
            </article>
          )}
        </section>
      )}
    </main>
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
          {listBuf.map((l, i) => <li key={i} dangerouslySetInnerHTML={{ __html: inline(l) }} />)}
        </ul>,
      );
      listBuf = [];
    }
  };
  const flushOl = () => {
    if (olBuf.length) {
      nodes.push(
        <ol key={`ol-${nodes.length}`} className="my-3 ml-5 list-decimal space-y-1 text-foreground">
          {olBuf.map((l, i) => <li key={i} dangerouslySetInnerHTML={{ __html: inline(l) }} />)}
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
    if (/^#### /.test(line)) {
      flushAll();
      nodes.push(<h5 key={nodes.length} className="mt-4 font-display text-sm font-semibold uppercase tracking-wider text-foreground" dangerouslySetInnerHTML={{ __html: inline(line.replace(/^#### /, "")) }} />);
    } else if (/^### /.test(line)) {
      flushAll();
      nodes.push(<h4 key={nodes.length} className="mt-5 font-display text-base font-semibold text-foreground" dangerouslySetInnerHTML={{ __html: inline(line.replace(/^### /, "")) }} />);
    } else if (/^## /.test(line)) {
      flushAll();
      nodes.push(<h3 key={nodes.length} className="mt-6 font-display text-lg font-semibold text-foreground">{line.replace(/^## /, "")}</h3>);
    } else if (/^# /.test(line)) {
      flushAll();
      nodes.push(<h2 key={nodes.length} className="mt-8 font-display text-2xl font-semibold text-foreground">{line.replace(/^# /, "")}</h2>);
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
      nodes.push(<p key={nodes.length} className="my-3 leading-relaxed text-foreground" dangerouslySetInnerHTML={{ __html: inline(line) }} />);
    }
  }
  flushAll();
  return <>{nodes}</>;
}