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

export const Route = createFileRoute("/_authenticated/guide/section-4")({
  head: () => ({ meta: [{ title: "Section 4 · Lead Others" }] }),
  component: SectionFourPage,
});

const TOTAL_SECTIONS = 12;
const TOTAL_STEPS = 8;

const NEED_OPTIONS = [
  "Clarity", "Coaching", "Encouragement", "Accountability", "Training",
  "Support", "Confidence", "Recognition", "Challenge",
];

const CLARITY_CHECKS = [
  "They know what success looks like in their role.",
  "They know their top priorities right now.",
  "They know how their success is measured.",
  "They know what is expected of them.",
  "They know what support is available to them.",
];

const DISC_STYLES = ["D — Dominance", "I — Influence", "S — Steadiness", "C — Conscientiousness"];

interface GrowthRow { person: string; desired_growth: string }
interface ActionRow { person: string; priority: string; first_action: string; success_marker: string; target_date: string }

interface SectionData {
  step: number;
  // Part 1
  direct_reports: string[]; // 5
  key_relationships: string[]; // 5
  personal_leadership: string[]; // 5
  chosen_three: string[]; // 3
  choose_why: string;
  growth_rows: GrowthRow[]; // 3
  schedule_time: string;
  working_signal: string;
  // Part 2
  focus_person_name: string;
  focus_person_role: string;
  focus_person_relationship: string;
  focus_success_image: string;
  focus_success_drivers: string;
  focus_fuel_firm: string;
  focus_fuel_understand: string;
  focus_fuel_envision: string;
  focus_fuel_lead: string;
  focus_needs: string[]; // chips
  focus_needs_other: string;
  focus_needs_why: string;
  focus_needs_evidence: string;
  focus_meet_how: string;
  focus_conversation: string;
  focus_conversation_date: string;
  focus_expected_change: string;
  // Part 3
  focus_disc: string;
  comm_best: string;
  comm_feedback: string;
  comm_pressure: string;
  comm_engaged: string;
  comm_withdraw: string;
  comm_adjustments: string[]; // 3
  comm_practice: string;
  comm_signal: string;
  // Part 4
  clarity_checks: Array<"" | "yes" | "no">;
  clarity_weakest: string;
  clarity_effect: string;
  clarity_expectations: string[]; // 5
  clarity_when: string;
  clarity_signal: string;
  // Part 5
  dev_skill: string;
  dev_benefits: string[]; // 3
  dev_characteristics: string[]; // 5
  dev_experiences: string[]; // 5
  dev_first: string;
  dev_signal: string;
  // Part 6
  self_hardest: string;
  self_pulling: string;
  self_impact: string;
  self_recommit: string;
  self_action_week: string;
  self_protect: string;
  // Part 7
  action_rows: ActionRow[]; // 3
  // Commitment
  committed: boolean;
  commitment_date: string;
}

const emptyRow = (): GrowthRow => ({ person: "", desired_growth: "" });
const emptyAction = (): ActionRow => ({ person: "", priority: "", first_action: "", success_marker: "", target_date: "" });

const EMPTY: SectionData = {
  step: 1,
  direct_reports: ["", "", "", "", ""],
  key_relationships: ["", "", "", "", ""],
  personal_leadership: ["", "", "", "", ""],
  chosen_three: ["", "", ""],
  choose_why: "",
  growth_rows: [emptyRow(), emptyRow(), emptyRow()],
  schedule_time: "",
  working_signal: "",
  focus_person_name: "",
  focus_person_role: "",
  focus_person_relationship: "",
  focus_success_image: "",
  focus_success_drivers: "",
  focus_fuel_firm: "",
  focus_fuel_understand: "",
  focus_fuel_envision: "",
  focus_fuel_lead: "",
  focus_needs: [],
  focus_needs_other: "",
  focus_needs_why: "",
  focus_needs_evidence: "",
  focus_meet_how: "",
  focus_conversation: "",
  focus_conversation_date: "",
  focus_expected_change: "",
  focus_disc: "",
  comm_best: "",
  comm_feedback: "",
  comm_pressure: "",
  comm_engaged: "",
  comm_withdraw: "",
  comm_adjustments: ["", "", ""],
  comm_practice: "",
  comm_signal: "",
  clarity_checks: ["", "", "", "", ""],
  clarity_weakest: "",
  clarity_effect: "",
  clarity_expectations: ["", "", "", "", ""],
  clarity_when: "",
  clarity_signal: "",
  dev_skill: "",
  dev_benefits: ["", "", ""],
  dev_characteristics: ["", "", "", "", ""],
  dev_experiences: ["", "", "", "", ""],
  dev_first: "",
  dev_signal: "",
  self_hardest: "",
  self_pulling: "",
  self_impact: "",
  self_recommit: "",
  self_action_week: "",
  self_protect: "",
  action_rows: [emptyAction(), emptyAction(), emptyAction()],
  committed: false,
  commitment_date: "",
};

function SectionFourPage() {
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
        .eq("section_number", 4)
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
    return (
      d.chosen_three.some((p) => p.trim().length > 0) &&
      d.focus_person_name.trim().length > 0 &&
      d.focus_needs.length + (d.focus_needs_other.trim().length > 0 ? 1 : 0) > 0 &&
      d.focus_disc.length > 0 &&
      d.comm_practice.trim().length > 0 &&
      d.clarity_weakest.trim().length > 0 &&
      d.dev_skill.trim().length > 0 &&
      d.self_action_week.trim().length > 0 &&
      d.action_rows.some((r) => r.person.trim().length > 0 && r.success_marker.trim().length > 0 && r.target_date.length > 0) &&
      d.committed && d.commitment_date.length > 0
    );
  }, [d]);

  useEffect(() => {
    if (!user || !loaded.current) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      await supabase.from("optimizer_section_progress").upsert(
        [{ user_id: user.id, section_number: 4, data: d as unknown as never, completed: isComplete }],
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
      section: 4,
      action_success_markers: d.action_rows
        .filter((r) => r.success_marker.trim().length > 0)
        .map((r) => ({ person: r.person, priority: r.priority, marker: r.success_marker, target_date: r.target_date })),
      commitment_date: d.commitment_date,
    };
    const { error } = await supabase.from("leadership_dashboard_snapshots").insert([
      { user_id: user.id, data: snapshot as unknown as never },
    ]);
    if (error) {
      toast.error("Couldn't save your snapshot. Please try again.");
      return;
    }
    toast.success("Section 4 complete.");
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

      <SectionVideo sectionNumber={4} sectionTitle="Lead Others" />

      <div className="mb-6">
        <div className="flex items-center justify-between text-xs font-medium uppercase tracking-widest text-muted-foreground">
          <span>Section 4 of {TOTAL_SECTIONS}</span>
          <span>Part {step} of {TOTAL_STEPS}</span>
        </div>
        <Progress value={(step / TOTAL_STEPS) * 100} className="mt-2 h-1.5" />
        <h1 className="mt-4 font-display text-3xl font-semibold text-foreground sm:text-4xl">{stepTitle(step)}</h1>
      </div>

      <div className="space-y-8">
        {step === 1 && <Part1 d={d} update={update} />}
        {step === 2 && <Part2 d={d} update={update} />}
        {step === 3 && <Part3 d={d} update={update} />}
        {step === 4 && <Part4 d={d} update={update} />}
        {step === 5 && <Part5 d={d} update={update} />}
        {step === 6 && <Part6 d={d} update={update} />}
        {step === 7 && <Part7 d={d} update={update} />}
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
            Finish Section 4 <Check className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>
    </main>
  );
}

function stepTitle(step: number) {
  switch (step) {
    case 1: return "Part 1 — Leadership Responsibility Map";
    case 2: return "Part 2 — Listen Before You Lead";
    case 3: return "Part 3 — Communicate in a Way They Can Hear";
    case 4: return "Part 4 — Create Clarity";
    case 5: return "Part 5 — Build a Development Plan";
    case 6: return "Part 6 — Continue to Lead Yourself";
    case 7: return "Part 7 — Lead Others Action Plan";
    case 8: return "Leadership Commitment";
    default: return "";
  }
}

function stepIsValid(step: number, d: SectionData): boolean {
  switch (step) {
    case 1:
      return d.chosen_three.some((p) => p.trim().length > 0) && d.growth_rows.some((r) => r.person.trim().length > 0);
    case 2:
      return d.focus_person_name.trim().length > 0 && (d.focus_needs.length > 0 || d.focus_needs_other.trim().length > 0);
    case 3:
      return d.focus_disc.length > 0 && d.comm_practice.trim().length > 0;
    case 4:
      return d.clarity_weakest.trim().length > 0 && d.clarity_expectations.some((e) => e.trim().length > 0);
    case 5:
      return d.dev_skill.trim().length > 0 && d.dev_first.trim().length > 0;
    case 6:
      return d.self_action_week.trim().length > 0;
    case 7:
      return d.action_rows.some((r) => r.person.trim().length > 0 && r.success_marker.trim().length > 0 && r.target_date.length > 0);
    case 8:
      return d.committed && d.commitment_date.length > 0;
    default:
      return true;
  }
}

type UpdateFn = <K extends keyof SectionData>(k: K, v: SectionData[K]) => void;

function Part1({ d, update }: { d: SectionData; update: UpdateFn }) {
  return (
    <div className="space-y-6">
      <SectionBlock label="People you lead">
        <NumberedList label="Direct Reports" items={d.direct_reports} onChange={(v) => update("direct_reports", v)} placeholder="Name" />
        <NumberedList label="Key Business Relationships" items={d.key_relationships} onChange={(v) => update("key_relationships", v)} placeholder="Name" />
        <NumberedList label="Personal Leadership (family, close relationships)" items={d.personal_leadership} onChange={(v) => update("personal_leadership", v)} placeholder="Name" />
      </SectionBlock>

      <SectionBlock label="Choose three">
        <NumberedList label="The 3 people who most need your leadership right now" items={d.chosen_three} onChange={(v) => update("chosen_three", v)} placeholder="Name" />
        <LabeledTextarea label="Why these three?" value={d.choose_why} onChange={(v) => update("choose_why", v)} />
      </SectionBlock>

      <SectionBlock label="Person → Desired Growth">
        <div className="space-y-3">
          {d.growth_rows.map((r, i) => (
            <div key={i} className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <Input value={r.person} onChange={(e) => {
                const arr = [...d.growth_rows]; arr[i] = { ...r, person: e.target.value }; update("growth_rows", arr);
              }} placeholder={`Person ${i + 1}`} />
              <Input value={r.desired_growth} onChange={(e) => {
                const arr = [...d.growth_rows]; arr[i] = { ...r, desired_growth: e.target.value }; update("growth_rows", arr);
              }} placeholder="Desired growth" />
            </div>
          ))}
        </div>
      </SectionBlock>

      <SectionBlock label="Execute">
        <LabeledInput label="Time you'll schedule for these three this week" value={d.schedule_time} onChange={(v) => update("schedule_time", v)} placeholder="e.g. Tues 3–4pm, Thurs 8–9am" />
        <LabeledTextarea label="How you'll know it's working" value={d.working_signal} onChange={(v) => update("working_signal", v)} />
      </SectionBlock>
    </div>
  );
}

function Part2({ d, update }: { d: SectionData; update: UpdateFn }) {
  return (
    <div className="space-y-6">
      <SectionBlock label="Choose one person to focus on">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <LabeledInput label="Name" value={d.focus_person_name} onChange={(v) => update("focus_person_name", v)} />
          <LabeledInput label="Role" value={d.focus_person_role} onChange={(v) => update("focus_person_role", v)} />
          <LabeledInput label="Relationship" value={d.focus_person_relationship} onChange={(v) => update("focus_person_relationship", v)} />
        </div>
      </SectionBlock>

      <SectionBlock label="See their world">
        <LabeledTextarea label="Their Success Image — what winning looks like for them" value={d.focus_success_image} onChange={(v) => update("focus_success_image", v)} />
        <LabeledTextarea label="Their Success Drivers — what motivates and moves them" value={d.focus_success_drivers} onChange={(v) => update("focus_success_drivers", v)} />
      </SectionBlock>

      <SectionBlock label="Their FUEL">
        <LabeledTextarea label="F — Firm Up Character: how do they show discipline, honesty, courage?" value={d.focus_fuel_firm} onChange={(v) => update("focus_fuel_firm", v)} />
        <LabeledTextarea label="U — Understand Emotions: how do they handle pressure and reactivity?" value={d.focus_fuel_understand} onChange={(v) => update("focus_fuel_understand", v)} />
        <LabeledTextarea label="E — Envision Success: how clear is their picture of what they're building?" value={d.focus_fuel_envision} onChange={(v) => update("focus_fuel_envision", v)} />
        <LabeledTextarea label="L — Lead Themselves Daily: how consistent are their daily leadership rhythms?" value={d.focus_fuel_lead} onChange={(v) => update("focus_fuel_lead", v)} />
      </SectionBlock>

      <SectionBlock label="What they need most from you">
        <Chips
          label="Select all that apply"
          options={NEED_OPTIONS}
          values={d.focus_needs}
          onChange={(v) => update("focus_needs", v)}
          other={d.focus_needs_other}
          onOtherChange={(v) => update("focus_needs_other", v)}
        />
        <LabeledTextarea label="Why?" value={d.focus_needs_why} onChange={(v) => update("focus_needs_why", v)} />
        <LabeledTextarea label="Evidence — what have you seen?" value={d.focus_needs_evidence} onChange={(v) => update("focus_needs_evidence", v)} />
      </SectionBlock>

      <SectionBlock label="Meet them where they are">
        <LabeledTextarea label="How you'll meet them" value={d.focus_meet_how} onChange={(v) => update("focus_meet_how", v)} />
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <LabeledInput label="One conversation to schedule" value={d.focus_conversation} onChange={(v) => update("focus_conversation", v)} placeholder="Topic / setting" />
          <LabeledInput label="Date" type="date" value={d.focus_conversation_date} onChange={(v) => update("focus_conversation_date", v)} />
        </div>
        <LabeledTextarea label="Expected change" value={d.focus_expected_change} onChange={(v) => update("focus_expected_change", v)} />
      </SectionBlock>
    </div>
  );
}

function Part3({ d, update }: { d: SectionData; update: UpdateFn }) {
  return (
    <div className="space-y-6">
      <SectionBlock label="Their DISC style">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {DISC_STYLES.map((s) => {
            const active = d.focus_disc === s;
            return (
              <button
                key={s}
                type="button"
                onClick={() => update("focus_disc", active ? "" : s)}
                className={`rounded-xl px-3 py-2 text-sm font-medium transition ${active ? "bg-[#433993] text-white" : "bg-secondary/60 text-foreground ring-1 ring-inset ring-border hover:ring-[#433993]/40"}`}
              >
                {s}
              </button>
            );
          })}
        </div>
      </SectionBlock>

      <SectionBlock label="How they communicate">
        <LabeledTextarea label="How they communicate best" value={d.comm_best} onChange={(v) => update("comm_best", v)} />
        <LabeledTextarea label="How they best receive feedback" value={d.comm_feedback} onChange={(v) => update("comm_feedback", v)} />
        <LabeledTextarea label="How they respond under pressure" value={d.comm_pressure} onChange={(v) => update("comm_pressure", v)} />
        <LabeledTextarea label="How they show up when engaged" value={d.comm_engaged} onChange={(v) => update("comm_engaged", v)} />
        <LabeledTextarea label="How they behave when they withdraw" value={d.comm_withdraw} onChange={(v) => update("comm_withdraw", v)} />
      </SectionBlock>

      <SectionBlock label="Adjust your communication">
        <NumberedList label="3 communication adjustments you will make" items={d.comm_adjustments} onChange={(v) => update("comm_adjustments", v)} />
        <LabeledInput label="The one you'll practice first" value={d.comm_practice} onChange={(v) => update("comm_practice", v)} />
        <LabeledTextarea label="How you'll know it worked" value={d.comm_signal} onChange={(v) => update("comm_signal", v)} />
      </SectionBlock>
    </div>
  );
}

function Part4({ d, update }: { d: SectionData; update: UpdateFn }) {
  return (
    <div className="space-y-6">
      <SectionBlock label="Clarity check" hint="Answer Yes or No for the person you're focused on.">
        <div className="space-y-2">
          {CLARITY_CHECKS.map((q, i) => (
            <div key={i} className="flex items-start justify-between gap-3 rounded-lg border border-border bg-background/60 p-3">
              <p className="text-sm text-foreground">{q}</p>
              <div className="flex shrink-0 gap-1">
                {(["yes", "no"] as const).map((v) => {
                  const active = d.clarity_checks[i] === v;
                  return (
                    <button
                      key={v}
                      type="button"
                      onClick={() => {
                        const arr = [...d.clarity_checks];
                        arr[i] = active ? "" : v;
                        update("clarity_checks", arr);
                      }}
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
      </SectionBlock>

      <SectionBlock label="Where clarity is weakest">
        <LabeledTextarea label="Where is clarity weakest?" value={d.clarity_weakest} onChange={(v) => update("clarity_weakest", v)} />
        <LabeledTextarea label="The effect that lack of clarity is having" value={d.clarity_effect} onChange={(v) => update("clarity_effect", v)} />
      </SectionBlock>

      <SectionBlock label="Make it clear">
        <NumberedList label="5 expectations to make clear" items={d.clarity_expectations} onChange={(v) => update("clarity_expectations", v)} />
        <LabeledInput label="When you'll have the clarity conversation" type="date" value={d.clarity_when} onChange={(v) => update("clarity_when", v)} />
        <LabeledTextarea label="How you'll know clarity improved" value={d.clarity_signal} onChange={(v) => update("clarity_signal", v)} />
      </SectionBlock>
    </div>
  );
}

function Part5({ d, update }: { d: SectionData; update: UpdateFn }) {
  return (
    <div className="space-y-6">
      <SectionBlock label="Development focus">
        <LabeledInput label="Which skill will you help them develop?" value={d.dev_skill} onChange={(v) => update("dev_skill", v)} />
        <NumberedList label="3 benefits this will create for them" items={d.dev_benefits} onChange={(v) => update("dev_benefits", v)} />
        <NumberedList label="5 characteristics of people strong in this skill" items={d.dev_characteristics} onChange={(v) => update("dev_characteristics", v)} />
        <NumberedList label="5 growth experiences to build the skill" items={d.dev_experiences} onChange={(v) => update("dev_experiences", v)} />
        <LabeledInput label="What begins first" value={d.dev_first} onChange={(v) => update("dev_first", v)} />
        <LabeledTextarea label="How you'll know they're growing" value={d.dev_signal} onChange={(v) => update("dev_signal", v)} />
      </SectionBlock>
    </div>
  );
}

function Part6({ d, update }: { d: SectionData; update: UpdateFn }) {
  return (
    <div className="space-y-6">
      <SectionBlock label="Continue to lead yourself">
        <LabeledTextarea label="Which of your own areas is hardest to maintain right now?" value={d.self_hardest} onChange={(v) => update("self_hardest", v)} />
        <LabeledTextarea label="What's pulling you away from it?" value={d.self_pulling} onChange={(v) => update("self_pulling", v)} />
        <LabeledTextarea label="The impact this is having" value={d.self_impact} onChange={(v) => update("self_impact", v)} />
        <LabeledTextarea label="What you're recommitting to" value={d.self_recommit} onChange={(v) => update("self_recommit", v)} />
        <LabeledInput label="One action you'll take this week" value={d.self_action_week} onChange={(v) => update("self_action_week", v)} />
        <LabeledTextarea label="How you'll protect your capacity" value={d.self_protect} onChange={(v) => update("self_protect", v)} />
      </SectionBlock>
    </div>
  );
}

function Part7({ d, update }: { d: SectionData; update: UpdateFn }) {
  return (
    <div className="space-y-6">
      <SectionBlock label="Lead Others Action Plan" hint="One row per person you're leading forward.">
        <div className="space-y-4">
          {d.action_rows.map((r, i) => (
            <div key={i} className="rounded-xl border border-border bg-background/40 p-3">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-[#433993]">Row {i + 1}</p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <LabeledInput label="Person" value={r.person} onChange={(v) => {
                  const arr = [...d.action_rows]; arr[i] = { ...r, person: v }; update("action_rows", arr);
                }} />
                <LabeledInput label="Leadership Priority" value={r.priority} onChange={(v) => {
                  const arr = [...d.action_rows]; arr[i] = { ...r, priority: v }; update("action_rows", arr);
                }} />
                <LabeledInput label="First Action" value={r.first_action} onChange={(v) => {
                  const arr = [...d.action_rows]; arr[i] = { ...r, first_action: v }; update("action_rows", arr);
                }} />
                <LabeledInput label="Success Marker" value={r.success_marker} onChange={(v) => {
                  const arr = [...d.action_rows]; arr[i] = { ...r, success_marker: v }; update("action_rows", arr);
                }} />
                <LabeledInput label="Target Date" type="date" value={r.target_date} onChange={(v) => {
                  const arr = [...d.action_rows]; arr[i] = { ...r, target_date: v }; update("action_rows", arr);
                }} />
              </div>
            </div>
          ))}
        </div>
      </SectionBlock>
    </div>
  );
}

function StepCommitment({ d, update }: { d: SectionData; update: UpdateFn }) {
  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-[#433993]/30 bg-gradient-to-br from-[#f6f2ff] to-white p-6">
        <p className="text-sm leading-relaxed text-foreground">
          I commit to leading the people entrusted to me — listening first, communicating so they
          can hear me, creating clarity, and building them up while continuing to lead myself.
        </p>
      </div>
      <div className="flex items-start gap-3">
        <Checkbox id="commit-4" checked={d.committed} onCheckedChange={(v) => update("committed", Boolean(v))} />
        <Label htmlFor="commit-4" className="text-sm leading-relaxed text-foreground">
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

// ---------- Shared inputs (mirrors Section 3 look) ----------

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