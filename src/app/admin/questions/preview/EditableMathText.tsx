"use client";

// ============================================================
// EditableMathText — Notion-style click-to-edit wrapper around
// MathText. View mode renders the LaTeX as the student would
// see it; click → swaps to a textarea showing the RAW source
// (so the admin edits `\sin(x)` not the rendered glyph). On
// blur (or ⌘↵), saves and re-renders.
//
// Used in the preview page's QuestionPreview + PreviewSidePanel
// to make every text field editable while keeping the student
// view pixel-faithful when nobody's editing.
//
// Companion to InlineTextEdit in @/components/admin — that one
// renders raw text in view mode (good for plain fields like
// hint where no math markup exists). This one renders KaTeX in
// view mode (right for question_text, explanations, passages).
// ============================================================

import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import MathText from "@/components/learn/MathText";

interface Props {
  value: string;
  onSave: (next: string) => Promise<void>;
  /** Visual classes for the wrapper around MathText in view mode. */
  className?: string;
  /** Allow saving an empty string (defaults to false). */
  allowEmpty?: boolean;
  /** Disable editing entirely. */
  readOnly?: boolean;
  /** Placeholder shown when value is empty + editable. */
  placeholder?: string;
}

export function EditableMathText({
  value,
  onSave,
  className,
  allowEmpty = false,
  readOnly = false,
  placeholder = "(click to add)",
}: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (!editing) setDraft(value);
  }, [value, editing]);

  useEffect(() => {
    if (editing && textareaRef.current) {
      const el = textareaRef.current;
      el.style.height = "auto";
      el.style.height = `${el.scrollHeight}px`;
      el.focus();
      const len = el.value.length;
      el.setSelectionRange(len, len);
    }
  }, [editing]);

  // Re-grow on subsequent typing.
  useEffect(() => {
    if (editing && textareaRef.current) {
      const el = textareaRef.current;
      el.style.height = "auto";
      el.style.height = `${el.scrollHeight}px`;
    }
  }, [editing, draft]);

  async function commit() {
    if (!editing) return;
    if (draft === value) {
      setEditing(false);
      return;
    }
    if (!allowEmpty && draft.trim() === "") {
      setDraft(value);
      setEditing(false);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSave(draft);
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  function cancel() {
    setDraft(value);
    setError(null);
    setEditing(false);
  }

  if (readOnly || !editing) {
    const empty = !value || value.trim() === "";
    return (
      <span
        role={readOnly ? undefined : "button"}
        tabIndex={readOnly ? undefined : 0}
        onClick={() => !readOnly && setEditing(true)}
        onKeyDown={(e) => {
          if (readOnly) return;
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setEditing(true);
          }
        }}
        className={cn(
          className,
          !readOnly &&
            "cursor-text rounded-sm hover:bg-slate-700/20 focus:bg-slate-700/30 focus:outline-none"
        )}
        aria-label={readOnly ? undefined : "Edit text"}
      >
        {empty ? (
          <span className="italic text-slate-500">{placeholder}</span>
        ) : (
          <MathText text={value} />
        )}
      </span>
    );
  }

  return (
    <span className="block">
      <textarea
        ref={textareaRef}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
            e.preventDefault();
            commit();
          }
          if (e.key === "Escape") {
            e.preventDefault();
            cancel();
          }
        }}
        disabled={saving}
        placeholder={placeholder}
        rows={1}
        className={cn(
          className,
          "block w-full resize-none overflow-hidden rounded-md border border-indigo-500/60 bg-slate-950 px-2 py-1 font-mono text-[14px] text-slate-100",
          error && "border-rose-500"
        )}
      />
      <span className="mt-1 flex items-center gap-2 text-[10px] text-slate-500">
        {saving ? (
          <span className="inline-flex items-center gap-1 text-indigo-300">
            <Loader2 className="h-3 w-3 animate-spin" /> saving…
          </span>
        ) : (
          <span>
            <kbd className="rounded bg-slate-800 px-1 font-mono">⌘↵</kbd> save ·{" "}
            <kbd className="rounded bg-slate-800 px-1 font-mono">Esc</kbd> cancel · raw markup
            (LaTeX renders on save)
          </span>
        )}
        {error && <span className="text-rose-300">{error}</span>}
      </span>
    </span>
  );
}
