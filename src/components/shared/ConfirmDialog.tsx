"use client";

// ============================================================
// ConfirmDialog — in-app modal that replaces the browser-native
// `confirm()`. Use the `useConfirm()` hook below to consume.
//
// Usage:
//   const confirm = useConfirm();
//   const ok = await confirm({
//     title: "Remove Sofia from cohort?",
//     description: "Their progress is kept — this just ends their membership.",
//     confirmLabel: "Remove",
//     danger: true,
//   });
//   if (ok) await actionRemoveCohortMember(...);
// ============================================================

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ConfirmOptions {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** When true, the confirm button is rendered in destructive red. */
  danger?: boolean;
}

type Resolve = (ok: boolean) => void;

interface ConfirmCtxValue {
  request: (opts: ConfirmOptions) => Promise<boolean>;
}

const ConfirmCtx = createContext<ConfirmCtxValue | null>(null);

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [opts, setOpts] = useState<ConfirmOptions | null>(null);
  const [resolver, setResolver] = useState<Resolve | null>(null);
  const [pending, setPending] = useState(false);

  const request = useCallback((o: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setOpts(o);
      setResolver(() => resolve);
      setPending(false);
    });
  }, []);

  const finish = useCallback(
    (ok: boolean) => {
      if (resolver) resolver(ok);
      setOpts(null);
      setResolver(null);
      setPending(false);
    },
    [resolver]
  );

  return (
    <ConfirmCtx.Provider value={{ request }}>
      {children}
      {opts && (
        <DialogShell
          opts={opts}
          pending={pending}
          onCancel={() => finish(false)}
          onConfirm={() => {
            setPending(true);
            // Resolve immediately — caller awaits the action and
            // shows its own loading. We just dismiss the dialog.
            finish(true);
          }}
        />
      )}
    </ConfirmCtx.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(ConfirmCtx);
  if (!ctx) throw new Error("useConfirm must be used inside <ConfirmProvider>");
  return ctx.request;
}

// ─── Dialog UI ──────────────────────────────────────────────

function DialogShell({
  opts,
  pending,
  onCancel,
  onConfirm,
}: {
  opts: ConfirmOptions;
  pending: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const confirmLabel = opts.confirmLabel ?? "Confirm";
  const cancelLabel = opts.cancelLabel ?? "Cancel";

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div className="relative w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
        <button
          onClick={onCancel}
          disabled={pending}
          className="absolute right-4 top-4 text-slate-500 hover:text-slate-200 disabled:opacity-50"
          aria-label="Cancel"
        >
          <X className="h-5 w-5" />
        </button>
        <h2 id="confirm-title" className="pr-6 text-lg font-bold text-white">
          {opts.title}
        </h2>
        {opts.description && (
          <p className="mt-2 text-sm leading-relaxed text-slate-400">{opts.description}</p>
        )}
        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={pending}
            className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-300 hover:bg-slate-800 disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={pending}
            autoFocus
            className={cn(
              "inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-50",
              opts.danger ? "bg-rose-600 hover:bg-rose-500" : "bg-indigo-600 hover:bg-indigo-500"
            )}
          >
            {pending && <Loader2 className="h-4 w-4 animate-spin" />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
