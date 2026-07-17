import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ASSESSMENTS, maxScoreFor, type AssessmentType } from "@/lib/assessments";
import { format, formatDistanceToNowStrict } from "date-fns";
import {
  Mail,
  ExternalLink,
  Settings,
  Users,
  CreditCard,
  AlertTriangle,
  CheckCircle2,
  TrendingDown,
  Clock,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_coach/coach")({
  head: () => ({ meta: [{ title: "Coach Dashboard — SCALE" }] }),
  component: CoachDashboard,
});

const STATUSES = ["New", "Contacted", "Booked", "Client"] as const;
type Status = (typeof STATUSES)[number];

type SubStatus = "active" | "trialing" | "past_due" | "canceled" | "none";

const FUNNEL_STEPS = [
  { key: "signed_up", label: "Signed up" },
  { key: "started_assessment", label: "Started assessment" },
  { key: "generated_gap_report", label: "Generated report" },
  { key: "subscribed", label: "Subscribed" },
  { key: "in_cycle", label: "In cycle" },
  { key: "reached_section_12", label: "Reached Section 12" },
  { key: "retook", label: "Retook assessments" },
] as const;
type FunnelKey = (typeof FUNNEL_STEPS)[number]["key"];

const STALLED_DAYS = 14;

interface Row {
  id: string;
  email: string;
  full_name: string | null;
  created_at: string;
  types: Set<AssessmentType>;
  latestScore: number | null;
  latestType: AssessmentType | null;
  lastActive: string | null;
  status: Status;
  subStatus: SubStatus;
  cycle: number;
  currentSection: number; // highest completed (0 = none)
  reportsCount: number;
  reachedSection12: boolean;
  retakesInCycle: number;
  stalled: boolean;
  awaitingReassessment: boolean;
}

function subPillClasses(status: SubStatus) {
  switch (status) {
    case "active":
    case "trialing":
      return "bg-emerald-100 text-emerald-800 border-emerald-200";
    case "past_due":
      return "bg-amber-100 text-amber-800 border-amber-200";
    case "canceled":
      return "bg-rose-100 text-rose-800 border-rose-200";
    default:
      return "bg-muted text-muted-foreground border-border";
  }
}

function subLabel(status: SubStatus) {
  if (status === "none") return "No sub";
  if (status === "past_due") return "Past due";
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function CoachDashboard() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });

  if (pathname !== "/coach") {
    return <Outlet />;
  }

  return <CoachDashboardIndex />;
}

function CoachDashboardIndex() {
  const [rows, setRows] = useState<Row[]>([]);
  const [funnel, setFunnel] = useState<Record<FunnelKey, number>>({
    signed_up: 0,
    started_assessment: 0,
    generated_gap_report: 0,
    subscribed: 0,
    in_cycle: 0,
    reached_section_12: 0,
    retook: 0,
  });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [needsAttention, setNeedsAttention] = useState(false);
  const [sortBy, setSortBy] = useState<"last_active" | "name" | "sub" | "section">("last_active");

  useEffect(() => {
    loadAll();
  }, []);

  async function loadAll() {
    setLoading(true);
    const [profilesRes, sessionsRes, statusRes, subsRes, sectionsRes, reportsRes, rolesRes] = await Promise.all([
      supabase.from("profiles").select("id, email, full_name, created_at"),
      supabase
        .from("assessment_sessions")
        .select("user_id, assessment_type, overall_score, created_at")
        .order("created_at", { ascending: false }),
      supabase.from("assessee_status").select("assessee_id, status"),
      supabase
        .from("subscriptions")
        .select("user_id, status, current_period_end, past_due_since"),
      supabase
        .from("optimizer_section_progress")
        .select("user_id, section_number, completed, updated_at")
        .eq("completed", true),
      supabase
        .from("gap_reports")
        .select("user_id, generated_at")
        .order("generated_at", { ascending: false }),
      supabase.from("user_roles").select("user_id, role"),
    ]);

    const coachIds = new Set(
      (rolesRes.data ?? []).filter((r) => r.role === "coach").map((r) => r.user_id),
    );

    const statusMap = new Map<string, Status>();
    (statusRes.data ?? []).forEach((s) => statusMap.set(s.assessee_id, s.status as Status));

    const sessionsByUser = new Map<string, { type: AssessmentType; score: number; created: string }[]>();
    (sessionsRes.data ?? []).forEach((s) => {
      const arr = sessionsByUser.get(s.user_id) ?? [];
      arr.push({ type: s.assessment_type as AssessmentType, score: s.overall_score, created: s.created_at });
      sessionsByUser.set(s.user_id, arr);
    });

    const subByUser = new Map<string, { status: SubStatus; cpe: string | null; pds: string | null }>();
    (subsRes.data ?? []).forEach((s) => {
      const raw = (s.status ?? "").toLowerCase();
      const known: SubStatus = (["active", "trialing", "past_due", "canceled"] as const).includes(raw as never)
        ? (raw as SubStatus)
        : "none";
      subByUser.set(s.user_id, { status: known, cpe: s.current_period_end, pds: s.past_due_since });
    });

    const sectionsByUser = new Map<string, { max: number; updated: string }>();
    (sectionsRes.data ?? []).forEach((r) => {
      const cur = sectionsByUser.get(r.user_id);
      if (!cur || r.section_number > cur.max) {
        sectionsByUser.set(r.user_id, { max: r.section_number, updated: r.updated_at });
      } else if (r.updated_at > cur.updated) {
        sectionsByUser.set(r.user_id, { max: cur.max, updated: r.updated_at });
      }
    });

    const reportsByUser = new Map<string, string[]>();
    (reportsRes.data ?? []).forEach((r) => {
      const arr = reportsByUser.get(r.user_id) ?? [];
      arr.push(r.generated_at);
      reportsByUser.set(r.user_id, arr);
    });

    const now = Date.now();
    const built: Row[] = (profilesRes.data ?? [])
      .filter((p) => !coachIds.has(p.id))
      .map((p) => {
        const sess = sessionsByUser.get(p.id) ?? [];
        const types = new Set(sess.map((s) => s.type));
        const sec = sectionsByUser.get(p.id);
        const reports = reportsByUser.get(p.id) ?? [];
        const currentSection = sec?.max ?? 0;
        const cycle = Math.max(1, reports.length + (currentSection >= 12 ? 0 : 0)) || 1;
        const sub = subByUser.get(p.id) ?? { status: "none" as SubStatus, cpe: null, pds: null };
        const lastAssessment = sess.length ? sess[0].created : null;
        const lastSection = sec?.updated ?? null;
        const lastActive =
          lastAssessment && lastSection
            ? lastAssessment > lastSection
              ? lastAssessment
              : lastSection
            : (lastAssessment ?? lastSection);

        // retakes in current cycle: sessions after the latest gap report
        const lastReport = reports[0];
        const retakesInCycle = lastReport
          ? new Set(sess.filter((s) => s.created > lastReport).map((s) => s.type)).size
          : types.size;

        const reachedSection12 = currentSection >= 12;
        const awaitingReassessment = reports.length > 0 && reachedSection12 && retakesInCycle < 3;
        const daysIdle = lastActive ? (now - new Date(lastActive).getTime()) / 86400000 : Infinity;
        const stalled =
          reports.length > 0 && !reachedSection12 && daysIdle > STALLED_DAYS && sub.status !== "canceled";

        return {
          id: p.id,
          email: p.email,
          full_name: p.full_name,
          created_at: p.created_at,
          types,
          latestScore: sess.length ? sess[0].score : null,
          latestType: sess.length ? sess[0].type : null,
          lastActive,
          status: statusMap.get(p.id) ?? "New",
          subStatus: sub.status,
          cycle: reports.length > 0 ? reports.length : 1,
          currentSection,
          reportsCount: reports.length,
          reachedSection12,
          retakesInCycle,
          stalled,
          awaitingReassessment,
        };
      });

    // Funnel counts
    const f: Record<FunnelKey, number> = {
      signed_up: built.length,
      started_assessment: built.filter((r) => r.types.size > 0).length,
      generated_gap_report: built.filter((r) => r.reportsCount > 0).length,
      subscribed: built.filter((r) => r.subStatus === "active" || r.subStatus === "trialing").length,
      in_cycle: built.filter((r) => r.reportsCount > 0 && r.currentSection > 0 && r.currentSection < 12).length,
      reached_section_12: built.filter((r) => r.reachedSection12).length,
      retook: built.filter((r) => r.reportsCount >= 2).length,
    };
    setFunnel(f);
    setRows(built);
    setLoading(false);
  }

  async function updateStatus(id: string, status: Status) {
    const { error } = await supabase
      .from("assessee_status")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .upsert({ assessee_id: id, status } as any, { onConflict: "assessee_id" });
    if (error) {
      toast.error(error.message);
      return;
    }
    setRows((r) => r.map((row) => (row.id === id ? { ...row, status } : row)));
    toast.success("Status updated");
  }

  const stats = useMemo(() => {
    const totalMembers = rows.length;
    const activeSubs = rows.filter((r) => r.subStatus === "active" || r.subStatus === "trialing").length;
    const pastDue = rows.filter((r) => r.subStatus === "past_due").length;
    const completedCycles = rows.reduce((acc, r) => acc + Math.max(0, r.reportsCount - 1), 0);
    // biggest drop-off: consecutive step with largest absolute drop
    let biggestDrop: { from: string; to: string; drop: number; idx: number } = {
      from: FUNNEL_STEPS[0].label,
      to: FUNNEL_STEPS[1].label,
      drop: 0,
      idx: 0,
    };
    for (let i = 0; i < FUNNEL_STEPS.length - 1; i++) {
      const a = funnel[FUNNEL_STEPS[i].key];
      const b = funnel[FUNNEL_STEPS[i + 1].key];
      const drop = a - b;
      if (drop > biggestDrop.drop) {
        biggestDrop = { from: FUNNEL_STEPS[i].label, to: FUNNEL_STEPS[i + 1].label, drop, idx: i };
      }
    }
    return { totalMembers, activeSubs, pastDue, completedCycles, biggestDrop };
  }, [rows, funnel]);

  const filtered = useMemo(() => {
    const list = rows.filter((r) => {
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (typeFilter !== "all" && !r.types.has(typeFilter as AssessmentType)) return false;
      if (needsAttention && !(r.stalled || r.awaitingReassessment || r.subStatus === "past_due")) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!r.email.toLowerCase().includes(q) && !(r.full_name?.toLowerCase() ?? "").includes(q)) return false;
      }
      return true;
    });
    const subRank: Record<SubStatus, number> = { active: 0, trialing: 1, past_due: 2, canceled: 3, none: 4 };
    list.sort((a, b) => {
      switch (sortBy) {
        case "name":
          return (a.full_name ?? a.email).localeCompare(b.full_name ?? b.email);
        case "sub":
          return subRank[a.subStatus] - subRank[b.subStatus];
        case "section":
          return b.currentSection - a.currentSection;
        case "last_active":
        default: {
          const at = a.lastActive ? new Date(a.lastActive).getTime() : 0;
          const bt = b.lastActive ? new Date(b.lastActive).getTime() : 0;
          return bt - at;
        }
      }
    });
    return list;
  }, [rows, statusFilter, typeFilter, needsAttention, search, sortBy]);

  const funnelMax = Math.max(1, ...FUNNEL_STEPS.map((s) => funnel[s.key]));

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-[0.18em] text-[color:var(--rl-purple)]">Coach</div>
          <h1 className="mt-1 font-display text-3xl font-semibold text-[color:var(--fr-ink)] sm:text-4xl">
            Fully Resourced — Admin
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Members, subscriptions, cycle progress, and funnel health.
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link to="/settings">
            <Settings className="mr-2 h-4 w-4" /> Settings
          </Link>
        </Button>
      </div>

      {/* Stat tiles */}
      <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-5">
        <StatTile icon={Users} label="Total members" value={stats.totalMembers} tone="purple" />
        <StatTile icon={CheckCircle2} label="Active subscribers" value={stats.activeSubs} tone="success" />
        <StatTile icon={AlertTriangle} label="Past due" value={stats.pastDue} tone="warning" />
        <StatTile icon={CreditCard} label="Completed cycles" value={stats.completedCycles} tone="purple" />
        <StatTile
          icon={TrendingDown}
          label="Biggest drop-off"
          value={stats.biggestDrop.drop}
          sublabel={`${stats.biggestDrop.from} → ${stats.biggestDrop.to}`}
          tone="rose"
        />
      </div>

      {/* Funnel */}
      <section className="mt-8 rounded-2xl border border-[color:var(--fr-hairline)] bg-white p-6 shadow-[var(--shadow-card)]">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="font-display text-xl font-semibold text-[color:var(--fr-ink)]">Funnel</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Accounts reaching each step. Biggest drop-off is highlighted.
            </p>
          </div>
        </div>
        <div className="mt-6 space-y-3">
          {FUNNEL_STEPS.map((step, i) => {
            const count = funnel[step.key];
            const pct = (count / funnelMax) * 100;
            const isDropTo = i === stats.biggestDrop.idx + 1 && stats.biggestDrop.drop > 0;
            const rate = i === 0 || funnel[FUNNEL_STEPS[0].key] === 0
              ? null
              : Math.round((count / funnel[FUNNEL_STEPS[0].key]) * 100);
            return (
              <div key={step.key}>
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-[color:var(--fr-ink)]">{step.label}</span>
                    {isDropTo && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-rose-700">
                        <TrendingDown className="h-3 w-3" /> −{stats.biggestDrop.drop}
                      </span>
                    )}
                  </div>
                  <div className="tabular-nums text-muted-foreground">
                    {count}
                    {rate !== null && <span className="ml-2 text-xs">({rate}%)</span>}
                  </div>
                </div>
                <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-[color:var(--fr-lilac)]">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all",
                      isDropTo
                        ? "bg-gradient-to-r from-rose-400 to-rose-600"
                        : "bg-gradient-to-r from-[color:var(--rl-purple-deep)] to-[color:var(--rl-purple-soft)]",
                    )}
                    style={{ width: `${Math.max(2, pct)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Filters */}
      <div className="mt-8 flex flex-wrap items-center gap-3">
        <Input
          placeholder="Search by name or email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-56"><SelectValue placeholder="Assessment" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All assessments</SelectItem>
            {Object.values(ASSESSMENTS).map((a) => (
              <SelectItem key={a.type} value={a.type}>{a.shortTitle}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
          <SelectTrigger className="w-48"><SelectValue placeholder="Sort" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="last_active">Sort: Last active</SelectItem>
            <SelectItem value="name">Sort: Name</SelectItem>
            <SelectItem value="sub">Sort: Subscription</SelectItem>
            <SelectItem value="section">Sort: Section</SelectItem>
          </SelectContent>
        </Select>
        <Button
          variant={needsAttention ? "default" : "outline"}
          size="sm"
          onClick={() => setNeedsAttention((v) => !v)}
          className={needsAttention ? "bg-[color:var(--rl-purple)] hover:bg-[color:var(--rl-purple-deep)]" : ""}
        >
          <AlertTriangle className="mr-2 h-4 w-4" />
          Needs attention
        </Button>
      </div>

      <div className="mt-4 overflow-x-auto rounded-2xl border border-[color:var(--fr-hairline)] bg-white shadow-[var(--shadow-card)]">
        {loading ? (
          <div className="px-6 py-16 text-center text-sm text-muted-foreground">Loading members…</div>
        ) : filtered.length === 0 ? (
          <div className="px-6 py-16 text-center text-sm text-muted-foreground">
            No members match the current filters.
          </div>
        ) : (
          <table className="w-full min-w-[1100px] text-sm">
            <thead className="border-b border-[color:var(--fr-hairline)] bg-[color:var(--fr-lilac)]/40 text-left text-[11px] uppercase tracking-wider text-[color:var(--rl-purple-deep)]">
              <tr>
                <th className="px-4 py-3 font-semibold">Member</th>
                <th className="px-4 py-3 font-semibold">Subscription</th>
                <th className="px-4 py-3 font-semibold">Cycle / Section</th>
                <th className="px-4 py-3 font-semibold">Latest score</th>
                <th className="px-4 py-3 font-semibold">Last activity</th>
                <th className="px-4 py-3 font-semibold">Flags</th>
                <th className="px-4 py-3 font-semibold">Pipeline</th>
                <th className="px-4 py-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr
                  key={r.id}
                  className="border-b border-[color:var(--fr-hairline)]/60 last:border-0 transition-colors hover:bg-[color:var(--fr-lilac)]/30"
                >
                  <td className="px-4 py-3">
                    <div className="font-medium text-[color:var(--fr-ink)]">{r.full_name || "—"}</div>
                    <div className="text-xs text-muted-foreground">{r.email}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
                        subPillClasses(r.subStatus),
                      )}
                    >
                      {subLabel(r.subStatus)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    <div className="font-medium text-[color:var(--fr-ink)]">Cycle {r.cycle}</div>
                    <div className="text-xs">
                      {r.currentSection === 0 ? "Not started" : `Section ${r.currentSection}/12`}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {r.latestScore !== null && r.latestType ? (
                      <>
                        <span className="font-display font-semibold text-[color:var(--fr-ink)]">
                          {r.latestScore}
                        </span>
                        <span className="text-muted-foreground">/{maxScoreFor(r.latestType)}</span>
                      </>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {r.lastActive ? (
                      <div>
                        <div>{format(new Date(r.lastActive), "MMM d, yyyy")}</div>
                        <div className="text-xs text-muted-foreground/80">
                          {formatDistanceToNowStrict(new Date(r.lastActive), { addSuffix: true })}
                        </div>
                      </div>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {r.stalled && (
                        <Badge tone="warning" icon={Clock}>
                          Stalled
                        </Badge>
                      )}
                      {r.awaitingReassessment && (
                        <Badge tone="rose" icon={AlertTriangle}>
                          Re-assess
                        </Badge>
                      )}
                      {r.subStatus === "past_due" && (
                        <Badge tone="warning" icon={CreditCard}>
                          Past due
                        </Badge>
                      )}
                      {!r.stalled && !r.awaitingReassessment && r.subStatus !== "past_due" && (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Select value={r.status} onValueChange={(v) => updateStatus(r.id, v as Status)}>
                      <SelectTrigger className="h-8 w-32"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="sm" asChild>
                        <Link to="/coach/assessee/$userId" params={{ userId: r.id }}>
                          View <ArrowRight className="ml-1 h-3.5 w-3.5" />
                        </Link>
                      </Button>
                      <Button variant="ghost" size="sm" asChild>
                        <a href={`mailto:${r.email}`} title="Email">
                          <Mail className="h-3.5 w-3.5" />
                        </a>
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </main>
  );
}

function StatTile({
  icon: Icon,
  label,
  value,
  sublabel,
  tone = "purple",
}: {
  icon: typeof Users;
  label: string;
  value: number;
  sublabel?: string;
  tone?: "purple" | "success" | "warning" | "rose";
}) {
  const toneRing =
    tone === "success"
      ? "bg-emerald-50 text-emerald-700"
      : tone === "warning"
        ? "bg-amber-50 text-amber-700"
        : tone === "rose"
          ? "bg-rose-50 text-rose-700"
          : "bg-[color:var(--fr-lilac)] text-[color:var(--rl-purple-deep)]";
  return (
    <div className="rounded-2xl border border-[color:var(--fr-hairline)] bg-white p-5 shadow-[var(--shadow-card)]">
      <div className="flex items-center gap-3">
        <div className={cn("flex h-9 w-9 items-center justify-center rounded-xl", toneRing)}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">{label}</div>
      </div>
      <div className="mt-3 font-display text-3xl font-semibold text-[color:var(--fr-ink)]">{value}</div>
      {sublabel && <div className="mt-1 text-xs text-muted-foreground">{sublabel}</div>}
    </div>
  );
}

function Badge({
  children,
  tone,
  icon: Icon,
}: {
  children: React.ReactNode;
  tone: "warning" | "rose" | "success";
  icon?: typeof Users;
}) {
  const classes =
    tone === "warning"
      ? "bg-amber-100 text-amber-800 border-amber-200"
      : tone === "rose"
        ? "bg-rose-100 text-rose-800 border-rose-200"
        : "bg-emerald-100 text-emerald-800 border-emerald-200";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium",
        classes,
      )}
    >
      {Icon && <Icon className="h-3 w-3" />}
      {children}
    </span>
  );
}