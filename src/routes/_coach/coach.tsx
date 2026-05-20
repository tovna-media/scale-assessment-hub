import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ASSESSMENTS, maxScoreFor, type AssessmentType } from "@/lib/assessments";
import { format } from "date-fns";
import { Mail, ExternalLink, Settings } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_coach/coach")({
  head: () => ({ meta: [{ title: "Coach Dashboard — SCALE" }] }),
  component: CoachDashboard,
});

const STATUSES = ["New", "Contacted", "Booked", "Client"] as const;
type Status = (typeof STATUSES)[number];

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
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  useEffect(() => {
    loadAll();
  }, []);

  async function loadAll() {
    setLoading(true);
    const [profilesRes, sessionsRes, statusRes] = await Promise.all([
      supabase.from("profiles").select("id, email, full_name, created_at"),
      supabase
        .from("assessment_sessions")
        .select("user_id, assessment_type, overall_score, created_at")
        .order("created_at", { ascending: false }),
      supabase.from("assessee_status").select("assessee_id, status"),
    ]);

    // Only assessees: filter out coaches
    const { data: roles } = await supabase.from("user_roles").select("user_id, role");
    const coachIds = new Set((roles ?? []).filter((r) => r.role === "coach").map((r) => r.user_id));

    const statusMap = new Map<string, Status>();
    (statusRes.data ?? []).forEach((s) => statusMap.set(s.assessee_id, s.status as Status));

    const sessionsByUser = new Map<string, { type: AssessmentType; score: number; created: string }[]>();
    (sessionsRes.data ?? []).forEach((s) => {
      const arr = sessionsByUser.get(s.user_id) ?? [];
      arr.push({ type: s.assessment_type as AssessmentType, score: s.overall_score, created: s.created_at });
      sessionsByUser.set(s.user_id, arr);
    });

    const built: Row[] = (profilesRes.data ?? [])
      .filter((p) => !coachIds.has(p.id))
      .map((p) => {
        const sess = sessionsByUser.get(p.id) ?? [];
        const types = new Set(sess.map((s) => s.type));
        return {
          id: p.id,
          email: p.email,
          full_name: p.full_name,
          created_at: p.created_at,
          types,
          latestScore: sess.length ? sess[0].score : null,
          latestType: sess.length ? sess[0].type : null,
          lastActive: sess.length ? sess[0].created : null,
          status: statusMap.get(p.id) ?? "New",
        };
      });
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
    const totalAssessments = Array.from(rows).reduce((acc, r) => acc + r.types.size, 0);
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const newThisWeek = rows.filter((r) => r.lastActive && new Date(r.lastActive).getTime() >= weekAgo).length;
    const booked = rows.filter((r) => r.status === "Booked").length;
    const clients = rows.filter((r) => r.status === "Client").length;
    return { totalAssessments, newThisWeek, booked, clients };
  }, [rows]);

  const filtered = rows.filter((r) => {
    if (statusFilter !== "all" && r.status !== statusFilter) return false;
    if (typeFilter !== "all" && !r.types.has(typeFilter as AssessmentType)) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!r.email.toLowerCase().includes(q) && !(r.full_name?.toLowerCase() ?? "").includes(q)) return false;
    }
    return true;
  });

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-display text-3xl font-semibold text-foreground">Coach Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">All assessees, scores, and pipeline status.</p>
        </div>
        <Button variant="outline" asChild>
          <Link to="/settings">
            <Settings className="mr-2 h-4 w-4" /> Settings
          </Link>
        </Button>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Total assessments" value={stats.totalAssessments} />
        <StatCard label="Active this week" value={stats.newThisWeek} />
        <StatCard label="Booked calls" value={stats.booked} />
        <StatCard label="Active clients" value={stats.clients} />
      </div>

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
      </div>

      <div className="mt-4 overflow-hidden rounded-xl border border-border bg-card">
        {loading ? (
          <div className="px-6 py-10 text-center text-sm text-muted-foreground">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="px-6 py-10 text-center text-sm text-muted-foreground">No assessees match.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Assessments</th>
                <th className="px-4 py-3 font-medium">Latest score</th>
                <th className="px-4 py-3 font-medium">Last active</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 font-medium text-foreground">{r.full_name || "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{r.email}</td>
                  <td className="px-4 py-3 text-muted-foreground">{r.types.size} of 3</td>
                  <td className="px-4 py-3">
                    {r.latestScore !== null && r.latestType ? (
                      <><span className="font-display font-semibold">{r.latestScore}</span><span className="text-muted-foreground">/{maxScoreFor(r.latestType)}</span></>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {r.lastActive ? format(new Date(r.lastActive), "MMM d, yyyy") : "—"}
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
                          <ExternalLink className="mr-1 h-3.5 w-3.5" /> View
                        </Link>
                      </Button>
                      <Button variant="ghost" size="sm" asChild>
                        <a href={`mailto:${r.email}`}><Mail className="h-3.5 w-3.5" /></a>
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

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1 font-display text-3xl font-semibold text-foreground">{value}</div>
    </div>
  );
}