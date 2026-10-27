"use client";
import { AnimatePresence, motion } from "framer-motion";
import { useRef, useState, type ReactNode } from "react";
import styles from "./quiz-shell.module.css";
import { Divider } from "./Divider";
import { Sky } from "./Sky";
import { DUR, useShellMotion } from "./motion";
import type { QuizLayout } from "./use-quiz-layout";

const MIN_PANE = { wide: 360, medium: 160, compact: 0 } as const;

/** Passage and question panes for one question, in the layout for this device. */
export function QuestionArea({
  layout,
  questionKey,
  direction,
  passage,
  question,
}: {
  layout: QuizLayout;
  questionKey: string;
  direction: 1 | -1;
  passage: ReactNode | null;
  question: ReactNode;
}) {
  const frame = useRef<HTMLDivElement>(null);
  const [split, setSplit] = useState(0.5);
  const { reduced } = useShellMotion();
  const split2 = passage && layout !== "compact";

  const passagePane = passage && (
    <div data-quiz-pane="passage" className={styles.pane}>
      <div className={styles.passageText}>{passage}</div>
    </div>
  );
  const questionPane = (
    <div data-quiz-pane="question" className={styles.pane}>
      <div data-quiz-column className={styles.column}>
        {question}
      </div>
    </div>
  );

  // Leaving slides out the way you travel with a slight tilt; arriving staggers in.
  const variants = {
    enter: (d: number) => (reduced ? { opacity: 0 } : { opacity: 0, x: 40 * d }),
    centre: { opacity: 1, x: 0, rotate: 0, scale: 1 },
    exit: (d: number) =>
      reduced ? { opacity: 0 } : { opacity: 0, x: -40 * d, rotate: -0.6 * d, scale: 0.98 },
  };

  return (
    <div className={`${styles.area} ${styles[layout]} ${split2 ? styles.split : ""}`}>
      <Sky />
      <AnimatePresence initial={false} custom={direction} mode="popLayout">
        <motion.div
          key={questionKey}
          ref={frame}
          className={styles.frame}
          style={{ "--split": `${split * 100}%` } as React.CSSProperties}
          custom={direction}
          variants={variants}
          initial="enter"
          animate="centre"
          exit="exit"
          transition={{ duration: reduced ? DUR.fast : DUR.base, ease: [0.2, 0.8, 0.2, 1] }}
        >
          {split2 ? (
            <>
              <div data-quiz-scroll className={styles.scroll}>
                {passagePane}
              </div>
              <Divider
                orientation={layout === "wide" ? "vertical" : "horizontal"}
                fraction={split}
                minPx={MIN_PANE[layout]}
                frame={frame}
                onChange={setSplit}
              />
              <div data-quiz-scroll className={styles.scroll}>
                {questionPane}
              </div>
            </>
          ) : (
            <div data-quiz-scroll className={styles.scroll}>
              {passagePane}
              {questionPane}
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
