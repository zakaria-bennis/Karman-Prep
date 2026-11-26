"use client";
import MathText from "../MathText";
import { StemText } from "./StemText";
import ReviewedSinglePassage from "../ReviewedSinglePassage";
import type { StudentQuizQuestion } from "@/types/quiz";
import { unwrapProse } from "@/lib/quiz/stem-layout";
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
            <StemText text={q.passage_a} prompt={false} />
          </section>
        )}
        {q.passage_b && (
          <section data-ink-block="passage-b" style={{ marginTop: 28 }}>
            <p className={styles.section}>Text 2</p>
            <StemText text={q.passage_b} prompt={false} />
          </section>
        )}
      </article>
    );
  if (!q.reviewed_passage)
    return (
      <article data-ink-block="passage">
        {q.passage_intro && (
          <p className={styles.para}>
            <MathText text={unwrapProse(q.passage_intro)} />
          </p>
        )}
        {q.passage && <StemText text={q.passage} prompt={false} />}
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
