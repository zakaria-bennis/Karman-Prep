"use client";

// A worked example, shown one step at a time (worked examples, then faded ones: the research note
// docs/research/2026-11-22-lesson-design.md). The first step shows at once; "Next step" shows the
// next. In the faded example the student is asked to try the rest first. A Reading example is a real
// question: the student may pick an answer before the steps, and the steps then explain it.
import { useState } from "react";
import type { WorkedExample } from "@/lib/lessons/types";
import { CheckIn } from "./CheckIn";
import { Choices } from "./Choices";
import { Figure } from "./figures/Figure";
import { LessonText } from "./LessonText";
import styles from "./lesson.module.css";

function Arrow() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path d="M12 5v14M6 13l6 6 6-6" />
    </svg>
  );
}

function Pencil() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
      <path d="M4 20l1.2-4.6L15.6 5a2 2 0 0 1 2.8 0l.6.6a2 2 0 0 1 0 2.8L8.6 18.8z" />
      <path d="M13.5 7l3.5 3.5" />
    </svg>
  );
}

export function Example({ ex, n }: { ex: WorkedExample; n: number }) {
  // how many steps show; a faded example stops before its first "try it" step until asked
  const [shown, setShown] = useState(1);
  const [trying, setTrying] = useState(false);
  const all = shown >= ex.steps.length;
  const atTurn = ex.tryFrom !== undefined && shown === ex.tryFrom && !trying;

  return (
    <article className={styles.piece} aria-label={`Example ${n}: ${ex.title}`}>
      <div className={styles.pieceHead}>
        <small>Example {n}</small>
        <b>{ex.title}</b>
      </div>
      {ex.passage && (
        <div className={styles.passage}>
          <LessonText text={ex.passage} />
        </div>
      )}
      <p className={styles.problem}>
        <LessonText text={ex.problem} />
      </p>
      {ex.figure && <Figure fig={ex.figure} className={styles.exampleFigure} />}
      {ex.choices && ex.right !== undefined && (
        <Choices
          choices={ex.choices}
          right={ex.right}
          label={`Choices for example ${n}`}
          onPick={() => setShown(ex.steps.length)}
        />
      )}

      <ol className={styles.steps} aria-live="polite">
        {ex.steps.slice(0, shown).map((step, i) => (
          <li key={i} className={i > 0 ? styles.rise : undefined}>
            <div>
              <LessonText text={step.say} />
              {step.show && (
                <span className={styles.show}>
                  <LessonText text={step.show} display />
                </span>
              )}
            </div>
          </li>
        ))}
      </ol>

      {atTurn && (
        <p className={`${styles.turn} ${styles.rise}`}>
          <Pencil />
          Your turn: try the next step.
        </p>
      )}

      {all ? (
        <>
          <p className={`${styles.answer} ${styles.rise}`}>
            <small>Answer</small>
            <LessonText text={ex.answer} />
          </p>
          {ex.checkIn && <CheckIn q={ex.checkIn} n={n} />}
        </>
      ) : (
        <div className={styles.actions}>
          <button
            type="button"
            className={styles.pill}
            onClick={() => {
              if (atTurn) setTrying(true);
              setShown((k) => k + 1);
            }}
          >
            <Arrow />
            {atTurn ? "Check my step" : "Next step"}
          </button>
          {shown < ex.steps.length - 1 && (
            <button
              type="button"
              className={styles.pill}
              onClick={() => {
                setTrying(true);
                setShown(ex.steps.length);
              }}
            >
              Show all
            </button>
          )}
        </div>
      )}
    </article>
  );
}
