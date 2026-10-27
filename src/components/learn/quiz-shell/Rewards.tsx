"use client";
// Khan-style small wins in instant-grading modes (spec: Small wins).
import { AnimatePresence, animate, motion, useMotionValue, useTransform } from "framer-motion";
import { useEffect } from "react";
import type { ConfidenceBand } from "@/types/quiz";
import type { DotState } from "@/lib/quiz/rewards";
import styles from "./rewards.module.css";
import { FlameIcon, TickIcon } from "./icons";
import { BOUNCE, useShellMotion } from "./motion";
import { RewardDrawing } from "./drawings";

function CountUp({ to, reduced }: { to: number; reduced: boolean }) {
  const value = useMotionValue(reduced ? to : 0);
  const text = useTransform(value, (v) => `+${Math.round(v)}`);
  useEffect(() => {
    if (reduced) return value.set(to);
    const c = animate(value, to, { duration: 0.45, ease: "easeOut" });
    return () => c.stop();
  }, [to, reduced, value]);
  return <motion.span>{text}</motion.span>;
}

export function FeedbackBar({
  correct,
  points,
  streak,
  showStreak,
  drawing,
}: {
  correct: boolean;
  points: number;
  streak: number;
  showStreak: boolean;
  drawing: string;
}) {
  const { reduced } = useShellMotion();
  const said = correct
    ? `Correct.${points ? ` Plus ${points} points.` : ""}${showStreak ? ` ${streak} in a row.` : ""}`
    : "Not quite.";
  return (
    <motion.div
      role="status"
      aria-label="Answer result"
      className={styles.feedback}
      data-result={correct ? "correct" : "wrong"}
      initial={reduced ? { opacity: 0 } : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={reduced ? { duration: 0.15 } : BOUNCE}
    >
      <span className={styles.srOnly}>{said}</span>
      {correct && (
        <span className={styles.drawing}>
          <RewardDrawing name={drawing} reduced={reduced} />
        </span>
      )}
      <span className={styles.message} aria-hidden="true">
        {correct ? "Correct" : "Not quite"}
      </span>
      {correct && points > 0 && (
        <motion.span
          aria-hidden="true"
          className={`${styles.points} ${points >= 15 ? styles.gold : ""}`}
          initial={reduced ? false : { scale: 0.6 }}
          animate={{ scale: 1 }}
          transition={BOUNCE}
        >
          <CountUp to={points} reduced={reduced} />
        </motion.span>
      )}
      {correct && showStreak && (
        <span className={styles.streak} aria-hidden="true">
          <FlameIcon size={18} />
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span
              key={streak}
              initial={reduced ? { opacity: 0 } : { y: "-100%", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
            >
              {streak}
            </motion.span>
          </AnimatePresence>
        </span>
      )}
    </motion.div>
  );
}

export function ProgressDots({
  states,
  label,
  onOpen,
}: {
  states: DotState[];
  label: string;
  onOpen(): void;
}) {
  const { reduced } = useShellMotion();
  return (
    <button
      type="button"
      className={styles.dots}
      aria-label={label}
      aria-haspopup="dialog"
      onClick={onOpen}
    >
      {states.map((s, i) => (
        <motion.span
          key={i}
          data-testid="progress-dot"
          data-state={s}
          className={styles.dot}
          animate={s === "correct" && !reduced ? { scale: [1, 1.35, 1] } : { scale: 1 }}
          transition={{ duration: 0.35 }}
        >
          {s === "correct" && <TickIcon size={10} />}
        </motion.span>
      ))}
    </button>
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
