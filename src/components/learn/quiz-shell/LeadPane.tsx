"use client";
// The left pane of a question split in two (pane-plan.ts): a reading question's passage, a math
// question's figure, or a long math question's setup. The question itself stays on the right.
import { figureLeadsText } from "@/lib/figures/figure-order";
import { splitMathStem } from "@/lib/quiz/stem-layout";
import type { StudentQuizQuestion } from "@/types/quiz";
import MathText from "../MathText";
import { FigureSlot } from "./FigureSlot";
import type { PanePlan } from "./pane-plan";
import { StemText } from "./StemText";
import styles from "./quiz-shell.module.css";

export function LeadPane({
  q,
  plan,
  calculator,
}: {
  q: StudentQuizQuestion;
  plan: Extract<PanePlan, { kind: "lead" }>;
  calculator: boolean;
}) {
  const math = q.subject === "math";
  const figure = plan.figure && <FigureSlot q={q} calculator={math && calculator} />;
  const words =
    plan.text &&
    (math ? (
      <div data-ink-block="lead" className={styles.stem}>
        <MathText
          text={splitMathStem(q.question_text)?.lead ?? ""}
          serializedFunctionLines
          calculator={calculator}
        />
      </div>
    ) : (
      <div data-ink-block="lead" className={styles.stemRead}>
        <StemText text={q.question_text} part="lead" />
      </div>
    ));
  return (
    <article>
      {figureLeadsText(q.subject) ? (
        <>
          {figure}
          {words}
        </>
      ) : (
        <>
          {words}
          {figure}
        </>
      )}
    </article>
  );
}
