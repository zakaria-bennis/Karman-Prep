"use client";

// ExitConfirmModal — confirmation dialog before bailing out of the
// diagnostic. The diagnostic must be completed in one session, so
// leaving discards all in-flight answers, highlights, and bookmarks.
// Used by DiagnosticClient only.

import { AlertTriangle, X } from "lucide-react";

export function ExitConfirmModal({
  open,
  onKeepGoing,
  onExit,
}: {
  open: boolean;
  onKeepGoing: () => void;
  onExit: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onKeepGoing}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="exit-diag-title"
        className="relative w-full max-w-md rounded-2xl border border-white/10 bg-[#0B1026] p-6 shadow-2xl"
      >
        <div className="mb-2 flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-amber-300" />
          <h2 id="exit-diag-title" className="text-lg font-extrabold text-white">
            Exit the diagnostic?
          </h2>
        </div>
        <p className="text-sm leading-relaxed text-slate-300">
          The diagnostic must be completed in one session. If you leave now, your answers,
          highlights, and bookmarks for this attempt will be{" "}
          <span className="font-semibold text-rose-300">discarded</span> and you&apos;ll start fresh
          next time.
        </p>
        <div className="mt-5 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onKeepGoing}
            className="rounded-lg px-3.5 py-2 text-sm font-semibold text-slate-300 hover:bg-white/[0.06] hover:text-white"
          >
            Keep going
          </button>
          <button
            type="button"
            onClick={onExit}
            className="inline-flex items-center gap-1.5 rounded-lg bg-rose-500 px-3.5 py-2 text-sm font-semibold text-white shadow-[0_4px_14px_rgba(244,63,94,0.4)] hover:bg-rose-400"
          >
            <X className="h-4 w-4" />
            Exit and discard
          </button>
        </div>
      </div>
    </div>
  );
}
