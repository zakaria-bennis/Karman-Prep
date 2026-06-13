"use client";

// ActiveQuizScreen — the heart of the quiz UI. Renders the current
// question, choice grid (or numeric input), explanations, and
// inline progression controls. Driven by QuizContext.

import { useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MappedNode } from "../ConstellationMap";
import { QUIZ_TOTAL_QUESTIONS, useQuiz } from "@/contexts/QuizContext";
import type { QuizQuestionWithChoices } from "@/types/quiz";
import MathText from "../MathText";
import QuestionTable from "../QuestionTable";
import ChartFigure from "../ChartFigure";
import GeometryFigure from "../GeometryFigure";
import FigureFrame from "../FigureFrame";
import { ProgressDot } from "./ProgressDot";

export function ActiveQuizScreen({
  node,
  q,
  onClose,
  onSelectAnswer,
  onSubmit,
  onFlagClick,
  showExplanations,
  onToggleExplanations,
  onNext,
}: {
  node: MappedNode;
  q: QuizQuestionWithChoices;
  onClose: () => void;
  onSelectAnswer: (l: string) => void;
  onSubmit: () => void;
  onFlagClick: () => void;
  showExplanations: boolean;
  onToggleExplanations: (v: boolean) => void;
  onNext: () => void;
}) {
  const { state } = useQuiz();
  const sortedChoices = useMemo(
    () => [...q.answer_choices].sort((a, b) => (a.letter > b.letter ? 1 : -1)),
    [q]
  );
  const isSubmitted = state.phase === "submitted_correct" || state.phase === "submitted_wrong";
  const correctLetter = q.correct_answer;

  // Progress dots
  const dots = Array.from({ length: QUIZ_TOTAL_QUESTIONS }, (_, i) => {
    const rec = state.records[i];
    const isCurrent = i === state.currentIndex;
    const isAnswered = !!rec?.isCorrect || rec?.isCorrect === false;
    const isCorrect = rec?.isCorrect === true;
    const isFlagged = rec?.flagged === true;
    return { i, isCurrent, isAnswered, isCorrect, isFlagged };
  });

  return (
    <>
      {/* Top bar */}
      <div className="absolute inset-x-0 top-0 z-10 flex h-14 items-center border-b border-bronze bg-night/80 px-6 backdrop-blur-sm">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-widest text-taupe">
            {node.subject === "reading" ? "Reading & Writing" : "Math"}
          </p>
          <p className="truncate text-sm font-bold">{node.topic}</p>
        </div>
        <div className="flex-1 text-center">
          <span className="text-sm font-semibold text-ivory/80">
            Question <span className="text-ivory">{state.currentIndex + 1}</span> of{" "}
            {QUIZ_TOTAL_QUESTIONS}
          </span>
        </div>
        <div className="flex flex-1 justify-end">
          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full text-taupe hover:bg-surface-raised hover:text-ivory"
            aria-label="Close quiz"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Progress dots row (top) */}
      <div className="absolute inset-x-0 top-14 z-10 flex h-10 items-center justify-center gap-2 border-b border-bronze bg-night/60">
        {dots.map((d) => (
          <ProgressDot key={d.i} {...d} />
        ))}
      </div>

      {/* Question area — College Board Bluebook-style split view, with
          an in-place explanation toggle.
            · Pre-submit / submitted-no-explanations: passage on left
              (R&W), question + choices + Submit/Show on right.
            · Submitted + Show explanations clicked: question + choices
              slide under the passage on the left; right panel becomes
              the explanations + Hide button. Math (no passage) uses
              the same 2-column shape with question on left.
          Each panel scrolls independently. */}
      {(() => {
        const hasPassage = !!(q.passage_intro || q.passage || q.passage_a || q.passage_b);
        const inExplanationMode = isSubmitted && showExplanations;
        const LETTERS: ("A" | "B" | "C" | "D")[] = ["A", "B", "C", "D"];

        // ── Buttons row that lives at the bottom of the choices ──
        const choicesButtonRow = !isSubmitted ? (
          state.selectedAnswer ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-6 flex justify-end"
            >
              <button
                onClick={onSubmit}
                className="rounded-xl bg-info px-8 py-3 text-sm font-bold text-ivory transition-colors hover:bg-info-bright"
              >
                Submit Answer
              </button>
            </motion.div>
          ) : null
        ) : !showExplanations ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6 flex flex-wrap justify-end gap-3"
          >
            <button
              onClick={() => onToggleExplanations(true)}
              className="rounded-xl border border-bronze bg-surface-raised px-6 py-3 text-sm font-semibold text-ivory transition-colors hover:bg-surface-raised"
            >
              Show explanations
            </button>
            <button
              onClick={onNext}
              className="rounded-xl bg-info px-8 py-3 text-sm font-bold text-ivory transition-colors hover:bg-info-bright"
            >
              Next question →
            </button>
          </motion.div>
        ) : null;

        // ── Choices block (renders in either right or left panel) ──
        const choicesBlock =
          q.answer_format === "numeric_entry" ? (
            <NumericAnswerInput
              value={state.selectedAnswer ?? ""}
              onChange={onSelectAnswer}
              isSubmitted={isSubmitted}
              studentAnswer={state.selectedAnswer}
              correctAnswer={q.correct_answer}
              tolerance={q.numeric_tolerance}
              wasCorrect={state.phase === "submitted_correct"}
            />
          ) : (
            <div className="mt-7 space-y-3">
              {sortedChoices.map((choice) => {
                const letter = choice.letter;
                const isSelected = state.selectedAnswer === letter;
                const isCorrect = letter === correctLetter;
                const showCorrect = isSubmitted && isCorrect;
                const showWrong = isSubmitted && isSelected && !isCorrect;
                return (
                  <button
                    key={letter}
                    onClick={() => !isSubmitted && onSelectAnswer(letter)}
                    disabled={isSubmitted}
                    className={cn(
                      "w-full rounded-xl border px-5 py-3.5 text-left transition-all",
                      "flex items-start gap-4",
                      !isSubmitted && "cursor-pointer hover:border-info/40 hover:bg-info/5",
                      isSelected && !isSubmitted && "border-info/40 bg-info/10",
                      !isSelected && !isSubmitted && "border-bronze bg-surface",
                      showCorrect && "border-success/40 bg-success/15",
                      showWrong && "border-error/40 bg-error/15",
                      isSubmitted && !isSelected && !isCorrect && "border-bronze opacity-50"
                    )}
                  >
                    <span
                      className={cn(
                        "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[13px] font-bold",
                        !isSubmitted && !isSelected && "bg-surface-raised text-ivory/80",
                        !isSubmitted && isSelected && "bg-info text-ivory",
                        showCorrect && "bg-success text-night",
                        showWrong && "bg-error text-ivory",
                        isSubmitted && !isSelected && !isCorrect && "bg-surface-raised text-taupe"
                      )}
                    >
                      {showCorrect ? <Check className="h-3.5 w-3.5" /> : letter}
                    </span>
                    <span className="flex-1 text-[16px] leading-[1.5] text-ivory">
                      <MathText text={choice.choice_text} />
                    </span>
                  </button>
                );
              })}
            </div>
          );

        const questionPanel = (
          <div className="mx-auto max-w-xl">
            <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-taupe">
              {q.topic_cluster}
            </p>
            <h2 className="text-[19px] font-medium leading-[1.5] text-ivory md:text-[20px]">
              <MathText text={q.question_text} />
            </h2>
            {choicesBlock}
            {choicesButtonRow}
          </div>
        );

        // ── Explanations panel (right side when showExplanations) ──
        const perChoiceMap = q.explanation_per_choice as Record<string, string | undefined> | null;
        const explanationsPanel = (
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

            {q.explanation_text && (
              <div className="mb-6 text-[16px] leading-[1.6] text-ivory">
                <MathText text={q.explanation_text} className="block whitespace-pre-wrap" />
              </div>
            )}

            {perChoiceMap && q.answer_format === "multiple_choice" && (
              <div className="mb-6 space-y-3">
                {LETTERS.map((letter) => {
                  const expl = perChoiceMap[letter];
                  if (!expl) return null;
                  const isCorrect = letter === correctLetter;
                  const isStudentChoice = state.selectedAnswer === letter;
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

            {q.desmos_strategy && (
              <div className="mb-6 rounded-xl border border-info/30 bg-info/5 p-4">
                <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-info-bright">
                  Desmos strategy
                </div>
                <div className="text-[16px] leading-[1.6] text-info-bright">
                  <MathText text={q.desmos_strategy} className="block whitespace-pre-wrap" />
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
                className="rounded-xl bg-info px-8 py-3 text-sm font-bold text-ivory transition-colors hover:bg-info-bright"
              >
                Next question →
              </button>
            </div>
          </motion.div>
        );

        // Figure card — quiet tinted card that gives the College Board
        // figure a gentle margin off the dark page bg without shouting.
        // Used at the top of the left column whenever the question has
        // an attached image (math graph, R&W chart, geometry diagram).
        //
        // Native-figure dispatch:
        //   Phase 4a — figure_kind='table' uses QuestionTable.
        //   Phase 4d — figure_kind='chart' uses ChartFigure (SVG).
        //   Phase 9D — figure_kind='geometric' uses GeometryFigure (SVG),
        //     reached only after the Stage-6.6 gate confirmed the render
        //     matches the screenshot.
        //   Default — raster image_url crop via FigureFrame.
        // ChartFigure/GeometryFigure render inside their own styled boxes
        // so we skip the white-bg FigureFrame card for them.
        const isNativeTable = q.figure_kind === "table" && q.figure_table_data;
        const isNativeChart = q.figure_kind === "chart" && q.figure_chart_data;
        const isNativeGeometry = q.figure_kind === "geometric" && q.figure_geometry_data;
        const hasFigure = !!q.image_url || isNativeTable || isNativeChart || isNativeGeometry;
        const figureCard = isNativeTable ? (
          <div className="mb-6 flex justify-center">
            <QuestionTable data={q.figure_table_data!} />
          </div>
        ) : isNativeChart ? (
          <div className="mb-6 flex justify-center">
            <ChartFigure
              data={q.figure_chart_data!}
              subject={q.subject ?? null}
              alt={q.image_alt ?? undefined}
              className="max-w-2xl"
            />
          </div>
        ) : isNativeGeometry ? (
          <div className="mb-6 flex justify-center">
            <GeometryFigure data={q.figure_geometry_data!} className="max-w-2xl" />
          </div>
        ) : q.image_url ? (
          <FigureFrame
            src={q.image_url}
            alt={q.image_alt ?? ""}
            className="mb-6"
            maxHeightClass="max-h-[28rem]"
          />
        ) : null;

        // Passage block (used in left column whenever R&W has passage).
        const passageBlock = (
          <article className="mx-auto max-w-prose font-serif text-[17px] leading-[1.7] text-ivory">
            {q.passage_a && q.passage_b ? (
              <>
                <section className="mb-7">
                  <div className="mb-2 font-sans text-[10px] font-bold uppercase tracking-[0.2em] text-taupe">
                    Text 1
                  </div>
                  <MathText text={q.passage_a} className="block whitespace-pre-wrap" />
                </section>
                <section>
                  <div className="mb-2 font-sans text-[10px] font-bold uppercase tracking-[0.2em] text-taupe">
                    Text 2
                  </div>
                  <MathText text={q.passage_b} className="block whitespace-pre-wrap" />
                </section>
              </>
            ) : (
              <>
                {q.passage_intro && (
                  <p className="mb-5">
                    <MathText text={q.passage_intro} />
                  </p>
                )}
                {q.passage && <MathText text={q.passage} className="block whitespace-pre-wrap" />}
              </>
            )}
          </article>
        );

        // ── Layout selection ──────────────────────────────────────
        // Anything with a passage OR a figure uses the split view.
        // Left column stacks [figure?, passage?] in that order; right
        // column has question/choices (default) or explanations.
        // In explanation mode the question slides under the left
        // column, mirroring College Board Bluebook behavior.
        if (hasPassage || hasFigure) {
          return (
            <div className="absolute inset-x-0 bottom-20 top-24 overflow-hidden">
              <div className="grid h-full divide-y divide-bronze md:grid-cols-2 md:divide-x md:divide-y-0">
                {/* LEFT */}
                <div className="overflow-y-auto px-6 py-8 md:px-10">
                  {figureCard}
                  {hasPassage && passageBlock}
                  {inExplanationMode && (
                    <div className="mt-10 border-t border-bronze/50 pt-6">{questionPanel}</div>
                  )}
                </div>
                {/* RIGHT */}
                <div className="overflow-y-auto px-6 py-8 md:px-10">
                  <AnimatePresence mode="wait" initial={false}>
                    {inExplanationMode ? (
                      explanationsPanel
                    ) : (
                      <motion.div
                        key="question"
                        initial={{ opacity: 0, x: -12 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -12 }}
                        transition={{ duration: 0.2 }}
                      >
                        {questionPanel}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>
          );
        }

        // Math (no passage). When showing explanations, switch to a
        // 2-column layout: question/choices on the LEFT, explanations
        // on the RIGHT — same shape as R&W in explanation mode.
        if (inExplanationMode) {
          return (
            <div className="absolute inset-x-0 bottom-20 top-24 overflow-hidden">
              <div className="grid h-full divide-y divide-bronze md:grid-cols-2 md:divide-x md:divide-y-0">
                <div className="overflow-y-auto px-6 py-8 md:px-10">{questionPanel}</div>
                <div className="overflow-y-auto px-6 py-8 md:px-10">{explanationsPanel}</div>
              </div>
            </div>
          );
        }

        // Math, default: single centered column.
        return (
          <div className="absolute inset-x-0 bottom-20 top-24 overflow-y-auto px-6 py-8">
            {questionPanel}
          </div>
        );
      })()}
    </>
  );

  // Re-inject the unused flag click binding to silence the lint for onFlagClick
  void onFlagClick;
}

// NumericAnswerInput — numeric-entry alternative to the choice grid
// for math questions whose answer is a single value. Used by
// ActiveQuizScreen only.

function NumericAnswerInput({
  value,
  onChange,
  isSubmitted,
  studentAnswer,
  correctAnswer,
  tolerance,
  wasCorrect,
}: {
  value: string;
  onChange: (v: string) => void;
  isSubmitted: boolean;
  studentAnswer: string | null;
  correctAnswer: string;
  tolerance: number | null;
  wasCorrect: boolean;
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
        <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-taupe">
          Your answer
        </label>
        <input
          type="text"
          inputMode="decimal"
          autoComplete="off"
          autoFocus
          disabled={isSubmitted}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Type a number (e.g. 3.14 or 1/2)"
          className="w-full border-0 bg-transparent font-mono text-2xl font-bold tabular-nums text-ivory placeholder:text-taupe focus:outline-none md:text-3xl"
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
