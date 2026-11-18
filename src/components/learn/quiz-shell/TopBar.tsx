"use client";
import { motion } from "framer-motion";
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import styles from "./quiz-shell.module.css";

/** One bar tool: an icon over its word, a 48px target and a springy press (spec: Bars). The
 * word is the button's name, so screen readers and tests read the same thing people see. */
export const BarButton = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & {
    icon: ReactNode;
    word: string;
    flow?: "row";
    /** The tool in use: the bar's one lens slides to it. */
    active?: boolean;
  }
>(function BarButton({ icon, word, flow, active, className, ...rest }, ref) {
  return (
    <button
      ref={ref}
      type="button"
      data-flow={flow}
      className={`${styles.barButton} ${className ?? ""}`}
      {...rest}
    >
      {active && (
        <motion.span
          layoutId="quiz-tool-lens"
          className={styles.lens}
          aria-hidden="true"
          transition={{ type: "spring", stiffness: 520, damping: 34 }}
        />
      )}
      {icon}
      <span className={styles.barWord}>{word}</span>
    </button>
  );
});

/** Exit and the clock at the left, the quiz's name in the middle of the bar, the tools at the
 * right (founder, 2026-11-17: the name is centered). On phones Exit, the name and the clock
 * share the first row, and the tools take a row of their own under it, so every tool keeps its
 * word. */
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
  /** The clock. */
  centre?: ReactNode;
  tools?: ReactNode;
}) {
  return (
    <header data-quiz-bar="top" className={`${styles.topBar} ${styles.glass}`}>
      <div className={styles.barStart}>
        {exit}
        <div className={styles.barCentre}>{centre}</div>
      </div>
      <div className={styles.barTitle}>
        <p className={styles.section}>{section}</p>
        {topic && topic !== section && <p className={styles.topic}>{topic}</p>}
      </div>
      <div className={styles.tools} role="toolbar" aria-label="Tools">
        {tools}
      </div>
    </header>
  );
}
