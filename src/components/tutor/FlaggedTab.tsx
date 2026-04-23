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
    } catch (err) { console.error(err); }
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-slate-300 dark:border-slate-700 p-10 text-center">
        <Check className="w-7 h-7 text-emerald-500 mx-auto mb-2" />
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
          <article key={flag.id} className="rounded-lg border border-rose-200 dark:border-rose-900/50 bg-rose-50/30 dark:bg-rose-900/10 p-4">
            <header className="flex items-start gap-2 mb-2">
              <Flag className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />
              <div className="flex-1 text-xs text-slate-500">
                <div className="flex items-center gap-2 flex-wrap">
                  <code>{flag.node_id}</code>
                  <span>•</span>
                  <span>{new Date(flag.created_at).toLocaleString()}</span>
                </div>
                {flag.flag_note && (
                  <p className="mt-1 italic text-rose-700 dark:text-rose-300 not-italic">
                    &ldquo;{flag.flag_note}&rdquo;
                  </p>
                )}
              </div>
              <div className="flex gap-1 shrink-0">
                <button
                  onClick={() => setEditingId(isEditing ? null : flag.id)}
                  className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500"
                  title="Edit question"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => resolve(flag.id)}
                  className="px-3 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold"
                >
                  Mark resolved
                </button>
              </div>
            </header>

            <div className="rounded border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3">
              <p className="text-sm font-medium text-slate-900 dark:text-white mb-2 whitespace-pre-wrap">{q.question_text}</p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {sortedChoices.map((c) => (
                  <div
                    key={c.letter}
                    className={cn(
                      "rounded border px-2 py-1",
                      c.is_correct ? "border-emerald-400 bg-emerald-50 dark:bg-emerald-900/20"
                                   : "border-slate-200 dark:border-slate-800"
                    )}
                  >
                    <strong>{c.letter}.</strong> {c.choice_text}
                  </div>
                ))}
              </div>
            </div>

            {isEditing && (
              <InlineEdit
                question={q}
                studentId={studentId}
                onDone={() => setEditingId(null)}
              />
            )}
          </article>
        );
      })}
    </div>
  );
}

function InlineEdit({ question, studentId, onDone }: { question: QuizQuestionWithChoices; studentId: string; onDone: () => void }) {
  const [qText, setQText] = useState(question.question_text);
  const [exp, setExp]   = useState(question.explanation_text);
  return (
    <div className="mt-3 rounded border border-blue-200 dark:border-blue-900 bg-blue-50/40 dark:bg-blue-900/10 p-3 space-y-2">
      <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Question text</label>
      <textarea
        value={qText}
        onChange={(e) => setQText(e.target.value)}
        rows={3}
        className="w-full rounded border border-slate-300 dark:border-slate-700 dark:bg-slate-800 px-2 py-1.5 text-sm"
      />
      <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Explanation</label>
      <textarea
        value={exp}
        onChange={(e) => setExp(e.target.value)}
        rows={2}
        className="w-full rounded border border-slate-300 dark:border-slate-700 dark:bg-slate-800 px-2 py-1.5 text-sm"
      />
      <div className="flex justify-end gap-2">
        <button onClick={onDone} className="px-3 py-1 text-xs font-semibold text-slate-500">Cancel</button>
        <button
          onClick={async () => {
            await actionEditFlaggedQuestion(question.id, { question_text: qText, explanation_text: exp }, studentId);
            onDone();
          }}
          className="px-3 py-1 rounded bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold"
        >
          Save edits
        </button>
      </div>
    </div>
  );
}
