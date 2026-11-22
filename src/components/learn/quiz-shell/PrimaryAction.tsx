"use client";
// The bottom bar's one raised button: Submit section on the check page, Submit before an answer is
// graded, then Next (Finish or Review on the last question). After a miss graded in front of the
// student it holds for three seconds while it fills (use-shell-effects.ts, useMissHold).
import styles from "./quiz-shell.module.css";
import { ChevronIcon } from "./icons";

export function PrimaryAction({
  checking,
  grading,
  graded,
  answer,
  holding,
  last,
  onSubmitSection,
  onSubmit,
  onNext,
}: {
  checking: boolean;
  grading: "instant" | "end" | "locked";
  /** The question in front of the student has been graded. */
  graded: boolean;
  answer: string | null;
  holding: boolean;
  last: boolean;
  onSubmitSection(): void;
  onSubmit(answer: string): void;
  onNext(): void;
}) {
  if (checking)
    return (
      <button type="button" className={styles.primary} onClick={onSubmitSection}>
        Submit section
        <ChevronIcon />
      </button>
    );
  if (grading === "instant" && !graded)
    return (
      <button
        type="button"
        className={styles.primary}
        disabled={!answer}
        onClick={() => answer && onSubmit(answer)}
      >
        Submit
        <ChevronIcon />
      </button>
    );
  return (
    <button
      type="button"
      className={styles.primary}
      data-holding={holding || undefined}
      disabled={holding}
      onClick={onNext}
    >
      {last ? (grading === "end" ? "Review" : "Finish") : "Next"}
      <ChevronIcon />
    </button>
  );
}
