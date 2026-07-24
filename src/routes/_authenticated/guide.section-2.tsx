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
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { toast } from "sonner";
import { SectionVideo } from "@/components/scale/SectionVideo";
import { PrintSectionButton } from "@/components/scale/PrintSectionButton";
import { hasPrintableContent } from "@/lib/section-print";
import { GapReportPanel } from "@/components/scale/GapReportPanel";
import { AboutSectionSheet } from "@/components/scale/AboutSectionSheet";

export const Route = createFileRoute("/_authenticated/guide/section-2")({
  head: () => ({ meta: [{ title: "Section 2 · Lead Yourself" }] }),
  component: SectionTwoPage,
});

const TOTAL_SECTIONS = 12;
const TOTAL_STEPS = 10;

const SKILL_OPTIONS = [
  "Vision",
  "Communication",
  "Coaching & Developing Others",
  "Accountability",
  "Conflict & Crucial Conversations",
  "Delegation",
  "Strategic Thinking",
  "Decision Making",
  "Team Development",
];

const STANDARD_OPTIONS = [
  "Planning",
  "Preparation",
  "Communication",
  "Follow Through",
  "Personal Discipline",
  "Emotional Control",
  "Physical Health",
  "Relationships",
  "Learning",
];

const EMOTIONAL_ZONES = [
  { value: "1", label: "Zone 1 — High Emotional Energy" },
  { value: "2", label: "Zone 2 — Growth & Positive Momentum" },
  { value: "3", label: "Zone 3 — Neutral / Plateau" },
  { value: "4", label: "Zone 4 — Draining Emotional Energy" },
  { value: "5", label: "Zone 5 — Depleted Emotional Energy" },
];

interface SectionData {
  strengths: string[];
  gaps: string[];
  patterns: string;
  skills: string[];
  skills_other: string;
  knowledge_gaps: string;
  capacity_gaps: string;
  character_perf_strengths: string[];
  character_perf_growth: string[];
  character_moral: string[];
  character_moral_focus: string;
  character_to_improve: string;
  emotion_zone: string;
  emotion_patterns: string;
  emotion_habit: string;
  emotion_impact: string;
  si_personally: string;
  si_professionally: string;
  si_as_leader: string;
  si_relationships: string;
  si_health: string;
  success_drivers: string[];
  top_priority_goal: string;
  primary_role: string;
  responsibilities: string[];
  role_results: string;
  disc_style: string;
  disc_strengths: string[];
  disc_blind_spots: string[];
  disc_impact: string;
  daily_priorities: string[];
  standards: string[];
  standards_other: string;
  daily_behaviors: string[];
  first_actions: string[];
  support_team: string;
  plan_success_image: string;
  plan_top_priority: string;
  plan_success_drivers: string[];
  plan_skills: string[];
  plan_standards: string[];
  plan_daily_behaviors: string[];
  committed: boolean;
  commitment_date: string;
  step: number;
}

const EMPTY: SectionData = {
  strengths: ["", "", ""],
  gaps: ["", "", ""],
  patterns: "",
  skills: [],
  skills_other: "",
  knowledge_gaps: "",
  capacity_gaps: "",
  character_perf_strengths: ["", "", ""],
  character_perf_growth: ["", ""],
  character_moral: ["", "", ""],
  character_moral_focus: "",
  character_to_improve: "",
  emotion_zone: "",
  emotion_patterns: "",
  emotion_habit: "",
  emotion_impact: "",
  si_personally: "",
  si_professionally: "",
  si_as_leader: "",
  si_relationships: "",
  si_health: "",
  success_drivers: ["", "", "", "", ""],
  top_priority_goal: "",
  primary_role: "",
  responsibilities: ["", "", "", "", ""],
  role_results: "",
  disc_style: "",
  disc_strengths: ["", "", ""],
  disc_blind_spots: ["", "", ""],
  disc_impact: "",
  daily_priorities: ["", "", ""],
  standards: [],
  standards_other: "",
  daily_behaviors: ["", "", "", ""],
  first_actions: ["", "", ""],
  support_team: "",
  plan_success_image: "",
  plan_top_priority: "",
  plan_success_drivers: ["", "", ""],
  plan_skills: ["", "", ""],
  plan_standards: ["", "", ""],
  plan_daily_behaviors: ["", "", ""],
  committed: false,
  commitment_date: "",
  step: 1,
};

function nonEmpty(a: string[]) {
  return a.filter((s) => s.trim().length > 0);
}

function SectionTwoPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [d, setD] = useState<SectionData>(EMPTY);
  const [gapReportMd, setGapReportMd] = useState<string | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loaded = useRef(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ data: row }, { data: sessions }] = await Promise.all([
        supabase
          .from("optimizer_section_progress")
          .select("*")
          .eq("user_id", user.id)
          .eq("section_number", 2)
          .maybeSingle(),
        supabase
          .from("assessment_sessions")
          .select("gap_report, created_at")
          .eq("user_id", user.id)
          .not("gap_report", "is", null)
          .order("created_at", { ascending: false })
          .limit(1),
      ]);
      if (row?.data) {
        setD({ ...EMPTY, ...(row.data as unknown as Partial<SectionData>) } as SectionData);
      }
      const md = (sessions ?? [])[0]?.gap_report as string | null | undefined;
      setGapReportMd(md ?? null);
      loaded.current = true;
      setLoading(false);
    })();
  }, [user]);

  const step = d.step;

  useEffect(() => {
    if (step !== 9) return;
    setD((prev) => {
      const next = { ...prev };
      const summary = [prev.si_as_leader, prev.si_professionally, prev.si_personally]
        .filter((s) => s.trim().length > 0)
        .join(" · ");
      if (!next.plan_success_image.trim()) next.plan_success_image = summary;
      if (!next.plan_top_priority.trim()) next.plan_top_priority = prev.top_priority_goal;
      const setIfEmpty = (arr: string[], src: string[]) =>
        arr.every((s) => !s.trim()) ? [...src, "", "", ""].slice(0, 3) : arr;
      next.plan_success_drivers = setIfEmpty(prev.plan_success_drivers, nonEmpty(prev.success_drivers).slice(0, 3));
      const skillsCombined = [...prev.skills, prev.skills_other].filter((s) => s && s.trim());
      next.plan_skills = setIfEmpty(prev.plan_skills, skillsCombined.slice(0, 3));
      const standardsCombined = [...prev.standards, prev.standards_other].filter((s) => s && s.trim());
      next.plan_standards = setIfEmpty(prev.plan_standards, standardsCombined.slice(0, 3));
      next.plan_daily_behaviors = setIfEmpty(prev.plan_daily_behaviors, nonEmpty(prev.daily_behaviors).slice(0, 3));
      return next;
    });
  }, [step]);

  const isComplete =
    d.committed && d.commitment_date.trim().length > 0 && d.plan_success_image.trim().length > 0;

  useEffect(() => {
    if (!user || !loaded.current) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      await supabase.from("optimizer_section_progress").upsert(
        [
          {
            user_id: user.id,
            section_number: 2,
            data: d as unknown as never,
            completed: isComplete,
          },
        ],
        { onConflict: "user_id,section_number" },
      );
    }, 600);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [user, d, isComplete]);

  function update<K extends keyof SectionData>(key: K, value: SectionData[K]) {
    setD((p) => ({ ...p, [key]: value }));
  }
  function updateAt(key: keyof SectionData, i: number, value: string) {
    setD((p) => {
      const arr = [...(p[key] as string[])];
      arr[i] = value;
      return { ...p, [key]: arr };
    });
  }
  function toggleIn(key: keyof SectionData, value: string) {
    setD((p) => {
      const arr = p[key] as string[];
      const has = arr.includes(value);
      return { ...p, [key]: has ? arr.filter((v) => v !== value) : [...arr, value] };
    });
  }

  function goStep(next: number) {
    setD((p) => ({ ...p, step: Math.max(1, Math.min(TOTAL_STEPS, next)) }));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const canAdvance = useMemo(() => stepIsValid(step, d), [step, d]);

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
        <Link
          to="/cycle"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> My Cycle
        </Link>
        <PrintSectionButton section={2} hasContent={hasPrintableContent(d)} />
      </div>

      <SectionVideo sectionNumber={2} sectionTitle="Lead Yourself" videoUrl="https://www.youtube.com/embed/MNomJ1zXrSI" />

      <div className="mb-6">
        <div className="flex items-center justify-between text-xs font-medium uppercase tracking-widest text-muted-foreground">
          <span>Section 2 of {TOTAL_SECTIONS}</span>
          <span>Step {step} of {TOTAL_STEPS}</span>
        </div>
        <Progress value={(step / TOTAL_STEPS) * 100} className="mt-2 h-1.5" />
        <GapReportPanel className="mt-4" />
        <h1 className="mt-4 font-display text-3xl font-semibold text-foreground sm:text-4xl">
          {stepTitle(step)}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">{stepBlurb(step)}</p>
        <AboutSectionButton />
      </div>

      <div className="space-y-8">
        {step === 1 && <StepReviewGap d={d} update={update} updateAt={updateAt} md={gapReportMd} />}
        {step === 2 && <StepUnderstandGaps d={d} update={update} toggleIn={toggleIn} />}
        {step === 3 && <StepFirmCharacter d={d} updateAt={updateAt} update={update} />}
        {step === 4 && <StepUnderstandEmotions d={d} update={update} />}
        {step === 5 && <StepSuccessImage d={d} update={update} />}
        {step === 6 && <StepSuccessDrivers d={d} update={update} updateAt={updateAt} />}
        {step === 7 && <StepRoleAndDisc d={d} update={update} updateAt={updateAt} />}
        {step === 8 && <StepLeadDaily d={d} update={update} updateAt={updateAt} toggleIn={toggleIn} />}
        {step === 9 && <StepPlan d={d} update={update} updateAt={updateAt} />}
        {step === 10 && <StepCommitment d={d} update={update} />}
      </div>

      <div className="mt-10 flex items-center justify-between border-t border-border pt-5">
        <Button variant="ghost" onClick={() => goStep(step - 1)} disabled={step === 1}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
        <span className="text-xs text-muted-foreground">Saved automatically.</span>
        {step < TOTAL_STEPS ? (
          <Button
            onClick={() => goStep(step + 1)}
            disabled={!canAdvance}
            className="bg-[#433993] text-white hover:bg-[#433993]/90"
            size="lg"
          >
            Continue <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        ) : (
          <Button
            onClick={() => {
              if (!isComplete) {
                toast.error("Check the commitment and set a date to finish.");
                return;
              }
              toast.success("Section 2 complete.");
              navigate({ to: "/cycle" });
            }}
            disabled={!isComplete}
            className="bg-[#433993] text-white hover:bg-[#433993]/90"
            size="lg"
          >
            Finish Section 2 <Check className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>
    </main>
  );
}

function stepTitle(step: number) {
  switch (step) {
    case 1: return "Review Your GAP Report";
    case 2: return "Understanding Your Leadership Gaps";
    case 3: return "F — Firm Up Your Character";
    case 4: return "U — Understand Your Emotions";
    case 5: return "E — Envision Your Success";
    case 6: return "E — Success Drivers & Top Priority Goal";
    case 7: return "E — Clarify Your Role & DISC Self-Awareness";
    case 8: return "L — Lead Yourself Daily";
    case 9: return "My Lead Yourself Plan";
    case 10: return "Leadership Commitment";
    default: return "";
  }
}
function stepBlurb(step: number) {
  switch (step) {
    case 1: return "Pull the insights that matter most from your most recent GAP Report.";
    case 2: return "Sort your development areas into knowledge gaps and capacity gaps.";
    case 3: return "Name the character qualities you'll build this cycle.";
    case 4: return "Get honest about your current emotional energy — and what will move it.";
    case 5: return "Define what success looks like across the five areas of your life.";
    case 6: return "The five actions that will drive results — and the one goal that matters most.";
    case 7: return "Own your role, and know how your DISC style helps or hurts.";
    case 8: return "The daily leadership rhythm that turns intention into results.";
    case 9: return "A single-page summary. Adjust anything that needs sharpening.";
    case 10: return "Sign your commitment for this cycle.";
    default: return "";
  }
}
function stepIsValid(step: number, d: SectionData): boolean {
  switch (step) {
    case 1: return nonEmpty(d.strengths).length >= 1 && nonEmpty(d.gaps).length >= 1;
    case 2: return d.skills.length + (d.skills_other.trim() ? 1 : 0) >= 1;
    case 3: return nonEmpty(d.character_perf_strengths).length >= 1 && d.character_moral_focus.trim().length > 0;
    case 4: return d.emotion_zone.length > 0;
    case 5: return [d.si_personally, d.si_professionally, d.si_as_leader, d.si_relationships, d.si_health].some((s) => s.trim().length > 0);
    case 6: return nonEmpty(d.success_drivers).length >= 3 && d.top_priority_goal.trim().length > 0;
    case 7: return d.primary_role.trim().length > 0;
    case 8: return nonEmpty(d.daily_priorities).length >= 1 && (d.standards.length + (d.standards_other.trim() ? 1 : 0)) >= 1;
    case 9: return d.plan_success_image.trim().length > 0 && d.plan_top_priority.trim().length > 0;
    case 10: return d.committed && d.commitment_date.trim().length > 0;
    default: return true;
  }
}

function ChipToggle({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition ${
        active
          ? "bg-[#433993] text-white shadow-[0_6px_20px_-8px_rgba(67,57,147,0.6)] ring-2 ring-[#433993]/40"
          : "bg-secondary/60 text-foreground ring-1 ring-inset ring-border hover:ring-[#433993]/40"
      }`}
    >
      {label}
    </button>
  );
}

function AboutSectionButton({ className }: { className?: string }) {
  return (
    <AboutSectionSheet title="Section 2: Lead Yourself" className={className}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#433993]">
        Principle 1: Lead Yourself
      </p>
      <h4 className="font-display text-lg font-semibold text-foreground">Section Objective</h4>
      <p>The first principle of leadership is simple:</p>
      <p className="font-semibold">You cannot give what you do not have.</p>
      <p>Everything you accomplish as a leader begins with how well you lead yourself.</p>
      <p>
        Your GAP Report has already identified where you are today. This section will help you
        understand those results and build a practical plan for becoming the leader your goals
        require.
      </p>
      <p>The objective is not to improve everything at once.</p>
      <p>
        The objective is to identify the leadership gaps that matter most, strengthen your
        foundation, and leave this section with a clear Lead Yourself Plan.
      </p>
    </AboutSectionSheet>
  );
}

function GuideNote({ children }: { children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-[#433993]/20 bg-[#433993]/[0.04] p-5 text-sm leading-relaxed text-foreground">
      {children}
    </section>
  );
}

function NumberedInputs({
  values,
  onChange,
  placeholder,
}: {
  values: string[];
  onChange: (i: number, v: string) => void;
  placeholder?: string;
}) {
  return (
    <ol className="space-y-2">
      {values.map((v, i) => (
        <li key={i} className="flex items-start gap-2">
          <span className="mt-2 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[#433993]/10 text-xs font-semibold text-[#433993]">
            {i + 1}
          </span>
          <Input
            value={v}
            placeholder={placeholder}
            onChange={(e) => onChange(i, e.target.value)}
            className="flex-1"
          />
        </li>
      ))}
    </ol>
  );
}

function StepReviewGap({
  d,
  updateAt,
  update,
  md,
}: {
  d: SectionData;
  update: <K extends keyof SectionData>(k: K, v: SectionData[K]) => void;
  updateAt: (k: keyof SectionData, i: number, v: string) => void;
  md: string | null;
}) {
  return (
    <>
      <GuideNote>
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#433993]">
          Part 1: Review Your GAP Report
        </p>
        <p className="mt-2">Before moving forward, review your GAP Report.</p>
        <p className="mt-2">Identify the most important insights from your assessments.</p>
      </GuideNote>
      {!md && (
        <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4 text-sm text-amber-900">
          You don't have a GAP Report yet. You can still complete Section 2 from memory — but generating your first
          GAP Report will make this much sharper.
        </div>
      )}
      <section>
        <h3 className="text-base font-semibold text-foreground">My Greatest Leadership Strengths</h3>
        <p className="text-sm text-muted-foreground">List your top three from your GAP Report.</p>
        <div className="mt-3">
          <NumberedInputs values={d.strengths} onChange={(i, v) => updateAt("strengths", i, v)} placeholder="A strength that shows up consistently" />
        </div>
      </section>
      <section>
        <h3 className="text-base font-semibold text-foreground">My Greatest Leadership Gaps</h3>
        <p className="text-sm text-muted-foreground">Name the three most important gaps to close this cycle.</p>
        <div className="mt-3">
          <NumberedInputs values={d.gaps} onChange={(i, v) => updateAt("gaps", i, v)} placeholder="A gap holding you back" />
        </div>
      </section>
      <section>
        <Label htmlFor="patterns" className="text-base font-semibold text-foreground">
          Looking across my entire GAP Report, what patterns do I notice?
        </Label>
        <Textarea
          id="patterns"
          value={d.patterns}
          onChange={(e) => update("patterns", e.target.value)}
          className="mt-2 min-h-[120px]"
          placeholder="Themes, blind spots, tradeoffs, what keeps repeating…"
        />
      </section>
    </>
  );
}

function StepUnderstandGaps({
  d,
  update,
  toggleIn,
}: {
  d: SectionData;
  update: <K extends keyof SectionData>(k: K, v: SectionData[K]) => void;
  toggleIn: (k: keyof SectionData, v: string) => void;
}) {
  return (
    <>
      <GuideNote>
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#433993]">
          Part 2: Understanding Your Leadership Gaps
        </p>
        <p className="mt-2">
          Throughout this workbook you'll discover that leadership gaps generally come from one of
          two places.
        </p>
        <div className="mt-3">
          <p className="font-semibold text-foreground">Knowledge & Skill Gap</p>
          <p className="mt-1">I don't know how.</p>
          <p className="mt-1">I need additional knowledge, tools, practice, or coaching.</p>
        </div>
        <div className="mt-3">
          <p className="font-semibold text-foreground">Capacity & Standards Gap</p>
          <p className="mt-1">I know what to do.</p>
          <p className="mt-1">
            I'm simply not doing it consistently because my capacity, standards, or discipline need
            to improve.
          </p>
        </div>
        <p className="mt-3">Review your Leadership Assessment.</p>
      </GuideNote>
      <section>
        <h3 className="text-base font-semibold text-foreground">
          Which leadership skills require the greatest development during this Leadership
          Optimization Cycle?
        </h3>
        <p className="text-sm text-muted-foreground">Tap all that apply.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {SKILL_OPTIONS.map((s) => (
            <ChipToggle key={s} label={s} active={d.skills.includes(s)} onClick={() => toggleIn("skills", s)} />
          ))}
        </div>
        <div className="mt-3">
          <Label className="text-xs uppercase tracking-widest text-muted-foreground">Other</Label>
          <Input className="mt-1" value={d.skills_other} onChange={(e) => update("skills_other", e.target.value)} placeholder="Add your own" />
        </div>
      </section>
      <section className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="knowledge_gaps" className="text-sm font-semibold text-foreground">
            Which are primarily Knowledge & Skill gaps?
          </Label>
          <Textarea id="knowledge_gaps" value={d.knowledge_gaps} onChange={(e) => update("knowledge_gaps", e.target.value)} className="mt-2 min-h-[110px]" />
        </div>
        <div>
          <Label htmlFor="capacity_gaps" className="text-sm font-semibold text-foreground">
            Which are primarily Capacity & Standards gaps?
          </Label>
          <Textarea id="capacity_gaps" value={d.capacity_gaps} onChange={(e) => update("capacity_gaps", e.target.value)} className="mt-2 min-h-[110px]" />
        </div>
      </section>
    </>
  );
}

function StepFirmCharacter({
  d,
  updateAt,
  update,
}: {
  d: SectionData;
  update: <K extends keyof SectionData>(k: K, v: SectionData[K]) => void;
  updateAt: (k: keyof SectionData, i: number, v: string) => void;
}) {
  return (
    <>
      <GuideNote>
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#433993]">
          Part 3: FUEL Your Leadership
        </p>
        <p className="mt-2">Leadership begins by fueling yourself first.</p>
        <p className="mt-2">Every Lead Yourself Plan is built around four commitments.</p>
        <p className="mt-3 font-semibold text-foreground">F — Firm Up Your Character</p>
        <p className="mt-1">Review the Two Types of Character worksheet.</p>
      </GuideNote>
      <section>
        <h3 className="text-base font-semibold text-foreground">Performance Character</h3>
        <p className="text-sm text-muted-foreground">
          Which three Performance Character qualities are your greatest strengths?
        </p>
        <div className="mt-3">
          <NumberedInputs values={d.character_perf_strengths} onChange={(i, v) => updateAt("character_perf_strengths", i, v)} placeholder="e.g. Discipline, Drive, Focus" />
        </div>
        <p className="mt-4 text-sm text-muted-foreground">
          Which two Performance Character qualities require intentional growth?
        </p>
        <div className="mt-2">
          <NumberedInputs values={d.character_perf_growth} onChange={(i, v) => updateAt("character_perf_growth", i, v)} placeholder="e.g. Patience, Resilience" />
        </div>
      </section>
      <section>
        <h3 className="text-base font-semibold text-foreground">Moral Character</h3>
        <p className="text-sm text-muted-foreground">
          Which three Moral Character qualities best describe you today?
        </p>
        <div className="mt-3">
          <NumberedInputs values={d.character_moral} onChange={(i, v) => updateAt("character_moral", i, v)} placeholder="e.g. Honesty, Integrity, Humility" />
        </div>
        <div className="mt-4">
          <Label htmlFor="moral_focus" className="text-sm font-semibold text-foreground">
            Which Moral Character quality requires the greatest attention during this Leadership
            Optimization Cycle?
          </Label>
          <Input id="moral_focus" className="mt-2" value={d.character_moral_focus} onChange={(e) => update("character_moral_focus", e.target.value)} />
        </div>
      </section>
      <section>
        <p className="text-sm font-semibold text-foreground">Character → Process → Result</p>
        <Label htmlFor="improve" className="text-sm font-semibold text-foreground">
          What character qualities must improve in order to produce better leadership results?
        </Label>
        <Textarea id="improve" value={d.character_to_improve} onChange={(e) => update("character_to_improve", e.target.value)} className="mt-2 min-h-[110px]" />
      </section>
    </>
  );
}

function StepUnderstandEmotions({
  d,
  update,
}: {
  d: SectionData;
  update: <K extends keyof SectionData>(k: K, v: SectionData[K]) => void;
}) {
  return (
    <>
      <GuideNote>
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#433993]">
          U — Understand Your Emotions
        </p>
        <p className="mt-2">Review your Emotional Energy Awareness Scale.</p>
      </GuideNote>
      <section>
        <h3 className="text-base font-semibold text-foreground">
          Which Emotional Energy Zone best describes you most days?
        </h3>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {EMOTIONAL_ZONES.map((z) => {
            const active = d.emotion_zone === z.value;
            return (
              <button
                key={z.value}
                type="button"
                onClick={() => update("emotion_zone", z.value)}
                aria-pressed={active}
                className={`rounded-xl border px-4 py-3 text-left text-sm transition ${
                  active
                    ? "border-[#433993] bg-[#433993] text-white shadow-[0_6px_20px_-8px_rgba(67,57,147,0.6)]"
                    : "border-border bg-card hover:border-[#433993]/40"
                }`}
              >
                {z.label}
              </button>
            );
          })}
        </div>
      </section>
      <section className="space-y-4">
        <div>
          <Label className="text-sm font-semibold text-foreground">What patterns are contributing to your current emotional energy?</Label>
          <Textarea className="mt-2 min-h-[90px]" value={d.emotion_patterns} onChange={(e) => update("emotion_patterns", e.target.value)} />
        </div>
        <div>
          <Label className="text-sm font-semibold text-foreground">What practical habit will help you move one level higher?</Label>
          <Textarea className="mt-2 min-h-[90px]" value={d.emotion_habit} onChange={(e) => update("emotion_habit", e.target.value)} />
        </div>
        <div>
          <Label className="text-sm font-semibold text-foreground">How does your current emotional energy affect your leadership?</Label>
          <Textarea className="mt-2 min-h-[90px]" value={d.emotion_impact} onChange={(e) => update("emotion_impact", e.target.value)} />
        </div>
      </section>
    </>
  );
}

function StepSuccessImage({
  d,
  update,
}: {
  d: SectionData;
  update: <K extends keyof SectionData>(k: K, v: SectionData[K]) => void;
}) {
  const fields: { key: keyof SectionData; label: string }[] = [
    { key: "si_personally", label: "Personally" },
    { key: "si_professionally", label: "Professionally" },
    { key: "si_as_leader", label: "As a Leader" },
    { key: "si_relationships", label: "In Your Relationships" },
    { key: "si_health", label: "In Your Health" },
  ];
  return (
    <section className="space-y-4">
      <GuideNote>
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#433993]">
          E — Envision Your Success
        </p>
        <p className="mt-2 font-semibold text-foreground">Your Success Image</p>
        <p className="mt-2">If this Leadership Optimization Cycle is successful…</p>
        <p className="mt-2">What will success look like?</p>
      </GuideNote>
      {fields.map((f) => (
        <div key={f.key}>
          <Label className="text-sm font-semibold text-foreground">{f.label}</Label>
          <Textarea
            className="mt-2 min-h-[80px]"
            value={d[f.key] as string}
            onChange={(e) => update(f.key, e.target.value as never)}
          />
        </div>
      ))}
    </section>
  );
}

function StepSuccessDrivers({
  d,
  update,
  updateAt,
}: {
  d: SectionData;
  update: <K extends keyof SectionData>(k: K, v: SectionData[K]) => void;
  updateAt: (k: keyof SectionData, i: number, v: string) => void;
}) {
  return (
    <>
      <GuideNote>
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#433993]">
          Success Drivers & Top Priority Goal
        </p>
      </GuideNote>
      <section>
        <h3 className="text-base font-semibold text-foreground">Success Drivers</h3>
        <p className="text-sm text-muted-foreground">
          What are the five most important actions that will move you toward your Success Image?
        </p>
        <div className="mt-3">
          <NumberedInputs values={d.success_drivers} onChange={(i, v) => updateAt("success_drivers", i, v)} placeholder="An action you'll execute consistently" />
        </div>
      </section>
      <section>
        <Label htmlFor="tpg" className="text-base font-semibold text-foreground">Top Priority Goal</Label>
        <p className="text-sm text-muted-foreground">What must you accomplish during this Leadership Optimization Cycle?</p>
        <Textarea id="tpg" className="mt-2 min-h-[110px]" value={d.top_priority_goal} onChange={(e) => update("top_priority_goal", e.target.value)} />
      </section>
    </>
  );
}

function StepRoleAndDisc({
  d,
  update,
  updateAt,
}: {
  d: SectionData;
  update: <K extends keyof SectionData>(k: K, v: SectionData[K]) => void;
  updateAt: (k: keyof SectionData, i: number, v: string) => void;
}) {
  return (
    <>
      <GuideNote>
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#433993]">
          Clarify Your Role
        </p>
      </GuideNote>
      <section>
        <h3 className="text-base font-semibold text-foreground">Clarify Your Role</h3>
        <div className="mt-3 space-y-4">
          <div>
            <Label className="text-sm font-semibold text-foreground">My Primary Leadership Role</Label>
            <Input className="mt-2" value={d.primary_role} onChange={(e) => update("primary_role", e.target.value)} />
          </div>
          <div>
            <Label className="text-sm font-semibold text-foreground">
              What are the five most important responsibilities of that role?
            </Label>
            <div className="mt-2">
              <NumberedInputs values={d.responsibilities} onChange={(i, v) => updateAt("responsibilities", i, v)} />
            </div>
          </div>
          <div>
            <Label className="text-sm font-semibold text-foreground">
              What results am I ultimately responsible for producing?
            </Label>
            <Textarea className="mt-2 min-h-[90px]" value={d.role_results} onChange={(e) => update("role_results", e.target.value)} />
          </div>
        </div>
      </section>
      <section>
        <h3 className="text-base font-semibold text-foreground">DISC Self-Awareness</h3>
        <div className="mt-3 space-y-4">
          <div>
            <Label className="text-sm font-semibold text-foreground">Primary DISC Style</Label>
            <Input className="mt-2" value={d.disc_style} onChange={(e) => update("disc_style", e.target.value)} placeholder="e.g. D, I, S, C, or a blend" />
          </div>
          <div>
            <Label className="text-sm font-semibold text-foreground">My greatest strengths</Label>
            <div className="mt-2">
              <NumberedInputs values={d.disc_strengths} onChange={(i, v) => updateAt("disc_strengths", i, v)} />
            </div>
          </div>
          <div>
            <Label className="text-sm font-semibold text-foreground">My biggest blind spots</Label>
            <div className="mt-2">
              <NumberedInputs values={d.disc_blind_spots} onChange={(i, v) => updateAt("disc_blind_spots", i, v)} />
            </div>
          </div>
          <div>
            <Label className="text-sm font-semibold text-foreground">
              How could these blind spots interfere with my Success Image?
            </Label>
            <Textarea className="mt-2 min-h-[90px]" value={d.disc_impact} onChange={(e) => update("disc_impact", e.target.value)} />
          </div>
        </div>
      </section>
    </>
  );
}

function StepLeadDaily({
  d,
  update,
  updateAt,
  toggleIn,
}: {
  d: SectionData;
  update: <K extends keyof SectionData>(k: K, v: SectionData[K]) => void;
  updateAt: (k: keyof SectionData, i: number, v: string) => void;
  toggleIn: (k: keyof SectionData, v: string) => void;
}) {
  return (
    <>
      <GuideNote>
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#433993]">
          L — Lead Yourself Daily
        </p>
        <p className="mt-2">Leadership is built through consistent daily execution.</p>
      </GuideNote>
      <section>
        <h3 className="text-base font-semibold text-foreground">Leadership Priorities</h3>
        <p className="text-sm text-muted-foreground">
          What are the three most important areas of growth during this Leadership Optimization
          Cycle?
        </p>
        <div className="mt-3">
          <NumberedInputs values={d.daily_priorities} onChange={(i, v) => updateAt("daily_priorities", i, v)} />
        </div>
      </section>
      <section>
        <h3 className="text-base font-semibold text-foreground">Standards I'm Raising</h3>
        <div className="mt-3 flex flex-wrap gap-2">
          {STANDARD_OPTIONS.map((s) => (
            <ChipToggle key={s} label={s} active={d.standards.includes(s)} onClick={() => toggleIn("standards", s)} />
          ))}
        </div>
        <div className="mt-3">
          <Label className="text-xs uppercase tracking-widest text-muted-foreground">Other</Label>
          <Input className="mt-1" value={d.standards_other} onChange={(e) => update("standards_other", e.target.value)} />
        </div>
      </section>
      <section>
        <h3 className="text-base font-semibold text-foreground">
          Which daily or weekly behaviors will reinforce those standards?
        </h3>
        <div className="mt-3">
          <NumberedInputs values={d.daily_behaviors} onChange={(i, v) => updateAt("daily_behaviors", i, v)} />
        </div>
      </section>
      <section>
        <h3 className="text-base font-semibold text-foreground">My First Three Actions</h3>
        <p className="text-sm text-muted-foreground">What will I do during the next seven days?</p>
        <div className="mt-3">
          <NumberedInputs values={d.first_actions} onChange={(i, v) => updateAt("first_actions", i, v)} />
        </div>
      </section>
      <section>
        <Label className="text-base font-semibold text-foreground">My Support Team</Label>
        <p className="text-sm text-muted-foreground">
          Who will encourage, challenge, or hold me accountable during this Leadership Optimization
          Cycle?
        </p>
        <Textarea className="mt-2 min-h-[100px]" value={d.support_team} onChange={(e) => update("support_team", e.target.value)} />
      </section>
    </>
  );
}

function StepPlan({
  d,
  update,
  updateAt,
}: {
  d: SectionData;
  update: <K extends keyof SectionData>(k: K, v: SectionData[K]) => void;
  updateAt: (k: keyof SectionData, i: number, v: string) => void;
}) {
  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <p className="text-sm text-muted-foreground">
        Auto-summarized from what you entered. Adjust anything that needs sharpening.
      </p>
      <div className="mt-5 space-y-5">
        <div>
          <Label className="text-sm font-semibold text-foreground">Success Image</Label>
          <Textarea className="mt-2 min-h-[80px]" value={d.plan_success_image} onChange={(e) => update("plan_success_image", e.target.value)} />
        </div>
        <div>
          <Label className="text-sm font-semibold text-foreground">Top Priority Goal</Label>
          <Textarea className="mt-2 min-h-[80px]" value={d.plan_top_priority} onChange={(e) => update("plan_top_priority", e.target.value)} />
        </div>
        <div>
          <Label className="text-sm font-semibold text-foreground">Success Drivers (Top 3)</Label>
          <div className="mt-2">
            <NumberedInputs values={d.plan_success_drivers} onChange={(i, v) => updateAt("plan_success_drivers", i, v)} />
          </div>
        </div>
        <div>
          <Label className="text-sm font-semibold text-foreground">Leadership Skills I Will Develop</Label>
          <div className="mt-2">
            <NumberedInputs values={d.plan_skills} onChange={(i, v) => updateAt("plan_skills", i, v)} />
          </div>
        </div>
        <div>
          <Label className="text-sm font-semibold text-foreground">Standards I Am Raising</Label>
          <div className="mt-2">
            <NumberedInputs values={d.plan_standards} onChange={(i, v) => updateAt("plan_standards", i, v)} />
          </div>
        </div>
        <div>
          <Label className="text-sm font-semibold text-foreground">Daily Behaviors</Label>
          <div className="mt-2">
            <NumberedInputs values={d.plan_daily_behaviors} onChange={(i, v) => updateAt("plan_daily_behaviors", i, v)} />
          </div>
        </div>
      </div>
    </section>
  );
}

function StepCommitment({
  d,
  update,
}: {
  d: SectionData;
  update: <K extends keyof SectionData>(k: K, v: SectionData[K]) => void;
}) {
  return (
    <section className="rounded-2xl border border-[#433993]/30 bg-[#433993]/[0.04] p-6 shadow-sm">
      <h3 className="font-display text-lg font-semibold text-foreground">Leadership Commitment</h3>
      <p className="mt-2 text-xs text-muted-foreground">Complete the following statement.</p>
      <p className="mt-3 text-sm leading-relaxed text-foreground">
        During this Leadership Optimization Cycle, I commit to becoming the leader my goals require by intentionally
        strengthening my character, managing my emotional energy, keeping my Success Image in front of me, and leading
        myself consistently every day.
      </p>
      <label className="mt-5 flex items-start gap-3 rounded-xl bg-white p-4 ring-1 ring-inset ring-border">
        <Checkbox checked={d.committed} onCheckedChange={(v) => update("committed", Boolean(v))} className="mt-0.5 h-5 w-5" />
        <span className="text-sm font-medium text-foreground">I commit.</span>
      </label>
      <div className="mt-4 max-w-xs">
        <Label htmlFor="commit-date" className="text-xs uppercase tracking-widest text-muted-foreground">Date</Label>
        <Input id="commit-date" type="date" className="mt-1" value={d.commitment_date} onChange={(e) => update("commitment_date", e.target.value)} />
      </div>
    </section>
  );
}
