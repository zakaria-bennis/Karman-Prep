"use client";
import { useState } from "react";
import { Bookmark, LayoutGrid } from "lucide-react";
import { QuestionGuide } from "../quiz/QuizTools";
import styles from "../quiz/workspace.module.css";

export function CatalogStudyTools({
  questionId,
  questions,
  onJump,
  bookmarks,
  onBookmark,
}: {
  questionId?: string;
  questions: { id: string; question_text: string }[];
  onJump(index: number): void;
  bookmarks: Set<string>;
  onBookmark(id: string): void;
}) {
  const [guide, setGuide] = useState(false);
  return (
    <>
      <button
        type="button"
        className={styles.tool}
        disabled={!questionId}
        aria-label={
          questionId && bookmarks.has(questionId) ? "Remove bookmark" : "Bookmark for review"
        }
        aria-pressed={!!questionId && bookmarks.has(questionId)}
        onClick={() => questionId && onBookmark(questionId)}
      >
        <Bookmark size={16} />
      </button>
      <button type="button" className={styles.tool} onClick={() => setGuide(true)}>
        <LayoutGrid size={16} />
        Questions
      </button>
      {guide && (
        <QuestionGuide onClose={() => setGuide(false)}>
          <p>Current skill · other modules are locked during this practice.</p>
          <div className="grid gap-2">
            {questions.map((q, i) => (
              <button
                type="button"
                className="p-3 text-left"
                key={q.id}
                aria-current={q.id === questionId ? "true" : undefined}
                onClick={() => {
                  onJump(i);
                  setGuide(false);
                }}
              >
                {q.question_text.slice(0, 140)} {bookmarks.has(q.id) ? "⚑" : ""}
              </button>
            ))}
          </div>
          <p>
            Saved responses are read-only. New session questions become available after checking the
            current answer.
          </p>
        </QuestionGuide>
      )}
    </>
  );
}
