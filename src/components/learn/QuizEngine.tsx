"use client";

// QuizEngine: the adaptive skill-practice host. Runs QuizContext and renders the shared quiz
// shell (docs/superpowers/specs/2026-10-27-quiz-engine-design.md) over the lesson.

import { createPortal } from "react-dom";
import { AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import type { MappedNode } from "./ConstellationMap";
import { useQuiz } from "@/contexts/QuizContext";
import { modeFor } from "@/lib/quiz/mode";
import { clearWorkspaces } from "@/lib/quiz/workspace";
import {
  actionFlagForTutor,
  actionQuizStudentState,
  actionReportProblem,
  actionToggleBookmark,
} from "@/app/learn/saved-question-actions";
import QuizResults from "./QuizResults";
import { VideoPromptBanner } from "./quiz/VideoPromptBanner";
import { QuizShell } from "./quiz-shell/QuizShell";
import { bandRank } from "./quiz-shell/LevelUpCard";

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
    retakeQuiz,
    reset,
  } = useQuiz();
  const [reviewIndex, setReviewIndex] = useState<number | null>(null);
  const [inactivityResetKey, setInactivityResetKey] = useState(0);
  const [student, setStudent] = useState<{
    hasTutor: boolean;
    saved: Record<string, "bookmark" | "tutor_flag">;
  }>({
    hasTutor: false,
    saved: {},
  });
  const [levelUpSeen, setLevelUpSeen] = useState(false);
  const displayIndex = reviewIndex ?? state.currentIndex;

  useEffect(() => {
    if (state.phase === "idle") {
      startQuiz(node.id, node.subject, resumeAttemptId).catch((err) => {
        console.error(err);
        onClose();
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const questionIds = state.selectedQuestions.map((q) => q.id).join(",");
  useEffect(() => {
    if (!questionIds) return;
    actionQuizStudentState({ questionIds: questionIds.split(",") })
      .then(setStudent)
      .catch(() => undefined);
  }, [questionIds]);

  // Inactivity auto-close on the results screen (2 min).
  useEffect(() => {
    if (state.phase !== "complete") return;
    const handle = setTimeout(() => {
      reset();
      onClose();
    }, 120_000);
    return () => clearTimeout(handle);
  }, [state.phase, inactivityResetKey, reset, onClose]);

  const attemptKey = state.attemptId ?? "pending";
  const close = () => {
    clearWorkspaces(attemptKey);
    reset();
    onClose();
  };
  const navigate = (index: number) => {
    if (
      index === state.currentIndex + 1 &&
      state.reviews[state.selectedQuestions[state.currentIndex]?.id]
    ) {
      setReviewIndex(null);
      void nextQuestion();
      return;
    }
    if (index < 0 || index >= state.selectedQuestions.length) return;
    setReviewIndex(index === state.currentIndex ? null : index);
  };

  const complete = state.phase === "complete" && state.score !== null && !!state.confidenceBand;
  const rose = complete && bandRank(state.confidenceBand) > bandRank(state.bandBefore);
  const showShell = state.phase !== "complete" || (rose && !levelUpSeen);
  const loading =
    state.phase === "idle" || state.phase === "loading" || state.selectedQuestions.length === 0;

  if (typeof document === "undefined") return null;
  return createPortal(
    <div
      className="fixed inset-0 z-[60]"
      onPointerDown={() => state.phase === "complete" && setInactivityResetKey((k) => k + 1)}
    >
      {showShell && (
        <QuizShell
          mode={modeFor("skill", { hasTutor: student.hasTutor })}
          questions={state.selectedQuestions}
          total={state.targetLength || state.selectedQuestions.length}
          attemptKey={attemptKey}
          index={displayIndex}
          section={node.subject === "reading" ? "Reading and Writing" : "Math"}
          topic={node.topic}
          loading={loading}
          reviews={state.reviews}
          saved={student.saved}
          startedAtMs={state.questionStartedAt || undefined}
          hasCalculator={node.subject === "math"}
          onNavigate={navigate}
          onSelectAnswer={(id, answer) => {
            if (answer && id === state.selectedQuestions[state.currentIndex]?.id)
              selectAnswer(answer);
          }}
          onSubmit={() => submitAnswer()}
          onFinish={() => void nextQuestion()}
          onExit={close}
          onToggleBookmark={(id) =>
            void actionToggleBookmark({ questionId: id }).catch(() => undefined)
          }
          onFlagForTutor={(id, note) =>
            void actionFlagForTutor({ questionId: id, nodeId: node.id, note: note || null }).catch(
              () => undefined
            )
          }
          onReportProblem={(id, note) =>
            void actionReportProblem({ questionId: id, nodeId: node.id, note }).catch(
              () => undefined
            )
          }
          levelUp={
            rose && !levelUpSeen
              ? { skill: node.topic, before: state.bandBefore, after: state.confidenceBand! }
              : null
          }
          onLevelUpDone={() => setLevelUpSeen(true)}
        />
      )}

      <AnimatePresence>
        {state.phase === "video_prompt" && (
          <VideoPromptBanner
            videoUrl={videoUrl ?? node.video_url ?? null}
            onDismiss={() => dismissVideoPrompt()}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {complete && !showShell && (
          <QuizResults
            score={state.score!}
            correct={state.correctCount}
            total={state.targetLength}
            band={state.confidenceBand!}
            records={state.records}
            questions={state.selectedQuestions}
            onGoToNext={onGoToNext}
            onRetake={() => {
              clearWorkspaces(attemptKey);
              setLevelUpSeen(false);
              void retakeQuiz();
            }}
          />
        )}
      </AnimatePresence>
    </div>,
    document.body
  );
}
