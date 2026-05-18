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

import { cn } from "@/lib/utils";
import type { EditFormShape } from "./edit-form-utils";

interface Props {
  form: EditFormShape;
  isMc: boolean;
  setForm: <K extends keyof EditFormShape>(key: K, value: EditFormShape[K]) => void;
}

export default function EditForm({ form, isMc, setForm }: Props) {
  return (
    <div className="space-y-4">
      <p className="rounded-md bg-violet-500/[0.06] px-3 py-2 text-[11px] leading-relaxed text-violet-200">
        Edit any field below and click <b>Save edits</b>. The page rerenders to the student view
        afterward. Findings stay until you resolve them — fixing the underlying issue doesn&apos;t
        auto-clear flags, since the audit script needs to re-scan to confirm. Wrap math in{" "}
        <code className="rounded bg-slate-900 px-1">$…$</code> for KaTeX (e.g.{" "}
        <code className="rounded bg-slate-900 px-1">$x^2$</code>).
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

      {/* Image alt (figure replacement deferred to v2) */}
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
                        ? "border-emerald-500 bg-emerald-500/20 text-emerald-300"
                        : "border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-200"
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
          <p className="mt-1.5 text-[10px] text-slate-500">
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
              className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-1.5 text-sm text-slate-200 focus:border-violet-500 focus:outline-none"
            />
          </FieldGroup>
          <FieldGroup label="Numeric tolerance" hint="± range (blank = exact match)">
            <input
              type="text"
              inputMode="decimal"
              value={form.numeric_tolerance}
              onChange={(e) => setForm("numeric_tolerance", e.target.value)}
              className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-1.5 text-sm text-slate-200 focus:border-violet-500 focus:outline-none"
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
      <FieldGroup label="Desmos strategy" hint="Calculator hint (optional, math only)">
        <Textarea
          value={form.desmos_strategy}
          onChange={(v) => setForm("desmos_strategy", v)}
          rows={2}
        />
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
      <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-slate-300">
        {label}
        {hint && <span className="ml-1.5 font-normal normal-case text-slate-500">— {hint}</span>}
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
      className="w-full resize-y rounded-md border border-slate-700 bg-slate-950 px-3 py-2 font-mono text-[12px] leading-snug text-slate-200 focus:border-violet-500 focus:outline-none"
    />
  );
}
