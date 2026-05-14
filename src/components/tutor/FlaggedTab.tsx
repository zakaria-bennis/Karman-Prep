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
      <div className="rounded-lg border border-dashed border-slate-300 p-10 text-center dark:border-slate-700">
        <Check className="mx-auto mb-2 h-7 w-7 text-emerald-500" />
        <p className="text-sm text-slate-500">This student has no flagged questions.</p>
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
            className="rounded-lg border border-rose-200 bg-rose-50/30 p-4 dark:border-rose-900/50 dark:bg-rose-900/10"
          >
            <header className="mb-2 flex items-start gap-2">
              <Flag className="mt-0.5 h-3.5 w-3.5 shrink-0 text-rose-500" />
              <div className="flex-1 text-xs text-slate-500">
                <div className="flex flex-wrap items-center gap-2">
                  <code>{flag.node_id}</code>
                  <span>•</span>
                  <span>{new Date(flag.created_at).toLocaleString()}</span>
                </div>
                {flag.flag_note && (
                  <p className="mt-1 italic not-italic text-rose-700 dark:text-rose-300">
                    &ldquo;{flag.flag_note}&rdquo;
                  </p>
                )}
              </div>
              <div className="flex shrink-0 gap-1">
                <button
                  onClick={() => setEditingId(isEditing ? null : flag.id)}
                  className="rounded p-1.5 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800"
                  title="Edit question"
                >
                  <Edit3 className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => resolve(flag.id)}
                  className="rounded bg-emerald-600 px-3 py-1 text-xs font-semibold text-white hover:bg-emerald-700"
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
                {sortedChoices.map((c) => (
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
    <div className="mt-3 space-y-2 rounded border border-blue-200 bg-blue-50/40 p-3 dark:border-blue-900 dark:bg-blue-900/10">
      <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
        Question text
      </label>
      <textarea
        value={qText}
        onChange={(e) => setQText(e.target.value)}
        rows={3}
        className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800"
      />
      <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
        Explanation
      </label>
      <textarea
        value={exp}
        onChange={(e) => setExp(e.target.value)}
        rows={2}
        className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800"
      />
      <div className="flex justify-end gap-2">
        <button onClick={onDone} className="px-3 py-1 text-xs font-semibold text-slate-500">
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
          className="rounded bg-blue-600 px-3 py-1 text-xs font-bold text-white hover:bg-blue-700"
        >
          Save edits
        </button>
      </div>
    </div>
  );
}
