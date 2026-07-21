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
import { GapReportPanel } from "@/components/scale/GapReportPanel";

export const Route = createFileRoute("/_authenticated/guide/section-10")({
  head: () => ({ meta: [{ title: "Section 10 · Lead Leaders" }] }),
  component: SectionTenPage,
});

const TOTAL_SECTIONS = 12;
const TOTAL_STEPS = 7;

const FUEL_CHIPS = [
  "Physical energy",
  "Mental energy",
  "Emotional energy",
  "Spiritual grounding",
  "Focus & discipline",
  "Recovery habits",
  "Personal standards",
  "Support system",
];

const REVISIT_SECTIONS = [
  "Section 2 — Lead Yourself",
  "Section 3 — Leadership Performance Dashboard",
  "Section 4 — Lead Others",
  "Section 5 — Growing People Intentionally",
  "Section 6 — Review & Recalibration",
  "Section 7 — Lead for Results",
  "Section 8 — Evaluation & Crucial Conversations",
  "Section 9 — Integration & Real-World Leadership",
];

interface SectionData {
  step: number;
  // Part 1 — Leadership Legacy Review
  p1_legacy: string;
  p1_shaped_by: string;
  p1_pass_on: string;
  // Part 2 — Choose the Leader
  p2_name: string;
  p2_current_role: string;
  p2_future_role: string;
  p2_why: string;
  // Part 3 — Leader Development Profile
  p3_strengths: string;
  p3_gap1: string;
  p3_gap2: string;
  p3_gap3: string;
  p3_success_image: string;
  p3_success_drivers: string;
  p3_fuel: string[];
  // Part 4 — Leadership Transfer Plan
  p4_principles: string;
  p4_experiences: string;
  p4_stretch: string;
  p4_feedback: string;
  p4_measure: string;
  // Part 5 — Development Rhythm
  p5_cadence: string;
  p5_review: string;
  p5_revisit: string[];
  p5_using_gap_report: string;
  // Part 6 — Carry the Principles Forward
  p6_carry_forward: string;
  p6_multiply: string;
  // Commitment
  committed: boolean;
  commitment_date: string;
}

const EMPTY: SectionData = {
  step: 1,
  p1_legacy: "",
  p1_shaped_by: "",
  p1_pass_on: "",
  p2_name: "",
  p2_current_role: "",
  p2_future_role: "",
  p2_why: "",
  p3_strengths: "",
  p3_gap1: "",
  p3_gap2: "",
  p3_gap3: "",
  p3_success_image: "",
  p3_success_drivers: "",
  p3_fuel: [],
  p4_principles: "",
  p4_experiences: "",
  p4_stretch: "",
  p4_feedback: "",
  p4_measure: "",
  p5_cadence: "",
  p5_review: "",
  p5_revisit: [],
  p5_using_gap_report: "",
  p6_carry_forward: "",
  p6_multiply: "",
  committed: false,
  commitment_date: "",
};

function SectionTenPage() {
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
        .eq("section_number", 10)
        .maybeSingle();
      if (row?.data) {
        const stored = row.data as unknown as Partial<SectionData>;
        setD({ ...EMPTY, ...stored } as SectionData);
      }
      loaded.current = true;
      setLoading(false);
    })();
  }, [user]);

  const step = d.step;

  const transferPlanFilled =
    d.p4_principles.trim().length > 0 &&
    d.p4_experiences.trim().length > 0 &&
    d.p4_stretch.trim().length > 0 &&
    d.p4_feedback.trim().length > 0 &&
    d.p4_measure.trim().length > 0;

  const isComplete = useMemo(() => {
    return (
      transferPlanFilled &&
      d.p2_name.trim().length > 0 &&
      d.committed &&
      d.commitment_date.length > 0
    );
  }, [d, transferPlanFilled]);

  useEffect(() => {
    if (!user || !loaded.current) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      await supabase.from("optimizer_section_progress").upsert(
        [{ user_id: user.id, section_number: 10, data: d as unknown as never, completed: isComplete }],
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
  const canAdvance = useMemo(() => stepIsValid(step, d, transferPlanFilled), [step, d, transferPlanFilled]);

  async function finish() {
    if (!isComplete || !user) {
      toast.error("Complete the Transfer Plan and sign the commitment to finish.");
      return;
    }
    const transferProgress = [
      d.p4_principles, d.p4_experiences, d.p4_stretch, d.p4_feedback, d.p4_measure,
    ].filter((v) => v.trim().length > 0).length;
    const snapshot = {
      section: 10,
      leader_name: d.p2_name,
      leader_current_role: d.p2_current_role,
      leader_future_role: d.p2_future_role,
      transfer_plan: {
        principles: d.p4_principles,
        experiences: d.p4_experiences,
        stretch: d.p4_stretch,
        feedback: d.p4_feedback,
        measure: d.p4_measure,
        progress: transferProgress,
        total: 5,
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
    toast.success("Section 10 complete.");
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
        <PrintSectionButton section={10} hasContent={hasPrintableContent(d)} />
      </div>

      <SectionVideo sectionNumber={10} sectionTitle="Lead Leaders" />

      <div className="mb-6">
        <div className="flex items-center justify-between text-xs font-medium uppercase tracking-widest text-muted-foreground">
          <span>Section 10 of {TOTAL_SECTIONS}</span>
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
        {step === 7 && <Part7 d={d} update={update} transferPlanFilled={transferPlanFilled} />}
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
            Finish Section 10 <Check className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>
    </main>
  );
}

function stepTitle(step: number) {
  switch (step) {
    case 1: return "Part 1 — Leadership Legacy Review";
    case 2: return "Part 2 — Choose the Leader";
    case 3: return "Part 3 — Leader Development Profile";
    case 4: return "Part 4 — Leadership Transfer Plan";
    case 5: return "Part 5 — Development Rhythm";
    case 6: return "Part 6 — Carry the Principles Forward";
    case 7: return "Leadership Commitment";
    default: return "";
  }
}

function stepIsValid(step: number, d: SectionData, transferPlanFilled: boolean): boolean {
  switch (step) {
    case 1: return true;
    case 2: return d.p2_name.trim().length > 0;
    case 3: return true;
    case 4: return transferPlanFilled;
    case 5: return true;
    case 6: return true;
    case 7: return d.committed && d.commitment_date.length > 0 && transferPlanFilled && d.p2_name.trim().length > 0;
    default: return true;
  }
}

type UpdateFn = <K extends keyof SectionData>(k: K, v: SectionData[K]) => void;

function Part1({ d, update }: { d: SectionData; update: UpdateFn }) {
  return (
    <div className="space-y-6">
      <SectionBlock label="Leadership Legacy Review" hint="Zoom out. This is about the leader footprint you want to leave.">
        <LabeledTextarea label="What legacy do you want your leadership to leave?" value={d.p1_legacy} onChange={(v) => update("p1_legacy", v)} />
        <LabeledTextarea label="Which leader (past or present) most shaped how you lead — and how?" value={d.p1_shaped_by} onChange={(v) => update("p1_shaped_by", v)} />
        <LabeledTextarea label="What is the most important thing you need to pass on to the next leader?" value={d.p1_pass_on} onChange={(v) => update("p1_pass_on", v)} />
      </SectionBlock>
    </div>
  );
}

function Part2({ d, update }: { d: SectionData; update: UpdateFn }) {
  return (
    <div className="space-y-6">
      <SectionBlock label="Choose the Leader" hint="One person. The leader you will invest in this cycle.">
        <LabeledInput label="Name" value={d.p2_name} onChange={(v) => update("p2_name", v)} />
        <LabeledInput label="Current role" value={d.p2_current_role} onChange={(v) => update("p2_current_role", v)} />
        <LabeledInput label="Potential future role" value={d.p2_future_role} onChange={(v) => update("p2_future_role", v)} />
        <LabeledTextarea label="Why this leader, why now?" value={d.p2_why} onChange={(v) => update("p2_why", v)} />
      </SectionBlock>
    </div>
  );
}

function Part3({ d, update }: { d: SectionData; update: UpdateFn }) {
  return (
    <div className="space-y-6">
      <SectionBlock label="Leader Development Profile">
        <LabeledTextarea label="What are their top strengths as a leader?" value={d.p3_strengths} onChange={(v) => update("p3_strengths", v)} />
        <LabeledInput label="Top GAP #1" value={d.p3_gap1} onChange={(v) => update("p3_gap1", v)} />
        <LabeledInput label="Top GAP #2" value={d.p3_gap2} onChange={(v) => update("p3_gap2", v)} />
        <LabeledInput label="Top GAP #3" value={d.p3_gap3} onChange={(v) => update("p3_gap3", v)} />
        <LabeledTextarea label="Their Success Image — who they're becoming as a leader" value={d.p3_success_image} onChange={(v) => update("p3_success_image", v)} />
        <LabeledTextarea label="Their Success Drivers — what will fuel their growth" value={d.p3_success_drivers} onChange={(v) => update("p3_success_drivers", v)} />
        <Chips label="Where is their FUEL strongest / weakest? (select what applies)" options={FUEL_CHIPS} values={d.p3_fuel} onChange={(v) => update("p3_fuel", v)} />
      </SectionBlock>
    </div>
  );
}

function Part4({ d, update }: { d: SectionData; update: UpdateFn }) {
  return (
    <div className="space-y-6">
      <SectionBlock label="Leadership Transfer Plan" hint="The core output of this section. Fill all five fields to complete Section 10.">
        <LabeledTextarea label="Principles — the leadership principles you will transfer to them" value={d.p4_principles} onChange={(v) => update("p4_principles", v)} />
        <LabeledTextarea label="Experiences — what you will put them in to grow them" value={d.p4_experiences} onChange={(v) => update("p4_experiences", v)} />
        <LabeledTextarea label="Stretch — the specific stretch assignment or decision you'll hand them" value={d.p4_stretch} onChange={(v) => update("p4_stretch", v)} />
        <LabeledTextarea label="Feedback — how and how often you'll give feedback" value={d.p4_feedback} onChange={(v) => update("p4_feedback", v)} />
        <LabeledTextarea label="Measure — how you'll know the transfer is working" value={d.p4_measure} onChange={(v) => update("p4_measure", v)} />
      </SectionBlock>
    </div>
  );
}

function Part5({ d, update }: { d: SectionData; update: UpdateFn }) {
  return (
    <div className="space-y-6">
      <SectionBlock label="Development Rhythm">
        <LabeledInput label="Meeting cadence with this leader (e.g., weekly 1:1, biweekly review)" value={d.p5_cadence} onChange={(v) => update("p5_cadence", v)} />
        <LabeledTextarea label="How will you review progress with them?" value={d.p5_review} onChange={(v) => update("p5_review", v)} />
        <Chips label="Which sections of the Optimized Leader Guide will you have them revisit with you?" options={REVISIT_SECTIONS} values={d.p5_revisit} onChange={(v) => update("p5_revisit", v)} />
        <LabeledTextarea label="How will you use their GAP Report inside this development rhythm?" value={d.p5_using_gap_report} onChange={(v) => update("p5_using_gap_report", v)} />
      </SectionBlock>
    </div>
  );
}

function Part6({ d, update }: { d: SectionData; update: UpdateFn }) {
  return (
    <div className="space-y-6">
      <SectionBlock label="Carry the Principles Forward">
        <LabeledTextarea label="Which principles from your own leadership will you carry forward into this leader?" value={d.p6_carry_forward} onChange={(v) => update("p6_carry_forward", v)} />
        <LabeledTextarea label="How will you multiply — beyond this one leader — over the next 12 months?" value={d.p6_multiply} onChange={(v) => update("p6_multiply", v)} />
      </SectionBlock>
    </div>
  );
}

function Part7({ d, update, transferPlanFilled }: { d: SectionData; update: UpdateFn; transferPlanFilled: boolean }) {
  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-[#433993]/30 bg-gradient-to-br from-[#f6f2ff] to-white p-6">
        <p className="text-sm leading-relaxed text-foreground">
          I commit to leading {d.p2_name || "this leader"} — with intention, discipline, and love —
          to transfer what I've been given and multiply leadership beyond myself.
        </p>
      </div>
      {!transferPlanFilled && (
        <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
          Complete the Leadership Transfer Plan (Part 4) before signing your commitment.
        </div>
      )}
      <div className="flex items-start gap-3">
        <Checkbox id="commit-10" checked={d.committed} onCheckedChange={(v) => update("committed", Boolean(v))} />
        <Label htmlFor="commit-10" className="text-sm leading-relaxed text-foreground">
          I commit to the Leadership Transfer Plan and development rhythm I've built here.
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