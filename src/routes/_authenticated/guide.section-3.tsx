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
import { ArrowLeft, ArrowRight, Check, Minus, TrendingDown, TrendingUp } from "lucide-react";
import { toast } from "sonner";

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
      <div className="mb-6">
        <Link to="/cycle" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> My Cycle
        </Link>
      </div>
      <div className="mb-6">
        <div className="flex items-center justify-between text-xs font-medium uppercase tracking-widest text-muted-foreground">
          <span>Section 3 of {TOTAL_SECTIONS}</span>
          <span>Dashboard {step} of {TOTAL_STEPS}</span>
        </div>
        <Progress value={(step / TOTAL_STEPS) * 100} className="mt-2 h-1.5" />
        <h1 className="mt-4 font-display text-3xl font-semibold text-foreground sm:text-4xl">{stepTitle(step)}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{stepBlurb(step)}</p>
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
function stepBlurb(step: number) {
  switch (step) {
    case 1: return "Rate each of the 4 FUEL areas 1–10. Trend compares to your last review.";
    case 2: return "For each of the 5 capacities, tap Worse / Same / Better vs last cycle.";
    case 3: return "Set Current and Desired levels for up to three leadership skills.";
    case 4: return "Slide the progress percent for each of your 5 Success Drivers.";
    case 5: return "Rate 7 standards, pick one to improve, then plan and set a Success Marker.";
    case 6: return "Reflect on wins, misses, blockers, and what you're locking in next.";
    case 7: return "Three priorities. For each: steps, a Success Marker, and a target date.";
    case 8: return "Sign your commitment for this cycle.";
    default: return "";
  }
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
    <div className="space-y-4">
      {FUEL_AREAS.map((a) => {
        const current = d.fuel[a.key] ?? 5;
        const previous = prev?.fuel?.[a.key];
        const delta = typeof previous === "number" ? current - previous : null;
        return (
          <div key={a.key} className="rounded-2xl border border-border bg-card p-4">
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
  );
}

function D2Capacity({ d, update }: { d: SectionData; update: <K extends keyof SectionData>(k: K, v: SectionData[K]) => void }) {
  return (
    <div className="space-y-3">
      {CAPACITY_AREAS.map((a) => (
        <div key={a.key} className="rounded-2xl border border-border bg-card p-4">
          <div className="mb-2 text-sm font-semibold text-foreground">{a.label}</div>
          <TrendButtons value={d.capacity[a.key]} onChange={(t) => update("capacity", { ...d.capacity, [a.key]: t })} />
        </div>
      ))}
    </div>
  );
}

function D3Skills({ d, update }: { d: SectionData; update: <K extends keyof SectionData>(k: K, v: SectionData[K]) => void }) {
  return (
    <div className="space-y-4">
      {d.skills.map((s, i) => (
        <div key={i} className="rounded-2xl border border-border bg-card p-4">
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
  );
}

function D4Drivers({ d, update }: { d: SectionData; update: <K extends keyof SectionData>(k: K, v: SectionData[K]) => void }) {
  return (
    <div className="space-y-3">
      {d.drivers.map((dr, i) => (
        <div key={i} className="rounded-2xl border border-border bg-card p-4">
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
  );
}

function D5Standards({ d, update }: { d: SectionData; update: <K extends keyof SectionData>(k: K, v: SectionData[K]) => void }) {
  return (
    <div className="space-y-6">
      <div className="space-y-3">
        {d.standards_ratings.map((s, i) => (
          <div key={i} className="rounded-xl border border-border bg-card p-3">
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
      <div className="rounded-2xl border border-[#433993]/30 bg-[#433993]/5 p-4">
        <Label className="text-xs font-semibold uppercase tracking-wider text-[#433993]">Standard to Improve This Cycle</Label>
        <Input value={d.standard_focus} onChange={(e) => update("standard_focus", e.target.value)} placeholder="e.g. Follow Through" className="mt-2" />
        <Label className="mt-4 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Plan</Label>
        <Textarea value={d.standard_plan} onChange={(e) => update("standard_plan", e.target.value)} placeholder="How will you raise this standard? Concrete actions." className="mt-1 min-h-[90px]" />
        <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_140px]">
          <div>
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Success Marker</Label>
            <Input value={d.standard_success_marker} onChange={(e) => update("standard_success_marker", e.target.value)} placeholder="What proves you did it?" className="mt-1" />
          </div>
          <div>
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Number</Label>
            <Input type="number" inputMode="numeric" value={d.standard_marker_number} onChange={(e) => update("standard_marker_number", e.target.value)} className="mt-1" />
          </div>
        </div>
      </div>
    </div>
  );
}

function D6Reflection({ d, update }: { d: SectionData; update: <K extends keyof SectionData>(k: K, v: SectionData[K]) => void }) {
  const fields: { key: keyof SectionData; label: string; placeholder: string }[] = [
    { key: "reflection_wins", label: "Wins", placeholder: "What worked this cycle?" },
    { key: "reflection_misses", label: "Misses", placeholder: "Where did you fall short?" },
    { key: "reflection_blockers", label: "Blockers", placeholder: "What kept getting in the way?" },
    { key: "reflection_next_focus", label: "Next Focus", placeholder: "What deserves your leadership attention next?" },
  ];
  return (
    <div className="space-y-4">
      {fields.map((f) => (
        <div key={f.key}>
          <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{f.label}</Label>
          <Textarea
            value={d[f.key] as string}
            onChange={(e) => update(f.key, e.target.value as never)}
            placeholder={f.placeholder}
            className="mt-1 min-h-[90px]"
          />
        </div>
      ))}
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