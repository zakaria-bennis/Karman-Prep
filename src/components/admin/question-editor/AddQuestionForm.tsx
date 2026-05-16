"use client";

// ============================================================
// AddQuestionForm — the modal form used when admins click "Add
// question". Owns its own draft state for question text, choices,
// numeric answer, difficulty, explanations, hint, and Desmos
// strategy. Calls actionAddQuestion on submit and bubbles the new
// question up to the parent via onAdded.
//
// Local helpers used only here:
//   · Field — labeled wrapper for inputs/textareas.
//   · DifficultyLevelField — 1-7 difficulty picker.
// ============================================================

import { useEffect, useRef, useState } from "react";
import { ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  AnswerLetter,
  QuizDifficulty,
  QuizDifficultyLevel,
  QuizQuestionType,
  QuizQuestionWithChoices,
} from "@/types/quiz";
import { DIFFICULTY_LEVEL_HEX, DIFFICULTY_LEVEL_LABELS } from "@/types/quiz";
import type { Subject } from "@/data/curriculum";
import { actionAddQuestion, actionUploadQuestionImage } from "@/app/admin/actions";

const LETTERS: AnswerLetter[] = ["A", "B", "C", "D"];

export function AddQuestionForm({
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
    "w-full rounded-lg border border-slate-700 bg-slate-900 text-slate-100 px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:border-indigo-500";

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
          // `imagePreviewUrl` is always a `blob:` URL from
          // URL.createObjectURL — local, ephemeral, never travels
          // to the optimizer. next/image with `unoptimized` would
          // still need explicit width/height, but the user-uploaded
          // file is arbitrary aspect ratio. Plain <img> with
          // intrinsic sizing is the right tool here.
          // eslint-disable-next-line @next/next/no-img-element
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
      {helper && <span className="mb-1 mt-0.5 block text-[10px] text-slate-400">{helper}</span>}
      <div className={helper ? "" : "mt-1"}>{children}</div>
    </label>
  );
}
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
          <span className="ml-1 normal-case tracking-normal text-slate-400">
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
                  : "border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-300"
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
