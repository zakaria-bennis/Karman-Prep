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
      <div className="rounded-xl border border-dashed border-[color:var(--line)] bg-[color-mix(in_srgb,var(--card)_40%,transparent)] p-12 text-center">
        <Check className="mx-auto mb-3 h-8 w-8 text-[color:var(--good)]" />
        <p className="text-sm text-[color:var(--mute)]">
          No open flags. Every flagged question has been reviewed.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-[color:var(--mute)]">
        {rows.length} unresolved flag{rows.length !== 1 ? "s" : ""}.
      </p>
      {rows.map((flag) => {
        if (!flag.question) return null;
        const q = flag.question;
        const diffStyle = DIFFICULTY_COLORS[q.difficulty];
        return (
          <article
            key={flag.id}
            className="rounded-xl border border-[color-mix(in_srgb,var(--late)_30%,transparent)] bg-[color-mix(in_srgb,var(--late)_5%,transparent)] p-5"
          >
            <header className="mb-3 flex items-start gap-3">
              <Flag className="mt-0.5 h-4 w-4 shrink-0 text-[color:var(--late)]" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2 text-xs text-[color:var(--mute)]">
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
                  <p className="mt-2 text-sm italic text-[color:var(--late)] dark:text-[color:var(--late)]">
                    &ldquo;{flag.flag_note}&rdquo;
                  </p>
                )}
              </div>
              <div className="flex shrink-0 gap-1">
                <Link
                  href={`/admin/curriculum/${flag.node_id}`}
                  className="rounded p-2 text-[color:var(--mute)] hover:bg-[color:var(--card)] dark:hover:bg-[color:var(--raised)]"
                  title="Open node"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </Link>
                <button
                  onClick={() => setEditingId(editingId === flag.id ? null : flag.id)}
                  className="rounded p-2 text-[color:var(--mute)] hover:bg-[color:var(--card)] dark:hover:bg-[color:var(--raised)]"
                  title="Edit question"
                >
                  <Edit3 className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => resolve(flag.id)}
                  className="rounded bg-[color:var(--good)] px-3 py-1.5 text-xs font-semibold text-[color:var(--accent-ink)] hover:bg-[color:var(--good)]"
                >
                  Mark resolved
                </button>
              </div>
            </header>

            <div className="rounded border border-[color:var(--line)] bg-[color:var(--card)] p-3 dark:border-[color:var(--line)] dark:bg-[color:var(--card)]">
              <p className="mb-2 whitespace-pre-wrap text-sm font-medium text-[color:var(--ink)] dark:text-[color:var(--ink)]">
                {q.question_text}
              </p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {q.answer_choices.map((c) => (
                  <div
                    key={c.letter}
                    className={cn(
                      "rounded border px-2 py-1",
                      c.is_correct
                        ? "border-[color-mix(in_srgb,var(--good)_40%,transparent)] bg-[color-mix(in_srgb,var(--good)_10%,transparent)] dark:bg-[color-mix(in_srgb,var(--good)_20%,transparent)]"
                        : "border-[color:var(--line)] dark:border-[color:var(--line)]"
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
    <div className="mt-3 space-y-3 rounded border border-[color-mix(in_srgb,var(--info)_40%,transparent)] bg-[color-mix(in_srgb,var(--info)_40%,transparent)] p-3 dark:border-[color-mix(in_srgb,var(--info)_40%,transparent)] dark:bg-[color-mix(in_srgb,var(--info)_10%,transparent)]">
      <div>
        <label className="text-[11px] font-semibold uppercase tracking-wide text-[color:var(--mute)]">
          Question text
        </label>
        <textarea
          value={qText}
          onChange={(e) => setQText(e.target.value)}
          rows={3}
          className="mt-1 w-full rounded border border-[color:var(--line)] px-2 py-1.5 text-sm dark:border-[color:var(--line)] dark:bg-[color:var(--raised)]"
        />
      </div>
      <div>
        <label className="text-[11px] font-semibold uppercase tracking-wide text-[color:var(--mute)]">
          Explanation
        </label>
        <textarea
          value={exp}
          onChange={(e) => setExp(e.target.value)}
          rows={2}
          className="mt-1 w-full rounded border border-[color:var(--line)] px-2 py-1.5 text-sm dark:border-[color:var(--line)] dark:bg-[color:var(--raised)]"
        />
      </div>
      <div className="flex justify-end gap-2">
        <button
          onClick={onCancel}
          className="px-3 py-1.5 text-xs font-semibold text-[color:var(--mute)] hover:text-[color:var(--ink)] dark:hover:text-[color:var(--ink)]"
        >
          Cancel
        </button>
        <button
          onClick={() => onSave({ question_text: qText, explanation_text: exp })}
          className="rounded bg-[color:var(--info)] px-4 py-1.5 text-xs font-bold text-[color:var(--ink)] hover:bg-[color:var(--info)]"
        >
          Save edits
        </button>
      </div>
    </div>
  );
}
