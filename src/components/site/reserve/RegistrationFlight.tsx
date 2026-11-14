"use client";

// Right after payment (founder, 2026-11-13: "pay first"): the few questions that get the student started,
// asked as a flight seen through a bird's eyes. It tells one story: high above the clouds, down through the
// valley, and a landing at an observatory, by day or by night. The live landscape moves forward with each
// answer and keeps drifting in between (karman:fly). Karman the fox does the talking; he is the earnable
// fox face from the quiz engine. The buyer has already paid, so this is a welcome, not a hurdle: four
// short questions, saved once at the end. At the landing the student's account is set up with a link that
// belongs to this seat alone and works once.
// Words: reserve-copy.ts (start). Styles: app/onboarding/intake.css.
import { useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import { Guide } from "@/app/onboarding/_steps/Guide";
import { saveStart } from "@/app/(site)/reserve/actions";
import { track } from "@/lib/analytics/client";
import { okScore } from "@/lib/marketing/lead-rules";
import { RESERVE } from "@/lib/marketing/reserve-copy";
import { CLASS_TIMES, HARDEST } from "@/lib/reserve/schemas";
import { Observatory } from "./Observatory";

const W = RESERVE.start;
const STEPS = ["hello", "score", "goal", "gap", "hardest", "times", "note", "done"] as const;
type Step = (typeof STEPS)[number];
type Hardest = (typeof HARDEST)[number];
type Time = (typeof CLASS_TIMES)[number];
const digits = (v: string) => v.replace(/\D/g, "").slice(0, 4);
/** Where each step is along the landscape's route: from above the clouds (0) down into the valley. */
const LEG = 0.065;
/** How far the view may drift on by itself while a question is on screen. */
const DRIFT = 0.04;

export default function RegistrationFlight({
  token,
  parentToken,
  name,
  filledBy,
  claimed = false,
  landed = false,
}: {
  token: string;
  /** Opens the parent portal for this seat (the parents' own link). */
  parentToken: string;
  /** The student's first name. */
  name: string;
  /** Who filled in the reservation: the landing offers a link to send, or the account button itself. */
  filledBy: "parent" | "student";
  /** The seat already has its account. */
  claimed?: boolean;
  /** The questions were answered on an earlier visit: open on the landing. */
  landed?: boolean;
}) {
  const [step, setStep] = useState(landed ? STEPS.length - 1 : 0);
  const [dir, setDir] = useState<1 | -1>(1);
  const [score, setScore] = useState("");
  const [noScore, setNoScore] = useState(false);
  const [goal, setGoal] = useState("");
  const [hardest, setHardest] = useState<Hardest | null>(null);
  const [times, setTimes] = useState<Time[]>([]);
  const [note, setNote] = useState("");
  const [bad, setBad] = useState("");
  const [copied, setCopied] = useState(false);
  const [busy, start] = useTransition();
  const card = useRef<HTMLFormElement>(null);
  const at: Step = STEPS[step];
  const say = (t: string) => t.replaceAll("{name}", name);
  const claim = `/reserve/claim?r=${encodeURIComponent(token)}`;

  // The flight: each answer is a leg, and between answers the view keeps drifting forward, so the
  // landscape is never still. Each step is measured (never what was answered).
  useEffect(() => {
    const base = step * LEG;
    let drift = 0;
    const fly = (p: number) => {
      const ks = document.getElementById("ks");
      if (ks) ks.dataset.flown = String(p);
      document.dispatchEvent(new CustomEvent("karman:fly", { detail: p }));
    };
    fly(base);
    const still = () =>
      matchMedia("(prefers-reduced-motion: reduce)").matches ||
      !!document.getElementById("ks")?.classList.contains("still-motion");
    const t = setInterval(() => {
      if (document.hidden || still() || drift >= DRIFT) return;
      drift += 0.0009;
      fly(base + drift);
    }, 160);
    track("form_step", { form: "reserve", step: `start-${STEPS[step]}`, kind: "view" });
    if (step > 0) card.current?.querySelector<HTMLElement>("input[type='text']")?.focus();
    return () => clearInterval(t);
  }, [step]);

  const go = (to: number) => {
    setBad("");
    setDir(to > step ? 1 : -1);
    setStep(to);
  };
  const back = () => go(STEPS[step - 1] === "gap" ? step - 2 : step - 1);

  /** A check failed: say so, and put the cursor back in the field. */
  const fail = (msg: string) => {
    setBad(msg);
    card.current?.querySelector<HTMLElement>("input[type='text']")?.focus();
  };
  const next = () => {
    if (at === "score" && !noScore && !okScore(score, 400)) return fail(W.errors.score);
    if (at === "goal" && !okScore(goal, 400)) return fail(W.errors.score);
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
    const d = Number(goal) - Number(score);
    return noScore || d <= 0
      ? W.gapNoStart.replace("{to}", goal)
      : W.gap.replace("{from}", score).replace("{to}", goal).replace("{gap}", String(d));
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

  /** The student's own link: shared with the phone's share sheet where there is one, or copied. */
  const send = async () => {
    const url = new URL(claim, location.origin).href;
    track("form_step", { form: "reserve", step: "start-done", kind: "choice", value: "send-link" });
    try {
      if (navigator.share) return await navigator.share({ text: `${W.land.shareText} ${url}` });
    } catch {
      // the share sheet was closed: fall through to copying
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2400);
    } catch {
      // nothing more to try: the link is also in the confirmation email
    }
  };

  const number = (value: string, set: (v: string) => void, label: string, off = false) => (
    <label
      className="rs-pill ob-num"
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
        <p className="rs-why">{noScore ? say(W.score.noneNote) : W.score.why}</p>
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
                setTimes((t) => (t.includes(k) ? t.filter((x) => x !== k) : [...t, k]));
                setBad("");
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

  const landing = (
    <div className="ob-land">
      <section className="ob-card ob-link">
        {claimed ? (
          <>
            <h2>{say(W.land.studentTitle)}</h2>
            <p>{RESERVE.welcome.claimed}</p>
            <a className="btn" href="/auth/sign-in" suppressHydrationWarning>
              <span className="lb">{RESERVE.welcome.signIn}</span>
            </a>
          </>
        ) : filledBy === "student" ? (
          <>
            <h2>{W.land.mineTitle}</h2>
            <p>{W.land.mineText}</p>
            <a className="btn" href={claim} suppressHydrationWarning>
              <span className="lb">{W.land.mine}</span>
            </a>
          </>
        ) : (
          <>
            <h2>{say(W.land.studentTitle)}</h2>
            <p>{say(W.land.studentText)}</p>
            <button type="button" className="btn" onClick={send} suppressHydrationWarning>
              <span className="lb">{copied ? W.land.copied : say(W.land.share)}</span>
            </button>
          </>
        )}
      </section>
      {filledBy === "parent" ? (
        <section className="ob-card ob-link">
          <h2>{W.land.parentTitle}</h2>
          <p>{W.land.parentText}</p>
          <a
            className="btn"
            href={`/reserve/parent?p=${encodeURIComponent(parentToken)}`}
            suppressHydrationWarning
          >
            <span className="lb">{W.land.parentButton}</span>
          </a>
        </section>
      ) : null}
      <section className="ob-card ob-after">
        <h2>{W.land.then}</h2>
        <ol>
          {W.land.steps.map(([when, what]) => (
            <li key={when}>
              <b>{when}</b>
              <span>
                {filledBy === "student"
                  ? what.replace("{name}'s", "Your").replace("{name}", "you")
                  : say(what)}
              </span>
            </li>
          ))}
        </ol>
        <p className="rs-why">{W.land.help}</p>
      </section>
    </div>
  );

  return (
    <div className="ob" data-landed={at === "done" || undefined}>
      {at === "done" ? <Observatory /> : null}
      <div className="ob-in">
        {at === "done" ? null : (
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
              disabled={step === 0 || busy}
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
        )}

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
            landing
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
