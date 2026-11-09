"use client";

// ============================================================
// EditedChip — small ✏️ indicator that appears next to a field
// that has at least one entry in question_history. Click it to
// open a popover with the most recent edits for THIS field.
//
// Two-stage loading:
//   1. Server component knows the question_id and the set of
//      fields that have history (cheap — passed in as a Set).
//      The chip renders or doesn't render based on that.
//   2. When clicked, the popover fetches the full history list
//      via a server action (lazy — admins rarely click).
//
// PHASE 3 KEEPS THE POPOVER MINIMAL: just a list of edits with
// before / after of THIS field. Full restore + cross-field diff
// already exists on /admin/questions/inspect/[id] — the chip
// can link there if the admin wants more.
// ============================================================

import { useEffect, useRef, useState } from "react";
import { Pencil, Loader2, X, ExternalLink } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { actionGetFieldHistory } from "@/app/admin/actions";

interface EditEntry {
  id: string;
  createdAt: string;
  editedBy: string;
  source: string;
  before: string;
  after: string;
}

interface Props {
  questionId: string;
  fieldKey: string;
  /** Optional label to display in the popover header (defaults to fieldKey). */
  fieldLabel?: string;
}

export function EditedChip({ questionId, fieldKey, fieldLabel }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [entries, setEntries] = useState<EditEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);

  // Close on outside click (cheap dismissal — no overlay).
  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (!popoverRef.current) return;
      if (!popoverRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  async function loadHistory() {
    if (entries) return; // already loaded; cache for this popover session
    setLoading(true);
    setError(null);
    try {
      const rows = await actionGetFieldHistory(questionId, fieldKey);
      setEntries(rows);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load history.");
    } finally {
      setLoading(false);
    }
  }

  function toggle() {
    if (open) {
      setOpen(false);
      return;
    }
    setOpen(true);
    void loadHistory();
  }

  return (
    <span className="relative inline-block align-middle">
      <button
        onClick={toggle}
        className={cn(
          "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider",
          open
            ? "bg-[color-mix(in_srgb,var(--accent)_20%,transparent)] text-[color:var(--accent-text)]"
            : "bg-[color:var(--raised)] text-[color:var(--mute)] hover:bg-[color:var(--raised)] hover:text-[color:var(--ink)]"
        )}
        title={`See edit history for ${fieldLabel ?? fieldKey}`}
        aria-expanded={open}
      >
        <Pencil className="h-2.5 w-2.5" />
        edited
      </button>
      {open && (
        <div
          ref={popoverRef}
          className="absolute right-0 top-full z-40 mt-1 w-[420px] rounded-xl border border-[color:var(--line)] bg-[color:var(--sunk)] p-3 shadow-2xl shadow-black/70"
        >
          <header className="mb-2 flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-[color:var(--accent-text)]">
              Edit history · {fieldLabel ?? fieldKey}
            </span>
            <Link
              href={`/admin/questions/inspect/${questionId}`}
              className="ml-auto inline-flex items-center gap-1 rounded border border-[color:var(--line)] px-1.5 py-0.5 text-[10px] text-[color:var(--mute)] hover:border-[color:var(--line)] hover:text-[color:var(--ink)]"
              title="Open the full inspector with restore"
            >
              <ExternalLink className="h-2.5 w-2.5" />
              Inspect
            </Link>
            <button
              onClick={() => setOpen(false)}
              className="text-[color:var(--mute)] hover:text-[color:var(--ink)]"
              aria-label="Close edit history"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </header>
          <HistoryBody loading={loading} error={error} entries={entries} />
        </div>
      )}
    </span>
  );
}

function HistoryBody({
  loading,
  error,
  entries,
}: {
  loading: boolean;
  error: string | null;
  entries: EditEntry[] | null;
}) {
  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-6 text-xs text-[color:var(--mute)]">
        <Loader2 className="h-3 w-3 animate-spin" /> loading…
      </div>
    );
  }
  if (error) {
    return <div className="px-1 py-2 text-xs text-[color:var(--late)]">{error}</div>;
  }
  if (!entries || entries.length === 0) {
    return (
      <div className="px-1 py-2 text-xs italic text-[color:var(--mute)]">
        No edits on this field yet.
      </div>
    );
  }
  return (
    <ol className="space-y-2 text-[11px]">
      {entries.map((e) => (
        <li
          key={e.id}
          className="rounded-lg border border-[color:var(--line)] bg-[color-mix(in_srgb,var(--card)_60%,transparent)] p-2"
        >
          <div className="mb-1 flex items-center gap-2 text-[10px] text-[color:var(--mute)]">
            <span className="font-mono">
              {(e.createdAt ?? "").replace("T", " ").slice(0, 16)} UTC
            </span>
            <span className="rounded bg-[color:var(--raised)] px-1 font-mono text-[9px] text-[color:var(--mute)]">
              {e.source}
            </span>
            <span className="ml-auto max-w-[10rem] truncate font-mono text-[color:var(--mute)]">
              {e.editedBy.slice(0, 12)}
            </span>
          </div>
          <div className="space-y-1">
            <Diff label="before" tone="rose" value={e.before} />
            <Diff label="after" tone="emerald" value={e.after} />
          </div>
        </li>
      ))}
    </ol>
  );
}

function Diff({ label, tone, value }: { label: string; tone: "rose" | "emerald"; value: string }) {
  return (
    <div
      className={cn(
        "rounded border px-1.5 py-1",
        tone === "rose"
          ? "border-[color-mix(in_srgb,var(--late)_30%,transparent)] bg-[color-mix(in_srgb,var(--late)_4%,transparent)]"
          : "border-[color-mix(in_srgb,var(--good)_30%,transparent)] bg-[color-mix(in_srgb,var(--good)_4%,transparent)]"
      )}
    >
      <span
        className={cn(
          "mr-1 font-mono text-[9px] font-bold uppercase",
          tone === "rose" ? "text-[color:var(--late)]" : "text-[color:var(--good)]"
        )}
      >
        {label}
      </span>
      <span className="whitespace-pre-wrap break-words text-[color:var(--ink)]">
        {value || <span className="italic text-[color:var(--mute)]">(empty)</span>}
      </span>
    </div>
  );
}
