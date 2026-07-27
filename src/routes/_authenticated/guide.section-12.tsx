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
  "Continue independently using a new Optimized Leader Guide.",
  "Continue growing through Leaders Edge.",
  "Continue with one-on-one coaching.",
  "Continue developing leaders within your organization using the Fully Resourced Leadership System.",
];

const JOURNEY_LINKS: Record<string, string> = {
  "Continue growing through Leaders Edge.": "https://richlohman.com/the-leaders-edge",
  "Continue with one-on-one coaching.": "https://richlohman.com/strategy-call-with-rich",
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
  p2_ly_discipline: string;
  p2_lead_others: string;
  p2_lo_relationship: string;
  p2_lead_results: string;
  p2_success_markers: string;
  p2_lead_leaders: string;
  p2_ll_progress: string;
  p2_ll_strengthened: string;
  // Part 3 — Growth
  p3_grown_most: string;
  p3_hardest_lesson: string;
  p3_behavior: string;
  p3_evidence: string;
  // Part 4 — Remaining Gaps
  p4_remaining_gaps: string;
  p4_why_persist: string;
  p4_close_plan: string;
  // Part 5 — New GAP Report
  p5_priority_next: string[];
  p5_new_report_ack: boolean;
  p5_improvements: string;
  p5_patterns: string;
  p5_why: string;
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
  p2_ly_discipline: "",
  p2_lead_others: "",
  p2_lo_relationship: "",
  p2_lead_results: "",
  p2_success_markers: "",
  p2_lead_leaders: "",
  p2_ll_progress: "",
  p2_ll_strengthened: "",
  p3_grown_most: "",
  p3_hardest_lesson: "",
  p3_behavior: "",
  p3_evidence: "",
  p4_remaining_gaps: "",
  p4_why_persist: "",
  p4_close_plan: "",
  p5_priority_next: [],
  p5_new_report_ack: false,
  p5_improvements: "",
  p5_patterns: "",
  p5_why: "",
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
      <GuideNote>
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#433993]">
          Part 1 – Leadership Optimization Review
        </p>
        <p className="mt-2">
          Return to your original GAP Report, Success Image, and Success Drivers.
        </p>
      </GuideNote>
      <SectionBlock label="Evaluate">
        <LabeledTextarea label="How has your Success Image become more of a reality?" value={d.p1_gap_shift} onChange={(v) => update("p1_gap_shift", v)} />
        <LabeledTextarea label="Which Success Drivers consistently moved you forward?" value={d.p1_success_image_progress} onChange={(v) => update("p1_success_image_progress", v)} />
        <LabeledTextarea label="Which Success Drivers deserve greater attention during your next Leadership Optimization Cycle?" value={d.p1_drivers_progress} onChange={(v) => update("p1_drivers_progress", v)} />
      </SectionBlock>
    </div>
  );
}

function Part2({ d, update }: { d: SectionData; update: UpdateFn }) {
  return (
    <div className="space-y-6">
      <GuideNote>
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#433993]">
          Part 2 – Four Principles Review
        </p>
        <p className="mt-2">Reflect on each leadership principle.</p>
      </GuideNote>
      <SectionBlock label="Lead Yourself">
        <LabeledTextarea label="What evidence demonstrates your personal leadership has improved?" value={d.p2_lead_yourself} onChange={(v) => update("p2_lead_yourself", v)} />
        <LabeledTextarea label="What leadership discipline has become a consistent strength?" value={d.p2_ly_discipline} onChange={(v) => update("p2_ly_discipline", v)} />
      </SectionBlock>
      <SectionBlock label="Lead Others">
        <LabeledTextarea label="What evidence demonstrates you have become more effective at developing people?" value={d.p2_lead_others} onChange={(v) => update("p2_lead_others", v)} />
        <LabeledTextarea label="What leadership relationship has improved the most?" value={d.p2_lo_relationship} onChange={(v) => update("p2_lo_relationship", v)} />
      </SectionBlock>
      <SectionBlock label="Lead for Results">
        <LabeledTextarea label="What measurable Success Markers demonstrate meaningful progress?" value={d.p2_success_markers} onChange={(v) => update("p2_success_markers", v)} />
        <LabeledTextarea label="What result are you most proud of?" value={d.p2_lead_results} onChange={(v) => update("p2_lead_results", v)} />
      </SectionBlock>
      <SectionBlock label="Lead Leaders" hint="If applicable…">
        <LabeledTextarea label="Who have you intentionally begun developing?" value={d.p2_lead_leaders} onChange={(v) => update("p2_lead_leaders", v)} />
        <LabeledTextarea label="What progress have they demonstrated?" value={d.p2_ll_progress} onChange={(v) => update("p2_ll_progress", v)} />
        <LabeledTextarea label="How has developing another leader strengthened your own leadership?" value={d.p2_ll_strengthened} onChange={(v) => update("p2_ll_strengthened", v)} />
      </SectionBlock>
    </div>
  );
}

function Part3({ d, update }: { d: SectionData; update: UpdateFn }) {
  return (
    <div className="space-y-6">
      <GuideNote>
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#433993]">
          Part 3 – Leadership Growth Review
        </p>
        <p className="mt-2">Compare your current leadership with where you began.</p>
      </GuideNote>
      <SectionBlock label="Leadership Growth Review">
        <LabeledTextarea label="What leadership habit has improved the most?" value={d.p3_grown_most} onChange={(v) => update("p3_grown_most", v)} />
        <LabeledTextarea label="What leadership standard has risen the most?" value={d.p3_hardest_lesson} onChange={(v) => update("p3_hardest_lesson", v)} />
        <LabeledTextarea label="What leadership behavior has changed the most?" value={d.p3_behavior} onChange={(v) => update("p3_behavior", v)} />
        <LabeledTextarea label="What evidence supports these changes?" value={d.p3_evidence} onChange={(v) => update("p3_evidence", v)} />
      </SectionBlock>
    </div>
  );
}

function Part4({ d, update }: { d: SectionData; update: UpdateFn }) {
  return (
    <div className="space-y-6">
      <GuideNote>
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#433993]">
          Part 4 – Remaining Leadership Gaps
        </p>
        <p className="mt-2">Leadership optimization never ends.</p>
        <p className="mt-2">Review your original GAP Report together with your current leadership.</p>
      </GuideNote>
      <SectionBlock label="Remaining Leadership Gaps">
        <LabeledTextarea label="What leadership gaps have been significantly reduced?" value={d.p4_remaining_gaps} onChange={(v) => update("p4_remaining_gaps", v)} />
        <LabeledTextarea label="What leadership gaps still deserve focused attention?" value={d.p4_why_persist} onChange={(v) => update("p4_why_persist", v)} />
        <LabeledTextarea label="What new opportunities for growth have become apparent?" value={d.p4_close_plan} onChange={(v) => update("p4_close_plan", v)} />
      </SectionBlock>
    </div>
  );
}

function Part5({ d, update, newReportReady }: { d: SectionData; update: UpdateFn; newReportReady: boolean }) {
  return (
    <div className="space-y-6">
      <GuideNote>
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#433993]">
          Part 5 – Complete a New GAP Report
        </p>
        <p className="mt-2">Growth should be measured—not assumed.</p>
        <p className="mt-2">Complete a new GAP Report using the current SCALE Assessments.</p>
        <p className="mt-2">
          Compare your new GAP Report with the one completed before beginning this Leadership
          Optimization Cycle.
        </p>
      </GuideNote>
      <SectionBlock label="Complete a New GAP Report">
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
        <LabeledTextarea label="What improvements are most encouraging?" value={d.p5_improvements} onChange={(v) => update("p5_improvements", v)} />
        <LabeledTextarea label="What patterns continue to appear?" value={d.p5_patterns} onChange={(v) => update("p5_patterns", v)} />
        <Chips label="What principle should become your highest priority during your next Leadership Optimization Cycle?" options={PRIORITY_CHIPS} values={d.p5_priority_next} onChange={(v) => update("p5_priority_next", v)} />
        <LabeledTextarea label="Why?" value={d.p5_why} onChange={(v) => update("p5_why", v)} />
      </SectionBlock>
    </div>
  );
}

function Part6({ d, update }: { d: SectionData; update: UpdateFn }) {
  return (
    <div className="space-y-6">
      <GuideNote>
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#433993]">
          Part 6 – Next Leadership Optimization Cycle
        </p>
        <p className="mt-2">Based on your new GAP Report…</p>
      </GuideNote>
      <SectionBlock label="Next Leadership Optimization Cycle">
        <LabeledTextarea label="What Success Image will guide your next Leadership Optimization Cycle?" value={d.p6_next_success_image} onChange={(v) => update("p6_next_success_image", v)} />
        <LabeledTextarea label="What Success Drivers will deserve the greatest attention?" value={d.p6_next_drivers} onChange={(v) => update("p6_next_drivers", v)} />
        <LabeledTextarea label="Who will help you remain accountable?" value={d.p6_accountability} onChange={(v) => update("p6_accountability", v)} />
        <LabeledTextarea label="Which leadership habits and standards will remain non-negotiable?" value={d.p6_non_negotiables} onChange={(v) => update("p6_non_negotiables", v)} />
      </SectionBlock>
    </div>
  );
}

function Part7({ d, update }: { d: SectionData; update: UpdateFn }) {
  const level = d.p7_commitment_level;
  return (
    <div className="space-y-6">
      <GuideNote>
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#433993]">
          Part 7 – Your Commitment
        </p>
        <p className="mt-2">Leadership is never finished.</p>
        <p className="mt-2">
          Every Leadership Optimization Cycle creates new opportunities to grow, strengthen your
          leadership, and develop others.
        </p>
        <p className="mt-2">Complete this sentence.</p>
      </GuideNote>
      <SectionBlock label="Your Commitment">
        <LabeledTextarea label="The greatest lesson I will carry into my next Leadership Optimization Cycle is:" value={d.p7_greatest_lesson} onChange={(v) => update("p7_greatest_lesson", v)} />
        <div>
          <Label className="text-xs font-medium text-foreground">My next Leadership Optimization Cycle begins on:</Label>
          <Input type="date" value={d.p7_next_start_date} onChange={(e) => update("p7_next_start_date", e.target.value)} className="mt-1 max-w-[220px]" />
        </div>
        <div>
          <div className="flex items-center justify-between">
            <Label className="text-xs font-medium text-foreground">My commitment level to beginning another Leadership Optimization Cycle is:</Label>
            <span className="text-sm font-semibold text-[#433993]">{level}/10</span>
          </div>
          <Slider value={[level]} min={1} max={10} step={1} onValueChange={(v) => update("p7_commitment_level", v[0] ?? 7)} className="mt-3" />
        </div>
      </SectionBlock>

      <SectionBlock label="Continue Your Leadership Journey" hint="Choose the next step that best supports your continued development.">
        <Chips label="Select all that apply" options={NEXT_JOURNEY_CHIPS} values={d.p7_next_journey} onChange={(v) => update("p7_next_journey", v)} />
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
function AboutSectionButtonS12({ className }: { className?: string }) {
  return (
    <AboutSectionSheet title="Section 12: Leadership Optimization Review" className={className}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#433993]">Leadership Optimization Cycle Review</p>
      <h4 className="font-display text-lg font-semibold text-foreground">Section Objective</h4>
      <p>Leadership is not an event.</p>
      <p>It is a continual process of assessment, development, application, measurement, and refinement.</p>
      <p>This section will help you review your Leadership Optimization Cycle, identify measurable growth, evaluate remaining leadership gaps, and intentionally begin your next cycle of development.</p>
      <p className="font-semibold">Remember…</p>
      <p>The goal is not to finish the Guide.</p>
      <p>The goal is to become more Fully Resourced with every Leadership Optimization Cycle.</p>
    </AboutSectionSheet>
  );
}
