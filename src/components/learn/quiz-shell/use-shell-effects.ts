"use client";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { StudentQuizQuestion, StudentQuizReview } from "@/types/quiz";
import { initialRewards, rewardFor, rewardReducer } from "@/lib/quiz/rewards";
import { playRewardSound } from "@/lib/quiz/reward-sound";

/** How long Next waits after a miss graded in front of the student. */
export const NEXT_HOLD_MS = 3000;

/** Where a docked calculator may sit: under the top bars and above the bottom one, so it is a card
 *  beside the question with the same top and the same bottom (founder, 2026-11-17: "vertically
 *  locked"). The shell hangs `header` and `barGroup` on its two bar groups. */
export function useDock(layout: string, pencilOn: boolean) {
  const header = useRef<HTMLDivElement>(null);
  const barGroup = useRef<HTMLDivElement>(null);
  const [dockTop, setDockTop] = useState(64);
  const [dockBottom, setDockBottom] = useState(12);
  useLayoutEffect(() => {
    if (header.current) setDockTop(Math.round(header.current.getBoundingClientRect().bottom) + 12);
  }, [layout, pencilOn]);
  useLayoutEffect(() => {
    const bar = barGroup.current;
    if (!bar || typeof ResizeObserver !== "function") return;
    const measure = () => setDockBottom(bar.offsetHeight + 12);
    measure();
    const seen = new ResizeObserver(measure);
    seen.observe(bar);
    return () => seen.disconnect();
  }, []);
  return { header, barGroup, dockTop, dockBottom };
}

/** A miss graded in front of the student (not one opened again later) holds Next for three
 *  seconds while the button fills, a nudge toward the explanation (founder, 2026-11-17).
 *  `onHold` runs as the hold begins (the calculator steps aside for the explanation). */
export function useMissHold(
  qid: string | undefined,
  graded: boolean,
  missed: boolean,
  onHold: () => void
): boolean {
  const [seen] = useState(() => new Set<string>());
  const [held, setHeld] = useState<string | null>(null);
  useEffect(() => {
    if (!qid) return;
    if (!missed) {
      // a question first shown already missed never holds Next
      if (graded) seen.add(qid);
      return;
    }
    if (seen.has(qid)) return;
    seen.add(qid);
    onHold();
    setHeld(qid);
    const done = window.setTimeout(() => setHeld(null), NEXT_HOLD_MS);
    return () => window.clearTimeout(done);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qid, missed]);
  return !!qid && held === qid;
}

/** Escape puts the tools away (menus and dialogs handle their own Escape first). Typing in the
 *  calculator keeps its keys to itself, so Escape from inside it is caught on the way down
 *  (founder, 2026-11-17: Escape or the Calculator button closes it). */
export function useEscape(o: {
  active: boolean;
  calculatorOpen: boolean;
  blocked: boolean;
  putAway(): void;
  closeCalculator(): void;
}) {
  useEffect(() => {
    if (!o.active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || e.defaultPrevented || o.blocked) return;
      o.putAway();
    };
    const fromCalculator = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || !o.calculatorOpen || o.blocked) return;
      const inside = e
        .composedPath()
        .some((n) => n instanceof Element && n.hasAttribute("data-calculator-window"));
      if (inside) o.closeCalculator();
    };
    document.addEventListener("keydown", onKey);
    window.addEventListener("keydown", fromCalculator, true);
    return () => {
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("keydown", fromCalculator, true);
    };
  });
}

/** A line shown for a while and then taken away. */
export function useNotice(ms: number) {
  const [text, setText] = useState<string | null>(null);
  useEffect(() => {
    if (!text) return;
    const t = setTimeout(() => setText(null), ms);
    return () => clearTimeout(t);
  }, [text, ms]);
  return [text, setText] as const;
}

/** Small wins: folded from the graded answers in order, so a repeated review never counts twice.
 *  A right answer graded in front of the student is heard once. */
export function useRewards(
  questions: StudentQuizQuestion[],
  index: number,
  reviews: Record<string, StudentQuizReview | undefined>,
  instant: boolean,
  total: number
) {
  const rewards = questions.slice(0, index + 1).reduce((state, item, i) => {
    const r = reviews[item.id];
    return r && instant
      ? rewardReducer(state, {
          kind: "graded",
          key: item.id,
          index: i,
          correct: r.isCorrect,
          points: r.points ?? 0,
        })
      : state;
  }, initialRewards(total));
  const q = questions[index];
  const review = q ? reviews[q.id] : undefined;
  const played = useRef(new Set<string>());
  useEffect(() => {
    if (!instant || !q || !review || played.current.has(q.id)) return;
    played.current.add(q.id);
    if (review.isCorrect)
      playRewardSound(rewardFor(rewards).tier === "streak5" ? "correctStreak" : "correct");
  }, [instant, q, review, rewards]);
  return rewards;
}
