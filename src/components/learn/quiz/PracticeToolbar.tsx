"use client";
import { useState } from "react";
import { Bookmark, Flag, LayoutGrid, PencilLine } from "lucide-react";
import type { QuizState } from "@/contexts/QuizContext";
import { CalculatorTrigger } from "@/components/calculator/CalculatorScope";
import { QuestionGuide, HighlightTool, PracticeTimer } from "./QuizTools";
import styles from "./workspace.module.css";

export function PracticeTopTools({
  bookmarked,
  onBookmark,
  onScratchpad,
  startedAt,
}: {
  bookmarked: boolean;
  onBookmark(): void;
  onScratchpad(): void;
  startedAt: number;
}) {
  return (
    <>
      <CalculatorTrigger />
      <button className={styles.tool} onClick={onScratchpad} aria-label="Scratchpad">
        <PencilLine size={16} />
      </button>
      <HighlightTool />
      <PracticeTimer startedAt={startedAt} />
      <button
        className={styles.tool}
        aria-label={bookmarked ? "Remove bookmark" : "Bookmark for review"}
        aria-pressed={bookmarked}
        onClick={onBookmark}
      >
        <Bookmark size={16} />
      </button>
    </>
  );
}
export function PracticeToolbar({
  state,
  index,
  onNavigate,
  onNext,
  onFlag,
  bookmarks,
}: {
  state: QuizState;
  index: number;
  onNavigate(index: number): void;
  onNext(): void;
  onFlag(): void;
  bookmarks: Set<string>;
}) {
  const [guide, setGuide] = useState(false);
  const atCurrent = index === state.currentIndex;
  const submitted = state.phase === "submitted_correct" || state.phase === "submitted_wrong";
  return (
    <>
      <div className="absolute inset-x-0 bottom-0 z-10 flex h-16 items-center justify-between gap-2 border-t border-bronze bg-night px-3">
        <button className={styles.tool} onClick={onFlag} aria-label="Flag question for tutor">
          <Flag size={16} />
        </button>
        <button className={styles.tool} onClick={() => setGuide(true)}>
          <LayoutGrid size={16} />
          Questions
        </button>
        <div className="flex gap-2">
          <button
            className={styles.tool}
            disabled={index === 0}
            onClick={() => onNavigate(index - 1)}
          >
            Previous
          </button>
          <button
            className={styles.tool}
            disabled={atCurrent && !submitted}
            onClick={() => (atCurrent ? onNext() : onNavigate(index + 1))}
          >
            {atCurrent && index + 1 >= state.targetLength ? "Finish" : "Next"}
          </button>
        </div>
      </div>
      {guide && (
        <QuestionGuide onClose={() => setGuide(false)}>
          <p>Current practice module</p>
          <p>
            Review any available question. New questions are selected adaptively after you submit an
            answer. Other modules are locked during this attempt.
          </p>
          <div className={styles.guideGrid}>
            {Array.from({ length: state.targetLength }, (_, i) => {
              const q = state.selectedQuestions[i];
              return (
                <button
                  key={i}
                  disabled={!q}
                  aria-current={i === index ? "true" : undefined}
                  aria-label={`Question ${i + 1}${!q ? " — locked until selected" : ""}`}
                  onClick={() => {
                    onNavigate(i);
                    setGuide(false);
                  }}
                >
                  {i + 1}
                  {q && state.reviews[q.id] ? " ✓" : " ○"}
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
