"use client";

import { useState } from "react";
import Link from "next/link";
import { actionReviewDailyAnswer } from "@/app/learn/daily-challenge-actions";
import type { DailySlot } from "@/lib/daily-challenge/server";
import type { DailySubject } from "@/lib/daily-challenge/selection";
import type { StudentQuizReview } from "@/types/quiz";
import { makeQuestionKey } from "@/components/calculator/question-key";
import { modeFor } from "@/lib/quiz/mode";
import { clearWorkspaces } from "@/lib/quiz/workspace";
import {
  actionFlagForTutor,
  actionQuizStudentState,
  actionReportProblem,
  actionToggleBookmark,
} from "@/app/learn/saved-question-actions";
import { QuizShell } from "./quiz-shell/QuizShell";
import { CalculatorIcon, ReferenceIcon } from "./quiz-shell/icons";

const subjectName: Record<DailySubject, string> = {
  math: "Math",
  reading: "Reading & Writing",
};

export interface DailyChallengeProps {
  math: DailySlot;
  reading: DailySlot;
}

export default function DailyChallenge({ math, reading }: DailyChallengeProps) {
  return (
    <section
      aria-labelledby="daily-challenge-heading"
      className="bg-night px-5 py-12 text-ivory sm:px-8"
    >
      <div className="mx-auto max-w-6xl" data-calculator-dock-shift="">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-bronze pb-6">
          <div className="pr-12 sm:pr-0">
            <h2 id="daily-challenge-heading" className="type-display-m">
              Question of the day
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-taupe">
              One reviewed challenge in each subject when an eligible question is available.
              Difficulty 5–7 on Karman&apos;s 1–7 scale.
            </p>
          </div>
          <p className="text-xs text-taupe">Changes at midnight UTC</p>
        </div>
        <div className="mt-6 grid items-start gap-6 lg:grid-cols-2 [[data-calculator-docked=true]_&]:grid-cols-1">
          <DailySlotCard subject="math" slot={math} />
          <DailySlotCard subject="reading" slot={reading} />
        </div>
      </div>
    </section>
  );
}

function DailySlotCard({ subject, slot }: { subject: DailySubject; slot: DailySlot }) {
  const Icon = subject === "math" ? CalculatorIcon : ReferenceIcon;
  const accent = subject === "math" ? "text-math" : "text-rw";
  return (
    <article className="min-w-0 border border-bronze bg-surface p-5 sm:p-7">
      <div className="flex items-center gap-3">
        <span className={accent}>
          <Icon size={20} />
        </span>
        <h3 className="font-plex-serif text-2xl text-ivory">{subjectName[subject]}</h3>
      </div>
      {slot.state === "ready" ? (
        <DailyQuestion
          key={makeQuestionKey(slot.value.day, slot.value.question.id)}
          value={slot.value}
        />
      ) : (
        <div className="mt-6 border-t border-bronze pt-5">
          <p className="text-sm leading-relaxed text-taupe" role="status">
            {slot.state === "unavailable"
              ? "This question could not load. Try again later."
              : `No reviewed ${subjectName[subject]} question is available for today.`}
          </p>
          <Link
            href={`/learn/${subject}`}
            className="mt-5 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-gold underline underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-bright"
          >
            Explore {subjectName[subject]}
          </Link>
        </div>
      )}
    </article>
  );
}

function DailyQuestion({ value }: { value: Extract<DailySlot, { state: "ready" }>["value"] }) {
  const { question: q, subject, day } = value;
  const attemptKey = makeQuestionKey(`daily-${day}`, q.id);
  const [open, setOpen] = useState(false);
  const [review, setReview] = useState<StudentQuizReview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [student, setStudent] = useState<{
    hasTutor: boolean;
    saved: Record<string, "bookmark" | "tutor_flag">;
  }>({ hasTutor: false, saved: {} });

  function openShell() {
    setOpen(true);
    actionQuizStudentState({ questionIds: [q.id] })
      .then(setStudent)
      .catch(() => undefined);
  }

  async function submitAnswer(answer: string) {
    if (pending || review || !answer.trim()) return;
    setPending(true);
    setError(null);
    try {
      setReview(await actionReviewDailyAnswer({ subject, day, questionId: q.id, answer }));
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "The answer could not be checked. Try again."
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mt-6 border-t border-bronze pt-5">
      <p className="text-xs text-taupe">{q.topic_cluster}</p>
      {review ? (
        <p className="mt-4 text-sm font-semibold text-ivory" role="status">
          {review.isCorrect ? "Correct." : `Not quite. The answer is ${review.correct_answer}.`}
        </p>
      ) : null}
      <button
        type="button"
        onClick={openShell}
        className="mt-5 min-h-11 rounded-xl border border-bronze px-5 py-2 text-sm font-semibold text-ivory"
      >
        {review
          ? `Review the ${subjectName[subject]} challenge`
          : `Answer the ${subjectName[subject]} challenge`}
      </button>
      {open && (
        <QuizShell
          mode={modeFor("daily", { hasTutor: student.hasTutor })}
          questions={[q]}
          attemptKey={attemptKey}
          index={0}
          section="Challenge question"
          topic={subjectName[subject]}
          reviews={review ? { [q.id]: review } : {}}
          saved={student.saved}
          hasCalculator={subject === "math"}
          onNavigate={() => undefined}
          onSubmit={(_, answer) => submitAnswer(answer)}
          onFinish={() => {
            clearWorkspaces(attemptKey);
            setOpen(false);
          }}
          onExit={() => setOpen(false)}
          onToggleBookmark={(id) =>
            void actionToggleBookmark({ questionId: id }).catch(() => undefined)
          }
          onFlagForTutor={(id, note) =>
            void actionFlagForTutor({
              questionId: id,
              nodeId: q.node_id ?? null,
              note: note || null,
            }).catch(() => undefined)
          }
          onReportProblem={(id, note) =>
            void actionReportProblem({ questionId: id, nodeId: q.node_id ?? null, note }).catch(
              () => undefined
            )
          }
          feedback={
            error ? (
              <p role="alert" className="mt-4 text-sm">
                {error}
              </p>
            ) : null
          }
        />
      )}
    </div>
  );
}
