"use client";

// ============================================================
// ViewMode — student-style render of an Inspector question.
// Extracted from InspectorDetailClient to keep that file under
// the 700-line size limit. No state; pure presentation.
// ============================================================

import { cn } from "@/lib/utils";
import type { QuizQuestionWithChoices } from "@/types/quiz";
import MathText from "@/components/learn/MathText";
import QuestionTable from "@/components/learn/QuestionTable";
import FigureFrame from "@/components/learn/FigureFrame";

interface Props {
  question: QuizQuestionWithChoices;
  hasPassage: boolean;
  choices: QuizQuestionWithChoices["answer_choices"];
}

export default function ViewMode({ question, hasPassage, choices }: Props) {
  return (
    <>
      {hasPassage && (
        <div className="mb-4 rounded-lg border border-bronze bg-night/40 p-4">
          {question.passage_intro && (
            <p className="mb-2 text-xs italic text-taupe">
              <MathText text={question.passage_intro} />
            </p>
          )}
          {question.passage && (
            <div className="text-sm leading-relaxed text-ivory">
              <MathText text={question.passage} />
            </div>
          )}
          {question.passage_a && (
            <div className="space-y-3">
              <div>
                <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-taupe">
                  Passage A
                </div>
                <div className="text-sm text-ivory">
                  <MathText text={question.passage_a} />
                </div>
              </div>
              {question.passage_b && (
                <div>
                  <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-taupe">
                    Passage B
                  </div>
                  <div className="text-sm text-ivory">
                    <MathText text={question.passage_b} />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {question.figure_kind === "table" && question.figure_table_data ? (
        <div className="mb-4 flex justify-center">
          <QuestionTable data={question.figure_table_data} />
        </div>
      ) : (
        question.image_url && (
          <FigureFrame
            src={question.image_url}
            alt={question.image_alt ?? "Question figure"}
            className="mb-4"
            maxHeightClass="max-h-96"
          />
        )
      )}

      <div className="mb-4 text-base leading-relaxed text-ivory">
        <MathText text={question.question_text} />
      </div>

      {choices.length > 0 ? (
        <div className="space-y-2">
          {choices.map((c) => {
            const isCorrect = c.letter === question.correct_answer;
            return (
              <div
                key={c.id}
                className={cn(
                  "flex gap-3 rounded-lg border px-3 py-2.5 text-sm",
                  isCorrect ? "border-success/40 bg-success/[0.06]" : "border-bronze bg-night/40"
                )}
              >
                <span
                  className={cn(
                    "shrink-0 font-semibold",
                    isCorrect ? "text-success-bright" : "text-taupe"
                  )}
                >
                  {c.letter}
                </span>
                <span className="text-ivory">
                  <MathText text={c.choice_text} />
                </span>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-lg border border-bronze bg-night/40 px-3 py-2.5 text-sm">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-taupe">
            SPR answer
          </span>{" "}
          <span className="text-success-bright">{question.correct_answer}</span>
          {question.numeric_tolerance != null && (
            <span className="ml-2 text-xs text-taupe">± {String(question.numeric_tolerance)}</span>
          )}
        </div>
      )}

      <details className="mt-4 rounded-lg border border-bronze bg-night/40">
        <summary className="cursor-pointer px-3 py-2 text-xs font-semibold text-ivory">
          Hint &amp; explanation
        </summary>
        <div className="space-y-3 border-t border-bronze px-3 py-3 text-xs">
          {question.hint && (
            <div>
              <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-taupe">
                Hint
              </div>
              <div className="text-ivory">
                <MathText text={question.hint} />
              </div>
            </div>
          )}
          {question.explanation_text && (
            <div>
              <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-taupe">
                Explanation
              </div>
              <div className="leading-relaxed text-ivory">
                <MathText text={question.explanation_text} />
              </div>
            </div>
          )}
        </div>
      </details>
    </>
  );
}
