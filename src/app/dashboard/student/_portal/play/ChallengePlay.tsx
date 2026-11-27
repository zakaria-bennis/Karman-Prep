"use client";
// The two challenge questions of the day (founder, 2026-11-20: one Reading and Writing question and
// one Math question a day, every plan; Free answers one of the two). Real questions, graded on the
// server as they are answered (actionAnswerChallenge); when the day's last open one is answered the
// multiplier moves and the coins are banked, and the player carries the quiz into the ending.
import { useEffect, useRef, useState } from "react";
import { QuizShell } from "@/components/learn/quiz-shell/QuizShell";
import { modeFor } from "@/lib/quiz/mode";
import type { StudentQuizQuestion, StudentQuizReview } from "@/types/quiz";
import {
  actionAnswerChallenge,
  type ChallengeDone,
  type ChallengeToday,
} from "@/app/learn/play-actions";
import { challengeResultViews } from "./challenge-results";
import type { ChallengeResultView } from "./end-view";

export function ChallengePlay({
  today,
  noWorld,
  onFinished,
  onExit,
  onError,
}: {
  today: ChallengeToday;
  /** The host keeps its own picture behind the glass (the challenge's city). */
  noWorld?: boolean;
  onFinished(result: {
    answers: { ok: boolean; skill: string }[];
    done: ChallengeDone | null;
    results: ChallengeResultView[];
    /** Each question as graded, for the ending's look-only Review. */
    reviews: Record<string, StudentQuizReview>;
  }): void;
  onExit(): void;
  onError(text: string): void;
}) {
  const playing = today.questions.filter((q) => today.open.includes(q.subject));
  const questions = playing.map((q) => q.question);
  const [index, setIndex] = useState(0);
  const [reviews, setReviews] = useState<Record<string, StudentQuizReview>>({});
  const [done, setDone] = useState<ChallengeDone | null>(null);
  const [busy, setBusy] = useState(false);
  // time on each question while the page is in view, sent with the answer for the ending's
  // "average" (the shell's own record runs only for saved runs)
  const shownAt = useRef({ at: Date.now(), away: 0, hiddenAt: 0 });
  useEffect(() => {
    shownAt.current = { at: Date.now(), away: 0, hiddenAt: 0 };
  }, [index]);
  useEffect(() => {
    const seen = () => {
      const t = shownAt.current;
      if (document.hidden) t.hiddenAt = Date.now();
      else if (t.hiddenAt) {
        t.away += Date.now() - t.hiddenAt;
        t.hiddenAt = 0;
      }
    };
    document.addEventListener("visibilitychange", seen);
    return () => document.removeEventListener("visibilitychange", seen);
  }, []);
  const workedMs = () => {
    const t = shownAt.current;
    return Math.max(0, Math.min(86_400_000, Date.now() - t.at - t.away));
  };
  return (
    <QuizShell
      mode={modeFor("skill", { hasTutor: false, hints: false })}
      questions={questions}
      total={questions.length}
      attemptKey={`challenge-${today.day}`}
      index={index}
      section="Challenge"
      reviews={reviews}
      hasCalculator={questions[index]?.subject === "math"}
      shuffleSeed={today.seed}
      noWorld={noWorld}
      forwardOnly
      onNavigate={setIndex}
      onExit={onExit}
      onSubmit={async (id, answer) => {
        const item = playing.find((p) => p.question.id === id);
        if (!item || busy || reviews[id]) return;
        setBusy(true);
        try {
          const r = await actionAnswerChallenge({
            subject: item.subject,
            day: today.day,
            questionId: id,
            answer,
            activeMs: workedMs(),
          });
          if (!r.ok) return onError(r.error);
          setReviews((old) => ({ ...old, [id]: r.value.review }));
          if (r.value.done) setDone(r.value.done);
        } catch {
          onError("We could not reach Karman. Check your connection and try again.");
        } finally {
          setBusy(false);
        }
      }}
      onFinish={() =>
        onFinished({
          answers: playing.map((p) => ({
            ok: !!reviews[p.question.id]?.isCorrect,
            skill: p.subject === "math" ? "Math" : "Reading and Writing",
          })),
          done,
          results: done ? challengeResultViews(done.results, questions, reviews, today.seed) : [],
          reviews,
        })
      }
    />
  );
}

/** The ending's Review (founder, 2026-11-24: "review = look only"): both questions as they were
 *  graded, with their explanations, back and forth freely; Finish or Exit returns to the ending. */
export function ChallengeLook({
  questions,
  reviews,
  seed,
  day,
  onDone,
}: {
  questions: StudentQuizQuestion[];
  reviews: Record<string, StudentQuizReview>;
  seed: string;
  day: string;
  onDone(): void;
}) {
  const [index, setIndex] = useState(0);
  return (
    <QuizShell
      mode={modeFor("skill", { hasTutor: false })}
      questions={questions}
      total={questions.length}
      attemptKey={`challenge-look-${day}`}
      index={index}
      section="Challenge"
      reviews={reviews}
      hasCalculator={false}
      shuffleSeed={seed}
      noWorld
      onNavigate={setIndex}
      onExit={onDone}
      onFinish={onDone}
    />
  );
}
