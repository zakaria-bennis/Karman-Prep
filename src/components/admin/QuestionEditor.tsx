"use client";

// ============================================================
// QuestionEditor — list of existing questions for a node +
// add-new form. Uses Framer Motion Reorder for drag-and-drop
// (no extra DnD dep needed).
// ============================================================

import { Reorder } from "framer-motion";
import { useMemo, useState, useTransition } from "react";
import { Plus, Trash2, ChevronDown, ChevronUp, GripVertical } from "lucide-react";
import type {
  QuizQuestionWithChoices,
  QuizDifficulty,
  AnswerLetter,
  QuizQuestionType,
} from "@/types/quiz";
import { DIFFICULTY_COLORS } from "@/types/quiz";
import {
  actionAddQuestion,
  actionDeleteQuestion,
  actionReorderQuestions,
  actionUpdateQuestionDifficulty,
} from "@/app/admin/actions";
import { cn } from "@/lib/utils";
import type { Subject } from "@/data/curriculum";

interface Props {
  nodeId: string;
  subject: Subject;
  topicCluster: string;
  initialQuestions: QuizQuestionWithChoices[];
}

const LETTERS: AnswerLetter[] = ["A", "B", "C", "D"];
const DIFFICULTIES: QuizDifficulty[] = ["foundational", "intermediate", "advanced", "mastery"];

export default function QuestionEditor({ nodeId, subject, topicCluster, initialQuestions }: Props) {
  const [questions, setQuestions] = useState<QuizQuestionWithChoices[]>(initialQuestions);
  const [showAddForm, setShowAddForm] = useState(false);
  const [, startTransition] = useTransition();

  function handleReorder(next: QuizQuestionWithChoices[]) {
    setQuestions(next);
    startTransition(async () => {
      try {
        await actionReorderQuestions(next.map((q) => q.id), nodeId);
      } catch (err) {
        console.error(err);
      }
    });
  }

  async function handleDifficultyChange(qid: string, d: QuizDifficulty) {
    setQuestions((qs) => qs.map((q) => (q.id === qid ? { ...q, difficulty: d } : q)));
    try {
      await actionUpdateQuestionDifficulty(qid, d, nodeId);
    } catch (err) {
      console.error(err);
      // Revert on failure
      setQuestions(initialQuestions);
    }
  }

  async function handleDelete(qid: string) {
    if (!confirm("Delete this question? This cannot be undone.")) return;
    setQuestions((qs) => qs.filter((q) => q.id !== qid));
    try {
      await actionDeleteQuestion(qid, nodeId);
    } catch (err) {
      console.error(err);
      setQuestions(initialQuestions);
    }
  }

  function handleQuestionAdded(q: QuizQuestionWithChoices) {
    setQuestions((qs) => [...qs, q]);
    setShowAddForm(false);
  }

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-bold text-slate-900 dark:text-white">
          Questions ({questions.length})
        </h2>
        <button
          onClick={() => setShowAddForm((v) => !v)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold"
        >
          <Plus className="w-3.5 h-3.5" /> {showAddForm ? "Cancel" : "New Question"}
        </button>
      </div>

      {showAddForm && (
        <AddQuestionForm
          nodeId={nodeId}
          subject={subject}
          topicCluster={topicCluster}
          currentCount={questions.length}
          onAdded={handleQuestionAdded}
          onCancel={() => setShowAddForm(false)}
        />
      )}

      {questions.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 dark:border-slate-700 p-8 text-center text-sm text-slate-500">
          No questions yet. Add one above or bulk-import below.
        </div>
      ) : (
        <Reorder.Group axis="y" values={questions} onReorder={handleReorder} className="space-y-3">
          {questions.map((q) => (
            <Reorder.Item key={q.id} value={q} className="list-none">
              <QuestionCard
                question={q}
                onDifficultyChange={(d) => handleDifficultyChange(q.id, d)}
                onDelete={() => handleDelete(q.id)}
              />
            </Reorder.Item>
          ))}
        </Reorder.Group>
      )}
    </section>
  );
}

// ── Question card ────────────────────────────────────────────

function QuestionCard({
  question,
  onDifficultyChange,
  onDelete,
}: {
  question: QuizQuestionWithChoices;
  onDifficultyChange: (d: QuizDifficulty) => void;
  onDelete: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const style = DIFFICULTY_COLORS[question.difficulty];
  const sortedChoices = useMemo(
    () => [...question.answer_choices].sort((a, b) => (a.letter > b.letter ? 1 : -1)),
    [question.answer_choices]
  );

  return (
    <article className={cn("rounded-lg border-l-4 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900", style.border.replace("border-", "border-l-"))}>
      <header className="flex items-start gap-3 p-4">
        <GripVertical className="w-4 h-4 mt-1 text-slate-400 cursor-grab active:cursor-grabbing shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm text-slate-900 dark:text-white font-medium leading-relaxed whitespace-pre-wrap">
            {question.question_text}
          </p>
          <div className="mt-2 flex items-center gap-2 flex-wrap text-[11px]">
            <span className={cn("px-2 py-0.5 rounded-full font-semibold", style.bg, style.text)}>
              {question.difficulty}
            </span>
            <span className="text-slate-500">
              Correct: <strong className="text-slate-900 dark:text-white">{question.correct_answer}</strong>
            </span>
            <span className="text-slate-500">{question.topic_cluster}</span>
            {question.flag_count > 0 && (
              <span className="text-rose-600 dark:text-rose-400">
                ⚑ {question.flag_count} open flag{question.flag_count !== 1 ? "s" : ""}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <select
            value={question.difficulty}
            onChange={(e) => onDifficultyChange(e.target.value as QuizDifficulty)}
            className="text-xs rounded border border-slate-300 dark:border-slate-700 dark:bg-slate-800 px-2 py-1"
          >
            {DIFFICULTIES.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
          <button
            onClick={() => setExpanded((v) => !v)}
            className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"
            aria-label="Expand"
          >
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          <button
            onClick={onDelete}
            className="p-1.5 rounded hover:bg-rose-100 dark:hover:bg-rose-900/30 text-rose-500"
            aria-label="Delete"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* Inline choices preview — always visible */}
      <div className="px-4 pb-4 grid grid-cols-2 gap-2 text-xs">
        {sortedChoices.map((c) => (
          <div
            key={c.letter}
            className={cn(
              "rounded border px-2.5 py-1.5 flex items-start gap-2",
              c.is_correct
                ? "border-emerald-400 bg-emerald-50 dark:bg-emerald-900/20"
                : "border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50"
            )}
          >
            <span className="font-bold text-slate-700 dark:text-slate-300 shrink-0">{c.letter}.</span>
            <span className="text-slate-700 dark:text-slate-300 line-clamp-2">{c.choice_text}</span>
          </div>
        ))}
      </div>

      {expanded && (
        <div className="px-4 pb-4 border-t border-slate-200 dark:border-slate-800 pt-3 space-y-2 text-xs">
          <div>
            <span className="font-bold text-slate-500 uppercase tracking-wide">Explanation:</span>
            <p className="mt-1 text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{question.explanation_text}</p>
          </div>
          {question.explanation_per_choice && (
            <div>
              <span className="font-bold text-slate-500 uppercase tracking-wide">Per-choice:</span>
              {LETTERS.map((l) => {
                const exp = question.explanation_per_choice?.[l];
                if (!exp) return null;
                return (
                  <p key={l} className="mt-1 text-slate-700 dark:text-slate-300">
                    <strong>{l}:</strong> {exp}
                  </p>
                );
              })}
            </div>
          )}
          {question.desmos_strategy && (
            <div>
              <span className="font-bold text-slate-500 uppercase tracking-wide">Desmos strategy:</span>
              <p className="mt-1 text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{question.desmos_strategy}</p>
            </div>
          )}
        </div>
      )}
    </article>
  );
}

// ── Add-new form ────────────────────────────────────────────

function AddQuestionForm({
  nodeId,
  subject,
  topicCluster,
  currentCount,
  onAdded,
  onCancel,
}: {
  nodeId: string;
  subject: Subject;
  topicCluster: string;
  currentCount: number;
  onAdded: (q: QuizQuestionWithChoices) => void;
  onCancel: () => void;
}) {
  const [questionText, setQuestionText] = useState("");
  const [choices, setChoices] = useState<Record<AnswerLetter, string>>({ A: "", B: "", C: "", D: "" });
  const [correctAnswer, setCorrectAnswer] = useState<AnswerLetter>("A");
  const [difficulty, setDifficulty] = useState<QuizDifficulty>("foundational");
  const [cluster, setCluster] = useState(topicCluster);
  const [explanation, setExplanation] = useState("");
  const [perChoice, setPerChoice] = useState<Record<AnswerLetter, string>>({ A: "", B: "", C: "", D: "" });
  const [desmosStrategy, setDesmosStrategy] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);

    const questionType: QuizQuestionType =
      subject === "reading" ? "evidence_based" : "math_computation";

    const hasPerChoice =
      subject === "reading" && Object.values(perChoice).some((v) => v.trim());

    try {
      const q = await actionAddQuestion({
        node_id: nodeId,
        question_text: questionText.trim(),
        question_type: questionType,
        difficulty,
        correct_answer: correctAnswer,
        explanation_text: explanation.trim(),
        explanation_per_choice: hasPerChoice ? perChoice : null,
        subject,
        topic_cluster: cluster.trim() || topicCluster,
        desmos_strategy: subject === "math" && desmosStrategy.trim() ? desmosStrategy.trim() : null,
        display_order: currentCount,
        choices: LETTERS.map((letter) => ({ letter, choice_text: choices[letter].trim() })),
      });
      onAdded(q);
    } catch (err) {
      console.error(err);
      alert("Failed to add question. Check console for details.");
    } finally {
      setSubmitting(false);
    }
  }

  const valid =
    questionText.trim().length > 0 &&
    LETTERS.every((l) => choices[l].trim().length > 0) &&
    explanation.trim().length > 0;

  return (
    <form
      onSubmit={handleSubmit}
      className="mb-5 rounded-lg border-2 border-blue-200 dark:border-blue-900 bg-blue-50/40 dark:bg-blue-900/10 p-5 space-y-4"
    >
      <h3 className="text-sm font-bold text-slate-900 dark:text-white">New Question</h3>

      {/* Question text */}
      <div>
        <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">Question text</label>
        <textarea
          required
          value={questionText}
          onChange={(e) => setQuestionText(e.target.value)}
          rows={3}
          className="mt-1 w-full rounded border border-slate-300 dark:border-slate-700 dark:bg-slate-800 px-3 py-2 text-sm"
          placeholder={subject === "reading" ? "Paste the passage excerpt and question here…" : "Type the math problem…"}
        />
      </div>

      {/* Choices */}
      <div className="grid grid-cols-2 gap-3">
        {LETTERS.map((letter) => (
          <div key={letter}>
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">
              Choice {letter}
            </label>
            <input
              required
              value={choices[letter]}
              onChange={(e) => setChoices((c) => ({ ...c, [letter]: e.target.value }))}
              className="mt-1 w-full rounded border border-slate-300 dark:border-slate-700 dark:bg-slate-800 px-3 py-2 text-sm"
            />
          </div>
        ))}
      </div>

      {/* Correct answer + difficulty + cluster */}
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">Correct</label>
          <div className="mt-1 flex gap-2">
            {LETTERS.map((l) => (
              <label key={l} className="flex items-center gap-1 text-sm cursor-pointer">
                <input
                  type="radio"
                  name="correct"
                  value={l}
                  checked={correctAnswer === l}
                  onChange={() => setCorrectAnswer(l)}
                />
                {l}
              </label>
            ))}
          </div>
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">Difficulty</label>
          <select
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value as QuizDifficulty)}
            className="mt-1 w-full rounded border border-slate-300 dark:border-slate-700 dark:bg-slate-800 px-3 py-2 text-sm"
          >
            {DIFFICULTIES.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">Topic cluster</label>
          <input
            value={cluster}
            onChange={(e) => setCluster(e.target.value)}
            className="mt-1 w-full rounded border border-slate-300 dark:border-slate-700 dark:bg-slate-800 px-3 py-2 text-sm"
          />
        </div>
      </div>

      {/* Explanation */}
      <div>
        <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">
          Explanation (required)
        </label>
        <textarea
          required
          value={explanation}
          onChange={(e) => setExplanation(e.target.value)}
          rows={2}
          className="mt-1 w-full rounded border border-slate-300 dark:border-slate-700 dark:bg-slate-800 px-3 py-2 text-sm"
          placeholder="Why the correct answer is correct. Shown after a wrong answer."
        />
      </div>

      {/* Per-choice — Reading required */}
      {subject === "reading" && (
        <div className="grid grid-cols-2 gap-3">
          {LETTERS.map((letter) => (
            <div key={letter}>
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">
                Why {letter} is {letter === correctAnswer ? "right" : "wrong"}
              </label>
              <textarea
                value={perChoice[letter]}
                onChange={(e) => setPerChoice((c) => ({ ...c, [letter]: e.target.value }))}
                rows={2}
                className="mt-1 w-full rounded border border-slate-300 dark:border-slate-700 dark:bg-slate-800 px-2 py-1.5 text-xs"
              />
            </div>
          ))}
        </div>
      )}

      {/* Desmos strategy — Math only */}
      {subject === "math" && (
        <div>
          <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">
            Desmos strategy (optional)
          </label>
          <textarea
            value={desmosStrategy}
            onChange={(e) => setDesmosStrategy(e.target.value)}
            rows={2}
            className="mt-1 w-full rounded border border-slate-300 dark:border-slate-700 dark:bg-slate-800 px-3 py-2 text-sm"
            placeholder="Step-by-step description of the Desmos approach for this question type."
          />
        </div>
      )}

      {/* Buttons */}
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 rounded text-sm font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!valid || submitting}
          className={cn(
            "px-5 py-2 rounded-lg text-sm font-bold text-white bg-blue-600",
            (!valid || submitting) ? "opacity-50 cursor-not-allowed" : "hover:bg-blue-700"
          )}
        >
          {submitting ? "Adding…" : "Add Question"}
        </button>
      </div>
    </form>
  );
}
