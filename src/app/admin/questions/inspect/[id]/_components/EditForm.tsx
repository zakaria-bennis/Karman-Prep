"use client";

// ============================================================
// EditForm — the editable-fields form for Inspector edit mode.
// Plus its FieldGroup + Textarea helpers, kept here because
// they're only used by the form.
//
// The form's shape lives in `edit-form-utils.ts` so the parent
// component + the action handler can build patches without
// importing this whole component.
// ============================================================

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Upload, Trash2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { CONCEPT_SLUGS } from "@/lib/question-bank/taxonomy";
import {
  actionReplaceInspectedQuestionImage,
  actionRemoveInspectedQuestionImage,
} from "@/app/admin/inspector-actions";
import FigureFrame from "@/components/learn/FigureFrame";
import type { EditFormShape } from "./edit-form-utils";

// Flat list for the <datalist> autocomplete — keeps the input free-text
// (admin can paste in something we don't recognize; the server action
// will still update it) but offers all 89 valid slugs as suggestions.
const ALL_CONCEPT_SLUGS = CONCEPT_SLUGS.map((c) => c.slug).sort();

interface Props {
  form: EditFormShape;
  isMc: boolean;
  setForm: <K extends keyof EditFormShape>(key: K, value: EditFormShape[K]) => void;
  /** Needed for image replace/remove server actions. */
  questionId: string;
  /** Current figure URL (null when no figure attached). */
  currentImageUrl: string | null;
  /** Read-only: source PDF + page for the "View on page N" hint. */
  sourcePdf: string | null;
  sourcePage: number | null;
}

export default function EditForm({
  form,
  isMc,
  setForm,
  questionId,
  currentImageUrl,
  sourcePdf,
  sourcePage,
}: Props) {
  return (
    <div className="space-y-4">
      <p className="rounded-md bg-gold/[0.06] px-3 py-2 text-[11px] leading-relaxed text-gold-bright">
        Edit any field below and click <b>Save edits</b>. The page rerenders to the student view
        afterward. Findings stay until you resolve them — fixing the underlying issue doesn&apos;t
        auto-clear flags, since the audit script needs to re-scan to confirm. Wrap math in{" "}
        <code className="rounded bg-surface px-1">$…$</code> for KaTeX (e.g.{" "}
        <code className="rounded bg-surface px-1">$x^2$</code>).
      </p>

      {/* Passage block — show all four sub-fields for R&W */}
      <FieldGroup label="Passage intro (R&W literature)" hint="Italic source line, if any">
        <Textarea
          value={form.passage_intro}
          onChange={(v) => setForm("passage_intro", v)}
          rows={2}
        />
      </FieldGroup>
      <FieldGroup label="Passage" hint="Single-text R&W or math word-problem context">
        <Textarea value={form.passage} onChange={(v) => setForm("passage", v)} rows={5} />
      </FieldGroup>
      <FieldGroup label="Passage A (cross-text)" hint="First text of a paired-passage question">
        <Textarea value={form.passage_a} onChange={(v) => setForm("passage_a", v)} rows={5} />
      </FieldGroup>
      <FieldGroup label="Passage B (cross-text)" hint="Second text of a paired-passage question">
        <Textarea value={form.passage_b} onChange={(v) => setForm("passage_b", v)} rows={5} />
      </FieldGroup>

      {/* Figure replace / remove — in-product figure replacement,
          gap-list #16. Drives actionReplaceInspectedQuestionImage +
          actionRemoveInspectedQuestionImage. */}
      <FieldGroup
        label="Figure"
        hint={
          sourcePdf
            ? `Source: ${sourcePdf} page ${sourcePage ?? "?"} — open the PDF and screenshot the figure if you need a clean re-upload.`
            : "Upload a new figure to replace the current one."
        }
      >
        <FigureReplaceBlock
          questionId={questionId}
          currentImageUrl={currentImageUrl}
          currentAlt={form.image_alt}
        />
      </FieldGroup>

      <FieldGroup label="Image alt text" hint="Accessibility description for the figure">
        <Textarea value={form.image_alt} onChange={(v) => setForm("image_alt", v)} rows={2} />
      </FieldGroup>

      {/* Question stem — the most common fix */}
      <FieldGroup label="Question text *" hint="The question stem">
        <Textarea
          value={form.question_text}
          onChange={(v) => setForm("question_text", v)}
          rows={4}
        />
      </FieldGroup>

      {isMc ? (
        <FieldGroup label="Answer choices">
          <div className="space-y-2">
            {(["A", "B", "C", "D"] as const).map((letter) => {
              const key = `choice_${letter.toLowerCase()}` as keyof EditFormShape;
              const isCorrect = form.correct_answer === letter;
              return (
                <div key={letter} className="flex items-start gap-2">
                  <button
                    type="button"
                    onClick={() => setForm("correct_answer", letter)}
                    className={cn(
                      "mt-1 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-bold transition-colors",
                      isCorrect
                        ? "border-success/40 bg-success/20 text-success-bright"
                        : "border-bronze text-taupe hover:border-bronze hover:text-ivory"
                    )}
                    title="Mark this as the correct answer"
                  >
                    {letter}
                  </button>
                  <Textarea
                    value={form[key] as string}
                    onChange={(v) => setForm(key, v as EditFormShape[typeof key])}
                    rows={2}
                  />
                </div>
              );
            })}
          </div>
          <p className="mt-1.5 text-[10px] text-taupe">
            Click the A/B/C/D circle to mark the correct answer.
          </p>
        </FieldGroup>
      ) : (
        <>
          <FieldGroup label="Correct answer *" hint="Numeric value or expression (SPR)">
            <input
              type="text"
              value={form.correct_answer}
              onChange={(e) => setForm("correct_answer", e.target.value)}
              className="w-full rounded-md border border-bronze bg-night px-3 py-1.5 text-sm text-ivory focus:border-gold/40 focus:outline-none"
            />
          </FieldGroup>
          <FieldGroup label="Numeric tolerance" hint="± range (blank = exact match)">
            <input
              type="text"
              inputMode="decimal"
              value={form.numeric_tolerance}
              onChange={(e) => setForm("numeric_tolerance", e.target.value)}
              className="w-full rounded-md border border-bronze bg-night px-3 py-1.5 text-sm text-ivory focus:border-gold/40 focus:outline-none"
              placeholder="e.g. 0.01"
            />
          </FieldGroup>
        </>
      )}

      <FieldGroup label="Hint" hint="Methodological nudge — never the answer">
        <Textarea value={form.hint} onChange={(v) => setForm("hint", v)} rows={2} />
      </FieldGroup>
      <FieldGroup label="Explanation *" hint="Full walkthrough shown after the student answers">
        <Textarea
          value={form.explanation_text}
          onChange={(v) => setForm("explanation_text", v)}
          rows={6}
        />
      </FieldGroup>

      {/* Per-choice explanations (MC only) — feeds the
          explanation_per_choice JSONB column. Strongly encouraged for
          ≥60% of MC questions per the question-bank spec; the audit
          flags rows that are missing all four (D6_no_per_choice_expl). */}
      {isMc && (
        <FieldGroup
          label="Per-choice explanations"
          hint='Why each choice is right or wrong — name the trap pattern ("sign error", "switched units", "partial completion") for distractors'
        >
          <div className="space-y-2">
            {(["A", "B", "C", "D"] as const).map((letter) => {
              const key = `explanation_${letter.toLowerCase()}` as keyof EditFormShape;
              const isCorrect = form.correct_answer === letter;
              return (
                <div key={letter} className="flex items-start gap-2">
                  <span
                    className={cn(
                      "mt-1 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[10px] font-bold",
                      isCorrect
                        ? "border-success/60 bg-success/15 text-success-bright"
                        : "border-bronze text-taupe"
                    )}
                    title={isCorrect ? "Correct answer" : `Distractor ${letter}`}
                  >
                    {letter}
                  </span>
                  <Textarea
                    value={form[key] as string}
                    onChange={(v) => setForm(key, v as EditFormShape[typeof key])}
                    rows={2}
                  />
                </div>
              );
            })}
          </div>
        </FieldGroup>
      )}

      <FieldGroup label="Desmos strategy" hint="Calculator hint (optional, math only)">
        <Textarea
          value={form.desmos_strategy}
          onChange={(v) => setForm("desmos_strategy", v)}
          rows={2}
        />
      </FieldGroup>

      {/* Concept-slug picker — controls which Learn node the question
          belongs to. Misclassifications by Gemini end up in the wrong
          adaptive pool, so this is the single most impactful curation
          field after correct_answer. */}
      <FieldGroup
        label="Concept slug"
        hint="The 89-slug taxonomy from src/data/curriculum/*.ts. Wrong slug = wrong Learn node."
      >
        <input
          list="concept-slug-options"
          type="text"
          value={form.concept_slug}
          onChange={(e) => setForm("concept_slug", e.target.value)}
          className="w-full rounded-md border border-bronze bg-night px-3 py-1.5 font-mono text-xs text-ivory focus:border-gold/40 focus:outline-none"
          placeholder="e.g. linear-equations-one-variable"
        />
        <datalist id="concept-slug-options">
          {ALL_CONCEPT_SLUGS.map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>
      </FieldGroup>
    </div>
  );
}

function FieldGroup({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-ivory">
        {label}
        {hint && <span className="ml-1.5 font-normal normal-case text-taupe">— {hint}</span>}
      </label>
      {children}
    </div>
  );
}

function Textarea({
  value,
  onChange,
  rows = 3,
}: {
  value: string;
  onChange: (v: string) => void;
  rows?: number;
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      rows={rows}
      className="w-full resize-y rounded-md border border-bronze bg-night px-3 py-2 font-mono text-[12px] leading-snug text-ivory focus:border-gold/40 focus:outline-none"
    />
  );
}

// ─────────────────────────────────────────────────────────────
// FigureReplaceBlock — current figure preview + Replace + Remove.
// Drives actionReplaceInspectedQuestionImage + actionRemoveInspected
// QuestionImage. Lives next to EditForm because it's only used here.
//
// Reversibility: both server actions snapshot the row to
// question_history before mutating, so the Restore button in the
// HistoryPane can roll back a bad upload one-click.
// ─────────────────────────────────────────────────────────────
function FigureReplaceBlock({
  questionId,
  currentImageUrl,
  currentAlt,
}: {
  questionId: string;
  currentImageUrl: string | null;
  currentAlt: string;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<"uploading" | "removing" | null>(null);
  const [feedback, setFeedback] = useState<{
    kind: "success" | "error";
    message: string;
  } | null>(null);

  function openFilePicker() {
    fileInputRef.current?.click();
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy("uploading");
    setFeedback(null);
    startTransition(async () => {
      try {
        const fd = new FormData();
        fd.append("image", file);
        await actionReplaceInspectedQuestionImage(questionId, fd, currentAlt || null);
        setFeedback({
          kind: "success",
          message: `Replaced figure with ${file.name}. Save the form to keep your other edits.`,
        });
        router.refresh();
      } catch (err) {
        setFeedback({
          kind: "error",
          message: `Replace failed: ${err instanceof Error ? err.message : String(err)}`,
        });
      } finally {
        setBusy(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    });
  }

  function handleRemove() {
    if (!confirm("Remove the figure from this question? This is reversible from History.")) return;
    setBusy("removing");
    setFeedback(null);
    startTransition(async () => {
      try {
        await actionRemoveInspectedQuestionImage(questionId);
        setFeedback({ kind: "success", message: "Figure removed." });
        router.refresh();
      } catch (err) {
        setFeedback({
          kind: "error",
          message: `Remove failed: ${err instanceof Error ? err.message : String(err)}`,
        });
      } finally {
        setBusy(null);
      }
    });
  }

  return (
    <div className="space-y-2">
      {/* Current figure preview */}
      {currentImageUrl ? (
        <FigureFrame
          src={currentImageUrl}
          alt={currentAlt || "Current figure"}
          className="max-w-md"
          maxHeightClass="max-h-64"
        />
      ) : (
        <div className="rounded-md border border-dashed border-bronze bg-night/40 p-6 text-center text-xs text-taupe">
          No figure attached
        </div>
      )}

      {/* Replace / remove buttons */}
      <div className="flex items-center gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={handleFileChange}
        />
        <button
          type="button"
          onClick={openFilePicker}
          disabled={busy !== null}
          className="inline-flex items-center gap-1.5 rounded-md bg-gold/15 px-3 py-1.5 text-xs font-semibold text-gold-bright hover:bg-gold/25 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {busy === "uploading" ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Upload className="h-3.5 w-3.5" />
          )}
          {currentImageUrl ? "Replace figure" : "Upload figure"}
        </button>
        {currentImageUrl && (
          <button
            type="button"
            onClick={handleRemove}
            disabled={busy !== null}
            className="inline-flex items-center gap-1.5 rounded-md bg-error/15 px-3 py-1.5 text-xs font-semibold text-error-bright hover:bg-error/25 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {busy === "removing" ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Trash2 className="h-3.5 w-3.5" />
            )}
            Remove figure
          </button>
        )}
      </div>

      {feedback && (
        <div
          className={cn(
            "rounded-md border px-3 py-2 text-xs",
            feedback.kind === "success"
              ? "border-success/40 bg-success/[0.06] text-success-bright"
              : "border-error/40 bg-error/[0.06] text-error-bright"
          )}
        >
          {feedback.message}
        </div>
      )}

      <p className="text-[10px] text-taupe">
        Replacing the figure clears any extracted table data. PNG / JPEG / WebP supported.
      </p>
    </div>
  );
}
