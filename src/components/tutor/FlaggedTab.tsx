"use client";

// ============================================================
// FlaggedTab — flagged questions for this specific student.
// Resolve + inline edit supported.
// ============================================================

import { useState } from "react";
import { Flag, Check, Edit3 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { FlaggedQuestion, QuizQuestionWithChoices } from "@/types/quiz";
import { actionResolveFlag, actionEditFlaggedQuestion } from "@/app/tutor/actions";

type Row = FlaggedQuestion & { question: QuizQuestionWithChoices | null };

interface Props {
  studentId: string;
  flagged: Row[];
}

export default function FlaggedTab({ studentId, flagged }: Props) {
  const [rows, setRows] = useState<Row[]>(flagged);
  const [editingId, setEditingId] = useState<string | null>(null);

  async function resolve(flagId: string) {
    try {
      await actionResolveFlag(flagId, studentId);
      setRows((rs) => rs.filter((r) => r.id !== flagId));
    } catch (err) {
      console.error(err);
    }
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-[color:var(--line)] p-10 text-center">
        <Check className="mx-auto mb-2 h-7 w-7 text-[color:var(--good)]" />
        <p className="text-sm text-[color:var(--mute)]">This student has no flagged questions.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {rows.map((flag) => {
        if (!flag.question) return null;
        const q = flag.question;
        const isEditing = editingId === flag.id;
        const sortedChoices = [...q.answer_choices].sort((a, b) => (a.letter > b.letter ? 1 : -1));
        return (
          <article
            key={flag.id}
            className="rounded-lg border border-[color-mix(in_srgb,var(--late)_40%,transparent)] bg-[color-mix(in_srgb,var(--late)_30%,transparent)] p-4"
          >
            <header className="mb-2 flex items-start gap-2">
              <Flag className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[color:var(--late)]" />
              <div className="flex-1 text-xs text-[color:var(--mute)]">
                <div className="flex flex-wrap items-center gap-2">
                  <code>{flag.node_id}</code>
                  <span>•</span>
                  <span>{new Date(flag.created_at).toLocaleString()}</span>
                </div>
                {flag.flag_note && (
                  <p className="mt-1 italic not-italic text-[color:var(--late)]">
                    &ldquo;{flag.flag_note}&rdquo;
                  </p>
                )}
              </div>
              <div className="flex shrink-0 gap-1">
                <button
                  onClick={() => setEditingId(isEditing ? null : flag.id)}
                  className="rounded p-1.5 text-[color:var(--mute)] hover:bg-[color:var(--card)]"
                  title="Edit question"
                >
                  <Edit3 className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => resolve(flag.id)}
                  className="rounded bg-[color:var(--good)] px-3 py-1 text-xs font-semibold text-[color:var(--accent-ink)] hover:bg-[color:var(--good)]"
                >
                  Mark resolved
                </button>
              </div>
            </header>

            <div className="rounded border border-[color:var(--line)] bg-[color:var(--card)] p-3">
              <p className="mb-2 whitespace-pre-wrap text-sm font-medium text-[color:var(--ink)]">
                {q.question_text}
              </p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {sortedChoices.map((c) => (
                  <div
                    key={c.letter}
                    className={cn(
                      "rounded border px-2 py-1",
                      c.is_correct
                        ? "border-[color-mix(in_srgb,var(--good)_40%,transparent)] bg-[color-mix(in_srgb,var(--good)_10%,transparent)]"
                        : "border-[color:var(--line)]"
                    )}
                  >
                    <strong>{c.letter}.</strong> {c.choice_text}
                  </div>
                ))}
              </div>
            </div>

            {isEditing && (
              <InlineEdit question={q} studentId={studentId} onDone={() => setEditingId(null)} />
            )}
          </article>
        );
      })}
    </div>
  );
}

function InlineEdit({
  question,
  studentId,
  onDone,
}: {
  question: QuizQuestionWithChoices;
  studentId: string;
  onDone: () => void;
}) {
  const [qText, setQText] = useState(question.question_text);
  const [exp, setExp] = useState(question.explanation_text);
  return (
    <div className="mt-3 space-y-2 rounded border border-[color-mix(in_srgb,var(--info)_40%,transparent)] bg-[color-mix(in_srgb,var(--info)_40%,transparent)] p-3">
      <label className="text-[11px] font-semibold text-[color:var(--mute)]">Question text</label>
      <textarea
        value={qText}
        onChange={(e) => setQText(e.target.value)}
        rows={3}
        className="w-full rounded border border-[color:var(--line)] px-2 py-1.5 text-sm"
      />
      <label className="text-[11px] font-semibold text-[color:var(--mute)]">Explanation</label>
      <textarea
        value={exp}
        onChange={(e) => setExp(e.target.value)}
        rows={2}
        className="w-full rounded border border-[color:var(--line)] px-2 py-1.5 text-sm"
      />
      <div className="flex justify-end gap-2">
        <button
          onClick={onDone}
          className="px-3 py-1 text-xs font-semibold text-[color:var(--mute)]"
        >
          Cancel
        </button>
        <button
          onClick={async () => {
            await actionEditFlaggedQuestion(
              question.id,
              { question_text: qText, explanation_text: exp },
              studentId
            );
            onDone();
          }}
          className="rounded bg-[color:var(--info)] px-3 py-1 text-xs font-bold text-[color:var(--ink)] hover:bg-[color:var(--info)]"
        >
          Save edits
        </button>
      </div>
    </div>
  );
}
