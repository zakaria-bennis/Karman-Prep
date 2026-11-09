"use client";

// ============================================================
// StudentQuestionPreview — modal that renders a question the
// way a student sees it during a quiz / diagnostic. Read-only
// (no answer recording, no scoring, no per-choice feedback —
// just the layout the student sees BEFORE they answer).
//
// R&W rows render with passage(s) on the left and prompt +
// choices on the right, mirroring the diagnostic two-column
// shape. Math rows use a single-column layout. SPR rows show
// a numeric input field placeholder.
//
// Mounted via a "Preview" button on:
//   · /admin/questions/review (Flagged + Bank tabs)
//   · /admin/curriculum/[nodeId] question list
// ============================================================

import { useEffect } from "react";
import { X } from "lucide-react";
import type { QuizQuestionWithChoices } from "@/types/quiz";
import MathText from "@/components/learn/MathText";
import QuestionTable from "@/components/learn/QuestionTable";
import FigureFrame from "@/components/learn/FigureFrame";

interface Props {
  question: QuizQuestionWithChoices;
  onClose: () => void;
}

export default function StudentQuestionPreview({ question, onClose }: Props) {
  // Esc to close.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const choices = [...question.answer_choices].sort((a, b) => a.letter.localeCompare(b.letter));
  const hasPassage = !!question.passage || !!question.passage_a || !!question.passage_b;
  const hasFigure =
    !!question.image_url || (question.figure_kind === "table" && !!question.figure_table_data);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[color-mix(in_srgb,var(--sunk)_70%,transparent)] p-6 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Student preview"
    >
      <div
        className="relative flex max-h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-[color-mix(in_srgb,var(--ink)_10%,transparent)] bg-[#070605] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ─────────────────────────────────────── */}
        <div className="flex shrink-0 items-center justify-between border-b border-[color-mix(in_srgb,var(--ink)_10%,transparent)] bg-[color-mix(in_srgb,var(--card)_3%,transparent)] px-6 py-3">
          <div className="flex items-center gap-3 text-xs">
            <span className="font-semibold text-[color:var(--ink)]">Student preview</span>
            <span className="text-[color:var(--mute)]">·</span>
            <span className="text-[color:var(--mute)]">
              {question.subject === "math" ? "Math" : "Reading & Writing"}
            </span>
            {question.concept_slug && (
              <>
                <span className="text-[color:var(--mute)]">·</span>
                <span className="text-[color:var(--mute)]">{question.concept_slug}</span>
              </>
            )}
            <span className="text-[color:var(--mute)]">·</span>
            <span className="text-[color:var(--mute)]">difficulty {question.difficulty_level}</span>
          </div>
          <button
            onClick={onClose}
            className="text-[color:var(--mute)] transition-colors hover:text-[color:var(--ink)]"
            aria-label="Close preview"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* ── Body ───────────────────────────────────────── */}
        {/* Split view fires whenever there's a passage OR a figure.
            Left column stacks [figure card, passage]; right has the
            prompt + choices. Pure-text math stays single-column. */}
        <div className="flex-1 overflow-y-auto">
          {hasPassage || hasFigure ? (
            <div className="grid grid-cols-1 gap-6 p-6 md:grid-cols-2">
              <LeftColumn question={question} />
              <PromptColumn question={question} choices={choices} />
            </div>
          ) : (
            <div className="mx-auto max-w-2xl p-6">
              <PromptColumn question={question} choices={choices} />
            </div>
          )}
        </div>

        {/* ── Footer hint ────────────────────────────────── */}
        <div className="shrink-0 border-t border-[color-mix(in_srgb,var(--ink)_10%,transparent)] bg-[color-mix(in_srgb,var(--card)_2%,transparent)] px-6 py-2 text-[11px] text-[color:var(--mute)]">
          Read-only preview · the correct answer is highlighted for the admin · students see no
          highlighting until they submit
        </div>
      </div>
    </div>
  );
}

function LeftColumn({ question }: { question: QuizQuestionWithChoices }) {
  const hasPassage = !!question.passage || !!question.passage_a || !!question.passage_b;
  const isNativeTable = question.figure_kind === "table" && question.figure_table_data;
  return (
    <div className="font-serif text-[15px] leading-relaxed text-[color:var(--ink)]">
      {isNativeTable ? (
        <div className="mb-6 flex justify-center">
          <QuestionTable data={question.figure_table_data!} />
        </div>
      ) : (
        question.image_url && (
          <FigureFrame
            src={question.image_url}
            alt={question.image_alt ?? "Question figure"}
            className="mb-6"
            maxHeightClass="max-h-[28rem]"
          />
        )
      )}
      {hasPassage && (
        <>
          {question.passage_intro && (
            <p className="mb-4 text-sm italic text-[color:var(--mute)]">{question.passage_intro}</p>
          )}
          {question.passage && <MathText text={question.passage} className="whitespace-pre-wrap" />}
          {(question.passage_a || question.passage_b) && (
            <div className="space-y-5">
              {question.passage_a && (
                <div>
                  <div className="mb-2 font-sans text-xs uppercase not-italic tracking-wide text-[color:var(--mute)]">
                    Text 1
                  </div>
                  <MathText text={question.passage_a} className="whitespace-pre-wrap" />
                </div>
              )}
              {question.passage_b && (
                <div>
                  <div className="mb-2 font-sans text-xs uppercase not-italic tracking-wide text-[color:var(--mute)]">
                    Text 2
                  </div>
                  <MathText text={question.passage_b} className="whitespace-pre-wrap" />
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function PromptColumn({
  question,
  choices,
}: {
  question: QuizQuestionWithChoices;
  choices: typeof question.answer_choices;
}) {
  return (
    <div>
      <MathText
        text={question.question_text}
        className="mb-5 block whitespace-pre-wrap text-[15px] leading-relaxed text-[color:var(--ink)]"
      />

      {question.answer_format === "multiple_choice" ? (
        <ul className="space-y-2.5">
          {choices.map((c) => (
            <li
              key={c.id}
              className={
                c.is_correct
                  ? "flex items-start gap-3 rounded-xl border border-[color-mix(in_srgb,var(--good)_40%,transparent)] bg-[color-mix(in_srgb,var(--good)_6%,transparent)] px-4 py-3 text-[15px] text-[color:var(--good)]"
                  : "flex items-start gap-3 rounded-xl border border-[color-mix(in_srgb,var(--ink)_10%,transparent)] bg-[color-mix(in_srgb,var(--card)_2%,transparent)] px-4 py-3 text-[15px] text-[color:var(--ink)] transition-colors hover:bg-[color-mix(in_srgb,var(--card)_4%,transparent)]"
              }
            >
              <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-[color-mix(in_srgb,var(--ink)_20%,transparent)] font-mono text-xs">
                {c.letter}
              </span>
              <div className="min-w-0 flex-1">
                {c.choice_table_data ? (
                  <QuestionTable
                    data={c.choice_table_data}
                    ariaLabel={`Choice ${c.letter} data table`}
                    className="my-0 max-w-full"
                  />
                ) : (
                  <MathText text={c.choice_text} className="whitespace-pre-wrap" />
                )}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <div className="rounded-xl border border-[color-mix(in_srgb,var(--ink)_10%,transparent)] bg-[color-mix(in_srgb,var(--card)_2%,transparent)] p-4">
          <label className="mb-2 block text-xs uppercase tracking-wide text-[color:var(--mute)]">
            Numeric entry
          </label>
          <div className="flex items-center gap-3">
            <input
              type="text"
              disabled
              placeholder="Student types answer here"
              className="flex-1 rounded-lg border border-[color-mix(in_srgb,var(--ink)_10%,transparent)] bg-[color-mix(in_srgb,var(--sunk)_60%,transparent)] px-3 py-2 text-[15px] text-[color:var(--ink)] placeholder:text-[color:var(--mute)]"
            />
            <span className="text-xs text-[color:var(--good)]">
              answer: <span className="font-mono">{question.correct_answer}</span>
              {question.numeric_tolerance != null && (
                <span className="ml-1 text-[color:var(--mute)]">±{question.numeric_tolerance}</span>
              )}
            </span>
          </div>
        </div>
      )}

      {question.hint && (
        <details className="mt-4 text-xs text-[color:var(--mute)]">
          <summary className="cursor-pointer hover:text-[color:var(--ink)]">Hint</summary>
          <MathText text={question.hint} className="mt-1.5 block text-[color:var(--mute)]" />
        </details>
      )}
    </div>
  );
}
