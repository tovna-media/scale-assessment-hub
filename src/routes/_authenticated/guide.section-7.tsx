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
import { PrintSectionButton } from "@/components/scale/PrintSectionButton";
import { hasPrintableContent } from "@/lib/section-print";
import { GapReportPanel } from "@/components/scale/GapReportPanel";
import { AboutSectionSheet } from "@/components/scale/AboutSectionSheet";

export const Route = createFileRoute("/_authenticated/guide/section-7")({
  head: () => ({ meta: [{ title: "Section 7 · Lead for Results" }] }),
  component: SectionSevenPage,
});

const TOTAL_SECTIONS = 12;
const TOTAL_STEPS = 9;

type DriverStatus = "" | "on_track" | "behind" | "needs_revision";

const GAP_CAUSE_CHIPS = [
  "Knowledge & Skill Gap",
  "Capacity & Standards Gap",
  "Lack of Clarity",
  "Weak Systems",
  "Leadership Follow-Through",
  "Limited Resources",
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
  owner: string;
  when: string;
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
  p6_activities: Array.from({ length: 4 }, () => ({ activity: "", owner: "", when: "" })),
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
      d.p1_current_image.trim().length > 0 &&
      d.p2_drivers.some((r) => r.status !== "") && d.p2_which.trim().length > 0 &&
      d.p3_markers.some((r) => r.marker.trim().length > 0) && d.p3_top_marker.trim().length > 0 &&
      (d.p4_causes.length > 0 || d.p4_causes_other.trim().length > 0) && d.p4_must_change.trim().length > 0 &&
      d.p5_priorities.some((r) => r.priority.trim().length > 0) && d.p5_most_attention.trim().length > 0 &&
      d.p6_activities.some((r) => r.activity.trim().length > 0) && d.p6_measure.trim().length > 0 &&
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
      <div className="mb-6 flex items-center justify-between gap-3">
        <Link to="/cycle" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> My Cycle
        </Link>
        <PrintSectionButton section={7} hasContent={hasPrintableContent(d)} />
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
        <AboutSectionButtonS7 className="mt-3" />
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
    case 1: return d.p1_current_image.trim().length > 0;
    case 2: return d.p2_drivers.some((r) => r.status !== "") && d.p2_which.trim().length > 0;
    case 3: return d.p3_markers.some((r) => r.marker.trim().length > 0) && d.p3_top_marker.trim().length > 0;
    case 4: return (d.p4_causes.length > 0 || d.p4_causes_other.trim().length > 0) && d.p4_must_change.trim().length > 0;
    case 5: return d.p5_priorities.some((r) => r.priority.trim().length > 0) && d.p5_most_attention.trim().length > 0;
    case 6: return d.p6_activities.some((r) => r.activity.trim().length > 0) && d.p6_measure.trim().length > 0;
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
      <GuideNote>
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#433993]">
          Part 1 – Success Image Review
        </p>
        <p className="mt-2">Return to the Success Image you created in Section 2.</p>
      </GuideNote>
      <SectionBlock label="Evaluate">
        <LabeledTextarea label="Which parts of your Success Image have become reality?" value={d.p1_current_image} onChange={(v) => update("p1_current_image", v)} />
        <LabeledTextarea label="Which parts still require focused attention?" value={d.p1_still_true} onChange={(v) => update("p1_still_true", v)} />
        <LabeledTextarea label="What progress are you most encouraged by?" value={d.p1_needs_sharpening} onChange={(v) => update("p1_needs_sharpening", v)} />
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
      <GuideNote>
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#433993]">
          Part 2 – Success Driver Review
        </p>
        <p className="mt-2">Review your Success Drivers.</p>
        <p className="mt-3 font-semibold text-foreground">Remember:</p>
        <p className="mt-1">
          Success Drivers are the activities that move you toward your Success Image. Success
          Markers are the measurable evidence those activities are working.
        </p>
        <p className="mt-3 font-semibold text-foreground">Example:</p>
        <p className="mt-1">
          Success Driver: Conduct one coaching conversation with each salesperson every week.
        </p>
        <p className="mt-1">
          Success Marker: Every salesperson receives four coaching conversations this month and
          individual performance improves.
        </p>
      </GuideNote>
      <SectionBlock label="Evaluate">
        <div className="space-y-2">
          {d.p2_drivers.map((r, i) => (
            <div key={i} className="flex flex-col gap-2 rounded-lg border border-border bg-background/60 p-3 sm:flex-row sm:items-center sm:justify-between">
              <Input value={r.name} onChange={(e) => {
                const arr = [...d.p2_drivers]; arr[i] = { ...r, name: e.target.value }; update("p2_drivers", arr);
              }} placeholder={`Driver ${i + 1}`} className="sm:max-w-xs" />
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
      <SectionBlock label="Identify">
        <LabeledTextarea label="Which Success Driver deserves your greatest attention?" value={d.p2_which} onChange={(v) => update("p2_which", v)} />
        <LabeledTextarea label="Why?" value={d.p2_why} onChange={(v) => update("p2_why", v)} />
      </SectionBlock>
    </div>
  );
}

function Part3({ d, update }: { d: SectionData; update: UpdateFn }) {
  return (
    <div className="space-y-6">
      <GuideNote>
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#433993]">
          Part 3 – Success Marker Builder
        </p>
        <p className="mt-2">Every Success Driver should have measurable evidence.</p>
        <p className="mt-2">Complete the table below.</p>
      </GuideNote>
      <SectionBlock label="Success Driver / Success Marker">
        <div className="space-y-2">
          {d.p3_markers.map((r, i) => (
            <div key={i} className="grid grid-cols-1 gap-2 rounded-lg border border-border bg-background/60 p-3 sm:grid-cols-2">
              <Input value={r.driver} onChange={(e) => {
                const arr = [...d.p3_markers]; arr[i] = { ...r, driver: e.target.value }; update("p3_markers", arr);
              }} placeholder="Success Driver" />
              <Input value={r.marker} onChange={(e) => {
                const arr = [...d.p3_markers]; arr[i] = { ...r, marker: e.target.value }; update("p3_markers", arr);
              }} placeholder="Success Marker" />
            </div>
          ))}
        </div>
      </SectionBlock>
      <SectionBlock label="Greatest Impact">
        <LabeledTextarea label="Which Success Marker will have the greatest impact over the next 30 days?" value={d.p3_top_marker} onChange={(v) => update("p3_top_marker", v)} />
      </SectionBlock>
    </div>
  );
}

function Part4({ d, update }: { d: SectionData; update: UpdateFn }) {
  return (
    <div className="space-y-6">
      <GuideNote>
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#433993]">
          Part 4 – Closing the Gap
        </p>
        <p className="mt-2">Review your highest priority Success Marker.</p>
      </GuideNote>
      <SectionBlock label="What is preventing better results?" hint="Check all that apply.">
        <Chips label="What is preventing better results?" options={GAP_CAUSE_CHIPS} values={d.p4_causes} onChange={(v) => update("p4_causes", v)} other={d.p4_causes_other} onOtherChange={(v) => update("p4_causes_other", v)} />
      </SectionBlock>
      <SectionBlock label="Evidence">
        <LabeledTextarea label="Describe the evidence supporting your conclusion." value={d.p4_evidence} onChange={(v) => update("p4_evidence", v)} />
      </SectionBlock>
      <SectionBlock label="What must change?">
        <LabeledTextarea label="What must change?" value={d.p4_must_change} onChange={(v) => update("p4_must_change", v)} />
      </SectionBlock>
    </div>
  );
}

function Part5({ d, update }: { d: SectionData; update: UpdateFn }) {
  return (
    <div className="space-y-6">
      <GuideNote>
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#433993]">
          Part 5 – My Highest Priorities
        </p>
        <p className="mt-2">Leaders lose momentum when everything becomes important.</p>
        <p className="mt-2">
          Identify the three priorities that will have the greatest impact on your Success Image.
        </p>
      </GuideNote>
      <SectionBlock label="Priority / Why It Matters / First Action">
        <div className="space-y-3">
          {d.p5_priorities.map((r, i) => (
            <div key={i} className="rounded-xl border border-border bg-background/40 p-3">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-[#433993]">{i + 1}</p>
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
      <SectionBlock label="Greatest Attention">
        <LabeledTextarea label="Which ONE priority deserves your greatest attention during the next 30 days?" value={d.p5_most_attention} onChange={(v) => update("p5_most_attention", v)} />
      </SectionBlock>
    </div>
  );
}

function Part6({ d, update }: { d: SectionData; update: UpdateFn }) {
  return (
    <div className="space-y-6">
      <GuideNote>
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#433993]">
          Part 6 – Activity Plan
        </p>
        <p className="mt-2">Meaningful results require consistent execution.</p>
        <p className="mt-2">For your highest priority:</p>
      </GuideNote>
      <SectionBlock label="What activities must consistently happen?" hint="Who owns each activity? When will these activities be completed?">
        <div className="space-y-2">
          {d.p6_activities.map((r, i) => (
            <div key={i} className="grid grid-cols-1 gap-2 rounded-lg border border-border bg-background/60 p-3 sm:grid-cols-3">
              <Input value={r.activity} onChange={(e) => {
                const arr = [...d.p6_activities]; arr[i] = { ...r, activity: e.target.value }; update("p6_activities", arr);
              }} placeholder="Activity" />
              <Input value={r.owner} onChange={(e) => {
                const arr = [...d.p6_activities]; arr[i] = { ...r, owner: e.target.value }; update("p6_activities", arr);
              }} placeholder="Owner" />
              <Input value={r.when} onChange={(e) => {
                const arr = [...d.p6_activities]; arr[i] = { ...r, when: e.target.value }; update("p6_activities", arr);
              }} placeholder="When completed" />
            </div>
          ))}
        </div>
      </SectionBlock>
      <SectionBlock label="Review">
        <LabeledTextarea label="How will progress be reviewed?" value={d.p6_measure} onChange={(v) => update("p6_measure", v)} />
      </SectionBlock>
    </div>
  );
}

function Part7({ d, update }: { d: SectionData; update: UpdateFn }) {
  return (
    <div className="space-y-6">
      <GuideNote>
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#433993]">
          Part 7 – Results Review
        </p>
        <p className="mt-2">Review your Success Markers.</p>
      </GuideNote>
      <SectionBlock label="Results Review">
        <LabeledTextarea label="What evidence tells you your activities are producing the desired results?" value={d.p7_wins} onChange={(v) => update("p7_wins", v)} />
        <LabeledTextarea label="If progress is slower than expected, what will you adjust?" value={d.p7_adjust} onChange={(v) => update("p7_adjust", v)} />
        <LabeledInput label="Review Date" type="date" value={d.p7_review_date} onChange={(v) => update("p7_review_date", v)} />
      </SectionBlock>
    </div>
  );
}

function Part8({ d, update }: { d: SectionData; update: UpdateFn }) {
  return (
    <div className="space-y-6">
      <GuideNote>
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#433993]">
          Part 8 – Carry It Forward
        </p>
        <p className="mt-2">Every principle builds upon the one before it.</p>
        <p className="mt-2">Reflect on your experience.</p>
      </GuideNote>
      <SectionBlock label="Carry It Forward">
        <LabeledTextarea label="How has Leading Yourself helped you produce better results?" value={d.p8_lesson} onChange={(v) => update("p8_lesson", v)} />
        <LabeledTextarea label="How has developing others contributed to these results?" value={d.p8_understand} onChange={(v) => update("p8_understand", v)} />
        <LabeledTextarea label="What lesson will you intentionally carry into Principle 4: Lead Leaders?" value={d.p8_principle_4} onChange={(v) => update("p8_principle_4", v)} />
      </SectionBlock>
    </div>
  );
}

function StepCommitment({ d, update }: { d: SectionData; update: UpdateFn }) {
  return (
    <div className="space-y-6">
      <GuideNote>
        <p>
          Results are not created by intention alone. They are produced through consistent
          execution aligned with a clear Success Image and focused Success Drivers.
        </p>
      </GuideNote>
      <div className="rounded-2xl border border-[#433993]/30 bg-gradient-to-br from-[#f6f2ff] to-white p-6">
        <p className="text-sm leading-relaxed text-foreground">
          During the next phase of my Leadership Optimization Cycle, I commit to focusing on the
          activities that matter most, measuring meaningful Success Markers, and consistently
          closing the gap between my current reality and the future I am building.
        </p>
      </div>
      <div className="flex items-start gap-3">
        <Checkbox id="commit-7" checked={d.committed} onCheckedChange={(v) => update("committed", Boolean(v))} />
        <Label htmlFor="commit-7" className="text-sm leading-relaxed text-foreground">
          Signature — I commit to leading for results.
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

function GuideNote({ children }: { children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-[#433993]/20 bg-[#433993]/[0.04] p-5 text-sm leading-relaxed text-foreground">
      {children}
    </section>
  );
}

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
function AboutSectionButtonS7({ className }: { className?: string }) {
  return (
    <AboutSectionSheet title="Section 7: Lead for Results" className={className}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#433993]">Principle 3: Lead for Results</p>
      <h4 className="font-display text-lg font-semibold text-foreground">Section Objective</h4>
      <p>Your Success Image defined the future you want to create.</p>
      <p>Your Success Drivers identified the activities most likely to move you toward that future.</p>
      <p>Leading Yourself increased your capacity.</p>
      <p>Leading Others strengthened the people around you.</p>
      <p>Now it is time to determine whether those efforts are producing meaningful results.</p>
      <p>Leading for Results is about closing the gap between your Success Image and your current reality through focused execution, measurable progress, and continuous improvement.</p>
    </AboutSectionSheet>
  );
}
