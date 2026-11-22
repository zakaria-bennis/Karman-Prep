"use client";
// The second chance's button, in the explanation's head after a miss: a small piece of the
// quiz's glass with the pass's own mark from Rewards, a circle with a cross. Spent, the cross pops
// into a green circle with a check, the button says "Put right" for a moment and goes.
import { AnimatePresence, motion } from "framer-motion";
import styles from "./chance.module.css";
import { BOUNCE, useShellMotion } from "./motion";
import type { ChanceState } from "./use-second-chance";

function ChanceMark() {
  return (
    <svg className={styles.mark} viewBox="0 0 24 24" aria-hidden="true">
      <g className={styles.miss}>
        <circle cx="12" cy="12" r="9.5" />
        <path d="M8.7 8.7l6.6 6.6M15.3 8.7l-6.6 6.6" />
      </g>
      <g className={styles.right}>
        <circle cx="12" cy="12" r="9.5" />
        <path d="M7.7 12.4l3 3 5.7-6.1" />
      </g>
    </svg>
  );
}

export function SecondChance({
  state,
  left,
  onUse,
}: {
  /** Nothing is shown while it is null. */
  state: ChanceState | null;
  left: number;
  onUse(): void;
}) {
  const { reduced } = useShellMotion();
  return (
    <>
      <AnimatePresence initial={false}>
        {state && (
          <motion.button
            key="chance"
            type="button"
            className={styles.chance}
            data-state={state}
            data-still={reduced || undefined}
            disabled={state !== "ready"}
            aria-busy={state === "busy" || undefined}
            onClick={onUse}
            initial={reduced ? { opacity: 0 } : { opacity: 0, y: 6, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.88 }}
            transition={reduced ? { duration: 0.15 } : BOUNCE}
          >
            <ChanceMark />
            <span>{state === "done" ? "Put right" : "Use a second chance"}</span>
            {state !== "done" && <span className={styles.left}>{left} left</span>}
          </motion.button>
        )}
      </AnimatePresence>
      <span role="status" className={styles.srOnly}>
        {state === "done" ? "Put right." : ""}
      </span>
    </>
  );
}
