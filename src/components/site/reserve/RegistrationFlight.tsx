"use client";

// Right after payment (founder, 2026-11-13: "pay first"): the few questions that get the student started,
// asked as a flight seen through a bird's eyes. The live landscape moves forward with each answer
// (karman:fly), Karman the fox does the talking with Ollie the owl beside him, and the whole crew cheers at
// the end. The companions are the earnable faces from the quiz engine. The buyer has already paid, so this
// is a welcome, not a hurdle: five short questions, every one a tap or a short line, saved once at the end.
// Words: reserve-copy.ts (start). Styles: the intake's (app/onboarding/intake.css) and reserve.css.
import { useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import { Crew, Guide } from "@/app/onboarding/_steps/Guide";
import { saveStart } from "@/app/(site)/reserve/actions";
import { track } from "@/lib/analytics/client";
import { okScore } from "@/lib/marketing/lead-rules";
import { RESERVE } from "@/lib/marketing/reserve-copy";
import { CLASS_TIMES, HARDEST } from "@/lib/reserve/schemas";

const W = RESERVE.start;
const STEPS = ["hello", "score", "goal", "gap", "hardest", "times", "note", "done"] as const;
type Step = (typeof STEPS)[number];
type Hardest = (typeof HARDEST)[number];
type Time = (typeof CLASS_TIMES)[number];
const digits = (v: string) => v.replace(/\D/g, "").slice(0, 4);

export default function RegistrationFlight({
  token,
  name,
  children,
}: {
  token: string;
  /** The student's first name. */
  name: string;
  /** What is shown once the questions are done: the next steps and the account button. */
  children: ReactNode;
}) {
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState<1 | -1>(1);
  const [score, setScore] = useState("");
  const [noScore, setNoScore] = useState(false);
  const [goal, setGoal] = useState("");
  const [hardest, setHardest] = useState<Hardest | null>(null);
  const [times, setTimes] = useState<Time[]>([]);
  const [note, setNote] = useState("");
  const [bad, setBad] = useState("");
  const [busy, start] = useTransition();
  const card = useRef<HTMLFormElement>(null);
  const at: Step = STEPS[step];
  const say = (t: string) => t.replace("{name}", name);

  // the landscape flies forward with each answer, and each step is measured (never what was answered)
  useEffect(() => {
    const flown = 0.3 + (step / (STEPS.length - 1)) * 0.12;
    const ks = document.getElementById("ks");
    if (ks) ks.dataset.flown = String(flown);
    document.dispatchEvent(new CustomEvent("karman:fly", { detail: flown }));
    track("form_step", { form: "reserve", step: `start-${STEPS[step]}`, kind: "view" });
    if (step > 0) card.current?.querySelector<HTMLElement>("input[type='text']")?.focus();
  }, [step]);

  const go = (to: number) => {
    setBad("");
    setDir(to > step ? 1 : -1);
    setStep(to);
  };
  const back = () => go(STEPS[step - 1] === "gap" ? step - 2 : step - 1);

  const next = () => {
    if (at === "score" && !noScore && !okScore(score, 400)) return setBad(W.errors.score);
    if (at === "goal" && !okScore(goal, 400)) return setBad(W.errors.score);
    if (at === "hardest" && !hardest) return;
    if (at === "times" && !times.length) return setBad(W.errors.times);
    if (at !== "note") return go(step + 1);
    start(async () => {
      const res = await saveStart({
        token,
        startScore: noScore ? "" : score,
        goalScore: goal,
        hardest,
        times,
        note,
      });
      if (!res.ok) return setBad(W.errors.server);
      track("form_step", { form: "reserve", step: "start-note", kind: "next" });
      go(step + 1);
    });
  };

  const gap = () => {
    if (noScore) return W.gapNoStart.replace("{to}", goal);
    const d = Number(goal) - Number(score);
    return d > 0
      ? W.gap.replace("{from}", score).replace("{to}", goal).replace("{gap}", String(d))
      : W.gapNoStart.replace("{to}", goal);
  };
  const said: Record<Step, string> = {
    hello: say(W.hello),
    score: say(W.score.say),
    goal: W.goal.say,
    gap: gap(),
    hardest: W.hardest.say,
    times: W.times.say,
    note: W.note.say,
    done: say(W.done),
  };
  const moment = at === "hello" || at === "gap" || at === "done";
  const along = Math.max(0.06, step / (STEPS.length - 1));

  const number = (value: string, set: (v: string) => void, label: string, off = false) => (
    <label
      className="rs-pill"
      data-bad={bad ? true : undefined}
      data-filled={value ? true : undefined}
    >
      <span>{label}</span>
      <input
        type="text"
        inputMode="numeric"
        autoComplete="off"
        maxLength={4}
        disabled={off}
        value={off ? "" : value}
        aria-invalid={bad ? true : undefined}
        onChange={(e) => {
          set(digits(e.target.value));
          if (bad) setBad("");
        }}
      />
    </label>
  );

  const body: Partial<Record<Step, ReactNode>> = {
    score: (
      <>
        <h1>{W.score.headline}</h1>
        {number(score, setScore, W.score.field, noScore)}
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
        <p className="rs-why">{noScore ? W.score.noneNote : W.score.why}</p>
      </>
    ),
    goal: (
      <>
        <h1>{say(W.goal.headline)}</h1>
        {number(goal, setGoal, W.goal.field)}
      </>
    ),
    hardest: (
      <>
        <h1>{W.hardest.headline}</h1>
        <div className="ob-opts" role="radiogroup" aria-label={W.hardest.headline}>
          {HARDEST.map((k) => (
            <button
              type="button"
              role="radio"
              aria-checked={hardest === k}
              key={k}
              onClick={() => setHardest(k)}
            >
              {W.hardest.options[k]}
            </button>
          ))}
        </div>
      </>
    ),
    times: (
      <>
        <h1>{say(W.times.headline)}</h1>
        <div className="ob-opts" role="group" aria-label={say(W.times.headline)}>
          {CLASS_TIMES.map((k) => (
            <button
              type="button"
              aria-pressed={times.includes(k)}
              key={k}
              onClick={() => {
                setBad("");
                setTimes((old) => (old.includes(k) ? old.filter((x) => x !== k) : [...old, k]));
              }}
            >
              {W.times.options[k]}
            </button>
          ))}
        </div>
      </>
    ),
    note: (
      <>
        <h1>{W.note.headline}</h1>
        <label className="rs-pill" data-filled={note ? true : undefined}>
          <span>{W.note.field}</span>
          <input
            type="text"
            maxLength={400}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </label>
        <p className="rs-why">{W.note.skip}</p>
      </>
    ),
  };

  return (
    <div className="ob">
      <div className="ob-in">
        <div
          className="ob-trail"
          style={{ "--at": along } as React.CSSProperties}
          role="progressbar"
          aria-label="Progress"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(along * 100)}
        >
          <button
            type="button"
            className="ob-back"
            onClick={back}
            disabled={step === 0 || at === "done" || busy}
            aria-label="Back"
          >
            <svg viewBox="0 0 20 20" width="20" height="20" aria-hidden="true">
              <path
                d="M12 4l-6 6 6 6"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          <i />
          <b />
        </div>

        {moment ? null : <Guide say={said[at]} />}

        <form
          key={at}
          ref={card}
          className="rs-start"
          style={{ "--guide-from": `${dir * 22}px` } as React.CSSProperties}
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            if (!busy && at !== "done") next();
          }}
        >
          {moment ? (
            <Guide say={said[at]} big />
          ) : (
            <div className="ob-card rs-start">
              {body[at]}
              {bad ? (
                <p className="rs-msg" role="alert">
                  {bad}
                </p>
              ) : null}
            </div>
          )}
          {at === "done" ? (
            <>
              <Crew />
              <div className="ob-card rs-done" data-paid>
                <p className="rs-note">{W.doneNote}</p>
                {children}
              </div>
            </>
          ) : (
            // outside the card on purpose: on a phone it is fixed to the bottom of the screen
            <div className="ob-go">
              <button
                type="submit"
                className="btn"
                disabled={at === "hardest" && !hardest}
                data-busy={busy || undefined}
                suppressHydrationWarning
              >
                <span className="lb">
                  {at === "hello"
                    ? W.helloButton
                    : at === "note"
                      ? busy
                        ? W.saving
                        : W.finish
                      : W.next}
                </span>
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
