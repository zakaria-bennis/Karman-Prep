"use client";

// ============================================================
// QuizEngine — full-screen adaptive quiz experience.
// Driven by QuizContext. Launches over the LessonOverlay.
// ============================================================

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import { X, Flag, Calculator, PencilLine, Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MappedNode } from "./ConstellationMap";
import { QUIZ_TOTAL_QUESTIONS, useQuiz } from "@/contexts/QuizContext";
import type { AnswerLetter, QuizQuestionWithChoices } from "@/types/quiz";
import { playSound } from "@/lib/sounds";
import DesmosWindow from "./DesmosWindow";
import Scratchpad from "./Scratchpad";
import ExplanationPanel from "./ExplanationPanel";
import QuizResults from "./QuizResults";
import MathText from "./MathText";

interface Props {
  node: MappedNode;
  videoUrl?: string | null;
  onClose: () => void;
  onGoToNext: (() => void) | null;
}

const LETTERS: AnswerLetter[] = ["A", "B", "C", "D"];

export default function QuizEngine({ node, videoUrl, onClose, onGoToNext }: Props) {
  const {
    state,
    startQuiz,
    selectAnswer,
    submitAnswer,
    nextQuestion,
    dismissVideoPrompt,
    flagCurrent,
    toggleDesmos,
    toggleScratchpad,
    retakeQuiz,
    reset,
  } = useQuiz();

  const containerRef = useRef<HTMLDivElement>(null);
  const [flagOpen, setFlagOpen] = useState(false);
  const [flagNote, setFlagNote] = useState("");
  const [inactivityResetKey, setInactivityResetKey] = useState(0);
  // In-place explanations toggle. Lifted to the parent so the
  // auto-advance-on-correct effect below can pause when the
  // student has opened the explanations panel — otherwise we'd
  // yank them to the next question mid-read.
  const [showExplanations, setShowExplanations] = useState(false);

  // Kick off the quiz when the engine mounts
  useEffect(() => {
    if (state.phase === "idle") {
      startQuiz(node.id, node.subject).catch((err) => {
        console.error(err);
        alert(err.message ?? "Failed to start quiz");
        onClose();
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // After a correct answer, auto-advance after 800 ms — but only if
  // the student hasn't opened the in-place explanations. Once they
  // ask to see the explanations, we hold the question on screen
  // until they hit "Hide explanations" or the Next button.
  useEffect(() => {
    if (state.phase === "submitted_correct" && !showExplanations) {
      const t = setTimeout(() => nextQuestion(), 800);
      return () => clearTimeout(t);
    }
  }, [state.phase, nextQuestion, showExplanations]);

  // Reset the explanations toggle whenever the active question
  // changes — fresh question, fresh blank slate.
  const currentQuestionId =
    state.phase !== "idle" && state.phase !== "loading" && state.selectedQuestions.length > 0
      ? state.selectedQuestions[state.currentIndex]?.id
      : null;
  useEffect(() => {
    setShowExplanations(false);
  }, [currentQuestionId]);

  // Inactivity auto-close on results screen (2 min)
  useEffect(() => {
    if (state.phase !== "complete") return;
    const handle = setTimeout(() => {
      reset();
      onClose();
    }, 120_000);
    return () => clearTimeout(handle);
  }, [state.phase, inactivityResetKey, reset, onClose]);

  function registerActivity() {
    setInactivityResetKey((k) => k + 1);
  }

  async function handleFlagSubmit() {
    await flagCurrent(flagNote.trim() || undefined);
    setFlagOpen(false);
    setFlagNote("");
  }

  const currentQuestion: QuizQuestionWithChoices | null =
    state.phase !== "idle" && state.phase !== "loading" && state.selectedQuestions.length > 0
      ? state.selectedQuestions[state.currentIndex]
      : null;

  return (
    <motion.div
      ref={containerRef}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      onPointerDown={registerActivity}
      className="fixed inset-0 z-[60] overflow-hidden bg-slate-950 text-white"
    >
      {/* Loading state */}
      {state.phase === "loading" && (
        <div className="flex h-full w-full flex-col items-center justify-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
          <p className="text-sm text-slate-400">Loading your adaptive quiz…</p>
        </div>
      )}

      {/* No questions state */}
      {state.phase === "idle" && state.selectedQuestions.length === 0 && (
        <div className="flex h-full w-full flex-col items-center justify-center gap-4 px-6 text-center">
          <p className="max-w-md text-slate-400">Preparing…</p>
        </div>
      )}

      {/* Active quiz screens */}
      {currentQuestion && state.phase !== "complete" && (
        <ActiveQuizScreen
          node={node}
          q={currentQuestion}
          onClose={() => {
            reset();
            onClose();
          }}
          onFlagClick={() => setFlagOpen(true)}
          onSelectAnswer={selectAnswer}
          onSubmit={() => submitAnswer()}
          showExplanations={showExplanations}
          onToggleExplanations={setShowExplanations}
          onNext={() => nextQuestion()}
        />
      )}

      {/* Bottom toolbar — visible during quiz */}
      {(state.phase === "answering" ||
        state.phase === "submitted_correct" ||
        state.phase === "submitted_wrong") && (
        <BottomToolbar
          subject={node.subject}
          onDesmos={toggleDesmos}
          onScratchpad={toggleScratchpad}
          onFlag={() => setFlagOpen(true)}
          state={state}
        />
      )}

      {/* (The bottom-popup explanation panel was removed in favor of
          the in-place "Show explanations" toggle inside ActiveQuizScreen.
          Keep ExplanationPanel imported in case any other surface still
          uses it, but don't render it from the quiz screen anymore.) */}

      {/* 3-consecutive-wrongs video prompt */}
      <AnimatePresence>
        {state.phase === "video_prompt" && (
          <VideoPromptBanner
            videoUrl={videoUrl ?? node.video_url ?? null}
            onDismiss={() => dismissVideoPrompt()}
          />
        )}
      </AnimatePresence>

      {/* Desmos floating window */}
      <AnimatePresence>
        {state.isDesmosOpen && node.subject === "math" && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.7 }}
              exit={{ opacity: 0 }}
              className="pointer-events-none absolute inset-0 z-[65] bg-black"
            />
            <DesmosWindow onClose={toggleDesmos} constraintsRef={containerRef} />
          </>
        )}
      </AnimatePresence>

      {/* Scratchpad floating window */}
      <AnimatePresence>
        {state.isScratchpadOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.7 }}
              exit={{ opacity: 0 }}
              className="pointer-events-none absolute inset-0 z-[65] bg-black"
            />
            <Scratchpad onClose={toggleScratchpad} constraintsRef={containerRef} />
          </>
        )}
      </AnimatePresence>

      {/* Flag dialog */}
      <AnimatePresence>
        {flagOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[75] flex items-center justify-center bg-black/70 p-6"
            onClick={() => setFlagOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 10 }}
              className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-2 flex items-center gap-2">
                <Flag className="h-4 w-4 text-rose-400" />
                <h3 className="text-base font-bold">Flag this question</h3>
              </div>
              <p className="mb-4 text-xs text-slate-400">
                Send it to your tutor's review queue. An optional note helps them understand what
                went wrong.
              </p>
              <textarea
                value={flagNote}
                onChange={(e) => setFlagNote(e.target.value)}
                placeholder="Optional note (e.g. 'answer key seems wrong', 'ambiguous wording')…"
                rows={3}
                className="w-full rounded-lg border border-slate-700 bg-slate-800 p-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-rose-500 focus:outline-none"
              />
              <div className="mt-4 flex justify-end gap-3">
                <button
                  onClick={() => setFlagOpen(false)}
                  className="px-4 py-2 text-sm font-semibold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  onClick={handleFlagSubmit}
                  className="rounded-lg bg-rose-500 px-4 py-2 text-sm font-bold text-white hover:bg-rose-600"
                >
                  Submit Flag
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Results screen */}
      <AnimatePresence>
        {state.phase === "complete" && state.score !== null && state.confidenceBand && (
          <QuizResults
            score={state.score}
            correct={state.correctCount}
            total={QUIZ_TOTAL_QUESTIONS}
            band={state.confidenceBand}
            records={state.records}
            questions={state.selectedQuestions}
            onGoToNext={onGoToNext}
            onRetake={() => retakeQuiz()}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── Sub-components ──────────────────────────────────────────

function ActiveQuizScreen({
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
      <div className="absolute inset-x-0 top-0 z-10 flex h-14 items-center border-b border-slate-800 bg-slate-950/80 px-6 backdrop-blur-sm">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
            {node.subject === "reading" ? "Reading & Writing" : "Math"}
          </p>
          <p className="truncate text-sm font-bold">{node.topic}</p>
        </div>
        <div className="flex-1 text-center">
          <span className="text-sm font-semibold text-slate-300">
            Question <span className="text-white">{state.currentIndex + 1}</span> of{" "}
            {QUIZ_TOTAL_QUESTIONS}
          </span>
        </div>
        <div className="flex flex-1 justify-end">
          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full text-slate-400 hover:bg-slate-800 hover:text-white"
            aria-label="Close quiz"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Progress dots row (top) */}
      <div className="absolute inset-x-0 top-14 z-10 flex h-10 items-center justify-center gap-2 border-b border-slate-800 bg-slate-950/60">
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
                className="rounded-xl bg-blue-600 px-8 py-3 text-sm font-bold text-white transition-colors hover:bg-blue-700"
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
              className="rounded-xl border border-slate-700 bg-slate-800 px-6 py-3 text-sm font-semibold text-slate-100 transition-colors hover:bg-slate-700"
            >
              Show explanations
            </button>
            <button
              onClick={onNext}
              className="rounded-xl bg-blue-600 px-8 py-3 text-sm font-bold text-white transition-colors hover:bg-blue-700"
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
                      !isSubmitted && "cursor-pointer hover:border-blue-500 hover:bg-blue-500/5",
                      isSelected && !isSubmitted && "border-blue-500 bg-blue-500/10",
                      !isSelected && !isSubmitted && "border-slate-700 bg-slate-900",
                      showCorrect && "border-emerald-500 bg-emerald-500/15",
                      showWrong && "border-rose-500 bg-rose-500/15",
                      isSubmitted && !isSelected && !isCorrect && "border-slate-800 opacity-50"
                    )}
                  >
                    <span
                      className={cn(
                        "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[13px] font-bold",
                        !isSubmitted && !isSelected && "bg-slate-800 text-slate-300",
                        !isSubmitted && isSelected && "bg-blue-500 text-white",
                        showCorrect && "bg-emerald-500 text-white",
                        showWrong && "bg-rose-500 text-white",
                        isSubmitted && !isSelected && !isCorrect && "bg-slate-800 text-slate-500"
                      )}
                    >
                      {showCorrect ? <Check className="h-3.5 w-3.5" /> : letter}
                    </span>
                    <span className="flex-1 text-[16px] leading-[1.5] text-slate-100">
                      <MathText text={choice.choice_text} />
                    </span>
                  </button>
                );
              })}
            </div>
          );

        const questionPanel = (
          <div className="mx-auto max-w-xl">
            <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
              {q.topic_cluster}
            </p>
            <h2 className="text-[19px] font-medium leading-[1.5] text-slate-100 md:text-[20px]">
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
            <h3 className="mb-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
              Explanation
            </h3>

            {q.explanation_text && (
              <div className="mb-6 text-[16px] leading-[1.6] text-slate-100">
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
                        isCorrect && "border-emerald-500/40 bg-emerald-500/5",
                        !isCorrect && isStudentChoice && "border-rose-500/40 bg-rose-500/5",
                        !isCorrect && !isStudentChoice && "border-slate-800 bg-slate-900/40"
                      )}
                    >
                      <span
                        className={cn(
                          "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[13px] font-bold",
                          isCorrect && "bg-emerald-500 text-white",
                          !isCorrect && isStudentChoice && "bg-rose-500 text-white",
                          !isCorrect && !isStudentChoice && "bg-slate-800 text-slate-300"
                        )}
                      >
                        {letter}
                      </span>
                      <div className="flex-1 text-[16px] leading-[1.5] text-slate-100">
                        {(isCorrect || isStudentChoice) && (
                          <span
                            className={cn(
                              "mr-2 inline-block align-middle text-[10px] font-bold uppercase tracking-wider",
                              isCorrect ? "text-emerald-300" : "text-rose-300"
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
              <div className="mb-6 rounded-xl border border-sky-500/30 bg-sky-500/5 p-4">
                <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-sky-300">
                  Desmos strategy
                </div>
                <div className="text-[16px] leading-[1.6] text-sky-100">
                  <MathText text={q.desmos_strategy} className="block whitespace-pre-wrap" />
                </div>
              </div>
            )}

            <div className="mt-6 flex flex-wrap justify-end gap-3 border-t border-slate-800/60 pt-2">
              <button
                onClick={() => onToggleExplanations(false)}
                className="rounded-xl border border-slate-700 bg-slate-800 px-6 py-3 text-sm font-semibold text-slate-100 transition-colors hover:bg-slate-700"
              >
                Hide explanations
              </button>
              <button
                onClick={onNext}
                className="rounded-xl bg-blue-600 px-8 py-3 text-sm font-bold text-white transition-colors hover:bg-blue-700"
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
        const hasFigure = !!q.image_url;
        const figureCard = hasFigure ? (
          <figure className="mb-6 rounded-xl border border-slate-700/50 bg-slate-200 p-3 shadow-md shadow-black/40">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={q.image_url!}
              alt={q.image_alt ?? ""}
              className="mx-auto block max-h-[28rem] w-auto rounded object-contain"
            />
          </figure>
        ) : null;

        // Passage block (used in left column whenever R&W has passage).
        const passageBlock = (
          <article className="mx-auto max-w-prose font-serif text-[17px] leading-[1.7] text-slate-100">
            {q.passage_a && q.passage_b ? (
              <>
                <section className="mb-7">
                  <div className="mb-2 font-sans text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
                    Text 1
                  </div>
                  <MathText text={q.passage_a} className="block whitespace-pre-wrap" />
                </section>
                <section>
                  <div className="mb-2 font-sans text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
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
              <div className="grid h-full divide-y divide-slate-800 md:grid-cols-2 md:divide-x md:divide-y-0">
                {/* LEFT */}
                <div className="overflow-y-auto px-6 py-8 md:px-10">
                  {figureCard}
                  {hasPassage && passageBlock}
                  {inExplanationMode && (
                    <div className="mt-10 border-t border-slate-700/50 pt-6">{questionPanel}</div>
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
              <div className="grid h-full divide-y divide-slate-800 md:grid-cols-2 md:divide-x md:divide-y-0">
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

function ProgressDot({
  isCurrent,
  isAnswered,
  isCorrect,
  isFlagged,
}: {
  i: number;
  isCurrent: boolean;
  isAnswered: boolean;
  isCorrect: boolean;
  isFlagged: boolean;
}) {
  return (
    <div className="relative">
      <div
        className={cn(
          "h-2 w-2 rounded-full transition-colors",
          !isAnswered && !isCurrent && "bg-slate-700",
          isCurrent && "animate-pulse bg-blue-400",
          isAnswered && isCorrect && "bg-emerald-500",
          isAnswered && !isCorrect && "bg-rose-500"
        )}
      />
      {isFlagged && <Flag className="absolute -right-1 -top-1 h-2 w-2 text-amber-400" />}
    </div>
  );
}

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
      ? "border-emerald-500 bg-emerald-500/15"
      : "border-rose-500 bg-rose-500/15"
    : value
      ? "border-blue-500 bg-blue-500/10"
      : "border-slate-700 bg-slate-900";

  return (
    <div className="mt-8 space-y-3">
      <div className={cn("rounded-xl border px-5 py-4", feedbackClass)}>
        <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-400">
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
          className="w-full border-0 bg-transparent font-mono text-2xl font-bold tabular-nums text-white placeholder:text-slate-600 focus:outline-none md:text-3xl"
        />
        {showFeedback && !wasCorrect && (
          <p className="mt-3 text-sm text-rose-300">
            Your answer: <span className="font-bold">{studentAnswer}</span> · Correct:{" "}
            <span className="font-bold text-emerald-300">{correctAnswer}</span>
            {tolerance ? <span className="text-slate-400"> (± {tolerance})</span> : null}
          </p>
        )}
      </div>
    </div>
  );
}

function BottomToolbar({
  subject,
  onDesmos,
  onScratchpad,
  onFlag,
  state,
}: {
  subject: "reading" | "math";
  onDesmos: () => void;
  onScratchpad: () => void;
  onFlag: () => void;
  state: ReturnType<typeof useQuiz>["state"];
}) {
  const dots = Array.from({ length: QUIZ_TOTAL_QUESTIONS }, (_, i) => {
    const rec = state.records[i];
    return {
      i,
      isCurrent: i === state.currentIndex,
      isAnswered: rec?.isCorrect === true || rec?.isCorrect === false,
      isCorrect: rec?.isCorrect === true,
      isFlagged: rec?.flagged === true,
    };
  });

  return (
    <div className="absolute inset-x-0 bottom-0 z-10 flex h-16 items-center border-t border-slate-800 bg-slate-950/80 px-6 backdrop-blur-sm">
      <div className="flex items-center gap-2">
        {subject === "math" && (
          <button
            onClick={onDesmos}
            className={cn(
              "flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold transition-colors",
              state.isDesmosOpen
                ? "border-indigo-400 bg-indigo-500 text-white"
                : "border-slate-700 text-slate-300 hover:border-indigo-500 hover:text-white"
            )}
          >
            <Calculator className="h-4 w-4" /> Desmos
          </button>
        )}
        <button
          onClick={onScratchpad}
          className={cn(
            "flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold transition-colors",
            state.isScratchpadOpen
              ? "border-slate-100 bg-slate-200 text-slate-900"
              : "border-slate-700 text-slate-300 hover:border-slate-400 hover:text-white"
          )}
        >
          <PencilLine className="h-4 w-4" /> Scratchpad
        </button>
      </div>

      <div className="flex flex-1 items-center justify-center gap-2">
        {dots.map((d) => (
          <ProgressDot key={d.i} {...d} />
        ))}
      </div>

      <button
        onClick={onFlag}
        className="flex items-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-sm font-semibold text-slate-300 transition-colors hover:border-rose-500 hover:text-rose-400"
      >
        <Flag className="h-4 w-4" /> Flag
      </button>
    </div>
  );
}

function VideoPromptBanner({
  videoUrl,
  onDismiss,
}: {
  videoUrl: string | null;
  onDismiss: () => void;
}) {
  useEffect(() => {
    playSound("error");
  }, []);
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-[70] flex flex-col items-center justify-center bg-slate-950/95 p-6 backdrop-blur-sm"
    >
      <button
        onClick={onDismiss}
        className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full text-slate-400 hover:bg-white/10 hover:text-white"
        aria-label="Dismiss"
      >
        <X className="h-5 w-5" />
      </button>
      <p className="mb-4 max-w-lg text-center text-lg font-semibold text-white">
        This concept might need another look before continuing.
      </p>
      <div className="aspect-video w-full max-w-3xl overflow-hidden rounded-xl border border-slate-700 bg-slate-900">
        {videoUrl ? (
          <video src={videoUrl} controls autoPlay className="h-full w-full" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-sm text-slate-500">
            Lesson video will auto-play once uploaded.
          </div>
        )}
      </div>
    </motion.div>
  );
}
