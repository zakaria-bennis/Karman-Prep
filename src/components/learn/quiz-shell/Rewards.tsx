"use client";
// Khan-style small wins in instant-grading modes (spec: Small wins).
// Tokens are never shown here: they appear only on the result screen.
import { motion } from "framer-motion";
import { useRef } from "react";
import type { ConfidenceBand } from "@/types/quiz";
import type { DotState } from "@/lib/quiz/rewards";
import styles from "./rewards.module.css";
import { ChevronIcon, CrossIcon, TickIcon } from "./icons";
import { useShellMotion } from "./motion";

/** The run as a row of dots, then the count. A dot that has been reached goes to its question
 *  when pressed; a dot held down opens the big question picker, as the count does. A dot that
 *  has just been got right pops, with a ring going out from it: a very small celebration. */
export function ProgressDots({
  states,
  label,
  count,
  onOpen,
  onGo,
}: {
  states: DotState[];
  label: string;
  /** The short visible count, "3 of 10"; the full label stays the button's name. */
  count?: string;
  onOpen(): void;
  /** Goes to a question that has been reached. */
  onGo?(index: number): void;
}) {
  const { reduced } = useShellMotion();
  const timer = useRef<number | null>(null);
  const held = useRef(false);
  const press = () => {
    held.current = false;
    timer.current = window.setTimeout(() => {
      held.current = true;
      onOpen();
    }, 480);
  };
  const release = () => {
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = null;
  };
  return (
    <div className={styles.dots} role="group" aria-label="Questions">
      {states.map((s, i) => {
        const reached = s === "correct" || s === "wrong" || s === "current";
        return (
          <motion.button
            key={i}
            type="button"
            data-testid="progress-dot"
            data-state={s}
            className={styles.dot}
            aria-label={`Go to question ${i + 1}`}
            aria-current={s === "current" ? "step" : undefined}
            disabled={!reached || !onGo}
            onPointerDown={press}
            onPointerUp={release}
            onPointerLeave={release}
            onPointerCancel={release}
            // holding a dot opens the picker, never the phone's own menu
            onContextMenu={(e) => e.preventDefault()}
            onClick={() => !held.current && onGo?.(i)}
            initial={false}
            animate={s === "correct" && !reduced ? { scale: [1, 1.5, 1] } : { scale: 1 }}
            transition={{ duration: 0.45, ease: "easeOut" }}
          >
            {s === "correct" && <TickIcon size={13} />}
            {s === "wrong" && <CrossIcon size={12} />}
            {!reduced && (
              <motion.i
                className={styles.burst}
                aria-hidden="true"
                initial={false}
                animate={
                  s === "correct"
                    ? { scale: [0.6, 2.6], opacity: [0.9, 0] }
                    : { scale: 0.6, opacity: 0 }
                }
                transition={{ duration: 0.7, ease: "easeOut" }}
              />
            )}
          </motion.button>
        );
      })}
      {count && (
        <button
          type="button"
          className={styles.count}
          aria-label={label}
          aria-haspopup="dialog"
          onClick={onOpen}
        >
          {count}
          <ChevronIcon dir="up" size={14} />
        </button>
      )}
    </div>
  );
}

const BANDS: ConfidenceBand[] = ["struggling", "developing", "proficient", "mastered"];
export function bandRank(b: ConfidenceBand | null | undefined): number {
  return b ? BANDS.indexOf(b) : -1;
}
const BAND_NAME: Record<ConfidenceBand, string> = {
  struggling: "Struggling",
  developing: "Developing",
  proficient: "Proficient",
  mastered: "Mastered",
};
export const bandName = (b: ConfidenceBand) => BAND_NAME[b];
/** A level up needs a band before it: a skill's first completed set never celebrates. */
export function bandRose(
  before: ConfidenceBand | null | undefined,
  after: ConfidenceBand | null | undefined
): boolean {
  return !!before && !!after && bandRank(after) > bandRank(before);
}
