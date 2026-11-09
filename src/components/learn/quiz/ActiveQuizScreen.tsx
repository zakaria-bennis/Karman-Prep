"use client";

// ActiveQuizScreen — the heart of the quiz UI. Renders the current
// question, choice grid (or numeric input), explanations, and
// inline progression controls. Driven by QuizContext.

import { useMemo, useState, useRef, useEffect, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, X, Ban } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MappedNode } from "../ConstellationMap";
import { useOptionalQuizState, type QuizState } from "@/contexts/QuizContext";
import type { StudentQuizQuestion } from "@/types/quiz";
import { CalculatorChoiceAction } from "@/components/calculator/CalculatorSourceAction";
import { useCalculator } from "@/components/calculator/CalculatorScope";
import styles from "./workspace.module.css";
import MathText from "../MathText";
import QuestionTable from "../QuestionTable";
import ChartFigure from "../ChartFigure";
import GeometryFigure from "../GeometryFigure";
import FigureFrame from "../FigureFrame";
import FigureChoices from "../figures/FigureChoices";
import { TableChoiceOption } from "./TableChoiceOption";
import PassageAnnotations from "./PassageAnnotations";
import { drawnFigure } from "@/lib/figures/question-figure";
import { hasFigureChoices, withSpecTables } from "@/lib/figures/engine/choice-routing";
import { useSpecParser } from "../figures/engine-loader";
import { figureLeadsText } from "@/lib/figures/figure-order";
import { useFigureStemAlign } from "./use-figure-stem-align";
import { ExplanationsPanel, NumericAnswerInput, PassageBlock } from "./QuizPanels";

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
  menu,
  readOnly = false,
  stateOverride,
}: {
  node: MappedNode;
  q: StudentQuizQuestion;
  onClose: () => void;
  onSelectAnswer: (l: string) => void;
  onSubmit: () => void;
  onFlagClick: () => void;
  showExplanations: boolean;
  onToggleExplanations: (v: boolean) => void;
  onNext: () => void;
  menu?: ReactNode;
  readOnly?: boolean;
  stateOverride?: Pick<
    QuizState,
    "phase" | "reviews" | "records" | "targetLength" | "currentIndex" | "selectedAnswer"
  >;
}) {
  const headerRef = useRef<HTMLDivElement>(null);
  // A figure alone beside the question text ends on the text's last line (laptop+).
  const figureAlignRef = useRef<HTMLDivElement>(null);
  const stemRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    const header = headerRef.current;
    if (!header || typeof ResizeObserver === "undefined") return;
    const measure = () =>
      header.parentElement?.style.setProperty(
        "--quiz-header-height",
        `${header.getBoundingClientRect().height}px`
      );
    const observer = new ResizeObserver(measure);
    observer.observe(header);
    measure();
    return () => observer.disconnect();
  }, []);
  const [crossed, setCrossed] = useState<Record<string, boolean>>({});
  const toggleCrossed = (letter: string) =>
    setCrossed((old) => ({ ...old, [`${q.id}:${letter}`]: !old[`${q.id}:${letter}`] }));
  const contextState = useOptionalQuizState();
  const state = stateOverride ?? contextState;
  // AR-11: with a calculator each text choice's tool cluster also holds its Transfer control (14).
  const hasCalculator = useCalculator() !== null;
  const stem = useMemo(
    () => ({ text: q.question_text, serializedFunctionLines: q.subject === "math" }),
    [q.question_text, q.subject]
  );
  const parse = useSpecParser(q);
  if (!state) throw new Error("ActiveQuizScreen requires a quiz session or read-only state.");
  const drawn = useMemo(() => drawnFigure(q, parse), [q, parse]);
  // A table choice_figure_spec takes the table-choice path; drawn ones the figure grid.
  const sortedChoices = useMemo(
    () =>
      withSpecTables(
        [...q.answer_choices].sort((a, b) => (a.letter > b.letter ? 1 : -1)),
        parse
      ),
    [q, parse]
  );
  const figureChoices = useMemo(
    () => hasFigureChoices(sortedChoices, parse),
    [sortedChoices, parse]
  );
  const allChoicesAreTables =
    sortedChoices.length > 0 && sortedChoices.every((choice) => choice.choice_table_data);
  const isSubmitted = state.phase === "submitted_correct" || state.phase === "submitted_wrong";
  useFigureStemAlign(
    figureAlignRef,
    stemRef,
    !(q.passage_intro || q.passage || q.passage_a || q.passage_b) &&
      !(isSubmitted && showExplanations),
    q.id
  );
  const review = isSubmitted ? state.reviews[q.id] : undefined;
  const correctLetter = review?.correct_answer;

  return (
    <>
      {/* Top bar */}
      <div
        ref={headerRef}
        className="absolute inset-x-0 top-0 z-[72] flex min-h-14 flex-wrap items-center border-b border-bronze bg-night/80 px-3 backdrop-blur-sm sm:px-6"
      >
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-widest text-taupe">
            {node.subject === "reading" ? "Reading & Writing" : "Math"}
          </p>
          <p className="truncate text-sm font-bold">{node.topic}</p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-1">
          {menu}
          {!readOnly && (
            <button
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-full text-taupe hover:bg-surface-raised hover:text-ivory"
              aria-label="Close quiz"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Passage precedes prompt in every existing practice mode. */}
      {(() => {
        const hasPassage = !!(q.passage_intro || q.passage || q.passage_a || q.passage_b);
        const inExplanationMode = isSubmitted && showExplanations;

        // ── Buttons row that lives at the bottom of the choices ──
        const choicesButtonRow = readOnly ? null : !isSubmitted ? (
          state.selectedAnswer ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-6 flex justify-end"
            >
              <button
                onClick={onSubmit}
                className="rounded-xl bg-ivory px-8 py-3 text-sm font-bold text-night transition-colors hover:bg-ivory/90"
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
              className="rounded-xl bg-ivory px-8 py-3 text-sm font-bold text-night transition-colors hover:bg-ivory/90"
            >
              {state.currentIndex + 1 >= state.targetLength ? "See results →" : "Next question →"}
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
              correctAnswer={review?.correct_answer ?? ""}
              tolerance={review?.numeric_tolerance ?? null}
              wasCorrect={state.phase === "submitted_correct"}
              readOnly={readOnly}
            />
          ) : figureChoices ? (
            <FigureChoices
              className="mt-7"
              choices={sortedChoices}
              selected={state.selectedAnswer}
              onSelect={readOnly ? undefined : onSelectAnswer}
              submitted={isSubmitted}
              correctLetter={correctLetter}
              crossed={(letter) => !!crossed[`${q.id}:${letter}`]}
              onToggleCrossed={toggleCrossed}
              serializedFunctionLines={q.subject === "math"}
            />
          ) : (
            <div
              className={cn(
                "mt-7",
                allChoicesAreTables ? "grid grid-cols-1 gap-3 sm:grid-cols-2" : "space-y-3"
              )}
            >
              {sortedChoices.map((choice) => {
                const letter = choice.letter;
                const isSelected = state.selectedAnswer === letter;
                const isCorrect = letter === correctLetter;
                const showCorrect = isSubmitted && isCorrect;
                const showWrong = isSubmitted && isSelected && !isCorrect;
                if (choice.choice_table_data) {
                  return (
                    <TableChoiceOption
                      key={letter}
                      id={`quiz-${q.id}-choice-${letter}`}
                      groupName={`quiz-${q.id}-choice`}
                      letter={letter}
                      table={choice.choice_table_data}
                      readOnly={readOnly}
                      selected={isSelected}
                      submitted={isSubmitted}
                      correct={isCorrect}
                      onSelect={readOnly ? () => undefined : onSelectAnswer}
                    />
                  );
                }
                return (
                  <div key={letter} className="group relative">
                    <button
                      onClick={() => !readOnly && !isSubmitted && onSelectAnswer(letter)}
                      disabled={readOnly || isSubmitted || crossed[`${q.id}:${letter}`]}
                      className={cn(
                        `w-full rounded-xl border py-3.5 pl-5 ${hasCalculator ? "pr-24" : "pr-14"} text-left transition-all`,
                        crossed[`${q.id}:${letter}`] && "line-through opacity-50",
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
                          !isSubmitted && isSelected && "bg-ivory text-night",
                          showCorrect && "bg-success text-night",
                          showWrong && "bg-error text-ivory",
                          isSubmitted && !isSelected && !isCorrect && "bg-surface-raised text-taupe"
                        )}
                      >
                        {showCorrect ? <Check className="h-3.5 w-3.5" /> : letter}
                      </span>
                      <span className="flex-1 text-[16px] leading-[1.5] text-ivory">
                        <MathText
                          text={choice.choice_text}
                          serializedFunctionLines={q.subject === "math"}
                        />
                      </span>
                    </button>
                    {!readOnly && (
                      <div
                        className={`${styles.choiceTools} absolute right-1 top-1`}
                        data-calculator-cluster={hasCalculator ? "" : undefined}
                      >
                        <button
                          type="button"
                          aria-label={
                            crossed[`${q.id}:${letter}`]
                              ? `Restore choice ${letter}`
                              : `Cross out choice ${letter}`
                          }
                          aria-pressed={!!crossed[`${q.id}:${letter}`]}
                          onClick={() => toggleCrossed(letter)}
                        >
                          <Ban size={18} />
                        </button>
                        {q.subject === "math" && (
                          <CalculatorChoiceAction
                            text={choice.choice_text}
                            letter={letter}
                            stem={stem}
                          />
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          );

        const questionPanel = (
          <div className="mx-auto max-w-xl">
            <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-taupe">
              {q.topic_cluster}
            </p>
            <h2
              ref={stemRef}
              className="whitespace-pre-line text-[19px] font-medium leading-[1.5] text-ivory md:text-[20px]"
            >
              <MathText
                text={q.question_text}
                serializedFunctionLines={q.subject === "math"}
                calculator={!readOnly && q.subject === "math"}
              />
            </h2>
            {choicesBlock}
            {choicesButtonRow}
          </div>
        );
        const explanationsPanel = (
          <ExplanationsPanel
            key="explanations"
            q={q}
            review={review}
            correctLetter={correctLetter}
            selectedAnswer={state.selectedAnswer}
            isLast={state.currentIndex + 1 >= state.targetLength}
            onToggleExplanations={onToggleExplanations}
            onNext={onNext}
          />
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
        //   figure_spec (checked first) — the figure engine, via FigureFrame.
        //   Default — raster image_url crop via FigureFrame.
        // ChartFigure/GeometryFigure render inside their own styled boxes
        // so we skip the white-bg FigureFrame card for them.
        const isNativeTable = drawn === "table";
        const isNativeChart = drawn === "chart";
        const isNativeGeometry = drawn === "geometric";
        const hasFigure = drawn !== null;
        const figureCard = isNativeTable ? (
          <div className="mb-6 flex justify-center">
            <QuestionTable
              data={q.figure_table_data!}
              calculator={!readOnly && q.subject === "math"}
            />
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
        ) : drawn === "spec" || drawn === "image" ? (
          <FigureFrame
            spec={q.figure_spec}
            calculator={!readOnly && q.subject === "math"}
            src={q.image_url}
            svg={q.figure_svg}
            alt={q.image_alt ?? ""}
            className="mb-6"
            maxHeightClass="max-h-[28rem]"
          />
        ) : null;

        // Passage block (used in left column whenever R&W has passage).
        const passageBlock = <PassageBlock q={q} />;

        // ── Layout selection ──────────────────────────────────────
        // Anything with a passage OR a figure uses the split view.
        // Left column stacks the figure and passage: Reading and Writing
        // puts the figure first (founder, 2026-10-21), Math keeps passage
        // first. Right column has question/choices (default) or explanations.
        // In explanation mode the question slides under the left
        // column, mirroring College Board Bluebook behavior.
        if (hasPassage || hasFigure) {
          const figureFirst = figureLeadsText(q.subject);
          // Alone in its column, the figure lines up with the question text beside it.
          const figureSlot = hasPassage ? (
            figureCard
          ) : (
            <div ref={figureAlignRef} className="flow-root">
              {figureCard}
            </div>
          );
          return (
            <div
              data-question-content
              className={cn(
                "absolute inset-x-0 bottom-20 top-28 overflow-y-auto md:top-20 md:overflow-hidden"
              )}
            >
              <div
                data-question-layout
                className="grid min-h-full divide-y divide-bronze md:h-full md:grid-cols-2 md:divide-x md:divide-y-0"
              >
                {/* LEFT */}
                <div
                  className={cn(
                    "px-6 py-8 md:overflow-y-auto md:px-10",
                    isNativeTable && "min-w-0"
                  )}
                >
                  {figureFirst && figureSlot}
                  {hasPassage &&
                    (readOnly ? (
                      passageBlock
                    ) : (
                      <PassageAnnotations
                        questionId={q.id}
                        sourceKey={JSON.stringify([
                          q.passage_intro,
                          q.passage,
                          q.passage_a,
                          q.passage_b,
                          q.reviewed_passage,
                        ])}
                      >
                        {passageBlock}
                      </PassageAnnotations>
                    ))}
                  {!figureFirst && figureSlot}
                  {inExplanationMode && (
                    <div className="mt-10 border-t border-bronze/50 pt-6">{questionPanel}</div>
                  )}
                </div>
                {/* RIGHT */}
                <div className="px-6 py-8 md:overflow-y-auto md:px-10">
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
            <div
              data-question-content
              className={cn(
                "absolute inset-x-0 bottom-20 top-28 overflow-y-auto md:top-20 md:overflow-hidden"
              )}
            >
              <div
                data-question-layout
                className="grid min-h-full divide-y divide-bronze md:h-full md:grid-cols-2 md:divide-x md:divide-y-0"
              >
                <div className="px-6 py-8 md:overflow-y-auto md:px-10">{questionPanel}</div>
                <div className="px-6 py-8 md:overflow-y-auto md:px-10">{explanationsPanel}</div>
              </div>
            </div>
          );
        }

        // Math, default: single centered column.
        return (
          <div
            data-question-content
            className={cn(
              "absolute inset-x-0 bottom-20 top-28 overflow-y-auto px-6 py-8 md:top-20"
            )}
          >
            {questionPanel}
          </div>
        );
      })()}
    </>
  );

  // Re-inject the unused flag click binding to silence the lint for onFlagClick
  void onFlagClick;
}
