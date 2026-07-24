import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronUp, Check, Circle, AlertTriangle, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";

/* ---------- date helpers (member local) ---------- */
function localDateStr(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function startOfLocalDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
function mondayOfWeek(d: Date) {
  const local = startOfLocalDay(d);
  const dow = local.getDay();
  const daysFromMon = (dow + 6) % 7;
  local.setDate(local.getDate() - daysFromMon);
  return local;
}
function parseDateOnly(s: string): Date | null {
  if (!s) return null;
  const [y, m, d] = s.split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}
function formatDue(d: Date) {
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/* ---------- action inventory: only dated, concrete "this week" execute steps ---------- */
type ActionDef = {
  section: number;
  label: string; // e.g. "Skill Development"
  actionField: string; // key in section.data holding the text
  dateField: string;   // key in section.data holding the YYYY-MM-DD due date
};

const SIMPLE_ACTIONS: ActionDef[] = [
  { section: 3, label: "Fuel",                actionField: "fuel_execute_action",    dateField: "fuel_execute_date" },
  { section: 3, label: "Skill Development",   actionField: "skill_execute_step",     dateField: "skill_execute_date" },
  { section: 3, label: "Success Drivers",     actionField: "drivers_execute_action", dateField: "drivers_execute_date" },
];

/** Sections whose section-level commitment_date pairs with each Part's execute field. */
type SharedDateSection = { section: number; dateField: string; parts: { label: string; actionField: string }[] };
const SHARED_DATE_SECTIONS: SharedDateSection[] = [
  { section: 6, dateField: "commitment_date", parts: [
    { label: "Lead Yourself · Next cycle behavior", actionField: "d1_execute" },
    { label: "Lead Others · First action",          actionField: "d2_execute" },
    { label: "Alignment · First action",            actionField: "d3_execute" },
    { label: "Close a gap · First step",            actionField: "d4_execute" },
    { label: "Principle in action",                 actionField: "d5_execute" },
  ]},
];

type LiveAction = {
  key: string;
  section: number;
  label: string;
  text: string;
  due: Date;
};

type ActionState = {
  action_key: string;
  done_at: string | null;
  closed_at: string | null;
  carried_at: string | null;
};

/* ---------- component ---------- */
export function YourActionsCard({
  unlockedSections,
  currentSection,
}: {
  unlockedSections: number[];
  currentSection: number;
}) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false); // always closed on mount by design
  const [showUnfinished, setShowUnfinished] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // habit list (from section 2 plan_daily_behaviors, fallback to daily_behaviors)
  const [habits, setHabits] = useState<string[]>([]);
  const [todayChecks, setTodayChecks] = useState<Set<string>>(new Set());
  const [savingHabit, setSavingHabit] = useState<string | null>(null);
  const [s2Completed, setS2Completed] = useState(false);

  // live actions
  const [actions, setActions] = useState<LiveAction[]>([]);
  const [state, setState] = useState<Record<string, ActionState>>({});
  const [savingAction, setSavingAction] = useState<string | null>(null);

  const today = localDateStr();

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const [{ data: progressRows }, { data: habitRows }, { data: stateRows }] = await Promise.all([
        supabase
          .from("optimizer_section_progress")
          .select("section_number, data, completed")
          .eq("user_id", user.id)
          .in("section_number", Array.from(new Set([2, ...unlockedSections]))),
        supabase
          .from("daily_habit_checks")
          .select("habit_key")
          .eq("user_id", user.id)
          .eq("check_date", today),
        supabase
          .from("weekly_action_state")
          .select("action_key, done_at, closed_at, carried_at")
          .eq("user_id", user.id),
      ]);
      if (cancelled) return;

      // habits from section 2
      const rows = (progressRows ?? []) as { section_number: number; data: Record<string, unknown> | null }[];
      const s2Row = rows.find((r) => r.section_number === 2) as
        | { section_number: number; data: Record<string, unknown> | null; completed?: boolean }
        | undefined;
      const s2 = s2Row?.data ?? {};
      setS2Completed(Boolean(s2Row?.completed));
      const rawPlan = Array.isArray((s2 as Record<string, unknown>).plan_daily_behaviors)
        ? ((s2 as Record<string, unknown>).plan_daily_behaviors as unknown[])
        : [];
      const rawDaily = Array.isArray((s2 as Record<string, unknown>).daily_behaviors)
        ? ((s2 as Record<string, unknown>).daily_behaviors as unknown[])
        : [];
      const pool = (rawPlan.length > 0 ? rawPlan : rawDaily)
        .map((v) => (typeof v === "string" ? v.trim() : ""))
        .filter((s) => s.length > 0);
      setHabits(pool);

      setTodayChecks(new Set(((habitRows ?? []) as { habit_key: string }[]).map((r) => r.habit_key)));

      // actions from unlocked sections
      const list: LiveAction[] = [];
      for (const sn of unlockedSections) {
        const data = (rows.find((r) => r.section_number === sn)?.data ?? {}) as Record<string, unknown>;
        for (const def of SIMPLE_ACTIONS) {
          if (def.section !== sn) continue;
          const text = String(data[def.actionField] ?? "").trim();
          const dateStr = String(data[def.dateField] ?? "").trim();
          const due = parseDateOnly(dateStr);
          if (text && due) {
            list.push({ key: `s${sn}_${def.actionField}`, section: sn, label: def.label, text, due });
          }
        }
        for (const shared of SHARED_DATE_SECTIONS) {
          if (shared.section !== sn) continue;
          const dateStr = String(data[shared.dateField] ?? "").trim();
          const due = parseDateOnly(dateStr);
          if (!due) continue;
          for (const p of shared.parts) {
            const text = String(data[p.actionField] ?? "").trim();
            if (text) list.push({ key: `s${sn}_${p.actionField}`, section: sn, label: p.label, text, due });
          }
        }
        // Section 4: action_rows[].first_action + target_date
        if (sn === 4) {
          const arr = Array.isArray(data.action_rows) ? (data.action_rows as unknown[]) : [];
          arr.forEach((row, i) => {
            const r = row as Record<string, unknown>;
            const text = String(r.first_action ?? "").trim();
            const dateStr = String(r.target_date ?? "").trim();
            const person = String(r.person ?? "").trim();
            const due = parseDateOnly(dateStr);
            if (text && due) {
              list.push({
                key: `s4_action_${i}`,
                section: 4,
                label: `Lead Others${person ? ` · ${person}` : ""}`,
                text,
                due,
              });
            }
          });
        }
      }
      setActions(list);

      const map: Record<string, ActionState> = {};
      for (const r of (stateRows ?? []) as ActionState[]) map[r.action_key] = r;
      setState(map);

      setLoaded(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [user, today, unlockedSections]);

  const { thisWeek, unfinished, doneThisWeek } = useMemo(() => {
    const now = new Date();
    const weekStart = mondayOfWeek(now);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);
    const priorWeekStart = new Date(weekStart);
    priorWeekStart.setDate(priorWeekStart.getDate() - 7);

    const thisWeek: (LiveAction & { status: "due" | "still-open" | "done" })[] = [];
    const unfinished: LiveAction[] = [];
    let doneThisWeek = 0;

    for (const a of actions) {
      const s = state[a.key];
      const isDone = Boolean(s?.done_at);
      const isClosed = Boolean(s?.closed_at);
      const carried = s?.carried_at ? new Date(s.carried_at) : null;
      const carriedThisWeek = carried && carried >= weekStart;

      if (isDone) {
        const doneAt = new Date(s!.done_at!);
        if (doneAt >= weekStart && doneAt < weekEnd) {
          thisWeek.push({ ...a, status: "done" });
          doneThisWeek++;
        }
        continue;
      }
      if (isClosed) continue; // hidden from main flow

      const inThisWeek = a.due >= weekStart && a.due < weekEnd;
      const inPriorWeek = a.due >= priorWeekStart && a.due < weekStart;
      if (inThisWeek || carriedThisWeek) {
        thisWeek.push({ ...a, status: a.due < startOfLocalDay(now) ? "still-open" : "due" });
      } else if (inPriorWeek) {
        // Still open from last week — inline in the list
        thisWeek.push({ ...a, status: "still-open" });
      } else if (a.due < priorWeekStart) {
        unfinished.push(a);
      } else {
        // future beyond this week — treat as due (upcoming)
        thisWeek.push({ ...a, status: "due" });
      }
    }
    // sort: still-open first, then due asc, then done
    thisWeek.sort((a, b) => {
      const order = { "still-open": 0, due: 1, done: 2 } as const;
      if (order[a.status] !== order[b.status]) return order[a.status] - order[b.status];
      return a.due.getTime() - b.due.getTime();
    });
    return { thisWeek, unfinished, doneThisWeek };
  }, [actions, state]);

  async function toggleHabit(habitKey: string) {
    if (!user || savingHabit) return;
    setSavingHabit(habitKey);
    const isChecked = todayChecks.has(habitKey);
    if (isChecked) {
      const { error } = await supabase
        .from("daily_habit_checks")
        .delete()
        .eq("user_id", user.id)
        .eq("habit_key", habitKey)
        .eq("check_date", today);
      if (!error) {
        setTodayChecks((prev) => {
          const next = new Set(prev);
          next.delete(habitKey);
          return next;
        });
      } else {
        toast.error("Couldn't update. Try again.");
      }
    } else {
      const { error } = await supabase
        .from("daily_habit_checks")
        .insert({ user_id: user.id, habit_key: habitKey, check_date: today });
      if (!error || /duplicate|conflict/i.test(error.message)) {
        setTodayChecks((prev) => {
          const next = new Set(prev);
          next.add(habitKey);
          return next;
        });
      } else {
        toast.error("Couldn't update. Try again.");
      }
    }
    setSavingHabit(null);
  }

  async function upsertState(key: string, patch: Partial<ActionState>) {
    if (!user) return;
    setSavingAction(key);
    const merged: ActionState = {
      action_key: key,
      done_at: state[key]?.done_at ?? null,
      closed_at: state[key]?.closed_at ?? null,
      carried_at: state[key]?.carried_at ?? null,
      ...patch,
    };
    const { error } = await supabase
      .from("weekly_action_state")
      .upsert({ user_id: user.id, ...merged }, { onConflict: "user_id,action_key" });
    if (error) {
      toast.error("Couldn't save. Try again.");
    } else {
      setState((prev) => ({ ...prev, [key]: merged }));
    }
    setSavingAction(null);
  }

  const habitsDoneToday = habits.filter((_, i) => todayChecks.has(`s2_habit_${i}`)).length;
  const stillOpenCount = thisWeek.filter((a) => a.status === "still-open").length;

  const hasHabits = habits.length > 0;
  const hasWeekly = thisWeek.length > 0 || unfinished.length > 0;
  const hasAny = hasHabits || hasWeekly;

  if (!loaded) return null;

  // Empty everything → gentle placeholder card, still collapsed-first.
  if (!hasAny) {
    return (
      <div className="mb-6 rounded-3xl border border-[var(--fr-hairline)] bg-white p-5 shadow-[var(--shadow-card)] sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--rl-purple)]">Your actions</div>
            <p className="mt-1 text-sm text-[var(--fr-muted-ink)]">
              Your daily habits and action steps will show up here as you work through your sections.
            </p>
          </div>
          {s2Completed && (
            <a
              href={`/guide/section-${currentSection}`}
              className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[var(--fr-lilac)] px-3 py-1.5 text-xs font-semibold text-[var(--rl-purple)] hover:brightness-95"
            >
              Open Section {currentSection} <ArrowRight className="h-3.5 w-3.5" />
            </a>
          )}
        </div>
      </div>
    );
  }

  const summaryParts: string[] = [];
  if (hasHabits) summaryParts.push(`${habitsDoneToday} of ${habits.length} habits today`);
  if (thisWeek.length > 0) summaryParts.push(`${thisWeek.length} this week`);
  if (stillOpenCount > 0) summaryParts.push(`${stillOpenCount} still open`);
  const summary = summaryParts.join(" · ");

  return (
    <div className="mb-6 overflow-hidden rounded-3xl border border-[var(--fr-hairline)] bg-white shadow-[var(--shadow-card)]">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-4 p-5 text-left sm:p-6"
      >
        <div className="min-w-0">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--rl-purple)]">Your actions</div>
          <div className="mt-1 text-base font-semibold text-[var(--fr-ink)]">{summary || "Nothing tracked yet"}</div>
        </div>
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[var(--fr-lilac)] text-[var(--rl-purple)]">
          {open ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
        </span>
      </button>

      {open && (
        <div className="border-t border-[var(--fr-hairline)] p-5 sm:p-6">
          {hasHabits && (
            <section>
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold uppercase tracking-[0.12em] text-[var(--fr-muted-ink)]">Today</h4>
                <span className="text-xs font-semibold text-[var(--fr-muted-ink)]">
                  {habitsDoneToday} of {habits.length} today
                </span>
              </div>
              <ul className="mt-3 space-y-2">
                {habits.map((h, i) => {
                  const key = `s2_habit_${i}`;
                  const done = todayChecks.has(key);
                  return (
                    <li key={key}>
                      <button
                        type="button"
                        onClick={() => toggleHabit(key)}
                        disabled={savingHabit === key}
                        className={`flex w-full items-start gap-3 rounded-xl border p-3 text-left transition ${
                          done
                            ? "border-emerald-200 bg-emerald-50/70"
                            : "border-[var(--fr-hairline)] bg-white hover:bg-[var(--fr-lilac)]/40"
                        }`}
                      >
                        <span
                          className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border ${
                            done ? "border-emerald-500 bg-emerald-500 text-white" : "border-[var(--fr-hairline)] text-transparent"
                          }`}
                        >
                          {done ? <Check className="h-3.5 w-3.5" /> : <Circle className="h-3.5 w-3.5 opacity-0" />}
                        </span>
                        <span className={`text-sm ${done ? "text-[var(--fr-muted-ink)] line-through" : "text-[var(--fr-ink)]"}`}>
                          {h}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          {thisWeek.length > 0 && (
            <section className={hasHabits ? "mt-6" : ""}>
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold uppercase tracking-[0.12em] text-[var(--fr-muted-ink)]">This week</h4>
                {stillOpenCount > 0 && (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700">
                    <AlertTriangle className="h-3.5 w-3.5" /> {stillOpenCount} still open
                  </span>
                )}
              </div>
              <ul className="mt-3 space-y-2">
                {thisWeek.map((a) => {
                  const done = a.status === "done";
                  const stillOpen = a.status === "still-open";
                  return (
                    <li key={a.key}>
                      <div
                        className={`flex items-start gap-3 rounded-xl border p-3 ${
                          done
                            ? "border-emerald-200 bg-emerald-50/70"
                            : stillOpen
                              ? "border-amber-200 bg-amber-50/70"
                              : "border-[var(--fr-hairline)] bg-white"
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() =>
                            upsertState(a.key, { done_at: done ? null : new Date().toISOString() })
                          }
                          disabled={savingAction === a.key}
                          className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border ${
                            done ? "border-emerald-500 bg-emerald-500 text-white" : "border-[var(--fr-hairline)]"
                          }`}
                          aria-label={done ? "Mark not done" : "Mark done"}
                        >
                          {done ? <Check className="h-3.5 w-3.5" /> : <span className="h-2 w-2 rounded-full" />}
                        </button>
                        <div className="min-w-0 flex-1">
                          <p className={`text-sm ${done ? "text-[var(--fr-muted-ink)] line-through" : "text-[var(--fr-ink)]"}`}>
                            {a.text}
                          </p>
                          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--fr-muted-ink)]">
                            <span>Section {a.section} · {a.label}</span>
                            <span>Due {formatDue(a.due)}</span>
                            {stillOpen && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 font-semibold text-amber-800">
                                Still open
                              </span>
                            )}
                          </div>
                          {stillOpen && (
                            <div className="mt-2 flex flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={() => upsertState(a.key, { carried_at: new Date().toISOString() })}
                                className="rounded-full bg-[var(--fr-lilac)] px-3 py-1 text-xs font-semibold text-[var(--rl-purple)] hover:brightness-95"
                              >
                                Carry into this week
                              </button>
                              <button
                                type="button"
                                onClick={() => upsertState(a.key, { closed_at: new Date().toISOString() })}
                                className="rounded-full border border-[var(--fr-hairline)] px-3 py-1 text-xs font-semibold text-[var(--fr-muted-ink)] hover:bg-white"
                              >
                                Close it
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
              {doneThisWeek > 0 && (
                <p className="mt-2 text-xs text-[var(--fr-muted-ink)]">{doneThisWeek} done this week</p>
              )}
            </section>
          )}

          {unfinished.length > 0 && (
            <section className="mt-6">
              <button
                type="button"
                onClick={() => setShowUnfinished((v) => !v)}
                className="flex w-full items-center justify-between text-sm font-semibold text-[var(--fr-muted-ink)] hover:text-[var(--fr-ink)]"
              >
                <span>Unfinished ({unfinished.length})</span>
                {showUnfinished ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
              {showUnfinished && (
                <ul className="mt-3 space-y-2">
                  {unfinished.map((a) => (
                    <li key={a.key} className="rounded-xl border border-[var(--fr-hairline)] bg-white p-3">
                      <p className="text-sm text-[var(--fr-ink)]">{a.text}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--fr-muted-ink)]">
                        <span>Section {a.section} · {a.label}</span>
                        <span>Was due {formatDue(a.due)}</span>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => upsertState(a.key, { carried_at: new Date().toISOString(), closed_at: null })}
                          className="rounded-full bg-[var(--fr-lilac)] px-3 py-1 text-xs font-semibold text-[var(--rl-purple)] hover:brightness-95"
                        >
                          Reopen into this week
                        </button>
                        <button
                          type="button"
                          onClick={() => upsertState(a.key, { done_at: new Date().toISOString() })}
                          className="rounded-full border border-[var(--fr-hairline)] px-3 py-1 text-xs font-semibold text-[var(--fr-muted-ink)] hover:bg-white"
                        >
                          Mark done
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}
        </div>
      )}
    </div>
  );
}