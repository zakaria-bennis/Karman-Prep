"use client";
import type { ReactNode } from "react";
import styles from "./quiz-shell.module.css";
import { ChevronIcon } from "./icons";
import { BarButton } from "./TopBar";

/** Back, the question navigator and the one primary button (spec: Bars). */
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
      <BarButton
        flow="row"
        icon={<ChevronIcon dir="left" />}
        word="Back"
        disabled={!canBack}
        onClick={onBack}
      />
      <div className={styles.navSlot}>
        {centre ?? (
          <button
            type="button"
            className={styles.counter}
            onClick={onOpenNavigator}
            aria-haspopup="dialog"
          >
            <span>
              Question {index + 1} of {total}
            </span>
            <ChevronIcon dir="up" size={16} />
          </button>
        )}
      </div>
      {primary}
    </footer>
  );
}
