"use client";

// ============================================================
// InlineTextEdit — click-to-edit-in-place primitive.
//
// Renders `value` in `viewClassName` styling. Click → swaps to
// a textarea (or single-line input) prefilled with the same
// value. On blur, calls onSave(newValue) if it changed.
// Cmd/Ctrl+Enter also commits; Esc cancels without saving.
//
// While saving, the textarea is disabled and a small spinner
// appears in the corner. Errors surface inline via a one-shot
// red border + error text below; clears on next focus.
//
// Notes:
//   · This intentionally does NOT use a portal — the textarea
//     replaces the rendered text in-place so the surrounding
//     layout doesn't shift.
//   · Long text uses textarea (auto-grows to content). Single
//     line + dense layouts use input (`mode="line"`).
//   · `placeholder` is shown only when value is empty. An empty
//     value still renders as a "click to add" hint so the admin
//     can see editable slots even when there's no content.
// ============================================================

import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  value: string;
  onSave: (next: string) => Promise<void>;
  /** Allow saving an empty string. Defaults to false (treats clearing
   *  as a no-op so the admin doesn't accidentally wipe a field). */
  allowEmpty?: boolean;
  /** Visual mode. "line" = single-line input, "block" = textarea. */
  mode?: "line" | "block";
  placeholder?: string;
  /** Classes applied to the display span when NOT editing. Should
   *  match whatever the surrounding render uses so editing in/out
   *  feels seamless. */
  viewClassName?: string;
  /** Optional classes on the editing input (mostly for sizing). */
  editClassName?: string;
  /** Disable editing entirely (read-only mode). */
  readOnly?: boolean;
  /** Aria label for accessibility — defaults to "Edit text". */
  ariaLabel?: string;
}

export function InlineTextEdit({
  value,
  onSave,
  allowEmpty = false,
  mode = "block",
  placeholder,
  viewClassName,
  editClassName,
  readOnly = false,
  ariaLabel = "Edit text",
}: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Keep draft in sync if the underlying value changes externally
  // (e.g. router.refresh after a save), but only when not editing
  // — otherwise an in-flight typing session would get clobbered.
  useEffect(() => {
    if (!editing) setDraft(value);
  }, [value, editing]);

  // Auto-size the textarea to its content.
  useEffect(() => {
    if (editing && textareaRef.current) {
      const el = textareaRef.current;
      el.style.height = "auto";
      el.style.height = `${el.scrollHeight}px`;
    }
  }, [editing, draft]);

  // Autofocus when entering edit mode.
  useEffect(() => {
    if (!editing) return;
    const el = mode === "line" ? inputRef.current : textareaRef.current;
    if (el) {
      el.focus();
      // Move caret to end so the admin can keep typing without
      // having to manually click past existing text.
      const len = el.value.length;
      el.setSelectionRange(len, len);
    }
  }, [editing, mode]);

  async function commit() {
    if (!editing) return;
    const next = draft;
    if (next === value) {
      setEditing(false);
      return;
    }
    if (!allowEmpty && next.trim() === "") {
      // Bail without erroring — admin clearly didn't mean to wipe.
      setDraft(value);
      setEditing(false);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSave(next);
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
    const empty = value.trim() === "";
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
          viewClassName,
          !readOnly &&
            "cursor-text rounded-sm decoration-dotted underline-offset-2 hover:bg-slate-700/30 focus:bg-slate-700/40 focus:outline-none",
          empty && !readOnly && "italic text-slate-500"
        )}
        aria-label={readOnly ? undefined : ariaLabel}
      >
        {empty ? (placeholder ?? "(click to add)") : value}
      </span>
    );
  }

  return (
    <span className="inline-block w-full">
      {mode === "line" ? (
        <input
          ref={inputRef}
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
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
          aria-label={ariaLabel}
          className={cn(
            "w-full rounded-md border border-indigo-500/60 bg-slate-950 px-2 py-1 text-inherit",
            error && "border-rose-500",
            editClassName
          )}
        />
      ) : (
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
          aria-label={ariaLabel}
          rows={1}
          className={cn(
            "w-full resize-none overflow-hidden rounded-md border border-indigo-500/60 bg-slate-950 px-2 py-1 text-inherit",
            error && "border-rose-500",
            editClassName
          )}
        />
      )}
      <span className="mt-1 flex items-center gap-2 text-[10px] text-slate-500">
        {saving && (
          <span className="inline-flex items-center gap-1 text-indigo-300">
            <Loader2 className="h-3 w-3 animate-spin" /> saving…
          </span>
        )}
        {!saving && (
          <span>
            <kbd className="rounded bg-slate-800 px-1 font-mono">
              {mode === "line" ? "Enter" : "⌘↵"}
            </kbd>{" "}
            save · <kbd className="rounded bg-slate-800 px-1 font-mono">Esc</kbd> cancel
          </span>
        )}
        {error && <span className="text-rose-300">{error}</span>}
      </span>
    </span>
  );
}
