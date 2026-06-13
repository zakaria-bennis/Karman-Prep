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
      <div className="rounded-xl border border-dashed border-bronze bg-surface/40 p-12 text-center">
        <Check className="mx-auto mb-3 h-8 w-8 text-success" />
        <p className="text-sm text-taupe">
          No open flags. Every flagged question has been reviewed.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-taupe">
        {rows.length} unresolved flag{rows.length !== 1 ? "s" : ""}.
      </p>
      {rows.map((flag) => {
        if (!flag.question) return null;
        const q = flag.question;
        const diffStyle = DIFFICULTY_COLORS[q.difficulty];
        return (
          <article key={flag.id} className="rounded-xl border border-error/30 bg-error/5 p-5">
            <header className="mb-3 flex items-start gap-3">
              <Flag className="mt-0.5 h-4 w-4 shrink-0 text-error" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2 text-xs text-taupe">
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
                  <p className="mt-2 text-sm italic text-error dark:text-error-bright">
                    &ldquo;{flag.flag_note}&rdquo;
                  </p>
                )}
              </div>
              <div className="flex shrink-0 gap-1">
                <Link
                  href={`/admin/curriculum/${flag.node_id}`}
                  className="rounded p-2 text-taupe hover:bg-surface dark:hover:bg-surface-raised"
                  title="Open node"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </Link>
                <button
                  onClick={() => setEditingId(editingId === flag.id ? null : flag.id)}
                  className="rounded p-2 text-taupe hover:bg-surface dark:hover:bg-surface-raised"
                  title="Edit question"
                >
                  <Edit3 className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => resolve(flag.id)}
                  className="rounded bg-success px-3 py-1.5 text-xs font-semibold text-night hover:bg-success-bright"
                >
                  Mark resolved
                </button>
              </div>
            </header>

            <div className="rounded border border-bronze bg-surface p-3 dark:border-bronze dark:bg-surface">
              <p className="mb-2 whitespace-pre-wrap text-sm font-medium text-ivory dark:text-ivory">
                {q.question_text}
              </p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {q.answer_choices.map((c) => (
                  <div
                    key={c.letter}
                    className={cn(
                      "rounded border px-2 py-1",
                      c.is_correct
                        ? "border-success/40 bg-success/10 dark:bg-success/20"
                        : "border-bronze dark:border-bronze"
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
    <div className="mt-3 space-y-3 rounded border border-info/40 bg-info/40 p-3 dark:border-info/40 dark:bg-info/10">
      <div>
        <label className="text-[11px] font-semibold uppercase tracking-wide text-taupe">
          Question text
        </label>
        <textarea
          value={qText}
          onChange={(e) => setQText(e.target.value)}
          rows={3}
          className="mt-1 w-full rounded border border-bronze px-2 py-1.5 text-sm dark:border-bronze dark:bg-surface-raised"
        />
      </div>
      <div>
        <label className="text-[11px] font-semibold uppercase tracking-wide text-taupe">
          Explanation
        </label>
        <textarea
          value={exp}
          onChange={(e) => setExp(e.target.value)}
          rows={2}
          className="mt-1 w-full rounded border border-bronze px-2 py-1.5 text-sm dark:border-bronze dark:bg-surface-raised"
        />
      </div>
      <div className="flex justify-end gap-2">
        <button
          onClick={onCancel}
          className="px-3 py-1.5 text-xs font-semibold text-taupe hover:text-ivory dark:hover:text-ivory"
        >
          Cancel
        </button>
        <button
          onClick={() => onSave({ question_text: qText, explanation_text: exp })}
          className="rounded bg-info px-4 py-1.5 text-xs font-bold text-ivory hover:bg-info-bright"
        >
          Save edits
        </button>
      </div>
    </div>
  );
}
