import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ASSESSMENTS, calculateScores, type AssessmentType } from "@/lib/assessments";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/assessment/$type")({
  head: () => ({ meta: [{ title: "Take assessment — SCALE" }] }),
  component: AssessmentPage,
});

const SCALE_LABELS = ["Almost Never", "Rarely", "Sometimes", "Often", "Almost Always"];

function AssessmentPage() {
  const { type } = Route.useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const def = ASSESSMENTS[type as AssessmentType];

  if (!def) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-10">
        <p className="text-muted-foreground">Unknown assessment type.</p>
      </main>
    );
  }

  const [step, setStep] = useState(0);
  const [responses, setResponses] = useState<Record<number, number>>({});
  const [submitting, setSubmitting] = useState(false);

  const totalSteps = def.subcategories.length;
  const currentSub = def.subcategories[step];
  const progress = useMemo(() => {
    const answered = Object.keys(responses).length;
    return Math.round((answered / def.questions.length) * 100);
  }, [responses, def.questions.length]);

  const allAnsweredInStep = currentSub.questionIndices.every((i) => responses[i] !== undefined);
  const allAnswered = def.questions.every((_, i) => responses[i] !== undefined);
  const isLastStep = step === totalSteps - 1;

  function setAnswer(qIdx: number, value: number) {
    setResponses((r) => ({ ...r, [qIdx]: value }));
  }

  async function handleGenerate() {
    if (!user) return;
    if (!allAnswered) {
      toast.error("Please answer every question first.");
      return;
    }
    setSubmitting(true);
    const { subcategoryScores, overall } = calculateScores(def.type, responses);
    const { data, error } = await supabase
      .from("assessment_sessions")
      .insert({
        user_id: user.id,
        assessment_type: def.type,
        responses: responses as unknown as Record<string, unknown>,
        subcategory_scores: subcategoryScores,
        overall_score: overall,
      })
      .select("id")
      .single();
    if (error || !data) {
      setSubmitting(false);
      toast.error(error?.message ?? "Could not save your responses.");
      return;
    }
    navigate({ to: "/report/$sessionId", params: { sessionId: data.id } });
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <div className="mb-6">
        <p className="text-xs font-medium uppercase tracking-widest text-[var(--accent-blue)]">
          {def.shortTitle}
        </p>
        <h1 className="mt-1 font-display text-2xl font-semibold text-foreground sm:text-3xl">
          {def.title}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Rate each statement from 1 to 5. (1 = Almost Never, 5 = Almost Always)
        </p>
      </div>

      <div className="mb-8">
        <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
          <span>
            Section {step + 1} of {totalSteps}
          </span>
          <span>{progress}% complete</span>
        </div>
        <Progress value={progress} />
      </div>

      <div className="rounded-xl border border-border bg-card p-6 shadow-sm sm:p-8">
        <h2 className="font-display text-lg font-semibold text-foreground">{currentSub.name}</h2>
        <div className="mt-6 space-y-8">
          {currentSub.questionIndices.map((qIdx) => (
            <div key={qIdx}>
              <p className="text-base text-foreground">{def.questions[qIdx]}</p>
              <div className="mt-4 grid grid-cols-5 gap-2">
                {[1, 2, 3, 4, 5].map((v) => {
                  const selected = responses[qIdx] === v;
                  return (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setAnswer(qIdx, v)}
                      className={
                        "rounded-lg border px-3 py-3 text-sm font-medium transition " +
                        (selected
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-background text-foreground hover:border-[var(--accent-blue)]")
                      }
                    >
                      <div className="font-display text-base">{v}</div>
                      <div className={"mt-0.5 text-[10px] " + (selected ? "text-primary-foreground/80" : "text-muted-foreground")}>
                        {SCALE_LABELS[v - 1]}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between">
        <Button
          variant="ghost"
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          disabled={step === 0}
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>

        {isLastStep ? (
          <Button onClick={handleGenerate} disabled={!allAnswered || submitting}>
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving…
              </>
            ) : (
              <>Generate my Gap Report <ArrowRight className="ml-2 h-4 w-4" /></>
            )}
          </Button>
        ) : (
          <Button onClick={() => setStep((s) => s + 1)} disabled={!allAnsweredInStep}>
            Continue <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>
    </main>
  );
}