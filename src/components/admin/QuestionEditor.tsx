"use client";

// ============================================================
// QuestionEditor — dark-themed, drag-reorderable, with hint field.
// ============================================================

import { Reorder } from "framer-motion";
import Image from "next/image";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  GripVertical,
  Lightbulb,
  ImageIcon,
  X,
  Loader2,
  Upload,
} from "lucide-react";
import type {
  QuizQuestionWithChoices,
  QuizDifficulty,
  AnswerLetter,
  QuizQuestionType,
} from "@/types/quiz";
import {
  actionAddQuestion,
  actionDeleteQuestion,
  actionReorderQuestions,
  actionUpdateQuestionDifficulty,
  actionUpdateQuestionDifficultyLevel,
  actionUploadQuestionImage,
  actionRemoveQuestionImage,
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

// Dark-mode difficulty pill colors
const DIFF_PILL: Record<QuizDifficulty, string> = {
  foundational: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  intermediate: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  advanced: "bg-orange-500/15 text-orange-300 border-orange-500/30",
  mastery: "bg-rose-500/15 text-rose-300 border-rose-500/30",
};

const DIFF_LEFT_BORDER: Record<QuizDifficulty, string> = {
  foundational: "border-l-emerald-400",
  intermediate: "border-l-amber-400",
  advanced: "border-l-orange-400",
  mastery: "border-l-rose-400",
};

type ViewMode = "list" | "tabs";

export default function QuestionEditor({ nodeId, subject, topicCluster, initialQuestions }: Props) {
  const [questions, setQuestions] = useState<QuizQuestionWithChoices[]>(initialQuestions);
  const [showAddForm, setShowAddForm] = useState(false);
  const [filter, setFilter] = useState<QuizDifficulty | "all">("all");
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const counts = useMemo(() => {
    const c: Record<QuizDifficulty, number> = {
      foundational: 0,
      intermediate: 0,
      advanced: 0,
      mastery: 0,
    };
    for (const q of questions) c[q.difficulty]++;
    return c;
  }, [questions]);

  const filteredQuestions = useMemo(
    () => (filter === "all" ? questions : questions.filter((q) => q.difficulty === filter)),
    [questions, filter]
  );

  function handleReorder(next: QuizQuestionWithChoices[]) {
    setQuestions(next);
    startTransition(async () => {
      try {
        await actionReorderQuestions(
          next.map((q) => q.id),
          nodeId
        );
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
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-white">
            {questions.length} question{questions.length !== 1 ? "s" : ""}
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Target: ~100 per node.{" "}
            {viewMode === "list"
              ? "Drag the handle to reorder."
              : "Click a tab to view its details."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* View mode toggle */}
          <div className="inline-flex overflow-hidden rounded-lg border border-slate-700 bg-slate-900 text-xs">
            <button
              onClick={() => setViewMode("list")}
              className={cn(
                "px-3 py-1.5 font-semibold",
                viewMode === "list"
                  ? "bg-slate-800 text-white"
                  : "text-slate-500 hover:text-slate-300"
              )}
            >
              List
            </button>
            <button
              onClick={() => setViewMode("tabs")}
              className={cn(
                "border-l border-slate-700 px-3 py-1.5 font-semibold",
                viewMode === "tabs"
                  ? "bg-slate-800 text-white"
                  : "text-slate-500 hover:text-slate-300"
              )}
            >
              Tabs
            </button>
          </div>
          <button
            onClick={() => setShowAddForm((v) => !v)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-500 px-3 py-1.5 text-sm font-semibold text-white hover:bg-indigo-400"
          >
            <Plus className="h-3.5 w-3.5" /> {showAddForm ? "Cancel" : "New question"}
          </button>
        </div>
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

      {/* Difficulty filter chips */}
      {questions.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-2 text-xs">
          <span className="font-semibold uppercase tracking-wider text-slate-500">Filter:</span>
          <FilterChip
            label={`All ${questions.length}`}
            active={filter === "all"}
            onClick={() => setFilter("all")}
            hex="#6366f1"
          />
          {DIFFICULTIES.map((d) => (
            <FilterChip
              key={d}
              label={`${d} ${counts[d]}`}
              active={filter === d}
              onClick={() => setFilter(d)}
              hex={DIFF_HEX[d]}
            />
          ))}
          {filter !== "all" && (
            <span className="ml-2 text-slate-500">
              Showing {filteredQuestions.length} of {questions.length}
            </span>
          )}
        </div>
      )}

      {questions.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-700 p-10 text-center text-sm text-slate-500">
          No questions yet. Add one above or use Bulk Import tab.
        </div>
      ) : viewMode === "tabs" ? (
        <TabsView
          questions={filteredQuestions}
          questionNumberMap={new Map(questions.map((q, i) => [q.id, i + 1]))}
          nodeId={nodeId}
          activeId={activeTabId ?? filteredQuestions[0]?.id ?? null}
          onActiveChange={setActiveTabId}
          onDifficultyChange={handleDifficultyChange}
          onDelete={handleDelete}
          onImageChanged={(qid, url, path) => {
            setQuestions((qs) =>
              qs.map((x) => (x.id === qid ? { ...x, image_url: url, image_storage_path: path } : x))
            );
          }}
        />
      ) : filter === "all" ? (
        <Reorder.Group axis="y" values={questions} onReorder={handleReorder} className="space-y-3">
          {questions.map((q, i) => (
            <Reorder.Item key={q.id} value={q} className="list-none">
              <QuestionCard
                question={q}
                questionNumber={i + 1}
                nodeId={nodeId}
                onDifficultyChange={(d) => handleDifficultyChange(q.id, d)}
                onDelete={() => handleDelete(q.id)}
                onImageChanged={(url, path) => {
                  setQuestions((qs) =>
                    qs.map((x) =>
                      x.id === q.id ? { ...x, image_url: url, image_storage_path: path } : x
                    )
                  );
                }}
              />
            </Reorder.Item>
          ))}
        </Reorder.Group>
      ) : (
        <div className="space-y-3">
          {filteredQuestions.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-700 p-8 text-center text-sm text-slate-500">
              No <strong className="text-slate-300">{filter}</strong> questions yet.
            </div>
          ) : (
            filteredQuestions.map((q) => {
              const idx = questions.findIndex((x) => x.id === q.id);
              return (
                <QuestionCard
                  key={q.id}
                  question={q}
                  questionNumber={idx + 1}
                  nodeId={nodeId}
                  onDifficultyChange={(d) => handleDifficultyChange(q.id, d)}
                  onDelete={() => handleDelete(q.id)}
                  onImageChanged={(url, path) => {
                    setQuestions((qs) =>
                      qs.map((x) =>
                        x.id === q.id ? { ...x, image_url: url, image_storage_path: path } : x
                      )
                    );
                  }}
                  dragDisabled
                />
              );
            })
          )}
        </div>
      )}
    </section>
  );
}

// ── TabsView — compact numbered chips + single-question detail panel ──

function TabsView({
  questions,
  questionNumberMap,
  nodeId,
  activeId,
  onActiveChange,
  onDifficultyChange,
  onDelete,
  onImageChanged,
}: {
  questions: QuizQuestionWithChoices[];
  questionNumberMap: Map<string, number>;
  nodeId: string;
  activeId: string | null;
  onActiveChange: (id: string | null) => void;
  onDifficultyChange: (qid: string, d: QuizDifficulty) => void;
  onDelete: (qid: string) => void;
  onImageChanged: (qid: string, url: string | null, path: string | null) => void;
}) {
  const active = questions.find((q) => q.id === activeId) ?? questions[0] ?? null;

  if (questions.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-700 p-8 text-center text-sm text-slate-500">
        No questions at this filter.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Tab strip */}
      <div className="flex flex-wrap gap-1.5 rounded-xl border border-slate-800 bg-slate-900/40 p-2">
        {questions.map((q) => {
          const n = questionNumberMap.get(q.id) ?? 0;
          const hex = DIFFICULTY_LEVEL_HEX[(q.difficulty_level ?? 1) as QuizDifficultyLevel];
          const isActive = active?.id === q.id;
          return (
            <button
              key={q.id}
              onClick={() => onActiveChange(q.id)}
              className={cn(
                "flex min-w-[3.25rem] items-center gap-1.5 rounded-lg border px-2 py-1.5 text-xs font-bold tabular-nums transition-colors",
                isActive ? "text-white" : "text-slate-400 hover:text-slate-200"
              )}
              style={
                isActive
                  ? {
                      background: hex + "30",
                      borderColor: hex,
                    }
                  : {
                      background: hex + "12",
                      borderColor: hex + "30",
                    }
              }
              title={q.question_text.slice(0, 80)}
            >
              <span>Q{n}</span>
              <span className="opacity-60" style={{ color: hex }}>
                ·{q.difficulty_level ?? 1}
              </span>
              {q.image_url && <ImageIcon className="h-2.5 w-2.5 opacity-70" />}
            </button>
          );
        })}
      </div>

      {/* Active question's full card */}
      {active && (
        <QuestionCard
          question={active}
          questionNumber={questionNumberMap.get(active.id) ?? 0}
          nodeId={nodeId}
          onDifficultyChange={(d) => onDifficultyChange(active.id, d)}
          onDelete={() => {
            onDelete(active.id);
            onActiveChange(null);
          }}
          onImageChanged={(url, path) => onImageChanged(active.id, url, path)}
          dragDisabled
          forceExpanded
        />
      )}
    </div>
  );
}

// Difficulty hex (used by filter chips + card accents)
const DIFF_HEX: Record<QuizDifficulty, string> = {
  foundational: "#34d399",
  intermediate: "#fbbf24",
  advanced: "#fb923c",
  mastery: "#fb7185",
};

function FilterChip({
  label,
  active,
  onClick,
  hex,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  hex: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-full border px-2.5 py-1 font-semibold capitalize transition-colors",
        active
          ? "text-white"
          : "border-slate-700 text-slate-400 hover:border-slate-600 hover:text-slate-200"
      )}
      style={
        active
          ? {
              background: hex + "30",
              borderColor: hex + "60",
              color: hex,
            }
          : undefined
      }
    >
      {label}
    </button>
  );
}

// ── Question card ────────────────────────────────────────────

function QuestionCard({
  question,
  questionNumber,
  nodeId,
  onDifficultyChange,
  onDelete,
  onImageChanged,
  dragDisabled,
  forceExpanded,
}: {
  question: QuizQuestionWithChoices;
  questionNumber: number;
  nodeId: string;
  onDifficultyChange: (d: QuizDifficulty) => void;
  onDelete: () => void;
  onImageChanged: (url: string | null, path: string | null) => void;
  dragDisabled?: boolean;
  forceExpanded?: boolean;
}) {
  const [expandedState, setExpanded] = useState(false);
  const expanded = forceExpanded || expandedState;
  const sortedChoices = useMemo(
    () => [...question.answer_choices].sort((a, b) => (a.letter > b.letter ? 1 : -1)),
    [question.answer_choices]
  );
  const level = (question.difficulty_level ?? 1) as QuizDifficultyLevel;
  const levelHex = DIFFICULTY_LEVEL_HEX[level];
  const isNumeric = question.answer_format === "numeric_entry";

  return (
    <article
      className={cn(
        "overflow-hidden rounded-xl border border-l-4 border-slate-800 bg-slate-900/60"
      )}
      style={{ borderLeftColor: levelHex }}
    >
      <header className="flex items-start gap-3 p-4">
        {dragDisabled ? (
          <div className="w-4 shrink-0" />
        ) : (
          <GripVertical className="mt-1 h-4 w-4 shrink-0 cursor-grab text-slate-500 active:cursor-grabbing" />
        )}
        {/* Question number badge */}
        <span className="mt-0.5 shrink-0 rounded-md bg-slate-800 px-1.5 py-0.5 text-[11px] font-bold tabular-nums text-slate-300">
          Q{questionNumber}
        </span>
        <div className="min-w-0 flex-1">
          {/* Image thumbnail */}
          {question.image_url && (
            <div className="mb-2 inline-block max-w-xs overflow-hidden rounded-lg border border-slate-700 bg-slate-900">
              <Image
                src={question.image_url}
                alt={question.image_alt ?? ""}
                width={280}
                height={180}
                className="max-h-40 w-auto object-contain"
                unoptimized
              />
            </div>
          )}
          <p className="whitespace-pre-wrap text-sm font-medium leading-relaxed text-slate-100">
            {question.question_text}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px]">
            <span
              className="rounded-full border px-2 py-0.5 font-bold tabular-nums"
              style={{ color: levelHex, background: levelHex + "15", borderColor: levelHex + "40" }}
            >
              Lv {level}
            </span>
            {isNumeric && (
              <span className="rounded-full border border-sky-500/30 bg-sky-500/10 px-2 py-0.5 font-semibold text-sky-300">
                numeric
              </span>
            )}
            <span className="text-slate-500">
              Correct: <strong className="text-white">{question.correct_answer}</strong>
              {isNumeric && question.numeric_tolerance !== null && (
                <span className="text-slate-500"> (± {question.numeric_tolerance})</span>
              )}
            </span>
            <span className="text-slate-600">{question.topic_cluster}</span>
            {question.hint && (
              <span className="inline-flex items-center gap-1 text-amber-400/80">
                <Lightbulb className="h-3 w-3" /> hint
              </span>
            )}
            {question.flag_count > 0 && (
              <span className="text-rose-400">⚑ {question.flag_count}</span>
            )}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <select
            value={level}
            onChange={(e) => {
              const lv = Number(e.target.value) as QuizDifficultyLevel;
              const legacy: QuizDifficulty =
                lv <= 2
                  ? "foundational"
                  : lv <= 4
                    ? "intermediate"
                    : lv <= 6
                      ? "advanced"
                      : "mastery";
              onDifficultyChange(legacy);
              // Also sync the numeric level to DB via the existing action endpoint:
              // (we re-use the legacy difficulty writer; for full 1-7 persistence
              // a new write happens on the next card render via quiz query)
              actionUpdateQuestionDifficultyLevel(question.id, lv).catch(console.error);
            }}
            className="rounded border border-slate-700 bg-slate-800 px-2 py-1 text-xs tabular-nums text-slate-200"
          >
            {[1, 2, 3, 4, 5, 6, 7].map((n) => (
              <option key={n} value={n}>
                Level {n}
              </option>
            ))}
          </select>
          {!forceExpanded && (
            <button
              onClick={() => setExpanded((v) => !v)}
              className="rounded p-1.5 text-slate-500 hover:bg-slate-800"
            >
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
          )}
          <button
            onClick={onDelete}
            className="rounded p-1.5 text-rose-400 hover:bg-rose-500/15"
            aria-label="Delete"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </header>

      {/* For numeric questions, show a single answer box instead of the 4-choice grid */}
      {isNumeric ? (
        <div className="px-4 pb-4">
          <div className="rounded-lg border border-sky-500/30 bg-sky-500/5 px-3 py-2">
            <p className="text-[11px] font-bold uppercase tracking-wider text-sky-300">
              Correct value
            </p>
            <p className="mt-0.5 font-mono text-sm text-slate-100">{question.correct_answer}</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2 px-4 pb-4 text-xs">
          {sortedChoices.map((c) => (
            <div
              key={c.letter}
              className={cn(
                "flex items-start gap-2 rounded border px-2.5 py-1.5",
                c.is_correct
                  ? "border-emerald-400/50 bg-emerald-500/10"
                  : "border-slate-800 bg-slate-900/70"
              )}
            >
              <span
                className={cn(
                  "shrink-0 font-bold",
                  c.is_correct ? "text-emerald-300" : "text-slate-400"
                )}
              >
                {c.letter}.
              </span>
              <span className="line-clamp-2 text-slate-200">{c.choice_text}</span>
            </div>
          ))}
        </div>
      )}

      {expanded && (
        <div className="space-y-3 border-t border-slate-800 px-4 pb-4 pt-3 text-xs">
          <ImageAttachment
            questionId={question.id}
            nodeId={nodeId}
            imageUrl={question.image_url}
            imageStoragePath={question.image_storage_path}
            imageAlt={question.image_alt}
            onChanged={onImageChanged}
          />

          {question.hint && (
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400/80">
                Hint:
              </span>
              <p className="mt-1 whitespace-pre-wrap text-slate-300">{question.hint}</p>
            </div>
          )}
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Explanation:
            </span>
            <p className="mt-1 whitespace-pre-wrap text-slate-300">{question.explanation_text}</p>
          </div>
          {question.explanation_per_choice && (
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Per-choice:
              </span>
              {LETTERS.map((l) => {
                const exp = question.explanation_per_choice?.[l];
                if (!exp) return null;
                return (
                  <p key={l} className="mt-1 text-slate-300">
                    <strong className="text-slate-200">{l}:</strong> {exp}
                  </p>
                );
              })}
            </div>
          )}
          {question.desmos_strategy && (
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Desmos strategy:
              </span>
              <p className="mt-1 whitespace-pre-wrap text-slate-300">{question.desmos_strategy}</p>
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
  const [answerFormat, setAnswerFormat] = useState<"multiple_choice" | "numeric_entry">(
    subject === "math" ? "multiple_choice" : "multiple_choice"
  );
  const [choices, setChoices] = useState<Record<AnswerLetter, string>>({
    A: "",
    B: "",
    C: "",
    D: "",
  });
  const [correctAnswer, setCorrectAnswer] = useState<AnswerLetter>("A");
  const [numericAnswer, setNumericAnswer] = useState("");
  const [numericTolerance, setNumericTolerance] = useState("");
  const [difficultyLevel, setDifficultyLevel] = useState<1 | 2 | 3 | 4 | 5 | 6 | 7>(1);
  const [cluster, setCluster] = useState(topicCluster);
  const [hint, setHint] = useState("");
  const [explanation, setExplanation] = useState("");
  const [perChoice, setPerChoice] = useState<Record<AnswerLetter, string>>({
    A: "",
    B: "",
    C: "",
    D: "",
  });
  const [desmosStrategy, setDesmosStrategy] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [imageAlt, setImageAlt] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // Revoke the blob URL when it changes or the form unmounts to avoid leaks.
  useEffect(() => {
    if (!imagePreviewUrl) return;
    return () => URL.revokeObjectURL(imagePreviewUrl);
  }, [imagePreviewUrl]);

  function setImageFromFile(file: File | null) {
    setImageFile(file);
    setImagePreviewUrl(file ? URL.createObjectURL(file) : null);
  }

  /** Cmd+V into any wired textarea: if the clipboard has an image, attach
   *  it to this question (replacing any prior attachment) and show an
   *  inline thumbnail. Plain-text pastes fall through untouched. */
  function handleImagePaste(e: React.ClipboardEvent<HTMLTextAreaElement>) {
    const items = Array.from(e.clipboardData?.items ?? []);
    const imageItem = items.find((it) => it.type.startsWith("image/"));
    if (!imageItem) return;
    const file = imageItem.getAsFile();
    if (!file) return;
    e.preventDefault();
    setImageFromFile(file);
  }

  const inputClass =
    "w-full rounded-lg border border-slate-700 bg-slate-900 text-slate-100 px-3 py-2 text-sm placeholder:text-slate-600 focus:outline-none focus:border-indigo-500";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const questionType: QuizQuestionType =
      subject === "reading" ? "evidence_based" : "math_computation";
    const hasPerChoice = subject === "reading" && Object.values(perChoice).some((v) => v.trim());

    try {
      // Map 1–7 level to legacy enum for back-compat
      const legacyDifficulty: QuizDifficulty =
        difficultyLevel <= 2
          ? "foundational"
          : difficultyLevel <= 4
            ? "intermediate"
            : difficultyLevel <= 6
              ? "advanced"
              : "mastery";
      const tol = numericTolerance.trim() ? parseFloat(numericTolerance) : null;

      const q = await actionAddQuestion({
        node_id: nodeId,
        question_text: questionText.trim(),
        question_type: questionType,
        difficulty: legacyDifficulty,
        difficulty_level: difficultyLevel,
        answer_format: answerFormat,
        correct_answer: answerFormat === "numeric_entry" ? numericAnswer.trim() : correctAnswer,
        numeric_tolerance: Number.isFinite(tol ?? NaN) ? tol : null,
        explanation_text: explanation.trim(),
        explanation_per_choice:
          hasPerChoice && answerFormat === "multiple_choice" ? perChoice : null,
        hint: hint.trim() || null,
        subject,
        topic_cluster: cluster.trim() || topicCluster,
        desmos_strategy: subject === "math" && desmosStrategy.trim() ? desmosStrategy.trim() : null,
        display_order: currentCount,
        choices:
          answerFormat === "numeric_entry"
            ? []
            : LETTERS.map((letter) => ({ letter, choice_text: choices[letter].trim() })),
      });

      // If an image was attached, upload it now and merge the URL into the returned question
      if (imageFile) {
        try {
          const fd = new FormData();
          fd.append("image", imageFile);
          const { publicUrl } = await actionUploadQuestionImage(
            q.id,
            nodeId,
            fd,
            imageAlt.trim() || null
          );
          q.image_url = publicUrl;
          q.image_alt = imageAlt.trim() || null;
        } catch (imgErr) {
          console.error(imgErr);
          alert(
            "Question saved but image upload failed. You can attach it later from the expanded view."
          );
        }
      }

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
    explanation.trim().length > 0 &&
    (answerFormat === "numeric_entry"
      ? numericAnswer.trim().length > 0
      : LETTERS.every((l) => choices[l].trim().length > 0));

  return (
    <form
      onSubmit={handleSubmit}
      className="mb-5 space-y-4 rounded-xl border border-indigo-500/30 bg-indigo-500/5 p-5"
    >
      <h3 className="text-sm font-bold text-white">New question</h3>

      {/* Answer format toggle (MC vs numeric) */}
      {subject === "math" && (
        <Field
          label="Answer format"
          helper="Numeric entry is typed in by the student — no A/B/C/D choices."
        >
          <div className="inline-flex overflow-hidden rounded-lg border border-slate-700 bg-slate-900">
            <button
              type="button"
              onClick={() => setAnswerFormat("multiple_choice")}
              className={cn(
                "px-4 py-1.5 text-xs font-semibold",
                answerFormat === "multiple_choice"
                  ? "bg-indigo-500 text-white"
                  : "text-slate-400 hover:text-slate-200"
              )}
            >
              Multiple choice
            </button>
            <button
              type="button"
              onClick={() => setAnswerFormat("numeric_entry")}
              className={cn(
                "border-l border-slate-700 px-4 py-1.5 text-xs font-semibold",
                answerFormat === "numeric_entry"
                  ? "bg-indigo-500 text-white"
                  : "text-slate-400 hover:text-slate-200"
              )}
            >
              Numeric entry
            </button>
          </div>
        </Field>
      )}

      <Field
        label="Question text"
        helper="Supports LaTeX — wrap inline math in $ … $, block in $$ … $$. Paste a screenshot (Cmd+V) to attach an image."
      >
        <textarea
          required
          value={questionText}
          onChange={(e) => setQuestionText(e.target.value)}
          onPaste={handleImagePaste}
          rows={3}
          className={cn(inputClass, "font-mono text-[13px]")}
          placeholder="e.g. Solve for x in $2x + 5 = 17$"
        />
      </Field>

      {/* Optional image — table screenshot, graph, figure */}
      <Field
        label="Image (optional)"
        helper="Attach a table, graph, or figure. Appears above the question text. You can also paste a screenshot directly into any text field."
      >
        <div className="flex flex-wrap items-center gap-3">
          <input
            ref={imageInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => setImageFromFile(e.target.files?.[0] ?? null)}
          />
          <button
            type="button"
            onClick={() => imageInputRef.current?.click()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-100 hover:bg-slate-700"
          >
            <ImageIcon className="h-3.5 w-3.5" /> {imageFile ? "Change image" : "Choose image"}
          </button>
          {imageFile && (
            <>
              <span className="max-w-xs truncate text-xs text-slate-400">
                {imageFile.name || "Pasted image"}
              </span>
              <button
                type="button"
                onClick={() => {
                  setImageFromFile(null);
                  if (imageInputRef.current) imageInputRef.current.value = "";
                }}
                className="text-xs text-rose-400 hover:text-rose-300"
              >
                remove
              </button>
            </>
          )}
        </div>
        {imagePreviewUrl && (
          <img
            src={imagePreviewUrl}
            alt={imageAlt || "Attached image preview"}
            className="mt-2 max-h-48 rounded-lg border border-slate-700 bg-slate-950"
          />
        )}
        {imageFile && (
          <input
            value={imageAlt}
            onChange={(e) => setImageAlt(e.target.value)}
            placeholder="Alt text (for screen readers) — optional"
            className={cn(inputClass, "mt-2")}
          />
        )}
      </Field>

      {/* Answer area: either 4 MC choices OR single numeric value */}
      {answerFormat === "multiple_choice" ? (
        <>
          <div className="grid grid-cols-2 gap-3">
            {LETTERS.map((letter) => (
              <Field key={letter} label={`Choice ${letter}`}>
                <input
                  required
                  value={choices[letter]}
                  onChange={(e) => setChoices((c) => ({ ...c, [letter]: e.target.value }))}
                  className={inputClass}
                />
              </Field>
            ))}
          </div>
          <Field label="Correct answer">
            <div className="flex gap-3 pt-1">
              {LETTERS.map((l) => (
                <label
                  key={l}
                  className="flex cursor-pointer items-center gap-1 text-sm text-slate-200"
                >
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
          </Field>
        </>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <Field
            label="Correct value"
            helper="Accepts decimals (3.14) or fractions (1/2). Numbers must match exactly within the tolerance below."
          >
            <input
              required
              value={numericAnswer}
              onChange={(e) => setNumericAnswer(e.target.value)}
              className={inputClass}
              placeholder="e.g. 3.14 or 1/2"
            />
          </Field>
          <Field
            label="Tolerance ± (optional)"
            helper="Accept answers within this distance of the correct value. Leave empty for an exact match."
          >
            <input
              type="number"
              step="any"
              value={numericTolerance}
              onChange={(e) => setNumericTolerance(e.target.value)}
              className={inputClass}
              placeholder="e.g. 0.01"
            />
          </Field>
        </div>
      )}

      {/* Difficulty slider 1-7 */}
      <DifficultyLevelField level={difficultyLevel} onChange={setDifficultyLevel} />

      <Field label="Topic cluster">
        <input
          value={cluster}
          onChange={(e) => setCluster(e.target.value)}
          className={inputClass}
        />
      </Field>

      <Field label="Hint (optional)" helper="Shown to students while answering — a small nudge.">
        <textarea
          value={hint}
          onChange={(e) => setHint(e.target.value)}
          onPaste={handleImagePaste}
          rows={2}
          className={inputClass}
          placeholder="e.g. 'Try plugging each answer choice back into the original equation.'"
        />
      </Field>

      <Field
        label="Explanation (required)"
        helper="Full explanation shown after a wrong answer. Paste a screenshot (Cmd+V) to attach an image."
      >
        <textarea
          required
          value={explanation}
          onChange={(e) => setExplanation(e.target.value)}
          onPaste={handleImagePaste}
          rows={3}
          className={inputClass}
        />
      </Field>

      {subject === "reading" && answerFormat === "multiple_choice" && (
        <div className="grid grid-cols-2 gap-3">
          {LETTERS.map((letter) => (
            <Field
              key={letter}
              label={`Why ${letter} is ${letter === correctAnswer ? "right" : "wrong"}`}
            >
              <textarea
                value={perChoice[letter]}
                onChange={(e) => setPerChoice((c) => ({ ...c, [letter]: e.target.value }))}
                onPaste={handleImagePaste}
                rows={2}
                className={inputClass}
              />
            </Field>
          ))}
        </div>
      )}

      {subject === "math" && (
        <Field label="Desmos strategy (optional)">
          <textarea
            value={desmosStrategy}
            onChange={(e) => setDesmosStrategy(e.target.value)}
            onPaste={handleImagePaste}
            rows={2}
            className={inputClass}
            placeholder="Step-by-step Desmos approach for this question type."
          />
        </Field>
      )}

      <div className="flex justify-end gap-2 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg px-4 py-2 text-sm font-semibold text-slate-400 hover:bg-slate-800"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!valid || submitting}
          className={cn(
            "rounded-lg bg-indigo-500 px-5 py-2 text-sm font-bold text-white",
            !valid || submitting ? "cursor-not-allowed opacity-50" : "hover:bg-indigo-400"
          )}
        >
          {submitting ? "Adding…" : "Add question"}
        </button>
      </div>
    </form>
  );
}

function Field({
  label,
  helper,
  children,
}: {
  label: string;
  helper?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{label}</span>
      {helper && <span className="mb-1 mt-0.5 block text-[10px] text-slate-500">{helper}</span>}
      <div className={helper ? "" : "mt-1"}>{children}</div>
    </label>
  );
}

// ── 1-7 Difficulty field ─────────────────────────────────────

import {
  DIFFICULTY_LEVEL_HEX,
  DIFFICULTY_LEVEL_LABELS,
  type QuizDifficultyLevel,
} from "@/types/quiz";

function DifficultyLevelField({
  level,
  onChange,
}: {
  level: QuizDifficultyLevel;
  onChange: (lv: QuizDifficultyLevel) => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
          Difficulty level{" "}
          <span className="ml-1 normal-case tracking-normal text-slate-600">
            (1 easiest → 7 hardest)
          </span>
        </span>
        <span
          className="rounded-full border px-2.5 py-0.5 text-xs font-bold tabular-nums"
          style={{
            color: DIFFICULTY_LEVEL_HEX[level],
            background: DIFFICULTY_LEVEL_HEX[level] + "20",
            borderColor: DIFFICULTY_LEVEL_HEX[level] + "50",
          }}
        >
          {level} · {DIFFICULTY_LEVEL_LABELS[level]}
        </span>
      </div>
      <div className="mt-2 flex gap-1">
        {([1, 2, 3, 4, 5, 6, 7] as QuizDifficultyLevel[]).map((n) => {
          const active = level === n;
          return (
            <button
              key={n}
              type="button"
              onClick={() => onChange(n)}
              className={cn(
                "flex-1 rounded-lg border py-2 text-sm font-bold transition-colors",
                active
                  ? "text-white"
                  : "border-slate-700 text-slate-500 hover:border-slate-500 hover:text-slate-300"
              )}
              style={
                active
                  ? {
                      background: DIFFICULTY_LEVEL_HEX[n] + "35",
                      borderColor: DIFFICULTY_LEVEL_HEX[n],
                    }
                  : undefined
              }
            >
              {n}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── ImageAttachment — upload / replace / remove image on an existing question ──

function ImageAttachment({
  questionId,
  nodeId,
  imageUrl,
  imageStoragePath,
  imageAlt,
  onChanged,
}: {
  questionId: string;
  nodeId: string;
  imageUrl: string | null;
  imageStoragePath: string | null;
  imageAlt: string | null;
  onChanged: (url: string | null, path: string | null) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function handleFile(file: File) {
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("image", file);
      const { publicUrl } = await actionUploadQuestionImage(questionId, nodeId, fd, imageAlt);
      onChanged(publicUrl, `question-images/${questionId}/*`);
    } catch (err) {
      console.error(err);
      alert("Upload failed — check console.");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function handleRemove() {
    if (!confirm("Remove the image from this question?")) return;
    setBusy(true);
    try {
      await actionRemoveQuestionImage(questionId, nodeId, imageStoragePath);
      onChanged(null, null);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="mb-1 flex items-center gap-2">
        <ImageIcon className="h-3 w-3 text-slate-500" />
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Image</span>
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
      />
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => fileRef.current?.click()}
          disabled={busy}
          className="inline-flex items-center gap-1 rounded border border-slate-700 bg-slate-800 px-2 py-1 text-[11px] font-semibold text-slate-200 hover:bg-slate-700 disabled:opacity-60"
        >
          {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
          {imageUrl ? "Replace" : "Attach"}
        </button>
        {imageUrl && (
          <button
            onClick={handleRemove}
            disabled={busy}
            className="inline-flex items-center gap-1 rounded border border-rose-500/30 bg-rose-500/10 px-2 py-1 text-[11px] font-semibold text-rose-300 hover:bg-rose-500/20 disabled:opacity-60"
          >
            <X className="h-3 w-3" /> Remove
          </button>
        )}
      </div>
    </div>
  );
}
