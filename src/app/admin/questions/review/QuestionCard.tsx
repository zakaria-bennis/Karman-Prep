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
import { GraderVotesBadge } from "@/components/admin/GraderVotesBadge";
import { NodePicker } from "./NodePicker";

export function QuestionCard({
  question,
  busy,
  expanded,
  selectable,
  selected,
  onToggleSelected,
  onToggleExpanded,
  onAccept,
  onReject,
  onPreview,
}: {
  question: QuizQuestionWithChoices;
  busy: boolean;
  expanded: boolean;
  /** When true, render the bulk-select checkbox in the header. The
   *  Bank tab already has its own "auto-accept all" affordance, so
   *  only the Flagged tab passes selectable=true. */
  selectable?: boolean;
  selected?: boolean;
  onToggleSelected?: () => void;
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
    <article
      className={cn(
        "rounded-xl border bg-surface/60 transition-colors",
        selected ? "border-error/60 bg-error/[0.04]" : "border-bronze"
      )}
    >
      {/* ── Header (always visible) — clicking toggles expansion ── */}
      <div className="flex items-start gap-1 rounded-t-xl px-5 pb-3 pt-4">
        {selectable && (
          <label
            // Stop the surrounding header click from also toggling
            // expansion when the admin is just trying to select.
            onClick={(e) => e.stopPropagation()}
            className="mt-0.5 inline-flex shrink-0 cursor-pointer items-center pr-1"
            aria-label={selected ? "Deselect question" : "Select question for bulk reject"}
          >
            <input
              type="checkbox"
              checked={!!selected}
              onChange={() => onToggleSelected?.()}
              className="h-4 w-4 cursor-pointer accent-error"
            />
          </label>
        )}
        <button
          onClick={onToggleExpanded}
          className="-m-2 flex flex-1 items-start gap-2 rounded-lg p-2 text-left transition-colors hover:bg-surface/[0.02]"
        >
          {expanded ? (
            <ChevronDown className="mt-0.5 h-4 w-4 shrink-0 text-taupe" />
          ) : (
            <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-taupe" />
          )}
          {isFlagged ? (
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
          ) : (
            <BookOpen className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
          )}
          <div className="min-w-0 flex-1">
            {/* Banner line */}
            <div
              className={cn(
                "text-xs font-medium",
                isFlagged ? "text-warning-bright" : "text-gold-bright"
              )}
            >
              {isFlagged
                ? `${question.import_flag_type === "skip" ? "Unsolvable" : "Needs review"} — ${question.import_flag_reason ?? ""}`
                : "In bank — pick a curriculum node to send this question live in Learn."}
            </div>
            {/* Multi-vote grader badge row — shows each LLM's
              independent answer + the overall verdict so the
              admin can spot-check the stored answer without
              expanding the card. Renders for every question;
              shows an "Ungraded" hint when grader_votes is null. */}
            <div className="mt-1.5">
              <GraderVotesBadge
                votes={question.grader_votes}
                storedAnswer={question.correct_answer}
              />
            </div>
            {/* Source PDF + page — prominent on flagged rows so the
              admin can jump to the source PDF and verify the
              figure / question quickly. */}
            {isFlagged && question.source_pdf && (
              <div className="mt-2 inline-flex items-center gap-2 rounded-md border border-bronze bg-surface-raised/70 px-2.5 py-1 text-[12px]">
                <ExternalLink className="h-3.5 w-3.5 shrink-0 text-warning-bright" />
                <span className="font-mono text-ivory">{question.source_pdf}</span>
                {question.source_page != null && (
                  <>
                    <span className="text-taupe">›</span>
                    <span className="font-semibold text-warning-bright">
                      page {question.source_page}
                    </span>
                  </>
                )}
                <span className="text-taupe">·</span>
                <span className="text-taupe">{question.subject === "math" ? "Math" : "R&W"}</span>
              </div>
            )}
            {/* Question stem (truncated when collapsed) */}
            <div className={cn("mt-2 text-sm text-ivory", !expanded && "truncate")}>
              {question.question_text}
            </div>
            {/* Compact meta row */}
            <div className="mt-1 flex flex-wrap items-center gap-3 text-[11px] text-taupe">
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
                  <span className="font-mono text-success">answer {correctChoice.letter}</span>
                </>
              )}
            </div>
          </div>
        </button>
      </div>

      {/* ── Expanded body ─────────────────────────────── */}
      {expanded && (
        <div className="px-5 pb-3 pt-1">
          {question.passage_intro && (
            <p className="mb-2 text-sm italic text-taupe">{question.passage_intro}</p>
          )}
          {question.passage && (
            <div className="mb-3 whitespace-pre-wrap rounded-lg border border-bronze bg-night/60 px-3 py-2.5 font-serif text-sm leading-relaxed text-ivory">
              {question.passage}
            </div>
          )}
          {(question.passage_a || question.passage_b) && (
            <div className="mb-3 grid grid-cols-1 gap-3 md:grid-cols-2">
              {question.passage_a && (
                <div className="whitespace-pre-wrap rounded-lg border border-bronze bg-night/60 px-3 py-2.5 font-serif text-sm text-ivory">
                  <div className="mb-1 text-xs uppercase tracking-wide text-taupe">Text 1</div>
                  {question.passage_a}
                </div>
              )}
              {question.passage_b && (
                <div className="whitespace-pre-wrap rounded-lg border border-bronze bg-night/60 px-3 py-2.5 font-serif text-sm text-ivory">
                  <div className="mb-1 text-xs uppercase tracking-wide text-taupe">Text 2</div>
                  {question.passage_b}
                </div>
              )}
            </div>
          )}

          {/* Question text (full) + image */}
          <MathText
            text={question.question_text}
            className="mb-3 block whitespace-pre-wrap font-medium text-ivory"
          />
          {question.image_url && (
            <figure className="mb-3 inline-block max-w-full rounded-xl border border-bronze/50 bg-surface p-2 shadow-md shadow-black/40">
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
                      c.is_correct ? "border-success/40 bg-success/5" : "border-bronze bg-night/40"
                    )}
                  >
                    <div
                      className={cn(
                        "flex items-start gap-2",
                        c.is_correct ? "text-success-bright" : "text-ivory"
                      )}
                    >
                      <span className="shrink-0 font-mono text-xs text-taupe">{c.letter}.</span>
                      <MathText text={c.choice_text} className="flex-1" />
                      {c.is_correct && (
                        <Check className="inline h-3.5 w-3.5 shrink-0 text-success" />
                      )}
                    </div>
                    {expl && (
                      <div className="mt-1.5 pl-5 text-xs italic text-taupe">
                        <MathText text={expl} />
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="mb-4 flex flex-wrap items-start gap-2 rounded border border-success/40 bg-success/5 px-3 py-2 text-sm text-success-bright">
              <span className="text-xs uppercase tracking-wide text-success-bright/70">
                SPR answer:
              </span>
              <MathText text={question.correct_answer} />
              {question.numeric_tolerance != null && (
                <span className="text-xs text-taupe">±{question.numeric_tolerance}</span>
              )}
            </div>
          )}

          {/* Right-answer walkthrough */}
          {question.explanation_text && (
            <div className="mb-3 rounded-lg border border-bronze bg-night/40 px-3 py-2.5">
              <div className="mb-1 text-xs uppercase tracking-wide text-taupe">
                Right-answer walkthrough
              </div>
              <MathText
                text={question.explanation_text}
                className="block whitespace-pre-wrap text-sm text-ivory"
              />
            </div>
          )}

          {/* Hint (R&W and Math) */}
          {question.hint && (
            <div className="mb-3 flex items-start gap-2 rounded-lg border border-warning/20 bg-warning/5 px-3 py-2.5">
              <Lightbulb className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning" />
              <div className="flex-1">
                <div className="mb-0.5 text-xs uppercase tracking-wide text-warning-bright/70">
                  Hint
                </div>
                <MathText text={question.hint} className="text-sm text-warning-bright/90" />
              </div>
            </div>
          )}

          {/* Desmos strategy (math only — field is null for R&W) */}
          {question.desmos_strategy && (
            <div className="mb-3 flex items-start gap-2 rounded-lg border border-info/20 bg-info/5 px-3 py-2.5">
              <Calculator className="mt-0.5 h-3.5 w-3.5 shrink-0 text-info" />
              <div className="flex-1">
                <div className="mb-0.5 text-xs uppercase tracking-wide text-info-bright/70">
                  Desmos strategy
                </div>
                <MathText text={question.desmos_strategy} className="text-sm text-info-bright/90" />
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Actions (always visible at the bottom) ────── */}
      <div className="px-5 pb-4">
        <div className="flex items-center justify-end gap-2 border-t border-bronze pt-3">
          <button
            onClick={onPreview}
            className="rounded-lg border border-bronze px-3 py-1.5 text-xs font-semibold text-ivory hover:bg-surface/5"
          >
            <Eye className="mr-1 inline h-3 w-3" /> Preview
          </button>
          <button
            onClick={onReject}
            disabled={busy}
            className="rounded-lg border border-error/30 px-3 py-1.5 text-xs font-semibold text-error-bright hover:bg-error/10 disabled:opacity-50"
          >
            <X className="mr-1 inline h-3 w-3" /> Reject
          </button>
          <button
            onClick={() => setPickerOpen((o) => !o)}
            disabled={busy}
            className={cn(
              "rounded-lg px-3 py-1.5 text-xs font-bold disabled:opacity-50",
              pickerOpen
                ? "border border-bronze text-ivory hover:bg-surface/5"
                : "bg-success text-night hover:bg-success-bright"
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
