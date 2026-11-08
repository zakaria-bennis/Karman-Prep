"use client";
import { useState } from "react";
import type { QuizMode } from "@/lib/quiz/mode";
import styles from "./pane.module.css";
import shell from "./quiz-shell.module.css";
import { BookmarkIcon, EliminatorIcon, FlagIcon, ReviewMarkIcon } from "./icons";

/** Question number, markers and the eliminator toggle (spec: Bluebook tools). */
export function QuestionHeader({
  number,
  mode,
  markedForReview,
  bookmarked,
  flagged,
  eliminatorOn,
  onToggleReview,
  onToggleBookmark,
  onFlag,
  onToggleEliminator,
  showEliminator,
}: {
  number: number;
  mode: QuizMode;
  markedForReview: boolean;
  bookmarked: boolean;
  flagged: boolean;
  eliminatorOn: boolean;
  showEliminator: boolean;
  onToggleReview(): void;
  onToggleBookmark(): void;
  onFlag(note: string): void;
  onToggleEliminator(): void;
}) {
  const [noteOpen, setNoteOpen] = useState(false);
  const [note, setNote] = useState("");
  const on = (v: boolean) => (v ? "on" : "off");
  return (
    <div className={styles.header}>
      <span className={styles.number} aria-label={`Question ${number}`}>
        {number}
      </span>
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
      {mode.showTutorFlag && (
        <span className={styles.popoverAnchor}>
          <button
            type="button"
            className={shell.tool}
            aria-label="Flag for my tutor"
            aria-pressed={flagged}
            aria-expanded={noteOpen}
            onClick={() => (flagged ? undefined : setNoteOpen((v) => !v))}
          >
            <FlagIcon state={on(flagged)} />
          </button>
          {noteOpen && (
            <form
              className={styles.popover}
              onSubmit={(e) => {
                e.preventDefault();
                onFlag(note.trim());
                setNoteOpen(false);
              }}
              onKeyDown={(e) => e.key === "Escape" && setNoteOpen(false)}
            >
              <label className={styles.popoverLabel} htmlFor="tutor-flag-note">
                Note for your tutor (optional)
              </label>
              <textarea
                id="tutor-flag-note"
                className={styles.textarea}
                maxLength={2000}
                rows={3}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                autoFocus
              />
              <div className={styles.popoverActions}>
                <button type="button" className={shell.tool} onClick={() => setNoteOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className={shell.tool}>
                  Send to tutor
                </button>
              </div>
            </form>
          )}
        </span>
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
