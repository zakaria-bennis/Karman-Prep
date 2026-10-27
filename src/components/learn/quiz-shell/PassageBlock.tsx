"use client";
import MathText from "../MathText";
import ReviewedSinglePassage from "../ReviewedSinglePassage";
import type { StudentQuizQuestion } from "@/types/quiz";
import styles from "./quiz-shell.module.css";

export function hasPassage(q: StudentQuizQuestion): boolean {
  return !!(q.passage_intro || q.passage || q.passage_a || q.passage_b || q.reviewed_passage);
}

/** The reading passage. Each text block is an ink and highlight anchor. */
export function PassageBlock({ q }: { q: StudentQuizQuestion }) {
  if (q.passage_a || q.passage_b)
    return (
      <article>
        {q.passage_a && (
          <section data-ink-block="passage-a">
            <p className={styles.section}>Text 1</p>
            <MathText text={q.passage_a} className="block whitespace-pre-wrap" />
          </section>
        )}
        {q.passage_b && (
          <section data-ink-block="passage-b" style={{ marginTop: 28 }}>
            <p className={styles.section}>Text 2</p>
            <MathText text={q.passage_b} className="block whitespace-pre-wrap" />
          </section>
        )}
      </article>
    );
  return (
    <article data-ink-block="passage">
      <ReviewedSinglePassage
        intro={q.passage_intro}
        passage={q.passage}
        display={q.reviewed_passage}
      />
    </article>
  );
}
