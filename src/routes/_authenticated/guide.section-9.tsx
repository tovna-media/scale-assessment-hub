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
import { Slider } from "@/components/ui/slider";
import { ArrowLeft, ArrowRight, Check, X } from "lucide-react";
import { toast } from "sonner";
import { SectionVideo } from "@/components/scale/SectionVideo";
import { PrintSectionButton } from "@/components/scale/PrintSectionButton";
import { hasPrintableContent } from "@/lib/section-print";
import { GapReportPanel } from "@/components/scale/GapReportPanel";
import { AboutSectionSheet } from "@/components/scale/AboutSectionSheet";

export const Route = createFileRoute("/_authenticated/guide/section-9")({
  head: () => ({ meta: [{ title: "Section 9 · Integration & Real-World Leadership" }] }),
  component: SectionNinePage,
});

const TOTAL_SECTIONS = 12;
const TOTAL_STEPS = 7;

const PRESSURE_CHIPS = [
  "Emotional reactivity",
  "Avoidance",
  "Over-explaining",
  "Hesitation",
  "Rushing",
  "Softening the truth",
  "Going quiet",
  "Controlling the outcome",
];

const BEHAVIOR_CHIPS = [
  "I led into it",
  "I hesitated",
  "I avoided it",
  "I stayed calm",
  "I got reactive",
  "I asked for help",
  "I acted alone",
  "I held the standard",
  "I let the standard slip",
];

const CHALLENGE_PRINCIPLES = [
  "Lead Yourself",
  "Lead Others",
  "Growing People Intentionally",
  "Lead for Results",
  "Crucial Conversations",
];

const GAP_TYPE_CHIPS = [
  "Skill gap",
  "Standards gap",
  "Clarity gap",
  "Trust gap",
  "Accountability gap",
  "Discipline gap",
  "Energy gap",
  "Alignment gap",
];

const DRIFT_CHIPS = [
  "Skipping the hard conversation",
  "Letting the calendar drive me",
  "Reacting instead of leading",
  "Lowering the standard quietly",
  "Losing my morning rhythm",
  "Multitasking through 1:1s",
  "Delaying decisions",
  "Working around a person instead of leading them",
];

const LY_ITEMS = [
  { key: "ly_physical", label: "Physical Energy" },
  { key: "ly_mental", label: "Mental Energy" },
  { key: "ly_emotional", label: "Emotional Energy" },
  { key: "ly_discipline", label: "Discipline" },
  { key: "ly_values", label: "Living your values" },
  { key: "ly_clarity", label: "Clarity of priorities" },
  { key: "ly_followthrough", label: "Follow-through" },
] as const;

const LO_ITEMS = [
  { key: "lo_oneonone", label: "1:1 consistency" },
  { key: "lo_clarity", label: "Clarity of expectations" },
  { key: "lo_accountability", label: "Accountability enforcement" },
  { key: "lo_adaptability", label: "Adaptability to styles" },
] as const;

const LR_ITEMS = [
  { key: "lr_focus", label: "Focus on top priority" },
  { key: "lr_standards", label: "Raising standards" },
  { key: "lr_wins", label: "Creating measurable wins" },
  { key: "lr_gaps", label: "Addressing performance gaps" },
] as const;

type RatingKey =
  | (typeof LY_ITEMS)[number]["key"]
  | (typeof LO_ITEMS)[number]["key"]
  | (typeof LR_ITEMS)[number]["key"];

type Ratings = Record<RatingKey, number>;

interface SectionData {
  step: number;
  // Part 1 — Crucial Conversation Debrief
  p1_went_well: string;
  p1_didnt: string;
  p1_pressure: string[];
  p1_commitment_rating: number; // 1-10
  p1_follow_up: string;
  // Part 2 — Leadership Under Pressure
  p2_behaviors: string[];
  p2_revealed: string;
  // Part 3 — Integration Check ratings + follow-ups
  p3_ratings: Ratings;
  p3_lowest: string;
  p3_lowest_why: string;
  // Part 4 — Real Leadership Challenge
  p4_describe: string;
  p4_principle: string;
  p4_real_issue: string;
  p4_gap_types: string[];
  p4_this_week: string;
  // Part 5 — Drift vs. Discipline
  p5_drifts: string[];
  p5_tighten: string;
  // Part 6 — Next 14-Day Leadership Focus
  p6_c1: string;
  p6_c2: string;
  p6_c3: string;
  p6_c4: string;
  p6_c5: string;
  // Part 7 — Confidence & Growth Reflection
  p7_stronger: string;
  p7_struggle: string;
  p7_confidence: number; // 1-10
  p7_move_up: string;
  // Commitment
  committed: boolean;
  commitment_date: string;
}

const EMPTY_RATINGS: Ratings = {
  ly_physical: 5, ly_mental: 5, ly_emotional: 5, ly_discipline: 5,
  ly_values: 5, ly_clarity: 5, ly_followthrough: 5,
  lo_oneonone: 5, lo_clarity: 5, lo_accountability: 5, lo_adaptability: 5,
  lr_focus: 5, lr_standards: 5, lr_wins: 5, lr_gaps: 5,
};

const EMPTY: SectionData = {
  step: 1,
  p1_went_well: "",
  p1_didnt: "",
  p1_pressure: [],
  p1_commitment_rating: 5,
  p1_follow_up: "",
  p2_behaviors: [],
  p2_revealed: "",
  p3_ratings: EMPTY_RATINGS,
  p3_lowest: "",
  p3_lowest_why: "",
  p4_describe: "",
  p4_principle: "",
  p4_real_issue: "",
  p4_gap_types: [],
  p4_this_week: "",
  p5_drifts: [],
  p5_tighten: "",
  p6_c1: "", p6_c2: "", p6_c3: "", p6_c4: "", p6_c5: "",
  p7_stronger: "",
  p7_struggle: "",
  p7_confidence: 5,
  p7_move_up: "",
  committed: false,
  commitment_date: "",
};

function SectionNinePage() {
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
        .eq("section_number", 9)
        .maybeSingle();
      if (row?.data) {
        const stored = row.data as unknown as Partial<SectionData>;
        setD({
          ...EMPTY,
          ...stored,
          p3_ratings: { ...EMPTY_RATINGS, ...(stored.p3_ratings ?? {}) },
        } as SectionData);
      }
      loaded.current = true;
      setLoading(false);
    })();
  }, [user]);

  const step = d.step;

  const isComplete = useMemo(() => {
    return (
      d.p1_went_well.trim().length > 0 && d.p1_didnt.trim().length > 0 &&
      d.p2_revealed.trim().length > 0 &&
      d.p3_lowest.trim().length > 0 && d.p3_lowest_why.trim().length > 0 &&
      d.p4_describe.trim().length > 0 && d.p4_principle.trim().length > 0 && d.p4_this_week.trim().length > 0 &&
      d.p5_tighten.trim().length > 0 &&
      d.p6_c1.trim().length > 0 && d.p6_c2.trim().length > 0 && d.p6_c3.trim().length > 0 && d.p6_c4.trim().length > 0 && d.p6_c5.trim().length > 0 &&
      d.p7_stronger.trim().length > 0 && d.p7_struggle.trim().length > 0 && d.p7_move_up.trim().length > 0 &&
      d.committed && d.commitment_date.length > 0
    );
  }, [d]);

  useEffect(() => {
    if (!user || !loaded.current) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      await supabase.from("optimizer_section_progress").upsert(
        [{ user_id: user.id, section_number: 9, data: d as unknown as never, completed: isComplete }],
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
      section: 9,
      integration_check: d.p3_ratings,
      commitment_rating: d.p1_commitment_rating,
      confidence_rating: d.p7_confidence,
      commitment_date: d.commitment_date,
    };
    const { error } = await supabase.from("leadership_dashboard_snapshots").insert([
      { user_id: user.id, data: snapshot as unknown as never },
    ]);
    if (error) {
      toast.error("Couldn't save your snapshot. Please try again.");
      return;
    }
    toast.success("Section 9 complete.");
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
        <PrintSectionButton section={9} hasContent={hasPrintableContent(d)} />
      </div>

      <SectionVideo sectionNumber={9} sectionTitle="Integration & Real-World Leadership" />

      <div className="mb-6">
        <div className="flex items-center justify-between text-xs font-medium uppercase tracking-widest text-muted-foreground">
          <span>Section 9 of {TOTAL_SECTIONS}</span>
          <span>Part {step} of {TOTAL_STEPS}</span>
        </div>
        <Progress value={(step / TOTAL_STEPS) * 100} className="mt-2 h-1.5" />
        <GapReportPanel className="mt-4" />
        <h1 className="mt-4 font-display text-3xl font-semibold text-foreground sm:text-4xl">{stepTitle(step)}</h1>
        <AboutSectionButtonS9 className="mt-3" />
      </div>

      <div className="space-y-8">
        {step === 1 && <Part1 d={d} update={update} />}
        {step === 2 && <Part2 d={d} update={update} />}
        {step === 3 && <Part3 d={d} update={update} />}
        {step === 4 && <Part4 d={d} update={update} />}
        {step === 5 && <Part5 d={d} update={update} />}
        {step === 6 && <Part6 d={d} update={update} />}
        {step === 7 && <Part7 d={d} update={update} />}
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
            Finish Section 9 <Check className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>
    </main>
  );
}

function stepTitle(step: number) {
  switch (step) {
    case 1: return "Part 1 — Crucial Conversation Debrief";
    case 2: return "Part 2 — Leadership Under Pressure";
    case 3: return "Part 3 — Integration Check";
    case 4: return "Part 4 — Real Leadership Challenge";
    case 5: return "Part 5 — Drift vs. Discipline";
    case 6: return "Part 6 — Next 14-Day Leadership Focus";
    case 7: return "Part 7 — Confidence & Growth Reflection";
    default: return "";
  }
}

function stepIsValid(step: number, d: SectionData): boolean {
  switch (step) {
    case 1: return d.p1_went_well.trim().length > 0 && d.p1_didnt.trim().length > 0;
    case 2: return d.p2_revealed.trim().length > 0;
    case 3: return d.p3_lowest.trim().length > 0 && d.p3_lowest_why.trim().length > 0;
    case 4: return d.p4_describe.trim().length > 0 && d.p4_principle.trim().length > 0 && d.p4_this_week.trim().length > 0;
    case 5: return d.p5_tighten.trim().length > 0;
    case 6: return d.p6_c1.trim().length > 0 && d.p6_c2.trim().length > 0 && d.p6_c3.trim().length > 0 && d.p6_c4.trim().length > 0 && d.p6_c5.trim().length > 0;
    case 7: return d.p7_stronger.trim().length > 0 && d.p7_struggle.trim().length > 0 && d.p7_move_up.trim().length > 0 && d.committed && d.commitment_date.length > 0;
    default: return true;
  }
}

type UpdateFn = <K extends keyof SectionData>(k: K, v: SectionData[K]) => void;

function Part1({ d, update }: { d: SectionData; update: UpdateFn }) {
  return (
    <div className="space-y-6">
      <SectionBlock label="Debrief — Your last crucial conversation">
        <LabeledTextarea label="What went well in the conversation?" value={d.p1_went_well} onChange={(v) => update("p1_went_well", v)} />
        <LabeledTextarea label="What didn't go well?" value={d.p1_didnt} onChange={(v) => update("p1_didnt", v)} />
      </SectionBlock>
      <SectionBlock label="Pressure — What showed up in you">
        <Chips label="What pressure responses showed up?" options={PRESSURE_CHIPS} values={d.p1_pressure} onChange={(v) => update("p1_pressure", v)} />
      </SectionBlock>
      <SectionBlock label="Commitment Rating" hint="How committed do you feel to what you said you'd do next? 1 = not committed, 10 = fully committed.">
        <RatingSlider label="Commitment rating" value={d.p1_commitment_rating} onChange={(n) => update("p1_commitment_rating", n)} />
      </SectionBlock>
      <SectionBlock label="Follow-up">
        <LabeledTextarea label="What is the one follow-up action you owe from this conversation?" value={d.p1_follow_up} onChange={(v) => update("p1_follow_up", v)} />
      </SectionBlock>
    </div>
  );
}

function Part2({ d, update }: { d: SectionData; update: UpdateFn }) {
  return (
    <div className="space-y-6">
      <SectionBlock label="Leadership Under Pressure — Behaviors">
        <Chips label="Which of these describe how you led under pressure recently?" options={BEHAVIOR_CHIPS} values={d.p2_behaviors} onChange={(v) => update("p2_behaviors", v)} />
      </SectionBlock>
      <SectionBlock label="What it revealed">
        <LabeledTextarea label="What did leading under pressure reveal about you as a leader?" value={d.p2_revealed} onChange={(v) => update("p2_revealed", v)} />
      </SectionBlock>
    </div>
  );
}

function Part3({ d, update }: { d: SectionData; update: UpdateFn }) {
  const setR = (k: RatingKey, n: number) => update("p3_ratings", { ...d.p3_ratings, [k]: n });
  return (
    <div className="space-y-6">
      <SectionBlock label="Lead Yourself" hint="Rate yourself 1–10 on each. Be honest.">
        {LY_ITEMS.map((it) => (
          <RatingSlider key={it.key} label={it.label} value={d.p3_ratings[it.key]} onChange={(n) => setR(it.key, n)} />
        ))}
      </SectionBlock>
      <SectionBlock label="Lead Others">
        {LO_ITEMS.map((it) => (
          <RatingSlider key={it.key} label={it.label} value={d.p3_ratings[it.key]} onChange={(n) => setR(it.key, n)} />
        ))}
      </SectionBlock>
      <SectionBlock label="Lead for Results">
        {LR_ITEMS.map((it) => (
          <RatingSlider key={it.key} label={it.label} value={d.p3_ratings[it.key]} onChange={(n) => setR(it.key, n)} />
        ))}
      </SectionBlock>
      <SectionBlock label="Identify — Your lowest score">
        <LabeledInput label="Which item scored the lowest?" value={d.p3_lowest} onChange={(v) => update("p3_lowest", v)} />
        <LabeledTextarea label="Why is that one the lowest right now?" value={d.p3_lowest_why} onChange={(v) => update("p3_lowest_why", v)} />
      </SectionBlock>
    </div>
  );
}

function Part4({ d, update }: { d: SectionData; update: UpdateFn }) {
  return (
    <div className="space-y-6">
      <SectionBlock label="Real Leadership Challenge">
        <LabeledTextarea label="Describe a real leadership challenge you're facing right now." value={d.p4_describe} onChange={(v) => update("p4_describe", v)} />
        <div>
          <Label className="text-xs font-medium text-foreground">Which principle is being tested?</Label>
          <div className="mt-2 flex flex-wrap gap-2">
            {CHALLENGE_PRINCIPLES.map((opt) => {
              const active = d.p4_principle === opt;
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => update("p4_principle", active ? "" : opt)}
                  className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium transition ${active ? "bg-[#433993] text-white" : "bg-secondary/60 text-foreground ring-1 ring-inset ring-border hover:ring-[#433993]/40"}`}
                >
                  {opt}
                </button>
              );
            })}
          </div>
        </div>
        <LabeledTextarea label="What is the real issue underneath the challenge?" value={d.p4_real_issue} onChange={(v) => update("p4_real_issue", v)} />
        <Chips label="What type of gap is this?" options={GAP_TYPE_CHIPS} values={d.p4_gap_types} onChange={(v) => update("p4_gap_types", v)} />
        <LabeledTextarea label="What will you do differently this week to lead into it?" value={d.p4_this_week} onChange={(v) => update("p4_this_week", v)} />
      </SectionBlock>
    </div>
  );
}

function Part5({ d, update }: { d: SectionData; update: UpdateFn }) {
  return (
    <div className="space-y-6">
      <SectionBlock label="Drift — Where you've been slipping">
        <Chips label="Which drift patterns have crept back in?" options={DRIFT_CHIPS} values={d.p5_drifts} onChange={(v) => update("p5_drifts", v)} />
      </SectionBlock>
      <SectionBlock label="Discipline — What you'll tighten">
        <LabeledTextarea label="Name one specific behavior you will tighten this week." value={d.p5_tighten} onChange={(v) => update("p5_tighten", v)} />
      </SectionBlock>
    </div>
  );
}

function Part6({ d, update }: { d: SectionData; update: UpdateFn }) {
  return (
    <div className="space-y-6">
      <SectionBlock label="Next 14-Day Leadership Focus" hint="Five commitments. Specific. Doable. Measurable.">
        <LabeledInput label="Commitment 1" value={d.p6_c1} onChange={(v) => update("p6_c1", v)} />
        <LabeledInput label="Commitment 2" value={d.p6_c2} onChange={(v) => update("p6_c2", v)} />
        <LabeledInput label="Commitment 3" value={d.p6_c3} onChange={(v) => update("p6_c3", v)} />
        <LabeledInput label="Commitment 4" value={d.p6_c4} onChange={(v) => update("p6_c4", v)} />
        <LabeledInput label="Commitment 5" value={d.p6_c5} onChange={(v) => update("p6_c5", v)} />
      </SectionBlock>
    </div>
  );
}

function Part7({ d, update }: { d: SectionData; update: UpdateFn }) {
  return (
    <div className="space-y-6">
      <SectionBlock label="Confidence & Growth Reflection">
        <LabeledTextarea label="Where are you stronger than you were at the start of this cycle?" value={d.p7_stronger} onChange={(v) => update("p7_stronger", v)} />
        <LabeledTextarea label="Where do you still struggle?" value={d.p7_struggle} onChange={(v) => update("p7_struggle", v)} />
        <RatingSlider label="Confidence in your leadership right now (1–10)" value={d.p7_confidence} onChange={(n) => update("p7_confidence", n)} />
        <LabeledTextarea label="What would move you up one point?" value={d.p7_move_up} onChange={(v) => update("p7_move_up", v)} />
      </SectionBlock>
      <div className="rounded-2xl border border-[#433993]/30 bg-gradient-to-br from-[#f6f2ff] to-white p-6">
        <p className="text-sm leading-relaxed text-foreground">
          I commit to integrating what I've learned — under pressure, in the real world,
          with the people I lead — and to closing the gap between who I am and who I'm becoming.
        </p>
      </div>
      <div className="flex items-start gap-3">
        <Checkbox id="commit-9" checked={d.committed} onCheckedChange={(v) => update("committed", Boolean(v))} />
        <Label htmlFor="commit-9" className="text-sm leading-relaxed text-foreground">
          I commit to the 14-day focus and the discipline I've named here.
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

function RatingSlider({ label, value, onChange }: { label: string; value: number; onChange: (n: number) => void }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <Label className="text-xs font-medium text-foreground">{label}</Label>
        <span className="text-sm font-semibold text-[#433993]">{value}</span>
      </div>
      <Slider value={[value]} min={1} max={10} step={1} onValueChange={(v) => onChange(v[0] ?? 1)} />
    </div>
  );
}

function Chips({ label, options, values, onChange }: { label: string; options: string[]; values: string[]; onChange: (v: string[]) => void }) {
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
    </div>
  );
}
function AboutSectionButtonS9({ className }: { className?: string }) {
  return (
    <AboutSectionSheet title="Section 9: Integration & Real-World Leadership Application" className={className}>
      <h4 className="font-display text-lg font-semibold text-foreground">Session Objective</h4>
      <p>This session is a full leadership integration review.</p>
      <p>You will:</p>
      <ul className="ml-5 list-disc space-y-1">
        <li>Evaluate the crucial conversation you executed</li>
        <li>Identify leadership strengths and weaknesses under pressure</li>
        <li>Diagnose real-world leadership breakdowns</li>
        <li>Refine your approach to Lead Yourself, Lead Others, and Lead for Results</li>
      </ul>
    </AboutSectionSheet>
  );
}
