"use client";
// The skill set's two screens (founder, 2026-11-18), on the frosted stage.
//   SetStart  the skill's name, how many questions, one button. Nothing to read before starting.
//   SetEnd    what happened, in the order his end-screen rules give (2026-10-30): the score as the
//             hero with the answers in order under it, the skill's level, coins, one next step.
//             It fits one phone screen.
// The levels and their names are the engine's own (src/components/portal/skill-levels.ts): four
// earned levels, still called New, Learning, Understanding and Conquered there. The Library's three
// (Learning, Understanding, Proficient) arrive when the level rule is rewired; this screen will
// follow the engine then, with no change here but BARS.
import Link from "next/link";
import { useEffect, useRef } from "react";
import { levelName } from "@/components/portal/skill-levels";
import type { RunView } from "@/lib/assembler/run-types";
import { playRewardSound } from "@/lib/quiz/reward-sound";
import { FlowStage, Go } from "./FlowStage";
import { arrive, confetti, count, fill, land } from "./stage-motion";
import s from "./stage.module.css";

/** How many levels a skill can earn. */
const BARS = 4;

export function SetStart({
  name,
  questions,
  onStart,
  busy,
  exitHref,
  lessonHref,
}: {
  name: string;
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
  return (
    <FlowStage back={{ href: exitHref, label: "Back" }}>
      <div className={s.start} ref={root}>
        <h1 data-rise>{name}</h1>
        <p className={s.facts} data-rise>
          <span>{questions} questions</span>
          <span>Checked as you go</span>
        </p>
        <Go onClick={onStart} busy={busy}>
          Start
        </Go>
        {lessonHref && (
          <Link className={s.quiet} href={lessonHref} data-rise>
            Read the lesson
          </Link>
        )}
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
  const root = useRef<HTMLDivElement>(null);
  const score = useRef<HTMLElement>(null);
  const answers = useRef<HTMLOListElement>(null);
  const bars = useRef<HTMLSpanElement>(null);
  const coins = useRef<HTMLElement>(null);
  const result = run.result;
  const skill = result?.skills[0] ?? null;
  const from = skill?.from ?? 0;
  const to = skill?.to ?? 0;
  const up = to > from;
  const right = result?.right ?? 0;
  const tokens = result?.tokens ?? 0;

  useEffect(() => {
    const undo = [
      arrive(root.current),
      count(score.current, right),
      land(answers.current),
      fill(bars.current, from, to),
      count(coins.current, tokens, 1.1, "+"),
      up ? confetti(root.current) : undefined,
    ];
    // one sound for the one real moment: a level gained
    const sound = up ? window.setTimeout(() => playRewardSound("levelUp"), 1100) : 0;
    return () => {
      undo.forEach((stop) => stop?.());
      window.clearTimeout(sound);
    };
  }, [right, from, to, tokens, up]);

  if (!result) return null;
  const given = run.sections.flatMap((section) =>
    section.questions.map((q) => ({ id: q.id, right: !!run.reviews[q.id]?.isCorrect }))
  );
  return (
    <FlowStage back={{ href: exitHref, label: "Done" }}>
      <div className={s.end} ref={root}>
        <h1 data-rise>{run.title}</h1>
        <p className={s.score} data-rise aria-label={`${result.right} of ${result.total} right`}>
          <b ref={score}>{result.right}</b>
          <span>of {result.total}</span>
        </p>
        <ol className={s.answers} ref={answers} aria-label="Your answers in order">
          {given.map((a, i) => (
            <li
              key={a.id}
              data-right={a.right || undefined}
              aria-label={`Question ${i + 1}: ${a.right ? "right" : "missed"}`}
            />
          ))}
        </ol>
        {skill && (
          <p className={s.level} data-rise data-up={up || undefined}>
            <span className={s.bars} ref={bars} aria-hidden="true">
              {Array.from({ length: BARS }, (_, i) => (
                <i key={i} data-on={i < to || undefined} />
              ))}
            </span>
            <b>{levelName(to)}</b>
          </p>
        )}
        {result.tokens > 0 && (
          <p className={s.coins} data-rise>
            <i aria-hidden="true" />
            <b ref={coins}>+{result.tokens}</b>
            <span>coins</span>
          </p>
        )}
        <div className={s.actions}>
          {up ? (
            <Go href={againHref ?? exitHref}>Another set</Go>
          ) : (
            <Go href={lessonHref ?? againHref ?? exitHref}>
              {lessonHref ? "Read the lesson" : "Try again"}
            </Go>
          )}
          {!up && lessonHref && againHref && (
            <Link className={s.quiet} href={againHref} data-rise>
              Try again
            </Link>
          )}
        </div>
      </div>
    </FlowStage>
  );
}
