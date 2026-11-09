"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { QuizState } from "@/contexts/QuizContext";
import type { StudentQuizQuestion } from "@/types/quiz";
import MathText from "../MathText";
import ReviewedSinglePassage from "../ReviewedSinglePassage";

// Pieces of ActiveQuizScreen split out to keep that file small.

const LETTERS: ("A" | "B" | "C" | "D")[] = ["A", "B", "C", "D"];

type Review = QuizState["reviews"][string];

// Explanations panel (right side when showExplanations).
export function ExplanationsPanel({
  q,
  review,
  correctLetter,
  selectedAnswer,
  isLast,
  onToggleExplanations,
  onNext,
}: {
  q: StudentQuizQuestion;
  review: Review | undefined;
  correctLetter: string | undefined;
  selectedAnswer: string | null;
  isLast: boolean;
  onToggleExplanations: (v: boolean) => void;
  onNext: () => void;
}) {
  const perChoiceMap = review?.explanation_per_choice as
    | Record<string, string | undefined>
    | null
    | undefined;
  return (
    <motion.div
      key="explanations"
      initial={{ opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 16 }}
      transition={{ duration: 0.2 }}
      className="mx-auto max-w-xl"
    >
      <h3 className="mb-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-taupe">
        Explanation
      </h3>

      {review?.explanation_text && (
        <div className="mb-6 text-[16px] leading-[1.6] text-ivory">
          <MathText text={review.explanation_text} className="block whitespace-pre-wrap" />
        </div>
      )}

      {perChoiceMap && q.answer_format === "multiple_choice" && (
        <div className="mb-6 space-y-3">
          {LETTERS.map((letter) => {
            const expl = perChoiceMap[letter];
            if (!expl) return null;
            const isCorrect = letter === correctLetter;
            const isStudentChoice = selectedAnswer === letter;
            return (
              <div
                key={letter}
                className={cn(
                  "flex items-start gap-3 rounded-xl border px-4 py-3",
                  isCorrect && "border-success/40 bg-success/5",
                  !isCorrect && isStudentChoice && "border-error/40 bg-error/5",
                  !isCorrect && !isStudentChoice && "border-bronze bg-surface/40"
                )}
              >
                <span
                  className={cn(
                    "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[13px] font-bold",
                    isCorrect && "bg-success text-night",
                    !isCorrect && isStudentChoice && "bg-error text-ivory",
                    !isCorrect && !isStudentChoice && "bg-surface-raised text-ivory/80"
                  )}
                >
                  {letter}
                </span>
                <div className="flex-1 text-[16px] leading-[1.5] text-ivory">
                  {(isCorrect || isStudentChoice) && (
                    <span
                      className={cn(
                        "mr-2 inline-block align-middle text-[10px] font-bold uppercase tracking-wider",
                        isCorrect ? "text-success-bright" : "text-error-bright"
                      )}
                    >
                      {isCorrect ? "Correct" : "Your answer"}
                    </span>
                  )}
                  <MathText text={expl} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {q.subject === "math" && review?.desmos_strategy && (
        <div className="mb-6 rounded-xl border border-info/30 bg-info/5 p-4">
          <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-info-bright">
            Desmos strategy
          </div>
          <div className="text-[16px] leading-[1.6] text-info-bright">
            <MathText text={review.desmos_strategy} className="block whitespace-pre-wrap" />
          </div>
        </div>
      )}

      <div className="mt-6 flex flex-wrap justify-end gap-3 border-t border-bronze/60 pt-2">
        <button
          onClick={() => onToggleExplanations(false)}
          className="rounded-xl border border-bronze bg-surface-raised px-6 py-3 text-sm font-semibold text-ivory transition-colors hover:bg-surface-raised"
        >
          Hide explanations
        </button>
        <button
          onClick={onNext}
          className="rounded-xl bg-ivory px-8 py-3 text-sm font-bold text-night transition-colors hover:bg-ivory/90"
        >
          {isLast ? "See results →" : "Next question →"}
        </button>
      </div>
    </motion.div>
  );
}

// Passage block (used in left column whenever R&W has passage).
export function PassageBlock({ q }: { q: StudentQuizQuestion }) {
  return (
    <article className="mx-auto max-w-prose font-serif text-[17px] leading-[1.7] text-ivory">
      {q.passage_a || q.passage_b ? (
        <>
          {q.passage_a && (
            <section className="mb-7">
              <div className="mb-2 font-sans text-[10px] font-bold uppercase tracking-[0.2em] text-taupe">
                Text 1
              </div>
              <MathText text={q.passage_a} className="block whitespace-pre-wrap" />
            </section>
          )}
          {q.passage_b && (
            <section>
              <div className="mb-2 font-sans text-[10px] font-bold uppercase tracking-[0.2em] text-taupe">
                Text 2
              </div>
              <MathText text={q.passage_b} className="block whitespace-pre-wrap" />
            </section>
          )}
        </>
      ) : (
        <ReviewedSinglePassage
          intro={q.passage_intro}
          passage={q.passage}
          display={q.reviewed_passage}
        />
      )}
    </article>
  );
}

// NumericAnswerInput — numeric-entry alternative to the choice grid
// for math questions whose answer is a single value. Used by
// ActiveQuizScreen only.

export function NumericAnswerInput({
  value,
  onChange,
  isSubmitted,
  studentAnswer,
  correctAnswer,
  tolerance,
  wasCorrect,
  readOnly,
}: {
  value: string;
  onChange: (v: string) => void;
  isSubmitted: boolean;
  studentAnswer: string | null;
  correctAnswer: string;
  tolerance: number | null;
  wasCorrect: boolean;
  readOnly: boolean;
}) {
  const showFeedback = isSubmitted && studentAnswer !== null;
  const feedbackClass = showFeedback
    ? wasCorrect
      ? "border-success/40 bg-success/15"
      : "border-error/40 bg-error/15"
    : value
      ? "border-info/40 bg-info/10"
      : "border-bronze bg-surface";

  return (
    <div className="mt-8 space-y-3">
      <div className={cn("rounded-xl border px-5 py-4", feedbackClass)}>
        <label
          htmlFor="quiz-numeric-answer"
          className="mb-2 block text-xs font-semibold uppercase tracking-wider text-taupe"
        >
          Your answer
        </label>
        <input
          id="quiz-numeric-answer"
          type="text"
          inputMode="text"
          autoComplete="off"
          autoFocus
          disabled={isSubmitted || readOnly}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Number or fraction"
          className="w-full border-0 bg-transparent font-mono text-2xl font-bold tabular-nums text-ivory placeholder:text-base placeholder:text-taupe focus:outline-none md:text-3xl md:placeholder:text-lg"
        />
        {showFeedback && !wasCorrect && (
          <p className="mt-3 text-sm text-error-bright">
            Your answer: <span className="font-bold">{studentAnswer}</span> · Correct:{" "}
            <span className="font-bold text-success-bright">{correctAnswer}</span>
            {tolerance ? <span className="text-taupe"> (± {tolerance})</span> : null}
          </p>
        )}
      </div>
    </div>
  );
}
