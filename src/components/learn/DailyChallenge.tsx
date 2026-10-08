"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, BookOpen, Calculator } from "lucide-react";
import { actionReviewDailyAnswer } from "@/app/learn/daily-challenge-actions";
import type { DailySlot } from "@/lib/daily-challenge/server";
import type { DailySubject } from "@/lib/daily-challenge/selection";
import type { StudentQuizQuestion, StudentQuizReview } from "@/types/quiz";
import MathText from "./MathText";
import ReviewedSinglePassage from "./ReviewedSinglePassage";
import QuestionTable from "./QuestionTable";
import ChartFigure from "./ChartFigure";
import GeometryFigure from "./GeometryFigure";
import FigureFrame from "./FigureFrame";
import ExternalCalculatorLink from "./ExternalCalculatorLink";
import { buildGeometrySvg } from "@/lib/figures/geometry-svg";

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
      <div className="mx-auto max-w-6xl">
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
        <div className="mt-6 grid items-start gap-6 lg:grid-cols-2">
          <DailySlotCard subject="math" slot={math} />
          <DailySlotCard subject="reading" slot={reading} />
        </div>
      </div>
    </section>
  );
}

function DailySlotCard({ subject, slot }: { subject: DailySubject; slot: DailySlot }) {
  const Icon = subject === "math" ? Calculator : BookOpen;
  const accent = subject === "math" ? "text-math" : "text-rw";
  return (
    <article className="min-w-0 border border-bronze bg-surface p-5 sm:p-7">
      <div className="flex items-center gap-3">
        <Icon className={`h-5 w-5 ${accent}`} aria-hidden="true" />
        <h3 className="font-plex-serif text-2xl text-ivory">{subjectName[subject]}</h3>
      </div>
      {slot.state === "ready" ? (
        <DailyQuestion key={`${slot.value.day}:${slot.value.question.id}`} value={slot.value} />
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
            Explore {subjectName[subject]} <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      )}
    </article>
  );
}

function DailyQuestion({ value }: { value: Extract<DailySlot, { state: "ready" }>["value"] }) {
  const { question: q, subject, day } = value;
  const [answer, setAnswer] = useState("");
  const [review, setReview] = useState<StudentQuizReview | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);

  async function submitAnswer() {
    if (pending || review || !answer.trim()) return;
    setPending(true);
    setError(null);
    try {
      const result = await actionReviewDailyAnswer({
        subject,
        day,
        questionId: q.id,
        answer,
      });
      setReview(result);
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
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-taupe">
        <span>{q.topic_cluster}</span>
        <span>Difficulty {q.difficulty_level} of 7</span>
      </div>
      <QuestionContent question={q} />
      <div className="mt-6">
        {q.answer_format === "numeric_entry" ? (
          <label className="block text-sm font-medium text-ivory">
            Your answer
            <input
              type="text"
              inputMode="decimal"
              autoComplete="off"
              value={answer}
              disabled={!!review || pending}
              onChange={(event) => setAnswer(event.target.value)}
              className="mt-2 min-h-11 w-full rounded-lg border border-bronze bg-night px-3 py-2 text-ivory focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
            />
          </label>
        ) : (
          <fieldset disabled={!!review || pending}>
            <legend className="sr-only">Choose an answer</legend>
            <div className="space-y-2">
              {[...q.answer_choices]
                .sort((left, right) => left.letter.localeCompare(right.letter))
                .map((choice) => (
                  <label
                    key={choice.id}
                    className={`block cursor-pointer rounded-lg border p-3 focus-within:ring-2 focus-within:ring-gold ${answer === choice.letter ? "border-gold bg-gold/10" : "border-bronze bg-night"}`}
                  >
                    <span className="flex items-start gap-3">
                      <input
                        type="radio"
                        name={`daily-${subject}-${q.id}`}
                        value={choice.letter}
                        checked={answer === choice.letter}
                        onChange={() => setAnswer(choice.letter)}
                        className="mt-1 accent-gold"
                      />
                      <span className="min-w-0 flex-1 text-sm leading-relaxed text-ivory">
                        <span className="mr-2 font-semibold">{choice.letter}.</span>
                        {choice.choice_table_data ? (
                          <QuestionTable
                            data={choice.choice_table_data}
                            ariaLabel={`Choice ${choice.letter} data table`}
                            className="mt-2 max-w-full"
                          />
                        ) : (
                          <MathText
                            text={choice.choice_text}
                            serializedFunctionLines={subject === "math"}
                          />
                        )}
                      </span>
                    </span>
                  </label>
                ))}
            </div>
          </fieldset>
        )}
      </div>
      {subject === "math" && <ExternalCalculatorLink subject="math" className="mt-5" />}
      <div className="mt-6">
        <button
          type="button"
          onClick={submitAnswer}
          disabled={!answer.trim() || pending || !!review}
          className="min-h-11 rounded-xl bg-gold px-5 py-2.5 text-sm font-semibold text-night hover:bg-gold-bright focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-bright disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending ? "Checking answer…" : review ? "Answer checked" : "Check answer"}
        </button>
      </div>
      {error && (
        <p role="alert" className="mt-3 text-sm text-error-bright">
          {error}
        </p>
      )}
      {review && (
        <div className="mt-6 border-t border-bronze pt-5" aria-live="polite">
          <p
            className={`font-semibold ${review.isCorrect ? "text-success-bright" : "text-error-bright"}`}
          >
            {review.isCorrect ? "Correct" : "Not quite"}
          </p>
          <p className="mt-2 text-sm text-ivory">
            Correct answer: <MathText text={review.correct_answer} />
          </p>
          <button
            type="button"
            onClick={() => setShowExplanation((current) => !current)}
            aria-expanded={showExplanation}
            className="mt-4 min-h-11 text-sm font-semibold text-gold underline underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-bright"
          >
            {showExplanation ? "Hide explanation" : "Show explanation"}
          </button>
          {showExplanation && <DailyExplanation review={review} subject={subject} />}
          <p className="mt-5 text-xs leading-relaxed text-taupe">
            This daily check does not save practice history or change skill progress.
          </p>
        </div>
      )}
    </div>
  );
}

function QuestionContent({ question: q }: { question: StudentQuizQuestion }) {
  const geometryReady =
    q.figure_kind === "geometric" &&
    q.figure_geometry_data &&
    buildGeometrySvg(q.figure_geometry_data).renderable;
  return (
    <div className="mt-5 min-w-0 space-y-5 text-ivory">
      <ReviewedSinglePassage
        intro={q.passage_intro}
        passage={q.passage}
        display={q.reviewed_passage}
        treatBlankWord
      />
      {q.passage_a && (
        <div className="font-atkinson text-base leading-relaxed">
          <p className="mb-2 text-sm font-semibold">Text 1</p>
          <MathText text={q.passage_a} treatBlankWord />
        </div>
      )}
      {q.passage_b && (
        <div className="font-atkinson text-base leading-relaxed">
          <p className="mb-2 text-sm font-semibold">Text 2</p>
          <MathText text={q.passage_b} treatBlankWord />
        </div>
      )}
      {q.figure_kind === "table" && q.figure_table_data ? (
        <QuestionTable data={q.figure_table_data} />
      ) : q.figure_kind === "chart" && q.figure_chart_data ? (
        <ChartFigure
          data={q.figure_chart_data}
          subject={q.subject}
          alt={q.image_alt ?? undefined}
        />
      ) : geometryReady ? (
        <GeometryFigure data={q.figure_geometry_data!} className="max-w-full" />
      ) : q.image_url ? (
        <FigureFrame src={q.image_url} alt={q.image_alt ?? "Question figure"} />
      ) : null}
      <div className="font-atkinson text-base leading-relaxed">
        <MathText text={q.question_text} serializedFunctionLines={q.subject === "math"} />
      </div>
    </div>
  );
}

function DailyExplanation({
  review,
  subject,
}: {
  review: StudentQuizReview;
  subject: DailySubject;
}) {
  return (
    <div className="mt-3 space-y-3 border-l-2 border-gold pl-4 text-sm leading-relaxed text-ivory">
      <MathText text={review.explanation_text} />
      {review.explanation_per_choice &&
        Object.entries(review.explanation_per_choice).map(([letter, explanation]) =>
          explanation ? (
            <p key={letter}>
              <span className="font-semibold">Choice {letter}: </span>
              <MathText text={explanation} />
            </p>
          ) : null
        )}
      {subject === "math" && review.desmos_strategy && (
        <p>
          <span className="font-semibold">Calculator strategy: </span>
          <MathText text={review.desmos_strategy} />
        </p>
      )}
    </div>
  );
}
