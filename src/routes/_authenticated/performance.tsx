import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { ASSESSMENT_LIST, ASSESSMENTS, maxScoreFor, type AssessmentType } from "@/lib/assessments";
import { Button } from "@/components/ui/button";
import { ArrowRight, ArrowUpRight, ArrowDownRight, Minus, Download, ExternalLink, FileText } from "lucide-react";
import { format } from "date-fns";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ReferenceDot,
  BarChart, Bar, LabelList,
} from "recharts";
import { TablePagination, usePagination } from "@/components/ui/table-pagination";

export const Route = createFileRoute("/_authenticated/performance")({
  head: () => ({ meta: [{ title: "Performance — Fully Resourced" }] }),
  component: PerformancePage,
});

const PURPLE = "#5b19bf";
const DEEP = "#2a0a64";
const LILAC = "#c7b8ea";

interface SessionRow {
  id: string;
  assessment_type: AssessmentType;
  overall_score: number;
  created_at: string;
  gap_report: string | null;
  primary_gap: string | null;
  primary_gap_score: number | null;
  primary_gap_level: string | null;
}

interface GapReportRow {
  id: string;
  pdf_path: string | null;
  generated_at: string;
  primary_gap: string | null;
  primary_gap_level: string | null;
  inner_capacity_score: number | null;
  leadership_score: number | null;
  business_score: number | null;
}

interface SnapshotRow {
  id: string;
  cycle_number: number;
  created_at: string;
  data: Record<string, unknown>;
}

function pctOf(score: number, max: number) {
  return max ? Math.round((score / max) * 100) : 0;
}

function Delta({ value }: { value: number | null }) {
  if (value === null) return <span className="inline-flex items-center gap-1 text-xs text-[var(--fr-muted-ink)]"><Minus className="h-3 w-3" /> —</span>;
  if (value === 0) return <span className="inline-flex items-center gap-1 text-xs text-[var(--fr-muted-ink)]"><Minus className="h-3 w-3" /> 0 pts</span>;
  const up = value > 0;
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold ${up ? "text-emerald-600" : "text-rose-600"}`}>
      {up ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
      {up ? "+" : ""}{value} pts
    </span>
  );
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-2xl border border-[var(--fr-hairline)] bg-white p-5 shadow-[var(--shadow-card)] ${className}`}>{children}</div>;
}

function SectionHeader({ eyebrow, title, subtitle }: { eyebrow?: string; title: string; subtitle?: string }) {
  return (
    <div className="mb-4">
      {eyebrow && <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--rl-purple)]">{eyebrow}</p>}
      <h3 className="mt-1 text-lg font-semibold text-[var(--fr-ink)]">{title}</h3>
      {subtitle && <p className="mt-1 text-sm text-[var(--fr-muted-ink)]">{subtitle}</p>}
    </div>
  );
}

function TinyLineChart({ data, dataKey = "value", height = 90, domain }: {
  data: { label: string; value: number }[]; dataKey?: string; height?: number; domain?: [number, number];
}) {
  if (data.length === 0) return <div className="flex h-[90px] items-center justify-center text-xs text-[var(--fr-muted-ink)]">No data yet</div>;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 6, right: 6, bottom: 0, left: 0 }}>
        <XAxis dataKey="label" hide />
        <YAxis hide domain={domain ?? ["auto", "auto"]} />
        <Tooltip contentStyle={{ borderRadius: 10, border: "1px solid #eee", fontSize: 12 }} />
        <Line type="monotone" dataKey={dataKey} stroke={PURPLE} strokeWidth={2} dot={{ r: 3, fill: PURPLE }} activeDot={{ r: 4 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return <div className="rounded-xl border border-dashed border-[var(--fr-hairline)] bg-white/60 p-6 text-center text-sm text-[var(--fr-muted-ink)]">{children}</div>;
}

function PerformancePage() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [snapshots, setSnapshots] = useState<SnapshotRow[]>([]);
  const [gapReport, setGapReport] = useState<GapReportRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [completedSections, setCompletedSections] = useState(0);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [s, snap, gr, prog] = await Promise.all([
        supabase.from("assessment_sessions")
          .select("id, assessment_type, overall_score, created_at, gap_report, primary_gap, primary_gap_score, primary_gap_level")
          .eq("user_id", user.id).order("created_at", { ascending: true }),
        supabase.from("leadership_dashboard_snapshots")
          .select("id, cycle_number, created_at, data")
          .eq("user_id", user.id).order("created_at", { ascending: true }),
        supabase.from("gap_reports")
          .select("id, pdf_path, generated_at, primary_gap, primary_gap_level, inner_capacity_score, leadership_score, business_score")
          .eq("user_id", user.id).maybeSingle(),
        supabase.from("optimizer_section_progress")
          .select("section_number, completed")
          .eq("user_id", user.id),
      ]);
      setSessions((s.data ?? []) as SessionRow[]);
      setSnapshots((snap.data ?? []) as SnapshotRow[]);
      setGapReport((gr.data ?? null) as GapReportRow | null);
      const rows = (prog.data ?? []) as Array<{ section_number: number; completed?: boolean }>;
      setCompletedSections(rows.filter((r) => r.completed && r.section_number >= 1 && r.section_number <= 12).length);
      setLoading(false);
    })();
  }, [user]);

  const perType = useMemo(() => {
    const map: Record<AssessmentType, SessionRow[]> = { inner_capacity: [], personal_leadership: [], business_audit: [] };
    for (const s of sessions) map[s.assessment_type]?.push(s);
    return map;
  }, [sessions]);

  const stats = ASSESSMENT_LIST.map((a) => {
    const series = perType[a.type];
    const latest = series[series.length - 1];
    const prev = series[series.length - 2];
    const max = maxScoreFor(a.type);
    return {
      def: a, latest, max,
      percent: latest ? pctOf(latest.overall_score, max) : 0,
      delta: latest && prev ? latest.overall_score - prev.overall_score : null,
      chart: series.map((s) => ({ label: format(new Date(s.created_at), "MMM d"), value: pctOf(s.overall_score, max) })),
    };
  });

  const allThreeTaken = ASSESSMENT_LIST.every((a) => perType[a.type].length > 0);
  const retakeUnlocked = allThreeTaken && Boolean(gapReport) && completedSections >= 12;

  // Overall composite % across all three (per date, using latest per type up to that date)
  const composite = useMemo(() => {
    const points: { label: string; value: number; date: string }[] = [];
    const latestByType: Record<AssessmentType, number> = { inner_capacity: 0, personal_leadership: 0, business_audit: 0 };
    const taken: Record<AssessmentType, boolean> = { inner_capacity: false, personal_leadership: false, business_audit: false };
    for (const s of sessions) {
      latestByType[s.assessment_type] = pctOf(s.overall_score, maxScoreFor(s.assessment_type));
      taken[s.assessment_type] = true;
      const arr = (Object.keys(taken) as AssessmentType[]).filter((t) => taken[t]).map((t) => latestByType[t]);
      const avg = Math.round(arr.reduce((x, y) => x + y, 0) / arr.length);
      points.push({ label: format(new Date(s.created_at), "MMM d"), value: avg, date: s.created_at });
    }
    return points;
  }, [sessions]);

  // Cycle-close markers from Section 12 snapshots
  const cycleCloses = useMemo(
    () => snapshots.filter((r) => (r.data as { section?: number; cycle_close?: boolean }).cycle_close),
    [snapshots],
  );

  // Gap Report history: use assessment_sessions rows with gap_report content
  const reportSessions = [...sessions].filter((s) => s.gap_report).reverse();
  const pdfUrl = gapReport?.pdf_path
    ? supabase.storage.from("reports").getPublicUrl(gapReport.pdf_path).data.publicUrl
    : null;

  // Priority Gap timeline per assessment
  const priorityGapSeries = ASSESSMENT_LIST.map((a) => ({
    def: a,
    rows: perType[a.type].filter((s) => s.primary_gap).map((s) => ({
      date: s.created_at, label: format(new Date(s.created_at), "MMM d"),
      gap: s.primary_gap!, level: s.primary_gap_level, score: s.primary_gap_score ?? 0,
    })),
  }));

  if (loading) {
    return <div className="mx-auto max-w-6xl px-4 py-10 text-sm text-[var(--fr-muted-ink)]">Loading your performance…</div>;
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-8 sm:py-10">
      <div className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--rl-purple)]">Your growth</p>
        <h2 className="mt-2 text-3xl font-bold tracking-tight text-[var(--fr-ink)] sm:text-4xl">Performance</h2>
        <p className="mt-1 text-sm text-[var(--fr-muted-ink)]">
          Every score, rating, and marker you've captured — over time. Open any Gap Report, and start a new cycle once you've completed all 12 sections.
        </p>
      </div>

      {/* Assessment score trend cards */}
      <div className="grid gap-4 md:grid-cols-3">
        {stats.map((s) => (
          <Card key={s.def.type} className="flex flex-col">
            <div className="flex items-start justify-between">
              <p className="text-sm font-semibold text-[var(--fr-ink)]">{s.def.shortTitle}</p>
              {s.latest && <Delta value={s.delta} />}
            </div>
            {s.latest ? (
              <>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-[var(--fr-ink)]">{s.percent}%</span>
                  <span className="text-xs text-[var(--fr-muted-ink)]">{s.latest.overall_score}/{s.max}</span>
                </div>
                <div className="mt-2 text-xs text-[var(--fr-muted-ink)]">Latest {format(new Date(s.latest.created_at), "MMM d, yyyy")}</div>
                <div className="mt-3"><TinyLineChart data={s.chart} domain={[0, 100]} /></div>
                {retakeUnlocked ? (
                  <Button variant="outline" size="sm" asChild className="mt-4 w-full">
                    <Link to="/assessment/$type" params={{ type: s.def.type }}>Retake assessment</Link>
                  </Button>
                ) : (
                  <Button variant="outline" size="sm" disabled className="mt-4 w-full" title="Retakes unlock after all 3 assessments, your Gap Report, and all 12 sections are complete.">
                    Retake locked
                  </Button>
                )}
              </>
            ) : (
              <>
                <p className="mt-2 text-sm text-[var(--fr-muted-ink)]">{s.def.tagline}</p>
                <div className="mt-4 rounded-xl border border-dashed border-[var(--fr-hairline)] p-4 text-center text-xs text-[var(--fr-muted-ink)]">Not yet taken</div>
                <Button size="sm" asChild className="mt-4 w-full">
                  <Link to="/assessment/$type" params={{ type: s.def.type }}>Take assessment <ArrowRight className="ml-1.5 h-3.5 w-3.5" /></Link>
                </Button>
              </>
            )}
          </Card>
        ))}
      </div>

      {/* Overall growth across cycles */}
      <section className="mt-10">
        <SectionHeader eyebrow="Growth" title="Overall growth across cycles"
          subtitle="Composite score across the three assessments. Diamonds mark completed optimization cycles." />
        <Card>
          {composite.length < 2 ? (
            <EmptyState>Complete assessments over time to see your growth line.</EmptyState>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={composite} margin={{ top: 12, right: 20, bottom: 6, left: -10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                  <XAxis dataKey="label" fontSize={11} stroke="#94a3b8" />
                  <YAxis domain={[0, 100]} fontSize={11} stroke="#94a3b8" />
                  <Tooltip contentStyle={{ borderRadius: 10, border: "1px solid #eee", fontSize: 12 }} formatter={(v) => [`${v}%`, "Composite"]} />
                  <Line type="monotone" dataKey="value" stroke={PURPLE} strokeWidth={2.5} dot={{ r: 4, fill: PURPLE }} activeDot={{ r: 6 }} />
                  {cycleCloses.map((c) => {
                    // Find closest composite point on/before cycle close date
                    const idx = composite.findIndex((p) => p.date >= c.created_at);
                    const target = idx === -1 ? composite[composite.length - 1] : composite[Math.max(0, idx - 1)];
                    if (!target) return null;
                    return <ReferenceDot key={c.id} x={target.label} y={target.value} r={7} fill={DEEP} stroke="white" strokeWidth={2} />;
                  })}
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
          {cycleCloses.length > 0 && (
            <p className="mt-2 text-xs text-[var(--fr-muted-ink)]">
              {cycleCloses.length} cycle{cycleCloses.length === 1 ? "" : "s"} completed · Last on {format(new Date(cycleCloses[cycleCloses.length - 1].created_at), "MMM d, yyyy")}
            </p>
          )}
        </Card>
      </section>

      {/* Priority Gap across cycles */}
      <section className="mt-10">
        <SectionHeader eyebrow="Focus" title="Priority Gap across cycles"
          subtitle="Your lowest-scoring category each time you took an assessment." />
        <div className="grid gap-4 lg:grid-cols-3">
          {priorityGapSeries.map(({ def, rows }) => (
            <Card key={def.type}>
              <p className="text-sm font-semibold text-[var(--fr-ink)]">{def.shortTitle}</p>
              {rows.length === 0 ? (
                <div className="mt-4 text-xs text-[var(--fr-muted-ink)]">No priority gap tracked yet.</div>
              ) : (
                <ul className="mt-3 space-y-2">
                  {rows.slice().reverse().map((r, i) => (
                    <li key={i} className="flex items-start justify-between rounded-lg bg-[var(--fr-surface)]/40 px-3 py-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-[var(--fr-ink)]">{r.gap}</p>
                        <p className="text-[11px] text-[var(--fr-muted-ink)]">{r.label} · {r.level ?? "—"}</p>
                      </div>
                      <span className="ml-3 shrink-0 rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-[var(--rl-purple)] ring-1 ring-[var(--fr-hairline)]">
                        {r.score}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          ))}
        </div>
      </section>

      {/* Gap Report history */}
      <section className="mt-10">
        <SectionHeader eyebrow="Reports" title="Gap Report history"
          subtitle="Every SCALE Gap Report you've generated. View in the app, or download the PDF." />
        {reportSessions.length === 0 ? (
          <EmptyState>No Gap Reports yet. Complete all three assessments to generate your first.</EmptyState>
        ) : (
          <PaginatedReports sessions={reportSessions} pdfUrl={pdfUrl} />
        )}
      </section>

      {/* Guide-tracked numbers over time */}
      <section className="mt-10">
        <SectionHeader eyebrow="Guide" title="Guide-tracked numbers over time"
          subtitle="Everything you've rated inside the Optimization Guide — charted from your snapshots." />
        <GuideCharts snapshots={snapshots} />
      </section>
    </div>
  );
}

function PaginatedReports({ sessions, pdfUrl }: { sessions: SessionRow[]; pdfUrl: string | null }) {
  const { page, setPage, pageSize, setPageSize, pageCount, total, paged } = usePagination(sessions, 10);
  return (
    <>
      <ul className="grid gap-3">
        {paged.map((s) => {
          const idx = sessions.indexOf(s);
          return (
            <li key={s.id}>
              <Card className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="rounded-lg bg-[var(--fr-lilac)]/40 p-2 text-[var(--rl-purple)]"><FileText className="h-4 w-4" /></div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[var(--fr-ink)]">
                      SCALE Gap Report · {format(new Date(s.created_at), "MMMM d, yyyy")}
                    </p>
                    <p className="text-xs text-[var(--fr-muted-ink)]">
                      Triggered by {ASSESSMENTS[s.assessment_type].shortTitle}
                      {idx === 0 && " · Most recent"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" asChild>
                    <Link to="/report/$sessionId" params={{ sessionId: s.id }}>
                      <ExternalLink className="mr-1.5 h-3.5 w-3.5" /> View
                    </Link>
                  </Button>
                  {idx === 0 && pdfUrl ? (
                    <Button size="sm" asChild>
                      <a href={pdfUrl} target="_blank" rel="noreferrer" download>
                        <Download className="mr-1.5 h-3.5 w-3.5" /> Download PDF
                      </a>
                    </Button>
                  ) : null}
                </div>
              </Card>
            </li>
          );
        })}
      </ul>
      {sessions.length > pageSize && (
        <div className="mt-3">
          <TablePagination
            page={page} setPage={setPage}
            pageSize={pageSize} setPageSize={setPageSize}
            pageCount={pageCount} total={total}
            label="reports"
            className="px-0"
          />
        </div>
      )}
    </>
  );
}

/* ─── Guide charts ──────────────────────────────────────────── */

interface RatedSnap { label: string; date: string; data: Record<string, unknown> }

function pickSnapshots(snapshots: SnapshotRow[], section: number): RatedSnap[] {
  return snapshots
    .filter((s) => (s.data as { section?: number }).section === section || (section === 3 && (s.data as Record<string, unknown>).fuel))
    .map((s) => ({ label: format(new Date(s.created_at), "MMM d"), date: s.created_at, data: s.data }));
}

function GuideCharts({ snapshots }: { snapshots: SnapshotRow[] }) {
  const s3 = pickSnapshots(snapshots, 3);
  const s9 = pickSnapshots(snapshots, 9);

  // Section 3 — FUEL (0-10 each)
  const fuelKeys: { key: string; label: string }[] = [
    { key: "firm", label: "Firm Character" },
    { key: "understand", label: "Understand Emotions" },
    { key: "envision", label: "Envision Success" },
    { key: "lead", label: "Lead Yourself Daily" },
  ];
  const fuelSeries = s3.map((snap) => {
    const fuel = (snap.data.fuel as Record<string, number>) ?? {};
    const row: Record<string, number | string> = { label: snap.label };
    fuelKeys.forEach((k) => { row[k.label] = fuel[k.key] ?? 0; });
    return row;
  });

  // Section 3 — Skill current vs desired (first skill focus)
  const skillsSeries = s3.map((snap) => {
    const skills = (snap.data.skills as { name: string; current: number; desired: number }[]) ?? [];
    const top = skills[0];
    return { label: snap.label, current: top?.current ?? 0, desired: top?.desired ?? 0, name: top?.name ?? "" };
  });

  // Section 3 — Success Driver percentages
  const latestS3 = s3[s3.length - 1];
  const driverBars = latestS3
    ? ((latestS3.data.drivers as { label: string; percent: number }[]) ?? [])
        .filter((d) => d.label)
        .map((d) => ({ label: d.label, value: d.percent ?? 0 }))
    : [];

  // Section 3 — Standards ratings (latest)
  const standardBars = latestS3
    ? ((latestS3.data.standards_ratings as { label: string; score: number }[]) ?? [])
        .filter((d) => d.label)
        .map((d) => ({ label: d.label, value: d.score ?? 0 }))
    : [];

  // Section 9 — 15 Integration ratings + commitment + confidence
  const INTEGRATION_LABELS: Record<string, string> = {
    ly_physical: "Physical Energy", ly_mental: "Mental Energy", ly_emotional: "Emotional Energy",
    ly_discipline: "Discipline", ly_values: "Living values", ly_clarity: "Clarity of priorities",
    ly_followthrough: "Follow-through",
    lo_oneonone: "1:1 consistency", lo_clarity: "Clarity of expectations",
    lo_accountability: "Accountability", lo_adaptability: "Adaptability to styles",
    lr_focus: "Focus on top priority", lr_standards: "Raising standards",
    lr_wins: "Creating wins", lr_gaps: "Addressing gaps",
  };
  const integrationSeries = s9.map((snap) => {
    const ratings = (snap.data.integration_check as Record<string, number>) ?? {};
    const row: Record<string, number | string> = { label: snap.label };
    Object.entries(INTEGRATION_LABELS).forEach(([k, label]) => { row[label] = ratings[k] ?? 0; });
    row["Commitment"] = (snap.data.commitment_rating as number) ?? 0;
    row["Confidence"] = (snap.data.confidence_rating as number) ?? 0;
    return row;
  });

  const latestS9 = s9[s9.length - 1];
  const integrationBars = latestS9
    ? [
        ...Object.entries(INTEGRATION_LABELS).map(([k, label]) => ({
          label, value: ((latestS9.data.integration_check as Record<string, number>) ?? {})[k] ?? 0,
        })),
        { label: "Commitment", value: (latestS9.data.commitment_rating as number) ?? 0 },
        { label: "Confidence", value: (latestS9.data.confidence_rating as number) ?? 0 },
      ]
    : [];

  // Section 7 & 8 — success markers list
  const successMarkers: { section: number; date: string; marker: string; driver?: string }[] = [];
  for (const snap of snapshots) {
    const d = snap.data as Record<string, unknown>;
    if (d.section === 7 && Array.isArray(d.success_markers)) {
      for (const m of d.success_markers as { driver: string; marker: string }[]) {
        if (m.marker) successMarkers.push({ section: 7, date: snap.created_at, marker: m.marker, driver: m.driver });
      }
    }
    if (d.section === 8) {
      const conv = d.conversation as { success_marker?: string; name?: string } | undefined;
      if (conv?.success_marker) successMarkers.push({ section: 8, date: snap.created_at, marker: conv.success_marker, driver: conv.name });
    }
  }

  const anyData = s3.length + s9.length + successMarkers.length > 0;
  if (!anyData) {
    return <EmptyState>You haven't captured guide numbers yet. Complete Section 3, 7, 8, or 9 to see them here.</EmptyState>;
  }

  return (
    <div className="space-y-6">
      {fuelSeries.length > 0 && (
        <Card>
          <p className="text-sm font-semibold text-[var(--fr-ink)]">FUEL ratings — Section 3</p>
          <p className="text-xs text-[var(--fr-muted-ink)]">Each area rated 1–10 per snapshot.</p>
          <div className="mt-4 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={fuelSeries} margin={{ top: 6, right: 12, bottom: 6, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                <XAxis dataKey="label" fontSize={11} stroke="#94a3b8" />
                <YAxis domain={[0, 10]} fontSize={11} stroke="#94a3b8" />
                <Tooltip contentStyle={{ borderRadius: 10, border: "1px solid #eee", fontSize: 12 }} />
                {fuelKeys.map((k, i) => (
                  <Line key={k.key} type="monotone" dataKey={k.label} stroke={SERIES_COLORS[i % SERIES_COLORS.length]} strokeWidth={2} dot={{ r: 3 }} />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

      {skillsSeries.length > 0 && (
        <Card>
          <p className="text-sm font-semibold text-[var(--fr-ink)]">Skill focus — current vs desired</p>
          <p className="text-xs text-[var(--fr-muted-ink)]">Your top skill focus captured each snapshot.</p>
          <div className="mt-4 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={skillsSeries} margin={{ top: 6, right: 12, bottom: 6, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                <XAxis dataKey="label" fontSize={11} stroke="#94a3b8" />
                <YAxis domain={[0, 10]} fontSize={11} stroke="#94a3b8" />
                <Tooltip contentStyle={{ borderRadius: 10, border: "1px solid #eee", fontSize: 12 }} />
                <Line type="monotone" dataKey="current" stroke={PURPLE} strokeWidth={2} name="Current" />
                <Line type="monotone" dataKey="desired" stroke={DEEP} strokeDasharray="4 4" strokeWidth={2} name="Desired" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {driverBars.length > 0 && (
          <Card>
            <p className="text-sm font-semibold text-[var(--fr-ink)]">Success Drivers — latest %</p>
            <p className="text-xs text-[var(--fr-muted-ink)]">From your most recent Section 3 snapshot.</p>
            <HorizontalBars data={driverBars} suffix="%" domain={[0, 100]} />
          </Card>
        )}
        {standardBars.length > 0 && (
          <Card>
            <p className="text-sm font-semibold text-[var(--fr-ink)]">Standards — latest ratings</p>
            <p className="text-xs text-[var(--fr-muted-ink)]">Rated 1–10 in Section 3.</p>
            <HorizontalBars data={standardBars} domain={[0, 10]} />
          </Card>
        )}
      </div>

      {integrationBars.length > 0 && (
        <Card>
          <p className="text-sm font-semibold text-[var(--fr-ink)]">Integration Check — latest (Section 9)</p>
          <p className="text-xs text-[var(--fr-muted-ink)]">Fifteen 1–10 ratings plus commitment and confidence.</p>
          <HorizontalBars data={integrationBars} domain={[0, 10]} height={Math.max(260, integrationBars.length * 22)} />
        </Card>
      )}

      {integrationSeries.length > 1 && (
        <Card>
          <p className="text-sm font-semibold text-[var(--fr-ink)]">Commitment & Confidence over time</p>
          <div className="mt-4 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={integrationSeries} margin={{ top: 6, right: 12, bottom: 6, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                <XAxis dataKey="label" fontSize={11} stroke="#94a3b8" />
                <YAxis domain={[0, 10]} fontSize={11} stroke="#94a3b8" />
                <Tooltip contentStyle={{ borderRadius: 10, border: "1px solid #eee", fontSize: 12 }} />
                <Line type="monotone" dataKey="Commitment" stroke={PURPLE} strokeWidth={2.5} />
                <Line type="monotone" dataKey="Confidence" stroke={DEEP} strokeWidth={2.5} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

      {successMarkers.length > 0 && (
        <Card>
          <p className="text-sm font-semibold text-[var(--fr-ink)]">Success Markers</p>
          <p className="text-xs text-[var(--fr-muted-ink)]">Captured from Sections 7 & 8 as you work through the guide.</p>
          <ul className="mt-3 divide-y divide-[var(--fr-hairline)]">
            {successMarkers.slice().reverse().map((m, i) => (
              <li key={i} className="flex items-start justify-between gap-3 py-2">
                <div className="min-w-0">
                  <p className="truncate text-sm text-[var(--fr-ink)]">{m.marker}</p>
                  <p className="text-[11px] text-[var(--fr-muted-ink)]">
                    {m.driver ? `${m.driver} · ` : ""}Section {m.section} · {format(new Date(m.date), "MMM d, yyyy")}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}

const SERIES_COLORS = [PURPLE, DEEP, "#8b5cf6", LILAC];

function HorizontalBars({ data, domain, suffix = "", height }: {
  data: { label: string; value: number }[]; domain: [number, number]; suffix?: string; height?: number;
}) {
  const h = height ?? Math.max(200, data.length * 26);
  return (
    <div className="mt-4" style={{ height: h }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 30, bottom: 4, left: 0 }}>
          <XAxis type="number" domain={domain} hide />
          <YAxis type="category" dataKey="label" width={160} tick={{ fontSize: 11, fill: "#334155" }} stroke="#e5e7eb" />
          <Tooltip contentStyle={{ borderRadius: 10, border: "1px solid #eee", fontSize: 12 }} formatter={(v) => [`${v}${suffix}`, ""]} />
          <Bar dataKey="value" fill={PURPLE} radius={[4, 4, 4, 4]} barSize={12}>
            <LabelList dataKey="value" position="right" formatter={(v: number) => `${v}${suffix}`} style={{ fontSize: 11, fill: "#334155" }} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}