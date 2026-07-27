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

export const Route = createFileRoute("/_authenticated/guide/section-8")({
  head: () => ({ meta: [{ title: "Section 8 · Evaluation & Crucial Conversations" }] }),
  component: SectionEightPage,
});

const TOTAL_SECTIONS = 12;
const TOTAL_STEPS = 7;

const EVAL_CHECKS: { key: keyof EvalChecks; label: string }[] = [
  { key: "gap_recurring", label: "Has a GAP Report identified a recurring leadership issue?" },
  { key: "drivers_ignored", label: "Have Success Drivers consistently been ignored?" },
  { key: "markers_stalled", label: "Have Success Markers stalled or declined?" },
  { key: "commitment_not_honored", label: "Has a leadership commitment not been honored?" },
  { key: "expectations_unclear", label: "Have expectations become unclear?" },
  { key: "standards_slipped", label: "Have standards slipped?" },
  { key: "trust_broken", label: "Has trust or communication broken down?" },
];

type EvalChecks = {
  gap_recurring: "" | "yes" | "no";
  drivers_ignored: "" | "yes" | "no";
  markers_stalled: "" | "yes" | "no";
  commitment_not_honored: "" | "yes" | "no";
  expectations_unclear: "" | "yes" | "no";
  standards_slipped: "" | "yes" | "no";
  trust_broken: "" | "yes" | "no";
};

const IMPACT_TARGETS = ["The Individual", "The Team", "The Organization"];

const ALIGNMENT_CHIPS = [
  "The Individual",
  "The Role",
  "The Organization",
  "The Leadership Relationship",
];

interface SectionData {
  step: number;
  // Part 1 — Leadership Evaluation
  p1_checks: EvalChecks;
  p1_other: string;
  p1_identify: string;
  p1_understand: string;
  // Part 2 — Determine the Conversation
  p2_who: string;
  p2_role: string;
  p2_why_now: string;
  p2_impact: string[];
  p2_impact_describe: string;
  // Part 3 — Prepare the Conversation
  p3_worksheet_complete: boolean;
  p3_worksheet_date: string;
  // Part 4 — Love & Tough Love Reflection
  p4_love: string;
  p4_tough_love: string;
  p4_protecting: string;
  p4_balance: string;
  p4_fear: string;
  // Part 5 — Conversation Execution Plan
  p5_name: string;
  p5_date: string;
  p5_location: string;
  p5_follow_up_date: string;
  p5_commitment_sought: string;
  p5_how_measured: string;
  p5_success_marker: string;
  // Part 6 — Conversation Evaluation
  p6_what_happened: string;
  p6_what_worked: string;
  p6_what_i_missed: string;
  p6_next_step: string;
  p6_alignment: string[];
  // Commitment
  committed: boolean;
  commitment_date: string;
}

const EMPTY: SectionData = {
  step: 1,
  p1_checks: {
    gap_recurring: "",
    drivers_ignored: "",
    markers_stalled: "",
    commitment_not_honored: "",
    expectations_unclear: "",
    standards_slipped: "",
    trust_broken: "",
  },
  p1_other: "",
  p1_identify: "",
  p1_understand: "",
  p2_who: "",
  p2_role: "",
  p2_why_now: "",
  p2_impact: [],
  p2_impact_describe: "",
  p3_worksheet_complete: false,
  p3_worksheet_date: "",
  p4_love: "",
  p4_tough_love: "",
  p4_protecting: "",
  p4_balance: "",
  p4_fear: "",
  p5_name: "",
  p5_date: "",
  p5_location: "",
  p5_follow_up_date: "",
  p5_commitment_sought: "",
  p5_how_measured: "",
  p5_success_marker: "",
  p6_what_happened: "",
  p6_what_worked: "",
  p6_what_i_missed: "",
  p6_next_step: "",
  p6_alignment: [],
  committed: false,
  commitment_date: "",
};

function SectionEightPage() {
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
        .eq("section_number", 8)
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
    const anyCheck = Object.values(d.p1_checks).some((v) => v !== "") || d.p1_other.trim().length > 0;
    return (
      anyCheck && d.p1_identify.trim().length > 0 &&
      d.p2_who.trim().length > 0 && d.p2_why_now.trim().length > 0 &&
      d.p3_worksheet_complete && d.p3_worksheet_date.length > 0 &&
      d.p4_love.trim().length > 0 && d.p4_tough_love.trim().length > 0 &&
      d.p5_name.trim().length > 0 && d.p5_date.length > 0 && d.p5_commitment_sought.trim().length > 0 && d.p5_success_marker.trim().length > 0 &&
      d.p6_what_happened.trim().length > 0 && d.p6_next_step.trim().length > 0 &&
      d.committed && d.commitment_date.length > 0
    );
  }, [d]);

  useEffect(() => {
    if (!user || !loaded.current) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      await supabase.from("optimizer_section_progress").upsert(
        [{ user_id: user.id, section_number: 8, data: d as unknown as never, completed: isComplete }],
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
      section: 8,
      conversation: {
        name: d.p5_name,
        date: d.p5_date,
        follow_up_date: d.p5_follow_up_date,
        success_marker: d.p5_success_marker,
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
    toast.success("Section 8 complete.");
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
        <PrintSectionButton section={8} hasContent={hasPrintableContent(d)} />
      </div>

      <SectionVideo sectionNumber={8} sectionTitle="Evaluation & Crucial Conversations" />

      <div className="mb-6">
        <div className="flex items-center justify-between text-xs font-medium uppercase tracking-widest text-muted-foreground">
          <span>Section 8 of {TOTAL_SECTIONS}</span>
          <span>Part {step} of {TOTAL_STEPS}</span>
        </div>
        <Progress value={(step / TOTAL_STEPS) * 100} className="mt-2 h-1.5" />
        <GapReportPanel className="mt-4" />
        <h1 className="mt-4 font-display text-3xl font-semibold text-foreground sm:text-4xl">{stepTitle(step)}</h1>
        <AboutSectionButtonS8 className="mt-3" />
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
            Finish Section 8 <Check className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>
    </main>
  );
}

function stepTitle(step: number) {
  switch (step) {
    case 1: return "Part 1 — Leadership Evaluation";
    case 2: return "Part 2 — Determine the Conversation";
    case 3: return "Part 3 — Prepare the Conversation";
    case 4: return "Part 4 — Love & Tough Love Reflection";
    case 5: return "Part 5 — Conversation Execution Plan";
    case 6: return "Part 6 — Conversation Evaluation";
    case 7: return "Leadership Commitment";
    default: return "";
  }
}

function stepIsValid(step: number, d: SectionData): boolean {
  switch (step) {
    case 1: {
      const anyCheck = Object.values(d.p1_checks).some((v) => v !== "") || d.p1_other.trim().length > 0;
      return anyCheck && d.p1_identify.trim().length > 0;
    }
    case 2: return d.p2_who.trim().length > 0 && d.p2_why_now.trim().length > 0;
    case 3: return d.p3_worksheet_complete && d.p3_worksheet_date.length > 0;
    case 4: return d.p4_love.trim().length > 0 && d.p4_tough_love.trim().length > 0;
    case 5: return d.p5_name.trim().length > 0 && d.p5_date.length > 0 && d.p5_commitment_sought.trim().length > 0 && d.p5_success_marker.trim().length > 0;
    case 6: return d.p6_what_happened.trim().length > 0 && d.p6_next_step.trim().length > 0;
    case 7: return d.committed && d.commitment_date.length > 0;
    default: return true;
  }
}

type UpdateFn = <K extends keyof SectionData>(k: K, v: SectionData[K]) => void;

function Part1({ d, update }: { d: SectionData; update: UpdateFn }) {
  const setCheck = (key: keyof EvalChecks, v: "yes" | "no") => {
    const cur = d.p1_checks[key];
    update("p1_checks", { ...d.p1_checks, [key]: cur === v ? "" : v });
  };
  return (
    <div className="space-y-6">
      <GuideNote>
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#433993]">
          Part 1 – Leadership Evaluation
        </p>
        <p className="mt-2">
          Before preparing for a Crucial Conversation, review everything you have built throughout
          this Leadership Optimization Cycle.
        </p>
      </GuideNote>
      <SectionBlock label="Evaluate">
        <div className="space-y-2">
          {EVAL_CHECKS.map((c) => (
            <div key={c.key} className="flex flex-col gap-2 rounded-lg border border-border bg-background/60 p-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-foreground">{c.label}</p>
              <div className="flex gap-1">
                {(["yes", "no"] as const).map((v) => {
                  const active = d.p1_checks[c.key] === v;
                  return (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setCheck(c.key, v)}
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
        <LabeledInput label="Other:" value={d.p1_other} onChange={(v) => update("p1_other", v)} />
      </SectionBlock>
      <SectionBlock label="Identify">
        <LabeledTextarea label="What issue most requires your leadership right now?" value={d.p1_identify} onChange={(v) => update("p1_identify", v)} />
      </SectionBlock>
      <SectionBlock label="Understand" hint="Stay objective. List facts, observations, and measurable evidence.">
        <LabeledTextarea label="What evidence supports this conclusion?" value={d.p1_understand} onChange={(v) => update("p1_understand", v)} />
      </SectionBlock>
    </div>
  );
}

function Part2({ d, update }: { d: SectionData; update: UpdateFn }) {
  return (
    <div className="space-y-6">
      <GuideNote>
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#433993]">
          Part 2 – Determine the Conversation
        </p>
        <p className="mt-2">Who needs this conversation?</p>
      </GuideNote>
      <SectionBlock label="Who needs this conversation?">
        <LabeledInput label="Name:" value={d.p2_who} onChange={(v) => update("p2_who", v)} />
        <LabeledInput label="Role:" value={d.p2_role} onChange={(v) => update("p2_role", v)} />
        <LabeledTextarea label="Why is this conversation necessary now?" value={d.p2_why_now} onChange={(v) => update("p2_why_now", v)} />
      </SectionBlock>
      <SectionBlock label="If this conversation is avoided, what is the likely impact on:">
        <Chips label="Select all that apply" options={IMPACT_TARGETS} values={d.p2_impact} onChange={(v) => update("p2_impact", v)} />
        <LabeledTextarea label="Describe:" value={d.p2_impact_describe} onChange={(v) => update("p2_impact_describe", v)} />
      </SectionBlock>
    </div>
  );
}

function Part3({ d, update }: { d: SectionData; update: UpdateFn }) {
  return (
    <div className="space-y-6">
      <GuideNote>
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#433993]">
          Part 3 – Prepare the Conversation
        </p>
        <p className="mt-2">
          Every Crucial Conversation should be prepared using the Crucial Conversation Worksheet.
        </p>
        <p className="mt-2">
          Until this process becomes second nature, do not skip writing it out. The discipline of
          preparing the conversation is part of becoming a better leader.
        </p>
      </GuideNote>
      <SectionBlock label="Before moving forward:">
        <div className="flex items-start gap-3">
          <Checkbox id="worksheet-8" checked={d.p3_worksheet_complete} onCheckedChange={(v) => update("p3_worksheet_complete", Boolean(v))} />
          <Label htmlFor="worksheet-8" className="text-sm leading-relaxed text-foreground">
            I have completed the Crucial Conversation Worksheet.
          </Label>
        </div>
        <LabeledInput label="Date Completed:" type="date" value={d.p3_worksheet_date} onChange={(v) => update("p3_worksheet_date", v)} />
      </SectionBlock>
    </div>
  );
}

function Part4({ d, update }: { d: SectionData; update: UpdateFn }) {
  return (
    <div className="space-y-6">
      <GuideNote>
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#433993]">
          Part 4 – Love &amp; Tough Love Reflection
        </p>
        <p className="mt-2">Before having the conversation, evaluate your leadership.</p>
      </GuideNote>
      <SectionBlock label="Evaluate your leadership">
        <LabeledTextarea label="Am I approaching this conversation because I genuinely want what is best for this person?" value={d.p4_love} onChange={(v) => update("p4_love", v)} />
        <LabeledTextarea label="Am I willing to address the issue clearly instead of avoiding it?" value={d.p4_tough_love} onChange={(v) => update("p4_tough_love", v)} />
        <LabeledTextarea label="Am I protecting both the individual and the organization?" value={d.p4_protecting} onChange={(v) => update("p4_protecting", v)} />
        <LabeledTextarea label="Am I balancing love with tough love?" value={d.p4_balance} onChange={(v) => update("p4_balance", v)} />
        <LabeledTextarea label="What fear or hesitation must I overcome before having this conversation?" value={d.p4_fear} onChange={(v) => update("p4_fear", v)} />
      </SectionBlock>
    </div>
  );
}

function Part5({ d, update }: { d: SectionData; update: UpdateFn }) {
  return (
    <div className="space-y-6">
      <GuideNote>
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#433993]">
          Part 5 – Conversation Execution Plan
        </p>
      </GuideNote>
      <SectionBlock label="Conversation Execution Plan">
        <LabeledInput label="Name:" value={d.p5_name} onChange={(v) => update("p5_name", v)} />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <LabeledInput label="Date:" type="date" value={d.p5_date} onChange={(v) => update("p5_date", v)} />
          <LabeledInput label="Location:" value={d.p5_location} onChange={(v) => update("p5_location", v)} />
        </div>
        <LabeledInput label="Follow-Up Date:" type="date" value={d.p5_follow_up_date} onChange={(v) => update("p5_follow_up_date", v)} />
        <LabeledTextarea label="What commitment are you seeking?" value={d.p5_commitment_sought} onChange={(v) => update("p5_commitment_sought", v)} />
        <LabeledTextarea label="How will commitment be measured?" value={d.p5_how_measured} onChange={(v) => update("p5_how_measured", v)} />
        <LabeledInput label="What Success Marker will demonstrate progress?" value={d.p5_success_marker} onChange={(v) => update("p5_success_marker", v)} />
      </SectionBlock>
    </div>
  );
}

function Part6({ d, update }: { d: SectionData; update: UpdateFn }) {
  return (
    <div className="space-y-6">
      <GuideNote>
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#433993]">
          Part 6 – Conversation Evaluation
        </p>
        <p className="mt-2">After completing the conversation…</p>
      </GuideNote>
      <SectionBlock label="Conversation Evaluation">
        <LabeledTextarea label="What went well?" value={d.p6_what_happened} onChange={(v) => update("p6_what_happened", v)} />
        <LabeledTextarea label="What did you learn?" value={d.p6_what_worked} onChange={(v) => update("p6_what_worked", v)} />
        <LabeledTextarea label="What commitments were made?" value={d.p6_what_i_missed} onChange={(v) => update("p6_what_i_missed", v)} />
        <LabeledTextarea label="What follow-up is required?" value={d.p6_next_step} onChange={(v) => update("p6_next_step", v)} />
      </SectionBlock>
      <SectionBlock label="Has this conversation strengthened alignment between:">
        <Chips label="Select all that apply" options={ALIGNMENT_CHIPS} values={d.p6_alignment} onChange={(v) => update("p6_alignment", v)} />
      </SectionBlock>
    </div>
  );
}

function StepCommitment({ d, update }: { d: SectionData; update: UpdateFn }) {
  return (
    <div className="space-y-6">
      <GuideNote>
        <p>Leadership requires courage, preparation, and consistency.</p>
      </GuideNote>
      <div className="rounded-2xl border border-[#433993]/30 bg-gradient-to-br from-[#f6f2ff] to-white p-6">
        <p className="text-sm leading-relaxed text-foreground">
          I commit to addressing issues with honesty, clarity, love, and tough love. I will prepare
          every Crucial Conversation using the complete Crucial Conversation Worksheet and follow
          through on the commitments made.
        </p>
      </div>
      <div className="flex items-start gap-3">
        <Checkbox id="commit-8" checked={d.committed} onCheckedChange={(v) => update("committed", Boolean(v))} />
        <Label htmlFor="commit-8" className="text-sm leading-relaxed text-foreground">
          Signature — I commit to leading this Crucial Conversation.
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
function AboutSectionButtonS8({ className }: { className?: string }) {
  return (
    <AboutSectionSheet title="Section 8: Evaluation & Crucial Conversations" className={className}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#433993]">Principle 3: Lead for Results</p>
      <h4 className="font-display text-lg font-semibold text-foreground">Section Objective</h4>
      <p>Healthy leaders do not avoid difficult conversations.</p>
      <p>As you Lead Yourself, Lead Others, and Lead for Results, there will be times when leadership requires you to address an issue directly. The purpose of a Crucial Conversation is not to win an argument or prove a point. It is to strengthen the individual, protect the organization, reinforce standards, and move everyone toward the desired outcome.</p>
      <p>This section will help you identify when a Crucial Conversation is necessary, prepare intentionally, complete the Crucial Conversation Worksheet, and evaluate the outcome.</p>
      <p className="font-semibold">Remember…</p>
      <p>Preparation is part of leadership. The discipline of writing out the Crucial Conversation Worksheet before the conversation helps you think clearly, communicate effectively, and lead with both love and tough love.</p>
    </AboutSectionSheet>
  );
}
