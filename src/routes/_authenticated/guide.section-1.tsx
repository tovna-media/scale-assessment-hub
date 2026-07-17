import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, ArrowRight, ExternalLink, Check } from "lucide-react";
import { ASSESSMENT_LIST, type AssessmentType } from "@/lib/assessments";
import { toast } from "sonner";
import { verifyDiscCode } from "@/lib/disc-verify.functions";
import { SectionVideo } from "@/components/scale/SectionVideo";
import { GapReportPanel } from "@/components/scale/GapReportPanel";

export const Route = createFileRoute("/_authenticated/guide/section-1")({
  head: () => ({
    meta: [{ title: "Section 1 · Begin Your Leadership Optimization Cycle" }],
  }),
  component: SectionOnePage,
});

const DISC_URL = "https://richlohman.com/disc-assessment-checkout";
const TOTAL_SECTIONS = 12;

const REFLECTIONS = [
  "What would success look like at the end of this Leadership Optimization Cycle?",
  "Which leadership gap, if closed, would create the greatest impact in your life or work?",
  "What habits or behaviors must change for you to become the leader your goals require?",
  "What specific results are you committed to producing during this cycle?",
  "What does becoming Fully Resourced mean to you personally?",
];

interface SectionData {
  disc_completed?: boolean;
  reflections?: string[];
  disc_key_code?: string;
}

interface GapOption {
  label: string;
  score: number;
  source: string;
}

function SectionOnePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [part, setPart] = useState<1 | 2>(1);
  const [loading, setLoading] = useState(true);
  const [rowId, setRowId] = useState<string | null>(null);
  const [discCompleted, setDiscCompleted] = useState(false);
  const [discCode, setDiscCode] = useState("");
  const [discCodeInput, setDiscCodeInput] = useState("");
  const [discError, setDiscError] = useState<string | null>(null);
  const [discVerifying, setDiscVerifying] = useState(false);
  const [priorityGap, setPriorityGap] = useState<string>("");
  const [priorityGapScore, setPriorityGapScore] = useState<number | null>(null);
  const [reflections, setReflections] = useState<string[]>(["", "", "", "", ""]);
  const [gapOptions, setGapOptions] = useState<GapOption[]>([]);
  const [assessmentsDone, setAssessmentsDone] = useState<Record<AssessmentType, boolean>>({
    inner_capacity: false,
    personal_leadership: false,
    business_audit: false,
  });

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialLoaded = useRef(false);

  // Load progress + eligibility data
  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ data: row }, { data: sessions }, { data: report }] = await Promise.all([
        supabase
          .from("optimizer_section_progress")
          .select("*")
          .eq("user_id", user.id)
          .eq("section_number", 1)
          .maybeSingle(),
        supabase
          .from("assessment_sessions")
          .select("assessment_type, subcategory_scores, created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("gap_reports")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle(),
      ]);

      // Build gap options from latest subcategory scores across the 3 assessments
      const seen = new Set<AssessmentType>();
      const options: GapOption[] = [];
      const done: Record<AssessmentType, boolean> = {
        inner_capacity: false,
        personal_leadership: false,
        business_audit: false,
      };
      for (const s of sessions ?? []) {
        const type = s.assessment_type as AssessmentType;
        done[type] = true;
        if (seen.has(type)) continue;
        seen.add(type);
        const scores = (s.subcategory_scores ?? {}) as Record<string, number>;
        const label =
          type === "inner_capacity"
            ? "Inner Capacity"
            : type === "personal_leadership"
              ? "Personal Leadership"
              : "Business Audit";
        for (const [name, score] of Object.entries(scores)) {
          options.push({ label: name, score: Number(score), source: label });
        }
      }
      // Sort lowest score first (biggest gap)
      options.sort((a, b) => a.score - b.score);
      setGapOptions(options);
      setAssessmentsDone(done);
      void report;

      if (row) {
        setRowId(row.id);
        const d = (row.data ?? {}) as SectionData;
        setDiscCompleted(Boolean(d.disc_completed));
        setDiscCode(d.disc_key_code ?? "");
        setPriorityGap(row.priority_gap ?? "");
        setPriorityGapScore(row.priority_gap_score ?? null);
        const r = Array.isArray(d.reflections) ? d.reflections : [];
        setReflections([0, 1, 2, 3, 4].map((i) => r[i] ?? ""));
      }
      initialLoaded.current = true;
      setLoading(false);
    })();
  }, [user]);

  const assessmentsAllDone =
    assessmentsDone.inner_capacity && assessmentsDone.personal_leadership && assessmentsDone.business_audit;

  const checklistComplete = assessmentsAllDone && discCompleted;
  const priorityGapSet = priorityGap.trim().length > 0;
  const reflectionsDone = reflections.every((r) => r.trim().length > 0);
  const sectionComplete = checklistComplete && priorityGapSet && reflectionsDone;

  // Autosave (debounced)
  useEffect(() => {
    if (!user || !initialLoaded.current) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      const payload = {
        user_id: user.id,
        section_number: 1,
        data: {
          disc_completed: discCompleted,
          disc_key_code: discCode || undefined,
          reflections,
        } as never,
        priority_gap: priorityGap || null,
        priority_gap_score: priorityGapScore,
        completed: sectionComplete,
      };
      const { data, error } = await supabase
        .from("optimizer_section_progress")
        .upsert([payload], { onConflict: "user_id,section_number" })
        .select("id")
        .maybeSingle();
      if (error) {
        console.error(error);
        return;
      }
      if (data?.id) setRowId(data.id);
    }, 500);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [
    user,
    discCompleted,
    discCode,
    reflections,
    priorityGap,
    priorityGapScore,
    sectionComplete,
  ]);

  function selectGap(opt: GapOption) {
    setPriorityGap(opt.label);
    setPriorityGapScore(opt.score);
  }

  async function submitDiscCode() {
    const code = discCodeInput.trim();
    if (!code) return;
    setDiscVerifying(true);
    setDiscError(null);
    try {
      const res = await verifyDiscCode({ data: { code } });
      if (res.valid) {
        setDiscCompleted(true);
        setDiscCode(code);
        setDiscCodeInput("");
        setDiscError(null);
        toast.success("DISC code verified.");
      } else {
        setDiscError("That code is invalid");
      }
    } catch (e) {
      console.error(e);
      setDiscError("That code is invalid");
    } finally {
      setDiscVerifying(false);
    }
  }

  function updateReflection(i: number, value: string) {
    setReflections((prev) => {
      const next = prev.slice();
      next[i] = value;
      return next;
    });
  }

  const progressPct = part === 1 ? 50 : 100;

  if (loading) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-4 pb-24 pt-8 sm:px-6">
      <div className="mb-6">
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back to dashboard
        </Link>
      </div>

      <SectionVideo sectionNumber={1} sectionTitle="Begin Your Leadership Optimization Cycle" />

      <div className="mb-6">
        <div className="flex items-center justify-between text-xs font-medium uppercase tracking-widest text-muted-foreground">
          <span>Section 1 of {TOTAL_SECTIONS}</span>
          <span>Part {part} of 2</span>
        </div>
        <Progress value={progressPct} className="mt-2 h-1.5" />
        <GapReportPanel className="mt-4" />
        <h1 className="mt-4 font-display text-3xl font-semibold text-foreground sm:text-4xl">
          Begin Your Leadership Optimization Cycle
        </h1>
      </div>

      {part === 1 ? (
        <PartOne
          assessmentsDone={assessmentsDone}
          assessmentsAllDone={assessmentsAllDone}
          discCompleted={discCompleted}
          discCode={discCode}
          discCodeInput={discCodeInput}
          setDiscCodeInput={setDiscCodeInput}
          discError={discError}
          discVerifying={discVerifying}
          onSubmitDiscCode={submitDiscCode}
          gapOptions={gapOptions}
          priorityGap={priorityGap}
          priorityGapScore={priorityGapScore}
          onSelectGap={selectGap}
          canContinue={checklistComplete && priorityGapSet}
          onContinue={() => setPart(2)}
        />
      ) : (
        <PartTwo
          reflections={reflections}
          onChange={updateReflection}
          onBack={() => setPart(1)}
          onFinish={() => {
            if (!reflectionsDone) {
              toast.error("Please answer all five reflection questions.");
              return;
            }
            toast.success("Section 1 complete.");
            navigate({ to: "/dashboard" });
          }}
          canFinish={reflectionsDone}
        />
      )}
    </main>
  );
}

function PartOne(props: {
  assessmentsDone: Record<AssessmentType, boolean>;
  assessmentsAllDone: boolean;
  discCompleted: boolean;
  discCode: string;
  discCodeInput: string;
  setDiscCodeInput: (v: string) => void;
  discError: string | null;
  discVerifying: boolean;
  onSubmitDiscCode: () => void;
  gapOptions: GapOption[];
  priorityGap: string;
  priorityGapScore: number | null;
  onSelectGap: (o: GapOption) => void;
  canContinue: boolean;
  onContinue: () => void;
}) {
  const {
    assessmentsDone,
    assessmentsAllDone,
    discCompleted,
    discCode,
    discCodeInput,
    setDiscCodeInput,
    discError,
    discVerifying,
    onSubmitDiscCode,
    gapOptions,
    priorityGap,
    priorityGapScore,
    onSelectGap,
    canContinue,
    onContinue,
  } = props;

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-border bg-muted/30 p-5 text-sm leading-relaxed text-muted-foreground">
        <p className="mb-2 font-medium text-foreground">Welcome.</p>
        <p>
          You've already taken an important first step by identifying where you are today through your GAP Report.
          This guide gives you the process — twelve sections that form one complete Leadership Optimization Cycle,
          worked over 12 or 24 weeks.
        </p>
        <p className="mt-3">
          Complete the checklist below before starting your first cycle, then set the single highest-priority gap
          you want to work on this round.
        </p>
      </section>

      <section>
        <h2 className="font-display text-lg font-semibold text-foreground">Before you begin</h2>
        <ul className="mt-4 space-y-3">
          <ChecklistRow
            checked={assessmentsAllDone}
            disabled
            label="Complete all three SCALE Assessments"
            sub={
              <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                {ASSESSMENT_LIST.map((a) => (
                  <span key={a.type} className="inline-flex items-center gap-1">
                    {assessmentsDone[a.type] ? (
                      <Check className="h-3.5 w-3.5 text-emerald-600" />
                    ) : (
                      <span className="inline-block h-3.5 w-3.5 rounded-full border border-border" />
                    )}
                    {a.shortTitle}
                  </span>
                ))}
              </div>
            }
          />
          <ChecklistRow
            checked={discCompleted}
            disabled
            label="Complete your DISC Assessment"
            sub={
              discCompleted ? (
                <p className="mt-1 text-xs text-emerald-700">
                  Verified{discCode ? ` · code ${discCode}` : ""}
                </p>
              ) : (
                <div className="mt-2 space-y-2">
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <input
                      type="text"
                      value={discCodeInput}
                      onChange={(e) => setDiscCodeInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          onSubmitDiscCode();
                        }
                      }}
                      placeholder="Enter DISC key code"
                      className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:border-[#433993] focus:outline-none"
                      autoComplete="off"
                      spellCheck={false}
                    />
                    <Button
                      type="button"
                      size="sm"
                      onClick={onSubmitDiscCode}
                      disabled={discVerifying || !discCodeInput.trim()}
                      className="bg-[#433993] text-white hover:bg-[#433993]/90"
                    >
                      {discVerifying ? "Verifying…" : "Verify"}
                    </Button>
                  </div>
                  {discError ? (
                    <p className="text-xs font-medium text-red-600">{discError}</p>
                  ) : null}
                  <div>
                    <Button asChild size="sm" variant="outline">
                      <a href={DISC_URL} target="_blank" rel="noopener noreferrer">
                        Get your DISC assessment
                        <ExternalLink className="ml-2 h-3.5 w-3.5" />
                      </a>
                    </Button>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Already have a code? Enter it above to verify.
                    </p>
                  </div>
                </div>
              )
            }
          />
        </ul>
      </section>

      <section>
        <h2 className="font-display text-lg font-semibold text-foreground">
          Set your Priority Gap
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          The single highest-priority gap from your GAP Report — the one you'll focus on this cycle. Tap a chip to select.
        </p>

        {gapOptions.length > 0 ? (
          <div className="mt-4 flex flex-wrap gap-2.5">
            {gapOptions.map((opt) => {
              const selected = priorityGap === opt.label;
              return (
                <button
                  key={`${opt.source}-${opt.label}`}
                  type="button"
                  onClick={() => onSelectGap(opt)}
                  aria-pressed={selected}
                  className={`group inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium tracking-tight transition-all active:scale-[0.97] ${
                    selected
                      ? "bg-[#433993] text-white shadow-[0_6px_20px_-8px_rgba(67,57,147,0.6)] ring-2 ring-[#433993]/40"
                      : "bg-secondary/60 text-foreground ring-1 ring-inset ring-border hover:bg-secondary hover:ring-[#433993]/40"
                  }`}
                >
                  {selected ? <Check className="h-3.5 w-3.5" /> : null}
                  <span>{opt.label}</span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] font-mono tabular-nums ${
                      selected ? "bg-white/15 text-white" : "bg-background text-muted-foreground"
                    }`}
                  >
                    {opt.score}
                  </span>
                </button>
              );
            })}
          </div>
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">
            No assessment data yet — complete your assessments to see suggestions.
          </p>
        )}

        <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_140px]">
          <div>
            <Label className="text-xs uppercase tracking-widest text-muted-foreground">
              Selected priority gap
            </Label>
            <div
              aria-readonly
              className="mt-1 min-h-[40px] w-full rounded-md border border-dashed border-border bg-muted/40 px-3 py-2 text-sm text-foreground"
            >
              {priorityGap || <span className="text-muted-foreground">Tap a chip above</span>}
            </div>
          </div>
          <div>
            <Label className="text-xs uppercase tracking-widest text-muted-foreground">
              Baseline score
            </Label>
            <div
              aria-readonly
              className="mt-1 min-h-[40px] w-full rounded-md border border-dashed border-border bg-muted/40 px-3 py-2 text-sm font-mono tabular-nums text-foreground"
            >
              {priorityGapScore ?? <span className="text-muted-foreground">—</span>}
            </div>
          </div>
        </div>
      </section>

      <div className="flex items-center justify-between pt-2">
        <span className="text-xs text-muted-foreground">Saved automatically.</span>
        <Button
          onClick={onContinue}
          disabled={!canContinue}
          className="bg-[#433993] text-white hover:bg-[#433993]/90"
          size="lg"
        >
          Continue <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function ChecklistRow(props: {
  checked: boolean;
  onCheckedChange?: (v: boolean) => void;
  disabled?: boolean;
  label: string;
  sub?: React.ReactNode;
}) {
  return (
    <li className="flex items-start gap-3 rounded-xl border border-border bg-card p-4">
      <Checkbox
        checked={props.checked}
        onCheckedChange={(v) => props.onCheckedChange?.(Boolean(v))}
        disabled={props.disabled}
        className="mt-0.5 h-5 w-5"
      />
      <div className="flex-1">
        <p className="text-sm font-medium text-foreground">{props.label}</p>
        {props.sub}
      </div>
    </li>
  );
}

function PartTwo(props: {
  reflections: string[];
  onChange: (i: number, value: string) => void;
  onBack: () => void;
  onFinish: () => void;
  canFinish: boolean;
}) {
  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-border bg-muted/30 p-5 text-sm leading-relaxed text-muted-foreground">
        <p className="font-medium text-foreground">Reflection Questions</p>
        <p className="mt-1">
          Throughout this Guide, you'll return to key indicators to evaluate progress, identify leadership gaps,
          and strengthen your leadership system. Start by answering these five questions.
        </p>
      </section>

      <ol className="space-y-6">
        {REFLECTIONS.map((q, i) => (
          <li key={i}>
            <Label htmlFor={`reflect-${i}`} className="text-sm font-medium text-foreground">
              {i + 1}. {q}
            </Label>
            <Textarea
              id={`reflect-${i}`}
              value={props.reflections[i]}
              onChange={(e) => props.onChange(i, e.target.value)}
              placeholder="Your answer…"
              className="mt-2 min-h-[110px] resize-y"
            />
          </li>
        ))}
      </ol>

      <div className="flex items-center justify-between pt-2">
        <Button variant="ghost" onClick={props.onBack}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground">Saved automatically.</span>
          <Button
            onClick={props.onFinish}
            disabled={!props.canFinish}
            className="bg-[#433993] text-white hover:bg-[#433993]/90"
            size="lg"
          >
            Finish Section 1 <Check className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}