"use client";

import MathText from "./MathText";
import ReviewedSinglePassage from "./ReviewedSinglePassage";
import QuestionTable from "./QuestionTable";
import ChartFigure from "./ChartFigure";
import GeometryFigure from "./GeometryFigure";
import FigureFrame from "./FigureFrame";
import { buildGeometrySvg } from "@/lib/figures/geometry-svg";
import type { QuizReviewContent } from "@/lib/quiz-review-content";

/** Reuse the same math, native figure and table renderers as active practice. */
export default function QuizReviewQuestion({ question: q }: { question: QuizReviewContent }) {
  const nativeGeometry =
    q.figure_kind === "geometric" &&
    q.figure_geometry_data &&
    buildGeometrySvg(q.figure_geometry_data).renderable;
  return (
    <div className="mt-4 min-w-0 space-y-4 text-ivory">
      <ReviewedSinglePassage
        intro={q.passage_intro}
        passage={q.passage}
        display={q.reviewed_passage}
        treatBlankWord
      />
      {q.passage_a && (
        <div>
          <p className="mb-2 text-sm font-semibold">Text 1</p>
          <MathText text={q.passage_a} treatBlankWord />
        </div>
      )}
      {q.passage_b && (
        <div>
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
      ) : nativeGeometry ? (
        <GeometryFigure data={q.figure_geometry_data!} className="max-w-2xl" />
      ) : q.image_url ? (
        <FigureFrame src={q.image_url} alt={q.image_alt ?? "Question figure"} />
      ) : null}
      <MathText text={q.question_text} serializedFunctionLines={q.subject === "math"} />
      {q.answer_format !== "numeric_entry" && (
        <ul className="space-y-2">
          {[...q.answer_choices]
            .sort((a, b) => a.letter.localeCompare(b.letter))
            .map((choice) => (
              <li key={choice.id} className="min-w-0 rounded-lg border border-bronze p-3">
                <p className="mb-1 text-sm font-semibold">Choice {choice.letter}</p>
                {choice.choice_table_data ? (
                  <QuestionTable
                    data={choice.choice_table_data}
                    ariaLabel={`Choice ${choice.letter} data table`}
                    className="max-w-full"
                  />
                ) : (
                  <MathText
                    text={choice.choice_text}
                    serializedFunctionLines={q.subject === "math"}
                  />
                )}
              </li>
            ))}
        </ul>
      )}
      <div className="rounded-lg border border-bronze bg-surface-raised p-4">
        <p className="mb-2 text-sm font-semibold">Current correct answer</p>
        <MathText text={q.correct_answer} />
        {q.explanation_text && (
          <div className="mt-3">
            <MathText text={q.explanation_text} />
          </div>
        )}
        {q.explanation_per_choice &&
          Object.entries(q.explanation_per_choice).map(
            ([letter, explanation]) =>
              explanation && (
                <div key={letter} className="mt-3">
                  <p className="text-sm font-semibold">Choice {letter} explanation</p>
                  <MathText text={explanation} />
                </div>
              )
          )}
        {q.subject === "math" && q.desmos_strategy && (
          <div className="mt-3">
            <p className="text-sm font-semibold">Desmos strategy</p>
            <MathText text={q.desmos_strategy} />
          </div>
        )}
      </div>
    </div>
  );
}
