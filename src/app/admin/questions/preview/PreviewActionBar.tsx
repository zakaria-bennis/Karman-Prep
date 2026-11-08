"use client";

// ============================================================
// PreviewActionBar — bottom bar of the preview shell.
//
// Two clusters:
//
//   LEFT — per-question actions: Approve · Flag · Reject
//     · Approve clears any flag (idempotent if already ok)
//     · Flag opens an inline note prompt, then sets needs_review
//     · Reject sends to the soft-delete bin (recoverable from
//       /admin/questions/rejected); opens an inline reason prompt
//
//   RIGHT — toggle chips for the side panel:
//       Desmos tips · Hints · Explanations · PDF · Grader votes
//     Each chip is an independent on/off. Active chips show with
//     a filled background; inactive are outlined. When any chip
//     is on, the side panel appears next to the preview pane
//     (handled by the parent, not this component).
// ============================================================

import { useState } from "react";
import {
  Check,
  Flag,
  Trash2,
  Loader2,
  Lightbulb,
  Compass,
  BookOpen,
  FileText,
  ImageIcon,
  Vote,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type PanelKey = "desmos" | "hints" | "explanations" | "pdf" | "crop" | "expanded" | "grader";

interface Props {
  pending: { approve: boolean; flag: boolean; reject: boolean };
  openPanels: Set<PanelKey>;
  onApprove: () => void;
  onFlag: (note: string) => void;
  onReject: (reason: string) => void;
  onTogglePanel: (key: PanelKey) => void;
  showSourceAssetPanels: boolean;
}

const PANEL_CHIPS: Array<{ key: PanelKey; label: string; Icon: React.ElementType }> = [
  { key: "desmos", label: "Desmos", Icon: Compass },
  { key: "hints", label: "Hints", Icon: Lightbulb },
  { key: "explanations", label: "Explain", Icon: BookOpen },
  { key: "pdf", label: "PDF", Icon: FileText },
  { key: "crop", label: "Crop", Icon: ImageIcon },
  { key: "expanded", label: "Expanded", Icon: ImageIcon },
  { key: "grader", label: "Grader", Icon: Vote },
];

export function PreviewActionBar({
  pending,
  openPanels,
  onApprove,
  onFlag,
  onReject,
  onTogglePanel,
  showSourceAssetPanels,
}: Props) {
  const [flagMode, setFlagMode] = useState(false);
  const [rejectMode, setRejectMode] = useState(false);
  const [note, setNote] = useState("");

  const anyBusy = pending.approve || pending.flag || pending.reject;

  function submitFlag() {
    const v = note.trim();
    if (!v) return;
    onFlag(v);
    setNote("");
    setFlagMode(false);
  }
  function submitReject() {
    onReject(note.trim());
    setNote("");
    setRejectMode(false);
  }
  function cancelNote() {
    setNote("");
    setFlagMode(false);
    setRejectMode(false);
  }

  return (
    <div className="border-t border-[color:var(--line)] bg-[color-mix(in_srgb,var(--card)_40%,transparent)] px-4 py-2.5">
      {/* ── Note input (shown when Flag or Reject is armed) ── */}
      {(flagMode || rejectMode) && (
        <div className="mb-2.5 flex flex-wrap items-center gap-2">
          <input
            type="text"
            autoFocus
            value={note}
            onChange={(e) => setNote(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                if (flagMode) submitFlag();
                if (rejectMode) submitReject();
              }
              if (e.key === "Escape") cancelNote();
            }}
            aria-label={flagMode ? "Flag note" : "Rejection reason"}
            placeholder={
              flagMode
                ? "Why is this flagged? (required)"
                : "Why are you rejecting this? (optional — recoverable)"
            }
            className="min-h-11 min-w-0 flex-1 rounded-lg border border-[color:var(--line)] bg-[color:var(--sunk)] px-3 py-1.5 text-sm text-[color:var(--ink)] placeholder:text-[color:var(--mute)] focus:border-[color-mix(in_srgb,var(--accent)_40%,transparent)] focus:outline-none"
          />
          <button
            onClick={flagMode ? submitFlag : submitReject}
            disabled={anyBusy || (flagMode && !note.trim())}
            className={cn(
              "min-h-11 rounded-lg px-3 py-1.5 text-xs font-bold text-[color:var(--ink)] disabled:opacity-50",
              flagMode
                ? "bg-[color:var(--warn)] hover:bg-[color:var(--warn)]"
                : "bg-[color:var(--late)] hover:bg-[color:var(--late)]"
            )}
          >
            {flagMode ? "Flag" : "Reject"}
          </button>
          <button
            onClick={cancelNote}
            className="min-h-11 rounded-lg border border-[color:var(--line)] px-3 py-1.5 text-xs text-[color:var(--ink)] hover:bg-[color:var(--raised)]"
          >
            Cancel
          </button>
        </div>
      )}

      {/* ── Action row ──────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Left cluster: per-question actions */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={onApprove}
            disabled={anyBusy || flagMode || rejectMode}
            className={cn(
              "inline-flex min-h-11 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold text-[color:var(--ink)] disabled:opacity-50",
              "bg-[color:var(--good)] hover:bg-[color:var(--good)]"
            )}
          >
            {pending.approve ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Check className="h-3.5 w-3.5" />
            )}
            Approve
          </button>
          <button
            onClick={() => {
              setRejectMode(false);
              setFlagMode(true);
            }}
            disabled={anyBusy}
            className={cn(
              "inline-flex min-h-11 items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-bold disabled:opacity-50",
              flagMode
                ? "border-[color-mix(in_srgb,var(--warn)_40%,transparent)] bg-[color-mix(in_srgb,var(--warn)_15%,transparent)] text-[color:var(--warn)]"
                : "border-[color-mix(in_srgb,var(--warn)_40%,transparent)] bg-transparent text-[color:var(--warn)] hover:bg-[color-mix(in_srgb,var(--warn)_10%,transparent)]"
            )}
          >
            {pending.flag ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Flag className="h-3.5 w-3.5" />
            )}
            Flag
          </button>
          <button
            onClick={() => {
              setFlagMode(false);
              setRejectMode(true);
            }}
            disabled={anyBusy}
            className={cn(
              "inline-flex min-h-11 items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-bold disabled:opacity-50",
              rejectMode
                ? "border-[color-mix(in_srgb,var(--late)_40%,transparent)] bg-[color-mix(in_srgb,var(--late)_15%,transparent)] text-[color:var(--late)]"
                : "border-[color-mix(in_srgb,var(--late)_40%,transparent)] bg-transparent text-[color:var(--late)] hover:bg-[color-mix(in_srgb,var(--late)_10%,transparent)]"
            )}
          >
            {pending.reject ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Trash2 className="h-3.5 w-3.5" />
            )}
            Reject
          </button>
        </div>

        {/* Right cluster: side-panel toggle chips */}
        <div className="ml-auto flex flex-wrap items-center gap-1.5">
          {PANEL_CHIPS.filter(
            ({ key }) => showSourceAssetPanels || (key !== "crop" && key !== "expanded")
          ).map(({ key, label, Icon }) => {
            const open = openPanels.has(key);
            return (
              <button
                key={key}
                onClick={() => onTogglePanel(key)}
                aria-pressed={open}
                className={cn(
                  "inline-flex min-h-11 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors",
                  open
                    ? "border-[color-mix(in_srgb,var(--accent)_40%,transparent)] bg-[color-mix(in_srgb,var(--accent)_20%,transparent)] text-[color:var(--accent-text)]"
                    : "border-[color:var(--line)] bg-[color:var(--card)] text-[color:var(--mute)] hover:border-[color:var(--line)] hover:text-[color:var(--ink)]"
                )}
              >
                <Icon className="h-3 w-3" />
                {label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
