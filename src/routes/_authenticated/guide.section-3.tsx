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
import { ArrowLeft, ArrowRight, Check, Minus, TrendingDown, TrendingUp, X } from "lucide-react";
import { toast } from "sonner";
import { SectionVideo } from "@/components/scale/SectionVideo";
import { PrintSectionButton } from "@/components/scale/PrintSectionButton";
import { hasPrintableContent } from "@/lib/section-print";
import { GapReportPanel } from "@/components/scale/GapReportPanel";
import { AboutSectionSheet } from "@/components/scale/AboutSectionSheet";

export const Route = createFileRoute("/_authenticated/guide/section-3")({
  head: () => ({ meta: [{ title: "Section 3 · Leadership Performance Dashboard" }] }),
  component: SectionThreePage,
});

const TOTAL_SECTIONS = 12;
const TOTAL_STEPS = 8;

const FUEL_AREAS = [
  { key: "firm", label: "F — Firm Up Character", hint: "Discipline, honesty, courage." },
  { key: "understand", label: "U — Understand Emotions", hint: "Regulate reactivity, own your state." },
  { key: "envision", label: "E — Envision Success", hint: "Clarity of your success image." },
  { key: "lead", label: "L — Lead Yourself Daily", hint: "Consistency of daily leadership rhythm." },
] as const;

const CAPACITY_AREAS = [
  { key: "mental", label: "Mental Capacity" },
  { key: "emotional", label: "Emotional Capacity" },
  { key: "physical", label: "Physical Capacity" },
  { key: "spiritual", label: "Spiritual Capacity" },
  { key: "relational", label: "Relational Capacity" },
] as const;

const DEFAULT_STANDARDS = [
  "Planning", "Preparation", "Communication", "Follow Through",
  "Personal Discipline", "Emotional Control", "Physical Health",
];

type Trend = "worse" | "same" | "better" | "";

interface Priority {
  title: string;
  steps: string[];
  success_marker: string;
  marker_number: string;
  target_date: string;
}

interface SectionData {
  fuel: Record<string, number>;
  capacity: Record<string, Trend>;
  skills: { name: string; current: number; desired: number }[];
  drivers: { label: string; percent: number }[];
  standards_ratings: { label: string; score: number }[];
  standard_focus: string;
  standard_plan: string;
  standard_success_marker: string;
  standard_marker_number: string;
  reflection_wins: string;
  reflection_misses: string;
  reflection_blockers: string;
  reflection_next_focus: string;
  priorities: Priority[];
  committed: boolean;
  commitment_date: string;
  step: number;
  // Dashboard 1 follow-up
  fuel_identify_progress: string;
  fuel_identify_attention: string;
  fuel_understand: string;
  fuel_plan: string;
  fuel_execute_action: string;
  fuel_execute_date: string;
  fuel_measure: string;
  // Dashboard 2 follow-up
  capacity_identify: string;
  capacity_understand: string;
  capacity_plan: string;
  capacity_execute: string;
  capacity_measure: string;
  // Dashboard 3 follow-up (single skill focus)
  skill_focus: string;
  skill_benefits: string[]; // 3
  skill_characteristics: string[]; // 5
  skill_plan_steps: string[]; // 5
  skill_execute_step: string;
  skill_execute_date: string;
  skill_measure: string;
  skill_feedback_from: string;
  // Dashboard 4 follow-up
  drivers_identify: string;
  drivers_understand_helped: string;
  drivers_understand_slowed: string;
  drivers_plan: string;
  drivers_execute_action: string;
  drivers_execute_date: string;
  drivers_measure: string;
  // Dashboard 5 follow-up (extends existing standard fields)
  standard_understand_limiting: string;
  standard_benefits: string[]; // 3
  standard_current: string;
  standard_new: string;
  standard_actions: string[]; // 5
  standard_execute_action: string;
  standard_accountable: string;
  standard_measure_cadence: "Daily" | "Weekly" | "Monthly" | "";
  // Dashboard 6 follow-up (replaces generic reflection body)
  reflection_avoiding: string[]; // chips
  reflection_avoiding_other: string;
  reflection_why: string[]; // chips
  reflection_why_other: string;
  reflection_best_action: string;
  reflection_when: string;
  reflection_involved: string;
  reflection_measure_success: string;
  reflection_expected_result: string;
}

const emptyPriority = (): Priority => ({
  title: "", steps: ["", "", ""], success_marker: "", marker_number: "", target_date: "",
});

const EMPTY: SectionData = {
  fuel: { firm: 5, understand: 5, envision: 5, lead: 5 },
  capacity: { mental: "", emotional: "", physical: "", spiritual: "", relational: "" },
  skills: [
    { name: "", current: 5, desired: 8 },
    { name: "", current: 5, desired: 8 },
    { name: "", current: 5, desired: 8 },
  ],
  drivers: [
    { label: "", percent: 0 }, { label: "", percent: 0 }, { label: "", percent: 0 },
    { label: "", percent: 0 }, { label: "", percent: 0 },
  ],
  standards_ratings: DEFAULT_STANDARDS.map((label) => ({ label, score: 5 })),
  standard_focus: "",
  standard_plan: "",
  standard_success_marker: "",
  standard_marker_number: "",
  reflection_wins: "",
  reflection_misses: "",
  reflection_blockers: "",
  reflection_next_focus: "",
  priorities: [emptyPriority(), emptyPriority(), emptyPriority()],
  committed: false,
  commitment_date: "",
  step: 1,
  fuel_identify_progress: "",
  fuel_identify_attention: "",
  fuel_understand: "",
  fuel_plan: "",
  fuel_execute_action: "",
  fuel_execute_date: "",
  fuel_measure: "",
  capacity_identify: "",
  capacity_understand: "",
  capacity_plan: "",
  capacity_execute: "",
  capacity_measure: "",
  skill_focus: "",
  skill_benefits: ["", "", ""],
  skill_characteristics: ["", "", "", "", ""],
  skill_plan_steps: ["", "", "", "", ""],
  skill_execute_step: "",
  skill_execute_date: "",
  skill_measure: "",
  skill_feedback_from: "",
  drivers_identify: "",
  drivers_understand_helped: "",
  drivers_understand_slowed: "",
  drivers_plan: "",
  drivers_execute_action: "",
  drivers_execute_date: "",
  drivers_measure: "",
  standard_understand_limiting: "",
  standard_benefits: ["", "", ""],
  standard_current: "",
  standard_new: "",
  standard_actions: ["", "", "", "", ""],
  standard_execute_action: "",
  standard_accountable: "",
  standard_measure_cadence: "",
  reflection_avoiding: [],
  reflection_avoiding_other: "",
  reflection_why: [],
  reflection_why_other: "",
  reflection_best_action: "",
  reflection_when: "",
  reflection_involved: "",
  reflection_measure_success: "",
  reflection_expected_result: "",
};

function SectionThreePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [d, setD] = useState<SectionData>(EMPTY);
  const [previousSnapshot, setPreviousSnapshot] = useState<SectionData | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loaded = useRef(false);
  const seededFromSection2 = useRef(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ data: row }, { data: sec2 }, { data: prevSnap }] = await Promise.all([
        supabase
          .from("optimizer_section_progress")
          .select("*")
          .eq("user_id", user.id)
          .eq("section_number", 3)
          .maybeSingle(),
        supabase
          .from("optimizer_section_progress")
          .select("data")
          .eq("user_id", user.id)
          .eq("section_number", 2)
          .maybeSingle(),
        supabase
          .from("leadership_dashboard_snapshots")
          .select("data, created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(1),
      ]);

      let next = EMPTY;
      if (row?.data) {
        next = { ...EMPTY, ...(row.data as unknown as Partial<SectionData>) } as SectionData;
      } else if (sec2?.data) {
        // Seed drivers + standards from Section 2 on first entry.
        const s2 = sec2.data as { success_drivers?: string[]; standards?: string[]; standards_other?: string; plan_skills?: string[] };
        const drivers = (s2.success_drivers ?? []).filter(Boolean).slice(0, 5);
        while (drivers.length < 5) drivers.push("");
        const stdList = [...(s2.standards ?? []), ...(s2.standards_other ? [s2.standards_other] : [])].filter(Boolean);
        const stdRatings = (stdList.length ? stdList : DEFAULT_STANDARDS).slice(0, 7).map((label) => ({ label, score: 5 }));
        while (stdRatings.length < 7) stdRatings.push({ label: DEFAULT_STANDARDS[stdRatings.length] ?? "", score: 5 });
        const seededSkills = (s2.plan_skills ?? []).filter(Boolean).slice(0, 3);
        const skills = [0, 1, 2].map((i) => ({ name: seededSkills[i] ?? "", current: 5, desired: 8 }));
        next = {
          ...EMPTY,
          drivers: drivers.map((label) => ({ label, percent: 0 })),
          standards_ratings: stdRatings,
          skills,
        };
        seededFromSection2.current = true;
      }
      setD(next);
      const prev = (prevSnap ?? [])[0]?.data as unknown as SectionData | undefined;
      setPreviousSnapshot(prev ?? null);
      loaded.current = true;
      setLoading(false);
    })();
  }, [user]);

  const step = d.step;

  const isComplete = useMemo(() => {
    const fuelFilled = FUEL_AREAS.every((a) => (d.fuel[a.key] ?? 0) > 0);
    const capacityFilled = CAPACITY_AREAS.every((a) => d.capacity[a.key] !== "");
    const skillsFilled = d.skills.some((s) => s.name.trim().length > 0);
    const driversFilled = d.drivers.some((s) => s.label.trim().length > 0);
    const standardsPicked = d.standard_focus.trim().length > 0 && d.standard_plan.trim().length > 0;
    const reflectionFilled = d.reflection_wins.trim().length > 0 && d.reflection_next_focus.trim().length > 0;
    const actionFilled = d.priorities.some((p) => p.title.trim().length > 0 && p.target_date.length > 0);
    return (
      fuelFilled && capacityFilled && skillsFilled && driversFilled &&
      standardsPicked && reflectionFilled && actionFilled &&
      d.committed && d.commitment_date.length > 0
    );
  }, [d]);

  useEffect(() => {
    if (!user || !loaded.current) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      await supabase.from("optimizer_section_progress").upsert(
        [{ user_id: user.id, section_number: 3, data: d as unknown as never, completed: isComplete }],
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
      toast.error("Fill each dashboard and sign the commitment to finish.");
      return;
    }
    const snapshot = {
      fuel: d.fuel,
      capacity: d.capacity,
      skills: d.skills,
      drivers: d.drivers,
      standards_ratings: d.standards_ratings,
      standard_focus: d.standard_focus,
      standard_marker_number: d.standard_marker_number,
      priorities: d.priorities.map((p) => ({ ...p })),
      commitment_date: d.commitment_date,
    };
    const { error } = await supabase.from("leadership_dashboard_snapshots").insert([
      { user_id: user.id, data: snapshot as unknown as never },
    ]);
    if (error) {
      toast.error("Couldn't save your dashboard snapshot. Please try again.");
      return;
    }
    toast.success("Section 3 complete. Snapshot saved.");
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
        <PrintSectionButton section={3} hasContent={hasPrintableContent(d)} />
      </div>
      <SectionVideo sectionNumber={3} sectionTitle="Leadership Performance Dashboard" />

      <div className="mb-6">
        <div className="flex items-center justify-between text-xs font-medium uppercase tracking-widest text-muted-foreground">
          <span>Section 3 of {TOTAL_SECTIONS}</span>
          <span>Dashboard {step} of {TOTAL_STEPS}</span>
        </div>
        <Progress value={(step / TOTAL_STEPS) * 100} className="mt-2 h-1.5" />
        <GapReportPanel className="mt-4" />
        <h1 className="mt-4 font-display text-3xl font-semibold text-foreground sm:text-4xl">{stepTitle(step)}</h1>
        <AboutSectionButtonS3 className="mt-3" />
      </div>

      <div className="space-y-8">
        {step === 1 && <D1Fuel d={d} update={update} prev={previousSnapshot} />}
        {step === 2 && <D2Capacity d={d} update={update} />}
        {step === 3 && <D3Skills d={d} update={update} />}
        {step === 4 && <D4Drivers d={d} update={update} />}
        {step === 5 && <D5Standards d={d} update={update} />}
        {step === 6 && <D6Reflection d={d} update={update} />}
        {step === 7 && <D7Actions d={d} update={update} />}
        {step === 8 && <StepCommitment d={d} update={update} />}
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
            Finish Section 3 <Check className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>
    </main>
  );
}

function stepTitle(step: number) {
  switch (step) {
    case 1: return "Dashboard 1 — FUEL Review";
    case 2: return "Dashboard 2 — Leadership Capacity Review";
    case 3: return "Dashboard 3 — Skill Development Plan";
    case 4: return "Dashboard 4 — Success Drivers Review";
    case 5: return "Dashboard 5 — Standards Improvement Plan";
    case 6: return "Dashboard 6 — Reflection & Execution";
    case 7: return "Dashboard 7 — Leadership Action Plan";
    case 8: return "Leadership Commitment";
    default: return "";
  }
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

function GuideNote({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border-l-4 border-[#5b19bf] bg-[#f6f2ff] p-4 text-sm leading-relaxed text-foreground">
      {children}
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

function NumberedList({ label, items, onChange, placeholder }: { label: string; items: string[]; onChange: (arr: string[]) => void; placeholder?: string }) {
  return (
    <div>
      <Label className="text-xs font-medium text-foreground">{label}</Label>
      <ol className="mt-1 space-y-2">
        {items.map((it, i) => (
          <li key={i} className="flex items-start gap-2">
            <span className="mt-2 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[#433993]/10 text-[11px] font-semibold text-[#433993]">{i + 1}</span>
            <Input value={it} onChange={(e) => { const arr = [...items]; arr[i] = e.target.value; onChange(arr); }} placeholder={placeholder} />
          </li>
        ))}
      </ol>
    </div>
  );
}

function Chips({ label, options, values, onChange, other, onOtherChange }: { label: string; options: string[]; values: string[]; onChange: (v: string[]) => void; other: string; onOtherChange: (v: string) => void }) {
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
      <Input value={other} onChange={(e) => onOtherChange(e.target.value)} placeholder="Other…" className="mt-2" />
    </div>
  );
}

function stepIsValid(step: number, d: SectionData): boolean {
  switch (step) {
    case 1: return FUEL_AREAS.every((a) => (d.fuel[a.key] ?? 0) > 0);
    case 2: return CAPACITY_AREAS.every((a) => d.capacity[a.key] !== "");
    case 3: return d.skills.some((s) => s.name.trim().length > 0);
    case 4: return d.drivers.some((s) => s.label.trim().length > 0);
    case 5: return d.standard_focus.trim().length > 0 && d.standard_plan.trim().length > 0;
    case 6: return d.reflection_wins.trim().length > 0 && d.reflection_next_focus.trim().length > 0;
    case 7: return d.priorities.some((p) => p.title.trim().length > 0 && p.target_date.length > 0);
    case 8: return d.committed && d.commitment_date.length > 0;
    default: return true;
  }
}

function TrendPill({ delta }: { delta: number | null }) {
  if (delta === null) return <span className="text-[11px] text-muted-foreground">No prior rating</span>;
  if (delta === 0) return <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground"><Minus className="h-3 w-3" /> Same</span>;
  if (delta > 0) return <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-700"><TrendingUp className="h-3 w-3" /> +{delta}</span>;
  return <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-medium text-rose-700"><TrendingDown className="h-3 w-3" /> {delta}</span>;
}

function RatingSlider({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <div className="flex items-center gap-3">
      <Slider value={[value]} min={1} max={10} step={1} onValueChange={(v) => onChange(v[0] ?? 1)} className="flex-1" />
      <span className="w-8 text-right text-sm font-semibold text-[#433993]">{value}</span>
    </div>
  );
}

function TrendButtons({ value, onChange }: { value: Trend; onChange: (t: Trend) => void }) {
  const opts: { v: Exclude<Trend, "">; label: string; cls: string }[] = [
    { v: "worse", label: "Worse", cls: "bg-rose-500 text-white ring-rose-500" },
    { v: "same", label: "Same", cls: "bg-slate-500 text-white ring-slate-500" },
    { v: "better", label: "Better", cls: "bg-emerald-500 text-white ring-emerald-500" },
  ];
  return (
    <div className="flex gap-2">
      {opts.map((o) => (
        <button
          key={o.v}
          type="button"
          onClick={() => onChange(o.v)}
          className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition ${
            value === o.v ? `${o.cls} ring-2` : "bg-secondary/60 text-foreground ring-1 ring-inset ring-border hover:ring-[#433993]/40"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function D1Fuel({ d, update, prev }: { d: SectionData; update: <K extends keyof SectionData>(k: K, v: SectionData[K]) => void; prev: SectionData | null }) {
  return (
    <div className="space-y-6">
      <SectionBlock label="Evaluate" hint="Rate each FUEL area 1–10. Trend compares to your last review.">
        <div className="space-y-3">
      {FUEL_AREAS.map((a) => {
        const current = d.fuel[a.key] ?? 5;
        const previous = prev?.fuel?.[a.key];
        const delta = typeof previous === "number" ? current - previous : null;
        return (
          <div key={a.key} className="rounded-xl border border-border bg-background p-3">
            <div className="mb-1 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-foreground">{a.label}</h3>
                <p className="text-xs text-muted-foreground">{a.hint}</p>
              </div>
              <TrendPill delta={delta} />
            </div>
            <RatingSlider value={current} onChange={(n) => update("fuel", { ...d.fuel, [a.key]: n })} />
          </div>
        );
      })}
        </div>
      </SectionBlock>
      <SectionBlock label="Identify">
        <LabeledTextarea label="Where did you make the greatest progress this cycle?" value={d.fuel_identify_progress} onChange={(v) => update("fuel_identify_progress", v)} />
        <LabeledTextarea label="Which FUEL area needs the most attention right now?" value={d.fuel_identify_attention} onChange={(v) => update("fuel_identify_attention", v)} />
      </SectionBlock>
      <SectionBlock label="Understand">
        <LabeledTextarea label="Why did it improve or decline?" value={d.fuel_understand} onChange={(v) => update("fuel_understand", v)} />
      </SectionBlock>
      <SectionBlock label="Build a Plan">
        <LabeledTextarea label="What is one adjustment you'll make?" value={d.fuel_plan} onChange={(v) => update("fuel_plan", v)} />
      </SectionBlock>
      <SectionBlock label="Execute">
        <LabeledInput label="What action will you take this week?" value={d.fuel_execute_action} onChange={(v) => update("fuel_execute_action", v)} />
        <LabeledInput label="Completion Date" type="date" value={d.fuel_execute_date} onChange={(v) => update("fuel_execute_date", v)} />
      </SectionBlock>
      <SectionBlock label="Measure">
        <LabeledTextarea label="How will you know you improved?" value={d.fuel_measure} onChange={(v) => update("fuel_measure", v)} />
      </SectionBlock>
    </div>
  );
}

function D2Capacity({ d, update }: { d: SectionData; update: <K extends keyof SectionData>(k: K, v: SectionData[K]) => void }) {
  return (
    <div className="space-y-6">
      <SectionBlock label="Evaluate" hint="For each capacity, tap Worse / Same / Better vs last cycle.">
        <div className="space-y-3">
      {CAPACITY_AREAS.map((a) => (
        <div key={a.key} className="rounded-xl border border-border bg-background p-3">
          <div className="mb-2 text-sm font-semibold text-foreground">{a.label}</div>
          <TrendButtons value={d.capacity[a.key]} onChange={(t) => update("capacity", { ...d.capacity, [a.key]: t })} />
        </div>
      ))}
        </div>
      </SectionBlock>
      <SectionBlock label="Identify">
        <LabeledTextarea label="Which area deserves your attention this cycle?" value={d.capacity_identify} onChange={(v) => update("capacity_identify", v)} />
      </SectionBlock>
      <SectionBlock label="Understand">
        <LabeledTextarea label="What behaviors or patterns are behind it?" value={d.capacity_understand} onChange={(v) => update("capacity_understand", v)} />
      </SectionBlock>
      <SectionBlock label="Build a Plan">
        <LabeledTextarea label="What is the one change that would have the greatest impact?" value={d.capacity_plan} onChange={(v) => update("capacity_plan", v)} />
      </SectionBlock>
      <SectionBlock label="Execute">
        <LabeledTextarea label="What will you begin immediately?" value={d.capacity_execute} onChange={(v) => update("capacity_execute", v)} />
      </SectionBlock>
      <SectionBlock label="Measure">
        <LabeledTextarea label="How will you measure improvement over the next month?" value={d.capacity_measure} onChange={(v) => update("capacity_measure", v)} />
      </SectionBlock>
    </div>
  );
}

function D3Skills({ d, update }: { d: SectionData; update: <K extends keyof SectionData>(k: K, v: SectionData[K]) => void }) {
  return (
    <div className="space-y-6">
      <SectionBlock label="Evaluate" hint="Set Current and Desired level for each skill (1–10).">
        <div className="space-y-3">
      {d.skills.map((s, i) => (
        <div key={i} className="rounded-xl border border-border bg-background p-3">
          <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Skill {i + 1}</Label>
          <Input
            value={s.name}
            onChange={(e) => {
              const arr = [...d.skills]; arr[i] = { ...arr[i], name: e.target.value }; update("skills", arr);
            }}
            placeholder="e.g. Coaching & Developing Others"
            className="mt-1"
          />
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div>
              <Label className="text-xs text-muted-foreground">Current (1–10)</Label>
              <RatingSlider value={s.current} onChange={(n) => { const arr = [...d.skills]; arr[i] = { ...arr[i], current: n }; update("skills", arr); }} />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Desired (1–10)</Label>
              <RatingSlider value={s.desired} onChange={(n) => { const arr = [...d.skills]; arr[i] = { ...arr[i], desired: n }; update("skills", arr); }} />
            </div>
          </div>
        </div>
      ))}
        </div>
      </SectionBlock>
      <SectionBlock label="Focus" hint="Pick ONE skill to develop this cycle.">
        <LabeledInput label="Skill to develop this cycle" value={d.skill_focus} onChange={(v) => update("skill_focus", v)} placeholder="Choose one skill from above" />
      </SectionBlock>
      <SectionBlock label="Identify">
        <NumberedList label="List 3 benefits of improving this skill" items={d.skill_benefits} onChange={(arr) => update("skill_benefits", arr)} placeholder="Benefit" />
      </SectionBlock>
      <SectionBlock label="Understand">
        <NumberedList label="List 5 characteristics of people who do this well" items={d.skill_characteristics} onChange={(arr) => update("skill_characteristics", arr)} placeholder="Characteristic" />
      </SectionBlock>
      <SectionBlock label="Build a Plan">
        <NumberedList label="5 specific steps to develop this skill" items={d.skill_plan_steps} onChange={(arr) => update("skill_plan_steps", arr)} placeholder="Step" />
      </SectionBlock>
      <SectionBlock label="Execute">
        <LabeledInput label="Which step will you take this week?" value={d.skill_execute_step} onChange={(v) => update("skill_execute_step", v)} />
        <LabeledInput label="Completion Date" type="date" value={d.skill_execute_date} onChange={(v) => update("skill_execute_date", v)} />
      </SectionBlock>
      <SectionBlock label="Measure">
        <LabeledTextarea label="How will you know this skill is improving?" value={d.skill_measure} onChange={(v) => update("skill_measure", v)} />
        <LabeledInput label="Who will give you feedback?" value={d.skill_feedback_from} onChange={(v) => update("skill_feedback_from", v)} />
      </SectionBlock>
    </div>
  );
}

function D4Drivers({ d, update }: { d: SectionData; update: <K extends keyof SectionData>(k: K, v: SectionData[K]) => void }) {
  return (
    <div className="space-y-6">
      <SectionBlock label="Evaluate" hint="Slide the progress percent for each Success Driver.">
        <div className="space-y-3">
      {d.drivers.map((dr, i) => (
        <div key={i} className="rounded-xl border border-border bg-background p-3">
          <div className="flex items-center gap-3">
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#433993]/10 text-xs font-semibold text-[#433993]">{i + 1}</span>
            <Input
              value={dr.label}
              onChange={(e) => { const arr = [...d.drivers]; arr[i] = { ...arr[i], label: e.target.value }; update("drivers", arr); }}
              placeholder={`Success Driver ${i + 1}`}
              className="flex-1"
            />
          </div>
          <div className="mt-3 flex items-center gap-3">
            <Slider value={[dr.percent]} min={0} max={100} step={5} onValueChange={(v) => { const arr = [...d.drivers]; arr[i] = { ...arr[i], percent: v[0] ?? 0 }; update("drivers", arr); }} className="flex-1" />
            <span className="w-12 text-right text-sm font-semibold text-[#433993]">{dr.percent}%</span>
          </div>
        </div>
      ))}
        </div>
      </SectionBlock>
      <SectionBlock label="Identify">
        <LabeledTextarea label="Which driver deserves the most attention right now?" value={d.drivers_identify} onChange={(v) => update("drivers_identify", v)} />
      </SectionBlock>
      <SectionBlock label="Understand">
        <LabeledTextarea label="What helped you move it forward?" value={d.drivers_understand_helped} onChange={(v) => update("drivers_understand_helped", v)} />
        <LabeledTextarea label="What slowed your progress?" value={d.drivers_understand_slowed} onChange={(v) => update("drivers_understand_slowed", v)} />
      </SectionBlock>
      <SectionBlock label="Build a Plan">
        <LabeledTextarea label="What must change to move it forward?" value={d.drivers_plan} onChange={(v) => update("drivers_plan", v)} />
      </SectionBlock>
      <SectionBlock label="Execute">
        <LabeledInput label="What is your first action?" value={d.drivers_execute_action} onChange={(v) => update("drivers_execute_action", v)} />
        <LabeledInput label="Completion Date" type="date" value={d.drivers_execute_date} onChange={(v) => update("drivers_execute_date", v)} />
      </SectionBlock>
      <SectionBlock label="Measure">
        <LabeledTextarea label="How will you measure progress?" value={d.drivers_measure} onChange={(v) => update("drivers_measure", v)} />
      </SectionBlock>
    </div>
  );
}

function D5Standards({ d, update }: { d: SectionData; update: <K extends keyof SectionData>(k: K, v: SectionData[K]) => void }) {
  return (
    <div className="space-y-6">
      <SectionBlock label="Evaluate" hint="Rate each standard 1–10.">
        <div className="space-y-3">
        {d.standards_ratings.map((s, i) => (
          <div key={i} className="rounded-xl border border-border bg-background p-3">
            <div className="mb-1 flex items-center justify-between">
              <Input
                value={s.label}
                onChange={(e) => { const arr = [...d.standards_ratings]; arr[i] = { ...arr[i], label: e.target.value }; update("standards_ratings", arr); }}
                className="mr-3 h-8 border-0 bg-transparent p-0 text-sm font-semibold focus-visible:ring-0"
              />
              <span className="text-sm font-semibold text-[#433993]">{s.score}</span>
            </div>
            <Slider value={[s.score]} min={1} max={10} step={1} onValueChange={(v) => { const arr = [...d.standards_ratings]; arr[i] = { ...arr[i], score: v[0] ?? 1 }; update("standards_ratings", arr); }} />
          </div>
        ))}
        </div>
      </SectionBlock>
      <SectionBlock label="Identify">
        <LabeledInput label="Which ONE standard will you raise this cycle?" value={d.standard_focus} onChange={(v) => update("standard_focus", v)} placeholder="e.g. Follow Through" />
      </SectionBlock>
      <SectionBlock label="Understand">
        <LabeledTextarea label="Why is this standard limiting you?" value={d.standard_understand_limiting} onChange={(v) => update("standard_understand_limiting", v)} />
        <NumberedList label="List 3 benefits of raising it" items={d.standard_benefits} onChange={(arr) => update("standard_benefits", arr)} placeholder="Benefit" />
      </SectionBlock>
      <SectionBlock label="Build a Plan">
        <LabeledInput label="Current standard" value={d.standard_current} onChange={(v) => update("standard_current", v)} />
        <LabeledInput label="New standard" value={d.standard_new} onChange={(v) => update("standard_new", v)} />
        <NumberedList label="5 reinforcing actions" items={d.standard_actions} onChange={(arr) => update("standard_actions", arr)} placeholder="Action" />
        <LabeledTextarea label="Plan summary" value={d.standard_plan} onChange={(v) => update("standard_plan", v)} placeholder="How will you raise this standard?" />
      </SectionBlock>
      <SectionBlock label="Execute">
        <LabeledInput label="What action will you take this week?" value={d.standard_execute_action} onChange={(v) => update("standard_execute_action", v)} />
        <LabeledInput label="Who will hold you accountable?" value={d.standard_accountable} onChange={(v) => update("standard_accountable", v)} />
      </SectionBlock>
      <SectionBlock label="Measure">
        <div>
          <Label className="text-xs font-medium text-foreground">Cadence</Label>
          <div className="mt-2 flex gap-2">
            {(["Daily", "Weekly", "Monthly"] as const).map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => update("standard_measure_cadence", c)}
                className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition ${d.standard_measure_cadence === c ? "bg-[#433993] text-white" : "bg-secondary/60 text-foreground ring-1 ring-inset ring-border hover:ring-[#433993]/40"}`}
              >{c}</button>
            ))}
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-[1fr_140px]">
          <LabeledInput label="Success Marker" value={d.standard_success_marker} onChange={(v) => update("standard_success_marker", v)} placeholder="What proves you did it?" />
          <LabeledInput label="Number" type="number" value={d.standard_marker_number} onChange={(v) => update("standard_marker_number", v)} />
        </div>
      </SectionBlock>
    </div>
  );
}

function D6Reflection({ d, update }: { d: SectionData; update: <K extends keyof SectionData>(k: K, v: SectionData[K]) => void }) {
  const avoidingOpts = ["A hard conversation", "A decision", "Delegating", "Setting a boundary", "Asking for help", "Firing / hiring", "Financial review", "Time with family"];
  const whyOpts = ["Fear of conflict", "Perfectionism", "Overwhelm", "Lack of clarity", "Not my strength", "Waiting for perfect timing", "People-pleasing"];
  return (
    <div className="space-y-6">
      <SectionBlock label="Evaluate">
        <LabeledTextarea label="What was your biggest win this cycle?" value={d.reflection_wins} onChange={(v) => update("reflection_wins", v)} />
        <LabeledTextarea label="What was your biggest challenge?" value={d.reflection_misses} onChange={(v) => update("reflection_misses", v)} />
      </SectionBlock>
      <SectionBlock label="Identify">
        <Chips label="What have you been avoiding?" options={avoidingOpts} values={d.reflection_avoiding} onChange={(arr) => update("reflection_avoiding", arr)} other={d.reflection_avoiding_other} onOtherChange={(v) => update("reflection_avoiding_other", v)} />
      </SectionBlock>
      <SectionBlock label="Understand">
        <Chips label="Why have you been avoiding it?" options={whyOpts} values={d.reflection_why} onChange={(arr) => update("reflection_why", arr)} other={d.reflection_why_other} onOtherChange={(v) => update("reflection_why_other", v)} />
      </SectionBlock>
      <SectionBlock label="Build a Plan">
        <LabeledTextarea label="What is the best next leadership action to take?" value={d.reflection_best_action} onChange={(v) => update("reflection_best_action", v)} />
        <LabeledTextarea label="Lock in your next focus" value={d.reflection_next_focus} onChange={(v) => update("reflection_next_focus", v)} placeholder="What deserves your leadership attention next?" />
      </SectionBlock>
      <SectionBlock label="Execute">
        <LabeledInput label="When will you do it?" value={d.reflection_when} onChange={(v) => update("reflection_when", v)} placeholder="Date / this week / etc." />
        <LabeledInput label="Who's involved?" value={d.reflection_involved} onChange={(v) => update("reflection_involved", v)} />
      </SectionBlock>
      <SectionBlock label="Measure">
        <LabeledTextarea label="How will you know you handled it well?" value={d.reflection_measure_success} onChange={(v) => update("reflection_measure_success", v)} />
        <LabeledTextarea label="What result do you expect?" value={d.reflection_expected_result} onChange={(v) => update("reflection_expected_result", v)} />
      </SectionBlock>
    </div>
  );
}

function D7Actions({ d, update }: { d: SectionData; update: <K extends keyof SectionData>(k: K, v: SectionData[K]) => void }) {
  return (
    <div className="space-y-6">
      {d.priorities.map((p, i) => (
        <div key={i} className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center gap-3">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#433993] text-xs font-semibold text-white">{i + 1}</span>
            <Input
              value={p.title}
              onChange={(e) => { const arr = [...d.priorities]; arr[i] = { ...arr[i], title: e.target.value }; update("priorities", arr); }}
              placeholder={`Priority ${i + 1}`}
              className="flex-1"
            />
          </div>
          <div className="mt-4">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Steps</Label>
            <ol className="mt-1 space-y-2">
              {p.steps.map((step, si) => (
                <li key={si} className="flex items-start gap-2">
                  <span className="mt-2 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[#433993]/10 text-[11px] font-semibold text-[#433993]">{si + 1}</span>
                  <Input
                    value={step}
                    onChange={(e) => {
                      const arr = [...d.priorities];
                      const steps = [...arr[i].steps]; steps[si] = e.target.value;
                      arr[i] = { ...arr[i], steps }; update("priorities", arr);
                    }}
                    placeholder={`Step ${si + 1}`}
                  />
                </li>
              ))}
            </ol>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_120px_160px]">
            <div>
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Success Marker</Label>
              <Input value={p.success_marker} onChange={(e) => { const arr = [...d.priorities]; arr[i] = { ...arr[i], success_marker: e.target.value }; update("priorities", arr); }} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Number</Label>
              <Input type="number" inputMode="numeric" value={p.marker_number} onChange={(e) => { const arr = [...d.priorities]; arr[i] = { ...arr[i], marker_number: e.target.value }; update("priorities", arr); }} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Target Date</Label>
              <Input type="date" value={p.target_date} onChange={(e) => { const arr = [...d.priorities]; arr[i] = { ...arr[i], target_date: e.target.value }; update("priorities", arr); }} className="mt-1" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function StepCommitment({ d, update }: { d: SectionData; update: <K extends keyof SectionData>(k: K, v: SectionData[K]) => void }) {
  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-[#433993]/30 bg-gradient-to-br from-[#f6f2ff] to-white p-6">
        <p className="text-sm leading-relaxed text-foreground">
          I commit to living this Leadership Performance Dashboard for the next cycle. I will hold my
          standards, track my Success Markers, and lead myself first so I can lead others well.
        </p>
      </div>
      <div className="flex items-start gap-3">
        <Checkbox
          id="commit-3"
          checked={d.committed}
          onCheckedChange={(v) => update("committed", Boolean(v))}
        />
        <Label htmlFor="commit-3" className="text-sm leading-relaxed text-foreground">
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

function AboutSectionButtonS3({ className }: { className?: string }) {
  return (
    <AboutSectionSheet title="Section 3: Leadership Performance Dashboard" className={className}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#433993]">Principle 1: Lead Yourself</p>
      <h4 className="font-display text-lg font-semibold text-foreground">Section Objective</h4>
      <p>Leadership growth isn't measured by good intentions.</p>
      <p>It is measured by consistent improvement.</p>
      <p>This dashboard is designed to help you evaluate your leadership honestly, identify where you're improving, recognize where you're drifting, and intentionally strengthen the areas that will produce better results.</p>
      <p>The purpose of this section is not to judge yourself.</p>
      <p>The purpose is to become more intentional about your growth before beginning the next phase of your Leadership Optimization Cycle.</p>
      <p>Every dashboard follows the same process:</p>
      <p className="font-semibold">Evaluate → Identify → Understand → Build a Plan → Execute → Measure</p>
    </AboutSectionSheet>
  );
}