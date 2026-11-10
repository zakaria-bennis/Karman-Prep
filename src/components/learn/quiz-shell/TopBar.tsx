"use client";
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import styles from "./quiz-shell.module.css";

/** One bar tool: an icon over its word, a 48px target and a springy press (spec: Bars). The
 * word is the button's name, so screen readers and tests read the same thing people see. */
export const BarButton = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & { icon: ReactNode; word: string; flow?: "row" }
>(function BarButton({ icon, word, flow, className, ...rest }, ref) {
  return (
    <button
      ref={ref}
      type="button"
      data-flow={flow}
      className={`${styles.barButton} ${className ?? ""}`}
      {...rest}
    >
      {icon}
      <span className={styles.barWord}>{word}</span>
    </button>
  );
});

/** Exit and the title on the left, the clock in the middle, the tools on the right. On phones
 * the tools take a row of their own under the first, so every tool keeps its word. */
export function TopBar({
  section,
  topic,
  exit,
  centre,
  tools,
}: {
  section: string;
  topic?: string;
  exit?: ReactNode;
  centre?: ReactNode;
  tools?: ReactNode;
}) {
  return (
    <header data-quiz-bar="top" className={`${styles.topBar} ${styles.glass}`}>
      <div className={styles.barStart}>
        {exit}
        <div className={styles.barTitle}>
          <p className={styles.section}>{section}</p>
          {topic && topic !== section && <p className={styles.topic}>{topic}</p>}
        </div>
      </div>
      <div className={styles.barCentre}>{centre}</div>
      <div className={styles.tools} role="toolbar" aria-label="Tools">
        {tools}
      </div>
    </header>
  );
}
