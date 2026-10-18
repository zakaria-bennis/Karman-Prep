// The list's toast (D-13): one short confirmation at the foot of the list with an optional action
// such as Undo, announced through the status region (A11Y-2) and dismissed after TOAST_MS, by its
// action, or by the next toast. ToastContext is provided by the expression panel.

import { createContext, useEffect, useState, type JSX, type ReactNode } from "react";
import { useAnnouncer } from "../a11y/announcer";

export const TOAST_MS = 6000;

export interface ToastSpec {
  text: string; // "Table created."
  action?: { label: string; run(): void };
}
export interface Toaster {
  show(toast: ToastSpec): void;
}

export const ToastContext = createContext<Toaster | null>(null);

/** Provides ToastContext to `children` and renders the current toast after them. */
export function ToastHost({ children }: { children: ReactNode }): JSX.Element {
  const announcer = useAnnouncer();
  const [toast, setToast] = useState<{ spec: ToastSpec; serial: number } | null>(null);
  const [toaster] = useState<Toaster>(() => ({
    show: (spec) => setToast((t) => ({ spec, serial: (t?.serial ?? 0) + 1 })),
  }));
  useEffect(() => {
    if (toast === null) return;
    announcer.announce(
      toast.spec.action
        ? `${toast.spec.text} ${toast.spec.action.label} is available.`
        : toast.spec.text
    );
    const timer = setTimeout(() => setToast(null), TOAST_MS);
    return () => clearTimeout(timer);
  }, [toast, announcer]);
  return (
    <ToastContext.Provider value={toaster}>
      {children}
      {toast !== null && (
        <div className="kc-toast" data-toast="">
          <span>{toast.spec.text}</span>
          {toast.spec.action && (
            <button
              type="button"
              className="kc-toast-action"
              onClick={() => {
                setToast(null);
                toast.spec.action!.run();
              }}
            >
              {toast.spec.action.label}
            </button>
          )}
        </div>
      )}
    </ToastContext.Provider>
  );
}
