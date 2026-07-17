import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, ArrowRight, Check, X } from "lucide-react";
import { toast } from "sonner";
import { SectionVideo } from "@/components/scale/SectionVideo";
import { GapReportPanel } from "@/components/scale/GapReportPanel";

export const Route = createFileRoute("/_authenticated/guide/section-7")({
  head: () => ({ meta: [{ title: "Section 7 · Lead for Results" }] }),
  component: SectionSevenPage,
});

const TOTAL_SECTIONS = 12;
const TOTAL_STEPS = 9;

type DriverStatus = "" | "on_track" | "behind" | "needs_revision";

const GAP_CAUSE_CHIPS = [
  "Unclear priorities",
  "Overcommitted calendar",
  "Low follow-through",
  "Wrong people in wrong seats",
  "Avoiding a hard decision",
  "Weak execution rhythm",
  "Distraction / reactivity",
  "Skill or knowledge gap",
  "Energy / capacity leak",
  "Standards slipping",
];

interface DriverRow {
  name: string;
  status: DriverStatus;
}

interface MarkerRow {
  driver: string;
  marker: string;
}

interface PriorityRow {
  priority: string;
  why: string;
  first_action: string;
}

interface ActivityRow {
  activity: string;
  when: string;
  outcome: string;
}

interface SectionData {
  step: number;
  // Part 1 — Success Image Review
  p1_current_image: string;
  p1_still_true: string;
  p1_needs_sharpening: string;
  p1_looks_like: string;
  p1_execute: string;
  p1_measure: string;
  // Part 2 — Success Driver Review
  p2_drivers: DriverRow[]; // 5
  p2_which: string;
  p2_why: string;
  p2_understand: string;
  p2_build: string;
  p2_execute: string;
  p2_measure: string;
  // Part 3 — Success Marker Builder
  p3_markers: MarkerRow[]; // 5 rows
  p3_top_marker: string;
  p3_why: string;
  p3_execute: string;
  p3_measure: string;
  // Part 4 — Closing the Gap
  p4_causes: string[];
  p4_causes_other: string;
  p4_evidence: string;
  p4_must_change: string;
  p4_understand: string;
  p4_execute: string;
  p4_measure: string;
  // Part 5 — My Highest Priorities
  p5_priorities: PriorityRow[]; // 3
  p5_most_attention: string;
  p5_why: string;
  p5_execute: string;
  p5_measure: string;
  // Part 6 — Activity Plan
  p6_activities: ActivityRow[]; // 4
  p6_focus_week: string;
  p6_execute: string;
  p6_measure: string;
  // Part 7 — Results Review
  p7_wins: string;
  p7_missed: string;
  p7_learning: string;
  p7_adjust: string;
  p7_review_date: string;
  // Part 8 — Carry It Forward
  p8_lesson: string;
  p8_principle_4: string;
  p8_understand: string;
  p8_build: string;
  p8_execute: string;
  p8_measure: string;
  // Commitment
  committed: boolean;
  commitment_date: string;
}

const EMPTY: SectionData = {
  step: 1,
  p1_current_image: "",
  p1_still_true: "",
  p1_needs_sharpening: "",
  p1_looks_like: "",
  p1_execute: "",
  p1_measure: "",
  p2_drivers: Array.from({ length: 5 }, () => ({ name: "", status: "" as DriverStatus })),
  p2_which: "",
  p2_why: "",
  p2_understand: "",
  p2_build: "",
  p2_execute: "",
  p2_measure: "",
  p3_markers: Array.from({ length: 5 }, () => ({ driver: "", marker: "" })),
  p3_top_marker: "",
  p3_why: "",
  p3_execute: "",
  p3_measure: "",
  p4_causes: [],
  p4_causes_other: "",
  p4_evidence: "",
  p4_must_change: "",
  p4_understand: "",
  p4_execute: "",
  p4_measure: "",
  p5_priorities: Array.from({ length: 3 }, () => ({ priority: "", why: "", first_action: "" })),
  p5_most_attention: "",
  p5_why: "",
  p5_execute: "",
  p5_measure: "",
  p6_activities: Array.from({ length: 4 }, () => ({ activity: "", when: "", outcome: "" })),
  p6_focus_week: "",
  p6_execute: "",
  p6_measure: "",
  p7_wins: "",
  p7_missed: "",
  p7_learning: "",
  p7_adjust: "",
  p7_review_date: "",
  p8_lesson: "",
  p8_principle_4: "",
  p8_understand: "",
  p8_build: "",
  p8_execute: "",
  p8_measure: "",
  committed: false,
  commitment_date: "",
};

function SectionSevenPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [d, setD] = useState<SectionData>(EMPTY);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loaded = useRef(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: row } = await supabase
        .from("optimizer_section_progress")
        .select("*")
        .eq("user_id", user.id)
        .eq("section_number", 7)
        .maybeSingle();
      if (row?.data) {
        setD({ ...EMPTY, ...(row.data as unknown as Partial<SectionData>) } as SectionData);
      }
      loaded.current = true;
      setLoading(false);
    })();
  }, [user]);

  const step = d.step;

  const isComplete = useMemo(() => {
    return (
      d.p1_execute.trim().length > 0 &&
      d.p2_drivers.some((r) => r.status !== "") && d.p2_which.trim().length > 0 &&
      d.p3_markers.some((r) => r.marker.trim().length > 0) && d.p3_top_marker.trim().length > 0 &&
      (d.p4_causes.length > 0 || d.p4_causes_other.trim().length > 0) && d.p4_must_change.trim().length > 0 &&
      d.p5_priorities.some((r) => r.priority.trim().length > 0) && d.p5_most_attention.trim().length > 0 &&
      d.p6_activities.some((r) => r.activity.trim().length > 0) && d.p6_execute.trim().length > 0 &&
      d.p7_review_date.length > 0 && d.p7_adjust.trim().length > 0 &&
      d.p8_lesson.trim().length > 0 && d.p8_principle_4.trim().length > 0 &&
      d.committed && d.commitment_date.length > 0
    );
  }, [d]);

  useEffect(() => {
    if (!user || !loaded.current) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      await supabase.from("optimizer_section_progress").upsert(
        [{ user_id: user.id, section_number: 7, data: d as unknown as never, completed: isComplete }],
        { onConflict: "user_id,section_number" },
      );
    }, 600);
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
  }, [user, d, isComplete]);

  function update<K extends keyof SectionData>(key: K, value: SectionData[K]) {
    setD((p) => ({ ...p, [key]: value }));
  }
  function goStep(next: number) {
    setD((p) => ({ ...p, step: Math.max(1, Math.min(TOTAL_STEPS, next)) }));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  const canAdvance = useMemo(() => stepIsValid(step, d), [step, d]);

  async function finish() {
    if (!isComplete || !user) {
      toast.error("Fill every part and sign the commitment to finish.");
      return;
    }
    const snapshot = {
      section: 7,
      success_markers: d.p3_markers
        .filter((r) => r.marker.trim().length > 0)
        .map((r) => ({ driver: r.driver, marker: r.marker })),
      top_marker: d.p3_top_marker,
      priorities: d.p5_priorities.filter((r) => r.priority.trim().length > 0),
      review_date: d.p7_review_date,
      commitment_date: d.commitment_date,
    };
    const { error } = await supabase.from("leadership_dashboard_snapshots").insert([
      { user_id: user.id, data: snapshot as unknown as never },
    ]);
    if (error) {
      toast.error("Couldn't save your snapshot. Please try again.");
      return;
    }
    toast.success("Section 7 complete.");
    navigate({ to: "/cycle" });
  }

  if (loading) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-4 pb-32 pt-8 sm:px-6">
      <div className="mb-6">
        <Link to="/cycle" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> My Cycle
        </Link>
      </div>

      <SectionVideo sectionNumber={7} sectionTitle="Lead for Results" />

      <div className="mb-6">
        <div className="flex items-center justify-between text-xs font-medium uppercase tracking-widest text-muted-foreground">
          <span>Section 7 of {TOTAL_SECTIONS}</span>
          <span>Part {step} of {TOTAL_STEPS}</span>
        </div>
        <Progress value={(step / TOTAL_STEPS) * 100} className="mt-2 h-1.5" />
        <GapReportPanel className="mt-4" />
        <h1 className="mt-4 font-display text-3xl font-semibold text-foreground sm:text-4xl">{stepTitle(step)}</h1>
      </div>

      <div className="space-y-8">
        {step === 1 && <Part1 d={d} update={update} />}
        {step === 2 && <Part2 d={d} update={update} />}
        {step === 3 && <Part3 d={d} update={update} />}
        {step === 4 && <Part4 d={d} update={update} />}
        {step === 5 && <Part5 d={d} update={update} />}
        {step === 6 && <Part6 d={d} update={update} />}
        {step === 7 && <Part7 d={d} update={update} />}
        {step === 8 && <Part8 d={d} update={update} />}
        {step === 9 && <StepCommitment d={d} update={update} />}
      </div>

      <div className="mt-10 flex items-center justify-between border-t border-border pt-5">
        <Button variant="ghost" onClick={() => goStep(step - 1)} disabled={step === 1}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
        <span className="text-xs text-muted-foreground">Saved automatically.</span>
        {step < TOTAL_STEPS ? (
          <Button onClick={() => goStep(step + 1)} disabled={!canAdvance} className="bg-[#433993] text-white hover:bg-[#433993]/90" size="lg">
            Continue <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        ) : (
          <Button onClick={finish} disabled={!isComplete} className="bg-[#433993] text-white hover:bg-[#433993]/90" size="lg">
            Finish Section 7 <Check className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>
    </main>
  );
}

function stepTitle(step: number) {
  switch (step) {
    case 1: return "Part 1 — Success Image Review";
    case 2: return "Part 2 — Success Driver Review";
    case 3: return "Part 3 — Success Marker Builder";
    case 4: return "Part 4 — Closing the Gap";
    case 5: return "Part 5 — My Highest Priorities";
    case 6: return "Part 6 — Activity Plan";
    case 7: return "Part 7 — Results Review";
    case 8: return "Part 8 — Carry It Forward";
    case 9: return "Leadership Commitment";
    default: return "";
  }
}

function stepIsValid(step: number, d: SectionData): boolean {
  switch (step) {
    case 1: return d.p1_execute.trim().length > 0;
    case 2: return d.p2_drivers.some((r) => r.status !== "") && d.p2_which.trim().length > 0;
    case 3: return d.p3_markers.some((r) => r.marker.trim().length > 0) && d.p3_top_marker.trim().length > 0;
    case 4: return (d.p4_causes.length > 0 || d.p4_causes_other.trim().length > 0) && d.p4_must_change.trim().length > 0;
    case 5: return d.p5_priorities.some((r) => r.priority.trim().length > 0) && d.p5_most_attention.trim().length > 0;
    case 6: return d.p6_activities.some((r) => r.activity.trim().length > 0) && d.p6_execute.trim().length > 0;
    case 7: return d.p7_review_date.length > 0 && d.p7_adjust.trim().length > 0;
    case 8: return d.p8_lesson.trim().length > 0 && d.p8_principle_4.trim().length > 0;
    case 9: return d.committed && d.commitment_date.length > 0;
    default: return true;
  }
}

type UpdateFn = <K extends keyof SectionData>(k: K, v: SectionData[K]) => void;

function Part1({ d, update }: { d: SectionData; update: UpdateFn }) {
  return (
    <div className="space-y-6">
      <SectionBlock label="Evaluate — Your current Success Image">
        <LabeledTextarea label="What is the Success Image you're leading toward right now?" value={d.p1_current_image} onChange={(v) => update("p1_current_image", v)} />
      </SectionBlock>
      <SectionBlock label="Identify — What's still true">
        <LabeledTextarea label="What part of that image is still true and worth leading toward?" value={d.p1_still_true} onChange={(v) => update("p1_still_true", v)} />
      </SectionBlock>
      <SectionBlock label="Understand — What needs sharpening">
        <LabeledTextarea label="What part of that image needs to be sharpened, updated, or replaced?" value={d.p1_needs_sharpening} onChange={(v) => update("p1_needs_sharpening", v)} />
      </SectionBlock>
      <SectionBlock label="Build a Plan — What success looks like from here">
        <LabeledTextarea label="What does success actually look like from here? Describe it in real detail." value={d.p1_looks_like} onChange={(v) => update("p1_looks_like", v)} />
      </SectionBlock>
      <SectionBlock label="Execute — First step to lead toward this sharper image">
        <LabeledInput label="The first step you'll take this week to lead toward it" value={d.p1_execute} onChange={(v) => update("p1_execute", v)} />
      </SectionBlock>
      <SectionBlock label="Measure — How you'll know you're moving toward it">
        <LabeledTextarea label="How will you know you're actually moving toward that Success Image?" value={d.p1_measure} onChange={(v) => update("p1_measure", v)} />
      </SectionBlock>
    </div>
  );
}

function Part2({ d, update }: { d: SectionData; update: UpdateFn }) {
  const opts: { v: DriverStatus; label: string }[] = [
    { v: "on_track", label: "On Track" },
    { v: "behind", label: "Behind" },
    { v: "needs_revision", label: "Needs Revision" },
  ];
  return (
    <div className="space-y-6">
      <SectionBlock label="Evaluate — Rate each of your 5 Success Drivers" hint="Name each driver and rate its current status.">
        <div className="space-y-2">
          {d.p2_drivers.map((r, i) => (
            <div key={i} className="flex flex-col gap-2 rounded-lg border border-border bg-background/60 p-3 sm:flex-row sm:items-center sm:justify-between">
              <Input value={r.name} onChange={(e) => {
                const arr = [...d.p2_drivers]; arr[i] = { ...r, name: e.target.value }; update("p2_drivers", arr);
              }} placeholder={`Success Driver ${i + 1}`} className="sm:max-w-xs" />
              <div className="flex flex-wrap gap-1">
                {opts.map(({ v, label }) => {
                  const active = r.status === v;
                  return (
                    <button
                      key={v}
                      type="button"
                      onClick={() => {
                        const arr = [...d.p2_drivers]; arr[i] = { ...r, status: active ? "" : v }; update("p2_drivers", arr);
                      }}
                      className={`rounded-md px-3 py-1 text-xs font-semibold uppercase transition ${active ? "bg-[#433993] text-white" : "bg-secondary/60 text-foreground ring-1 ring-inset ring-border hover:ring-[#433993]/40"}`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </SectionBlock>
      <SectionBlock label="Identify — Which driver deserves attention">
        <LabeledTextarea label="Which Success Driver deserves your attention most right now?" value={d.p2_which} onChange={(v) => update("p2_which", v)} />
      </SectionBlock>
      <SectionBlock label="Understand — Why it deserves that attention">
        <LabeledTextarea label="Why does that driver deserve the attention? What's it going to cost you if you ignore it?" value={d.p2_why} onChange={(v) => update("p2_why", v)} />
      </SectionBlock>
      <SectionBlock label="Build a Plan — What needs to shift for that driver">
        <LabeledTextarea label="What needs to shift for that driver to move forward?" value={d.p2_understand} onChange={(v) => update("p2_understand", v)} />
      </SectionBlock>
      <SectionBlock label="Execute — First action for that driver">
        <LabeledInput label="The first action you'll take this week on that driver" value={d.p2_execute} onChange={(v) => update("p2_execute", v)} />
      </SectionBlock>
      <SectionBlock label="Measure — How you'll know the driver is back on track">
        <LabeledTextarea label="How will you know that driver is back on track?" value={d.p2_measure} onChange={(v) => update("p2_measure", v)} />
      </SectionBlock>
    </div>
  );
}

function Part3({ d, update }: { d: SectionData; update: UpdateFn }) {
  return (
    <div className="space-y-6">
      <SectionBlock label="Success Marker Builder" hint="For each Success Driver, define the marker that proves progress.">
        <div className="space-y-2">
          {d.p3_markers.map((r, i) => (
            <div key={i} className="grid grid-cols-1 gap-2 rounded-lg border border-border bg-background/60 p-3 sm:grid-cols-2">
              <Input value={r.driver} onChange={(e) => {
                const arr = [...d.p3_markers]; arr[i] = { ...r, driver: e.target.value }; update("p3_markers", arr);
              }} placeholder={`Success Driver ${i + 1}`} />
              <Input value={r.marker} onChange={(e) => {
                const arr = [...d.p3_markers]; arr[i] = { ...r, marker: e.target.value }; update("p3_markers", arr);
              }} placeholder="Success Marker" />
            </div>
          ))}
        </div>
      </SectionBlock>
      <SectionBlock label="Identify — The marker that matters most over the next 30 days">
        <LabeledInput label="Which Success Marker matters most over the next 30 days?" value={d.p3_top_marker} onChange={(v) => update("p3_top_marker", v)} />
      </SectionBlock>
      <SectionBlock label="Understand — Why that marker matters most">
        <LabeledTextarea label="Why does that marker matter most right now?" value={d.p3_why} onChange={(v) => update("p3_why", v)} />
      </SectionBlock>
      <SectionBlock label="Execute — First action toward that marker">
        <LabeledInput label="The first action you'll take this week toward that marker" value={d.p3_execute} onChange={(v) => update("p3_execute", v)} />
      </SectionBlock>
      <SectionBlock label="Measure — How you'll know you hit it">
        <LabeledTextarea label="How will you know you hit the marker inside 30 days?" value={d.p3_measure} onChange={(v) => update("p3_measure", v)} />
      </SectionBlock>
    </div>
  );
}

function Part4({ d, update }: { d: SectionData; update: UpdateFn }) {
  return (
    <div className="space-y-6">
      <SectionBlock label="Evaluate — What's causing the gap" hint="Select every cause creating the gap between where you are and where you're leading toward.">
        <Chips label="Gap causes" options={GAP_CAUSE_CHIPS} values={d.p4_causes} onChange={(v) => update("p4_causes", v)} other={d.p4_causes_other} onOtherChange={(v) => update("p4_causes_other", v)} />
      </SectionBlock>
      <SectionBlock label="Identify — Evidence you're seeing">
        <LabeledTextarea label="What evidence are you seeing that tells you this gap is real?" value={d.p4_evidence} onChange={(v) => update("p4_evidence", v)} />
      </SectionBlock>
      <SectionBlock label="Understand — Why that gap has stayed open">
        <LabeledTextarea label="Why has that gap stayed open? What's your part in it?" value={d.p4_understand} onChange={(v) => update("p4_understand", v)} />
      </SectionBlock>
      <SectionBlock label="Build a Plan — What must change to close the gap">
        <LabeledTextarea label="What must change — in you and around you — to close the gap?" value={d.p4_must_change} onChange={(v) => update("p4_must_change", v)} />
      </SectionBlock>
      <SectionBlock label="Execute — First move to close it">
        <LabeledInput label="The first move you'll make this week to close the gap" value={d.p4_execute} onChange={(v) => update("p4_execute", v)} />
      </SectionBlock>
      <SectionBlock label="Measure — How you'll know the gap is closing">
        <LabeledTextarea label="How will you know the gap is actually closing?" value={d.p4_measure} onChange={(v) => update("p4_measure", v)} />
      </SectionBlock>
    </div>
  );
}

function Part5({ d, update }: { d: SectionData; update: UpdateFn }) {
  return (
    <div className="space-y-6">
      <SectionBlock label="My Highest Priorities" hint="Three priorities max. Each with why it matters and a first action.">
        <div className="space-y-3">
          {d.p5_priorities.map((r, i) => (
            <div key={i} className="rounded-xl border border-border bg-background/40 p-3">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-[#433993]">Priority {i + 1}</p>
              <div className="grid grid-cols-1 gap-2">
                <LabeledInput label="Priority" value={r.priority} onChange={(v) => {
                  const arr = [...d.p5_priorities]; arr[i] = { ...r, priority: v }; update("p5_priorities", arr);
                }} />
                <LabeledInput label="Why It Matters" value={r.why} onChange={(v) => {
                  const arr = [...d.p5_priorities]; arr[i] = { ...r, why: v }; update("p5_priorities", arr);
                }} />
                <LabeledInput label="First Action" value={r.first_action} onChange={(v) => {
                  const arr = [...d.p5_priorities]; arr[i] = { ...r, first_action: v }; update("p5_priorities", arr);
                }} />
              </div>
            </div>
          ))}
        </div>
      </SectionBlock>
      <SectionBlock label="Identify — Which priority deserves the most attention">
        <LabeledInput label="Which of the three deserves the most attention right now?" value={d.p5_most_attention} onChange={(v) => update("p5_most_attention", v)} />
      </SectionBlock>
      <SectionBlock label="Understand — Why that priority carries the weight">
        <LabeledTextarea label="Why does that priority carry the most weight?" value={d.p5_why} onChange={(v) => update("p5_why", v)} />
      </SectionBlock>
      <SectionBlock label="Execute — First action">
        <LabeledInput label="The first action you'll take this week on that priority" value={d.p5_execute} onChange={(v) => update("p5_execute", v)} />
      </SectionBlock>
      <SectionBlock label="Measure — How you'll know it's progressing">
        <LabeledTextarea label="How will you know that priority is actually progressing?" value={d.p5_measure} onChange={(v) => update("p5_measure", v)} />
      </SectionBlock>
    </div>
  );
}

function Part6({ d, update }: { d: SectionData; update: UpdateFn }) {
  return (
    <div className="space-y-6">
      <SectionBlock label="Activity Plan" hint="Name the activities that actually move the needle, when you'll do them, and the outcome each is meant to produce.">
        <div className="space-y-2">
          {d.p6_activities.map((r, i) => (
            <div key={i} className="grid grid-cols-1 gap-2 rounded-lg border border-border bg-background/60 p-3 sm:grid-cols-3">
              <Input value={r.activity} onChange={(e) => {
                const arr = [...d.p6_activities]; arr[i] = { ...r, activity: e.target.value }; update("p6_activities", arr);
              }} placeholder={`Activity ${i + 1}`} />
              <Input value={r.when} onChange={(e) => {
                const arr = [...d.p6_activities]; arr[i] = { ...r, when: e.target.value }; update("p6_activities", arr);
              }} placeholder="When (day / cadence)" />
              <Input value={r.outcome} onChange={(e) => {
                const arr = [...d.p6_activities]; arr[i] = { ...r, outcome: e.target.value }; update("p6_activities", arr);
              }} placeholder="Outcome it produces" />
            </div>
          ))}
        </div>
      </SectionBlock>
      <SectionBlock label="Identify — Your focus for this week">
        <LabeledTextarea label="What is your single biggest focus for this week?" value={d.p6_focus_week} onChange={(v) => update("p6_focus_week", v)} />
      </SectionBlock>
      <SectionBlock label="Execute — The one activity you will not miss">
        <LabeledInput label="The one activity you commit to not missing this week" value={d.p6_execute} onChange={(v) => update("p6_execute", v)} />
      </SectionBlock>
      <SectionBlock label="Measure — How you'll know the plan is producing results">
        <LabeledTextarea label="How will you know these activities are producing results?" value={d.p6_measure} onChange={(v) => update("p6_measure", v)} />
      </SectionBlock>
    </div>
  );
}

function Part7({ d, update }: { d: SectionData; update: UpdateFn }) {
  return (
    <div className="space-y-6">
      <SectionBlock label="Results Review">
        <LabeledTextarea label="What are the real wins from this stretch?" value={d.p7_wins} onChange={(v) => update("p7_wins", v)} />
        <LabeledTextarea label="Where did you fall short of what you set out to do?" value={d.p7_missed} onChange={(v) => update("p7_missed", v)} />
        <LabeledTextarea label="What is the biggest learning from these results?" value={d.p7_learning} onChange={(v) => update("p7_learning", v)} />
        <LabeledTextarea label="Based on this review, what adjustment will you make going forward?" value={d.p7_adjust} onChange={(v) => update("p7_adjust", v)} />
      </SectionBlock>
      <SectionBlock label="Review Date" hint="Lock in the date you'll come back and review results again.">
        <LabeledInput label="Next Results Review date" type="date" value={d.p7_review_date} onChange={(v) => update("p7_review_date", v)} />
      </SectionBlock>
    </div>
  );
}

function Part8({ d, update }: { d: SectionData; update: UpdateFn }) {
  return (
    <div className="space-y-6">
      <SectionBlock label="Evaluate — The biggest lesson from leading for results this cycle">
        <LabeledTextarea label="What is the biggest lesson leading for results has taught you this cycle?" value={d.p8_lesson} onChange={(v) => update("p8_lesson", v)} />
      </SectionBlock>
      <SectionBlock label="Identify — Turn the lesson into Principle 4" hint="State it as a principle you'll lead by, going forward.">
        <LabeledTextarea label="Principle 4 — the leadership principle you're taking forward" value={d.p8_principle_4} onChange={(v) => update("p8_principle_4", v)} placeholder="I lead by…" />
      </SectionBlock>
      <SectionBlock label="Understand — Why this principle matters now">
        <LabeledTextarea label="Why does this principle matter to how you lead from here?" value={d.p8_understand} onChange={(v) => update("p8_understand", v)} />
      </SectionBlock>
      <SectionBlock label="Build a Plan — How you'll live it">
        <LabeledTextarea label="How will you live this principle in the next cycle?" value={d.p8_build} onChange={(v) => update("p8_build", v)} />
      </SectionBlock>
      <SectionBlock label="Execute — First time you'll apply it">
        <LabeledInput label="Where you'll apply this principle first" value={d.p8_execute} onChange={(v) => update("p8_execute", v)} />
      </SectionBlock>
      <SectionBlock label="Measure — How you'll know it's shaping how you lead">
        <LabeledTextarea label="How will you know this principle is actually shaping how you lead?" value={d.p8_measure} onChange={(v) => update("p8_measure", v)} />
      </SectionBlock>
    </div>
  );
}

function StepCommitment({ d, update }: { d: SectionData; update: UpdateFn }) {
  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-[#433993]/30 bg-gradient-to-br from-[#f6f2ff] to-white p-6">
        <p className="text-sm leading-relaxed text-foreground">
          I commit to leading for real results — clarifying my Success Image, holding my
          Success Markers, closing the gap between where I am and where I'm leading toward,
          and keeping the discipline my priorities require.
        </p>
      </div>
      <div className="flex items-start gap-3">
        <Checkbox id="commit-7" checked={d.committed} onCheckedChange={(v) => update("committed", Boolean(v))} />
        <Label htmlFor="commit-7" className="text-sm leading-relaxed text-foreground">
          I commit to leading for results.
        </Label>
      </div>
      <div>
        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Date</Label>
        <Input type="date" value={d.commitment_date} onChange={(e) => update("commitment_date", e.target.value)} className="mt-1 max-w-[220px]" />
      </div>
    </div>
  );
}

// ---------- Shared inputs ----------

function SectionBlock({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="mb-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#433993]">{label}</p>
        {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function LabeledTextarea({ label, value, onChange, placeholder, rows = 3 }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; rows?: number }) {
  return (
    <div>
      <Label className="text-xs font-medium text-foreground">{label}</Label>
      <Textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="mt-1" style={{ minHeight: rows * 26 }} />
    </div>
  );
}

function LabeledInput({ label, value, onChange, placeholder, type = "text" }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return (
    <div>
      <Label className="text-xs font-medium text-foreground">{label}</Label>
      <Input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="mt-1" />
    </div>
  );
}

function Chips({ label, options, values, onChange, other, onOtherChange }: { label: string; options: string[]; values: string[]; onChange: (v: string[]) => void; other?: string; onOtherChange?: (v: string) => void }) {
  const toggle = (opt: string) => {
    if (values.includes(opt)) onChange(values.filter((v) => v !== opt));
    else onChange([...values, opt]);
  };
  return (
    <div>
      <Label className="text-xs font-medium text-foreground">{label}</Label>
      <div className="mt-2 flex flex-wrap gap-2">
        {options.map((opt) => {
          const active = values.includes(opt);
          return (
            <button
              key={opt}
              type="button"
              onClick={() => toggle(opt)}
              className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium transition ${active ? "bg-[#433993] text-white" : "bg-secondary/60 text-foreground ring-1 ring-inset ring-border hover:ring-[#433993]/40"}`}
            >
              {opt}
              {active && <X className="h-3 w-3" />}
            </button>
          );
        })}
      </div>
      {onOtherChange && (
        <Input value={other ?? ""} onChange={(e) => onOtherChange(e.target.value)} placeholder="Other…" className="mt-2" />
      )}
    </div>
  );
}