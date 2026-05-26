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
    <div className="border-t border-slate-800 bg-slate-900/40 px-4 py-2.5">
      {/* ── Note input (shown when Flag or Reject is armed) ── */}
      {(flagMode || rejectMode) && (
        <div className="mb-2.5 flex items-center gap-2">
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
            placeholder={
              flagMode
                ? "Why is this flagged? (required)"
                : "Why are you rejecting this? (optional — recoverable)"
            }
            className="flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-sm text-slate-100 placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none"
          />
          <button
            onClick={flagMode ? submitFlag : submitReject}
            disabled={anyBusy || (flagMode && !note.trim())}
            className={cn(
              "rounded-lg px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50",
              flagMode ? "bg-amber-500 hover:bg-amber-400" : "bg-rose-600 hover:bg-rose-500"
            )}
          >
            {flagMode ? "Flag" : "Reject"}
          </button>
          <button
            onClick={cancelNote}
            className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800"
          >
            Cancel
          </button>
        </div>
      )}

      {/* ── Action row ──────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Left cluster: per-question actions */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={onApprove}
            disabled={anyBusy || flagMode || rejectMode}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50",
              "bg-emerald-500 hover:bg-emerald-400"
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
              "inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-bold disabled:opacity-50",
              flagMode
                ? "border-amber-400 bg-amber-500/15 text-amber-200"
                : "border-amber-500/40 bg-transparent text-amber-300 hover:bg-amber-500/10"
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
              "inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-bold disabled:opacity-50",
              rejectMode
                ? "border-rose-400 bg-rose-500/15 text-rose-200"
                : "border-rose-500/40 bg-transparent text-rose-300 hover:bg-rose-500/10"
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
                  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors",
                  open
                    ? "border-indigo-400 bg-indigo-500/20 text-indigo-100"
                    : "border-slate-700 bg-slate-900 text-slate-400 hover:border-slate-600 hover:text-slate-200"
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
