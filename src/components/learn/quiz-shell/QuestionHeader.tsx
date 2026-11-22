"use client";
import { lazy, Suspense } from "react";
import type { QuizMode } from "@/lib/quiz/mode";
import styles from "./pane.module.css";
import shell from "./quiz-shell.module.css";
import { BookmarkIcon, EliminatorIcon, ReviewMarkIcon } from "./icons";

/** The admin's mark and Report button, loaded only when an admin has one to see. */
const GeneratedMark = lazy(() => import("@/components/admin/GeneratedMark"));

/** Question number, markers and the eliminator toggle (spec: Bluebook tools). Asking the tutor
 *  about a question is in the More menu (founder, 2026-11-17). An admin also sees the
 *  "Generated" mark and its Report button on a question the generator made; students never do. */
export function QuestionHeader({
  number,
  generated,
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
  /** Admins only: the question's id when the generator made it (the mark and its Report). */
  generated?: string;
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
        <Suspense fallback={null}>
          <GeneratedMark questionId={generated} />
        </Suspense>
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
