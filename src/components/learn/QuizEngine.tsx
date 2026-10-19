"use client";

// ============================================================
// QuizEngine — full-screen adaptive quiz experience.
// Driven by QuizContext. Launches over the LessonOverlay.
// ============================================================

import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { Flag, Loader2 } from "lucide-react";
import type { MappedNode } from "./ConstellationMap";
import { useQuiz } from "@/contexts/QuizContext";
import type { StudentQuizQuestion } from "@/types/quiz";
import Scratchpad from "./Scratchpad";
import { AnnotationProvider } from "./quiz/PassageAnnotations";
import QuizResults from "./QuizResults";
import { ActiveQuizScreen } from "./quiz/ActiveQuizScreen";
import { PracticeToolbar, PracticeTopTools } from "./quiz/PracticeToolbar";
import { CalculatorScope } from "@/components/calculator/CalculatorScope";
import { makeQuestionKey } from "@/components/calculator/question-key";
import { QuestionTransition } from "./quiz/QuizTools";
import { VideoPromptBanner } from "./quiz/VideoPromptBanner";
import { QuizMenu } from "./quiz/QuizMenu";

interface Props {
  node: MappedNode;
  videoUrl?: string | null;
  onClose: () => void;
  onGoToNext: (() => void) | null;
  resumeAttemptId?: string;
}

export default function QuizEngine({
  node,
  videoUrl,
  onClose,
  onGoToNext,
  resumeAttemptId,
}: Props) {
  const {
    state,
    startQuiz,
    selectAnswer,
    submitAnswer,
    nextQuestion,
    dismissVideoPrompt,
    flagCurrent,
    toggleScratchpad,
    retakeQuiz,
    reset,
  } = useQuiz();

  const [reviewIndex, setReviewIndex] = useState<number | null>(null);
  const [calculatorOpen, setCalculatorOpen] = useState(false);
  const [bookmarks, setBookmarks] = useState<Set<string>>(new Set());
  const [direction, setDirection] = useState<"next" | "previous">("next");
  const displayIndex = reviewIndex ?? state.currentIndex;
  const navigate = (index: number) => {
    if (index < 0 || index >= state.selectedQuestions.length) return;
    setDirection(index < displayIndex ? "previous" : "next");
    setReviewIndex(index === state.currentIndex ? null : index);
  };
  const containerRef = useRef<HTMLDivElement>(null);
  const [flagOpen, setFlagOpen] = useState(false);
  const [flagNote, setFlagNote] = useState("");
  const [inactivityResetKey, setInactivityResetKey] = useState(0);
  // Explanations remain visible until the student explicitly navigates.
  const [showExplanations, setShowExplanations] = useState(false);
  // Kick off the quiz when the engine mounts
  useEffect(() => {
    if (state.phase === "idle") {
      startQuiz(node.id, node.subject, resumeAttemptId).catch((err) => {
        console.error(err);
        alert(err.message ?? "Failed to start quiz");
        onClose();
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reset the explanations toggle whenever the active question
  // changes — fresh question, fresh blank slate.
  const currentQuestionId =
    state.phase !== "idle" && state.phase !== "loading" && state.selectedQuestions.length > 0
      ? state.selectedQuestions[displayIndex]?.id
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
    // Only results have an inactivity timer. Updating while answering can
    // replace KaTeX's HTML between pointerdown and pointerup, losing the click.
    if (state.phase === "complete") setInactivityResetKey((k) => k + 1);
  }

  async function handleFlagSubmit() {
    await flagCurrent(flagNote.trim() || undefined);
    setFlagOpen(false);
    setFlagNote("");
  }

  const currentQuestion: StudentQuizQuestion | null =
    state.phase !== "idle" && state.phase !== "loading" && state.selectedQuestions.length > 0
      ? state.selectedQuestions[displayIndex]
      : null;

  const reviewing = displayIndex !== state.currentIndex;
  const review = currentQuestion ? state.reviews[currentQuestion.id] : null;
  const displayedState =
    reviewing && review
      ? {
          ...state,
          currentIndex: displayIndex,
          selectedAnswer: review.studentAnswer,
          phase: review.isCorrect ? ("submitted_correct" as const) : ("submitted_wrong" as const),
        }
      : state;
  const advance = () => {
    setDirection("next");
    if (reviewing) navigate(displayIndex + 1);
    else void nextQuestion();
  };
  const questionKey = makeQuestionKey(String(state.attemptId), currentQuestionId ?? state.phase);
  if (typeof document === "undefined") return null;
  return createPortal(
    <AnnotationProvider key={state.attemptId ?? "new"}>
      <motion.div
        ref={containerRef}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25 }}
        onPointerDown={registerActivity}
        className="fixed inset-0 z-[60] overflow-hidden bg-night text-ivory"
      >
        <CalculatorScope
          key={questionKey}
          questionKey={questionKey}
          enabled={
            node.subject === "math" &&
            currentQuestion?.subject === "math" &&
            state.phase !== "complete"
          }
          open={calculatorOpen}
          onOpenChange={setCalculatorOpen}
        >
          {/* Loading state */}
          {state.phase === "loading" && (
            <div className="flex h-full w-full flex-col items-center justify-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-info" />
              <p className="text-sm text-taupe">Loading your adaptive quiz…</p>
            </div>
          )}

          {/* No questions state */}
          {state.phase === "idle" && state.selectedQuestions.length === 0 && (
            <div className="flex h-full w-full flex-col items-center justify-center gap-4 px-6 text-center">
              <p className="max-w-md text-taupe">Preparing…</p>
            </div>
          )}

          {/* Active quiz screens */}
          {currentQuestion && state.phase !== "complete" && (
            <QuestionTransition index={displayIndex} direction={direction}>
              <ActiveQuizScreen
                node={node}
                q={currentQuestion}
                onClose={() => {
                  reset();
                  onClose();
                }}
                onFlagClick={() => setFlagOpen(true)}
                stateOverride={displayedState}
                onSelectAnswer={reviewing ? () => {} : selectAnswer}
                onSubmit={() => (reviewing ? undefined : submitAnswer())}
                showExplanations={showExplanations}
                onToggleExplanations={setShowExplanations}
                onNext={advance}
                menu={
                  <>
                    <PracticeTopTools
                      bookmarked={bookmarks.has(currentQuestion.id)}
                      onBookmark={() =>
                        setBookmarks((old) => {
                          const next = new Set(old);
                          if (next.has(currentQuestion.id)) next.delete(currentQuestion.id);
                          else next.add(currentQuestion.id);
                          return next;
                        })
                      }
                      onScratchpad={toggleScratchpad}
                      startedAt={state.questionStartedAt}
                    />
                    <QuizMenu subject={node.subject} />
                  </>
                }
              />
            </QuestionTransition>
          )}

          {/* Bottom toolbar — visible during quiz */}
          {(state.phase === "answering" ||
            state.phase === "submitted_correct" ||
            state.phase === "submitted_wrong") && (
            <PracticeToolbar
              index={displayIndex}
              onNavigate={navigate}
              onNext={advance}
              bookmarks={bookmarks}
              onFlag={() => setFlagOpen(true)}
              state={state}
            />
          )}

          {/* 3-consecutive-wrongs video prompt */}
          <AnimatePresence>
            {state.phase === "video_prompt" && (
              <VideoPromptBanner
                videoUrl={videoUrl ?? node.video_url ?? null}
                onDismiss={() => dismissVideoPrompt()}
              />
            )}
          </AnimatePresence>

          {/* Keep the canvas mounted across close/reopen and question navigation. */}
          <Scratchpad
            pageKey={currentQuestion?.id}
            open={state.isScratchpadOpen}
            onClose={toggleScratchpad}
            constraintsRef={containerRef}
          />

          {/* Flag dialog */}
          <AnimatePresence>
            {flagOpen && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[75] flex items-center justify-center bg-night/70 p-6"
                onClick={() => setFlagOpen(false)}
              >
                <motion.div
                  initial={{ scale: 0.9, y: 10 }}
                  animate={{ scale: 1, y: 0 }}
                  exit={{ scale: 0.9, y: 10 }}
                  className="w-full max-w-md rounded-2xl border border-bronze bg-surface p-6"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="mb-2 flex items-center gap-2">
                    <Flag className="h-4 w-4 text-error" />
                    <h3 className="text-base font-bold">Flag this question</h3>
                  </div>
                  <p className="mb-4 text-xs text-taupe">
                    Send it to your tutor&apos;s review queue. An optional note helps them
                    understand what went wrong.
                  </p>
                  <textarea
                    value={flagNote}
                    onChange={(e) => setFlagNote(e.target.value)}
                    placeholder="Optional note (e.g. 'answer key seems wrong', 'ambiguous wording')…"
                    rows={3}
                    className="w-full rounded-lg border border-bronze bg-surface-raised p-3 text-sm text-ivory placeholder:text-taupe focus:border-error/40 focus:outline-none"
                  />
                  <div className="mt-4 flex justify-end gap-3">
                    <button
                      onClick={() => setFlagOpen(false)}
                      className="px-4 py-2 text-sm font-semibold text-taupe hover:text-ivory"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleFlagSubmit}
                      className="rounded-lg bg-error px-4 py-2 text-sm font-bold text-ivory hover:bg-error-bright"
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
                total={state.targetLength}
                band={state.confidenceBand}
                records={state.records}
                questions={state.selectedQuestions}
                onGoToNext={onGoToNext}
                onRetake={() => retakeQuiz()}
              />
            )}
          </AnimatePresence>
        </CalculatorScope>
      </motion.div>
    </AnnotationProvider>,
    document.body
  );
}
