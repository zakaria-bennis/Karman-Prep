"use client";

// ============================================================
// FlaggedTab — flagged questions for this specific student.
// Resolve + inline edit supported. Portal look: student-detail.css.
// ============================================================

import { useState } from "react";
import { Flag, Check, Edit3 } from "lucide-react";
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
    return <p className="kp-st-empty">This student has no flagged questions.</p>;
  }

  return (
    <ul className="kp-st-flags">
      {rows.map((flag) => {
        if (!flag.question) return null;
        const q = flag.question;
        const isEditing = editingId === flag.id;
        const sortedChoices = [...q.answer_choices].sort((a, b) => (a.letter > b.letter ? 1 : -1));
        return (
          <li key={flag.id} className="kp-st-flag">
            <div className="kp-st-flag-head">
              <div className="kp-meta">
                <Flag size={14} aria-hidden="true" /> <code>{flag.node_id}</code> ·{" "}
                <span>{new Date(flag.created_at).toLocaleString()}</span>
                {flag.flag_note && (
                  <p className="kp-st-flag-note">&ldquo;{flag.flag_note}&rdquo;</p>
                )}
              </div>
              <div className="kp-st-actions">
                <button
                  type="button"
                  onClick={() => setEditingId(isEditing ? null : flag.id)}
                  className="kp-st-btn"
                  aria-expanded={isEditing}
                >
                  <Edit3 aria-hidden="true" /> Edit question
                </button>
                <button
                  type="button"
                  onClick={() => resolve(flag.id)}
                  className="kp-st-btn"
                  data-tone="good"
                >
                  <Check aria-hidden="true" /> Mark resolved
                </button>
              </div>
            </div>

            <p className="kp-st-q">{q.question_text}</p>
            <ul className="kp-st-choices">
              {sortedChoices.map((c) => (
                <li key={c.letter} data-right={c.is_correct ? "" : undefined}>
                  <strong>{c.letter}.</strong> {c.choice_text}
                  {c.is_correct && <span className="kp-sr"> (correct answer)</span>}
                </li>
              ))}
            </ul>

            {isEditing && (
              <InlineEdit question={q} studentId={studentId} onDone={() => setEditingId(null)} />
            )}
          </li>
        );
      })}
    </ul>
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
    <div className="kp-form kp-st-edit">
      <label className="kp-field">
        <span>Question text</span>
        <textarea
          value={qText}
          onChange={(e) => setQText(e.target.value)}
          rows={3}
          className="kp-input kp-textarea"
        />
      </label>
      <label className="kp-field">
        <span>Explanation</span>
        <textarea
          value={exp}
          onChange={(e) => setExp(e.target.value)}
          rows={2}
          className="kp-input kp-textarea"
        />
      </label>
      <div className="kp-st-actions">
        <button type="button" onClick={onDone} className="kp-textbtn">
          Cancel
        </button>
        <button
          type="button"
          onClick={async () => {
            await actionEditFlaggedQuestion(
              question.id,
              { question_text: qText, explanation_text: exp },
              studentId
            );
            onDone();
          }}
          className="kp-st-btn"
          data-tone="good"
        >
          Save edits
        </button>
      </div>
    </div>
  );
}
