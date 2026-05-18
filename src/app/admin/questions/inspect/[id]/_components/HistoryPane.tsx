"use client";

// ============================================================
// HistoryPane — chronological edit history for one question, with
// a Restore button per entry.
//
// Reads from question_history (snapshots taken by
// actionUpdateInspectedQuestion + actionRestoreQuestionVersion).
// Each entry shows: when, by whom, source channel, which fields
// changed, and (collapsible) the diff between before/after.
//
// Restore button calls actionRestoreQuestionVersion which writes a
// NEW history entry capturing the restore — so the restore itself
// is auditable + reversible.
// ============================================================

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Clock, RotateCcw, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { actionRestoreQuestionVersion } from "@/app/admin/inspector-edit-actions";
import type { QuestionHistoryEntry } from "@/lib/supabase/queries/quiz/history";

interface Props {
  questionId: string;
  history: QuestionHistoryEntry[];
}

export default function HistoryPane({ questionId, history }: Props) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{
    kind: "success" | "error";
    message: string;
  } | null>(null);

  function toggle(id: string) {
    setExpanded((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function restore(entry: QuestionHistoryEntry) {
    if (
      !confirm(
        `Restore this question to its state before this edit?\n\nFields that will revert:\n${entry.changed_fields.join(", ")}\n\nThis action itself is reversible — a new history entry will be created.`
      )
    )
      return;
    setRestoringId(entry.id);
    setFeedback(null);
    startTransition(async () => {
      try {
        await actionRestoreQuestionVersion({ questionId, historyId: entry.id });
        setFeedback({
          kind: "success",
          message: `Restored to pre-${new Date(entry.created_at).toLocaleString()} state.`,
        });
        router.refresh();
      } catch (err) {
        setFeedback({
          kind: "error",
          message: `Restore failed: ${err instanceof Error ? err.message : String(err)}`,
        });
      } finally {
        setRestoringId(null);
      }
    });
  }

  if (history.length === 0) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-5">
        <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-200">
          <Clock className="h-4 w-4 text-slate-400" /> Edit history
        </div>
        <p className="text-xs text-slate-500">
          No edits yet. Once you save changes in edit mode, snapshots appear here with a one-click
          Restore.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-5">
      <div className="mb-3 flex items-center justify-between border-b border-slate-800 pb-2">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-200">
          <Clock className="h-4 w-4 text-slate-400" /> Edit history
        </div>
        <span className="text-[10px] uppercase tracking-wider text-slate-500">
          {history.length} entr{history.length === 1 ? "y" : "ies"}
        </span>
      </div>

      {feedback && (
        <div
          className={cn(
            "mb-3 rounded-lg border px-3 py-2 text-xs",
            feedback.kind === "success"
              ? "border-emerald-500/40 bg-emerald-500/[0.06] text-emerald-200"
              : "border-rose-500/40 bg-rose-500/[0.06] text-rose-200"
          )}
        >
          {feedback.message}
        </div>
      )}

      <ol className="space-y-2">
        {history.map((entry) => {
          const isExpanded = expanded.has(entry.id);
          return (
            <li
              key={entry.id}
              className="rounded-lg border border-slate-800 bg-slate-950/40 px-3 py-2 text-xs"
            >
              <div className="flex items-start gap-2">
                <button
                  onClick={() => toggle(entry.id)}
                  className="mt-0.5 shrink-0 rounded p-0.5 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                  aria-label={isExpanded ? "Collapse details" : "Expand details"}
                >
                  {isExpanded ? (
                    <ChevronUp className="h-3.5 w-3.5" />
                  ) : (
                    <ChevronDown className="h-3.5 w-3.5" />
                  )}
                </button>
                <div className="flex-1">
                  <div className="text-slate-200">
                    {new Date(entry.created_at).toLocaleString()}{" "}
                    <span className="text-slate-500">·</span>{" "}
                    <span className="text-slate-400">{entry.edit_source}</span>
                  </div>
                  <div className="mt-0.5 text-slate-500">
                    Changed:{" "}
                    {entry.changed_fields.length > 0 ? (
                      <code className="text-slate-300">{entry.changed_fields.join(", ")}</code>
                    ) : (
                      <span className="italic">no fields</span>
                    )}
                  </div>
                  {entry.edit_note && (
                    <div className="mt-0.5 italic text-slate-400">{entry.edit_note}</div>
                  )}
                </div>
                <button
                  onClick={() => restore(entry)}
                  disabled={restoringId !== null}
                  title="Restore to this state"
                  className="inline-flex items-center gap-1 rounded-md border border-slate-700 px-2 py-1 text-[10px] font-semibold text-slate-300 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {restoringId === entry.id ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <RotateCcw className="h-3 w-3" />
                  )}
                  Restore
                </button>
              </div>

              {isExpanded && (
                <div className="mt-2 space-y-2 border-t border-slate-800 pt-2">
                  {entry.changed_fields.map((field) => {
                    const beforeVal = formatValue(entry.before_state[field]);
                    const afterVal = formatValue(entry.after_state[field]);
                    return (
                      <div key={field} className="rounded bg-slate-950/60 p-2">
                        <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                          {field}
                        </div>
                        <div className="grid grid-cols-2 gap-2 font-mono text-[10px]">
                          <div className="rounded border border-rose-500/20 bg-rose-500/[0.04] p-1.5 text-rose-200">
                            <div className="mb-1 text-[9px] uppercase opacity-60">before</div>
                            <div className="line-clamp-4 whitespace-pre-wrap break-words">
                              {beforeVal}
                            </div>
                          </div>
                          <div className="rounded border border-emerald-500/20 bg-emerald-500/[0.04] p-1.5 text-emerald-200">
                            <div className="mb-1 text-[9px] uppercase opacity-60">after</div>
                            <div className="line-clamp-4 whitespace-pre-wrap break-words">
                              {afterVal}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function formatValue(v: unknown): string {
  if (v == null) return "(empty)";
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  return JSON.stringify(v, null, 2);
}
