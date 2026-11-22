"use client";
// The bottom bar's dots in a quiz that grades as it goes (ProgressDots), with what Endless and
// second chances add: the hearts, a strip of ten that scrolls, the run's length in place of
// "3 of 10", and the ring on a question put right. Kept here so the shell stays small.
import { useRef } from "react";
import type { DotState } from "@/lib/quiz/rewards";
import type { StudentQuizQuestion, StudentQuizReview } from "@/types/quiz";
import { ProgressDots } from "./Rewards";

/** A dot for each question in the set: right, wrong, the one in front of the student, one not
 *  reached yet, or one the set has not picked yet. */
export function dotStates(
  total: number,
  questions: StudentQuizQuestion[],
  reviews: Record<string, StudentQuizReview | undefined>,
  index: number
): DotState[] {
  return Array.from({ length: total }, (_, i) => {
    const item = questions[i];
    const r = item ? reviews[item.id] : undefined;
    if (r) return r.isCorrect ? "correct" : "wrong";
    if (i === index) return "current";
    return item ? "open" : "locked";
  });
}

/** How far an endless run has come: the questions reached so far, counting the one in front of
 *  the student, and never less for having gone back to look at an older one. */
export function runLength(states: DotState[], index: number, furthest: number): number {
  const graded = states.filter((s) => s === "correct" || s === "wrong").length;
  const reached = Math.min(furthest, states.length - 1) + 1;
  return Math.max(index + 1, graded, reached);
}

export function RunProgress({
  questions,
  reviews,
  index,
  total,
  endless,
  putRight,
  onOpen,
  onGo,
}: {
  questions: StudentQuizQuestion[];
  reviews: Record<string, StudentQuizReview | undefined>;
  index: number;
  total: number;
  endless?: { hearts: number; lost: number };
  /** Whether a question was put right with a second chance. */
  putRight(questionId: string): boolean;
  onOpen(): void;
  onGo(index: number): void;
}) {
  const furthest = useRef(index);
  furthest.current = Math.max(furthest.current, index);
  const states = dotStates(total, questions, reviews, index);
  const rescued = new Set<number>();
  questions.slice(0, total).forEach((item, i) => putRight(item.id) && rescued.add(i));
  const run = runLength(states, index, furthest.current);
  return (
    <ProgressDots
      states={states}
      index={index}
      label={endless ? `Question ${index + 1}, ${run} so far` : `Question ${index + 1} of ${total}`}
      count={endless ? String(run) : `${index + 1} of ${total}`}
      endless={endless}
      rescued={rescued}
      onOpen={onOpen}
      onGo={(i) => i !== index && onGo(i)}
    />
  );
}
