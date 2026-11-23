"use client";
// The skill set's two screens (founder, 2026-11-19, fourth try: he rejected the ring of beads).
//   SetStart  the student's character on a burst of the subject's colour, the skill's name, how
//             long the set takes, how it is checked, its tools, and the level on a bar. Start
//             under the thumb.
//   SetEnd    an ending in stages that comes down to one full screen:
//               1 the score      the character arrives, a word for how it went, the answers
//                                lighting up one by one;
//               2 the coins      they fly up into the counter in the corner, which counts;
//               3 the level      its bar fills slowly from where the skill was to where it is,
//                                and the level's name changes as it crosses;
//               4 the summary    all of it on one screen: score, each answer (press one to see
//                                it), time and pace beside the test's own pace, level, coins,
//                                and what to do next.
//             A press anywhere moves a stage on; Skip goes straight to the summary; with less
//             motion asked for the summary is simply there.
// Levels are shown as the founder names them (shown-level.ts). The character is the fox until the
// one the student has chosen is kept with their account.
import Link from "next/link";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Coin } from "@/components/portal/Coin";
import { Fox } from "@/components/portal/Fox";
import type { RunView } from "@/lib/assembler/run-types";
import { prefersStill } from "@/lib/painting/motion";
import { playRewardSound } from "@/lib/quiz/reward-sound";
import { CoinBurst } from "./CoinBurst";
import { FlowStage, Go } from "./FlowStage";
import { SHOWN_LEVELS, clockOf, minutesFor, shownLevel } from "./shown-level";
import { arrive, confetti, count, curtain, swell } from "./stage-motion";
import e from "./ending.module.css";
import s from "./stage.module.css";

const ICON = {
  time: <path d="M12 7.500V12l3 2M12 3.500a8.500 8.500 0 1 0 0 17 8.500 8.500 0 0 0 0-17z" />,
  check: (
    <path d="M8 12.300l2.700 2.700L16 9.500M12 3.500a8.500 8.500 0 1 0 0 17 8.500 8.500 0 0 0 0-17z" />
  ),
  tools: (
    <path d="M14.500 5.500a4 4 0 0 0-5 5L4 16l1.500 2.500L8 20l5.500-5.500a4 4 0 0 0 5-5L16 12l-2-.500-.500-2z" />
  ),
};
const LAST = SHOWN_LEVELS.length - 1;
/** The digital SAT's own pace, in seconds a question: 35 minutes for 22 in Math, 32 for 27 in
 *  Reading and Writing. */
const TEST_PACE = { math: 95, reading: 71 } as const;

/** A word for how a set went, from the share that was right. */
export function verdictOf(right: number, total: number): string {
  if (total === 0) return "Set complete";
  const share = right / total;
  if (share === 1) return "Perfect set";
  if (share >= 0.75) return "Strong set";
  if (share >= 0.5) return "Getting there";
  return "Tough set";
}

/** Which colours the ending wears: gold for a strong set, blue for a middling one, rose for a
 *  hard one. */
export function toneOf(right: number, total: number): "gold" | "blue" | "rose" {
  const share = total ? right / total : 0;
  return share >= 0.75 ? "gold" : share >= 0.5 ? "blue" : "rose";
}

/** The character on a slow burst of colour. */
function Hero({ size }: { size: number }) {
  return (
    <div className={e.hero} style={{ "--hero": `${size}px` } as CSSProperties} aria-hidden="true">
      <i className={e.rays} />
      <i className={e.glow} />
      <span className={e.who}>
        <Fox size={size * 0.62} />
      </span>
    </div>
  );
}

/** The level as a bar under its name. With `from` it starts there and fills slowly to `to`, and
 *  the name changes as the bar gets there. */
function LevelBar({ to, from = to, play = false }: { to: number; from?: number; play?: boolean }) {
  const [name, setName] = useState(SHOWN_LEVELS[play ? from : to]);
  useEffect(() => {
    if (!play || from === to) return setName(SHOWN_LEVELS[to]);
    setName(SHOWN_LEVELS[from]);
    const timer = window.setTimeout(() => setName(SHOWN_LEVELS[to]), 1500);
    return () => window.clearTimeout(timer);
  }, [play, from, to]);
  return (
    <div
      className={e.level}
      data-play={(play && from !== to) || undefined}
      style={{ "--from": from / LAST, "--to": to / LAST } as CSSProperties}
      role="img"
      aria-label={`Level: ${SHOWN_LEVELS[to]}`}
    >
      <b key={name}>{name}</b>
      <div className={e.bar}>
        <i />
        {Array.from({ length: LAST - 1 }, (_, i) => (
          <span key={i} style={{ left: `${((i + 1) / LAST) * 100}%` }} />
        ))}
      </div>
      <ol>
        {SHOWN_LEVELS.map((level) => (
          <li key={level}>{level}</li>
        ))}
      </ol>
    </div>
  );
}

export function SetStart({
  name,
  domain,
  subject,
  level,
  questions,
  onStart,
  busy,
  exitHref,
  lessonHref,
}: {
  name: string;
  /** The domain the skill belongs to ("Geometry and Trigonometry"). */
  domain: string;
  subject: "math" | "reading";
  /** The student's level in this skill, as the engine keeps it (0 to 4). */
  level: number;
  questions: number;
  onStart: () => void;
  busy: boolean;
  exitHref: string;
  lessonHref?: string | null;
}) {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => arrive(root.current), []);
  // the screen exists to be started: Enter begins it, wherever the focus is
  useEffect(() => {
    const key = (ev: KeyboardEvent) => {
      if (ev.key !== "Enter" || busy || (ev.target as Element).closest?.("a, button")) return;
      onStart();
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [busy, onStart]);
  const lit = shownLevel(level);
  const tools =
    subject === "math" ? "Calculator, Reference, Pencil" : "Highlighter, Pencil, Cross out";
  return (
    <FlowStage back={{ href: exitHref, label: "Back" }}>
      <div className={e.screen} ref={root} data-tone={subject === "math" ? "blue" : "gold"}>
        <div className={e.lead}>
          <Hero size={220} />
          <header className={e.name} data-rise>
            <h1>{name}</h1>
            <p>
              {domain} · {subject === "math" ? "Math" : "Reading and Writing"}
            </p>
          </header>
        </div>
        <div className={e.side}>
          <ul className={e.facts} data-rise aria-label="About this set">
            <li>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M5 6.500h14M5 12h14M5 17.500h9" />
              </svg>
              <span>Questions</span>
              <b>{questions}</b>
            </li>
            <li>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                {ICON.time}
              </svg>
              <span>Takes about</span>
              <b>{minutesFor(questions, subject)} minutes</b>
            </li>
            <li>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                {ICON.check}
              </svg>
              <span>Checked</span>
              <b>After every answer</b>
            </li>
            <li>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                {ICON.tools}
              </svg>
              <span>Tools</span>
              <b>{tools}</b>
            </li>
          </ul>
          <section className={e.card} data-rise aria-label="Your level">
            <small>Your level</small>
            <LevelBar to={lit} />
          </section>
          <div className={e.foot}>
            <Go onClick={onStart} busy={busy} hint="Enter">
              Start
            </Go>
            {lessonHref && (
              <Link className={s.second} href={lessonHref} data-rise>
                Lesson
              </Link>
            )}
          </div>
        </div>
      </div>
    </FlowStage>
  );
}

type Given = { id: string; right: boolean; yours: string; answer: string };

/** The answers in order, as dots. With `onChoose` each is a button that shows that answer. */
function Dots({
  given,
  chosen,
  onChoose,
}: {
  given: Given[];
  chosen?: number | null;
  onChoose?: (index: number) => void;
}) {
  return (
    <ol className={e.dots} aria-label="Your answers in order">
      {given.map((a, i) => (
        <li key={a.id} style={{ "--i": i } as CSSProperties}>
          {onChoose ? (
            <button
              type="button"
              data-right={a.right || undefined}
              aria-pressed={chosen === i}
              aria-label={`Question ${i + 1}: ${a.right ? "right" : "missed"}`}
              onClick={() => onChoose(i)}
            >
              {i + 1}
            </button>
          ) : (
            <i data-right={a.right || undefined}>{i + 1}</i>
          )}
        </li>
      ))}
    </ol>
  );
}

const SUMMARY = 3;

export function SetEnd({
  run,
  exitHref,
  lessonHref,
  againHref,
}: {
  run: RunView;
  exitHref: string;
  lessonHref?: string | null;
  againHref?: string;
}) {
  const stage = useRef<HTMLDivElement>(null);
  const veil = useRef<HTMLDivElement>(null);
  const score = useRef<HTMLElement>(null);
  const corner = useRef<HTMLDivElement>(null);
  const coins = useRef<HTMLElement>(null);
  const [step, setStep] = useState(0);
  const [burst, setBurst] = useState(0);
  const [found, setFound] = useState<number | null>(null);

  const result = run.result;
  const move = (result?.skills ?? []).slice(0, 1).map((k) => ({
    from: shownLevel(k.from),
    to: shownLevel(k.to),
  }))[0];
  const up = !!move && move.to > move.from;
  const right = result?.right ?? 0;
  const total = result?.total ?? 0;
  const tokens = result?.tokens ?? 0;
  const took = run.completedAt ? Date.parse(run.completedAt) - Date.parse(run.startedAt) : 0;
  const time = clockOf(took);
  // a pace is only said when the time is known
  const pace = total && time ? clockOf(took / total) : null;
  const subject = run.sections[0]?.subject ?? "math";
  const flying = Math.min(18, Math.max(tokens > 0 ? 5 : 0, Math.round(tokens / 5)));
  // which stages there are: no coins stage with none earned, no level stage with no level kept
  const stages = [0, ...(tokens > 0 ? [1] : []), ...(move ? [2] : []), SUMMARY];
  const next = () => setStep((now) => stages[stages.indexOf(now) + 1] ?? SUMMARY);

  // the curtain, then the stages one after another
  useEffect(() => {
    if (prefersStill()) {
      curtain(veil.current, null);
      setStep(SUMMARY);
      return;
    }
    const undo = curtain(veil.current, null);
    return () => undo?.();
  }, []);
  useEffect(() => {
    if (step === SUMMARY) return;
    // a level that did not move is shown for less time: there is nothing to watch
    const hold =
      step === 0 ? 3600 : step === 1 ? 2600 : move && move.to !== move.from ? 3800 : 2000;
    const timer = window.setTimeout(next, hold);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);
  // what each stage sets going
  useEffect(() => {
    if (step === 0) return count(score.current, right, 1.5);
    if (step === 1) {
      const timer = window.setTimeout(() => setBurst((n) => n + 1), 350);
      return () => window.clearTimeout(timer);
    }
    if (step === 2 && up) {
      const undo = confetti(stage.current, 1.7);
      // one sound for the one real moment: a level gained, as the bar gets there
      const timer = window.setTimeout(() => playRewardSound("levelUp"), 1700);
      return () => (undo?.(), window.clearTimeout(timer));
    }
    if (step === SUMMARY) {
      if (coins.current) coins.current.textContent = `+${tokens}`;
      return arrive(stage.current);
    }
  }, [step, right, tokens, up]);

  // Enter takes the next step, as it started the set
  const onward = up ? (againHref ?? exitHref) : (lessonHref ?? againHref ?? exitHref);
  useEffect(() => {
    const key = (ev: KeyboardEvent) => {
      if (ev.key !== "Enter" || (ev.target as Element).closest?.("a, button")) return;
      if (step === SUMMARY) window.location.assign(onward);
      else setStep(SUMMARY);
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [onward, step]);

  if (!result) return null;
  const given: Given[] = run.sections.flatMap((section) =>
    section.questions.map((q) => {
      const review = run.reviews[q.id];
      return {
        id: q.id,
        right: !!review?.isCorrect,
        yours: review?.studentAnswer?.trim() || "No answer",
        answer: review?.correct_answer?.trim() ?? "",
      };
    })
  );
  const shown = found === null ? null : given[found];
  const verdict = verdictOf(right, total);
  const levelLine = !move
    ? null
    : move.to > move.from
      ? `Up from ${SHOWN_LEVELS[move.from]}`
      : move.to < move.from
        ? `Down from ${SHOWN_LEVELS[move.from]}`
        : "Same level as before";

  return (
    <FlowStage back={{ href: exitHref, label: "Done" }}>
      <div className={s.veil} ref={veil} aria-hidden="true">
        <b>Set complete</b>
      </div>
      <CoinBurst
        className={s.burst}
        coins={flying}
        play={burst}
        target={corner}
        onLand={(landed, of) => {
          if (coins.current) coins.current.textContent = `+${Math.round((tokens * landed) / of)}`;
          swell(corner.current?.querySelector("svg") ?? null);
        }}
      />
      {/* the coin counter, up in the corner: the coins fly to it */}
      {tokens > 0 && (
        <div
          className={e.corner}
          ref={corner}
          data-on={step >= 1 || undefined}
          aria-label={`${tokens} coins earned`}
        >
          <Coin size={24} />
          <b ref={coins}>+0</b>
        </div>
      )}
      <div
        className={e.end}
        ref={stage}
        data-tone={toneOf(right, total)}
        data-step={step}
        onClick={(ev) => {
          if (step !== SUMMARY && !(ev.target as Element).closest("a, button")) next();
        }}
      >
        {step !== SUMMARY ? (
          <div className={e.spot}>
            <Hero size={240} />
            {step === 0 && (
              <section className={e.act} key="score" aria-live="polite">
                <h1>{verdict}</h1>
                <p className={e.big}>
                  <b ref={score} aria-hidden="true">
                    0
                  </b>
                  <span aria-label={`${right} of ${total} right`}>of {total}</span>
                </p>
                <Dots given={given} />
              </section>
            )}
            {step === 1 && (
              <section className={e.act} key="coins" aria-live="polite">
                <h1>Coins earned</h1>
                <p className={e.big}>
                  <Coin size={54} />
                  <b>+{tokens}</b>
                </p>
              </section>
            )}
            {step === 2 && move && (
              <section className={e.act} key="level" aria-live="polite">
                <h1>{up ? "Level up" : "Your level"}</h1>
                <LevelBar from={move.from} to={move.to} play />
              </section>
            )}
            <button type="button" className={e.skip} onClick={() => setStep(SUMMARY)}>
              Skip
            </button>
          </div>
        ) : (
          <div className={e.screen}>
            <div className={e.lead}>
              <Hero size={170} />
              <header className={e.name} data-rise>
                <h1>{verdict}</h1>
                <p>{run.title}</p>
              </header>
            </div>
            <div className={e.side}>
              <section className={e.card} data-rise aria-label="Score">
                <p className={e.line}>
                  <b aria-label={`${right} of ${total} right`}>
                    {right}
                    <small> of {total} right</small>
                  </b>
                </p>
                <Dots
                  given={given}
                  chosen={found}
                  onChoose={(i) => setFound(found === i ? null : i)}
                />
                {shown ? (
                  <p className={e.shown} key={found} data-right={shown.right || undefined}>
                    <span>
                      <b>{shown.yours}</b>
                      {!shown.right && shown.answer && <small>Answer: {shown.answer}</small>}
                    </span>
                    <em>{shown.right ? "Right" : "Missed"}</em>
                  </p>
                ) : (
                  <p className={e.hint}>Press a number to see that answer</p>
                )}
              </section>
              <ul className={e.pair} aria-label="Time and pace">
                <li data-rise>
                  <b>{time ?? "–"}</b>
                  <span>Time</span>
                </li>
                <li data-rise>
                  <b>{pace ?? "–"}</b>
                  <span>A question · the SAT allows {clockOf(TEST_PACE[subject] * 1000)}</span>
                </li>
              </ul>
              {move && (
                <section className={e.card} data-rise aria-label="Level">
                  <small>{levelLine}</small>
                  <LevelBar to={move.to} />
                </section>
              )}
              <div className={e.foot} data-rise>
                <Go href={onward} hint="Enter">
                  {up ? "Another set" : lessonHref ? "Lesson" : "Try again"}
                </Go>
                {!up && lessonHref && againHref && (
                  <Link className={s.second} href={againHref}>
                    Try again
                  </Link>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </FlowStage>
  );
}
