"use client";

// ============================================================
// OnboardingClient: the plan-finder. Eight short questions, then the plan that fits.
//
// - It starts before any account exists: the questions come first, and the account is asked for at the
//   end, to save the plan.
// - Karman the fox guides it. It is a flight seen through a bird's eyes: the live landscape moves forward
//   with each answer.
// - One question to a screen, centred, with a segmented progress and the main button in reach of the thumb.
// - Every question is one a test prep company needs to place a student, and every answer feeds the plan
//   (lib/onboarding/recommend-plan.ts). The SAT only: Karman does not teach the PSAT.
// - Answers survive a refresh and the trip to sign-up and back.
//
// A parent is not asked the questions: "I'm a parent" opens the parent portal.
// Words: _steps/shared.ts. Styles: intake.css.
// ============================================================

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  planSummary,
  recommendPlan,
  type Recommendation,
  type Independence,
  type LearningPace,
  type PriorPrepResult,
} from "@/lib/onboarding/recommend-plan";
import { okScore } from "@/lib/marketing/lead-rules";
import { track } from "@/lib/analytics/client";
import { FINDER as W, LANDING, flownAt, gapLine, type Role } from "./_steps/shared";
import { Guide } from "./_steps/Guide";
import { Options, Progress, ScoreField } from "./_steps/Parts";
import { RecommendationStep } from "./_steps/RecommendationStep";
import { startParentAccountAction } from "./parent-action";

const KEEP = "karman:finder";
const NOT_SURE = "not_sure";
const STEPS = [
  "hello",
  "role",
  "month",
  "score",
  "goal",
  "gap",
  "time",
  "study",
  "miss",
  "prior",
  "building",
  "plan",
] as const;
type StepName = (typeof STEPS)[number];
/** The fox's own moments: no question, so no segment and Back steps over them. */
const MOMENTS: StepName[] = ["hello", "gap", "building"];
const QUESTIONS = STEPS.filter((s) => !MOMENTS.includes(s) && s !== "plan");
const pairs = <T extends string>(o: Record<T, string>) => Object.entries(o) as [T, string][];

/** "December", "March": the month of each coming SAT, with the year only where a month comes twice. */
function monthsOf(dates: string[]): [string, string][] {
  const name = (iso: string, year: boolean) =>
    new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-US", {
      month: "long",
      year: year ? "numeric" : undefined,
      timeZone: "UTC",
    });
  const first = dates.slice(0, 5);
  return first.map((iso) => [
    iso,
    name(iso, first.filter((d) => d.slice(5, 7) === iso.slice(5, 7)).length > 1),
  ]);
}

export default function OnboardingClient({
  satDates,
  signedIn,
}: {
  /** Whether an account is already signed in. Signed out, the plan is shown first and the account is
   *  asked for at the end. */
  signedIn: boolean;
  /** Upcoming SAT dates (YYYY-MM-DD) from the sat_dates table. */
  satDates: string[];
}) {
  useEffect(() => {
    if (signedIn) track("signup");
  }, [signedIn]);

  const [role, setRole] = useState<Role | null>(null);
  const [satDate, setSatDate] = useState("");
  const [score, setScore] = useState("");
  const [noScore, setNoScore] = useState(false);
  const [goal, setGoal] = useState("");
  const [hours, setHours] = useState<number | null>(null);
  const [study, setStudy] = useState<Independence | null>(null);
  const [miss, setMiss] = useState<LearningPace | null>(null);
  const [prior, setPrior] = useState<PriorPrepResult | null>(null);

  const [step, setStep] = useState(0);
  const [dir, setDir] = useState<1 | -1>(1);
  const [bad, setBad] = useState("");
  const [ready, setReady] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [parentBusy, startParent] = useTransition();
  const since = useRef(0);
  const card = useRef<HTMLFormElement>(null);
  const at: StepName = STEPS[step];
  const months = useMemo(() => monthsOf(satDates), [satDates]);

  // answers survive a refresh, and the trip to create an account and back (this tab only)
  useEffect(() => {
    try {
      const k = JSON.parse(sessionStorage.getItem(KEEP) ?? "null");
      if (k && typeof k.step === "number") {
        setRole(k.role);
        setSatDate(k.satDate);
        setScore(k.score);
        setNoScore(k.noScore);
        setGoal(k.goal);
        setHours(k.hours);
        setStudy(k.study);
        setMiss(k.miss);
        setPrior(k.prior);
        // "building" is a passing moment: come back to the plan itself
        setStep(Math.min(STEPS[k.step] === "building" ? k.step + 1 : k.step, STEPS.length - 1));
      }
    } catch {
      // a private window may refuse storage: the plan-finder still works, it just starts fresh
    }
    setReady(true);
  }, []);
  useEffect(() => {
    if (!ready) return;
    try {
      sessionStorage.setItem(
        KEEP,
        JSON.stringify({ step, role, satDate, score, noScore, goal, hours, study, miss, prior })
      );
    } catch {
      // see above
    }
  }, [ready, step, role, satDate, score, noScore, goal, hours, study, miss, prior]);

  // each step is measured (never what was answered), and "building" passes by itself
  useEffect(() => {
    if (!ready) return;
    since.current = Date.now();
    track("form_step", { form: "onboarding", step: STEPS[step], kind: "view" });
    if (STEPS[step] === "score" || STEPS[step] === "goal")
      card.current?.querySelector<HTMLElement>("input[type='text']")?.focus();
    if (STEPS[step] !== "building") return;
    const t = setTimeout(() => {
      setDir(1);
      setStep((s) => s + 1);
    }, 1400);
    return () => clearTimeout(t);
  }, [ready, step]);

  const answered: Record<StepName, boolean> = {
    hello: true,
    role: !!role,
    month: !!satDate,
    score: true,
    goal: true,
    gap: true,
    time: hours !== null,
    study: !!study,
    miss: !!miss,
    prior: !!prior,
    building: true,
    plan: true,
  };

  const recommendation: Recommendation | null = useMemo(() => {
    if (!study || !miss || !prior || !satDate || hours === null || !okScore(goal, 400)) return null;
    const weeksToTest =
      satDate === NOT_SURE
        ? null
        : Math.max(1, Math.round((new Date(satDate).getTime() - Date.now()) / (7 * 864e5)));
    return recommendPlan({
      weeksToTest,
      goalScore: Number(goal),
      baselineScore: noScore ? null : Number(score),
      hoursPerWeek: hours,
      independence: study,
      pace: miss,
      priorPrep: prior,
    });
  }, [satDate, goal, noScore, score, hours, study, miss, prior]);

  const move = (to: number) => {
    track("form_step", {
      form: "onboarding",
      step: at,
      kind: to > step ? "next" : "back",
      seconds: Math.min(3600, Math.round((Date.now() - since.current) / 1000)),
    });
    setBad("");
    setDir(to > step ? 1 : -1);
    setStep(to);
  };
  const fail = () => {
    setBad(W.errors.score);
    card.current?.querySelector<HTMLElement>("input[type='text']")?.focus();
  };
  function next() {
    if (!answered[at]) return;
    if (at === "score" && !noScore && !okScore(score, 400)) return fail();
    if (at === "goal" && !okScore(goal, 400)) return fail();
    if (at === "role" && role === "parent")
      return startParent(async () => {
        const result = await startParentAccountAction();
        if (result?.error) setBad(result.error);
      });
    if (step < STEPS.length - 1) move(step + 1);
  }
  function back() {
    let to = step - 1;
    while (to > 0 && MOMENTS.includes(STEPS[to])) to -= 1;
    if (step > 0) move(Math.max(0, to));
  }

  /** Signed in: opens the plan's next step. Signed out: the answers are already kept, so the visitor
   *  makes an account and comes straight back to this plan. */
  async function continueTo(href: string) {
    setSubmitting(true);
    if (!signedIn) {
      track("form_step", { form: "onboarding", step: "plan", kind: "choice", value: "sign_up" });
      window.location.assign("/auth/sign-up?redirect_url=/onboarding");
      return;
    }
    await fetch("/api/auth/sync-user", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: "student" }),
    }).catch(() => {});
    try {
      sessionStorage.removeItem(KEEP);
    } catch {
      // nothing kept, nothing to clear
    }
    window.location.assign(href);
  }

  const said: Record<StepName, string> = {
    hello: W.hello,
    role: W.role.say,
    month: W.month.say,
    score: W.score.say,
    goal: W.goal.say,
    gap: gapLine(noScore || !score ? null : Number(score), Number(goal)),
    time: W.time.say,
    study: W.study.say,
    miss: W.miss.say,
    prior: W.prior.say,
    building: W.building,
    plan: W.plan.say,
  };
  const moment = MOMENTS.includes(at);
  const isLast = at === "plan";

  // The landscape flies forward with each answer; at the plan it reaches the country of the page the plan
  // leads to, so the same landscape is there when the visitor arrives.
  const landing =
    isLast && recommendation
      ? (LANDING[planSummary(recommendation.planId).href] ?? LANDING["/pricing"])
      : null;
  const flown = flownAt(step, STEPS.length, landing);
  useEffect(() => {
    const ks = document.getElementById("ks");
    if (ks) ks.dataset.flown = String(flown);
    document.dispatchEvent(new CustomEvent("karman:fly", { detail: flown }));
  }, [flown]);

  const question = QUESTIONS.indexOf(at as (typeof QUESTIONS)[number]) + 1;
  const progressAt = question || QUESTIONS.filter((q) => STEPS.indexOf(q) < step).length + 1;

  return (
    <div className="ob">
      {at === "hello" ? null : (
        <Progress
          total={QUESTIONS.length}
          at={isLast || at === "building" ? QUESTIONS.length + 1 : progressAt}
          onBack={back}
          canBack={step > 0 && !parentBusy}
        />
      )}
      <div className="ob-in">
        {moment ? null : <Guide say={said[at]} />}
        <form
          key={at}
          ref={card}
          className="rs-start"
          style={{ "--guide-from": `${dir * 22}px` } as React.CSSProperties}
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            next();
          }}
        >
          {moment ? (
            <Guide say={said[at]} big />
          ) : (
            <div className="ob-card rs-start">
              {at === "role" && (
                <>
                  <h1>{W.role.headline}</h1>
                  <div className="ob-roles" role="radiogroup" aria-label={W.role.headline}>
                    {(["student", "parent"] as const).map((r) => (
                      <button
                        type="button"
                        role="radio"
                        aria-checked={role === r}
                        key={r}
                        onClick={() => {
                          setRole(r);
                          setBad("");
                        }}
                      >
                        <svg viewBox="0 0 24 24" aria-hidden="true">
                          <circle cx="12" cy="12" r="10.5" />
                          <path pathLength={1} d="M7 12.500l3.300 3.300L17 9" />
                        </svg>
                        <b>{W.role[r][0]}</b>
                        <span>{W.role[r][1]}</span>
                      </button>
                    ))}
                  </div>
                </>
              )}
              {at === "month" && (
                <>
                  <h1>{W.month.headline}</h1>
                  <Options
                    label={W.month.headline}
                    options={[...months, [NOT_SURE, W.month.notSure]]}
                    value={satDate || null}
                    onChange={setSatDate}
                  />
                </>
              )}
              {at === "score" && (
                <>
                  <h1>{W.score.headline}</h1>
                  <ScoreField
                    label={W.score.field}
                    value={score}
                    bad={!!bad}
                    off={noScore}
                    onChange={(v) => {
                      setScore(v);
                      setBad("");
                    }}
                  />
                  <label className="ob-tick">
                    <input
                      type="checkbox"
                      checked={noScore}
                      onChange={(e) => {
                        setNoScore(e.target.checked);
                        setBad("");
                      }}
                    />
                    <span>{W.score.none}</span>
                  </label>
                </>
              )}
              {at === "goal" && (
                <>
                  <h1>{W.goal.headline}</h1>
                  <ScoreField
                    label={W.goal.field}
                    value={goal}
                    bad={!!bad}
                    onChange={(v) => {
                      setGoal(v);
                      setBad("");
                    }}
                  />
                </>
              )}
              {at === "time" && (
                <>
                  <h1>{W.time.headline}</h1>
                  <Options
                    label={W.time.headline}
                    options={W.time.options}
                    value={hours}
                    onChange={setHours}
                  />
                </>
              )}
              {at === "study" && (
                <>
                  <h1>{W.study.headline}</h1>
                  <Options
                    label={W.study.headline}
                    options={pairs(W.study.options)}
                    value={study}
                    onChange={setStudy}
                  />
                </>
              )}
              {at === "miss" && (
                <>
                  <h1>{W.miss.headline}</h1>
                  <Options
                    label={W.miss.headline}
                    options={pairs(W.miss.options)}
                    value={miss}
                    onChange={setMiss}
                  />
                </>
              )}
              {at === "prior" && (
                <>
                  <h1>{W.prior.headline}</h1>
                  <Options
                    label={W.prior.headline}
                    options={pairs(W.prior.options)}
                    value={prior}
                    onChange={setPrior}
                  />
                </>
              )}
              {isLast && recommendation ? (
                <RecommendationStep
                  recommendation={recommendation}
                  onContinue={continueTo}
                  submitting={submitting}
                  signedIn={signedIn}
                />
              ) : null}
              {bad ? (
                <p className="rs-msg" role="alert">
                  {bad}
                </p>
              ) : null}
            </div>
          )}
          {/* outside the card on purpose: on a phone it is fixed to the bottom of the screen */}
          {!isLast && at !== "building" ? (
            <div className="ob-go" data-centre={at === "hello" || undefined}>
              <button
                type="submit"
                className="btn"
                disabled={!answered[at]}
                data-busy={parentBusy || undefined}
                suppressHydrationWarning
              >
                <span className="lb">
                  {at === "hello" ? W.helloButton : parentBusy ? W.role.parentBusy : W.next}
                </span>
              </button>
            </div>
          ) : null}
        </form>
      </div>
    </div>
  );
}
