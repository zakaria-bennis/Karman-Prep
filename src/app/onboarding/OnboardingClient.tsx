"use client";

// ============================================================
// OnboardingClient: the guided intake that ends in a plan recommendation.
//
// Rebuilt on what Duolingo's onboarding does well (founder, 2026-11-13; the study and what transfers are in
// docs/forms/onboarding-notes.md), in Karman's own look:
//   - it starts before any account exists: the questions come first, and the account is asked for at the
//     end, to save the plan (value before sign-up);
//   - the fox guides it: it says how long this takes, reacts to answers and never scolds;
//   - one question to a screen, a bar that starts part-filled, and the main button in reach of the thumb;
//   - the scores get an answer of their own (the gap, said plainly), so the questions feel used;
//   - practice is chosen in small daily minutes, and that button names the commitment;
//   - answers survive a refresh and the trip to sign-up and back.
//
// Step flow:
//   hello, role (a parent goes to the parent portal), test and date, starting score, goal score,
//   the gap (the fox's answer), daily minutes, independence, pace, prior prep, building, recommendation.
//
// Tutors come in through a separate URL; they don't need this flow.
// ============================================================

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Target, Compass, Gauge, History } from "lucide-react";
import {
  recommendPlan,
  type Recommendation,
  type Independence,
  type LearningPace,
  type PriorPrepResult,
} from "@/lib/onboarding/recommend-plan";
import { COPY, GUIDE, gapLine, type Role } from "./_steps/shared";
import { Guide } from "./_steps/Guide";
import { MinutesStep, hoursFromMinutes } from "./_steps/MinutesStep";
import { RoleStep } from "./_steps/RoleStep";
import { SatStep } from "./_steps/SatStep";
import { ScoreStep } from "./_steps/ScoreStep";
import { BaselineStep } from "./_steps/BaselineStep";
import { ChoiceStep } from "./_steps/ChoiceStep";
import { RecommendationStep } from "./_steps/RecommendationStep";
import type { TestType } from "@/components/student-portal/settings/test-dates";
import { track } from "@/lib/analytics/client";

const KEEP = "karman:intake";
const STEPS = [
  "hello",
  "role",
  "sat",
  "baseline",
  "goal",
  "gap",
  "minutes",
  "independence",
  "pace",
  "prior",
  "building",
  "recommendation",
] as const;
type StepName = (typeof STEPS)[number];

export default function OnboardingClient({
  satDates,
  today,
  signedIn,
}: {
  /** Whether an account is already signed in. Signed out, the plan is shown first and the account is
   *  asked for at the end. */
  signedIn: boolean;
  /** Upcoming SAT dates (YYYY-MM-DD) from the sat_dates table. */
  satDates: string[];
  /** Today (YYYY-MM-DD), the earliest PSAT date. */
  today: string;
}) {
  // The funnel's "signed up" step: counted once an account reaches the intake.
  useEffect(() => {
    if (signedIn) track("signup");
  }, [signedIn]);
  // ─── Form state ──────────────────────────────────────────
  const [role, setRole] = useState<Role>("student");
  const [testType, setTestType] = useState<TestType>("sat");
  const [satDate, setSatDate] = useState<string>("");
  const [goalScore, setGoalScore] = useState<number>(1300);
  const [hasBaseline, setHasBaseline] = useState<"" | "yes" | "no">("");
  const [baselineScore, setBaselineScore] = useState<number>(1000);
  const [minutes, setMinutes] = useState<number | null>(null);
  const hoursPerWeek = hoursFromMinutes(minutes ?? 20);
  const [independence, setIndependence] = useState<Independence | "">("");
  const [pace, setPace] = useState<LearningPace | "">("");
  const [priorPrep, setPriorPrep] = useState<PriorPrepResult | "">("");

  const copy = COPY.student;
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const [dir, setDir] = useState<1 | -1>(1);
  const [ready, setReady] = useState(false);
  const since = useRef(0);
  const totalSteps = STEPS.length;
  const currentStep: StepName = STEPS[step];
  const isLast = step === totalSteps - 1;

  // answers survive a refresh, and the trip to create an account and back (this tab only)
  useEffect(() => {
    try {
      const k = JSON.parse(sessionStorage.getItem(KEEP) ?? "null");
      if (k && typeof k.step === "number") {
        setRole(k.role);
        setTestType(k.testType);
        setSatDate(k.satDate);
        setGoalScore(k.goalScore);
        setHasBaseline(k.hasBaseline);
        setBaselineScore(k.baselineScore);
        setMinutes(k.minutes);
        setIndependence(k.independence);
        setPace(k.pace);
        setPriorPrep(k.priorPrep);
        // "building" is a passing moment: come back to the plan itself
        setStep(
          Math.min(k.step === STEPS.indexOf("building") ? k.step + 1 : k.step, STEPS.length - 1)
        );
      }
    } catch {
      // a private window may refuse storage: the intake still works, it just starts fresh
    }
    setReady(true);
  }, []);
  useEffect(() => {
    if (!ready) return;
    try {
      sessionStorage.setItem(
        KEEP,
        JSON.stringify({
          step,
          role,
          testType,
          satDate,
          goalScore,
          hasBaseline,
          baselineScore,
          minutes,
          independence,
          pace,
          priorPrep,
        })
      );
    } catch {
      // see above
    }
  }, [
    ready,
    step,
    role,
    testType,
    satDate,
    goalScore,
    hasBaseline,
    baselineScore,
    minutes,
    independence,
    pace,
    priorPrep,
  ]);

  // each step is measured (never what was answered beyond the step's name), and "building" passes by itself
  useEffect(() => {
    if (!ready) return;
    since.current = Date.now();
    track("form_step", { form: "onboarding", step: STEPS[step], kind: "view" });
    if (STEPS[step] !== "building") return;
    const t = setTimeout(() => {
      setDir(1);
      setStep((s) => s + 1);
    }, 1400);
    return () => clearTimeout(t);
  }, [ready, step]);

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
      case "minutes":
        return minutes !== null;
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

  const move = (to: number) => {
    track("form_step", {
      form: "onboarding",
      step: currentStep,
      kind: to > step ? "next" : "back",
      seconds: Math.min(3600, Math.round((Date.now() - since.current) / 1000)),
    });
    setDir(to > step ? 1 : -1);
    setStep(to);
  };
  function next() {
    if (canAdvance && step < totalSteps - 1) move(step + 1);
  }
  function back() {
    // "the gap" and "building" are the fox's moments, not questions: Back steps over them
    let to = step - 1;
    while (to > 0 && (STEPS[to] === "building" || (STEPS[to] === "gap" && to !== step - 1)))
      to -= 1;
    if (step > 0) move(Math.max(0, to));
  }

  /** Signed in: saves the account (role included), then opens the plan's next step. Signed out: the
   *  answers are already kept, so the visitor makes an account and comes straight back to this plan. */
  async function continueTo(href: string) {
    setSubmitting(true);
    if (!signedIn) {
      track("form_step", {
        form: "onboarding",
        step: "recommendation",
        kind: "choice",
        value: "sign_up",
      });
      window.location.assign("/auth/sign-up?redirect_url=/onboarding");
      return;
    }
    await fetch("/api/auth/sync-user", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    }).catch(() => {});
    try {
      sessionStorage.removeItem(KEEP);
    } catch {
      // nothing kept, nothing to clear
    }
    window.location.assign(href);
  }

  const said =
    currentStep === "gap"
      ? gapLine(hasBaseline === "yes" ? baselineScore : null, goalScore)
      : GUIDE[currentStep as keyof typeof GUIDE];
  const moment = currentStep === "hello" || currentStep === "gap" || currentStep === "building";
  const nextLabel =
    currentStep === "hello" ? "Let's go" : currentStep === "minutes" ? "I'm committed" : "Continue";

  return (
    <div className="flex min-h-[100svh] justify-center bg-gradient-to-br from-info/10 to-gold/10 px-4 pb-28 pt-6 dark:from-night dark:to-surface sm:items-center sm:pb-10 sm:pt-10">
      <div className="w-full max-w-xl">
        <div className="mb-5 flex items-center gap-3">
          <button
            type="button"
            onClick={back}
            disabled={step === 0}
            aria-label="Back"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-taupe transition hover:text-ivory disabled:opacity-0"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          {/* the bar starts part-filled and never looks stuck: early progress that feels slow loses people */}
          <div
            className="h-2.5 flex-1 overflow-hidden rounded-full bg-surface dark:bg-surface-raised"
            role="progressbar"
            aria-label="Progress"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(Math.max(0.1, (step + 1) / totalSteps) * 100)}
          >
            <div
              className="h-full rounded-full bg-gradient-to-r from-info to-gold transition-all duration-300"
              style={{ width: `${Math.max(0.1, (step + 1) / totalSteps) * 100}%` }}
            />
          </div>
        </div>

        {moment ? null : (
          <div className="mb-4 pr-14 sm:pr-0">
            <Guide say={said} />
          </div>
        )}

        <div
          key={currentStep}
          style={{ "--guide-from": `${dir * 22}px` } as React.CSSProperties}
          className="rounded-2xl border border-ivory/10 bg-surface/[0.04] p-6 shadow-2xl backdrop-blur-md motion-safe:animate-[guide-step_.26s_ease-out] dark:bg-surface/40 sm:p-8"
        >
          {moment ? (
            <div className="py-6">
              <Guide say={said} big />
            </div>
          ) : null}

          {currentStep === "role" && <RoleStep role={role} onPick={setRole} />}

          {currentStep === "sat" && (
            <SatStep
              prompt={copy.sat}
              testType={testType}
              onTestType={setTestType}
              value={satDate}
              onChange={setSatDate}
              satDates={satDates}
              today={today}
            />
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

          {currentStep === "minutes" && (
            <MinutesStep prompt={copy.minutes} value={minutes} onChange={setMinutes} />
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
              signedIn={signedIn}
            />
          )}
        </div>

        {/* the main button stays at the bottom of the screen on a phone, where the thumb is */}
        {!isLast && currentStep !== "building" ? (
          <div className="fixed inset-x-0 bottom-0 z-10 border-t border-ivory/10 bg-night/80 px-4 py-3 backdrop-blur-md sm:static sm:mt-6 sm:border-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none">
            <button
              type="button"
              onClick={next}
              disabled={!canAdvance}
              className="btn-primary w-full justify-center py-3.5 text-base active:scale-[.98] sm:ml-auto sm:w-auto"
            >
              {nextLabel}
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
