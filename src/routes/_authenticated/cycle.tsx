import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { getSubscriptionStatus } from "@/lib/payments.functions";
import { useServerFn } from "@tanstack/react-start";
import { ArrowRight, Check, Lock, PlayCircle } from "lucide-react";

export const Route = createFileRoute("/_authenticated/cycle")({
  head: () => ({ meta: [{ title: "My Cycle — Fully Resourced" }] }),
  component: CyclePage,
});

const SECTIONS: { number: number; title: string; blurb: string; path?: string }[] = [
  { number: 1, title: "Begin Your Leadership Optimization Cycle", blurb: "Confirm your assessments, lock in your Priority Gap, and set your intent.", path: "/guide/section-1" },
  { number: 2, title: "Lead Yourself", blurb: "Build the Lead Yourself Plan: character, emotions, success image, standards, and daily leadership.", path: "/guide/section-2" },
  { number: 3, title: "Leadership Performance Dashboard", blurb: "Rate FUEL, capacity, skills, drivers, standards, and lock in your action plan.", path: "/guide/section-3" },
  { number: 4, title: "Lead Others", blurb: "Map who you lead, listen deeply, communicate to be heard, and build a plan to grow them.", path: "/guide/section-4" },
  { number: 5, title: "Growing People Intentionally", blurb: "Spot team-wide patterns, build development rhythms, and set your people-growth strategy.", path: "/guide/section-5" },
  { number: 6, title: "Leadership Review & Recalibration", blurb: "Review your growth, seal the leaks, and recalibrate for the next cycle.", path: "/guide/section-6" },
  { number: 7, title: "Lead for Results", blurb: "Sharpen your Success Image, lock in Success Markers, and close the gap.", path: "/guide/section-7" },
  { number: 8, title: "Lead Through Communication", blurb: "Communicate so your team executes without guessing." },
  { number: 9, title: "Cultivate High-Performance Habits", blurb: "Install the daily rhythms that compound." },
  { number: 10, title: "Align Your Team", blurb: "Get everyone rowing toward the same result." },
  { number: 11, title: "Execute with Discipline", blurb: "Turn strategy into weekly, measurable output." },
  { number: 12, title: "Reassess & Renew", blurb: "Retake your assessments and start your next cycle." },
];

interface Progress { section_number: number; completed: boolean; }

function CyclePage() {
  const { user } = useAuth();
  const checkSub = useServerFn(getSubscriptionStatus);
  const [progress, setProgress] = useState<Progress[]>([]);
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    void checkSub({}).then((s) => setSubscribed(Boolean(s.active))).catch(() => {});
    supabase
      .from("optimizer_section_progress")
      .select("section_number, completed")
      .eq("user_id", user.id)
      .then(({ data }) => {
        setProgress((data ?? []) as Progress[]);
        setLoading(false);
      });
  }, [user, checkSub]);

  const completedSet = new Set(progress.filter((p) => p.completed).map((p) => p.section_number));
  const maxCompleted = progress.filter((p) => p.completed).reduce((m, p) => Math.max(m, p.section_number), 0);
  const nextSection = Math.min(12, maxCompleted + 1);
  const cyclePct = Math.round((maxCompleted / 12) * 100);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-8 sm:py-10">
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--rl-purple)]">Optimized Leader Guide</p>
        <h2 className="mt-2 text-3xl font-bold tracking-tight text-[var(--fr-ink)] sm:text-4xl">My Cycle</h2>
        <p className="mt-1 text-sm text-[var(--fr-muted-ink)]">Twelve sections. Complete them in order to unlock your next Gap Report.</p>
      </div>

      <div className="mb-8 rounded-2xl border border-[var(--fr-hairline)] bg-white p-5 shadow-[var(--shadow-card)]">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium text-[var(--fr-ink)]">
            {maxCompleted === 12 ? "Cycle complete" : `Section ${nextSection} of 12`}
          </span>
          <span className="text-[var(--fr-muted-ink)]">{cyclePct}%</span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-[var(--fr-lilac)]">
          <div className="h-full rounded-full" style={{ width: `${cyclePct}%`, background: "linear-gradient(90deg,#5b19bf,#9a5cff)" }} />
        </div>
      </div>

      {!subscribed && (
        <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50/70 p-5 text-sm text-[var(--fr-ink)]">
          Get Fully Resourced ($97/mo) to work through the full 12-section cycle.
          <Button size="sm" asChild className="ml-4"><Link to="/fully-resourced">Subscribe</Link></Button>
        </div>
      )}

      <ol className="grid gap-3">
        {SECTIONS.map((s) => {
          const done = completedSet.has(s.number);
          const prevDone = s.number === 1 || completedSet.has(s.number - 1);
          const available = subscribed && prevDone && !done;
          const locked = !done && !available;
          const built = Boolean(s.path);

          return (
            <li
              key={s.number}
              className={`flex flex-col gap-3 rounded-2xl border p-5 sm:flex-row sm:items-center sm:justify-between ${
                done ? "border-emerald-200 bg-emerald-50/40" :
                available ? "border-[var(--rl-purple-soft)] bg-white shadow-[var(--shadow-card)]" :
                "border-[var(--fr-hairline)] bg-[var(--fr-surface)]/40"
              }`}
            >
              <div className="flex items-start gap-4 min-w-0">
                <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl text-sm font-semibold ${
                  done ? "bg-emerald-500 text-white" :
                  available ? "bg-[var(--rl-purple)] text-white" :
                  "bg-[var(--fr-lilac)] text-[var(--fr-muted-ink)]"
                }`}>
                  {done ? <Check className="h-5 w-5" /> : available ? <PlayCircle className="h-5 w-5" /> : <Lock className="h-5 w-5" />}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--rl-purple)]">Section {s.number}</p>
                  <h4 className="mt-1 text-base font-semibold text-[var(--fr-ink)]">{s.title}</h4>
                  <p className="mt-1 text-sm text-[var(--fr-muted-ink)]">{s.blurb}</p>
                </div>
              </div>
              <div className="shrink-0">
                {done && built && s.path && (
                  <Button variant="outline" size="sm" asChild><Link to={s.path as "/guide/section-1"}>Review</Link></Button>
                )}
                {available && built && s.path && (
                  <Button size="sm" asChild><Link to={s.path as "/guide/section-1"}>Start <ArrowRight className="ml-1.5 h-3.5 w-3.5" /></Link></Button>
                )}
                {!built && (
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wider text-[var(--fr-muted-ink)]">
                    {locked ? "Locked" : "Coming soon"}
                  </span>
                )}
              </div>
            </li>
          );
        })}
      </ol>
      {loading && <p className="mt-6 text-center text-xs text-[var(--fr-muted-ink)]">Loading progress…</p>}
    </div>
  );
}