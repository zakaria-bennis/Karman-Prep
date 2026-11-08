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
import QuestionTable from "@/components/learn/QuestionTable";
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
        "rounded-xl border bg-[color-mix(in_srgb,var(--card)_60%,transparent)] transition-colors",
        selected
          ? "border-[color-mix(in_srgb,var(--late)_60%,transparent)] bg-[color-mix(in_srgb,var(--late)_4%,transparent)]"
          : "border-[color:var(--line)]"
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
              className="h-4 w-4 cursor-pointer accent-[color:var(--late)]"
            />
          </label>
        )}
        <button
          onClick={onToggleExpanded}
          className="-m-2 flex flex-1 items-start gap-2 rounded-lg p-2 text-left transition-colors hover:bg-[color-mix(in_srgb,var(--card)_2%,transparent)]"
        >
          {expanded ? (
            <ChevronDown className="mt-0.5 h-4 w-4 shrink-0 text-[color:var(--mute)]" />
          ) : (
            <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-[color:var(--mute)]" />
          )}
          {isFlagged ? (
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[color:var(--warn)]" />
          ) : (
            <BookOpen className="mt-0.5 h-4 w-4 shrink-0 text-[color:var(--accent-text)]" />
          )}
          <div className="min-w-0 flex-1">
            {/* Banner line */}
            <div
              className={cn(
                "text-xs font-medium",
                isFlagged ? "text-[color:var(--warn)]" : "text-[color:var(--accent-text)]"
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
              <div className="mt-2 inline-flex items-center gap-2 rounded-md border border-[color:var(--line)] bg-[color-mix(in_srgb,var(--raised)_70%,transparent)] px-2.5 py-1 text-[12px]">
                <ExternalLink className="h-3.5 w-3.5 shrink-0 text-[color:var(--warn)]" />
                <span className="font-mono text-[color:var(--ink)]">{question.source_pdf}</span>
                {question.source_page != null && (
                  <>
                    <span className="text-[color:var(--mute)]">›</span>
                    <span className="font-semibold text-[color:var(--warn)]">
                      page {question.source_page}
                    </span>
                  </>
                )}
                <span className="text-[color:var(--mute)]">·</span>
                <span className="text-[color:var(--mute)]">
                  {question.subject === "math" ? "Math" : "R&W"}
                </span>
              </div>
            )}
            {/* Question stem (truncated when collapsed) */}
            <div className={cn("mt-2 text-sm text-[color:var(--ink)]", !expanded && "truncate")}>
              {question.question_text}
            </div>
            {/* Compact meta row */}
            <div className="mt-1 flex flex-wrap items-center gap-3 text-[11px] text-[color:var(--mute)]">
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
                  <span className="font-mono text-[color:var(--good)]">
                    answer {correctChoice.letter}
                  </span>
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
            <p className="mb-2 text-sm italic text-[color:var(--mute)]">{question.passage_intro}</p>
          )}
          {question.passage && (
            <div className="mb-3 whitespace-pre-wrap rounded-lg border border-[color:var(--line)] bg-[color-mix(in_srgb,var(--sunk)_60%,transparent)] px-3 py-2.5 font-serif text-sm leading-relaxed text-[color:var(--ink)]">
              {question.passage}
            </div>
          )}
          {(question.passage_a || question.passage_b) && (
            <div className="mb-3 grid grid-cols-1 gap-3 md:grid-cols-2">
              {question.passage_a && (
                <div className="whitespace-pre-wrap rounded-lg border border-[color:var(--line)] bg-[color-mix(in_srgb,var(--sunk)_60%,transparent)] px-3 py-2.5 font-serif text-sm text-[color:var(--ink)]">
                  <div className="mb-1 text-xs uppercase tracking-wide text-[color:var(--mute)]">
                    Text 1
                  </div>
                  {question.passage_a}
                </div>
              )}
              {question.passage_b && (
                <div className="whitespace-pre-wrap rounded-lg border border-[color:var(--line)] bg-[color-mix(in_srgb,var(--sunk)_60%,transparent)] px-3 py-2.5 font-serif text-sm text-[color:var(--ink)]">
                  <div className="mb-1 text-xs uppercase tracking-wide text-[color:var(--mute)]">
                    Text 2
                  </div>
                  {question.passage_b}
                </div>
              )}
            </div>
          )}

          {/* Question text (full) + image */}
          <MathText
            text={question.question_text}
            className="mb-3 block whitespace-pre-wrap font-medium text-[color:var(--ink)]"
          />
          {question.image_url && (
            <figure className="mb-3 inline-block max-w-full rounded-xl border border-[color-mix(in_srgb,var(--line)_50%,transparent)] bg-[color:var(--card)] p-2 shadow-md shadow-black/40">
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
                        ? "border-[color-mix(in_srgb,var(--good)_40%,transparent)] bg-[color-mix(in_srgb,var(--good)_5%,transparent)]"
                        : "border-[color:var(--line)] bg-[color-mix(in_srgb,var(--sunk)_40%,transparent)]"
                    )}
                  >
                    <div
                      className={cn(
                        "flex items-start gap-2",
                        c.is_correct ? "text-[color:var(--good)]" : "text-[color:var(--ink)]"
                      )}
                    >
                      <span className="shrink-0 font-mono text-xs text-[color:var(--mute)]">
                        {c.letter}.
                      </span>
                      <div className="min-w-0 flex-1">
                        {c.choice_table_data ? (
                          <QuestionTable
                            data={c.choice_table_data}
                            ariaLabel={`Choice ${c.letter} data table`}
                            className="my-1 max-w-full"
                          />
                        ) : (
                          <MathText text={c.choice_text} />
                        )}
                      </div>
                      {c.is_correct && (
                        <Check className="inline h-3.5 w-3.5 shrink-0 text-[color:var(--good)]" />
                      )}
                    </div>
                    {expl && (
                      <div className="mt-1.5 pl-5 text-xs italic text-[color:var(--mute)]">
                        <MathText text={expl} />
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="mb-4 flex flex-wrap items-start gap-2 rounded border border-[color-mix(in_srgb,var(--good)_40%,transparent)] bg-[color-mix(in_srgb,var(--good)_5%,transparent)] px-3 py-2 text-sm text-[color:var(--good)]">
              <span className="text-xs uppercase tracking-wide text-[color-mix(in_srgb,var(--good)_70%,transparent)]">
                SPR answer:
              </span>
              <MathText text={question.correct_answer} />
              {question.numeric_tolerance != null && (
                <span className="text-xs text-[color:var(--mute)]">
                  ±{question.numeric_tolerance}
                </span>
              )}
            </div>
          )}

          {/* Right-answer walkthrough */}
          {question.explanation_text && (
            <div className="mb-3 rounded-lg border border-[color:var(--line)] bg-[color-mix(in_srgb,var(--sunk)_40%,transparent)] px-3 py-2.5">
              <div className="mb-1 text-xs uppercase tracking-wide text-[color:var(--mute)]">
                Right-answer walkthrough
              </div>
              <MathText
                text={question.explanation_text}
                className="block whitespace-pre-wrap text-sm text-[color:var(--ink)]"
              />
            </div>
          )}

          {/* Hint (R&W and Math) */}
          {question.hint && (
            <div className="mb-3 flex items-start gap-2 rounded-lg border border-[color-mix(in_srgb,var(--warn)_20%,transparent)] bg-[color-mix(in_srgb,var(--warn)_5%,transparent)] px-3 py-2.5">
              <Lightbulb className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[color:var(--warn)]" />
              <div className="flex-1">
                <div className="mb-0.5 text-xs uppercase tracking-wide text-[color-mix(in_srgb,var(--warn)_70%,transparent)]">
                  Hint
                </div>
                <MathText
                  text={question.hint}
                  className="text-sm text-[color-mix(in_srgb,var(--warn)_90%,transparent)]"
                />
              </div>
            </div>
          )}

          {/* Desmos strategy (math only — field is null for R&W) */}
          {question.desmos_strategy && (
            <div className="mb-3 flex items-start gap-2 rounded-lg border border-[color-mix(in_srgb,var(--info)_20%,transparent)] bg-[color-mix(in_srgb,var(--info)_5%,transparent)] px-3 py-2.5">
              <Calculator className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[color:var(--info)]" />
              <div className="flex-1">
                <div className="mb-0.5 text-xs uppercase tracking-wide text-[color-mix(in_srgb,var(--info)_70%,transparent)]">
                  Desmos strategy
                </div>
                <MathText
                  text={question.desmos_strategy}
                  className="text-sm text-[color-mix(in_srgb,var(--info)_90%,transparent)]"
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Actions (always visible at the bottom) ────── */}
      <div className="px-5 pb-4">
        <div className="flex items-center justify-end gap-2 border-t border-[color:var(--line)] pt-3">
          <button
            onClick={onPreview}
            className="rounded-lg border border-[color:var(--line)] px-3 py-1.5 text-xs font-semibold text-[color:var(--ink)] hover:bg-[color-mix(in_srgb,var(--card)_5%,transparent)]"
          >
            <Eye className="mr-1 inline h-3 w-3" /> Preview
          </button>
          <button
            onClick={onReject}
            disabled={busy}
            className="rounded-lg border border-[color-mix(in_srgb,var(--late)_30%,transparent)] px-3 py-1.5 text-xs font-semibold text-[color:var(--late)] hover:bg-[color-mix(in_srgb,var(--late)_10%,transparent)] disabled:opacity-50"
          >
            <X className="mr-1 inline h-3 w-3" /> Reject
          </button>
          <button
            onClick={() => setPickerOpen((o) => !o)}
            disabled={busy}
            className={cn(
              "rounded-lg px-3 py-1.5 text-xs font-bold disabled:opacity-50",
              pickerOpen
                ? "border border-[color:var(--line)] text-[color:var(--ink)] hover:bg-[color-mix(in_srgb,var(--card)_5%,transparent)]"
                : "bg-[color:var(--good)] text-[color:var(--accent-ink)] hover:bg-[color:var(--good)]"
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
