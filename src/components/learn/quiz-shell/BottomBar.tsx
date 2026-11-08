"use client";
import type { ReactNode } from "react";
import styles from "./quiz-shell.module.css";

/** Back, the question counter (opens the navigator) and the one primary button. */
export function BottomBar({
  index,
  total,
  canBack,
  onBack,
  onOpenNavigator,
  primary,
  centre,
  feedback,
}: {
  index: number;
  total: number;
  canBack: boolean;
  onBack(): void;
  onOpenNavigator(): void;
  primary: ReactNode;
  centre?: ReactNode;
  feedback?: ReactNode;
}) {
  return (
    <footer data-quiz-bar="bottom" className={`${styles.bottomBar} ${styles.glass}`}>
      {feedback}
      <button type="button" className={styles.tool} disabled={!canBack} onClick={onBack}>
        Back
      </button>
      {centre ?? (
        <button
          type="button"
          className={styles.counter}
          onClick={onOpenNavigator}
          aria-haspopup="dialog"
        >
          Question {index + 1} of {total}
        </button>
      )}
      {primary}
    </footer>
  );
}
