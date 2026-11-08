"use client";
import styles from "./pane.module.css";

/** A typed answer for grid-in math: one solid underline, never a row of underscores (rule 55). */
export function NumericEntry({
  value,
  onChange,
  locked,
  verdict,
}: {
  value: string;
  onChange(v: string): void;
  locked: boolean;
  verdict: "correct" | "wrong" | null;
}) {
  return (
    <div
      className={`${styles.numeric} ${verdict === "correct" ? styles.correct : verdict === "wrong" ? styles.wrong : ""}`}
    >
      <label htmlFor="quiz-numeric-answer" className={styles.numericLabel}>
        Your answer
      </label>
      <input
        id="quiz-numeric-answer"
        className={styles.numericInput}
        inputMode="decimal"
        autoComplete="off"
        maxLength={12}
        value={value}
        readOnly={locked}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
