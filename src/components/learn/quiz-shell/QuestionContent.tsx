"use client";
import type { QuizMode } from "@/lib/quiz/mode";
import type { QuestionWorkspace } from "@/lib/quiz/workspace";
import type { StudentQuizQuestion, StudentQuizReview } from "@/types/quiz";
import MathText from "../MathText";
import shell from "./quiz-shell.module.css";
import { Choices } from "./Choices";
import { Explanation } from "./Explanation";
import { FigureSlot } from "./FigureSlot";
import { NumericEntry } from "./NumericEntry";
import { QuestionHeader } from "./QuestionHeader";
import { StemText } from "./StemText";
import { splitMathStem, unwrapMathProse } from "@/lib/quiz/stem-layout";

export type QuestionContentProps = {
  q: StudentQuizQuestion;
  number: number;
  mode: QuizMode;
  ws: QuestionWorkspace | undefined;
  review: StudentQuizReview | undefined;
  bookmarked: boolean;
  eliminatorOn: boolean;
  /** Draw the figure in the question pane (math); reading questions draw it with the passage. */
  figureHere: boolean;
  /** Split across two panes, the question pane shows only the question ("ask"); see pane-plan.ts. */
  stemPart?: "all" | "ask";
  /** The figure sits in the left pane, with the setup above it (pane-plan.ts). */
  figureLeft?: boolean;
  hasCalculator: boolean;
  pickOffer: string | null;
  /** The explanation is shown beside the question instead (a miss on a wide screen). */
  explanationAside?: boolean;
  /** The admin-only "Generated" mark (the host checked the viewer is an admin). */
  generated?: boolean;
  onAnswer(value: string | null): void;
  onCross(letter: string): void;
  onToggleReview(): void;
  onToggleBookmark(): void;
  onToggleEliminator(): void;
};

export function QuestionContent(p: QuestionContentProps) {
  const { q, mode, ws, review } = p;
  const graded = mode.grading !== "end" && !!review;
  const locked = mode.grading === "locked" || graded;
  const choiceState = {
    // Once graded (or in review), the answer the server saved is the one shown.
    answer:
      graded || mode.grading === "locked"
        ? (review?.studentAnswer ?? ws?.answer ?? null)
        : (ws?.answer ?? null),
    crossedOut: ws?.crossedOut ?? [],
    correct: graded ? (review?.correct_answer ?? null) : null,
    locked,
  };
  return (
    <>
      <QuestionHeader
        number={p.number}
        generated={p.generated ? q.id : undefined}
        mode={mode}
        markedForReview={!!ws?.markedForReview}
        bookmarked={p.bookmarked}
        eliminatorOn={p.eliminatorOn}
        showEliminator={q.answer_format === "multiple_choice" && !locked}
        onToggleReview={p.onToggleReview}
        onToggleBookmark={p.onToggleBookmark}
        onToggleEliminator={p.onToggleEliminator}
      />
      {p.figureHere && <FigureSlot q={q} calculator={p.hasCalculator} />}
      {q.subject === "math" ? (
        <h2 data-ink-block="stem" className={shell.stem}>
          <MathText
            text={
              p.stemPart === "ask"
                ? (splitMathStem(q.question_text, { figure: !!p.figureLeft })?.ask ??
                  unwrapMathProse(q.question_text))
                : unwrapMathProse(q.question_text)
            }
            serializedFunctionLines
            calculator={p.hasCalculator}
          />
        </h2>
      ) : (
        <div data-ink-block="stem" className={shell.stemRead}>
          <StemText text={q.question_text} part={p.stemPart ?? "all"} />
        </div>
      )}
      {q.answer_format === "numeric_entry" ? (
        <NumericEntry
          value={choiceState.answer ?? ""}
          onChange={(v) => p.onAnswer(v.trim() ? v : null)}
          locked={locked}
          verdict={graded ? (review!.isCorrect ? "correct" : "wrong") : null}
        />
      ) : (
        <Choices
          q={q}
          state={choiceState}
          eliminatorOn={p.eliminatorOn}
          onPick={(letter) => p.onAnswer(letter)}
          onCross={p.onCross}
          pickOffer={p.pickOffer}
        />
      )}
      {graded && review && !p.explanationAside && <Explanation q={q} review={review} />}
    </>
  );
}
