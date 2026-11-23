"use client";

// Four answer choices that can be tapped once. After a tap the right one turns green, a wrong pick turns
// red, the rest fade, and the reason shows. Used by a Reading example (try it before the steps) and by
// the quick check. Choices are named by letter A to D, as on the test.
import { useState } from "react";
import type { Rich } from "@/lib/lessons/types";
import { LessonText } from "./LessonText";
import styles from "./lesson.module.css";

const LETTERS = ["A", "B", "C", "D"];

function Mark({ right }: { right: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
      {right ? <path d="M5 12.5l4.5 4.5L19 7.5" /> : <path d="M7 7l10 10M17 7L7 17" />}
    </svg>
  );
}

export function Choices({
  choices,
  right,
  why,
  onPick,
  label,
}: {
  choices: Rich[];
  right: number;
  /** The reason, shown after a pick. */
  why?: Rich;
  onPick?: (choice: number) => void;
  label: string;
}) {
  const [picked, setPicked] = useState<number | null>(null);
  const done = picked !== null;
  const state = (i: number) =>
    !done ? undefined : i === right ? "right" : i === picked ? "wrong" : "faded";
  return (
    <>
      <ul className={styles.choices} aria-label={label}>
        {choices.map((c, i) => (
          <li key={i}>
            <button
              type="button"
              className={styles.choice}
              data-state={state(i)}
              disabled={done}
              aria-pressed={picked === i}
              onClick={() => {
                setPicked(i);
                onPick?.(i);
              }}
            >
              <i>{LETTERS[i]}</i>
              <LessonText text={c} />
              {done && (i === right || i === picked) ? <Mark right={i === right} /> : <span />}
            </button>
          </li>
        ))}
      </ul>
      {done && (
        <p
          className={`${styles.why} ${styles.rise}`}
          data-right={picked === right || undefined}
          data-wrong={picked !== right || undefined}
          role="status"
        >
          <Mark right={picked === right} />
          <span>
            <b>{picked === right ? "Right. " : "Not quite. "}</b>
            {why && <LessonText text={why} />}
          </span>
        </p>
      )}
    </>
  );
}
