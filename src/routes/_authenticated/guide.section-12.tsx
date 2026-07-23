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
import { ArrowLeft, ArrowRight, Check, X, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { SectionVideo } from "@/components/scale/SectionVideo";
import { PrintSectionButton } from "@/components/scale/PrintSectionButton";
import { hasPrintableContent } from "@/lib/section-print";
import { GapReportPanel } from "@/components/scale/GapReportPanel";
import { AboutSectionSheet } from "@/components/scale/AboutSectionSheet";
import { useServerFn } from "@tanstack/react-start";
import { getGapReportEligibility } from "@/lib/report.functions";

export const Route = createFileRoute("/_authenticated/guide/section-12")({
  head: () => ({ meta: [{ title: "Section 12 · Leadership Optimization Review" }] }),
  component: SectionTwelvePage,
});

const TOTAL_SECTIONS = 12;
const TOTAL_STEPS = 8;

const PRIORITY_CHIPS = [
  "Lead Yourself",
  "Lead Others",
  "Lead for Results",
  "Lead Leaders",
];

const NEXT_JOURNEY_CHIPS = [
  "Start a new Optimized Leader Guide cycle",
  "Join The Leader's Edge",
  "Book 1:1 coaching with Rich",
  "Roll out the Fully Resourced System in my organization",
];

const JOURNEY_LINKS: Record<string, string> = {
  "Join The Leader's Edge": "https://richlohman.com/the-leaders-edge",
  "Book 1:1 coaching with Rich": "https://richlohman.com/strategy-call-with-rich",
};

interface SectionData {
  step: number;
  // Part 1
  p1_gap_shift: string;
  p1_success_image_progress: string;
  p1_drivers_progress: string;
  p1_biggest_win: string;
  // Part 2 — Four Principles Review
  p2_lead_yourself: string;
  p2_lead_others: string;
  p2_lead_results: string;
  p2_success_markers: string;
  p2_lead_leaders: string;
  // Part 3 — Growth
  p3_grown_most: string;
  p3_hardest_lesson: string;
  p3_evidence: string;
  // Part 4 — Remaining Gaps
  p4_remaining_gaps: string;
  p4_why_persist: string;
  p4_close_plan: string;
  // Part 5 — New GAP Report
  p5_priority_next: string[];
  p5_new_report_ack: boolean;
  // Part 6 — Next Cycle
  p6_next_success_image: string;
  p6_next_drivers: string;
  p6_accountability: string;
  p6_non_negotiables: string;
  // Part 7 — Commitment
  p7_greatest_lesson: string;
  p7_next_start_date: string;
  p7_commitment_level: number;
  p7_next_journey: string[];
  committed: boolean;
  commitment_date: string;
}

const EMPTY: SectionData = {
  step: 1,
  p1_gap_shift: "",
  p1_success_image_progress: "",
  p1_drivers_progress: "",
  p1_biggest_win: "",
  p2_lead_yourself: "",
  p2_lead_others: "",
  p2_lead_results: "",
  p2_success_markers: "",
  p2_lead_leaders: "",
  p3_grown_most: "",
  p3_hardest_lesson: "",
  p3_evidence: "",
  p4_remaining_gaps: "",
  p4_why_persist: "",
  p4_close_plan: "",
  p5_priority_next: [],
  p5_new_report_ack: false,
  p6_next_success_image: "",
  p6_next_drivers: "",
  p6_accountability: "",
  p6_non_negotiables: "",
  p7_greatest_lesson: "",
  p7_next_start_date: "",
  p7_commitment_level: 7,
  p7_next_journey: [],
  committed: false,
  commitment_date: "",
};

function SectionTwelvePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const checkEligibility = useServerFn(getGapReportEligibility);
  const [loading, setLoading] = useState(true);
  const [d, setD] = useState<SectionData>(EMPTY);
  const [newReportReady, setNewReportReady] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loaded = useRef(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: row } = await supabase
        .from("optimizer_section_progress")
        .select("*")
        .eq("user_id", user.id)
        .eq("section_number", 12)
        .maybeSingle();
      if (row?.data) {
        const stored = row.data as unknown as Partial<SectionData>;
        setD({ ...EMPTY, ...stored } as SectionData);
      }
      loaded.current = true;
      setLoading(false);
      try {
        const e = await checkEligibility({});
        setNewReportReady(Boolean(e?.allowed));
      } catch { /* ignore */ }
    })();
  }, [user, checkEligibility]);

  const step = d.step;

  const partsFilled =
    d.p1_gap_shift.trim().length > 0 &&
    d.p2_lead_yourself.trim().length > 0 &&
    d.p3_grown_most.trim().length > 0 &&
    d.p4_remaining_gaps.trim().length > 0 &&
    d.p5_priority_next.length > 0 &&
    d.p6_next_success_image.trim().length > 0 &&
    d.p7_greatest_lesson.trim().length > 0;

  const isComplete = useMemo(
    () => partsFilled && newReportReady && d.committed && d.commitment_date.length > 0,
    [partsFilled, newReportReady, d.committed, d.commitment_date],
  );

  useEffect(() => {
    if (!user || !loaded.current) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      await supabase.from("optimizer_section_progress").upsert(
        [{ user_id: user.id, section_number: 12, data: d as unknown as never, completed: isComplete }],
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
  const canAdvance = useMemo(() => stepIsValid(step, d, newReportReady), [step, d, newReportReady]);

  async function finish() {
    if (!isComplete || !user) {
      toast.error("Fill each part, generate your new Gap Report, and sign the commitment to finish.");
      return;
    }
    const snapshot = {
      section: 12,
      cycle_close: true,
      priority_next_cycle: d.p5_priority_next,
      next_success_image: d.p6_next_success_image,
      next_drivers: d.p6_next_drivers,
      accountability: d.p6_accountability,
      non_negotiables: d.p6_non_negotiables,
      greatest_lesson: d.p7_greatest_lesson,
      next_start_date: d.p7_next_start_date,
      commitment_level: d.p7_commitment_level,
      next_journey: d.p7_next_journey,
      commitment_date: d.commitment_date,
    };
    const { error } = await supabase.from("leadership_dashboard_snapshots").insert([
      { user_id: user.id, data: snapshot as unknown as never },
    ]);
    if (error) {
      toast.error("Couldn't save your snapshot. Please try again.");
      return;
    }
    toast.success("Cycle complete. Your next cycle begins now.");
    navigate({ to: "/dashboard" });
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
        <PrintSectionButton section={12} hasContent={hasPrintableContent(d)} />
      </div>

      <SectionVideo sectionNumber={12} sectionTitle="Leadership Optimization Review" />

      <div className="mb-6">
        <div className="flex items-center justify-between text-xs font-medium uppercase tracking-widest text-muted-foreground">
          <span>Section 12 of {TOTAL_SECTIONS}</span>
          <span>Part {step} of {TOTAL_STEPS}</span>
        </div>
        <Progress value={(step / TOTAL_STEPS) * 100} className="mt-2 h-1.5" />
        <GapReportPanel className="mt-4" />
        <h1 className="mt-4 font-display text-3xl font-semibold text-foreground sm:text-4xl">{stepTitle(step)}</h1>
        <AboutSectionButtonS12 className="mt-3" />
      </div>

      <div className="space-y-8">
        {step === 1 && <Part1 d={d} update={update} />}
        {step === 2 && <Part2 d={d} update={update} />}
        {step === 3 && <Part3 d={d} update={update} />}
        {step === 4 && <Part4 d={d} update={update} />}
        {step === 5 && <Part5 d={d} update={update} newReportReady={newReportReady} />}
        {step === 6 && <Part6 d={d} update={update} />}
        {step === 7 && <Part7 d={d} update={update} />}
        {step === 8 && <Part8 d={d} update={update} partsFilled={partsFilled} newReportReady={newReportReady} />}
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
            Finish Cycle <Check className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>
    </main>
  );
}

function stepTitle(step: number) {
  switch (step) {
    case 1: return "Part 1 — Leadership Optimization Review";
    case 2: return "Part 2 — Four Principles Review";
    case 3: return "Part 3 — Leadership Growth Review";
    case 4: return "Part 4 — Remaining Leadership Gaps";
    case 5: return "Part 5 — Complete a New GAP Report";
    case 6: return "Part 6 — Next Leadership Optimization Cycle";
    case 7: return "Part 7 — Your Commitment";
    case 8: return "Leadership Commitment";
    default: return "";
  }
}

function stepIsValid(step: number, d: SectionData, newReportReady: boolean): boolean {
  switch (step) {
    case 1: return d.p1_gap_shift.trim().length > 0;
    case 2: return d.p2_lead_yourself.trim().length > 0;
    case 3: return d.p3_grown_most.trim().length > 0;
    case 4: return d.p4_remaining_gaps.trim().length > 0;
    case 5: return d.p5_priority_next.length > 0 && newReportReady;
    case 6: return d.p6_next_success_image.trim().length > 0;
    case 7: return d.p7_greatest_lesson.trim().length > 0;
    case 8: return d.committed && d.commitment_date.length > 0;
    default: return true;
  }
}

type UpdateFn = <K extends keyof SectionData>(k: K, v: SectionData[K]) => void;

function Part1({ d, update }: { d: SectionData; update: UpdateFn }) {
  return (
    <div className="space-y-6">
      <SectionBlock label="Leadership Optimization Review" hint="Compare where you are now against your original GAP Report, Success Image, and Success Drivers.">
        <LabeledTextarea label="How has your Priority Gap shifted since the start of this cycle?" value={d.p1_gap_shift} onChange={(v) => update("p1_gap_shift", v)} />
        <LabeledTextarea label="How much of your original Success Image did you actually build?" value={d.p1_success_image_progress} onChange={(v) => update("p1_success_image_progress", v)} />
        <LabeledTextarea label="Which of your Success Drivers actually drove the growth?" value={d.p1_drivers_progress} onChange={(v) => update("p1_drivers_progress", v)} />
        <LabeledTextarea label="What is the single biggest win of this cycle?" value={d.p1_biggest_win} onChange={(v) => update("p1_biggest_win", v)} />
      </SectionBlock>
    </div>
  );
}

function Part2({ d, update }: { d: SectionData; update: UpdateFn }) {
  return (
    <div className="space-y-6">
      <SectionBlock label="Four Principles Review" hint="One honest reflection per principle.">
        <LabeledTextarea label="Lead Yourself — how have you led yourself differently this cycle?" value={d.p2_lead_yourself} onChange={(v) => update("p2_lead_yourself", v)} />
        <LabeledTextarea label="Lead Others — how have the people you lead grown because of you?" value={d.p2_lead_others} onChange={(v) => update("p2_lead_others", v)} />
        <LabeledTextarea label="Lead for Results — what results did your leadership actually produce?" value={d.p2_lead_results} onChange={(v) => update("p2_lead_results", v)} />
        <LabeledTextarea label="Success Markers under Lead for Results — the measurable evidence" value={d.p2_success_markers} onChange={(v) => update("p2_success_markers", v)} placeholder="e.g. Revenue +12%, retention 94%, 1:1s at 100% cadence, 3 new leaders promoted…" />
        <LabeledTextarea label="Lead Leaders — what does the leader you developed now own that they didn't before?" value={d.p2_lead_leaders} onChange={(v) => update("p2_lead_leaders", v)} />
      </SectionBlock>
    </div>
  );
}

function Part3({ d, update }: { d: SectionData; update: UpdateFn }) {
  return (
    <div className="space-y-6">
      <SectionBlock label="Leadership Growth Review">
        <LabeledTextarea label="Where have you grown the most as a leader this cycle?" value={d.p3_grown_most} onChange={(v) => update("p3_grown_most", v)} />
        <LabeledTextarea label="What was the hardest lesson this cycle taught you?" value={d.p3_hardest_lesson} onChange={(v) => update("p3_hardest_lesson", v)} />
        <LabeledTextarea label="What's the visible evidence of that growth — what would your team say?" value={d.p3_evidence} onChange={(v) => update("p3_evidence", v)} />
      </SectionBlock>
    </div>
  );
}

function Part4({ d, update }: { d: SectionData; update: UpdateFn }) {
  return (
    <div className="space-y-6">
      <SectionBlock label="Remaining Leadership Gaps" hint="Every cycle closes some gaps and reveals new ones. Name them.">
        <LabeledTextarea label="What leadership gaps are still open?" value={d.p4_remaining_gaps} onChange={(v) => update("p4_remaining_gaps", v)} />
        <LabeledTextarea label="Why did those gaps persist this cycle?" value={d.p4_why_persist} onChange={(v) => update("p4_why_persist", v)} />
        <LabeledTextarea label="What will you do differently next cycle to close them?" value={d.p4_close_plan} onChange={(v) => update("p4_close_plan", v)} />
      </SectionBlock>
    </div>
  );
}

function Part5({ d, update, newReportReady }: { d: SectionData; update: UpdateFn; newReportReady: boolean }) {
  return (
    <div className="space-y-6">
      <SectionBlock label="Complete a New GAP Report" hint="Retake all three assessments. A new Gap Report only generates once all three are complete this cycle.">
        <div className={`rounded-2xl border p-5 ${newReportReady ? "border-emerald-300 bg-emerald-50/60" : "border-[#433993]/30 bg-gradient-to-br from-[#f6f2ff] to-white"}`}>
          {newReportReady ? (
            <div className="space-y-3">
              <p className="text-sm font-semibold text-emerald-900">Your new Gap Report is ready to generate.</p>
              <p className="text-xs text-emerald-900/80">Your new scores and Priority Gap will roll into your dashboard as the next data point.</p>
              <Button asChild className="bg-[#433993] text-white hover:bg-[#433993]/90">
                <Link to="/dashboard">Generate my new Gap Report <ArrowRight className="ml-2 h-4 w-4" /></Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm font-semibold text-foreground">Retake all three assessments to unlock your next Gap Report.</p>
              <p className="text-xs text-muted-foreground">Business Audit · Personal Leadership · Inner Capacity — all three are required before a new report generates.</p>
              <div className="flex flex-wrap gap-2 pt-1">
                <Button asChild variant="outline" size="sm"><Link to="/assessment/$type" params={{ type: "business" }}>Business Audit</Link></Button>
                <Button asChild variant="outline" size="sm"><Link to="/assessment/$type" params={{ type: "personal" }}>Personal Leadership</Link></Button>
                <Button asChild variant="outline" size="sm"><Link to="/assessment/$type" params={{ type: "inner" }}>Inner Capacity</Link></Button>
              </div>
            </div>
          )}
        </div>
        <Chips label="Which principle is your highest priority next cycle?" options={PRIORITY_CHIPS} values={d.p5_priority_next} onChange={(v) => update("p5_priority_next", v)} />
      </SectionBlock>
    </div>
  );
}

function Part6({ d, update }: { d: SectionData; update: UpdateFn }) {
  return (
    <div className="space-y-6">
      <SectionBlock label="Next Leadership Optimization Cycle">
        <LabeledTextarea label="Next Success Image — who are you becoming as a leader by the end of the next cycle?" value={d.p6_next_success_image} onChange={(v) => update("p6_next_success_image", v)} />
        <LabeledTextarea label="Next Success Drivers — the 3–5 behaviors that will produce that image" value={d.p6_next_drivers} onChange={(v) => update("p6_next_drivers", v)} />
        <LabeledTextarea label="Accountability — who's holding you to it, and how?" value={d.p6_accountability} onChange={(v) => update("p6_accountability", v)} />
        <LabeledTextarea label="Non-negotiables — the standards you refuse to drop next cycle" value={d.p6_non_negotiables} onChange={(v) => update("p6_non_negotiables", v)} />
      </SectionBlock>
    </div>
  );
}

function Part7({ d, update }: { d: SectionData; update: UpdateFn }) {
  const level = d.p7_commitment_level;
  return (
    <div className="space-y-6">
      <SectionBlock label="Your Commitment">
        <LabeledTextarea label="The greatest lesson of this cycle is…" value={d.p7_greatest_lesson} onChange={(v) => update("p7_greatest_lesson", v)} />
        <div>
          <Label className="text-xs font-medium text-foreground">Next cycle start date</Label>
          <Input type="date" value={d.p7_next_start_date} onChange={(e) => update("p7_next_start_date", e.target.value)} className="mt-1 max-w-[220px]" />
        </div>
        <div>
          <div className="flex items-center justify-between">
            <Label className="text-xs font-medium text-foreground">Commitment level for the next cycle</Label>
            <span className="text-sm font-semibold text-[#433993]">{level}/10</span>
          </div>
          <Slider value={[level]} min={1} max={10} step={1} onValueChange={(v) => update("p7_commitment_level", v[0] ?? 7)} className="mt-3" />
        </div>
      </SectionBlock>

      <SectionBlock label="Continue Your Leadership Journey" hint="Choose how you'll keep the momentum. Pick as many as apply.">
        <Chips label="Next step(s)" options={NEXT_JOURNEY_CHIPS} values={d.p7_next_journey} onChange={(v) => update("p7_next_journey", v)} />
        {d.p7_next_journey.some((c) => JOURNEY_LINKS[c]) && (
          <div className="space-y-2 pt-1">
            {d.p7_next_journey.filter((c) => JOURNEY_LINKS[c]).map((c) => (
              <a
                key={c}
                href={JOURNEY_LINKS[c]}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm font-medium text-[#433993] hover:underline"
              >
                {c} <ExternalLink className="h-3.5 w-3.5" />
              </a>
            ))}
          </div>
        )}
      </SectionBlock>
    </div>
  );
}

function Part8({ d, update, partsFilled, newReportReady }: { d: SectionData; update: UpdateFn; partsFilled: boolean; newReportReady: boolean }) {
  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-[#433993]/30 bg-gradient-to-br from-[#f6f2ff] to-white p-6">
        <p className="text-sm leading-relaxed text-foreground">
          I commit to closing this cycle with honesty, generating a new Gap Report, and launching
          the next Leadership Optimization Cycle — because leadership growth is a rhythm, not a finish line.
        </p>
      </div>
      {!partsFilled && (
        <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
          Fill every part before signing your commitment.
        </div>
      )}
      {!newReportReady && (
        <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
          Retake all three assessments and generate your new Gap Report to finish this cycle.
        </div>
      )}
      <div className="flex items-start gap-3">
        <Checkbox id="commit-12" checked={d.committed} onCheckedChange={(v) => update("committed", Boolean(v))} />
        <Label htmlFor="commit-12" className="text-sm leading-relaxed text-foreground">
          I commit to start my next Leadership Optimization Cycle and keep leading with intent.
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