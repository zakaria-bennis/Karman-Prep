"use client";

// ============================================================
// FlagReviewList — all unresolved flagged questions across the
// catalog, with resolve + edit actions inline.
// ============================================================

import { useState } from "react";
import Link from "next/link";
import { Check, ExternalLink, Flag, Edit3 } from "lucide-react";
import type { FlaggedQuestion, QuizQuestionWithChoices } from "@/types/quiz";
import { DIFFICULTY_COLORS } from "@/types/quiz";
import { actionResolveFlaggedQuestion, actionUpdateQuestion } from "@/app/admin/actions";
import { cn } from "@/lib/utils";

type FlagRow = FlaggedQuestion & { question: QuizQuestionWithChoices | null };

interface Props {
  flagged: FlagRow[];
}

export default function FlagReviewList({ flagged }: Props) {
  const [rows, setRows] = useState<FlagRow[]>(flagged);
  const [editingId, setEditingId] = useState<string | null>(null);

  async function resolve(flagId: string) {
    try {
      await actionResolveFlaggedQuestion(flagId);
      setRows((rs) => rs.filter((r) => r.id !== flagId));
    } catch (err) {
      console.error(err);
    }
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-700 bg-slate-900/40 p-12 text-center">
        <Check className="mx-auto mb-3 h-8 w-8 text-emerald-400" />
        <p className="text-sm text-slate-400">
          No open flags. Every flagged question has been reviewed.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-400">
        {rows.length} unresolved flag{rows.length !== 1 ? "s" : ""}.
      </p>
      {rows.map((flag) => {
        if (!flag.question) return null;
        const q = flag.question;
        const diffStyle = DIFFICULTY_COLORS[q.difficulty];
        return (
          <article key={flag.id} className="rounded-xl border border-rose-500/30 bg-rose-500/5 p-5">
            <header className="mb-3 flex items-start gap-3">
              <Flag className="mt-0.5 h-4 w-4 shrink-0 text-rose-500" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                  <code>{flag.node_id}</code>
                  <span>•</span>
                  <span>
                    Flagged by <code>{flag.student_id.slice(0, 12)}…</code>
                  </span>
                  <span>•</span>
                  <span>{new Date(flag.created_at).toLocaleString()}</span>
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 font-semibold",
                      diffStyle.bg,
                      diffStyle.text
                    )}
                  >
                    {q.difficulty}
                  </span>
                </div>
                {flag.flag_note && (
                  <p className="mt-2 text-sm italic text-rose-700 dark:text-rose-300">
                    &ldquo;{flag.flag_note}&rdquo;
                  </p>
                )}
              </div>
              <div className="flex shrink-0 gap-1">
                <Link
                  href={`/admin/curriculum/${flag.node_id}`}
                  className="rounded p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                  title="Open node"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </Link>
                <button
                  onClick={() => setEditingId(editingId === flag.id ? null : flag.id)}
                  className="rounded p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                  title="Edit question"
                >
                  <Edit3 className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => resolve(flag.id)}
                  className="rounded bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
                >
                  Mark resolved
                </button>
              </div>
            </header>

            <div className="rounded border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
              <p className="mb-2 whitespace-pre-wrap text-sm font-medium text-slate-900 dark:text-white">
                {q.question_text}
              </p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {q.answer_choices.map((c) => (
                  <div
                    key={c.letter}
                    className={cn(
                      "rounded border px-2 py-1",
                      c.is_correct
                        ? "border-emerald-400 bg-emerald-50 dark:bg-emerald-900/20"
                        : "border-slate-200 dark:border-slate-800"
                    )}
                  >
                    <strong>{c.letter}.</strong> {c.choice_text}
                  </div>
                ))}
              </div>
            </div>

            {editingId === flag.id && (
              <InlineEditor
                question={q}
                onSave={async (patch) => {
                  try {
                    await actionUpdateQuestion(q.id, patch, q.node_id ?? "");
                    setEditingId(null);
                  } catch (err) {
                    console.error(err);
                  }
                }}
                onCancel={() => setEditingId(null)}
              />
            )}
          </article>
        );
      })}
    </div>
  );
}

function InlineEditor({
  question,
  onSave,
  onCancel,
}: {
  question: QuizQuestionWithChoices;
  onSave: (patch: { question_text: string; explanation_text: string }) => Promise<void>;
  onCancel: () => void;
}) {
  const [qText, setQText] = useState(question.question_text);
  const [exp, setExp] = useState(question.explanation_text);
  return (
    <div className="mt-3 space-y-3 rounded border border-blue-200 bg-blue-50/40 p-3 dark:border-blue-900 dark:bg-blue-900/10">
      <div>
        <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
          Question text
        </label>
        <textarea
          value={qText}
          onChange={(e) => setQText(e.target.value)}
          rows={3}
          className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800"
        />
      </div>
      <div>
        <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
          Explanation
        </label>
        <textarea
          value={exp}
          onChange={(e) => setExp(e.target.value)}
          rows={2}
          className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800"
        />
      </div>
      <div className="flex justify-end gap-2">
        <button
          onClick={onCancel}
          className="px-3 py-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white"
        >
          Cancel
        </button>
        <button
          onClick={() => onSave({ question_text: qText, explanation_text: exp })}
          className="rounded bg-blue-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-blue-700"
        >
          Save edits
        </button>
      </div>
    </div>
  );
}
