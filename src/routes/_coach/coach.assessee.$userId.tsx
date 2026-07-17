import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ASSESSMENTS, subcategoryGapLabel, maxScoreFor, type AssessmentType } from "@/lib/assessments";
import { ArrowLeft, Mail, Phone, Calendar, Download, FileText, TrendingUp, TrendingDown, ChevronDown } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { TablePagination, usePagination } from "@/components/ui/table-pagination";

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
  id: string;
  pdf_path: string | null;
  report_data: Record<string, unknown>;
  generated_at: string;
  primary_gap: string | null;
  primary_gap_level: string | null;
}

function AssesseeDetail() {
  const { userId } = Route.useParams();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [gapReports, setGapReports] = useState<GapReport[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const [p, s, g] = await Promise.all([
        supabase.from("profiles").select("id, email, full_name, first_name, last_name, phone, created_at").eq("id", userId).maybeSingle(),
        supabase.from("assessment_sessions").select("id, assessment_type, overall_score, overall_level, subcategory_scores, primary_gap, primary_gap_level, secondary_gap, gap_report, created_at").eq("user_id", userId).order("created_at", { ascending: false }),
        supabase.from("gap_reports").select("id, pdf_path, report_data, generated_at, primary_gap, primary_gap_level").eq("user_id", userId).order("generated_at", { ascending: false }),
      ]);
      if (cancelled) return;
      if (p.error || !p.data) {
        toast.error("Could not load assessee.");
        setLoading(false);
        return;
      }
      setProfile(p.data as Profile);
      setSessions((s.data ?? []) as unknown as SessionRow[]);
      setGapReports((g.data ?? []) as unknown as GapReport[]);
      setLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, [userId]);

  // Latest of each type
  const latestByType = useMemo(() => {
    const m = new Map<AssessmentType, SessionRow>();
    for (const s of sessions) {
      if (!m.has(s.assessment_type)) m.set(s.assessment_type, s);
    }
    return m;
  }, [sessions]);

  const reportsWithUrl = useMemo(
    () =>
      gapReports.map((r) => ({
        ...r,
        pdfUrl: r.pdf_path
          ? supabase.storage.from("reports").getPublicUrl(r.pdf_path).data.publicUrl
          : null,
      })),
    [gapReports],
  );

  const historyByType = useMemo(() => {
    const m = new Map<AssessmentType, SessionRow[]>();
    // newest first per type
    const desc = [...sessions].sort((a, b) => b.created_at.localeCompare(a.created_at));
    for (const s of desc) {
      const arr = m.get(s.assessment_type) ?? [];
      arr.push(s);
      m.set(s.assessment_type, arr);
    }
    return m;
  }, [sessions]);

  if (loading) {
    return <main className="mx-auto max-w-5xl px-4 py-16 text-center text-sm text-muted-foreground">Loading…</main>;
  }
  if (!profile) {
    return <main className="mx-auto max-w-5xl px-4 py-16 text-center text-sm text-muted-foreground">Assessee not found.</main>;
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <Button variant="ghost" asChild className="mb-4 text-[color:var(--rl-purple-deep)] hover:text-[color:var(--rl-purple)]">
        <Link to="/coach"><ArrowLeft className="mr-2 h-4 w-4" /> Back to dashboard</Link>
      </Button>

      {/* Header card */}
      <div className="rounded-2xl border border-[color:var(--fr-hairline)] bg-white p-6 shadow-[var(--shadow-card)]">
        <div className="text-xs uppercase tracking-[0.18em] text-[color:var(--rl-purple)]">Member</div>
        <h1 className="mt-1 font-display text-3xl font-semibold text-[color:var(--fr-ink)] sm:text-4xl">
          {profile.full_name || `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim() || "—"}
        </h1>
        <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
          <a href={`mailto:${profile.email}`} className="inline-flex items-center gap-1.5 hover:text-[color:var(--rl-purple-deep)]"><Mail className="h-4 w-4" />{profile.email}</a>
          {profile.phone && <a href={`tel:${profile.phone}`} className="inline-flex items-center gap-1.5 hover:text-[color:var(--rl-purple-deep)]"><Phone className="h-4 w-4" />{profile.phone}</a>}
          <span className="inline-flex items-center gap-1.5"><Calendar className="h-4 w-4" />Joined {format(new Date(profile.created_at), "MMM d, yyyy")}</span>
        </div>
      </div>

      {/* Latest snapshot */}
      <h2 className="mt-10 font-display text-xl font-semibold text-[color:var(--fr-ink)]">Latest scores</h2>
      {latestByType.size === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">This member hasn't taken any assessments yet.</p>
      ) : (
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          {(["inner_capacity", "personal_leadership", "business_audit"] as AssessmentType[]).map((t) => {
            const s = latestByType.get(t);
            const def = ASSESSMENTS[t];
            const history = historyByType.get(t) ?? [];
            const prev = history.length >= 2 ? history[history.length - 2] : null;
            const delta = s && prev ? s.overall_score - prev.overall_score : 0;
            return (
              <div key={t} className="rounded-2xl border border-[color:var(--fr-hairline)] bg-white p-5 shadow-[var(--shadow-card)]">
                <div className="text-xs font-medium uppercase tracking-[0.14em] text-[color:var(--rl-purple)]">{def.shortTitle}</div>
                {s ? (
                  <>
                    <div className="mt-3 flex items-baseline gap-2">
                      <span className="font-display text-4xl font-semibold text-[color:var(--fr-ink)]">{s.overall_score}</span>
                      <span className="text-sm text-muted-foreground">/ {maxScoreFor(t)}</span>
                      {delta !== 0 && (
                        <span className={"ml-auto inline-flex items-center gap-0.5 text-xs font-medium " + (delta > 0 ? "text-emerald-700" : "text-rose-700")}>
                          {delta > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                          {delta > 0 ? "+" : ""}{delta}
                        </span>
                      )}
                    </div>
                    {s.overall_level && <div className="mt-1 text-sm text-muted-foreground">{s.overall_level}</div>}
                    <div className="mt-2 text-xs text-muted-foreground">{format(new Date(s.created_at), "MMM d, yyyy")} · {history.length} {history.length === 1 ? "attempt" : "attempts"}</div>
                  </>
                ) : (
                  <div className="mt-3 text-sm text-muted-foreground">Not yet taken.</div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Growth over time — every attempt per assessment */}
      {latestByType.size > 0 && (
        <section className="mt-10 rounded-2xl border border-[color:var(--fr-hairline)] bg-white p-6 shadow-[var(--shadow-card)]">
          <h2 className="font-display text-xl font-semibold text-[color:var(--fr-ink)]">Growth over time</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Every assessment attempt. Click any attempt to open its full breakdown.
          </p>
          <div className="mt-6 grid gap-6 lg:grid-cols-3">
            {(["inner_capacity", "personal_leadership", "business_audit"] as AssessmentType[]).map((t) => {
              return <AttemptsColumn key={t} type={t} history={historyByType.get(t) ?? []} />;
            })}
          </div>
        </section>
      )}

      {/* Gap Report history */}
      <section className="mt-10 rounded-2xl border border-[color:var(--fr-hairline)] bg-white p-6 shadow-[var(--shadow-card)]">
        <h2 className="font-display text-xl font-semibold text-[color:var(--fr-ink)] inline-flex items-center gap-2">
          <FileText className="h-5 w-5 text-[color:var(--rl-purple)]" /> Gap report history
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">Every SCALE Gap Report generated for this member.</p>
        <GapReportsList reports={reportsWithUrl} />
      </section>
    </main>
  );
}

type ReportWithUrl = GapReport & { pdfUrl: string | null };

function AttemptsColumn({ type, history }: { type: AssessmentType; history: SessionRow[] }) {
  const max = maxScoreFor(type);
  const { page, setPage, pageSize, setPageSize, pageCount, total, paged } = usePagination(history, 10);
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <div className="rounded-xl border border-[color:var(--fr-hairline)] bg-[color:var(--fr-lilac)]/30 p-4">
      <div className="text-xs font-medium uppercase tracking-[0.14em] text-[color:var(--rl-purple-deep)]">
        {ASSESSMENTS[type].shortTitle}
      </div>
      {history.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">No attempts yet.</p>
      ) : (
        <>
          <ol className="mt-3 space-y-2">
            {paged.map((s) => {
              // Attempt number: newest = total attempts, oldest = 1
              const attemptNumber = history.length - history.indexOf(s);
              const idx = history.indexOf(s);
              const older = history[idx + 1]; // next in desc = older attempt
              const delta = older ? s.overall_score - older.overall_score : 0;
              const isOpen = openId === s.id;
              return (
                <li key={s.id} className="rounded-lg border border-[color:var(--fr-hairline)] bg-white">
                  <button
                    type="button"
                    onClick={() => setOpenId(isOpen ? null : s.id)}
                    className="flex w-full items-center justify-between px-3 py-2 text-left"
                    aria-expanded={isOpen}
                  >
                    <div className="text-xs text-muted-foreground">
                      <div className="font-medium text-[color:var(--fr-ink)]">Attempt {attemptNumber}</div>
                      <div>{format(new Date(s.created_at), "MMM d, yyyy")}</div>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="font-display text-lg font-semibold text-[color:var(--fr-ink)]">{s.overall_score}</span>
                      <span className="text-xs text-muted-foreground">/{max}</span>
                      {older && (
                        <span className={"ml-1 text-[11px] font-medium " + (delta > 0 ? "text-emerald-700" : delta < 0 ? "text-rose-700" : "text-muted-foreground")}>
                          {delta > 0 ? "+" : ""}{delta}
                        </span>
                      )}
                      <ChevronDown className={"ml-1 h-4 w-4 text-muted-foreground transition-transform " + (isOpen ? "rotate-180" : "")} />
                    </div>
                  </button>
                  {isOpen && <AttemptBreakdown session={s} type={type} />}
                </li>
              );
            })}
          </ol>
          {history.length > pageSize && (
            <TablePagination
              page={page} setPage={setPage}
              pageSize={pageSize} setPageSize={setPageSize}
              pageCount={pageCount} total={total}
              label="attempts"
              className="mt-2 px-0"
            />
          )}
        </>
      )}
    </div>
  );
}

function AttemptBreakdown({ session, type }: { session: SessionRow; type: AssessmentType }) {
  return (
    <div className="border-t border-[color:var(--fr-hairline)] bg-[color:var(--fr-lilac)]/20 p-3">
      <div className="text-[11px] uppercase tracking-[0.14em] text-[color:var(--rl-purple)]">
        Score {session.overall_score}/{maxScoreFor(type)}
        {session.overall_level && ` · ${session.overall_level}`}
      </div>
      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        {Object.entries(session.subcategory_scores ?? {}).map(([name, score]) => {
          const label = subcategoryGapLabel(type, name, score);
          const tone =
            label === "Strength" ? "bg-emerald-100 text-emerald-800"
            : label === "Moderate Gap" ? "bg-amber-100 text-amber-800"
            : label === "Developing" ? "bg-[color:var(--fr-lilac)] text-[color:var(--rl-purple-deep)]"
            : "bg-rose-100 text-rose-800";
          return (
            <div key={name} className="flex items-center justify-between rounded-lg border border-[color:var(--fr-hairline)] bg-white px-3 py-2 text-sm">
              <div>
                <div className="font-medium text-[color:var(--fr-ink)]">{name}</div>
                <div className={"mt-0.5 inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium " + tone}>{label}</div>
              </div>
              <div className="font-display text-base font-semibold text-[color:var(--fr-ink)]">{score}</div>
            </div>
          );
        })}
      </div>
      {session.gap_report && (
        <details className="mt-3 rounded-lg border border-[color:var(--fr-hairline)] bg-white p-3">
          <summary className="cursor-pointer text-sm font-medium text-[color:var(--rl-purple-deep)]">View narrative</summary>
          <article className="prose mt-3 max-w-none">
            <Markdown text={session.gap_report} />
          </article>
        </details>
      )}
    </div>
  );
}

function GapReportsList({ reports }: { reports: ReportWithUrl[] }) {
  const { page, setPage, pageSize, setPageSize, pageCount, total, paged } = usePagination(reports, 10);
  if (reports.length === 0) {
    return <p className="mt-4 text-sm text-muted-foreground">No gap reports generated yet.</p>;
  }
  return (
    <>
      <ol className="mt-4 space-y-3">
        {paged.map((r) => {
          const cycleNum = reports.length - reports.indexOf(r);
          return (
            <li
              key={r.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[color:var(--fr-hairline)] bg-[color:var(--fr-lilac)]/25 px-4 py-3"
            >
              <div>
                <div className="font-medium text-[color:var(--fr-ink)]">
                  Cycle {cycleNum} · {format(new Date(r.generated_at), "MMM d, yyyy")}
                </div>
                {r.primary_gap && (
                  <div className="mt-0.5 text-xs text-muted-foreground">
                    Priority gap: <span className="text-[color:var(--fr-ink)] font-medium">{r.primary_gap}</span>
                    {r.primary_gap_level && ` · ${r.primary_gap_level}`}
                  </div>
                )}
              </div>
              {r.pdfUrl ? (
                <Button variant="outline" size="sm" asChild>
                  <a href={r.pdfUrl} target="_blank" rel="noopener noreferrer">
                    <Download className="mr-1.5 h-3.5 w-3.5" /> View PDF
                  </a>
                </Button>
              ) : (
                <span className="text-xs text-muted-foreground">PDF unavailable</span>
              )}
            </li>
          );
        })}
      </ol>
      {reports.length > pageSize && (
        <TablePagination
          page={page} setPage={setPage}
          pageSize={pageSize} setPageSize={setPageSize}
          pageCount={pageCount} total={total}
          label="reports"
          className="mt-2 px-0"
        />
      )}
    </>
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