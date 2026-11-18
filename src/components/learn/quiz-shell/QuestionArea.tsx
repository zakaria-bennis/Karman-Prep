"use client";
import { AnimatePresence, motion, useIsPresent } from "framer-motion";
import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import styles from "./quiz-shell.module.css";
import { Divider } from "./Divider";
import { InkLayer } from "./InkLayer";
import { AnnotationLayer } from "./AnnotationLayer";
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
  wrap = (c) => c,
  aside = null,
}: {
  layout: QuizLayout;
  questionKey: string;
  direction: 1 | -1;
  passage: ReactNode | null;
  question: ReactNode;
  /** Wraps one question's frame content (the calculator scope lives here). */
  wrap?: (content: ReactNode) => ReactNode;
  /** The explanation after a miss, on wide screens: the question moves left and this fills the
   *  right (founder, 2026-11-08). */
  aside?: ReactNode;
}) {
  const frame = useRef<HTMLDivElement>(null);
  const area = useRef<HTMLDivElement>(null);
  const [split, setSplit] = useState(0.5);
  // On a phone or a tablet the explanation comes up from the bottom to just under the answers,
  // never less than a quarter of the screen (founder, 2026-11-17), and the line between the two
  // can be dragged. `rise` is where the explanation's top sits, as a share of the area.
  const stacked = layout !== "wide" && !!aside;
  const [rise, setRise] = useState<number | null>(null);
  useLayoutEffect(() => {
    if (!stacked) return setRise(null);
    const box = area.current;
    const column = box?.querySelector<HTMLElement>("[data-quiz-column]");
    if (!box || !column) return setRise(0.5);
    const top = box.getBoundingClientRect().top;
    const under = (column.getBoundingClientRect().bottom - top + 14) / box.clientHeight;
    setRise(Math.min(0.75, Math.max(0.3, under)));
  }, [stacked, questionKey]);
  const drag = useRef<{ from: number; at: number } | null>(null);
  const grab = (e: React.PointerEvent<HTMLButtonElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { from: e.clientY, at: rise ?? 0.5 };
  };
  const pull = (e: React.PointerEvent<HTMLButtonElement>) => {
    const d = drag.current;
    const box = area.current;
    if (!d || !box) return;
    setRise(Math.min(0.8, Math.max(0.2, d.at + (e.clientY - d.from) / box.clientHeight)));
  };
  const drop = () => {
    drag.current = null;
  };
  const share = stacked ? (rise ?? 0.5) : null;
  const { reduced } = useShellMotion();
  const split2 = passage && layout !== "compact";

  const passagePane = passage && (
    <div data-quiz-pane="passage" className={styles.pane}>
      <div className={styles.passageText}>{passage}</div>
      <AnnotationLayer />
      <InkLayer pane="passage" />
    </div>
  );
  const questionPane = (
    <div data-quiz-pane="question" className={styles.pane}>
      <div data-quiz-column className={styles.column}>
        {question}
      </div>
      <AnnotationLayer />
      <InkLayer pane="question" />
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
    <div
      ref={area}
      className={`${styles.area} ${styles[layout]} ${split2 ? styles.split : ""}`}
      data-aside={aside ? "" : undefined}
      // a docked calculator moves the question over, and leaves the bottom bar where it is
      data-calculator-dock-shift=""
    >
      <AnimatePresence initial={false} custom={direction} mode="popLayout">
        <motion.div
          key={questionKey}
          ref={frame}
          className={styles.frame}
          style={
            {
              "--split": `${split * 100}%`,
              ...(share === null ? {} : { bottom: `${(1 - share) * 100}%` }),
            } as React.CSSProperties
          }
          custom={direction}
          variants={variants}
          initial="enter"
          animate="centre"
          exit="exit"
          transition={{ duration: reduced ? DUR.fast : DUR.base, ease: [0.2, 0.8, 0.2, 1] }}
        >
          <Presence>
            {wrap(
              split2 ? (
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
              )
            )}
          </Presence>
        </motion.div>
      </AnimatePresence>
      <AnimatePresence>
        {aside && (
          <motion.aside
            key={`aside-${questionKey}`}
            data-quiz-scroll
            className={styles.aside}
            style={share === null ? undefined : { top: `calc(${share * 100}% + 3px)` }}
            initial={
              reduced
                ? { opacity: 0 }
                : layout === "wide"
                  ? { opacity: 0, x: 60 }
                  : { opacity: 0, y: 80 }
            }
            animate={{ opacity: 1, x: 0, y: 0 }}
            exit={
              reduced
                ? { opacity: 0 }
                : layout === "wide"
                  ? { opacity: 0, x: 60 }
                  : { opacity: 0, y: 80 }
            }
            transition={{ duration: reduced ? DUR.fast : 0.42, ease: [0.2, 0.8, 0.2, 1] }}
          >
            {stacked && (
              // the line between the question and its explanation: dragged, it moves both
              <button
                type="button"
                className={styles.asideGrip}
                aria-label="Drag to make the explanation taller or shorter"
                onPointerDown={grab}
                onPointerMove={pull}
                onPointerUp={drop}
                onPointerCancel={drop}
              />
            )}
            {aside}
          </motion.aside>
        )}
      </AnimatePresence>
    </div>
  );
}

/** The question that is leaving is inert and hidden from assistive technology while it animates out. */
function Presence({ children }: { children: ReactNode }) {
  const present = useIsPresent();
  return (
    <div
      data-quiz-frame
      data-exiting={present ? undefined : "true"}
      inert={!present}
      aria-hidden={present ? undefined : true}
      style={{ display: "contents" }}
    >
      {children}
    </div>
  );
}
