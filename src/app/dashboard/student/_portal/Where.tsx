import type { ReactNode } from "react";
import styles from "./shell.module.css";

/** The heading of a page inside another: a round way back, the page it came from in small words,
 *  and its own name under them, on one piece of glass (founder, 2026-11-19). */
export function Where({
  from,
  onBack,
  children,
}: {
  from: string;
  onBack: () => void;
  /** The page's name: the shell's own h1. */
  children: ReactNode;
}) {
  return (
    <div className={styles.where}>
      <button
        type="button"
        className={styles.whereBack}
        aria-label={`Back to ${from}`}
        onClick={onBack}
      >
        <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
          <path d="M14.500 6.500L9 12l5.500 5.500" />
        </svg>
      </button>
      <div className={styles.whereText}>
        <small>{from}</small>
        {children}
      </div>
    </div>
  );
}
