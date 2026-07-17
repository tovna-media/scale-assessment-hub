import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { ASSESSMENT_LIST, ASSESSMENTS, maxScoreFor, type AssessmentType } from "@/lib/assessments";
import { Button } from "@/components/ui/button";
import { ArrowRight, ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";
import { format } from "date-fns";

export const Route = createFileRoute("/_authenticated/performance")({
  head: () => ({ meta: [{ title: "Performance — Fully Resourced" }] }),
  component: PerformancePage,
});

interface SessionRow {
  id: string;
  assessment_type: AssessmentType;
  overall_score: number;
  created_at: string;
  gap_report: string | null;
}

const PURPLE = "#5b19bf";

function pctOf(score: number, max: number) {
  return max ? Math.round((score / max) * 100) : 0;
}

function Ring({ value, max, size = 92, stroke = 9, children }: {
  value: number; max: number; size?: number; stroke?: number; children?: React.ReactNode;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = max > 0 ? Math.min(1, Math.max(0, value / max)) : 0;
  const offset = c * (1 - pct);
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} strokeWidth={stroke} stroke="var(--fr-lilac)" fill="none" />
        <circle cx={size / 2} cy={size / 2} r={r} strokeWidth={stroke} stroke={PURPLE} fill="none"
          strokeLinecap="round" strokeDasharray={c} strokeDashoffset={offset} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">{children}</div>
    </div>
  );
}

function Sparkline({ points, width = 130, height = 34 }: { points: number[]; width?: number; height?: number }) {
  if (points.length < 2) return <div className="h-8 text-xs text-[var(--fr-muted-ink)]">Not enough history yet</div>;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const step = width / (points.length - 1);
  const coords = points.map((v, i) => [i * step, height - ((v - min) / range) * (height - 6) - 3] as const);
  const d = coords.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const [lx, ly] = coords[coords.length - 1];
  return (
    <svg width={width} height={height} className="overflow-visible">
      <path d={d} fill="none" stroke={PURPLE} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={lx} cy={ly} r={3} fill={PURPLE} />
    </svg>
  );
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

function PerformancePage() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [loading, setLoading] = useState(true);

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
  }, [user]);

  const perType = useMemo(() => {
    const map: Record<AssessmentType, SessionRow[]> = { inner_capacity: [], personal_leadership: [], business_audit: [] };
    for (const s of sessions) map[s.assessment_type]?.push(s);
    (Object.keys(map) as AssessmentType[]).forEach((t) => {
      map[t] = [...map[t]].sort((a, b) => a.created_at.localeCompare(b.created_at));
    });
    return map;
  }, [sessions]);

  const stats = ASSESSMENT_LIST.map((a) => {
    const series = perType[a.type];
    const latest = series[series.length - 1];
    const prev = series[series.length - 2];
    const max = maxScoreFor(a.type);
    return {
      def: a,
      latest,
      max,
      percent: latest ? pctOf(latest.overall_score, max) : 0,
      delta: latest && prev ? latest.overall_score - prev.overall_score : null,
      series: series.map((s) => s.overall_score),
    };
  });

  const reportSessions = sessions.filter((s) => s.gap_report);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-8 sm:py-10">
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--rl-purple)]">Your growth</p>
        <h2 className="mt-2 text-3xl font-bold tracking-tight text-[var(--fr-ink)] sm:text-4xl">Performance</h2>
        <p className="mt-1 text-sm text-[var(--fr-muted-ink)]">Track score changes across each assessment and every Gap Report you've generated.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {stats.map((s) => (
          <div key={s.def.type} className="flex flex-col rounded-2xl border border-[var(--fr-hairline)] bg-white p-5 shadow-[var(--shadow-card)]">
            <p className="text-sm font-semibold text-[var(--fr-ink)]">{s.def.shortTitle}</p>
            {s.latest ? (
              <>
                <div className="mt-4 flex items-center gap-5">
                  <Ring value={s.latest.overall_score} max={s.max}>
                    <div className="text-xl font-bold text-[var(--fr-ink)]">{s.percent}%</div>
                  </Ring>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-bold text-[var(--fr-ink)]">{s.latest.overall_score}</span>
                      <span className="text-sm text-[var(--fr-muted-ink)]">/ {s.max}</span>
                    </div>
                    <div className="mt-1"><Delta value={s.delta} /></div>
                    <div className="mt-3"><Sparkline points={s.series} /></div>
                    <div className="mt-2 text-xs text-[var(--fr-muted-ink)]">Taken {format(new Date(s.latest.created_at), "MMM d, yyyy")}</div>
                  </div>
                </div>
                <Button variant="outline" size="sm" asChild className="mt-5 w-full">
                  <Link to="/assessment/$type" params={{ type: s.def.type }}>Retake assessment</Link>
                </Button>
              </>
            ) : (
              <>
                <p className="mt-2 text-sm text-[var(--fr-muted-ink)]">{s.def.tagline}</p>
                <div className="mt-6 rounded-xl border border-dashed border-[var(--fr-hairline)] p-4 text-center text-xs text-[var(--fr-muted-ink)]">Not yet taken</div>
                <Button size="sm" asChild className="mt-5 w-full">
                  <Link to="/assessment/$type" params={{ type: s.def.type }}>Take assessment <ArrowRight className="ml-1.5 h-3.5 w-3.5" /></Link>
                </Button>
              </>
            )}
          </div>
        ))}
      </div>

      <section className="mt-12">
        <h3 className="text-lg font-semibold text-[var(--fr-ink)]">Assessment history</h3>
        <div className="mt-4 overflow-x-auto rounded-2xl border border-[var(--fr-hairline)] bg-white shadow-[var(--shadow-card)]">
          {loading ? (
            <div className="px-6 py-10 text-center text-sm text-[var(--fr-muted-ink)]">Loading…</div>
          ) : sessions.length === 0 ? (
            <div className="px-6 py-10 text-center text-sm text-[var(--fr-muted-ink)]">No assessments taken yet.</div>
          ) : (
            <table className="w-full min-w-[640px] text-sm">
              <thead className="border-b border-[var(--fr-hairline)] bg-[var(--fr-surface)]/50 text-left text-xs uppercase tracking-wider text-[var(--fr-muted-ink)]">
                <tr>
                  <th className="px-4 py-3 font-medium">Assessment</th>
                  <th className="px-4 py-3 font-medium">Date taken</th>
                  <th className="px-4 py-3 font-medium">Overall score</th>
                  <th className="px-4 py-3 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((s) => (
                  <tr key={s.id} className="border-b border-[var(--fr-hairline)] last:border-0">
                    <td className="px-4 py-3 font-medium text-[var(--fr-ink)]">{ASSESSMENTS[s.assessment_type].shortTitle}</td>
                    <td className="px-4 py-3 text-[var(--fr-muted-ink)]">{format(new Date(s.created_at), "MMM d, yyyy")}</td>
                    <td className="px-4 py-3">
                      <span className="font-semibold">{s.overall_score}</span>
                      <span className="text-[var(--fr-muted-ink)]">/{maxScoreFor(s.assessment_type)}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button variant="ghost" size="sm" asChild>
                        <Link to="/report/$sessionId" params={{ sessionId: s.id }}>View</Link>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      <section className="mt-12">
        <h3 className="text-lg font-semibold text-[var(--fr-ink)]">Gap Reports</h3>
        {reportSessions.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-dashed border-[var(--fr-hairline)] bg-white p-6 text-center text-sm text-[var(--fr-muted-ink)]">
            No Gap Reports yet. Complete all three assessments to generate your first.
          </div>
        ) : (
          <ul className="mt-4 grid gap-3">
            {reportSessions.map((s) => (
              <li key={s.id} className="flex items-center justify-between rounded-2xl border border-[var(--fr-hairline)] bg-white p-4 shadow-[var(--shadow-card)]">
                <div>
                  <p className="text-sm font-semibold text-[var(--fr-ink)]">Gap Report · {format(new Date(s.created_at), "MMMM d, yyyy")}</p>
                  <p className="text-xs text-[var(--fr-muted-ink)]">Triggered by {ASSESSMENTS[s.assessment_type].shortTitle}</p>
                </div>
                <Button variant="outline" size="sm" asChild>
                  <Link to="/report/$sessionId" params={{ sessionId: s.id }}>Open</Link>
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}