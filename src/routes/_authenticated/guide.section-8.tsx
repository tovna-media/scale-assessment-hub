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

export const Route = createFileRoute("/_authenticated/guide/section-8")({
  head: () => ({ meta: [{ title: "Section 8 · Evaluation & Crucial Conversations" }] }),
  component: SectionEightPage,
});

const TOTAL_SECTIONS = 12;
const TOTAL_STEPS = 7;

const EVAL_CHECKS: { key: keyof EvalChecks; label: string }[] = [
  { key: "markers_stalled", label: "Have Success Markers stalled or declined?" },
  { key: "same_issue_recurring", label: "Is the same issue coming up again and again?" },
  { key: "avoiding_person", label: "Am I avoiding a person or a conversation I know I need to have?" },
  { key: "standards_slipping", label: "Are standards slipping on my team?" },
  { key: "trust_eroding", label: "Is trust or alignment eroding somewhere?" },
  { key: "behavior_impacting", label: "Is someone's behavior impacting the team or the results?" },
  { key: "leader_reluctance", label: "Am I hesitating to lead into something that clearly needs leadership?" },
];

type EvalChecks = {
  markers_stalled: "" | "yes" | "no";
  same_issue_recurring: "" | "yes" | "no";
  avoiding_person: "" | "yes" | "no";
  standards_slipping: "" | "yes" | "no";
  trust_eroding: "" | "yes" | "no";
  behavior_impacting: "" | "yes" | "no";
  leader_reluctance: "" | "yes" | "no";
};

const IMPACT_INDIVIDUAL = [
  "Growth stalling",
  "Trust eroding",
  "Performance slipping",
  "Disengagement",
  "Confusion about expectations",
  "Loss of ownership",
];
const IMPACT_TEAM = [
  "Standards dropping",
  "Alignment breaking",
  "Cadence slowing",
  "Conflict left unaddressed",
  "Silos forming",
  "Culture drift",
];
const IMPACT_ORG = [
  "Success Markers at risk",
  "Strategy execution weakening",
  "Reputation impact",
  "Client / customer impact",
  "Revenue / results impact",
  "Leadership pipeline weakening",
];

const ALIGNMENT_CHIPS = [
  "Clear ownership established",
  "Standard clearly named",
  "Consequences understood",
  "Support offered",
  "Follow-up scheduled",
  "Mutual commitment",
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
  p2_why_now: string;
  p2_impact_individual: string[];
  p2_impact_team: string[];
  p2_impact_org: string[];
  // Part 3 — Prepare the Conversation
  p3_worksheet_complete: boolean;
  p3_worksheet_date: string;
  // Part 4 — Love & Tough Love Reflection
  p4_love: string;
  p4_tough_love: string;
  p4_balance: string;
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
    markers_stalled: "",
    same_issue_recurring: "",
    avoiding_person: "",
    standards_slipping: "",
    trust_eroding: "",
    behavior_impacting: "",
    leader_reluctance: "",
  },
  p1_other: "",
  p1_identify: "",
  p1_understand: "",
  p2_who: "",
  p2_why_now: "",
  p2_impact_individual: [],
  p2_impact_team: [],
  p2_impact_org: [],
  p3_worksheet_complete: false,
  p3_worksheet_date: "",
  p4_love: "",
  p4_tough_love: "",
  p4_balance: "",
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
      <SectionBlock label="Evaluate — Seven Yes/No checks" hint="Answer each honestly. Any Yes is a signal a crucial conversation may be needed.">
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
        <LabeledInput label="Other — anything else you're noticing" value={d.p1_other} onChange={(v) => update("p1_other", v)} />
      </SectionBlock>
      <SectionBlock label="Identify — Which signal is loudest">
        <LabeledTextarea label="Which of these is the loudest signal right now, and what is it pointing you to?" value={d.p1_identify} onChange={(v) => update("p1_identify", v)} />
      </SectionBlock>
      <SectionBlock label="Understand — Why this signal is showing up now">
        <LabeledTextarea label="Why is this signal showing up now? What has your leadership tolerated or delayed?" value={d.p1_understand} onChange={(v) => update("p1_understand", v)} />
      </SectionBlock>
    </div>
  );
}

function Part2({ d, update }: { d: SectionData; update: UpdateFn }) {
  return (
    <div className="space-y-6">
      <SectionBlock label="Determine the Conversation">
        <LabeledInput label="Who is this conversation with?" value={d.p2_who} onChange={(v) => update("p2_who", v)} />
        <LabeledTextarea label="Why does this conversation need to happen now?" value={d.p2_why_now} onChange={(v) => update("p2_why_now", v)} />
      </SectionBlock>
      <SectionBlock label="Impact — On the Individual">
        <Chips label="Impact on the individual" options={IMPACT_INDIVIDUAL} values={d.p2_impact_individual} onChange={(v) => update("p2_impact_individual", v)} />
      </SectionBlock>
      <SectionBlock label="Impact — On the Team">
        <Chips label="Impact on the team" options={IMPACT_TEAM} values={d.p2_impact_team} onChange={(v) => update("p2_impact_team", v)} />
      </SectionBlock>
      <SectionBlock label="Impact — On the Organization">
        <Chips label="Impact on the organization" options={IMPACT_ORG} values={d.p2_impact_org} onChange={(v) => update("p2_impact_org", v)} />
      </SectionBlock>
    </div>
  );
}

function Part3({ d, update }: { d: SectionData; update: UpdateFn }) {
  return (
    <div className="space-y-6">
      <SectionBlock label="Prepare the Conversation" hint="Use the Crucial Conversation Worksheet outside the app to plan the conversation, then confirm below.">
        <div className="rounded-xl border border-[#433993]/30 bg-gradient-to-br from-[#f6f2ff] to-white p-4 text-sm text-foreground">
          Download the Crucial Conversation Worksheet from your Optimized Leader Guide resources and complete it before your conversation.
        </div>
        <div className="flex items-start gap-3">
          <Checkbox id="worksheet-8" checked={d.p3_worksheet_complete} onCheckedChange={(v) => update("p3_worksheet_complete", Boolean(v))} />
          <Label htmlFor="worksheet-8" className="text-sm leading-relaxed text-foreground">
            I have completed the Crucial Conversation Worksheet.
          </Label>
        </div>
        <LabeledInput label="Date completed" type="date" value={d.p3_worksheet_date} onChange={(v) => update("p3_worksheet_date", v)} />
      </SectionBlock>
    </div>
  );
}

function Part4({ d, update }: { d: SectionData; update: UpdateFn }) {
  return (
    <div className="space-y-6">
      <SectionBlock label="Love — What you care about here">
        <LabeledTextarea label="What do you genuinely care about — about this person, this team, this outcome?" value={d.p4_love} onChange={(v) => update("p4_love", v)} />
      </SectionBlock>
      <SectionBlock label="Tough Love — The truth that must be said">
        <LabeledTextarea label="What is the truth you owe them, even if it's hard to say?" value={d.p4_tough_love} onChange={(v) => update("p4_tough_love", v)} />
      </SectionBlock>
      <SectionBlock label="Balance — Holding both at once">
        <LabeledTextarea label="How will you hold love and tough love together in this conversation?" value={d.p4_balance} onChange={(v) => update("p4_balance", v)} />
      </SectionBlock>
    </div>
  );
}

function Part5({ d, update }: { d: SectionData; update: UpdateFn }) {
  return (
    <div className="space-y-6">
      <SectionBlock label="Conversation Execution Plan" hint="Lock the details so it actually happens.">
        <LabeledInput label="Name of the person" value={d.p5_name} onChange={(v) => update("p5_name", v)} />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <LabeledInput label="Date of the conversation" type="date" value={d.p5_date} onChange={(v) => update("p5_date", v)} />
          <LabeledInput label="Location" value={d.p5_location} onChange={(v) => update("p5_location", v)} />
        </div>
        <LabeledInput label="Follow-up date" type="date" value={d.p5_follow_up_date} onChange={(v) => update("p5_follow_up_date", v)} />
        <LabeledTextarea label="The commitment you're seeking from them" value={d.p5_commitment_sought} onChange={(v) => update("p5_commitment_sought", v)} />
        <LabeledTextarea label="How that commitment will be measured" value={d.p5_how_measured} onChange={(v) => update("p5_how_measured", v)} />
        <LabeledInput label="Success Marker that shows progress from this conversation" value={d.p5_success_marker} onChange={(v) => update("p5_success_marker", v)} />
      </SectionBlock>
    </div>
  );
}

function Part6({ d, update }: { d: SectionData; update: UpdateFn }) {
  return (
    <div className="space-y-6">
      <SectionBlock label="Conversation Evaluation" hint="Come back after the conversation and fill this in.">
        <LabeledTextarea label="What actually happened in the conversation?" value={d.p6_what_happened} onChange={(v) => update("p6_what_happened", v)} />
        <LabeledTextarea label="What worked?" value={d.p6_what_worked} onChange={(v) => update("p6_what_worked", v)} />
        <LabeledTextarea label="What did you miss or want to do differently?" value={d.p6_what_i_missed} onChange={(v) => update("p6_what_i_missed", v)} />
        <LabeledInput label="The next step you're committing to" value={d.p6_next_step} onChange={(v) => update("p6_next_step", v)} />
      </SectionBlock>
      <SectionBlock label="Alignment — What the conversation established">
        <Chips label="Alignment created" options={ALIGNMENT_CHIPS} values={d.p6_alignment} onChange={(v) => update("p6_alignment", v)} />
      </SectionBlock>
    </div>
  );
}

function StepCommitment({ d, update }: { d: SectionData; update: UpdateFn }) {
  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-[#433993]/30 bg-gradient-to-br from-[#f6f2ff] to-white p-6">
        <p className="text-sm leading-relaxed text-foreground">
          I commit to leading into the conversations that need to happen — with clarity,
          with love and tough love, and with a Success Marker that proves the shift.
        </p>
      </div>
      <div className="flex items-start gap-3">
        <Checkbox id="commit-8" checked={d.committed} onCheckedChange={(v) => update("committed", Boolean(v))} />
        <Label htmlFor="commit-8" className="text-sm leading-relaxed text-foreground">
          I commit to leading the crucial conversation I've named here.
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