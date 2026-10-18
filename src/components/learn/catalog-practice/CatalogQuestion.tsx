"use client";

import { useState } from "react";
import { Ban } from "lucide-react";
import { CalculatorChoiceAction } from "@/components/calculator/CalculatorSourceAction";
import styles from "../quiz/workspace.module.css";
import type { StudentQuizQuestion } from "@/types/quiz";
import MathText from "../MathText";
import PassageAnnotations from "../quiz/PassageAnnotations";
import ReviewedSinglePassage from "../ReviewedSinglePassage";
import QuestionTable from "../QuestionTable";
import ChartFigure from "../ChartFigure";
import GeometryFigure from "../GeometryFigure";
import FigureFrame from "../FigureFrame";
import { buildGeometrySvg } from "@/lib/figures/geometry-svg";

/** The immutable answer-free question, rendered with the existing source-aware components. */
export default function CatalogQuestion({
  question: q,
  answer,
  disabled,
  onAnswer,
}: {
  question: StudentQuizQuestion;
  answer: string;
  disabled: boolean;
  onAnswer: (answer: string) => void;
}) {
  const [crossed, setCrossed] = useState<Record<string, boolean>>({});
  const geometry =
    q.figure_kind === "geometric" &&
    q.figure_geometry_data &&
    buildGeometrySvg(q.figure_geometry_data).renderable;
  const hasPassage = q.passage || q.passage_intro || q.passage_a || q.passage_b;
  return (
    <div
      data-catalog-question-id={q.id}
      data-question-layout
      className={
        hasPassage || q.image_url || q.figure_kind
          ? "grid min-w-0 gap-6 md:grid-cols-2"
          : "min-w-0 space-y-6"
      }
    >
      <div className="min-w-0 space-y-6" hidden={!hasPassage && !q.image_url && !q.figure_kind}>
        {hasPassage && (
          <PassageAnnotations
            questionId={q.id}
            sourceKey={JSON.stringify([
              q.passage_intro,
              q.passage,
              q.passage_a,
              q.passage_b,
              q.reviewed_passage,
            ])}
          >
            <article className="space-y-5 font-serif text-lg leading-relaxed">
              {q.passage_a || q.passage_b ? (
                [q.passage_a, q.passage_b].map((passage, index) =>
                  passage ? (
                    <section key={index}>
                      <h2 className="mb-2 font-sans text-sm font-semibold">Text {index + 1}</h2>
                      <MathText
                        text={passage}
                        className="block whitespace-pre-wrap"
                        treatBlankWord
                      />
                    </section>
                  ) : null
                )
              ) : (
                <ReviewedSinglePassage
                  intro={q.passage_intro}
                  passage={q.passage}
                  display={q.reviewed_passage}
                  treatBlankWord
                />
              )}
            </article>
          </PassageAnnotations>
        )}
        {q.figure_kind === "table" && q.figure_table_data ? (
          <QuestionTable calculator={q.subject === "math"} data={q.figure_table_data} />
        ) : q.figure_kind === "chart" && q.figure_chart_data ? (
          <ChartFigure
            data={q.figure_chart_data}
            subject={q.subject}
            alt={q.image_alt ?? undefined}
          />
        ) : geometry ? (
          <GeometryFigure data={q.figure_geometry_data!} className="max-w-2xl" />
        ) : q.image_url ? (
          <FigureFrame src={q.image_url} alt={q.image_alt ?? "Question figure"} />
        ) : null}
      </div>
      <div className="min-w-0 space-y-6">
        <MathText
          calculator={q.subject === "math"}
          text={q.question_text}
          className="block whitespace-pre-wrap text-lg leading-relaxed"
          serializedFunctionLines={q.subject === "math"}
          treatBlankWord
        />
        {q.answer_format === "numeric_entry" ? (
          <label className="block text-sm font-semibold">
            Your answer
            <input
              value={answer}
              onChange={(event) => onAnswer(event.target.value)}
              disabled={disabled}
              maxLength={120}
              autoComplete="off"
              placeholder="Number or fraction"
              className="mt-2 block min-h-11 w-full rounded-xl border border-bronze bg-surface px-4 py-3 text-lg text-ivory focus-visible:outline-info"
            />
          </label>
        ) : (
          <fieldset className="min-w-0 space-y-3">
            <legend className="mb-3 text-sm font-semibold">Choose one answer</legend>
            {[...q.answer_choices]
              .sort((a, b) => a.letter.localeCompare(b.letter))
              .map((choice) =>
                choice.choice_table_data ? (
                  <div key={choice.id} className="min-w-0 rounded-xl border border-bronze p-4">
                    <label className="mb-3 flex min-h-11 items-center gap-3 font-semibold">
                      <input
                        type="radio"
                        disabled={disabled}
                        name={`catalog-${q.id}`}
                        checked={answer === choice.letter}
                        onChange={() => onAnswer(choice.letter)}
                        aria-label={`Choice ${choice.letter}`}
                        className="h-5 w-5 shrink-0 accent-info"
                      />
                      Choice {choice.letter}
                    </label>
                    <QuestionTable
                      calculator={q.subject === "math"}
                      data={choice.choice_table_data}
                      ariaLabel={`Choice ${choice.letter} data table`}
                      className="max-w-full"
                    />
                  </div>
                ) : (
                  <div className="group relative" key={choice.id}>
                    <label
                      className={`flex min-h-11 min-w-0 items-start gap-3 rounded-xl border p-4 pr-14 ${crossed[`${q.id}:${choice.letter}`] ? "line-through opacity-50" : ""} ${answer === choice.letter ? "border-info bg-info/10" : "border-bronze bg-surface"}`}
                    >
                      <input
                        type="radio"
                        disabled={disabled || crossed[`${q.id}:${choice.letter}`]}
                        name={`catalog-${q.id}`}
                        value={choice.letter}
                        checked={answer === choice.letter}
                        onChange={() => onAnswer(choice.letter)}
                        aria-label={`Choice ${choice.letter}`}
                        className="mt-1 h-5 w-5 shrink-0 accent-info"
                      />
                      <span className="font-semibold">{choice.letter}</span>
                      <MathText
                        text={choice.choice_text}
                        className="min-w-0 whitespace-pre-wrap leading-relaxed"
                        serializedFunctionLines={q.subject === "math"}
                      />
                    </label>
                    <div className={`${styles.choiceTools} absolute right-1 top-1`}>
                      <button
                        type="button"
                        aria-label={
                          crossed[`${q.id}:${choice.letter}`]
                            ? `Restore choice ${choice.letter}`
                            : `Cross out choice ${choice.letter}`
                        }
                        aria-pressed={!!crossed[`${q.id}:${choice.letter}`]}
                        onClick={() =>
                          setCrossed((old) => ({
                            ...old,
                            [`${q.id}:${choice.letter}`]: !old[`${q.id}:${choice.letter}`],
                          }))
                        }
                      >
                        <Ban size={18} />
                      </button>
                    </div>
                    {q.subject === "math" && (
                      <CalculatorChoiceAction text={choice.choice_text} letter={choice.letter} />
                    )}
                  </div>
                )
              )}
          </fieldset>
        )}
      </div>
    </div>
  );
}
