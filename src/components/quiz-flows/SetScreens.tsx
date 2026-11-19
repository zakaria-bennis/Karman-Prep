"use client";
// The skill set's two screens (founder, 2026-11-19, the third try: the first two were "bland" and
// "trash"). Each is built round one big thing, a ring with a bead for every question
// (SetRing.tsx), and is laid out three ways, for a phone, a tablet and a computer (ring.module.css).
//   SetStart  the skill's name over an empty ring that says how many questions wait; under it how
//             long the set takes, how it is checked, the tools it allows and the student's level
//             on its trail; Start under the thumb.
//   SetEnd    the last question's glass draws back and the ring comes out of it: a word for how
//             it went, the beads turning green or red in the order answered, the ring drawn to
//             the share that was right and the score counting up in its middle. A bead can be
//             pressed to see that answer. Then accuracy, time, pace and the best run, the coins
//             flying into their purse, and the level's marker travelling to where it now stands.
//             A level gained gets confetti and the one sound.
// Levels are shown as the founder names them (shown-level.ts).
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Coin } from "@/components/portal/Coin";
import type { RunView } from "@/lib/assembler/run-types";
import { playRewardSound } from "@/lib/quiz/reward-sound";
import { CoinBurst } from "./CoinBurst";
import { FlowStage, Go } from "./FlowStage";
import { LevelTrail, SetRing } from "./SetRing";
import { SHOWN_LEVELS, clockOf, minutesFor, shownLevel } from "./shown-level";
import { arrive, confetti, count, curtain, swell } from "./stage-motion";
import r from "./ring.module.css";
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

/** A word for how a set went, from the share that was right. */
export function verdictOf(right: number, total: number): string {
  if (total === 0) return "Set complete";
  const share = right / total;
  if (share === 1) return "Perfect set";
  if (share >= 0.75) return "Strong set";
  if (share >= 0.5) return "Getting there";
  return "Tough set";
}

/** The longest run of right answers in a row. */
export function bestRun(marks: boolean[]): number {
  let best = 0;
  let now = 0;
  for (const mark of marks) {
    now = mark ? now + 1 : 0;
    best = Math.max(best, now);
  }
  return best;
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
    const key = (e: KeyboardEvent) => {
      if (e.key !== "Enter" || busy || (e.target as Element).closest?.("a, button")) return;
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
      <div className={r.screen} ref={root}>
        <div className={r.hero}>
          <header className={r.head} data-rise>
            <h1>{name}</h1>
            <p>
              {domain} · {subject === "math" ? "Math" : "Reading and Writing"}
            </p>
          </header>
          <SetRing beads={Array.from({ length: questions }, () => null)}>
            <b className={r.big}>{questions}</b>
            <span className={r.of}>questions</span>
          </SetRing>
        </div>
        <ul className={r.facts} data-rise aria-label="About this set">
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
        <section className={r.card} data-rise aria-label="Your level">
          <small>Your level in {name}</small>
          <LevelTrail names={SHOWN_LEVELS} from={lit} to={lit} marker={<Coin size={26} />} />
        </section>
        <div className={r.foot}>
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
    </FlowStage>
  );
}

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
  const share = useRef<HTMLElement>(null);
  const purse = useRef<HTMLLIElement>(null);
  const coins = useRef<HTMLElement>(null);
  const [burst, setBurst] = useState(0);
  const [found, setFound] = useState<number | null>(null);

  const result = run.result;
  // a set on a whole skill can move several of its sub-skills: the three that moved most are shown
  const moves = (result?.skills ?? []).slice(0, 3).map((k) => ({
    skillId: k.skillId,
    label: k.label,
    from: shownLevel(k.from),
    to: shownLevel(k.to),
  }));
  const up = moves.some((m) => m.to > m.from);
  const right = result?.right ?? 0;
  const total = result?.total ?? 0;
  const tokens = result?.tokens ?? 0;
  const percent = total ? Math.round((right / total) * 100) : 0;
  const took = run.completedAt ? Date.parse(run.completedAt) - Date.parse(run.startedAt) : 0;
  const time = clockOf(took);
  // a pace is only said when the time is known
  const pace = total && time ? clockOf(took / total) : null;
  const flying = Math.min(18, Math.max(tokens > 0 ? 5 : 0, Math.round(tokens / 5)));

  useEffect(() => {
    const undo = [
      curtain(veil.current, stage.current),
      arrive(stage.current),
      count(score.current, right, 0.9),
      count(share.current, percent, 1.2),
      up ? confetti(stage.current, 2.9) : undefined,
    ];
    const timers = [
      // coins leave once the ring is drawn; with less motion asked for, none fly
      window.setTimeout(() => setBurst(1), 1700),
      // one sound for the one real moment: a level gained, as the marker lands
      up ? window.setTimeout(() => playRewardSound("levelUp"), 2900) : 0,
    ];
    return () => {
      undo.forEach((stop) => stop?.());
      timers.forEach((t) => window.clearTimeout(t));
    };
  }, [right, percent, up]);

  // Enter takes the next step, as it started the set
  const next = up ? (againHref ?? exitHref) : (lessonHref ?? againHref ?? exitHref);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key !== "Enter" || (e.target as Element).closest?.("a, button")) return;
      window.location.assign(next);
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [next]);

  if (!result) return null;
  const given = run.sections.flatMap((section) =>
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
  const move = moves[0];

  return (
    <FlowStage back={{ href: exitHref, label: "Done" }}>
      <div className={s.veil} ref={veil} aria-hidden="true">
        <b>Set complete</b>
      </div>
      <CoinBurst
        className={s.burst}
        coins={flying}
        play={burst}
        target={purse}
        onLand={(landed, of) => {
          if (coins.current) coins.current.textContent = `+${Math.round((tokens * landed) / of)}`;
          swell(purse.current?.querySelector("svg") ?? null);
        }}
      />
      <div className={r.screen} ref={stage} data-up={up || undefined}>
        <div className={r.hero}>
          <header className={r.head} data-rise>
            <h1>{verdictOf(right, total)}</h1>
            <p>{run.title}</p>
          </header>
          <SetRing
            beads={given.map((a) => ({ right: a.right }))}
            share={total ? right / total : 0}
            chosen={found}
            onChoose={(i) => setFound(found === i ? null : i)}
          >
            <b className={r.big} ref={score} aria-hidden="true">
              {right}
            </b>
            <span className={r.of} aria-label={`${right} of ${total} right`}>
              of {total} right
            </span>
          </SetRing>
          {shown ? (
            <p className={r.shown} key={found} data-right={shown.right || undefined}>
              <i aria-hidden="true">{(found ?? 0) + 1}</i>
              <span>
                <b>{shown.yours}</b>
                {!shown.right && shown.answer && <small>Answer: {shown.answer}</small>}
              </span>
              <em>{shown.right ? "Right" : "Missed"}</em>
            </p>
          ) : (
            <p className={r.hint}>Press a bead to see that answer</p>
          )}
        </div>

        <ul className={r.numbers} aria-label="How it went">
          <li data-rise>
            <b>
              <i ref={share}>{percent}</i>%
            </b>
            <span>Accuracy</span>
          </li>
          <li data-rise>
            <b>{time ?? "–"}</b>
            <span>Time</span>
          </li>
          <li data-rise>
            <b>{pace ?? "–"}</b>
            <span>A question</span>
          </li>
          <li data-rise>
            <b>{bestRun(given.map((a) => a.right))}</b>
            <span>Best run in a row</span>
          </li>
          <li data-rise ref={purse} className={r.purse}>
            <button
              type="button"
              onClick={() => tokens > 0 && setBurst((n) => n + 1)}
              aria-label={`${tokens} coins earned`}
            >
              <b>
                <Coin size={30} />
                <i ref={coins}>+{tokens}</i>
              </b>
              <span>Coins earned</span>
            </button>
          </li>
        </ul>

        {move && (
          <section className={r.card} data-rise aria-label="Level">
            <small>
              {move.to > move.from
                ? `Level up: ${SHOWN_LEVELS[move.to]}`
                : move.to < move.from
                  ? `Level: down to ${SHOWN_LEVELS[move.to]}`
                  : `Level: still ${SHOWN_LEVELS[move.to]}`}
            </small>
            <LevelTrail
              names={SHOWN_LEVELS}
              from={move.from}
              to={move.to}
              marker={<Coin size={26} />}
            />
          </section>
        )}

        <div className={r.foot} data-rise>
          <Go href={next} hint="Enter">
            {up ? "Another set" : lessonHref ? "Lesson" : "Try again"}
          </Go>
          {!up && lessonHref && againHref && (
            <Link className={s.second} href={againHref}>
              Try again
            </Link>
          )}
        </div>
      </div>
    </FlowStage>
  );
}
