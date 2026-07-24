import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Sparkles, Flame, ChevronDown, ChevronUp, Check, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { sectionUnlockStatus, formatUnlockDate } from "@/lib/section-unlock";
import { toast } from "sonner";

const PURPLE = "#5B2D8E";
const PURPLE_DEEP = "#2a0a64";

type CategoryKey = "si_personally" | "si_professionally" | "si_as_leader" | "si_relationships" | "si_health";

const CATEGORIES: { key: CategoryKey; label: string }[] = [
  { key: "si_personally", label: "Personally" },
  { key: "si_professionally", label: "Professionally" },
  { key: "si_as_leader", label: "As a leader" },
  { key: "si_relationships", label: "In relationships" },
  { key: "si_health", label: "In health" },
];

/** Local calendar-date string YYYY-MM-DD */
function localDateStr(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Days since epoch in local time — used to rotate the hero category once per calendar day. */
function localDaysSinceEpoch(d = new Date()) {
  const local = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  return Math.floor(local.getTime() / 86_400_000);
}

/** Read streak: consecutive days ending today or yesterday (member local time). */
function computeStreak(dates: Set<string>): number {
  const today = new Date();
  const start = new Date(today);
  if (!dates.has(localDateStr(today))) {
    start.setDate(start.getDate() - 1);
    if (!dates.has(localDateStr(start))) return 0;
  }
  let streak = 0;
  const cur = new Date(start);
  while (dates.has(localDateStr(cur))) {
    streak++;
    cur.setDate(cur.getDate() - 1);
  }
  return streak;
}

export function SuccessImageHero({
  cycleStart,
  section1Complete,
}: {
  cycleStart: Date | null;
  section1Complete: boolean;
}) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [values, setValues] = useState<Record<CategoryKey, string>>({
    si_personally: "",
    si_professionally: "",
    si_as_leader: "",
    si_relationships: "",
    si_health: "",
  });
  const [reads, setReads] = useState<Set<string>>(new Set());
  const [loaded, setLoaded] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [savingRead, setSavingRead] = useState(false);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const [{ data: row }, { data: readRows }] = await Promise.all([
        supabase
          .from("optimizer_section_progress")
          .select("data")
          .eq("user_id", user.id)
          .eq("section_number", 2)
          .maybeSingle(),
        supabase
          .from("success_image_reads")
          .select("read_date")
          .eq("user_id", user.id),
      ]);
      if (cancelled) return;
      const d = (row?.data ?? {}) as Partial<Record<CategoryKey, string>>;
      setValues({
        si_personally: (d.si_personally ?? "").toString(),
        si_professionally: (d.si_professionally ?? "").toString(),
        si_as_leader: (d.si_as_leader ?? "").toString(),
        si_relationships: (d.si_relationships ?? "").toString(),
        si_health: (d.si_health ?? "").toString(),
      });
      const set = new Set<string>();
      for (const r of (readRows ?? []) as { read_date: string }[]) set.add(r.read_date);
      setReads(set);
      setLoaded(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const filled = useMemo(
    () => CATEGORIES.filter((c) => values[c.key].trim().length > 0),
    [values],
  );
  const hasImage = filled.length > 0;

  const today = localDateStr();
  const readToday = reads.has(today);
  const streak = useMemo(() => computeStreak(reads), [reads]);

  const todayCategory = useMemo(() => {
    if (filled.length === 0) return null;
    const idx = localDaysSinceEpoch() % filled.length;
    return filled[idx];
  }, [filled]);

  async function markReadToday() {
    if (!user || readToday || savingRead) return;
    setSavingRead(true);
    const { error } = await supabase
      .from("success_image_reads")
      .insert({ user_id: user.id, read_date: today });
    setSavingRead(false);
    if (error && !/duplicate|conflict/i.test(error.message)) {
      toast.error("Couldn't log your read. Try again.");
      return;
    }
    setReads((prev) => {
      const next = new Set(prev);
      next.add(today);
      return next;
    });
  }

  const section2Status = sectionUnlockStatus(cycleStart, 2, section1Complete);

  // Frame — brand gradient, same on desktop and mobile.
  const frameStyle = {
    background: `linear-gradient(135deg, ${PURPLE_DEEP} 0%, ${PURPLE} 55%, #7c3fbf 100%)`,
  } as const;

  if (!loaded) {
    return (
      <div className="mb-6 rounded-3xl p-6 text-white shadow-[var(--shadow-card)] sm:p-8" style={frameStyle}>
        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-white/80">Your Success Image</div>
        <div className="mt-3 h-6 w-40 animate-pulse rounded bg-white/20" />
        <div className="mt-4 h-8 w-2/3 animate-pulse rounded bg-white/20" />
        <div className="mt-3 h-24 w-full animate-pulse rounded bg-white/10" />
      </div>
    );
  }

  // Empty state
  if (!hasImage) {
    const section2Unlocked = section2Status.unlocked;
    return (
      <div className="mb-6 rounded-3xl p-6 text-white shadow-[var(--shadow-card)] sm:p-8" style={frameStyle}>
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-white/80">
          <Sparkles className="h-4 w-4" /> Your Success Image
        </div>
        {section2Unlocked ? (
          <>
            <h3 className="mt-3 text-2xl font-bold leading-tight sm:text-3xl">
              Build your Success Image
            </h3>
            <p className="mt-3 max-w-2xl text-sm text-white/85 sm:text-base">
              Define what success looks like across five parts of your life. It becomes the
              daily anchor you'll come back to every morning.
            </p>
            <div className="mt-5">
              <Button
                onClick={() => navigate({ to: "/guide/section-2" })}
                className="bg-white text-[color:var(--rl-purple-deep)] hover:bg-white/90"
                style={{ color: PURPLE_DEEP }}
              >
                Build your Success Image
              </Button>
            </div>
          </>
        ) : (
          <>
            <h3 className="mt-3 text-2xl font-bold leading-tight sm:text-3xl">
              This is where your Success Image will live.
            </h3>
            <p className="mt-3 max-w-2xl text-sm text-white/85 sm:text-base">
              As you work through Section 1, start thinking about what success really looks
              like for you — personally, professionally, as a leader, in relationships, and
              in health.
            </p>
            <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium text-white/90 ring-1 ring-inset ring-white/20">
              <Lock className="h-3.5 w-3.5" />
              {section2Status.unlockAt
                ? `Unlocks ${formatUnlockDate(section2Status.unlockAt)}`
                : "Unlocks in Week 2"}
            </div>
          </>
        )}
      </div>
    );
  }

  const cat = todayCategory!;
  const answer = values[cat.key];

  return (
    <div className="mb-6 overflow-hidden rounded-3xl text-white shadow-[var(--shadow-card)]" style={frameStyle}>
      <div className="p-6 sm:p-8">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-white/80">Your Success Image</div>
            <div className="mt-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-white/70">
              <Sparkles className="h-4 w-4" />
              <span>Today · {cat.label}</span>
            </div>
          </div>
          <div
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-xs font-semibold text-white ring-1 ring-inset ring-white/25"
            title="Consecutive days you've read your Success Image"
          >
            <Flame className="h-3.5 w-3.5 text-amber-300" />
            {streak}-day read streak
          </div>
        </div>

        <p className="mt-5 whitespace-pre-wrap text-2xl font-semibold leading-snug tracking-tight sm:text-3xl">
          {`\u201C${answer}\u201D`}
        </p>
        <p className="mt-2 text-xs font-medium text-white/70 sm:text-sm">
          A different part of your Success Image each morning.
        </p>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          {readToday ? (
            <span className="inline-flex items-center gap-2 rounded-full bg-white/20 px-4 py-2 text-sm font-semibold text-white ring-1 ring-inset ring-white/30">
              <Check className="h-4 w-4" /> Read today
            </span>
          ) : (
            <Button
              onClick={markReadToday}
              disabled={savingRead}
              className="bg-white font-semibold hover:bg-white/90"
              style={{ color: PURPLE_DEEP }}
            >
              Mark as read today
            </Button>
          )}
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-4 py-2 text-sm font-medium text-white ring-1 ring-inset ring-white/20 transition hover:bg-white/15"
          >
            {expanded ? (
              <>
                Hide full image <ChevronUp className="h-4 w-4" />
              </>
            ) : (
              <>
                See full image <ChevronDown className="h-4 w-4" />
              </>
            )}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-white/15 bg-black/10 p-6 sm:p-8">
          <dl className="grid gap-5 sm:grid-cols-2">
            {CATEGORIES.map((c) => {
              const v = values[c.key];
              return (
                <div key={c.key}>
                  <dt className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/70">
                    {c.label}
                  </dt>
                  <dd className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-white/95">
                    {v.trim().length > 0 ? v : <span className="italic text-white/50">Not yet written</span>}
                  </dd>
                </div>
              );
            })}
          </dl>
        </div>
      )}
    </div>
  );
}