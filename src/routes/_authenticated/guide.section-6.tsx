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

export const Route = createFileRoute("/_authenticated/guide/section-6")({
  head: () => ({ meta: [{ title: "Section 6 · Leadership Review & Recalibration" }] }),
  component: SectionSixPage,
});

const TOTAL_SECTIONS = 12;
const TOTAL_STEPS = 7;

type FuelRating = "" | "better" | "same" | "needs_attention";
type AlignRating = "" | "strong" | "needs_attention";

const FUEL_AREAS = [
  "F — Firm Up Character",
  "U — Understand Emotions",
  "E — Envision Success",
  "L — Lead Themselves Daily",
];

const GROWTH_CHIPS = [
  "Confidence",
  "Ownership",
  "Follow-through",
  "Communication",
  "Emotional regulation",
  "Decision-making",
  "Initiative",
  "Coachability",
];

const APPROACH_CHIPS = [
  "Listen more before I lead",
  "Communicate the way they can hear",
  "Create clearer expectations",
  "Hold higher standards",
  "Coach instead of fix",
  "Delegate real ownership",
  "Give faster feedback",
  "Show more belief in them",
];

const ALIGNMENT_AREAS = [
  "Personal alignment",
  "Role alignment",
  "Organizational alignment",
  "Leadership alignment",
];

const LEAK_CHIPS = [
  "Overcommitting",
  "Avoiding hard conversations",
  "Doing work I should delegate",
  "Reacting instead of leading",
  "Skipping recovery",
  "Breaking my own standards",
  "Losing focus on priorities",
  "Neglecting my people",
];

interface SectionData {
  step: number;
  // Dashboard 1 — Lead Yourself Review
  d1_fuel: FuelRating[]; // one per FUEL_AREAS
  d1_identify: string;
  d1_understand: string;
  d1_build: string;
  d1_execute: string;
  d1_measure: string;
  // Dashboard 2 — Lead Others Review
  d2_growth_chips: string[];
  d2_approach_chips: string[];
  d2_other: string;
  d2_identify: string;
  d2_understand: string;
  d2_build: string;
  d2_execute: string;
  d2_measure: string;
  // Dashboard 3 — Alignment Review
  d3_align: AlignRating[]; // one per ALIGNMENT_AREAS
  d3_identify: string;
  d3_understand: string;
  d3_build: string;
  d3_execute: string;
  d3_measure: string;
  // Dashboard 4 — Leadership Leak Review
  d4_leaks: string[];
  d4_leaks_other: string;
  d4_identify: string;
  d4_understand: string;
  d4_build: string;
  d4_execute: string;
  d4_measure: string;
  // Dashboard 5 — Carry It Forward
  d5_lesson: string;
  d5_principle_3: string;
  d5_understand: string;
  d5_build: string;
  d5_execute: string;
  d5_measure: string;
  // Dashboard 6 — Recalibration
  d6_personal_adjustment: string;
  d6_people_adjustment: string;
  d6_conversation: string;
  d6_discipline: string;
  d6_success_marker: string;
  // Commitment
  committed: boolean;
  commitment_date: string;
}

const EMPTY: SectionData = {
  step: 1,
  d1_fuel: FUEL_AREAS.map(() => "" as FuelRating),
  d1_identify: "",
  d1_understand: "",
  d1_build: "",
  d1_execute: "",
  d1_measure: "",
  d2_growth_chips: [],
  d2_approach_chips: [],
  d2_other: "",
  d2_identify: "",
  d2_understand: "",
  d2_build: "",
  d2_execute: "",
  d2_measure: "",
  d3_align: ALIGNMENT_AREAS.map(() => "" as AlignRating),
  d3_identify: "",
  d3_understand: "",
  d3_build: "",
  d3_execute: "",
  d3_measure: "",
  d4_leaks: [],
  d4_leaks_other: "",
  d4_identify: "",
  d4_understand: "",
  d4_build: "",
  d4_execute: "",
  d4_measure: "",
  d5_lesson: "",
  d5_principle_3: "",
  d5_understand: "",
  d5_build: "",
  d5_execute: "",
  d5_measure: "",
  d6_personal_adjustment: "",
  d6_people_adjustment: "",
  d6_conversation: "",
  d6_discipline: "",
  d6_success_marker: "",
  committed: false,
  commitment_date: "",
};

function SectionSixPage() {
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
        .eq("section_number", 6)
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
      d.d1_fuel.some((r) => r !== "") && d.d1_execute.trim().length > 0 &&
      (d.d2_growth_chips.length + d.d2_approach_chips.length + (d.d2_other.trim() ? 1 : 0)) > 0 &&
      d.d2_execute.trim().length > 0 &&
      d.d3_align.some((r) => r !== "") && d.d3_execute.trim().length > 0 &&
      (d.d4_leaks.length > 0 || d.d4_leaks_other.trim().length > 0) &&
      d.d4_execute.trim().length > 0 &&
      d.d5_lesson.trim().length > 0 && d.d5_principle_3.trim().length > 0 &&
      d.d6_success_marker.trim().length > 0 &&
      d.committed && d.commitment_date.length > 0
    );
  }, [d]);

  useEffect(() => {
    if (!user || !loaded.current) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      await supabase.from("optimizer_section_progress").upsert(
        [{ user_id: user.id, section_number: 6, data: d as unknown as never, completed: isComplete }],
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
      toast.error("Fill every dashboard and sign the commitment to finish.");
      return;
    }
    const snapshot = {
      section: 6,
      recalibration: {
        personal_adjustment: d.d6_personal_adjustment,
        people_adjustment: d.d6_people_adjustment,
        conversation: d.d6_conversation,
        discipline: d.d6_discipline,
        success_marker: d.d6_success_marker,
      },
      commitment_date: d.commitment_date,
    };
    const { error } = await supabase.from("leadership_dashboard_snapshots").insert([
      { user_id: user.id, data: snapshot as unknown as never },
    ]);
    if (error) {
      toast.error("Couldn't save your snapshot. Please try again.");
      return;
    }
    toast.success("Section 6 complete.");
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
        <PrintSectionButton section={6} hasContent={hasPrintableContent(d)} />
      </div>

      <SectionVideo sectionNumber={6} sectionTitle="Leadership Review & Recalibration" />

      <div className="mb-6">
        <div className="flex items-center justify-between text-xs font-medium uppercase tracking-widest text-muted-foreground">
          <span>Section 6 of {TOTAL_SECTIONS}</span>
          <span>Dashboard {step} of {TOTAL_STEPS}</span>
        </div>
        <Progress value={(step / TOTAL_STEPS) * 100} className="mt-2 h-1.5" />
        <GapReportPanel className="mt-4" />
        <h1 className="mt-4 font-display text-3xl font-semibold text-foreground sm:text-4xl">{stepTitle(step)}</h1>
      </div>

      <div className="space-y-8">
        {step === 1 && <Dashboard1 d={d} update={update} />}
        {step === 2 && <Dashboard2 d={d} update={update} />}
        {step === 3 && <Dashboard3 d={d} update={update} />}
        {step === 4 && <Dashboard4 d={d} update={update} />}
        {step === 5 && <Dashboard5 d={d} update={update} />}
        {step === 6 && <Dashboard6 d={d} update={update} />}
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
            Finish Section 6 <Check className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>
    </main>
  );
}

function stepTitle(step: number) {
  switch (step) {
    case 1: return "Dashboard 1 — Lead Yourself Review";
    case 2: return "Dashboard 2 — Lead Others Review";
    case 3: return "Dashboard 3 — Alignment Review";
    case 4: return "Dashboard 4 — Leadership Leak Review";
    case 5: return "Dashboard 5 — Carry It Forward";
    case 6: return "Dashboard 6 — Leadership Recalibration";
    case 7: return "Leadership Commitment";
    default: return "";
  }
}

function stepIsValid(step: number, d: SectionData): boolean {
  switch (step) {
    case 1: return d.d1_fuel.some((r) => r !== "") && d.d1_execute.trim().length > 0;
    case 2:
      return (
        (d.d2_growth_chips.length + d.d2_approach_chips.length + (d.d2_other.trim() ? 1 : 0)) > 0 &&
        d.d2_execute.trim().length > 0
      );
    case 3: return d.d3_align.some((r) => r !== "") && d.d3_execute.trim().length > 0;
    case 4: return (d.d4_leaks.length > 0 || d.d4_leaks_other.trim().length > 0) && d.d4_execute.trim().length > 0;
    case 5: return d.d5_lesson.trim().length > 0 && d.d5_principle_3.trim().length > 0;
    case 6: return d.d6_success_marker.trim().length > 0;
    case 7: return d.committed && d.commitment_date.length > 0;
    default: return true;
  }
}

type UpdateFn = <K extends keyof SectionData>(k: K, v: SectionData[K]) => void;

function Dashboard1({ d, update }: { d: SectionData; update: UpdateFn }) {
  const opts: { v: FuelRating; label: string }[] = [
    { v: "better", label: "Better" },
    { v: "same", label: "Same" },
    { v: "needs_attention", label: "Needs Attention" },
  ];
  return (
    <div className="space-y-6">
      <SectionBlock label="Evaluate — Rate each FUEL area since your last review">
        <RatingGrid items={FUEL_AREAS} values={d.d1_fuel} options={opts} onChange={(v) => update("d1_fuel", v as FuelRating[])} />
      </SectionBlock>
      <SectionBlock label="Identify — Where you've grown most">
        <LabeledTextarea label="Where have you grown most as a leader in this cycle?" value={d.d1_identify} onChange={(v) => update("d1_identify", v)} />
      </SectionBlock>
      <SectionBlock label="Understand — Why the growth happened">
        <LabeledTextarea label="What made that growth possible? What did you do differently?" value={d.d1_understand} onChange={(v) => update("d1_understand", v)} />
      </SectionBlock>
      <SectionBlock label="Build a Plan — What still needs work">
        <LabeledTextarea label="Which part of Leading Yourself still needs the most attention next cycle?" value={d.d1_build} onChange={(v) => update("d1_build", v)} />
      </SectionBlock>
      <SectionBlock label="Execute — The one leadership behavior you'll carry forward">
        <LabeledInput label="One leadership behavior you'll carry into the next cycle" value={d.d1_execute} onChange={(v) => update("d1_execute", v)} />
      </SectionBlock>
      <SectionBlock label="Measure — How you'll know it's holding">
        <LabeledTextarea label="How will you know that behavior is holding under pressure?" value={d.d1_measure} onChange={(v) => update("d1_measure", v)} />
      </SectionBlock>
    </div>
  );
}

function Dashboard2({ d, update }: { d: SectionData; update: UpdateFn }) {
  return (
    <div className="space-y-6">
      <SectionBlock label="Evaluate — Growth you've seen in the people you lead">
        <Chips label="Where have you seen growth in your people?" options={GROWTH_CHIPS} values={d.d2_growth_chips} onChange={(v) => update("d2_growth_chips", v)} />
        <Chips label="How your leadership approach has shifted" options={APPROACH_CHIPS} values={d.d2_approach_chips} onChange={(v) => update("d2_approach_chips", v)} other={d.d2_other} onOtherChange={(v) => update("d2_other", v)} />
      </SectionBlock>
      <SectionBlock label="Identify — The person most affected by how you're leading now">
        <LabeledTextarea label="Who has been most affected by the way you're leading now?" value={d.d2_identify} onChange={(v) => update("d2_identify", v)} />
      </SectionBlock>
      <SectionBlock label="Understand — Why they've responded to your leadership">
        <LabeledTextarea label="Why do you think they responded to your leadership the way they did?" value={d.d2_understand} onChange={(v) => update("d2_understand", v)} />
      </SectionBlock>
      <SectionBlock label="Build a Plan — Where they still need you">
        <LabeledTextarea label="Where do they still need you to grow so you can grow them?" value={d.d2_build} onChange={(v) => update("d2_build", v)} />
      </SectionBlock>
      <SectionBlock label="Execute — First leading-others action next cycle">
        <LabeledInput label="The first Lead Others action you'll take next cycle" value={d.d2_execute} onChange={(v) => update("d2_execute", v)} />
      </SectionBlock>
      <SectionBlock label="Measure — How you'll know they're growing">
        <LabeledTextarea label="How will you know they're continuing to grow?" value={d.d2_measure} onChange={(v) => update("d2_measure", v)} />
      </SectionBlock>
    </div>
  );
}

function Dashboard3({ d, update }: { d: SectionData; update: UpdateFn }) {
  const opts: { v: AlignRating; label: string }[] = [
    { v: "strong", label: "Strong" },
    { v: "needs_attention", label: "Needs Attention" },
  ];
  return (
    <div className="space-y-6">
      <SectionBlock label="Evaluate — Where alignment stands now" hint="Rate each area as Strong or Needs Attention.">
        <RatingGrid items={ALIGNMENT_AREAS} values={d.d3_align} options={opts} onChange={(v) => update("d3_align", v as AlignRating[])} />
      </SectionBlock>
      <SectionBlock label="Identify — The area most out of alignment">
        <LabeledTextarea label="Which of the four is most out of alignment right now?" value={d.d3_identify} onChange={(v) => update("d3_identify", v)} />
      </SectionBlock>
      <SectionBlock label="Understand — What's driving the misalignment">
        <LabeledTextarea label="What's driving that misalignment? What's your part in it?" value={d.d3_understand} onChange={(v) => update("d3_understand", v)} />
      </SectionBlock>
      <SectionBlock label="Build a Plan — What needs to be re-aligned">
        <LabeledTextarea label="What needs to be re-aligned in the next cycle?" value={d.d3_build} onChange={(v) => update("d3_build", v)} />
      </SectionBlock>
      <SectionBlock label="Execute — First alignment action">
        <LabeledInput label="The first alignment action you'll take this week" value={d.d3_execute} onChange={(v) => update("d3_execute", v)} />
      </SectionBlock>
      <SectionBlock label="Measure — How you'll know alignment is restored">
        <LabeledTextarea label="How will you know alignment is restored?" value={d.d3_measure} onChange={(v) => update("d3_measure", v)} />
      </SectionBlock>
    </div>
  );
}

function Dashboard4({ d, update }: { d: SectionData; update: UpdateFn }) {
  return (
    <div className="space-y-6">
      <SectionBlock label="Evaluate — Where your leadership is leaking" hint="Select every leak that's showing up right now.">
        <Chips label="Leadership leaks" options={LEAK_CHIPS} values={d.d4_leaks} onChange={(v) => update("d4_leaks", v)} other={d.d4_leaks_other} onOtherChange={(v) => update("d4_leaks_other", v)} />
      </SectionBlock>
      <SectionBlock label="Identify — The costliest leak">
        <LabeledTextarea label="Which leak is costing you and your people the most right now?" value={d.d4_identify} onChange={(v) => update("d4_identify", v)} />
      </SectionBlock>
      <SectionBlock label="Understand — What's underneath it">
        <LabeledTextarea label="What's underneath that leak? Fear, habit, capacity, avoidance?" value={d.d4_understand} onChange={(v) => update("d4_understand", v)} />
      </SectionBlock>
      <SectionBlock label="Build a Plan — How you'll seal it">
        <LabeledTextarea label="What will you do next cycle to seal that leak?" value={d.d4_build} onChange={(v) => update("d4_build", v)} />
      </SectionBlock>
      <SectionBlock label="Execute — First step to close the leak">
        <LabeledInput label="The first step you'll take this week to close it" value={d.d4_execute} onChange={(v) => update("d4_execute", v)} />
      </SectionBlock>
      <SectionBlock label="Measure — How you'll know it's closed">
        <LabeledTextarea label="How will you know that leak is closed?" value={d.d4_measure} onChange={(v) => update("d4_measure", v)} />
      </SectionBlock>
    </div>
  );
}

function Dashboard5({ d, update }: { d: SectionData; update: UpdateFn }) {
  return (
    <div className="space-y-6">
      <SectionBlock label="Evaluate — The biggest lesson from this cycle">
        <LabeledTextarea label="What is the single biggest lesson this cycle taught you as a leader?" value={d.d5_lesson} onChange={(v) => update("d5_lesson", v)} />
      </SectionBlock>
      <SectionBlock label="Identify — Turn the lesson into Principle 3" hint="State it as a principle you'll lead by, going forward.">
        <LabeledTextarea label="Principle 3 — the leadership principle you're taking forward" value={d.d5_principle_3} onChange={(v) => update("d5_principle_3", v)} placeholder="I lead by…" />
      </SectionBlock>
      <SectionBlock label="Understand — Why this principle matters now">
        <LabeledTextarea label="Why does this principle matter to how you lead from here?" value={d.d5_understand} onChange={(v) => update("d5_understand", v)} />
      </SectionBlock>
      <SectionBlock label="Build a Plan — How you'll live it">
        <LabeledTextarea label="How will you live this principle in the next cycle?" value={d.d5_build} onChange={(v) => update("d5_build", v)} />
      </SectionBlock>
      <SectionBlock label="Execute — First time you'll apply it">
        <LabeledInput label="Where you'll apply this principle first" value={d.d5_execute} onChange={(v) => update("d5_execute", v)} />
      </SectionBlock>
      <SectionBlock label="Measure — How you'll know it's shaping how you lead">
        <LabeledTextarea label="How will you know this principle is actually shaping how you lead?" value={d.d5_measure} onChange={(v) => update("d5_measure", v)} />
      </SectionBlock>
    </div>
  );
}

function Dashboard6({ d, update }: { d: SectionData; update: UpdateFn }) {
  return (
    <div className="space-y-6">
      <SectionBlock label="Leadership Recalibration" hint="One adjustment each. The Success Marker is what this cycle rests on.">
        <LabeledInput label="One personal adjustment you'll make" value={d.d6_personal_adjustment} onChange={(v) => update("d6_personal_adjustment", v)} />
        <LabeledInput label="One people adjustment you'll make" value={d.d6_people_adjustment} onChange={(v) => update("d6_people_adjustment", v)} />
        <LabeledInput label="One conversation you'll have" value={d.d6_conversation} onChange={(v) => update("d6_conversation", v)} />
        <LabeledInput label="One discipline you'll hold" value={d.d6_discipline} onChange={(v) => update("d6_discipline", v)} />
        <LabeledInput label="Success Marker — how you'll know this recalibration is working" value={d.d6_success_marker} onChange={(v) => update("d6_success_marker", v)} />
      </SectionBlock>
    </div>
  );
}

function StepCommitment({ d, update }: { d: SectionData; update: UpdateFn }) {
  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-[#433993]/30 bg-gradient-to-br from-[#f6f2ff] to-white p-6">
        <p className="text-sm leading-relaxed text-foreground">
          I commit to leading from what this cycle taught me — carrying the growth forward,
          closing the leaks I've named, honoring the recalibration I've chosen, and refusing
          to lead the same way I did before.
        </p>
      </div>
      <div className="flex items-start gap-3">
        <Checkbox id="commit-6" checked={d.committed} onCheckedChange={(v) => update("committed", Boolean(v))} />
        <Label htmlFor="commit-6" className="text-sm leading-relaxed text-foreground">
          I commit to this recalibration.
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

function RatingGrid<T extends string>({ items, values, options, onChange }: { items: string[]; values: T[]; options: { v: T; label: string }[]; onChange: (v: T[]) => void }) {
  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <div key={i} className="flex flex-col gap-2 rounded-lg border border-border bg-background/60 p-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-foreground">{item}</p>
          <div className="flex shrink-0 flex-wrap gap-1">
            {options.map(({ v, label }) => {
              const active = values[i] === v;
              return (
                <button
                  key={v}
                  type="button"
                  onClick={() => {
                    const arr = [...values]; arr[i] = active ? ("" as T) : v; onChange(arr);
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