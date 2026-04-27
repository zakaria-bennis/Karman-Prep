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

  const choices = [...question.answer_choices].sort((a, b) =>
    a.letter.localeCompare(b.letter)
  );
  const hasPassage =
    !!question.passage || !!question.passage_a || !!question.passage_b;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-6"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Student preview"
    >
      <div
        className="relative w-full max-w-6xl max-h-[90vh] overflow-hidden rounded-2xl border border-white/10 bg-[#0B1026] shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ─────────────────────────────────────── */}
        <div className="shrink-0 flex items-center justify-between px-6 py-3 border-b border-white/10 bg-white/[0.03]">
          <div className="flex items-center gap-3 text-xs">
            <span className="font-semibold text-slate-300">Student preview</span>
            <span className="text-slate-600">·</span>
            <span className="text-slate-500">
              {question.subject === "math" ? "Math" : "Reading & Writing"}
            </span>
            {question.concept_slug && (
              <>
                <span className="text-slate-600">·</span>
                <span className="text-slate-500">{question.concept_slug}</span>
              </>
            )}
            <span className="text-slate-600">·</span>
            <span className="text-slate-500">difficulty {question.difficulty_level}</span>
          </div>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-white transition-colors"
            aria-label="Close preview"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ── Body ───────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto">
          {hasPassage ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6">
              <PassageColumn question={question} />
              <PromptColumn question={question} choices={choices} />
            </div>
          ) : (
            <div className="max-w-2xl mx-auto p-6">
              <PromptColumn question={question} choices={choices} />
            </div>
          )}
        </div>

        {/* ── Footer hint ────────────────────────────────── */}
        <div className="shrink-0 px-6 py-2 text-[11px] text-slate-600 border-t border-white/10 bg-white/[0.02]">
          Read-only preview · the correct answer is highlighted for the admin · students see no highlighting until they submit
        </div>
      </div>
    </div>
  );
}

function PassageColumn({ question }: { question: QuizQuestionWithChoices }) {
  return (
    <div className="text-slate-200 text-[15px] leading-relaxed font-serif">
      {question.passage_intro && (
        <p className="italic text-slate-400 text-sm mb-4">
          {question.passage_intro}
        </p>
      )}
      {question.passage && (
        <div className="whitespace-pre-wrap">{question.passage}</div>
      )}
      {(question.passage_a || question.passage_b) && (
        <div className="space-y-5">
          {question.passage_a && (
            <div>
              <div className="text-xs uppercase tracking-wide text-slate-500 mb-2 not-italic font-sans">Text 1</div>
              <div className="whitespace-pre-wrap">{question.passage_a}</div>
            </div>
          )}
          {question.passage_b && (
            <div>
              <div className="text-xs uppercase tracking-wide text-slate-500 mb-2 not-italic font-sans">Text 2</div>
              <div className="whitespace-pre-wrap">{question.passage_b}</div>
            </div>
          )}
        </div>
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
      <p className="text-slate-100 text-[15px] leading-relaxed mb-5 whitespace-pre-wrap">
        {question.question_text}
      </p>

      {question.answer_format === "multiple_choice" ? (
        <ul className="space-y-2.5">
          {choices.map((c) => (
            <li
              key={c.id}
              className={
                c.is_correct
                  ? "px-4 py-3 rounded-xl border border-emerald-400/40 bg-emerald-500/[0.06] text-emerald-50 text-[15px] flex items-start gap-3"
                  : "px-4 py-3 rounded-xl border border-white/10 bg-white/[0.02] text-slate-200 text-[15px] flex items-start gap-3 hover:bg-white/[0.04] transition-colors"
              }
            >
              <span className="shrink-0 inline-flex items-center justify-center w-6 h-6 rounded-full border border-white/20 text-xs font-mono">
                {c.letter}
              </span>
              <span className="whitespace-pre-wrap">{c.choice_text}</span>
            </li>
          ))}
        </ul>
      ) : (
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
          <label className="block text-xs uppercase tracking-wide text-slate-500 mb-2">
            Numeric entry
          </label>
          <div className="flex items-center gap-3">
            <input
              type="text"
              disabled
              placeholder="Student types answer here"
              className="flex-1 bg-slate-950/60 border border-white/10 rounded-lg px-3 py-2 text-slate-300 placeholder:text-slate-600 text-[15px]"
            />
            <span className="text-xs text-emerald-300">
              answer: <span className="font-mono">{question.correct_answer}</span>
              {question.numeric_tolerance != null && (
                <span className="text-slate-500 ml-1">±{question.numeric_tolerance}</span>
              )}
            </span>
          </div>
        </div>
      )}

      {question.hint && (
        <details className="mt-4 text-xs text-slate-500">
          <summary className="cursor-pointer hover:text-slate-300">Hint</summary>
          <p className="mt-1.5 text-slate-400">{question.hint}</p>
        </details>
      )}
    </div>
  );
}
