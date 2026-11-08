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
        <div className="mb-4 rounded-lg border border-[color:var(--line)] bg-[color-mix(in_srgb,var(--sunk)_40%,transparent)] p-4">
          {question.passage_intro && (
            <p className="mb-2 text-xs italic text-[color:var(--mute)]">
              <MathText text={question.passage_intro} />
            </p>
          )}
          {question.passage && (
            <div className="text-sm leading-relaxed text-[color:var(--ink)]">
              <MathText text={question.passage} />
            </div>
          )}
          {question.passage_a && (
            <div className="space-y-3">
              <div>
                <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-[color:var(--mute)]">
                  Passage A
                </div>
                <div className="text-sm text-[color:var(--ink)]">
                  <MathText text={question.passage_a} />
                </div>
              </div>
              {question.passage_b && (
                <div>
                  <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-[color:var(--mute)]">
                    Passage B
                  </div>
                  <div className="text-sm text-[color:var(--ink)]">
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

      <div className="mb-4 text-base leading-relaxed text-[color:var(--ink)]">
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
                  isCorrect
                    ? "border-[color-mix(in_srgb,var(--good)_40%,transparent)] bg-[color-mix(in_srgb,var(--good)_6%,transparent)]"
                    : "border-[color:var(--line)] bg-[color-mix(in_srgb,var(--sunk)_40%,transparent)]"
                )}
              >
                <span
                  className={cn(
                    "shrink-0 font-semibold",
                    isCorrect ? "text-[color:var(--good)]" : "text-[color:var(--mute)]"
                  )}
                >
                  {c.letter}
                </span>
                <div className="min-w-0 flex-1 text-[color:var(--ink)]">
                  {c.choice_table_data ? (
                    <QuestionTable
                      data={c.choice_table_data}
                      ariaLabel={`Choice ${c.letter} data table`}
                      className="my-0 max-w-full"
                    />
                  ) : (
                    <MathText text={c.choice_text} />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-lg border border-[color:var(--line)] bg-[color-mix(in_srgb,var(--sunk)_40%,transparent)] px-3 py-2.5 text-sm">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-[color:var(--mute)]">
            SPR answer
          </span>{" "}
          <span className="text-[color:var(--good)]">{question.correct_answer}</span>
          {question.numeric_tolerance != null && (
            <span className="ml-2 text-xs text-[color:var(--mute)]">
              ± {String(question.numeric_tolerance)}
            </span>
          )}
        </div>
      )}

      <details className="mt-4 rounded-lg border border-[color:var(--line)] bg-[color-mix(in_srgb,var(--sunk)_40%,transparent)]">
        <summary className="cursor-pointer px-3 py-2 text-xs font-semibold text-[color:var(--ink)]">
          Hint &amp; explanation
        </summary>
        <div className="space-y-3 border-t border-[color:var(--line)] px-3 py-3 text-xs">
          {question.hint && (
            <div>
              <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-[color:var(--mute)]">
                Hint
              </div>
              <div className="text-[color:var(--ink)]">
                <MathText text={question.hint} />
              </div>
            </div>
          )}
          {question.explanation_text && (
            <div>
              <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-[color:var(--mute)]">
                Explanation
              </div>
              <div className="leading-relaxed text-[color:var(--ink)]">
                <MathText text={question.explanation_text} />
              </div>
            </div>
          )}
        </div>
      </details>
    </>
  );
}
