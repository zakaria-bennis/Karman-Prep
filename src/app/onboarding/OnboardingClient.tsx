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
import { FINDER, FINDER_PARENT, LANDING, flownAt, gapLine, type Role } from "./_steps/shared";
import { ParentPicture, StudentPicture } from "@/components/site/reserve/RolePictures";
import { keepKnown, readKnown } from "@/lib/onboarding/known";
import { Guide } from "./_steps/Guide";
import { Options, Progress, ScoreWheel } from "./_steps/Parts";
import { RecommendationStep } from "./_steps/RecommendationStep";
import { saveAnswersAction } from "./answers-action";
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
  "plan",
] as const;
type StepName = (typeof STEPS)[number];
/** The fox's own moments: no question, so no segment and Back steps over them. */
const MOMENTS: StepName[] = ["hello", "gap"];
const QUESTIONS = STEPS.filter((s) => !MOMENTS.includes(s) && s !== "plan");
const pairs = <T extends string>(o: Record<T, string>) => Object.entries(o) as [T, string][];

/** The questions with one answer to tap: the tap is the answer, and the flow moves on by itself
 *  (founder, 2026-11-25: no Continue after a choice; Back is how to change one). */
const CHOICES: StepName[] = ["role", "month", "time", "study", "miss", "prior"];

/** "December 2026", "March 2027": the month and year of each coming SAT, each month once (founder,
 *  2026-11-25). Two sittings in one month keep the earlier date. */
export function monthsOf(dates: string[]): [string, string][] {
  const seen = new Set<string>();
  const first = dates.filter((iso) => {
    const month = iso.slice(0, 7);
    return seen.has(month) ? false : !!seen.add(month);
  });
  return first.slice(0, 5).map((iso) => [
    iso,
    new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    }),
  ]);
}

export default function OnboardingClient({
  who = null,
  satDates,
  signedIn,
}: {
  /** Whether an account is already signed in. Signed out, the plan is shown first and the account is
   *  asked for at the end. */
  signedIn: boolean;
  /** Upcoming SAT dates (YYYY-MM-DD) from the sat_dates table. */
  satDates: string[];
  /** Who this is, when we already know (a parent account, or a link that says so): the "student or
   *  parent" question is then never asked. */
  who?: Role | null;
}) {
  useEffect(() => {
    if (signedIn) track("signup");
  }, [signedIn]);

  const [role, setRole] = useState<Role | null>(who);
  // known from the server, or answered before in this browser: the question is skipped
  const [sure, setSure] = useState(who !== null);
  const W = role === "parent" ? FINDER_PARENT : FINDER;
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
  // the plan screen's button that was pressed, by where it leads, while that page opens
  const [going, setGoing] = useState<string | null>(null);
  const [parentBusy, startParent] = useTransition();
  // a choice was just tapped and the flow is about to move on
  const [picking, setPicking] = useState(false);
  // an answer lights up only in the moment it is tapped: coming back to a question, nothing is
  // picked for the visitor (founder, 2026-11-25)
  const lit = picking || parentBusy;
  const since = useRef(0);
  const card = useRef<HTMLFormElement>(null);
  const at: StepName = STEPS[step];
  const months = useMemo(() => monthsOf(satDates), [satDates]);
  // a goal never sits below the score the student already has
  const floor = noScore || !okScore(score, 400) ? 400 : Number(score);

  // answers survive a refresh, and the trip to create an account and back (this tab only)
  useEffect(() => {
    try {
      // /onboarding?fresh=1 starts over: the kept answers are dropped (used when reviewing the flow)
      if (new URLSearchParams(window.location.search).has("fresh")) sessionStorage.removeItem(KEEP);
      const k = JSON.parse(sessionStorage.getItem(KEEP) ?? "null");
      // Who this is: the account says, when there is one. Before an account exists, what this browser
      // was told. (A signed-in account never takes it from the browser: on a shared family computer
      // that would turn a student's new account into a parent's.)
      const before = who ?? (signedIn ? null : (readKnown().role ?? null));
      // "I'm a parent" was tapped in this tab before the account existed: the account that was just
      // made becomes the parent account now
      if (signedIn && who !== "parent" && k?.role === "parent")
        void startParentAccountAction().then((r) => {
          if ("error" in r) setBad(r.error);
        });
      if (before) {
        setRole(before);
        setSure(true);
      }
      if (k && typeof k.step === "number") {
        if (!before) setRole(k.role);
        setSatDate(k.satDate);
        setScore(k.score);
        setNoScore(k.noScore);
        setGoal(k.goal);
        setHours(k.hours);
        setStudy(k.study);
        setMiss(k.miss);
        setPrior(k.prior);
        setStep(Math.min(k.step, STEPS.length - 1));
      }
    } catch {
      // a private window may refuse storage: the plan-finder still works, it just starts fresh
    }
    setReady(true);
  }, [who, signedIn]);
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
    // what the cohort forms will not ask again (lib/onboarding/known.ts)
    keepKnown({
      role: role ?? undefined,
      satDate: satDate && satDate !== NOT_SURE ? satDate : undefined,
      score: okScore(score, 400) ? score : undefined,
      noScore: noScore || undefined,
      goal: okScore(goal, 400) ? goal : undefined,
    });
  }, [ready, step, role, satDate, score, noScore, goal, hours, study, miss, prior]);

  // each step is measured (never what was answered)
  useEffect(() => {
    if (!ready) return;
    since.current = Date.now();
    track("form_step", { form: "onboarding", step: STEPS[step], kind: "view" });
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
    plan: true,
  };

  // the plan is on screen: a signed-in student's SAT date and goal go onto their account, so the
  // portal and the cohort form never ask for them again
  const kept = useRef(false);
  useEffect(() => {
    if (!ready || !signedIn || role === "parent" || STEPS[step] !== "plan" || kept.current) return;
    kept.current = true;
    void saveAnswersAction({
      satDate: satDate === NOT_SURE ? "" : satDate,
      goal: okScore(goal, 400) ? goal : "",
    }).catch(() => {});
  }, [ready, signedIn, role, step, satDate, goal]);

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
    setPicking(false);
    setDir(to > step ? 1 : -1);
    setStep(to);
  };
  const beParent = () =>
    startParent(async () => {
      // no account yet: the choice is remembered, and the account made at the end becomes a parent's
      if (!signedIn) return move(step + 1);
      const result = await startParentAccountAction();
      if ("error" in result) {
        setBad(result.error);
        setPicking(false);
        return;
      }
      // a parent now: the same questions follow, asked about their student
      move(step + 1);
    });
  /** A tapped choice: it shows as picked for a moment, then the flow moves on. */
  const pick = (apply: () => void, parent = false) => {
    if (picking || parentBusy) return;
    apply();
    setBad("");
    setPicking(true);
    window.setTimeout(() => (parent ? beParent() : move(step + 1)), 200);
  };
  function next() {
    if (!answered[at]) return;
    if (at === "score" && !noScore && !okScore(score, 400)) return;
    if (at === "goal" && !okScore(goal, 400)) return;
    if (at === "role" && role === "parent") return beParent();
    // who they are is already known: the question after the opening is not asked
    if (at === "hello" && sure && role) return move(step + 2);
    if (step < STEPS.length - 1) move(step + 1);
  }
  function back() {
    let to = step - 1;
    while (to > 0 && (MOMENTS.includes(STEPS[to]) || (sure && STEPS[to] === "role"))) to -= 1;
    if (step > 0) move(Math.max(0, to));
  }

  /** Signed in: opens the plan's next step. Signed out: the answers are already kept, so the visitor
   *  makes an account and comes straight back to this plan. */
  async function continueTo(href: string) {
    setGoing(href);
    if (!signedIn) {
      track("form_step", { form: "onboarding", step: "plan", kind: "choice", value: "sign_up" });
      window.location.assign("/auth/sign-up?redirect_url=/onboarding");
      return;
    }
    if (role !== "parent")
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
    // a renewing plan belongs to the student's account, so a parent goes to their portal to add the
    // student first; a cohort seat or a tutoring call they can take from here
    window.location.assign(
      role === "parent" && (href.startsWith("/checkout") || href === "/portal")
        ? "/dashboard/parent"
        : href
    );
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

  const go = (
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
  );

  return (
    <div className="ob">
      {/* no bars and no Back at the welcome, nor once the plan is on screen */}
      {at === "hello" || isLast ? null : (
        <Progress
          total={QUESTIONS.length}
          at={progressAt}
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
                        aria-checked={lit && role === r}
                        key={r}
                        onClick={() => pick(() => setRole(r), r === "parent")}
                      >
                        {r === "parent" ? <ParentPicture /> : <StudentPicture />}
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
                    row
                    label={W.month.headline}
                    options={[...months, [NOT_SURE, W.month.notSure]]}
                    value={lit ? satDate || null : null}
                    onChange={(v) => pick(() => setSatDate(v))}
                  />
                </>
              )}
              {at === "score" && (
                <>
                  <h1>{W.score.headline}</h1>
                  <ScoreWheel
                    label={W.score.field}
                    value={score}
                    start={1200}
                    off={noScore}
                    onChange={setScore}
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
                  <ScoreWheel
                    label={W.goal.field}
                    value={goal}
                    min={floor}
                    start={Math.min(1600, floor + 150)}
                    onChange={setGoal}
                  />
                </>
              )}
              {at === "time" && (
                <>
                  <h1>{W.time.headline}</h1>
                  <Options
                    label={W.time.headline}
                    options={W.time.options}
                    value={lit ? hours : null}
                    onChange={(v) => pick(() => setHours(v))}
                  />
                </>
              )}
              {at === "study" && (
                <>
                  <h1>{W.study.headline}</h1>
                  <Options
                    label={W.study.headline}
                    options={pairs(W.study.options)}
                    value={lit ? study : null}
                    onChange={(v) => pick(() => setStudy(v))}
                  />
                </>
              )}
              {at === "miss" && (
                <>
                  <h1>{W.miss.headline}</h1>
                  <Options
                    label={W.miss.headline}
                    options={pairs(W.miss.options)}
                    value={lit ? miss : null}
                    onChange={(v) => pick(() => setMiss(v))}
                  />
                </>
              )}
              {at === "prior" && (
                <>
                  <h1>{W.prior.headline}</h1>
                  <Options
                    label={W.prior.headline}
                    options={pairs(W.prior.options)}
                    value={lit ? prior : null}
                    onChange={(v) => pick(() => setPrior(v))}
                  />
                </>
              )}
              {isLast && recommendation ? (
                <RecommendationStep
                  recommendation={recommendation}
                  onContinue={continueTo}
                  going={going}
                  signedIn={signedIn}
                  parent={role === "parent"}
                />
              ) : null}
              {bad ? (
                <p className="rs-msg" role="alert">
                  {bad}
                </p>
              ) : null}
              {/* the button is part of the glass, centred under the answer (founder, 2026-11-25). A
                  choice never has one: the tap is the answer. It shows there only while the parent
                  account is being made */}
              {!isLast && !(CHOICES.includes(at) && !parentBusy) ? (
                <div className="ob-go">{go}</div>
              ) : null}
            </div>
          )}
          {/* the opening has no card, so its button stands alone under the fox */}
          {moment && !isLast ? <div className="ob-go">{go}</div> : null}
        </form>
      </div>
    </div>
  );
}
