"use client";
import type { StudentQuizQuestion, StudentQuizReview } from "@/types/quiz";
import MathText from "../MathText";
import styles from "./pane.module.css";

/** The explanation after grading (instant mode) or in review (locked mode). */
export function Explanation({ q, review }: { q: StudentQuizQuestion; review: StudentQuizReview }) {
  const perChoice = (review.explanation_per_choice ?? null) as Record<
    string,
    string | undefined
  > | null;
  return (
    <section aria-label="Explanation" className={styles.explanation} data-ink-block="explanation">
      <h3 className={styles.explanationTitle}>Explanation</h3>
      {review.explanation_text && (
        <MathText text={review.explanation_text} className="block whitespace-pre-wrap" />
      )}
      {perChoice &&
        q.answer_format === "multiple_choice" &&
        ["A", "B", "C", "D"].map((letter) =>
          perChoice[letter] ? (
            <p key={letter} style={{ marginTop: 10 }}>
              <strong>{letter}. </strong>
              <MathText text={perChoice[letter]!} />
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
