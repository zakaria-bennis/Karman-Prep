"use client";

// ============================================================
// QuizEngine — full-screen adaptive quiz experience.
// Driven by QuizContext. Launches over the LessonOverlay.
// ============================================================

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { Flag, Loader2 } from "lucide-react";
import type { MappedNode } from "./ConstellationMap";
import { QUIZ_TOTAL_QUESTIONS, useQuiz } from "@/contexts/QuizContext";
import type { QuizQuestionWithChoices } from "@/types/quiz";
import DesmosWindow from "./DesmosWindow";
import Scratchpad from "./Scratchpad";
import QuizResults from "./QuizResults";
import { ActiveQuizScreen } from "./quiz/ActiveQuizScreen";
import { BottomToolbar } from "./quiz/BottomToolbar";
import { VideoPromptBanner } from "./quiz/VideoPromptBanner";

interface Props {
  node: MappedNode;
  videoUrl?: string | null;
  onClose: () => void;
  onGoToNext: (() => void) | null;
}

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
      className="fixed inset-0 z-[60] overflow-hidden bg-night text-ivory"
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
              className="pointer-events-none absolute inset-0 z-[65] bg-night"
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
              className="pointer-events-none absolute inset-0 z-[65] bg-night"
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
                Send it to your tutor&apos;s review queue. An optional note helps them understand
                what went wrong.
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
