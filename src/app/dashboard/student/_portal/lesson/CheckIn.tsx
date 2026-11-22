"use client";

// The check-in after a worked example (founder, round 2, 2026-11-22): one quick question of the same
// kind. A miss shows why, then a near-identical twin; the lesson goes on either way, and nothing is
// scored (no coins, no level).
import { useState } from "react";
import type { CheckIn as CheckInData } from "@/lib/lessons/types";
import { Choices } from "./Choices";
import { Figure } from "./figures/Figure";
import { LessonText } from "./LessonText";
import styles from "./lesson.module.css";

function Question({
  q,
  label,
  onPick,
}: {
  q: Omit<CheckInData, "twin">;
  label: string;
  onPick?: (choice: number) => void;
}) {
  return (
    <>
      {q.passage && (
        <div className={styles.passage}>
          <LessonText text={q.passage} />
        </div>
      )}
      <p className={styles.problem}>
        <LessonText text={q.text} />
      </p>
      {q.figure && <Figure fig={q.figure} className={styles.exampleFigure} />}
      <Choices choices={q.choices} right={q.right} why={q.why} label={label} onPick={onPick} />
    </>
  );
}

export function CheckIn({ q, n }: { q: CheckInData; n: number }) {
  const [missed, setMissed] = useState(false);
  return (
    <div className={`${styles.checkIn} ${styles.rise}`} aria-label={`Check-in for example ${n}`}>
      <div className={styles.pieceHead}>
        <small>Check in</small>
      </div>
      <Question
        q={q}
        label={`Check-in choices for example ${n}`}
        onPick={(i) => setMissed(i !== q.right)}
      />
      {missed && (
        <div className={`${styles.twin} ${styles.rise}`}>
          <div className={styles.pieceHead}>
            <small>One more</small>
          </div>
          <Question q={q.twin} label={`Second check-in choices for example ${n}`} />
        </div>
      )}
    </div>
  );
}
