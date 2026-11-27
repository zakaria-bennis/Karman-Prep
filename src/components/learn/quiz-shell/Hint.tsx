"use client";
import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import type { QuizMode } from "@/lib/quiz/mode";
import type { StudentQuizQuestion, StudentQuizReview } from "@/types/quiz";
import MathText from "../MathText";
import { raisePowers } from "@/lib/quiz/tidy-math";
import { useShellMotion } from "./motion";
import { HintIcon } from "./icons";
import styles from "./hint.module.css";

export type HintState = {
  text: string;
  open: boolean;
  toggle(): void;
};

/** The hint for the question on screen: there before the answer is in, in practice modes, when
 *  the question has one. Opening it the first time tells the host (`onHint`), which marks the
 *  answer as given with a hint; closing it again does not undo that. */
export function useHint(
  q: StudentQuizQuestion | undefined,
  mode: QuizMode,
  review: StudentQuizReview | undefined,
  onHint?: (questionId: string) => void
): HintState | null {
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [used, setUsed] = useState<Record<string, true>>({});
  const text = q?.hint?.trim();
  if (!q || !text || !mode.hints || review) return null;
  const id = q.id;
  return {
    text,
    open: !!open[id],
    toggle() {
      const next = !open[id];
      setOpen((o) => ({ ...o, [id]: next }));
      if (next && !used[id]) {
        setUsed((u) => ({ ...u, [id]: true }));
        onHint?.(id);
      }
    },
  };
}

/** The hint itself, over the bottom bar beside its button: frosted, a light bulb and the words. */
export function HintCard({ hint }: { hint: HintState }) {
  const { reduced } = useShellMotion();
  const from = { opacity: 0, y: 12 };
  return (
    <AnimatePresence initial={false}>
      {hint.open && (
        <motion.aside
          id="quiz-hint"
          aria-label="Hint"
          className={styles.card}
          initial={reduced ? { opacity: 0 } : from}
          animate={{ opacity: 1, y: 0 }}
          exit={reduced ? { opacity: 0 } : from}
          transition={{ type: "spring", stiffness: 420, damping: 34 }}
        >
          <span className={styles.bulb} aria-hidden="true">
            <HintIcon state="on" size={20} />
          </span>
          <p>
            <MathText text={raisePowers(hint.text)} />
          </p>
          <button
            type="button"
            className={styles.close}
            aria-label="Close the hint"
            onClick={hint.toggle}
          >
            ×
          </button>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
