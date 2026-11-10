"use client";
// The level-up moment, sized to the win: the skill's square paints in, a small banner names the
// new level, and the fox reacts. It sits under the question; nothing covers the question.
import { useEffect } from "react";
import { Fox, levelName } from "@/components/portal";
import { playRewardSound } from "@/lib/quiz/reward-sound";
import s from "./flows.module.css";

export type LevelChange = { skill: string; from: number; to: number };

export function LevelBanner({ change, sound = true }: { change: LevelChange; sound?: boolean }) {
  useEffect(() => {
    if (sound && change.to >= 2) playRewardSound("levelUp");
  }, [change.to, sound]);
  return (
    <div className={s.levelBanner} role="status">
      <span className={s.fox} aria-hidden="true">
        <Fox size={40} />
      </span>
      <i className={s.paintSquare} data-level={change.to} aria-hidden="true" />
      <p>
        <b>{change.skill}</b> is now <b>{levelName(change.to)}</b>
      </p>
    </div>
  );
}

/** One shape per answer: a filled circle for right, an outlined cross for a miss. */
export function AnswerShapes({ answers }: { answers: { id: string; correct: boolean }[] }) {
  return (
    <ol className={s.shapes} aria-label="Your answers in order">
      {answers.map((a, i) => (
        <li key={a.id} aria-label={`Question ${i + 1}: ${a.correct ? "right" : "missed"}`}>
          {a.correct ? (
            <svg viewBox="0 0 20 20" aria-hidden="true">
              <circle cx="10" cy="10" r="8" className={s.right} />
            </svg>
          ) : (
            <svg viewBox="0 0 20 20" aria-hidden="true">
              <rect x="2.5" y="2.5" width="15" height="15" rx="2" className={s.miss} />
              <path d="M7 7l6 6M13 7l-6 6" className={s.missMark} />
            </svg>
          )}
        </li>
      ))}
    </ol>
  );
}

/** The level changes a run collected, listed on its end screen (one sound for the list). The
 * latest change per skill wins, so a skill that moved twice shows where it ended. */
export function LevelChanges({ changes }: { changes: readonly LevelChange[] }) {
  const latest = new Map<string, LevelChange>();
  for (const c of changes) {
    const first = latest.get(c.skill);
    latest.set(c.skill, first ? { ...c, from: first.from } : c);
  }
  const list = [...latest.values()].filter((c) => c.to !== c.from);
  if (list.length === 0) return null;
  return (
    <div className={s.levelChanges} aria-label="Level changes">
      {list.map((c, i) => (
        <LevelBanner key={c.skill} change={c} sound={i === 0} />
      ))}
    </div>
  );
}
