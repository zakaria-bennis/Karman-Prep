"use client";

// ============================================================
// OnboardingClient — pre-payment questionnaire that ends in a
// plan recommendation.
//
// Replaces the old "Are you a Student / Tutor / Parent?" picker.
// Runs BEFORE the family picks a plan, so its job is to learn
// enough about the student to recommend the right plan, and
// explain why, without asking the obvious "would you like a
// group or 1-on-1?" question (which just hands over the answer).
//
// Step flow:
//   1. Role             (Student / Parent — re-frames every later
//                        question's wording)
//   2. SAT date         (test date OR "not registered yet")
//   3. Goal score       (target)
//   4. Baseline         (most recent SAT/PSAT, or "haven't taken")
//   5. Hours/week       (study time available)
//   6. Independence     (can the student stay on track alone?)
//   7. Learning pace    (how fast does new material click?)
//   8. Prior prep       (have they tried prep before, did it work?)
//   9. Recommendation   (plan, price, reasoning, signals and the
//                        plan's next step: checkout for Practice
//                        and Pro, the application for the Cohort,
//                        a call for Private)
//
// Tutors come in through a separate URL — they don't need this
// recommendation flow.
// ============================================================

import { useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Target, Compass, Gauge, History } from "lucide-react";
import {
  recommendPlan,
  type Recommendation,
  type Independence,
  type LearningPace,
  type PriorPrepResult,
} from "@/lib/onboarding/recommend-plan";
import { COPY, type Role } from "./_steps/shared";
import { RoleStep } from "./_steps/RoleStep";
import { SatStep } from "./_steps/SatStep";
import { ScoreStep } from "./_steps/ScoreStep";
import { BaselineStep } from "./_steps/BaselineStep";
import { HoursStep } from "./_steps/HoursStep";
import { ChoiceStep } from "./_steps/ChoiceStep";
import { RecommendationStep } from "./_steps/RecommendationStep";

export default function OnboardingClient() {
  // ─── Form state ──────────────────────────────────────────
  const [role, setRole] = useState<Role>("student");
  const [satDate, setSatDate] = useState<string>("");
  const [goalScore, setGoalScore] = useState<number>(1300);
  const [hasBaseline, setHasBaseline] = useState<"" | "yes" | "no">("");
  const [baselineScore, setBaselineScore] = useState<number>(1000);
  const [hoursPerWeek, setHoursPerWeek] = useState<number>(5);
  const [independence, setIndependence] = useState<Independence | "">("");
  const [pace, setPace] = useState<LearningPace | "">("");
  const [priorPrep, setPriorPrep] = useState<PriorPrepResult | "">("");

  const copy = COPY.student;
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const steps = useMemo(
    () =>
      [
        "role",
        "sat",
        "goal",
        "baseline",
        "hours",
        "independence",
        "pace",
        "prior",
        "recommendation",
      ] as const,
    []
  );
  const totalSteps = steps.length;
  const currentStep = steps[step];
  const isLast = step === totalSteps - 1;

  const canAdvance = (() => {
    switch (currentStep) {
      case "role":
        return !!role;
      case "sat":
        return !!satDate;
      case "goal":
        return goalScore >= 400 && goalScore <= 1600;
      case "baseline":
        if (hasBaseline === "") return false;
        if (hasBaseline === "yes") return baselineScore >= 400 && baselineScore <= 1600;
        return true;
      case "hours":
        return hoursPerWeek >= 1;
      case "independence":
        return !!independence;
      case "pace":
        return !!pace;
      case "prior":
        return !!priorPrep;
      default:
        return true;
    }
  })();

  // ─── Compute recommendation ──────────────────────────────
  const recommendation: Recommendation | null = useMemo(() => {
    if (!independence || !pace || !priorPrep || !satDate) return null;
    const weeksToTest =
      satDate === "not_registered"
        ? null
        : Math.max(
            1,
            Math.round((new Date(satDate).getTime() - Date.now()) / (7 * 24 * 60 * 60 * 1000))
          );
    return recommendPlan({
      weeksToTest,
      goalScore,
      baselineScore: hasBaseline === "yes" ? baselineScore : null,
      hoursPerWeek,
      independence,
      pace,
      priorPrep,
    });
  }, [satDate, goalScore, hasBaseline, baselineScore, hoursPerWeek, independence, pace, priorPrep]);

  function next() {
    if (canAdvance && step < totalSteps - 1) setStep(step + 1);
  }
  function back() {
    if (step > 0) setStep(step - 1);
  }

  /** Saves the account (role included), then opens the plan's next step. */
  async function continueTo(href: string) {
    setSubmitting(true);
    await fetch("/api/auth/sync-user", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    }).catch(() => {});
    window.location.assign(href);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-info/10 to-gold/10 px-4 py-10 dark:from-night dark:to-surface">
      <div className="w-full max-w-xl">
        <div className="mb-6">
          <div className="mb-2 flex items-center justify-between text-xs text-taupe dark:text-taupe">
            <span>
              Step {Math.min(step + 1, totalSteps)} of {totalSteps}
            </span>
            <span>{role === "student" ? "Student intake" : "Parent intake"}</span>
          </div>
          <div className="h-1 overflow-hidden rounded-full bg-surface dark:bg-surface-raised">
            <div
              className="h-full bg-gradient-to-r from-info to-gold transition-all duration-300"
              style={{ width: `${((step + 1) / totalSteps) * 100}%` }}
            />
          </div>
        </div>

        <div className="rounded-2xl border border-ivory/10 bg-surface/[0.04] p-6 shadow-2xl backdrop-blur-md dark:bg-surface/40 sm:p-8">
          {currentStep === "role" && <RoleStep role={role} onPick={setRole} />}

          {currentStep === "sat" && (
            <SatStep prompt={copy.sat} value={satDate} onChange={setSatDate} />
          )}

          {currentStep === "goal" && (
            <ScoreStep
              prompt={copy.goal}
              value={goalScore}
              onChange={setGoalScore}
              icon={<Target className="h-5 w-5 text-info" />}
            />
          )}

          {currentStep === "baseline" && (
            <BaselineStep
              prompt={copy.baselineQ}
              yesLabel={copy.baselineYes}
              noLabel={copy.baselineNo}
              has={hasBaseline}
              onPickHas={setHasBaseline}
              score={baselineScore}
              onScoreChange={setBaselineScore}
            />
          )}

          {currentStep === "hours" && (
            <HoursStep prompt={copy.hours} value={hoursPerWeek} onChange={setHoursPerWeek} />
          )}

          {currentStep === "independence" && (
            <ChoiceStep
              icon={<Compass className="h-5 w-5 text-info" />}
              prompt={copy.indeQ}
              options={[
                { id: "on_my_own", label: copy.indeOnOwn },
                { id: "with_checkins", label: copy.indeCheckins },
                { id: "needs_structure", label: copy.indeStructure },
              ]}
              value={independence}
              onChange={(v) => setIndependence(v as Independence)}
            />
          )}

          {currentStep === "pace" && (
            <ChoiceStep
              icon={<Gauge className="h-5 w-5 text-info" />}
              prompt={copy.paceQ}
              options={[
                { id: "quick", label: copy.paceQuick },
                { id: "average", label: copy.paceAvg },
                { id: "slower", label: copy.paceSlow },
              ]}
              value={pace}
              onChange={(v) => setPace(v as LearningPace)}
            />
          )}

          {currentStep === "prior" && (
            <ChoiceStep
              icon={<History className="h-5 w-5 text-info" />}
              prompt={copy.priorQ}
              options={[
                { id: "first_time", label: copy.priorFirst },
                { id: "worked", label: copy.priorWorked },
                { id: "didnt_move", label: copy.priorFlat },
              ]}
              value={priorPrep}
              onChange={(v) => setPriorPrep(v as PriorPrepResult)}
            />
          )}

          {currentStep === "recommendation" && recommendation && (
            <RecommendationStep
              recommendation={recommendation}
              onContinue={continueTo}
              submitting={submitting}
              role={role}
            />
          )}

          {!isLast && (
            <div className="mt-8 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={back}
                disabled={step === 0}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-taupe hover:text-ivory disabled:opacity-40 dark:text-taupe dark:hover:text-ivory"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </button>
              <button type="button" onClick={next} disabled={!canAdvance} className="btn-primary">
                Continue
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
