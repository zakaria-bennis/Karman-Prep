"use client";

// ============================================================
// QuestionEditor — dark-themed, drag-reorderable, with hint field.
// ============================================================

import { Reorder } from "framer-motion";
import Image from "next/image";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { Plus, Trash2, ChevronDown, ChevronUp, GripVertical, Lightbulb, ImageIcon, X, Loader2, Upload } from "lucide-react";
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
  advanced:     "bg-orange-500/15 text-orange-300 border-orange-500/30",
  mastery:      "bg-rose-500/15 text-rose-300 border-rose-500/30",
};

const DIFF_LEFT_BORDER: Record<QuizDifficulty, string> = {
  foundational: "border-l-emerald-400",
  intermediate: "border-l-amber-400",
  advanced:     "border-l-orange-400",
  mastery:      "border-l-rose-400",
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
    const c: Record<QuizDifficulty, number> = { foundational: 0, intermediate: 0, advanced: 0, mastery: 0 };
    for (const q of questions) c[q.difficulty]++;
    return c;
  }, [questions]);

  const filteredQuestions = useMemo(
    () => filter === "all" ? questions : questions.filter((q) => q.difficulty === filter),
    [questions, filter]
  );

  function handleReorder(next: QuizQuestionWithChoices[]) {
    setQuestions(next);
    startTransition(async () => {
      try { await actionReorderQuestions(next.map((q) => q.id), nodeId); } catch (err) { console.error(err); }
    });
  }

  async function handleDifficultyChange(qid: string, d: QuizDifficulty) {
    setQuestions((qs) => qs.map((q) => (q.id === qid ? { ...q, difficulty: d } : q)));
    try { await actionUpdateQuestionDifficulty(qid, d, nodeId); }
    catch (err) { console.error(err); setQuestions(initialQuestions); }
  }

  async function handleDelete(qid: string) {
    if (!confirm("Delete this question? This cannot be undone.")) return;
    setQuestions((qs) => qs.filter((q) => q.id !== qid));
    try { await actionDeleteQuestion(qid, nodeId); }
    catch (err) { console.error(err); setQuestions(initialQuestions); }
  }

  function handleQuestionAdded(q: QuizQuestionWithChoices) {
    setQuestions((qs) => [...qs, q]);
    setShowAddForm(false);
  }

  return (
    <section>
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <div>
          <h2 className="text-base font-bold text-white">{questions.length} question{questions.length !== 1 ? "s" : ""}</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Target: ~100 per node. {viewMode === "list" ? "Drag the handle to reorder." : "Click a tab to view its details."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* View mode toggle */}
          <div className="inline-flex rounded-lg border border-slate-700 bg-slate-900 overflow-hidden text-xs">
            <button
              onClick={() => setViewMode("list")}
              className={cn("px-3 py-1.5 font-semibold", viewMode === "list" ? "bg-slate-800 text-white" : "text-slate-500 hover:text-slate-300")}
            >
              List
            </button>
            <button
              onClick={() => setViewMode("tabs")}
              className={cn("px-3 py-1.5 font-semibold border-l border-slate-700", viewMode === "tabs" ? "bg-slate-800 text-white" : "text-slate-500 hover:text-slate-300")}
            >
              Tabs
            </button>
          </div>
          <button
            onClick={() => setShowAddForm((v) => !v)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-500 hover:bg-indigo-400 text-white text-sm font-semibold"
          >
            <Plus className="w-3.5 h-3.5" /> {showAddForm ? "Cancel" : "New question"}
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
        <div className="mb-4 flex items-center gap-2 flex-wrap text-xs">
          <span className="font-semibold text-slate-500 uppercase tracking-wider">Filter:</span>
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
            <span className="text-slate-500 ml-2">
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
            setQuestions((qs) => qs.map((x) => x.id === qid ? { ...x, image_url: url, image_storage_path: path } : x));
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
                  setQuestions((qs) => qs.map((x) => x.id === q.id
                    ? { ...x, image_url: url, image_storage_path: path }
                    : x));
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
                    setQuestions((qs) => qs.map((x) => x.id === q.id
                      ? { ...x, image_url: url, image_storage_path: path }
                      : x));
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
      <div className="flex flex-wrap gap-1.5 p-2 rounded-xl border border-slate-800 bg-slate-900/40">
        {questions.map((q) => {
          const n = questionNumberMap.get(q.id) ?? 0;
          const hex = DIFFICULTY_LEVEL_HEX[(q.difficulty_level ?? 1) as QuizDifficultyLevel];
          const isActive = active?.id === q.id;
          return (
            <button
              key={q.id}
              onClick={() => onActiveChange(q.id)}
              className={cn(
                "min-w-[3.25rem] px-2 py-1.5 rounded-lg border text-xs font-bold tabular-nums transition-colors flex items-center gap-1.5",
                isActive ? "text-white" : "text-slate-400 hover:text-slate-200"
              )}
              style={isActive ? {
                background: hex + "30",
                borderColor: hex,
              } : {
                background: hex + "12",
                borderColor: hex + "30",
              }}
              title={q.question_text.slice(0, 80)}
            >
              <span>Q{n}</span>
              <span className="opacity-60" style={{ color: hex }}>·{q.difficulty_level ?? 1}</span>
              {q.image_url && <ImageIcon className="w-2.5 h-2.5 opacity-70" />}
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
          onDelete={() => { onDelete(active.id); onActiveChange(null); }}
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
  advanced:     "#fb923c",
  mastery:      "#fb7185",
};

function FilterChip({ label, active, onClick, hex }: { label: string; active: boolean; onClick: () => void; hex: string }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "px-2.5 py-1 rounded-full font-semibold border transition-colors capitalize",
        active
          ? "text-white"
          : "text-slate-400 border-slate-700 hover:text-slate-200 hover:border-slate-600"
      )}
      style={active ? {
        background: hex + "30",
        borderColor: hex + "60",
        color: hex,
      } : undefined}
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
      className={cn("rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden border-l-4")}
      style={{ borderLeftColor: levelHex }}
    >
      <header className="flex items-start gap-3 p-4">
        {dragDisabled
          ? <div className="w-4 shrink-0" />
          : <GripVertical className="w-4 h-4 mt-1 text-slate-500 cursor-grab active:cursor-grabbing shrink-0" />
        }
        {/* Question number badge */}
        <span className="shrink-0 text-[11px] font-bold tabular-nums rounded-md px-1.5 py-0.5 bg-slate-800 text-slate-300 mt-0.5">
          Q{questionNumber}
        </span>
        <div className="flex-1 min-w-0">
          {/* Image thumbnail */}
          {question.image_url && (
            <div className="mb-2 rounded-lg overflow-hidden border border-slate-700 bg-slate-900 inline-block max-w-xs">
              <Image
                src={question.image_url}
                alt={question.image_alt ?? ""}
                width={280}
                height={180}
                className="object-contain max-h-40 w-auto"
                unoptimized
              />
            </div>
          )}
          <p className="text-sm text-slate-100 font-medium leading-relaxed whitespace-pre-wrap">
            {question.question_text}
          </p>
          <div className="mt-2 flex items-center gap-2 flex-wrap text-[11px]">
            <span
              className="px-2 py-0.5 rounded-full font-bold border tabular-nums"
              style={{ color: levelHex, background: levelHex + "15", borderColor: levelHex + "40" }}
            >
              Lv {level}
            </span>
            {isNumeric && (
              <span className="px-2 py-0.5 rounded-full font-semibold border border-sky-500/30 bg-sky-500/10 text-sky-300">
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
                <Lightbulb className="w-3 h-3" /> hint
              </span>
            )}
            {question.flag_count > 0 && (
              <span className="text-rose-400">⚑ {question.flag_count}</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <select
            value={level}
            onChange={(e) => {
              const lv = Number(e.target.value) as QuizDifficultyLevel;
              const legacy: QuizDifficulty =
                lv <= 2 ? "foundational" :
                lv <= 4 ? "intermediate" :
                lv <= 6 ? "advanced" :
                          "mastery";
              onDifficultyChange(legacy);
              // Also sync the numeric level to DB via the existing action endpoint:
              // (we re-use the legacy difficulty writer; for full 1-7 persistence
              // a new write happens on the next card render via quiz query)
              actionUpdateQuestionDifficultyLevel(question.id, lv).catch(console.error);
            }}
            className="text-xs rounded border border-slate-700 bg-slate-800 text-slate-200 px-2 py-1 tabular-nums"
          >
            {[1, 2, 3, 4, 5, 6, 7].map((n) => (
              <option key={n} value={n}>Level {n}</option>
            ))}
          </select>
          {!forceExpanded && (
            <button
              onClick={() => setExpanded((v) => !v)}
              className="p-1.5 rounded hover:bg-slate-800 text-slate-500"
            >
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          )}
          <button
            onClick={onDelete}
            className="p-1.5 rounded hover:bg-rose-500/15 text-rose-400"
            aria-label="Delete"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* For numeric questions, show a single answer box instead of the 4-choice grid */}
      {isNumeric ? (
        <div className="px-4 pb-4">
          <div className="rounded-lg border border-sky-500/30 bg-sky-500/5 px-3 py-2">
            <p className="text-[11px] font-bold text-sky-300 uppercase tracking-wider">Correct value</p>
            <p className="text-sm text-slate-100 font-mono mt-0.5">{question.correct_answer}</p>
          </div>
        </div>
      ) : (
      <div className="px-4 pb-4 grid grid-cols-2 gap-2 text-xs">
        {sortedChoices.map((c) => (
          <div
            key={c.letter}
            className={cn(
              "rounded border px-2.5 py-1.5 flex items-start gap-2",
              c.is_correct
                ? "border-emerald-400/50 bg-emerald-500/10"
                : "border-slate-800 bg-slate-900/70"
            )}
          >
            <span className={cn("font-bold shrink-0", c.is_correct ? "text-emerald-300" : "text-slate-400")}>{c.letter}.</span>
            <span className="text-slate-200 line-clamp-2">{c.choice_text}</span>
          </div>
        ))}
      </div>
      )}

      {expanded && (
        <div className="px-4 pb-4 border-t border-slate-800 pt-3 space-y-3 text-xs">
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
              <span className="font-bold text-amber-400/80 uppercase tracking-wider text-[10px]">Hint:</span>
              <p className="mt-1 text-slate-300 whitespace-pre-wrap">{question.hint}</p>
            </div>
          )}
          <div>
            <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">Explanation:</span>
            <p className="mt-1 text-slate-300 whitespace-pre-wrap">{question.explanation_text}</p>
          </div>
          {question.explanation_per_choice && (
            <div>
              <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">Per-choice:</span>
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
              <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">Desmos strategy:</span>
              <p className="mt-1 text-slate-300 whitespace-pre-wrap">{question.desmos_strategy}</p>
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
  const [choices, setChoices] = useState<Record<AnswerLetter, string>>({ A: "", B: "", C: "", D: "" });
  const [correctAnswer, setCorrectAnswer] = useState<AnswerLetter>("A");
  const [numericAnswer, setNumericAnswer] = useState("");
  const [numericTolerance, setNumericTolerance] = useState("");
  const [difficultyLevel, setDifficultyLevel] = useState<1 | 2 | 3 | 4 | 5 | 6 | 7>(1);
  const [cluster, setCluster] = useState(topicCluster);
  const [hint, setHint] = useState("");
  const [explanation, setExplanation] = useState("");
  const [perChoice, setPerChoice] = useState<Record<AnswerLetter, string>>({ A: "", B: "", C: "", D: "" });
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

  const inputClass = "w-full rounded-lg border border-slate-700 bg-slate-900 text-slate-100 px-3 py-2 text-sm placeholder:text-slate-600 focus:outline-none focus:border-indigo-500";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const questionType: QuizQuestionType =
      subject === "reading" ? "evidence_based" : "math_computation";
    const hasPerChoice =
      subject === "reading" && Object.values(perChoice).some((v) => v.trim());

    try {
      // Map 1–7 level to legacy enum for back-compat
      const legacyDifficulty: QuizDifficulty =
        difficultyLevel <= 2 ? "foundational" :
        difficultyLevel <= 4 ? "intermediate" :
        difficultyLevel <= 6 ? "advanced" :
                               "mastery";
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
        explanation_per_choice: hasPerChoice && answerFormat === "multiple_choice" ? perChoice : null,
        hint: hint.trim() || null,
        subject,
        topic_cluster: cluster.trim() || topicCluster,
        desmos_strategy: subject === "math" && desmosStrategy.trim() ? desmosStrategy.trim() : null,
        display_order: currentCount,
        choices: answerFormat === "numeric_entry" ? [] : LETTERS.map((letter) => ({ letter, choice_text: choices[letter].trim() })),
      });

      // If an image was attached, upload it now and merge the URL into the returned question
      if (imageFile) {
        try {
          const fd = new FormData();
          fd.append("image", imageFile);
          const { publicUrl } = await actionUploadQuestionImage(q.id, nodeId, fd, imageAlt.trim() || null);
          q.image_url = publicUrl;
          q.image_alt = imageAlt.trim() || null;
        } catch (imgErr) {
          console.error(imgErr);
          alert("Question saved but image upload failed. You can attach it later from the expanded view.");
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
    <form onSubmit={handleSubmit} className="mb-5 rounded-xl border border-indigo-500/30 bg-indigo-500/5 p-5 space-y-4">
      <h3 className="text-sm font-bold text-white">New question</h3>

      {/* Answer format toggle (MC vs numeric) */}
      {subject === "math" && (
        <Field label="Answer format" helper="Numeric entry is typed in by the student — no A/B/C/D choices.">
          <div className="inline-flex rounded-lg border border-slate-700 bg-slate-900 overflow-hidden">
            <button
              type="button"
              onClick={() => setAnswerFormat("multiple_choice")}
              className={cn(
                "px-4 py-1.5 text-xs font-semibold",
                answerFormat === "multiple_choice" ? "bg-indigo-500 text-white" : "text-slate-400 hover:text-slate-200"
              )}
            >
              Multiple choice
            </button>
            <button
              type="button"
              onClick={() => setAnswerFormat("numeric_entry")}
              className={cn(
                "px-4 py-1.5 text-xs font-semibold border-l border-slate-700",
                answerFormat === "numeric_entry" ? "bg-indigo-500 text-white" : "text-slate-400 hover:text-slate-200"
              )}
            >
              Numeric entry
            </button>
          </div>
        </Field>
      )}

      <Field label="Question text" helper="Supports LaTeX — wrap inline math in $ … $, block in $$ … $$. Paste a screenshot (Cmd+V) to attach an image.">
        <textarea required value={questionText} onChange={(e) => setQuestionText(e.target.value)} onPaste={handleImagePaste} rows={3} className={cn(inputClass, "font-mono text-[13px]")} placeholder="e.g. Solve for x in $2x + 5 = 17$" />
      </Field>

      {/* Optional image — table screenshot, graph, figure */}
      <Field label="Image (optional)" helper="Attach a table, graph, or figure. Appears above the question text. You can also paste a screenshot directly into any text field.">
        <div className="flex items-center gap-3 flex-wrap">
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
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-100 text-xs font-semibold hover:bg-slate-700"
          >
            <ImageIcon className="w-3.5 h-3.5" /> {imageFile ? "Change image" : "Choose image"}
          </button>
          {imageFile && (
            <>
              <span className="text-xs text-slate-400 truncate max-w-xs">{imageFile.name || "Pasted image"}</span>
              <button type="button" onClick={() => { setImageFromFile(null); if (imageInputRef.current) imageInputRef.current.value = ""; }} className="text-rose-400 hover:text-rose-300 text-xs">
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
                <input required value={choices[letter]} onChange={(e) => setChoices((c) => ({ ...c, [letter]: e.target.value }))} className={inputClass} />
              </Field>
            ))}
          </div>
          <Field label="Correct answer">
            <div className="flex gap-3 pt-1">
              {LETTERS.map((l) => (
                <label key={l} className="flex items-center gap-1 text-sm cursor-pointer text-slate-200">
                  <input type="radio" name="correct" value={l} checked={correctAnswer === l} onChange={() => setCorrectAnswer(l)} />
                  {l}
                </label>
              ))}
            </div>
          </Field>
        </>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <Field label="Correct value" helper="Accepts decimals (3.14) or fractions (1/2). Numbers must match exactly within the tolerance below.">
            <input required value={numericAnswer} onChange={(e) => setNumericAnswer(e.target.value)} className={inputClass} placeholder="e.g. 3.14 or 1/2" />
          </Field>
          <Field label="Tolerance ± (optional)" helper="Accept answers within this distance of the correct value. Leave empty for an exact match.">
            <input type="number" step="any" value={numericTolerance} onChange={(e) => setNumericTolerance(e.target.value)} className={inputClass} placeholder="e.g. 0.01" />
          </Field>
        </div>
      )}

      {/* Difficulty slider 1-7 */}
      <DifficultyLevelField level={difficultyLevel} onChange={setDifficultyLevel} />

      <Field label="Topic cluster">
        <input value={cluster} onChange={(e) => setCluster(e.target.value)} className={inputClass} />
      </Field>

      <Field label="Hint (optional)" helper="Shown to students while answering — a small nudge.">
        <textarea value={hint} onChange={(e) => setHint(e.target.value)} onPaste={handleImagePaste} rows={2} className={inputClass} placeholder="e.g. 'Try plugging each answer choice back into the original equation.'" />
      </Field>

      <Field label="Explanation (required)" helper="Full explanation shown after a wrong answer. Paste a screenshot (Cmd+V) to attach an image.">
        <textarea required value={explanation} onChange={(e) => setExplanation(e.target.value)} onPaste={handleImagePaste} rows={3} className={inputClass} />
      </Field>

      {subject === "reading" && answerFormat === "multiple_choice" && (
        <div className="grid grid-cols-2 gap-3">
          {LETTERS.map((letter) => (
            <Field key={letter} label={`Why ${letter} is ${letter === correctAnswer ? "right" : "wrong"}`}>
              <textarea value={perChoice[letter]} onChange={(e) => setPerChoice((c) => ({ ...c, [letter]: e.target.value }))} onPaste={handleImagePaste} rows={2} className={inputClass} />
            </Field>
          ))}
        </div>
      )}

      {subject === "math" && (
        <Field label="Desmos strategy (optional)">
          <textarea value={desmosStrategy} onChange={(e) => setDesmosStrategy(e.target.value)} onPaste={handleImagePaste} rows={2} className={inputClass} placeholder="Step-by-step Desmos approach for this question type." />
        </Field>
      )}

      <div className="flex justify-end gap-2 pt-2">
        <button type="button" onClick={onCancel} className="px-4 py-2 rounded-lg text-sm font-semibold text-slate-400 hover:bg-slate-800">Cancel</button>
        <button type="submit" disabled={!valid || submitting} className={cn("px-5 py-2 rounded-lg text-sm font-bold text-white bg-indigo-500", (!valid || submitting) ? "opacity-50 cursor-not-allowed" : "hover:bg-indigo-400")}>
          {submitting ? "Adding…" : "Add question"}
        </button>
      </div>
    </form>
  );
}

function Field({ label, helper, children }: { label: string; helper?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{label}</span>
      {helper && <span className="block text-[10px] text-slate-500 mt-0.5 mb-1">{helper}</span>}
      <div className={helper ? "" : "mt-1"}>{children}</div>
    </label>
  );
}

// ── 1-7 Difficulty field ─────────────────────────────────────

import { DIFFICULTY_LEVEL_HEX, DIFFICULTY_LEVEL_LABELS, type QuizDifficultyLevel } from "@/types/quiz";

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
        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
          Difficulty level <span className="text-slate-600 ml-1 tracking-normal normal-case">(1 easiest → 7 hardest)</span>
        </span>
        <span
          className="text-xs font-bold px-2.5 py-0.5 rounded-full border tabular-nums"
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
                "flex-1 py-2 rounded-lg border font-bold text-sm transition-colors",
                active
                  ? "text-white"
                  : "text-slate-500 border-slate-700 hover:border-slate-500 hover:text-slate-300"
              )}
              style={active ? {
                background: DIFFICULTY_LEVEL_HEX[n] + "35",
                borderColor: DIFFICULTY_LEVEL_HEX[n],
              } : undefined}
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
      <div className="flex items-center gap-2 mb-1">
        <ImageIcon className="w-3 h-3 text-slate-500" />
        <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">Image</span>
      </div>
      <input ref={fileRef} type="file" accept="image/*" className="hidden"
        onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={() => fileRef.current?.click()}
          disabled={busy}
          className="inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-800 border border-slate-700 text-slate-200 text-[11px] font-semibold hover:bg-slate-700 disabled:opacity-60"
        >
          {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
          {imageUrl ? "Replace" : "Attach"}
        </button>
        {imageUrl && (
          <button
            onClick={handleRemove}
            disabled={busy}
            className="inline-flex items-center gap-1 px-2 py-1 rounded border border-rose-500/30 bg-rose-500/10 text-rose-300 text-[11px] font-semibold hover:bg-rose-500/20 disabled:opacity-60"
          >
            <X className="w-3 h-3" /> Remove
          </button>
        )}
      </div>
    </div>
  );
}
