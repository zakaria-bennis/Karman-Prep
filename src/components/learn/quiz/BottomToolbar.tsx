"use client";

import { useState } from "react";
import { Flag, LayoutGrid } from "lucide-react";
import { QUIZ_TOTAL_QUESTIONS, useQuiz } from "@/contexts/QuizContext";
import { QuestionGuide } from "./QuizTools";
import styles from "./workspace.module.css";

export function BottomToolbar({
  onFlag,
  state,
  bookmarks,
}: {
  onScratchpad: () => void;
  onFlag: () => void;
  state: ReturnType<typeof useQuiz>["state"];
  bookmarks: Set<string>;
}) {
  const { navigate, nextQuestion } = useQuiz();
  const [guide, setGuide] = useState(false);
  const submitted = state.phase === "submitted_correct" || state.phase === "submitted_wrong";
  return (
    <>
      <div className="absolute inset-x-0 bottom-0 z-10 flex h-16 items-center justify-between gap-2 border-t border-bronze bg-night px-3">
        <button
          type="button"
          className={styles.tool}
          onClick={onFlag}
          aria-label="Flag question for tutor"
        >
          <Flag size={16} />
        </button>
        <button type="button" className={styles.tool} onClick={() => setGuide(true)}>
          <LayoutGrid size={16} /> Questions
        </button>
        <div className="flex gap-2">
          <button
            type="button"
            className={styles.tool}
            disabled={state.currentIndex === 0}
            onClick={() => navigate(state.currentIndex - 1)}
          >
            Previous
          </button>
          <button
            type="button"
            className={styles.tool}
            disabled={!submitted && state.currentIndex === state.selectedQuestions.length - 1}
            onClick={() => {
              if (state.currentIndex < state.selectedQuestions.length - 1)
                navigate(state.currentIndex + 1);
              else void nextQuestion();
            }}
          >
            {state.currentIndex === QUIZ_TOTAL_QUESTIONS - 1 ? "Finish" : "Next"}
          </button>
        </div>
      </div>
      {guide && (
        <QuestionGuide onClose={() => setGuide(false)}>
          <p>Practice module · {state.subject === "math" ? "Math" : "Reading & Writing"}</p>
          <p>
            Review any available question. New questions are selected adaptively after you submit an
            answer.
          </p>
          <div className={styles.guideGrid}>
            {Array.from({ length: QUIZ_TOTAL_QUESTIONS }, (_, i) => {
              const q = state.selectedQuestions[i];
              const record = state.records[i];
              const answered = record?.isCorrect != null;
              return (
                <button
                  type="button"
                  key={i}
                  disabled={!q}
                  aria-current={i === state.currentIndex ? "true" : undefined}
                  aria-label={`Question ${i + 1}${!q ? " — locked until selected" : answered ? " — answered" : " — unanswered"}`}
                  onClick={() => {
                    navigate(i);
                    setGuide(false);
                  }}
                >
                  {i + 1} {answered ? "✓" : "○"}
                  {q && bookmarks.has(q.id) ? " ⚑" : ""}
                </button>
              );
            })}
          </div>
          <p>✓ Answered · ○ Unanswered · ⚑ Bookmarked</p>
        </QuestionGuide>
      )}
    </>
  );
}
