"use client";

// ============================================================
// QuizEngine — full-screen adaptive quiz experience.
// Driven by QuizContext. Launches over the LessonOverlay.
// ============================================================

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  X, Flag, Calculator, PencilLine, Check, Loader2,
} from "lucide-react";
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
  const { state, startQuiz, selectAnswer, submitAnswer, nextQuestion,
          dismissVideoPrompt, flagCurrent, toggleDesmos, toggleScratchpad,
          retakeQuiz, reset } = useQuiz();

  const containerRef = useRef<HTMLDivElement>(null);
  const [flagOpen, setFlagOpen] = useState(false);
  const [flagNote, setFlagNote] = useState("");
  const [inactivityResetKey, setInactivityResetKey] = useState(0);

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

  // After a correct answer, auto-advance after 800 ms
  useEffect(() => {
    if (state.phase === "submitted_correct") {
      const t = setTimeout(() => nextQuestion(), 800);
      return () => clearTimeout(t);
    }
  }, [state.phase, nextQuestion]);

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
      className="fixed inset-0 z-[60] bg-slate-950 text-white overflow-hidden"
    >
      {/* Loading state */}
      {state.phase === "loading" && (
        <div className="w-full h-full flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
          <p className="text-sm text-slate-400">Loading your adaptive quiz…</p>
        </div>
      )}

      {/* No questions state */}
      {state.phase === "idle" && state.selectedQuestions.length === 0 && (
        <div className="w-full h-full flex flex-col items-center justify-center gap-4 text-center px-6">
          <p className="text-slate-400 max-w-md">Preparing…</p>
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
        />
      )}

      {/* Bottom toolbar — visible during quiz */}
      {(state.phase === "answering" || state.phase === "submitted_correct" || state.phase === "submitted_wrong") && (
        <BottomToolbar
          subject={node.subject}
          onDesmos={toggleDesmos}
          onScratchpad={toggleScratchpad}
          onFlag={() => setFlagOpen(true)}
          state={state}
        />
      )}

      {/* Explanation panel after wrong answer */}
      <AnimatePresence>
        {state.phase === "submitted_wrong" && currentQuestion && (
          <ExplanationPanel
            question={currentQuestion}
            studentAnswer={state.selectedAnswer}
            onNext={() => nextQuestion()}
          />
        )}
      </AnimatePresence>

      {/* 3-consecutive-wrongs video prompt */}
      <AnimatePresence>
        {state.phase === "video_prompt" && (
          <VideoPromptBanner videoUrl={videoUrl ?? node.video_url ?? null} onDismiss={() => dismissVideoPrompt()} />
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
              className="absolute inset-0 z-[65] bg-black pointer-events-none"
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
              className="absolute inset-0 z-[65] bg-black pointer-events-none"
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
            className="fixed inset-0 z-[75] bg-black/70 flex items-center justify-center p-6"
            onClick={() => setFlagOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 10 }}
              className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-2 mb-2">
                <Flag className="w-4 h-4 text-rose-400" />
                <h3 className="text-base font-bold">Flag this question</h3>
              </div>
              <p className="text-xs text-slate-400 mb-4">
                Send it to your tutor's review queue. An optional note helps them understand what went wrong.
              </p>
              <textarea
                value={flagNote}
                onChange={(e) => setFlagNote(e.target.value)}
                placeholder="Optional note (e.g. 'answer key seems wrong', 'ambiguous wording')…"
                rows={3}
                className="w-full rounded-lg bg-slate-800 border border-slate-700 p-3 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-rose-500"
              />
              <div className="flex gap-3 mt-4 justify-end">
                <button
                  onClick={() => setFlagOpen(false)}
                  className="px-4 py-2 text-sm font-semibold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  onClick={handleFlagSubmit}
                  className="px-4 py-2 rounded-lg bg-rose-500 hover:bg-rose-600 text-white text-sm font-bold"
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
}: {
  node: MappedNode;
  q: QuizQuestionWithChoices;
  onClose: () => void;
  onSelectAnswer: (l: string) => void;
  onSubmit: () => void;
  onFlagClick: () => void;
}) {
  const { state } = useQuiz();
  const sortedChoices = useMemo(() =>
    [...q.answer_choices].sort((a, b) => (a.letter > b.letter ? 1 : -1)),
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
      <div className="absolute top-0 inset-x-0 h-14 flex items-center px-6 border-b border-slate-800 bg-slate-950/80 backdrop-blur-sm z-10">
        <div className="flex-1 min-w-0">
          <p className="text-xs text-slate-500 uppercase tracking-widest font-semibold">
            {node.subject === "reading" ? "Reading & Writing" : "Math"}
          </p>
          <p className="text-sm font-bold truncate">{node.topic}</p>
        </div>
        <div className="flex-1 text-center">
          <span className="text-sm font-semibold text-slate-300">
            Question <span className="text-white">{state.currentIndex + 1}</span> of {QUIZ_TOTAL_QUESTIONS}
          </span>
        </div>
        <div className="flex-1 flex justify-end">
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full hover:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white"
            aria-label="Close quiz"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Progress dots row (top) */}
      <div className="absolute top-14 inset-x-0 h-10 flex items-center justify-center gap-2 border-b border-slate-800 bg-slate-950/60 z-10">
        {dots.map((d) => (
          <ProgressDot key={d.i} {...d} />
        ))}
      </div>

      {/* Question area — College Board Bluebook-style split view.
          R&W (with passage): two columns. Left = passage (serif,
            scrollable). Right = question + choices (sans, scrollable).
          Math (no passage): single centered column.
          Vertical divider between columns mimics the SAT digital
          test layout. Each column scrolls independently. */}
      {(() => {
        const hasPassage = !!(q.passage_intro || q.passage || q.passage_a || q.passage_b);

        const choicesAndSubmit = (
          <>
            {q.answer_format === "numeric_entry" ? (
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
                        "w-full text-left rounded-xl border px-5 py-3.5 transition-all",
                        "flex items-start gap-4",
                        !isSubmitted && "hover:border-blue-500 hover:bg-blue-500/5 cursor-pointer",
                        isSelected && !isSubmitted && "border-blue-500 bg-blue-500/10",
                        !isSelected && !isSubmitted && "border-slate-700 bg-slate-900",
                        showCorrect && "border-emerald-500 bg-emerald-500/15",
                        showWrong && "border-rose-500 bg-rose-500/15",
                        isSubmitted && !isSelected && !isCorrect && "opacity-50 border-slate-800"
                      )}
                    >
                      <span className={cn(
                        "shrink-0 w-7 h-7 rounded-full flex items-center justify-center font-bold text-[13px] mt-0.5",
                        !isSubmitted && !isSelected && "bg-slate-800 text-slate-300",
                        !isSubmitted && isSelected && "bg-blue-500 text-white",
                        showCorrect && "bg-emerald-500 text-white",
                        showWrong && "bg-rose-500 text-white",
                        isSubmitted && !isSelected && !isCorrect && "bg-slate-800 text-slate-500"
                      )}>
                        {showCorrect ? <Check className="w-3.5 h-3.5" /> : letter}
                      </span>
                      <span className="text-[16px] text-slate-100 leading-[1.5] flex-1">
                        <MathText text={choice.choice_text} />
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            {!isSubmitted && state.selectedAnswer && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-6 flex justify-end"
              >
                <button
                  onClick={onSubmit}
                  className="px-8 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm transition-colors"
                >
                  Submit Answer
                </button>
              </motion.div>
            )}
          </>
        );

        const questionPanel = (
          <div className="max-w-xl mx-auto">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 mb-4">
              {q.topic_cluster}
            </p>
            {/* For math questions without a passage, the figure renders
                here above the question stem. */}
            {!hasPassage && q.image_url && (
              <div className="mb-5 rounded-xl overflow-hidden border border-slate-700 bg-slate-950 inline-block max-w-full">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={q.image_url}
                  alt={q.image_alt ?? ""}
                  className="max-h-80 w-auto object-contain"
                />
              </div>
            )}
            <h2 className="text-[19px] md:text-[20px] font-medium leading-[1.5] text-slate-100">
              <MathText text={q.question_text} />
            </h2>
            {choicesAndSubmit}
          </div>
        );

        if (hasPassage) {
          // Two-column Bluebook layout.
          return (
            <div className="absolute top-24 inset-x-0 bottom-20 overflow-hidden">
              <div className="h-full grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-800">
                {/* LEFT: passage. Serif typography, generous line-height,
                    sized close to the College Board digital test. */}
                <div className="overflow-y-auto px-6 md:px-10 py-8">
                  <article className="max-w-prose mx-auto font-serif text-[17px] leading-[1.7] text-slate-100">
                    {q.passage_a && q.passage_b ? (
                      <>
                        <section className="mb-7">
                          <div className="text-[10px] font-sans font-bold uppercase tracking-[0.2em] text-slate-500 mb-2">
                            Text 1
                          </div>
                          <MathText text={q.passage_a} className="whitespace-pre-wrap block" />
                        </section>
                        <section>
                          <div className="text-[10px] font-sans font-bold uppercase tracking-[0.2em] text-slate-500 mb-2">
                            Text 2
                          </div>
                          <MathText text={q.passage_b} className="whitespace-pre-wrap block" />
                        </section>
                      </>
                    ) : (
                      <>
                        {/* passage_intro and the passage body share
                            the article's font/size/line-height/color.
                            We deliberately do NOT italicize the intro;
                            College Board reserves italics for work
                            titles inside the prose, not for the source
                            attribution as a whole. Just paragraph-spaced. */}
                        {q.passage_intro && (
                          <p className="mb-5">
                            <MathText text={q.passage_intro} />
                          </p>
                        )}
                        {q.passage && (
                          <MathText text={q.passage} className="whitespace-pre-wrap block" />
                        )}
                      </>
                    )}
                  </article>
                </div>

                {/* RIGHT: question + choices, sans-serif. */}
                <div className="overflow-y-auto px-6 md:px-10 py-8">
                  {questionPanel}
                </div>
              </div>
            </div>
          );
        }

        // Math-without-passage: single centered column.
        return (
          <div className="absolute top-24 inset-x-0 bottom-20 overflow-y-auto px-6 py-8">
            {questionPanel}
          </div>
        );
      })()}
    </>
  );

  // Re-inject the unused flag click binding to silence the lint for onFlagClick
  void onFlagClick;
}

function ProgressDot({ isCurrent, isAnswered, isCorrect, isFlagged }: {
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
          "w-2 h-2 rounded-full transition-colors",
          !isAnswered && !isCurrent && "bg-slate-700",
          isCurrent && "bg-blue-400 animate-pulse",
          isAnswered && isCorrect && "bg-emerald-500",
          isAnswered && !isCorrect && "bg-rose-500",
        )}
      />
      {isFlagged && (
        <Flag className="absolute -top-1 -right-1 w-2 h-2 text-amber-400" />
      )}
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
        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
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
          className="w-full bg-transparent border-0 text-2xl md:text-3xl font-mono font-bold text-white placeholder:text-slate-600 focus:outline-none tabular-nums"
        />
        {showFeedback && !wasCorrect && (
          <p className="mt-3 text-sm text-rose-300">
            Your answer: <span className="font-bold">{studentAnswer}</span> · Correct: <span className="font-bold text-emerald-300">{correctAnswer}</span>
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
    <div className="absolute bottom-0 inset-x-0 h-16 border-t border-slate-800 bg-slate-950/80 backdrop-blur-sm z-10 flex items-center px-6">
      <div className="flex items-center gap-2">
        {subject === "math" && (
          <button
            onClick={onDesmos}
            className={cn(
              "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold border transition-colors",
              state.isDesmosOpen
                ? "bg-indigo-500 border-indigo-400 text-white"
                : "border-slate-700 hover:border-indigo-500 text-slate-300 hover:text-white"
            )}
          >
            <Calculator className="w-4 h-4" /> Desmos
          </button>
        )}
        <button
          onClick={onScratchpad}
          className={cn(
            "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold border transition-colors",
            state.isScratchpadOpen
              ? "bg-slate-200 border-slate-100 text-slate-900"
              : "border-slate-700 hover:border-slate-400 text-slate-300 hover:text-white"
          )}
        >
          <PencilLine className="w-4 h-4" /> Scratchpad
        </button>
      </div>

      <div className="flex-1 flex items-center justify-center gap-2">
        {dots.map((d) => <ProgressDot key={d.i} {...d} />)}
      </div>

      <button
        onClick={onFlag}
        className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold border border-slate-700 text-slate-300 hover:border-rose-500 hover:text-rose-400 transition-colors"
      >
        <Flag className="w-4 h-4" /> Flag
      </button>
    </div>
  );
}

function VideoPromptBanner({ videoUrl, onDismiss }: { videoUrl: string | null; onDismiss: () => void }) {
  useEffect(() => { playSound("error"); }, []);
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-[70] bg-slate-950/95 backdrop-blur-sm flex flex-col items-center justify-center p-6"
    >
      <button
        onClick={onDismiss}
        className="absolute top-4 right-4 w-9 h-9 rounded-full hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center"
        aria-label="Dismiss"
      >
        <X className="w-5 h-5" />
      </button>
      <p className="text-center text-lg font-semibold text-white mb-4 max-w-lg">
        This concept might need another look before continuing.
      </p>
      <div className="w-full max-w-3xl aspect-video rounded-xl overflow-hidden bg-slate-900 border border-slate-700">
        {videoUrl ? (
          <video src={videoUrl} controls autoPlay className="w-full h-full" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-500 text-sm">
            Lesson video will auto-play once uploaded.
          </div>
        )}
      </div>
    </motion.div>
  );
}
