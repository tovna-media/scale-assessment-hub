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

export const Route = createFileRoute("/_authenticated/guide/section-11")({
  head: () => ({ meta: [{ title: "Section 11 · Protecting the Leadership System" }] }),
  component: SectionElevenPage,
});

const TOTAL_SECTIONS = 12;
const TOTAL_STEPS = 8;

const HELPING_CHIPS = [
  "Lead Yourself",
  "Lead Others",
  "Lead for Results",
  "Think independently",
  "Solve problems instead of depending on me",
];

const DRIFT_CHIPS = [
  "Protecting your FUEL",
  "Reviewing your Success Image",
  "Executing your Success Drivers",
  "Measuring your Success Markers",
  "Conducting Crucial Conversations",
  "Following through on commitments",
  "Developing people intentionally",
  "Other",
];

const STRENGTH_PRINCIPLES = [
  "Lead Yourself",
  "Lead Others",
  "Lead for Results",
  "Lead Leaders",
];

interface SectionData {
  step: number;
  // Part 1 — Protect the Process
  p1_helping: string[];
  p1_what_protects: string;
  p1_threats: string;
  p1_safeguards: string;
  // Part 2 — Development Review
  p2_leader_name: string;
  p2_gap_report_review: string;
  p2_transfer_progress: string;
  p2_next_move: string;
  // Part 3 — Leadership Transfer Review
  p3_working: string;
  p3_stalling: string;
  p3_ownership_shift: string;
  p3_adjust: string;
  // Part 4 — System Drift Review
  p4_drift: string[];
  p4_drift_other: string;
  p4_evidence: string;
  p4_adjustment: string;
  // Part 5 — Standards Protection
  p5_non_negotiables: string;
  p5_slipping: string;
  p5_org: string;
  p5_reinforce: string;
  // Part 6 — Sustainability Review
  p6_energizing: string;
  p6_draining: string;
  p6_transfer: string;
  p6_sustain: string;
  // Part 7 — Leadership Reflection
  p7_strength_principles: string[];
  p7_proud_of: string;
  p7_still_growing: string;
  p7_lesson: string;
  // Commitment
  committed: boolean;
  commitment_date: string;
}

const EMPTY: SectionData = {
  step: 1,
  p1_helping: [],
  p1_what_protects: "",
  p1_threats: "",
  p1_safeguards: "",
  p2_leader_name: "",
  p2_gap_report_review: "",
  p2_transfer_progress: "",
  p2_next_move: "",
  p3_working: "",
  p3_stalling: "",
  p3_ownership_shift: "",
  p3_adjust: "",
  p4_drift: [],
  p4_drift_other: "",
  p4_evidence: "",
  p4_adjustment: "",
  p5_non_negotiables: "",
  p5_slipping: "",
  p5_org: "",
  p5_reinforce: "",
  p6_energizing: "",
  p6_draining: "",
  p6_transfer: "",
  p6_sustain: "",
  p7_strength_principles: [],
  p7_proud_of: "",
  p7_still_growing: "",
  p7_lesson: "",
  committed: false,
  commitment_date: "",
};

function SectionElevenPage() {
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
        .eq("section_number", 11)
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

  const partsFilled =
    d.p1_what_protects.trim().length > 0 &&
    d.p2_gap_report_review.trim().length > 0 &&
    d.p3_working.trim().length > 0 &&
    (d.p4_drift.length > 0 || d.p4_drift_other.trim().length > 0) &&
    d.p4_adjustment.trim().length > 0 &&
    d.p5_non_negotiables.trim().length > 0 &&
    d.p6_sustain.trim().length > 0 &&
    d.p7_proud_of.trim().length > 0;

  const isComplete = useMemo(
    () => partsFilled && d.committed && d.commitment_date.length > 0,
    [partsFilled, d.committed, d.commitment_date],
  );

  useEffect(() => {
    if (!user || !loaded.current) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      await supabase.from("optimizer_section_progress").upsert(
        [{ user_id: user.id, section_number: 11, data: d as unknown as never, completed: isComplete }],
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
      toast.error("Fill each part and sign the commitment to finish.");
      return;
    }
    const driftFlags = [...d.p4_drift];
    if (d.p4_drift.includes("Other") && d.p4_drift_other.trim().length > 0) {
      driftFlags.push(`Other: ${d.p4_drift_other.trim()}`);
    }
    const snapshot = {
      section: 11,
      system_drift_flags: driftFlags,
      drift_evidence: d.p4_evidence,
      drift_adjustment: d.p4_adjustment,
      standards_protection: {
        non_negotiables: d.p5_non_negotiables,
        slipping: d.p5_slipping,
        reinforce: d.p5_reinforce,
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
    toast.success("Section 11 complete.");
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
        <PrintSectionButton section={11} hasContent={hasPrintableContent(d)} />
      </div>

      <SectionVideo sectionNumber={11} sectionTitle="Protecting the Leadership System" />

      <div className="mb-6">
        <div className="flex items-center justify-between text-xs font-medium uppercase tracking-widest text-muted-foreground">
          <span>Section 11 of {TOTAL_SECTIONS}</span>
          <span>Part {step} of {TOTAL_STEPS}</span>
        </div>
        <Progress value={(step / TOTAL_STEPS) * 100} className="mt-2 h-1.5" />
        <GapReportPanel className="mt-4" />
        <h1 className="mt-4 font-display text-3xl font-semibold text-foreground sm:text-4xl">{stepTitle(step)}</h1>
        <AboutSectionButtonS11 className="mt-3" />
      </div>

      <div className="space-y-8">
        {step === 1 && <Part1 d={d} update={update} />}
        {step === 2 && <Part2 d={d} update={update} />}
        {step === 3 && <Part3 d={d} update={update} />}
        {step === 4 && <Part4 d={d} update={update} />}
        {step === 5 && <Part5 d={d} update={update} />}
        {step === 6 && <Part6 d={d} update={update} />}
        {step === 7 && <Part7 d={d} update={update} />}
        {step === 8 && <Part8 d={d} update={update} partsFilled={partsFilled} />}
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
            Finish Section 11 <Check className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>
    </main>
  );
}

function stepTitle(step: number) {
  switch (step) {
    case 1: return "Part 1 — Protect the Process";
    case 2: return "Part 2 — Development Review";
    case 3: return "Part 3 — Leadership Transfer Review";
    case 4: return "Part 4 — System Drift Review";
    case 5: return "Part 5 — Standards Protection";
    case 6: return "Part 6 — Sustainability Review";
    case 7: return "Part 7 — Leadership Reflection";
    case 8: return "Leadership Commitment";
    default: return "";
  }
}

function stepIsValid(step: number, d: SectionData): boolean {
  switch (step) {
    case 1: return d.p1_what_protects.trim().length > 0;
    case 2: return d.p2_gap_report_review.trim().length > 0;
    case 3: return d.p3_working.trim().length > 0;
    case 4: return (d.p4_drift.length > 0 || d.p4_drift_other.trim().length > 0) && d.p4_adjustment.trim().length > 0;
    case 5: return d.p5_non_negotiables.trim().length > 0;
    case 6: return d.p6_sustain.trim().length > 0;
    case 7: return d.p7_proud_of.trim().length > 0;
    case 8: return d.committed && d.commitment_date.length > 0;
    default: return true;
  }
}

type UpdateFn = <K extends keyof SectionData>(k: K, v: SectionData[K]) => void;

function Part1({ d, update }: { d: SectionData; update: UpdateFn }) {
  return (
    <div className="space-y-6">
      <GuideNote>
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#433993]">
          Part 1 – Protect the Process
        </p>
        <p className="mt-2">Review the leader you selected in Section 10.</p>
      </GuideNote>
      <SectionBlock label="Evaluate" hint="Am I intentionally helping this leader learn to:">
        <Chips label="Select all that apply" options={HELPING_CHIPS} values={d.p1_helping} onChange={(v) => update("p1_helping", v)} />
      </SectionBlock>
      <SectionBlock label="Identify">
        <LabeledTextarea label="Where have I been most intentional?" value={d.p1_what_protects} onChange={(v) => update("p1_what_protects", v)} />
        <LabeledTextarea label="Where have I become reactive instead of intentional?" value={d.p1_threats} onChange={(v) => update("p1_threats", v)} />
      </SectionBlock>
    </div>
  );
}

function Part2({ d, update }: { d: SectionData; update: UpdateFn }) {
  return (
    <div className="space-y-6">
      <GuideNote>
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#433993]">
          Part 2 – Development Review
        </p>
        <p className="mt-2">
          Review this leader&rsquo;s GAP Report and Leadership Transfer Plan.
        </p>
      </GuideNote>
      <SectionBlock label="Evaluate">
        <LabeledTextarea label="Which leadership GAPs have improved?" value={d.p2_gap_report_review} onChange={(v) => update("p2_gap_report_review", v)} />
        <LabeledTextarea label="Which GAPs still deserve focused attention?" value={d.p2_transfer_progress} onChange={(v) => update("p2_transfer_progress", v)} />
        <LabeledTextarea label="What evidence supports your conclusions?" value={d.p2_next_move} onChange={(v) => update("p2_next_move", v)} />
      </SectionBlock>
    </div>
  );
}

function Part3({ d, update }: { d: SectionData; update: UpdateFn }) {
  return (
    <div className="space-y-6">
      <GuideNote>
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#433993]">
          Part 3 – Leadership Transfer Review
        </p>
        <p className="mt-2">
          Leadership is demonstrated when responsibility can be transferred with confidence.
        </p>
      </GuideNote>
      <SectionBlock label="Evaluate">
        <LabeledTextarea label="What responsibility has successfully been transferred?" value={d.p3_working} onChange={(v) => update("p3_working", v)} />
        <LabeledTextarea label="What responsibility still depends too heavily on you?" value={d.p3_stalling} onChange={(v) => update("p3_stalling", v)} />
        <LabeledTextarea label="What knowledge, experience, or coaching still needs to be provided?" value={d.p3_ownership_shift} onChange={(v) => update("p3_ownership_shift", v)} />
      </SectionBlock>
    </div>
  );
}

function Part4({ d, update }: { d: SectionData; update: UpdateFn }) {
  const showOther = d.p4_drift.includes("Other");
  return (
    <div className="space-y-6">
      <GuideNote>
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#433993]">
          Part 4 – System Drift Review
        </p>
        <p className="mt-2">
          As you have invested in developing another leader, evaluate your own leadership.
        </p>
      </GuideNote>
      <SectionBlock label="Have you drifted in any of the following areas?">
        <Chips label="Select all that apply" options={DRIFT_CHIPS} values={d.p4_drift} onChange={(v) => update("p4_drift", v)} />
        {showOther && (
          <LabeledInput label="Other:" value={d.p4_drift_other} onChange={(v) => update("p4_drift_other", v)} />
        )}
      </SectionBlock>
      <SectionBlock label="Identify">
        <LabeledTextarea label="What evidence tells you this drift has occurred?" value={d.p4_evidence} onChange={(v) => update("p4_evidence", v)} />
        <LabeledTextarea label="What adjustment is required?" value={d.p4_adjustment} onChange={(v) => update("p4_adjustment", v)} />
      </SectionBlock>
    </div>
  );
}

function Part5({ d, update }: { d: SectionData; update: UpdateFn }) {
  return (
    <div className="space-y-6">
      <GuideNote>
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#433993]">
          Part 5 – Standards Protection
        </p>
        <p className="mt-2">Strong leadership systems are protected by consistent standards.</p>
      </GuideNote>
      <SectionBlock label="Standards Protection">
        <LabeledTextarea label="What personal leadership standard must remain non-negotiable?" value={d.p5_non_negotiables} onChange={(v) => update("p5_non_negotiables", v)} />
        <LabeledTextarea label="What leadership standard must this emerging leader consistently demonstrate?" value={d.p5_slipping} onChange={(v) => update("p5_slipping", v)} />
        <LabeledTextarea label="What organizational standard must never be compromised?" value={d.p5_org} onChange={(v) => update("p5_org", v)} />
        <LabeledTextarea label="How will each of these standards be reinforced?" value={d.p5_reinforce} onChange={(v) => update("p5_reinforce", v)} />
      </SectionBlock>
    </div>
  );
}

function Part6({ d, update }: { d: SectionData; update: UpdateFn }) {
  return (
    <div className="space-y-6">
      <GuideNote>
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#433993]">
          Part 6 – Sustainability Review
        </p>
        <p className="mt-2">Consider the leadership system you are building.</p>
        <p className="mt-2">If you continued leading this way for the next twelve months…</p>
      </GuideNote>
      <SectionBlock label="Sustainability Review">
        <LabeledTextarea label="Would your people become more Fully Resourced?" value={d.p6_energizing} onChange={(v) => update("p6_energizing", v)} />
        <LabeledTextarea label="Would your organization become less dependent on you?" value={d.p6_draining} onChange={(v) => update("p6_draining", v)} />
        <LabeledTextarea label="Would leadership responsibility continue transferring to others?" value={d.p6_transfer} onChange={(v) => update("p6_transfer", v)} />
        <LabeledTextarea label="What evidence gives you confidence in your answer?" value={d.p6_sustain} onChange={(v) => update("p6_sustain", v)} />
      </SectionBlock>
    </div>
  );
}

function Part7({ d, update }: { d: SectionData; update: UpdateFn }) {
  return (
    <div className="space-y-6">
      <GuideNote>
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#433993]">
          Part 7 – Leadership Reflection
        </p>
        <p className="mt-2">Throughout this Leadership Optimization Cycle…</p>
      </GuideNote>
      <SectionBlock label="What leadership principle has become your greatest strength?">
        <Chips label="Select all that apply" options={STRENGTH_PRINCIPLES} values={d.p7_strength_principles} onChange={(v) => update("p7_strength_principles", v)} />
        <LabeledTextarea label="Why?" value={d.p7_proud_of} onChange={(v) => update("p7_proud_of", v)} />
        <LabeledTextarea label="Which principle still deserves your greatest intentional focus?" value={d.p7_still_growing} onChange={(v) => update("p7_still_growing", v)} />
        <LabeledTextarea label="What lesson from this Leadership Optimization Cycle has most changed your leadership?" value={d.p7_lesson} onChange={(v) => update("p7_lesson", v)} />
      </SectionBlock>
    </div>
  );
}

function Part8({ d, update, partsFilled }: { d: SectionData; update: UpdateFn; partsFilled: boolean }) {
  return (
    <div className="space-y-6">
      <GuideNote>
        <p>
          Leadership systems remain healthy when they are intentionally protected, consistently
          practiced, and faithfully reproduced.
        </p>
      </GuideNote>
      <div className="rounded-2xl border border-[#433993]/30 bg-gradient-to-br from-[#f6f2ff] to-white p-6">
        <p className="text-sm leading-relaxed text-foreground">
          I commit to protecting the leadership system that has shaped my growth by continuing to
          model the Four Principles, developing leaders with intentionality, reinforcing high
          standards, and faithfully transferring leadership to others.
        </p>
      </div>
      {!partsFilled && (
        <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
          Fill every part before signing your commitment.
        </div>
      )}
      <div className="flex items-start gap-3">
        <Checkbox id="commit-11" checked={d.committed} onCheckedChange={(v) => update("committed", Boolean(v))} />
        <Label htmlFor="commit-11" className="text-sm leading-relaxed text-foreground">
          Signature — I commit to protecting the leadership system.
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
function AboutSectionButtonS11({ className }: { className?: string }) {
  return (
    <AboutSectionSheet title="Section 11: Protecting the Leadership System" className={className}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#433993]">Principle 4: Lead Leaders</p>
      <h4 className="font-display text-lg font-semibold text-foreground">Section Objective</h4>
      <p>Leadership systems do not fail overnight.</p>
      <p>They drift over time.</p>
      <p>As you develop another leader, your responsibility is to protect the integrity of the leadership system that developed you.</p>
      <p>This section will help you evaluate how consistently you are leading, how effectively you are developing another leader, and where your leadership system needs refinement before beginning another Leadership Optimization Cycle.</p>
      <p className="font-semibold">Remember…</p>
      <p>The goal is not simply to develop another leader.</p>
      <p>The goal is to faithfully reproduce the same leadership principles that helped you become Fully Resourced.</p>
    </AboutSectionSheet>
  );
}
