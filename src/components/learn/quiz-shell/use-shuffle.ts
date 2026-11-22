"use client";
// The quiz screen's side of answer shuffling (src/lib/quiz/shuffle.ts). With a seed, each
// multiple-choice question is drawn re-lettered by place (A to D from the top), and its review
// to match. Everything the shell keeps and hands the host (the answer picked, what is crossed
// out, the record of how it was answered) stays in the question's own letters, so a seed that
// arrives late, or changes, can never move an answer that was already given.
import { useMemo, useRef } from "react";
import { reviewForDisplay, shuffleQuestion, toDisplay, type LetterMap } from "@/lib/quiz/shuffle";
import type { QuestionWorkspace } from "@/lib/quiz/workspace";
import type { StudentQuizQuestion, StudentQuizReview } from "@/types/quiz";

export type Shuffle = {
  /** The questions as they are drawn. */
  questions: StudentQuizQuestion[];
  /** The reviews as they are drawn. */
  reviews: Record<string, StudentQuizReview>;
  /** How a question's letters were moved; null when they were not. */
  mapFor(questionId: string): LetterMap | null;
};

const NONE = () => null;

/** The questions and reviews to draw. Without a seed they are the host's own, untouched. Each
 *  drawn question is kept for as long as the host's question object lives, so the screen sees
 *  the same object from one render to the next. */
export function useShuffle(
  seed: string | undefined,
  questions: StudentQuizQuestion[],
  reviews: Record<string, StudentQuizReview>
): Shuffle {
  const drawn = useRef(
    new WeakMap<
      StudentQuizQuestion,
      { seed: string; question: StudentQuizQuestion; map: LetterMap | null }
    >()
  );
  const drawnReviews = useRef(
    new WeakMap<StudentQuizReview, { map: LetterMap; review: StudentQuizReview }>()
  );
  return useMemo(() => {
    if (!seed) return { questions, reviews, mapFor: NONE };
    const maps = new Map<string, LetterMap | null>();
    const shown = questions.map((q) => {
      let hit = drawn.current.get(q);
      if (!hit || hit.seed !== seed) {
        hit = { seed, ...shuffleQuestion(q, seed) };
        drawn.current.set(q, hit);
      }
      maps.set(q.id, hit.map);
      return hit.question;
    });
    const shownReviews: Record<string, StudentQuizReview> = {};
    for (const [id, review] of Object.entries(reviews)) {
      const map = maps.get(id) ?? null;
      if (!map || !review) {
        shownReviews[id] = review;
        continue;
      }
      let hit = drawnReviews.current.get(review);
      if (!hit || hit.map !== map) {
        hit = { map, review: reviewForDisplay(review, map) };
        drawnReviews.current.set(review, hit);
      }
      shownReviews[id] = hit.review;
    }
    return {
      questions: shown,
      reviews: shownReviews,
      mapFor: (id: string) => maps.get(id) ?? null,
    };
  }, [seed, questions, reviews]);
}

/** A question's working state as its choices draw it: the answer and the crossed-out choices in
 *  the letters shown. (The shell keeps them in the question's own letters.) */
export function shownWorkspace(
  ws: QuestionWorkspace | undefined,
  map: LetterMap | null
): QuestionWorkspace | undefined {
  if (!ws || !map) return ws;
  return {
    ...ws,
    answer: toDisplay(map, ws.answer),
    crossedOut: ws.crossedOut.map((letter) => toDisplay(map, letter)),
  };
}
