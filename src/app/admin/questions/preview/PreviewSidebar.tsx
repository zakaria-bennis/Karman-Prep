"use client";

// ============================================================
// PreviewSidebar — left rail of the preview shell.
//
//   · Scrollable list of every question matching the active
//     filters, with checkbox per row for bulk operations.
//   · Click a row → set as the current preview.
//   · "Select all visible" checkbox in the header.
//   · Bulk-action bar appears at the bottom when N > 0
//     selected (Approve / Reject buttons + Clear).
//
// Status badges per row: needs_review (amber), has-figure
// (slate), bank-only / live (subtle). Compact text density
// — admins are scanning a few hundred rows, not reading them.
// ============================================================

import { useMemo } from "react";
import { AlertTriangle, ImageIcon, Loader2, CheckCheck, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { QuizQuestionWithChoices } from "@/types/quiz";

interface Props {
  questions: QuizQuestionWithChoices[];
  activeId: string | null;
  selectedIds: Set<string>;
  bulkPending: { approving: boolean; rejecting: boolean };
  onSelectQuestion: (id: string) => void;
  onToggleSelected: (id: string) => void;
  onToggleSelectAll: () => void;
  onClearSelection: () => void;
  onBulkApprove: () => void;
  onBulkReject: () => void;
}

export function PreviewSidebar({
  questions,
  activeId,
  selectedIds,
  bulkPending,
  onSelectQuestion,
  onToggleSelected,
  onToggleSelectAll,
  onClearSelection,
  onBulkApprove,
  onBulkReject,
}: Props) {
  const allSelected = useMemo(
    () => questions.length > 0 && questions.every((q) => selectedIds.has(q.id)),
    [questions, selectedIds]
  );
  const selectedCount = selectedIds.size;

  return (
    <aside className="flex h-full flex-col rounded-xl border border-slate-800 bg-slate-900/30">
      {/* ── Header: select-all + count ────────────────────── */}
      <header className="flex items-center gap-2 border-b border-slate-800 px-3 py-2 text-xs">
        <label className="inline-flex cursor-pointer items-center gap-1.5 text-slate-400 hover:text-slate-200">
          <input
            type="checkbox"
            checked={allSelected}
            onChange={onToggleSelectAll}
            className="h-3.5 w-3.5 cursor-pointer accent-indigo-500"
            aria-label="Select all visible questions"
          />
          {selectedCount > 0 ? (
            <span className="text-slate-200">
              {selectedCount} selected
              <span className="text-slate-500"> / {questions.length}</span>
            </span>
          ) : (
            <span>{questions.length} visible</span>
          )}
        </label>
        {selectedCount > 0 && (
          <button
            onClick={onClearSelection}
            className="ml-auto text-slate-400 hover:text-slate-200"
            disabled={bulkPending.approving || bulkPending.rejecting}
          >
            Clear
          </button>
        )}
      </header>

      {/* ── Scrollable list ───────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">
        {questions.length === 0 ? (
          <div className="p-6 text-xs italic text-slate-400">No questions match these filters.</div>
        ) : (
          <ul className="divide-y divide-slate-800">
            {questions.map((q, i) => (
              <SidebarRow
                key={q.id}
                question={q}
                index={i}
                active={q.id === activeId}
                selected={selectedIds.has(q.id)}
                onClick={() => onSelectQuestion(q.id)}
                onToggleSelected={() => onToggleSelected(q.id)}
              />
            ))}
          </ul>
        )}
      </div>

      {/* ── Bulk action bar (only when something selected) ── */}
      {selectedCount > 0 && (
        <div className="flex flex-col gap-2 border-t border-slate-800 bg-slate-900/60 p-2">
          <div className="text-[10px] uppercase tracking-wider text-slate-500">
            Bulk · {selectedCount}
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={onBulkApprove}
              disabled={bulkPending.approving || bulkPending.rejecting}
              className={cn(
                "inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-bold disabled:opacity-50",
                "bg-emerald-500 text-white hover:bg-emerald-400"
              )}
            >
              {bulkPending.approving ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <CheckCheck className="h-3 w-3" />
              )}
              Approve
            </button>
            <button
              onClick={onBulkReject}
              disabled={bulkPending.approving || bulkPending.rejecting}
              className={cn(
                "inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-bold disabled:opacity-50",
                "bg-rose-600 text-white hover:bg-rose-500"
              )}
            >
              {bulkPending.rejecting ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Trash2 className="h-3 w-3" />
              )}
              Reject
            </button>
          </div>
        </div>
      )}
    </aside>
  );
}

function SidebarRow({
  question,
  index,
  active,
  selected,
  onClick,
  onToggleSelected,
}: {
  question: QuizQuestionWithChoices;
  index: number;
  active: boolean;
  selected: boolean;
  onClick: () => void;
  onToggleSelected: () => void;
}) {
  const q = question;
  return (
    <li className={cn("flex items-start gap-2 px-2.5 py-2", active && "bg-slate-800/70")}>
      {/* Checkbox sits OUTSIDE the click-to-select button so toggling
          a checkbox doesn't move the preview pane to that row. */}
      <input
        type="checkbox"
        checked={selected}
        onChange={onToggleSelected}
        onClick={(e) => e.stopPropagation()}
        className="mt-1.5 h-3.5 w-3.5 shrink-0 cursor-pointer accent-indigo-500"
        aria-label={`Select question ${index + 1}`}
      />
      <button
        onClick={onClick}
        className="min-w-0 flex-1 text-left hover:bg-slate-800/40 focus:outline-none"
      >
        <div className="flex items-start gap-2">
          <span className="mt-0.5 w-6 shrink-0 text-right font-mono text-[10px] tabular-nums text-slate-500">
            {index + 1}
          </span>
          <div className="min-w-0 flex-1">
            <div className="line-clamp-2 text-[12px] leading-snug text-slate-200">
              {q.question_text || "(no question text)"}
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px] text-slate-400">
              <Badge tone="slate">{q.subject}</Badge>
              <Badge tone="slate">L{q.difficulty_level ?? "—"}</Badge>
              {q.image_url && (
                <span title="Has figure" className="inline-flex items-center text-slate-400">
                  <ImageIcon className="h-3 w-3" />
                </span>
              )}
              {q.import_status === "needs_review" && (
                <span
                  title="Flagged for review"
                  className="inline-flex items-center text-amber-400"
                >
                  <AlertTriangle className="h-3 w-3" />
                </span>
              )}
              <span className="max-w-[7rem] truncate text-slate-500">
                {q.concept_slug ?? "(no slug)"}
              </span>
            </div>
          </div>
        </div>
      </button>
    </li>
  );
}

function Badge({ tone, children }: { tone: "slate"; children: React.ReactNode }) {
  return (
    <span
      className={cn("rounded px-1.5 font-mono", tone === "slate" && "bg-slate-800 text-slate-300")}
    >
      {children}
    </span>
  );
}
