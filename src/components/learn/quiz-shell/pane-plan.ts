// One or two panes of glass for a question (founder, 2026-11-26: "consistency across the same
// device"). On a computer or a tablet held sideways every Reading and Writing question shows its passage on the
// left and its question and answers on the right. A Math question does the same when it has a
// figure (the figure left, the question right) or runs to three lines or more (the setup left, the
// question right); a short one stays in one pane. A phone, and a tablet held upright, show one pane
// (a stored passage still sits above the question there, as before).
import { drawnFigure } from "@/lib/figures/question-figure";
import { readingPart, splitMathStem } from "@/lib/quiz/stem-layout";
import type { StudentQuizQuestion } from "@/types/quiz";
import { hasPassage } from "./PassageBlock";
import type { QuizLayout } from "./use-quiz-layout";

export type PanePlan =
  /** One pane: the figure, if any, sits with the question. */
  | { kind: "single" }
  /** The stored passage fields on the left (with a reading figure); the whole stem on the right. */
  | { kind: "passage" }
  /** The left pane holds the question's own setup and/or figure; the right shows only the ask. */
  | { kind: "lead"; figure: boolean; text: boolean };

export function panePlan(q: StudentQuizQuestion, layout: QuizLayout): PanePlan {
  if (hasPassage(q)) return { kind: "passage" };
  // Side by side only: stacked on a tablet held upright, the halves left the figure floating and cut
  // the answers off, so there the question stays in one pane as before.
  if (layout !== "wide") return { kind: "single" };
  const figure = drawnFigure(q) !== null;
  if (q.subject === "math") {
    // a figure moves left and the words stay with the answers
    if (figure) return { kind: "lead", figure: true, text: false };
    return splitMathStem(q.question_text)
      ? { kind: "lead", figure: false, text: true }
      : { kind: "single" };
  }
  const text = readingPart(q.question_text, "lead").length > 0;
  return text || figure ? { kind: "lead", figure, text } : { kind: "single" };
}
