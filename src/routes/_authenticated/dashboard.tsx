import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { ASSESSMENT_LIST, ASSESSMENTS, type AssessmentType } from "@/lib/assessments";
import { Button } from "@/components/ui/button";
import { ArrowRight, FileText, Sparkles } from "lucide-react";
import { format } from "date-fns";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Your dashboard — SCALE" }] }),
  component: DashboardPage,
});

interface SessionRow {
  id: string;
  assessment_type: AssessmentType;
  overall_score: number;
  created_at: string;
}

function DashboardPage() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("assessment_sessions")
      .select("id, assessment_type, overall_score, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setSessions((data ?? []) as SessionRow[]);
        setLoading(false);
      });
  }, [user]);

  function lastFor(type: AssessmentType) {
    return sessions.find((s) => s.assessment_type === type);
  }

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
                      <span className="text-sm text-muted-foreground">/100</span>
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

      {sessions.length > 0 && (
        <div className="mt-8 flex flex-col items-start justify-between gap-4 rounded-2xl border border-[var(--accent-blue)]/30 bg-primary/5 p-6 sm:flex-row sm:items-center">
          <div>
            <p className="text-xs font-medium uppercase tracking-widest text-[var(--accent-blue)]">
              Comprehensive view
            </p>
            <h2 className="mt-1 font-display text-xl font-semibold text-foreground">
              See your full SCALE Gap Report across all assessments
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Combine your latest results into one unified report with cross-connection analysis.
            </p>
          </div>
          <Button asChild size="lg">
            <Link to="/comprehensive-report">
              <Sparkles className="mr-2 h-4 w-4" />
              View comprehensive report
            </Link>
          </Button>
        </div>
      )}

      <section className="mt-14">
        <h2 className="font-display text-xl font-semibold text-foreground">My history</h2>
        <div className="mt-4 overflow-hidden rounded-xl border border-border bg-card">
          {loading ? (
            <div className="px-6 py-10 text-center text-sm text-muted-foreground">Loading…</div>
          ) : sessions.length === 0 ? (
            <div className="px-6 py-10 text-center text-sm text-muted-foreground">
              No assessments taken yet. Start with one above.
            </div>
          ) : (
            <table className="w-full text-sm">
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
                      <span className="text-muted-foreground">/100</span>
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