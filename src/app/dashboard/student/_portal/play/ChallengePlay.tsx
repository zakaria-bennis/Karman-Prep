"use client";
// The two challenge questions of the day (founder, 2026-11-20: one Reading and Writing question and
// one Math question a day, every plan; Free answers one of the two). Real questions, graded on the
// server as they are answered (actionAnswerChallenge); when the day's last open one is answered the
// multiplier moves and the coins are banked, and the player carries the quiz into the ending.
import { useState } from "react";
import { QuizShell } from "@/components/learn/quiz-shell/QuizShell";
import { modeFor } from "@/lib/quiz/mode";
import type { StudentQuizReview } from "@/types/quiz";
import {
  actionAnswerChallenge,
  type ChallengeDone,
  type ChallengeToday,
} from "@/app/learn/play-actions";

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
  return (
    <QuizShell
      mode={modeFor("skill", { hasTutor: false })}
      questions={questions}
      total={questions.length}
      attemptKey={`challenge-${today.day}`}
      index={index}
      section="Challenge"
      reviews={reviews}
      hasCalculator={questions[index]?.subject === "math"}
      shuffleSeed={today.seed}
      noWorld={noWorld}
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
        })
      }
    />
  );
}
