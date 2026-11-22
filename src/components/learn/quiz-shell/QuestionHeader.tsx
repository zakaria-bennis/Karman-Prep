"use client";
import type { QuizMode } from "@/lib/quiz/mode";
import styles from "./pane.module.css";
import shell from "./quiz-shell.module.css";
import { BookmarkIcon, EliminatorIcon, ReviewMarkIcon } from "./icons";

/** Question number, markers and the eliminator toggle (spec: Bluebook tools). Asking the tutor
 *  about a question is in the More menu (founder, 2026-11-17). An admin also sees a quiet
 *  "Generated" mark on a question the generator made; students never do. */
export function QuestionHeader({
  number,
  generated = false,
  mode,
  markedForReview,
  bookmarked,
  eliminatorOn,
  onToggleReview,
  onToggleBookmark,
  onToggleEliminator,
  showEliminator,
}: {
  number: number;
  /** The host's admin-only mark for a generated question. */
  generated?: boolean;
  mode: QuizMode;
  markedForReview: boolean;
  bookmarked: boolean;
  eliminatorOn: boolean;
  showEliminator: boolean;
  onToggleReview(): void;
  onToggleBookmark(): void;
  onToggleEliminator(): void;
}) {
  const on = (v: boolean) => (v ? "on" : "off");
  return (
    <div className={styles.header}>
      <span className={styles.number} aria-label={`Question ${number}`}>
        {number}
      </span>
      {generated && (
        <span className={styles.generated} title="Made by the question generator">
          Generated
        </span>
      )}
      {mode.markForReview && (
        <button
          type="button"
          className={styles.marker}
          aria-pressed={markedForReview}
          onClick={onToggleReview}
        >
          <ReviewMarkIcon state={on(markedForReview)} />
          <span>Mark for review</span>
        </button>
      )}
      <span className={styles.spacer} />
      {mode.canBookmark && (
        <button
          type="button"
          className={shell.tool}
          aria-label="Bookmark"
          aria-pressed={bookmarked}
          onClick={onToggleBookmark}
        >
          <BookmarkIcon state={on(bookmarked)} />
        </button>
      )}
      {showEliminator && (
        <button
          type="button"
          className={shell.tool}
          aria-label="Answer eliminator"
          aria-pressed={eliminatorOn}
          onClick={onToggleEliminator}
        >
          <EliminatorIcon state={on(eliminatorOn)} size={26} />
        </button>
      )}
    </div>
  );
}
