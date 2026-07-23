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

export const Route = createFileRoute("/_authenticated/guide/section-5")({
  head: () => ({ meta: [{ title: "Section 5 · Growing People Intentionally" }] }),
  component: SectionFivePage,
});

const TOTAL_SECTIONS = 12;
const TOTAL_STEPS = 7;

const LEADERSHIP_CATEGORY_OPTIONS = [
  "Vision & Direction",
  "Communication",
  "Decision-Making",
  "Accountability",
  "Coaching & Development",
  "Execution",
  "Culture & Trust",
  "Emotional Intelligence",
];

const INNER_CAPACITY_OPTIONS = [
  "Energy & Recovery",
  "Stability & Structure",
  "Support & Connection",
  "Self-Trust & Follow-Through",
  "Purpose & Direction",
];

const FUEL_OPTIONS = [
  "F — Firm Up Character",
  "U — Understand Emotions",
  "E — Envision Success",
  "L — Lead Themselves Daily",
];

const PERSONAL_ALIGNMENT = [
  "My daily choices reflect who I say I want to be.",
  "My time reflects my real priorities.",
  "My energy is directed toward what matters most.",
  "My commitments match my actual capacity.",
];
const ROLE_ALIGNMENT = [
  "My role uses my strongest gifts.",
  "I'm clear on what only I can do.",
  "I've released what I shouldn't be doing anymore.",
  "My role is designed for the leader I'm becoming.",
];
const ORG_ALIGNMENT = [
  "Our vision is clear across the team.",
  "Our priorities are aligned to the vision.",
  "Our structure supports how we actually work.",
  "Our people are in the right seats.",
];
const LEADERSHIP_ALIGNMENT = [
  "How I lead matches what I ask of others.",
  "My words and my behavior tell the same story.",
  "I lead the same way in private as in public.",
  "My leadership rhythm is sustainable.",
];

const RHYTHM_ITEMS = [
  "Consistent 1:1s",
  "Coaching conversations",
  "Real-time feedback",
  "Team debriefs",
  "Development check-ins",
  "Recognition moments",
  "Growth planning",
];

const CARRY_FORWARD_OPTIONS = [
  "Daily leadership rhythm",
  "Character work",
  "Emotional regulation",
  "Success image / vision",
  "Standards",
  "Recovery & capacity",
  "Reflection",
  "Accountability",
];

interface StrategyRow {
  priority: string;
  person_or_group: string;
  focus: string;
  first_action: string;
  success_marker: string;
}

type Rating = "" | "rarely" | "sometimes" | "consistently";
type YesNo = "" | "yes" | "no";

interface SectionData {
  step: number;
  // Part 1 — Leadership Reflection
  p1_evaluate: string;
  p1_identify: string;
  p1_understand: string;
  p1_build: string;
  p1_execute: string;
  p1_measure: string;
  // Part 2 — Team Development Patterns
  p2_leadership_chips: string[];
  p2_inner_capacity_chips: string[];
  p2_fuel_chips: string[];
  p2_other: string;
  p2_identify: string;
  p2_understand: string;
  p2_build: string;
  p2_execute: string;
  p2_measure: string;
  // Part 3 — Alignment Builder
  p3_personal: YesNo[];
  p3_role: YesNo[];
  p3_org: YesNo[];
  p3_leadership: YesNo[];
  p3_identify: string;
  p3_understand: string;
  p3_build: string;
  p3_execute: string;
  p3_execute_date: string;
  p3_measure: string;
  // Part 4 — Rhythms
  p4_ratings: Rating[]; // one per RHYTHM_ITEMS
  p4_identify: string;
  p4_understand: string;
  p4_build: string;
  p4_execute: string;
  p4_measure: string;
  // Part 5 — Carry Forward
  p5_chips: string[];
  p5_chips_other: string;
  p5_identify: string;
  p5_understand: string;
  p5_build: string;
  p5_execute: string;
  p5_measure: string;
  // Part 6 — Strategy
  strategy_rows: StrategyRow[]; // 3
  // Part 7 — Commitment
  committed: boolean;
  commitment_date: string;
}

const emptyStrategyRow = (): StrategyRow => ({
  priority: "",
  person_or_group: "",
  focus: "",
  first_action: "",
  success_marker: "",
});

const EMPTY: SectionData = {
  step: 1,
  p1_evaluate: "",
  p1_identify: "",
  p1_understand: "",
  p1_build: "",
  p1_execute: "",
  p1_measure: "",
  p2_leadership_chips: [],
  p2_inner_capacity_chips: [],
  p2_fuel_chips: [],
  p2_other: "",
  p2_identify: "",
  p2_understand: "",
  p2_build: "",
  p2_execute: "",
  p2_measure: "",
  p3_personal: PERSONAL_ALIGNMENT.map(() => "" as YesNo),
  p3_role: ROLE_ALIGNMENT.map(() => "" as YesNo),
  p3_org: ORG_ALIGNMENT.map(() => "" as YesNo),
  p3_leadership: LEADERSHIP_ALIGNMENT.map(() => "" as YesNo),
  p3_identify: "",
  p3_understand: "",
  p3_build: "",
  p3_execute: "",
  p3_execute_date: "",
  p3_measure: "",
  p4_ratings: RHYTHM_ITEMS.map(() => "" as Rating),
  p4_identify: "",
  p4_understand: "",
  p4_build: "",
  p4_execute: "",
  p4_measure: "",
  p5_chips: [],
  p5_chips_other: "",
  p5_identify: "",
  p5_understand: "",
  p5_build: "",
  p5_execute: "",
  p5_measure: "",
  strategy_rows: [emptyStrategyRow(), emptyStrategyRow(), emptyStrategyRow()],
  committed: false,
  commitment_date: "",
};

function SectionFivePage() {
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
        .eq("section_number", 5)
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
      (d.p2_leadership_chips.length + d.p2_inner_capacity_chips.length + d.p2_fuel_chips.length + (d.p2_other.trim().length > 0 ? 1 : 0)) > 0 &&
      d.p2_execute.trim().length > 0 &&
      d.p3_identify.trim().length > 0 &&
      d.p3_execute.trim().length > 0 &&
      d.p4_ratings.some((r) => r !== "") &&
      d.p4_execute.trim().length > 0 &&
      (d.p5_chips.length > 0 || d.p5_chips_other.trim().length > 0) &&
      d.p5_execute.trim().length > 0 &&
      d.strategy_rows.some((r) => r.priority.trim().length > 0 && r.success_marker.trim().length > 0) &&
      d.committed && d.commitment_date.length > 0
    );
  }, [d]);

  useEffect(() => {
    if (!user || !loaded.current) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      await supabase.from("optimizer_section_progress").upsert(
        [{ user_id: user.id, section_number: 5, data: d as unknown as never, completed: isComplete }],
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
      section: 5,
      people_development_markers: d.strategy_rows
        .filter((r) => r.success_marker.trim().length > 0)
        .map((r) => ({
          priority: r.priority,
          person_or_group: r.person_or_group,
          focus: r.focus,
          first_action: r.first_action,
          marker: r.success_marker,
        })),
      commitment_date: d.commitment_date,
    };
    const { error } = await supabase.from("leadership_dashboard_snapshots").insert([
      { user_id: user.id, data: snapshot as unknown as never },
    ]);
    if (error) {
      toast.error("Couldn't save your snapshot. Please try again.");
      return;
    }
    toast.success("Section 5 complete.");
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
        <PrintSectionButton section={5} hasContent={hasPrintableContent(d)} />
      </div>

      <SectionVideo sectionNumber={5} sectionTitle="Growing People Intentionally" />

      <div className="mb-6">
        <div className="flex items-center justify-between text-xs font-medium uppercase tracking-widest text-muted-foreground">
          <span>Section 5 of {TOTAL_SECTIONS}</span>
          <span>Part {step} of {TOTAL_STEPS}</span>
        </div>
        <Progress value={(step / TOTAL_STEPS) * 100} className="mt-2 h-1.5" />
        <GapReportPanel className="mt-4" />
        <h1 className="mt-4 font-display text-3xl font-semibold text-foreground sm:text-4xl">{stepTitle(step)}</h1>
        <AboutSectionButtonS5 className="mt-3" />
      </div>

      <div className="space-y-8">
        {step === 1 && <Part1 d={d} update={update} />}
        {step === 2 && <Part2 d={d} update={update} />}
        {step === 3 && <Part3 d={d} update={update} />}
        {step === 4 && <Part4 d={d} update={update} />}
        {step === 5 && <Part5 d={d} update={update} />}
        {step === 6 && <Part6 d={d} update={update} />}
        {step === 7 && <StepCommitment d={d} update={update} />}
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
            Finish Section 5 <Check className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>
    </main>
  );
}

function stepTitle(step: number) {
  switch (step) {
    case 1: return "Part 1 — Leadership Reflection";
    case 2: return "Part 2 — Team Development Patterns";
    case 3: return "Part 3 — Alignment Builder";
    case 4: return "Part 4 — Building People Development Rhythms";
    case 5: return "Part 5 — Carry Forward Your Lead Yourself Experience";
    case 6: return "Part 6 — People Development Strategy";
    case 7: return "Leadership Commitment";
    default: return "";
  }
}

function stepIsValid(step: number, d: SectionData): boolean {
  switch (step) {
    case 1:
      return d.p1_execute.trim().length > 0;
    case 2:
      return (
        (d.p2_leadership_chips.length + d.p2_inner_capacity_chips.length + d.p2_fuel_chips.length + (d.p2_other.trim().length > 0 ? 1 : 0)) > 0 &&
        d.p2_execute.trim().length > 0
      );
    case 3:
      return d.p3_identify.trim().length > 0 && d.p3_execute.trim().length > 0;
    case 4:
      return d.p4_ratings.some((r) => r !== "") && d.p4_execute.trim().length > 0;
    case 5:
      return (d.p5_chips.length > 0 || d.p5_chips_other.trim().length > 0) && d.p5_execute.trim().length > 0;
    case 6:
      return d.strategy_rows.some((r) => r.priority.trim().length > 0 && r.success_marker.trim().length > 0);
    case 7:
      return d.committed && d.commitment_date.length > 0;
    default:
      return true;
  }
}

type UpdateFn = <K extends keyof SectionData>(k: K, v: SectionData[K]) => void;

function Part1({ d, update }: { d: SectionData; update: UpdateFn }) {
  return (
    <div className="space-y-6">
      <SectionBlock label="Evaluate — Reflect on your growth as a leader">
        <LabeledTextarea label="How has your own growth shaped how you now see the people around you?" value={d.p1_evaluate} onChange={(v) => update("p1_evaluate", v)} />
      </SectionBlock>
      <SectionBlock label="Identify — What you're now noticing in others">
        <LabeledTextarea label="What are you noticing in the people you lead that you didn't see before?" value={d.p1_identify} onChange={(v) => update("p1_identify", v)} />
      </SectionBlock>
      <SectionBlock label="Understand — Why growing others now matters">
        <LabeledTextarea label="Why does developing the people around you matter more to you at this stage?" value={d.p1_understand} onChange={(v) => update("p1_understand", v)} />
      </SectionBlock>
      <SectionBlock label="Build a Plan — The kind of leader you want to be for them">
        <LabeledTextarea label="What kind of leader do you want to be for the people you're growing?" value={d.p1_build} onChange={(v) => update("p1_build", v)} />
      </SectionBlock>
      <SectionBlock label="Execute — One reflection habit to begin">
        <LabeledInput label="One reflection habit you'll begin this week" value={d.p1_execute} onChange={(v) => update("p1_execute", v)} placeholder="e.g. 10-minute end-of-day debrief" />
      </SectionBlock>
      <SectionBlock label="Measure — How your perspective is shifting">
        <LabeledTextarea label="How will you know your perspective on people is shifting?" value={d.p1_measure} onChange={(v) => update("p1_measure", v)} />
      </SectionBlock>
    </div>
  );
}

function Part2({ d, update }: { d: SectionData; update: UpdateFn }) {
  return (
    <div className="space-y-6">
      <SectionBlock label="Evaluate — Patterns showing up across your people" hint="Select every pattern you see repeating across the people you lead.">
        <Chips
          label="Leadership Assessment categories"
          options={LEADERSHIP_CATEGORY_OPTIONS}
          values={d.p2_leadership_chips}
          onChange={(v) => update("p2_leadership_chips", v)}
        />
        <Chips
          label="Inner Capacity areas"
          options={INNER_CAPACITY_OPTIONS}
          values={d.p2_inner_capacity_chips}
          onChange={(v) => update("p2_inner_capacity_chips", v)}
        />
        <Chips
          label="FUEL"
          options={FUEL_OPTIONS}
          values={d.p2_fuel_chips}
          onChange={(v) => update("p2_fuel_chips", v)}
          other={d.p2_other}
          onOtherChange={(v) => update("p2_other", v)}
        />
      </SectionBlock>
      <SectionBlock label="Identify — The pattern showing up most">
        <LabeledTextarea label="Which pattern shows up most across your people right now?" value={d.p2_identify} onChange={(v) => update("p2_identify", v)} />
      </SectionBlock>
      <SectionBlock label="Understand — What's feeding the pattern">
        <LabeledTextarea label="What's contributing to this pattern? What's your part in it?" value={d.p2_understand} onChange={(v) => update("p2_understand", v)} />
      </SectionBlock>
      <SectionBlock label="Build a Plan — The shift with the biggest team-wide impact">
        <LabeledTextarea label="What shift would create the biggest team-wide improvement?" value={d.p2_build} onChange={(v) => update("p2_build", v)} />
      </SectionBlock>
      <SectionBlock label="Execute — First step you'll take">
        <LabeledInput label="First step you'll take this week" value={d.p2_execute} onChange={(v) => update("p2_execute", v)} />
      </SectionBlock>
      <SectionBlock label="Measure — How you'll know the pattern is changing">
        <LabeledTextarea label="How will you know the pattern is changing?" value={d.p2_measure} onChange={(v) => update("p2_measure", v)} />
      </SectionBlock>
    </div>
  );
}

function Part3({ d, update }: { d: SectionData; update: UpdateFn }) {
  return (
    <div className="space-y-6">
      <SectionBlock label="Evaluate — Where alignment stands right now" hint="Answer Yes or No for each statement.">
        <YesNoList label="Personal alignment" items={PERSONAL_ALIGNMENT} values={d.p3_personal} onChange={(v) => update("p3_personal", v)} />
        <YesNoList label="Role alignment" items={ROLE_ALIGNMENT} values={d.p3_role} onChange={(v) => update("p3_role", v)} />
        <YesNoList label="Organizational alignment" items={ORG_ALIGNMENT} values={d.p3_org} onChange={(v) => update("p3_org", v)} />
        <YesNoList label="Leadership alignment" items={LEADERSHIP_ALIGNMENT} values={d.p3_leadership} onChange={(v) => update("p3_leadership", v)} />
      </SectionBlock>
      <SectionBlock label="Identify — Which alignment is weakest">
        <LabeledTextarea label="Which of the four is weakest right now?" value={d.p3_identify} onChange={(v) => update("p3_identify", v)} />
      </SectionBlock>
      <SectionBlock label="Understand — What's causing the misalignment">
        <LabeledTextarea label="What's causing the misalignment?" value={d.p3_understand} onChange={(v) => update("p3_understand", v)} />
      </SectionBlock>
      <SectionBlock label="Build a Plan — The change needed">
        <LabeledTextarea label="What needs to change to bring it back into alignment?" value={d.p3_build} onChange={(v) => update("p3_build", v)} />
      </SectionBlock>
      <SectionBlock label="Execute — Alignment conversation">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <LabeledInput label="The alignment conversation you'll have" value={d.p3_execute} onChange={(v) => update("p3_execute", v)} placeholder="Topic / setting" />
          <LabeledInput label="Date" type="date" value={d.p3_execute_date} onChange={(v) => update("p3_execute_date", v)} />
        </div>
      </SectionBlock>
      <SectionBlock label="Measure — How you'll know alignment improved">
        <LabeledTextarea label="How will you know alignment improved?" value={d.p3_measure} onChange={(v) => update("p3_measure", v)} />
      </SectionBlock>
    </div>
  );
}

function Part4({ d, update }: { d: SectionData; update: UpdateFn }) {
  return (
    <div className="space-y-6">
      <SectionBlock label="Evaluate — Your current people-development rhythms" hint="Rate how often each rhythm shows up in how you lead.">
        <RhythmGrid values={d.p4_ratings} onChange={(v) => update("p4_ratings", v)} />
      </SectionBlock>
      <SectionBlock label="Identify — The rhythm most missing">
        <LabeledTextarea label="Which rhythm is most missing from how you lead people?" value={d.p4_identify} onChange={(v) => update("p4_identify", v)} />
      </SectionBlock>
      <SectionBlock label="Understand — What's blocking it">
        <LabeledTextarea label="What's blocking that rhythm from being consistent?" value={d.p4_understand} onChange={(v) => update("p4_understand", v)} />
      </SectionBlock>
      <SectionBlock label="Build a Plan — How you'll build the rhythm in">
        <LabeledTextarea label="How will you build that rhythm into your week?" value={d.p4_build} onChange={(v) => update("p4_build", v)} />
      </SectionBlock>
      <SectionBlock label="Execute — The rhythm you'll begin this week">
        <LabeledInput label="The first rhythm you'll begin this week" value={d.p4_execute} onChange={(v) => update("p4_execute", v)} />
      </SectionBlock>
      <SectionBlock label="Measure — How you'll measure consistency">
        <LabeledTextarea label="How will you measure that the rhythm is becoming consistent?" value={d.p4_measure} onChange={(v) => update("p4_measure", v)} />
      </SectionBlock>
    </div>
  );
}

function Part5({ d, update }: { d: SectionData; update: UpdateFn }) {
  return (
    <div className="space-y-6">
      <SectionBlock label="Evaluate — What of your Lead Yourself work you can model">
        <Chips
          label="Which of your own leadership practices most help you lead others?"
          options={CARRY_FORWARD_OPTIONS}
          values={d.p5_chips}
          onChange={(v) => update("p5_chips", v)}
          other={d.p5_chips_other}
          onOtherChange={(v) => update("p5_chips_other", v)}
        />
      </SectionBlock>
      <SectionBlock label="Identify — The one you want to model most">
        <LabeledTextarea label="Which one do you most want to model for the people you lead?" value={d.p5_identify} onChange={(v) => update("p5_identify", v)} />
      </SectionBlock>
      <SectionBlock label="Understand — Why it matters for them">
        <LabeledTextarea label="Why does that practice matter for the people you're growing?" value={d.p5_understand} onChange={(v) => update("p5_understand", v)} />
      </SectionBlock>
      <SectionBlock label="Build a Plan — How you'll model it">
        <LabeledTextarea label="How will you model it so they can see it?" value={d.p5_build} onChange={(v) => update("p5_build", v)} />
      </SectionBlock>
      <SectionBlock label="Execute — First action">
        <LabeledInput label="First action you'll take this week to model it" value={d.p5_execute} onChange={(v) => update("p5_execute", v)} />
      </SectionBlock>
      <SectionBlock label="Measure — How you'll know it's rubbing off">
        <LabeledTextarea label="How will you know the practice is rubbing off on them?" value={d.p5_measure} onChange={(v) => update("p5_measure", v)} />
      </SectionBlock>
    </div>
  );
}

function Part6({ d, update }: { d: SectionData; update: UpdateFn }) {
  return (
    <div className="space-y-6">
      <SectionBlock label="People Development Strategy" hint="One row per priority — this feeds your dashboard.">
        <div className="space-y-4">
          {d.strategy_rows.map((r, i) => (
            <div key={i} className="rounded-xl border border-border bg-background/40 p-3">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-[#433993]">Row {i + 1}</p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <LabeledInput label="Priority" value={r.priority} onChange={(v) => {
                  const arr = [...d.strategy_rows]; arr[i] = { ...r, priority: v }; update("strategy_rows", arr);
                }} />
                <LabeledInput label="Person or Group" value={r.person_or_group} onChange={(v) => {
                  const arr = [...d.strategy_rows]; arr[i] = { ...r, person_or_group: v }; update("strategy_rows", arr);
                }} />
                <LabeledInput label="Development Focus" value={r.focus} onChange={(v) => {
                  const arr = [...d.strategy_rows]; arr[i] = { ...r, focus: v }; update("strategy_rows", arr);
                }} />
                <LabeledInput label="First Action" value={r.first_action} onChange={(v) => {
                  const arr = [...d.strategy_rows]; arr[i] = { ...r, first_action: v }; update("strategy_rows", arr);
                }} />
                <LabeledInput label="Success Marker" value={r.success_marker} onChange={(v) => {
                  const arr = [...d.strategy_rows]; arr[i] = { ...r, success_marker: v }; update("strategy_rows", arr);
                }} />
              </div>
            </div>
          ))}
        </div>
      </SectionBlock>
    </div>
  );
}

function StepCommitment({ d, update }: { d: SectionData; update: UpdateFn }) {
  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-[#433993]/30 bg-gradient-to-br from-[#f6f2ff] to-white p-6">
        <p className="text-sm leading-relaxed text-foreground">
          I commit to growing the people entrusted to me — noticing what they need,
          building the rhythms that develop them, aligning what I do with what I ask of them,
          and modeling the leadership I want them to grow into.
        </p>
      </div>
      <div className="flex items-start gap-3">
        <Checkbox id="commit-5" checked={d.committed} onCheckedChange={(v) => update("committed", Boolean(v))} />
        <Label htmlFor="commit-5" className="text-sm leading-relaxed text-foreground">
          I commit to this cycle.
        </Label>
      </div>
      <div>
        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Date</Label>
        <Input type="date" value={d.commitment_date} onChange={(e) => update("commitment_date", e.target.value)} className="mt-1 max-w-[220px]" />
      </div>
    </div>
  );
}

// ---------- Shared inputs (mirrors Section 4 look) ----------

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

function YesNoList({ label, items, values, onChange }: { label: string; items: string[]; values: YesNo[]; onChange: (v: YesNo[]) => void }) {
  return (
    <div>
      <Label className="text-xs font-medium text-foreground">{label}</Label>
      <div className="mt-2 space-y-2">
        {items.map((q, i) => (
          <div key={i} className="flex items-start justify-between gap-3 rounded-lg border border-border bg-background/60 p-3">
            <p className="text-sm text-foreground">{q}</p>
            <div className="flex shrink-0 gap-1">
              {(["yes", "no"] as const).map((v) => {
                const active = values[i] === v;
                return (
                  <button
                    key={v}
                    type="button"
                    onClick={() => {
                      const arr = [...values]; arr[i] = active ? "" : v; onChange(arr);
                    }}
                    className={`rounded-md px-3 py-1 text-xs font-semibold uppercase transition ${active ? "bg-[#433993] text-white" : "bg-secondary/60 text-foreground ring-1 ring-inset ring-border hover:ring-[#433993]/40"}`}
                  >
                    {v}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function RhythmGrid({ values, onChange }: { values: Rating[]; onChange: (v: Rating[]) => void }) {
  const opts: { v: Rating; label: string }[] = [
    { v: "rarely", label: "Rarely" },
    { v: "sometimes", label: "Sometimes" },
    { v: "consistently", label: "Consistently" },
  ];
  return (
    <div className="space-y-2">
      {RHYTHM_ITEMS.map((item, i) => (
        <div key={i} className="flex flex-col gap-2 rounded-lg border border-border bg-background/60 p-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-foreground">{item}</p>
          <div className="flex shrink-0 gap-1">
            {opts.map(({ v, label }) => {
              const active = values[i] === v;
              return (
                <button
                  key={v}
                  type="button"
                  onClick={() => {
                    const arr = [...values]; arr[i] = active ? "" : v; onChange(arr);
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
  );
}