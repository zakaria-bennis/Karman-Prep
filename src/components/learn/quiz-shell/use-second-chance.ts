"use client";
// Second chances (Rewards: "Correct a miss in a skill set and keep your run going", one a set).
// After a miss graded in front of the student, the explanation offers one while the student
// holds any and the set has not used its one. Once the host says it is spent, the question's dot
// is put right and the offer goes. A question reopened later, or after a reload, is not offered
// one: the offer belongs to the moment of the miss.
import { useEffect, useRef, useState } from "react";
import type { StudentQuizQuestion, StudentQuizReview } from "@/types/quiz";

export type ChanceState = "ready" | "busy" | "done";
/** How long the spent second chance shows its check before it goes. */
export const CHANCE_DONE_MS = 1100;

/** The questions graded while they were on the screen (not ones opened again already graded).
 *  Worked out as the screen draws, so the offer comes in with the explanation itself rather than
 *  a beat later (which would push the explanation down under it). Drawing twice changes nothing. */
export function useGradedLive(qid: string | undefined, graded: boolean): ReadonlySet<string> {
  const live = useRef(new Set<string>());
  const open = useRef<string | null>(null);
  if (qid && !graded) open.current = qid;
  else if (qid && open.current === qid) {
    open.current = null;
    live.current.add(qid);
  }
  return live.current;
}

export function useSecondChance({
  q,
  review,
  instant,
  questions,
  rescue,
  rescued,
  onFail,
}: {
  q: StudentQuizQuestion | undefined;
  review: StudentQuizReview | undefined;
  instant: boolean;
  questions: StudentQuizQuestion[];
  rescue?: { left: number; onUse(questionId: string): Promise<boolean> };
  rescued?: Readonly<Record<string, true>>;
  /** It did not go through (the host said no, or the request failed). */
  onFail(): void;
}) {
  const qid = q?.id;
  const live = useGradedLive(qid, !!review);
  const [used, setUsed] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [cheering, setCheering] = useState<string | null>(null);
  useEffect(() => {
    if (!cheering) return;
    const done = window.setTimeout(() => setCheering(null), CHANCE_DONE_MS);
    return () => window.clearTimeout(done);
  }, [cheering]);

  const isPutRight = (id: string) => used === id || rescued?.[id] === true;
  const setHasUsedOne = used !== null || questions.some((item) => rescued?.[item.id] === true);
  const offered =
    !!qid &&
    instant &&
    !!review &&
    !review.isCorrect &&
    live.has(qid) &&
    !!rescue &&
    rescue.left > 0 &&
    !setHasUsedOne;
  const state: ChanceState | null =
    qid && cheering === qid ? "done" : offered ? (busy === qid ? "busy" : "ready") : null;

  const use = async () => {
    if (!qid || !rescue || busy || !offered) return;
    setBusy(qid);
    try {
      if (await rescue.onUse(qid)) {
        setUsed(qid);
        setCheering(qid);
      } else onFail();
    } catch {
      onFail();
    } finally {
      setBusy(null);
    }
  };
  return { state, left: rescue?.left ?? 0, use, isPutRight };
}
