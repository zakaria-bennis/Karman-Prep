"use client";

// ============================================================
// QuestionCard — single-question row in the Review triage list.
// Collapses by default; expands to show full question text,
// choices, explanations, and an Accept-with-NodePicker / Reject
// action bar. Used by both the Flagged and Bank tabs.
// ============================================================

import { useState } from "react";
import {
  AlertTriangle,
  BookOpen,
  Calculator,
  Check,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Eye,
  Lightbulb,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import MathText from "@/components/learn/MathText";
import type { QuizQuestionWithChoices } from "@/types/quiz";
import { NodePicker } from "./NodePicker";

export function QuestionCard({
  question,
  busy,
  expanded,
  onToggleExpanded,
  onAccept,
  onReject,
  onPreview,
}: {
  question: QuizQuestionWithChoices;
  busy: boolean;
  expanded: boolean;
  onToggleExpanded: () => void;
  onAccept: (nodeId: string | null) => void;
  onReject: () => void;
  onPreview: () => void;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);

  const choices = question.answer_choices.sort((a, b) => a.letter.localeCompare(b.letter));
  const isFlagged = question.import_status === "needs_review";
  const correctChoice = choices.find((c) => c.is_correct);
  const perChoice = question.explanation_per_choice ?? {};

  return (
    <article className="rounded-xl border border-slate-800 bg-slate-900/60">
      {/* ── Header (always visible) — clicking toggles expansion ── */}
      <button
        onClick={onToggleExpanded}
        className="flex w-full items-start gap-2 rounded-t-xl px-5 pb-3 pt-4 text-left transition-colors hover:bg-white/[0.02]"
      >
        {expanded ? (
          <ChevronDown className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
        ) : (
          <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
        )}
        {isFlagged ? (
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
        ) : (
          <BookOpen className="mt-0.5 h-4 w-4 shrink-0 text-indigo-400" />
        )}
        <div className="min-w-0 flex-1">
          {/* Banner line */}
          <div
            className={cn("text-xs font-medium", isFlagged ? "text-amber-200" : "text-indigo-200")}
          >
            {isFlagged
              ? `${question.import_flag_type === "skip" ? "Unsolvable" : "Needs review"} — ${question.import_flag_reason ?? ""}`
              : "In bank — pick a curriculum node to send this question live in Learn."}
          </div>
          {/* Source PDF + page — prominent on flagged rows so the
              admin can jump to the source PDF and verify the
              figure / question quickly. */}
          {isFlagged && question.source_pdf && (
            <div className="mt-2 inline-flex items-center gap-2 rounded-md border border-slate-700 bg-slate-800/70 px-2.5 py-1 text-[12px]">
              <ExternalLink className="h-3.5 w-3.5 shrink-0 text-amber-300" />
              <span className="font-mono text-slate-200">{question.source_pdf}</span>
              {question.source_page != null && (
                <>
                  <span className="text-slate-600">›</span>
                  <span className="font-semibold text-amber-200">page {question.source_page}</span>
                </>
              )}
              <span className="text-slate-600">·</span>
              <span className="text-slate-400">{question.subject === "math" ? "Math" : "R&W"}</span>
            </div>
          )}
          {/* Question stem (truncated when collapsed) */}
          <div className={cn("mt-2 text-sm text-slate-200", !expanded && "truncate")}>
            {question.question_text}
          </div>
          {/* Compact meta row */}
          <div className="mt-1 flex flex-wrap items-center gap-3 text-[11px] text-slate-500">
            {/* Source repeats here only when NOT flagged — the
                flagged badge above already covers it prominently. */}
            {!isFlagged && question.source_pdf && (
              <span>
                <ExternalLink className="mr-1 inline h-3 w-3" />
                {question.source_pdf}
                {question.source_page ? `:${question.source_page}` : ""}
              </span>
            )}
            <span>{question.concept_slug ?? "—"}</span>
            <span>·</span>
            <span>{question.domain ?? "—"}</span>
            <span>·</span>
            <span>diff {question.difficulty_level}</span>
            {correctChoice && (
              <>
                <span>·</span>
                <span className="font-mono text-emerald-400">answer {correctChoice.letter}</span>
              </>
            )}
          </div>
        </div>
      </button>

      {/* ── Expanded body ─────────────────────────────── */}
      {expanded && (
        <div className="px-5 pb-3 pt-1">
          {question.passage_intro && (
            <p className="mb-2 text-sm italic text-slate-400">{question.passage_intro}</p>
          )}
          {question.passage && (
            <div className="mb-3 whitespace-pre-wrap rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2.5 font-serif text-sm leading-relaxed text-slate-300">
              {question.passage}
            </div>
          )}
          {(question.passage_a || question.passage_b) && (
            <div className="mb-3 grid grid-cols-1 gap-3 md:grid-cols-2">
              {question.passage_a && (
                <div className="whitespace-pre-wrap rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2.5 font-serif text-sm text-slate-300">
                  <div className="mb-1 text-xs uppercase tracking-wide text-slate-500">Text 1</div>
                  {question.passage_a}
                </div>
              )}
              {question.passage_b && (
                <div className="whitespace-pre-wrap rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2.5 font-serif text-sm text-slate-300">
                  <div className="mb-1 text-xs uppercase tracking-wide text-slate-500">Text 2</div>
                  {question.passage_b}
                </div>
              )}
            </div>
          )}

          {/* Question text (full) + image */}
          <MathText
            text={question.question_text}
            className="mb-3 block whitespace-pre-wrap font-medium text-slate-100"
          />
          {question.image_url && (
            <figure className="mb-3 inline-block max-w-full rounded-xl border border-slate-700/50 bg-slate-200 p-2 shadow-md shadow-black/40">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={question.image_url}
                alt={question.image_alt ?? "Question figure"}
                className="block max-h-72 max-w-full rounded object-contain"
              />
            </figure>
          )}

          {/* Choices + per-choice explanations */}
          {question.answer_format === "multiple_choice" ? (
            <ul className="mb-4 space-y-2">
              {choices.map((c) => {
                const expl = perChoice[c.letter];
                return (
                  <li
                    key={c.id}
                    className={cn(
                      "rounded border px-3 py-2 text-sm",
                      c.is_correct
                        ? "border-emerald-500/40 bg-emerald-500/5"
                        : "border-slate-800 bg-slate-950/40"
                    )}
                  >
                    <div
                      className={cn(
                        "flex items-start gap-2",
                        c.is_correct ? "text-emerald-100" : "text-slate-300"
                      )}
                    >
                      <span className="shrink-0 font-mono text-xs text-slate-500">{c.letter}.</span>
                      <MathText text={c.choice_text} className="flex-1" />
                      {c.is_correct && (
                        <Check className="inline h-3.5 w-3.5 shrink-0 text-emerald-400" />
                      )}
                    </div>
                    {expl && (
                      <div className="mt-1.5 pl-5 text-xs italic text-slate-400">
                        <MathText text={expl} />
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="mb-4 flex flex-wrap items-start gap-2 rounded border border-emerald-500/40 bg-emerald-500/5 px-3 py-2 text-sm text-emerald-100">
              <span className="text-xs uppercase tracking-wide text-emerald-300/70">
                SPR answer:
              </span>
              <MathText text={question.correct_answer} />
              {question.numeric_tolerance != null && (
                <span className="text-xs text-slate-500">±{question.numeric_tolerance}</span>
              )}
            </div>
          )}

          {/* Right-answer walkthrough */}
          {question.explanation_text && (
            <div className="mb-3 rounded-lg border border-slate-800 bg-slate-950/40 px-3 py-2.5">
              <div className="mb-1 text-xs uppercase tracking-wide text-slate-500">
                Right-answer walkthrough
              </div>
              <MathText
                text={question.explanation_text}
                className="block whitespace-pre-wrap text-sm text-slate-300"
              />
            </div>
          )}

          {/* Hint (R&W and Math) */}
          {question.hint && (
            <div className="mb-3 flex items-start gap-2 rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2.5">
              <Lightbulb className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-400" />
              <div className="flex-1">
                <div className="mb-0.5 text-xs uppercase tracking-wide text-amber-300/70">Hint</div>
                <MathText text={question.hint} className="text-sm text-amber-100/90" />
              </div>
            </div>
          )}

          {/* Desmos strategy (math only — field is null for R&W) */}
          {question.desmos_strategy && (
            <div className="mb-3 flex items-start gap-2 rounded-lg border border-sky-500/20 bg-sky-500/5 px-3 py-2.5">
              <Calculator className="mt-0.5 h-3.5 w-3.5 shrink-0 text-sky-400" />
              <div className="flex-1">
                <div className="mb-0.5 text-xs uppercase tracking-wide text-sky-300/70">
                  Desmos strategy
                </div>
                <MathText text={question.desmos_strategy} className="text-sm text-sky-100/90" />
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Actions (always visible at the bottom) ────── */}
      <div className="px-5 pb-4">
        <div className="flex items-center justify-end gap-2 border-t border-slate-800 pt-3">
          <button
            onClick={onPreview}
            className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-white/5"
          >
            <Eye className="mr-1 inline h-3 w-3" /> Preview
          </button>
          <button
            onClick={onReject}
            disabled={busy}
            className="rounded-lg border border-rose-500/30 px-3 py-1.5 text-xs font-semibold text-rose-300 hover:bg-rose-500/10 disabled:opacity-50"
          >
            <X className="mr-1 inline h-3 w-3" /> Reject
          </button>
          <button
            onClick={() => setPickerOpen((o) => !o)}
            disabled={busy}
            className={cn(
              "rounded-lg px-3 py-1.5 text-xs font-bold disabled:opacity-50",
              pickerOpen
                ? "border border-slate-700 text-slate-300 hover:bg-white/5"
                : "bg-emerald-500 text-white hover:bg-emerald-400"
            )}
          >
            <Check className="mr-1 inline h-3 w-3" /> {pickerOpen ? "Close picker" : "Accept…"}
          </button>
        </div>

        {/* Node picker (auto-pick from concept_slug + typeahead) */}
        {pickerOpen && (
          <NodePicker
            slug={question.concept_slug ?? null}
            busy={busy}
            onAccept={(nodeId) => onAccept(nodeId)}
            onCancel={() => setPickerOpen(false)}
          />
        )}
      </div>
    </article>
  );
}
