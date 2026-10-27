"use client";
import { motion } from "framer-motion";
import { useEffect, useRef } from "react";
import type { QuizMode } from "@/lib/quiz/mode";
import type { QuestionWorkspace } from "@/lib/quiz/workspace";
import type { StudentQuizQuestion, StudentQuizReview } from "@/types/quiz";
import styles from "./nav.module.css";
import shell from "./quiz-shell.module.css";
import { BookmarkIcon, ReviewMarkIcon } from "./icons";
import { BOUNCE, SPRING, useShellMotion } from "./motion";

export type SquareInfo = {
  index: number;
  locked: boolean;
  answered: boolean;
  marked: boolean;
  bookmarked: boolean;
  verdict: "correct" | "wrong" | null;
};

export function squareName(s: SquareInfo): string {
  const parts = [`Question ${s.index + 1}`];
  if (s.locked) parts.push("locked");
  else parts.push(s.answered ? "answered" : "unanswered");
  if (s.marked) parts.push("marked for review");
  if (s.bookmarked) parts.push("bookmarked");
  if (s.verdict) parts.push(s.verdict);
  return parts.join(", ");
}

export function squaresFor(
  total: number,
  questions: StudentQuizQuestion[],
  workspaces: Record<string, QuestionWorkspace>,
  reviews: Record<string, StudentQuizReview>,
  saved: Record<string, unknown>,
  mode: QuizMode
): SquareInfo[] {
  return Array.from({ length: total }, (_, index) => {
    const q = questions[index];
    const ws = q ? workspaces[q.id] : undefined;
    const review = q ? reviews[q.id] : undefined;
    return {
      index,
      locked: !q,
      answered: !!ws?.answer || !!review,
      marked: !!ws?.markedForReview,
      bookmarked: !!(q && saved[q.id]),
      verdict:
        mode.grading === "instant" && review ? (review.isCorrect ? "correct" : "wrong") : null,
    };
  });
}

/** The grid of every question in the section (spec: Navigator). */
export function NavigatorGrid({
  squares,
  current,
  onJump,
  checkPage = false,
}: {
  squares: SquareInfo[];
  current: number;
  onJump(index: number): void;
  checkPage?: boolean;
}) {
  const { reduced } = useShellMotion();
  return (
    <ul className={styles.grid}>
      {squares.map((s, i) => (
        <li key={i} className={styles.cell}>
          <motion.button
            type="button"
            className={styles.square}
            data-state={s.locked ? "locked" : (s.verdict ?? (s.answered ? "answered" : "open"))}
            aria-current={i === current ? "true" : undefined}
            aria-label={squareName(s)}
            disabled={s.locked}
            onClick={() => onJump(i)}
            initial={
              reduced
                ? false
                : checkPage
                  ? { opacity: 0, y: 16, scale: 0.8 }
                  : { opacity: 0, scale: 0.85 }
            }
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={
              reduced
                ? { duration: 0 }
                : { ...BOUNCE, delay: Math.min(i, 30) * (checkPage ? 0.018 : 0.008) }
            }
          >
            <span aria-hidden="true">{i + 1}</span>
            {s.marked && (
              <span className={styles.flagMark} aria-hidden="true">
                <ReviewMarkIcon state="on" size={12} />
              </span>
            )}
            {s.bookmarked && !s.marked && (
              <span className={styles.flagMark} aria-hidden="true">
                <BookmarkIcon state="on" size={12} />
              </span>
            )}
          </motion.button>
        </li>
      ))}
    </ul>
  );
}

/** A sheet on phones and a popover elsewhere. Esc closes it and returns focus. */
export function NavigatorDialog({
  compact,
  title,
  onClose,
  children,
}: {
  compact: boolean;
  title: string;
  onClose(): void;
  children: React.ReactNode;
}) {
  const { reduced } = useShellMotion();
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    box.current?.focus();
    return () => previous?.focus?.();
  }, []);
  return (
    <div className={styles.scrim} onPointerDown={(e) => e.target === e.currentTarget && onClose()}>
      <motion.div
        ref={box}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className={`${compact ? styles.sheet : styles.popover} ${shell.glass}`}
        initial={
          reduced ? { opacity: 0 } : compact ? { y: "100%" } : { opacity: 0, y: 24, scale: 0.96 }
        }
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={reduced ? { duration: 0.15 } : SPRING}
        drag={compact && !reduced ? "y" : false}
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0.08, bottom: 0.5 }}
        onDragEnd={(_, info) => info.offset.y > 120 && onClose()}
        onKeyDown={(e) => e.key === "Escape" && onClose()}
      >
        <div className={styles.dialogHead}>
          <h2 className={styles.dialogTitle}>{title}</h2>
          <button type="button" className={shell.tool} onClick={onClose}>
            Close
          </button>
        </div>
        {children}
      </motion.div>
    </div>
  );
}
