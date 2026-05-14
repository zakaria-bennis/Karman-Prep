"use client";

// ============================================================
// QuestionCard — single-question row in the QuestionEditor list.
// Renders the question text, choices, current difficulty, and an
// expand toggle for the full edit panel (delete + image attach
// + difficulty-level picker live in the expanded view).
//
// Local helpers used only here:
//   · ImageAttachment — upload / replace / remove the question image.
// ============================================================

import { useMemo, useRef, useState } from "react";
import Image from "next/image";
import {
  ChevronDown,
  ChevronUp,
  GripVertical,
  ImageIcon,
  Lightbulb,
  Loader2,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  AnswerLetter,
  QuizDifficulty,
  QuizDifficultyLevel,
  QuizQuestionWithChoices,
} from "@/types/quiz";
import { DIFFICULTY_LEVEL_HEX } from "@/types/quiz";
import {
  actionRemoveQuestionImage,
  actionUpdateQuestionDifficultyLevel,
  actionUploadQuestionImage,
} from "@/app/admin/actions";

const LETTERS: AnswerLetter[] = ["A", "B", "C", "D"];

export function QuestionCard({
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
