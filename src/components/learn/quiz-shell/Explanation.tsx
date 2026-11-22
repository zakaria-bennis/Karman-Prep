"use client";
import type { ReactNode } from "react";
import type { StudentQuizQuestion, StudentQuizReview } from "@/types/quiz";
import MathText from "../MathText";
import { raisePowers } from "@/lib/quiz/tidy-math";
import styles from "./pane.module.css";

/** The explanation after grading (instant mode) or in review (locked mode). `action` sits at the
 *  right of its title (the second chance, after a miss). */
export function Explanation({
  q,
  review,
  action,
}: {
  q: StudentQuizQuestion;
  review: StudentQuizReview;
  action?: ReactNode;
}) {
  const perChoice = (review.explanation_per_choice ?? null) as Record<
    string,
    string | undefined
  > | null;
  return (
    <section aria-label="Explanation" className={styles.explanation} data-ink-block="explanation">
      {action ? (
        <div className={styles.explanationHead}>
          <h3 className={styles.explanationTitle}>Explanation</h3>
          {action}
        </div>
      ) : (
        <h3 className={styles.explanationTitle}>Explanation</h3>
      )}
      {review.explanation_text && (
        <MathText
          text={raisePowers(review.explanation_text)}
          className="block whitespace-pre-wrap"
        />
      )}
      {perChoice &&
        q.answer_format === "multiple_choice" &&
        ["A", "B", "C", "D"].map((letter) =>
          perChoice[letter] ? (
            <p key={letter} style={{ marginTop: 10 }}>
              <strong>{letter}. </strong>
              <MathText text={raisePowers(perChoice[letter]!)} />
            </p>
          ) : null
        )}
      {q.subject === "math" && review.desmos_strategy && (
        <div style={{ marginTop: 14 }}>
          <h4 className={styles.explanationTitle}>Calculator strategy</h4>
          <MathText text={review.desmos_strategy} className="block whitespace-pre-wrap" />
        </div>
      )}
    </section>
  );
}
