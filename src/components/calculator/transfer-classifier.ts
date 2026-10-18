"use client";

// D4 (00-index section 7, AR-33): 12's classifier is too large for the quiz routes' eager budget,
// so eager code reaches it only through this import(), in its own chunk apart from the
// calculator's. Callers render no Transfer control until it has resolved; a failed chunk renders
// none and the next caller retries.

import { useEffect, useState } from "react";

export type TransferClassifier = typeof import("@/lib/calculator-transfer/classify");

let pending: Promise<TransferClassifier> | null = null;
let loaded: TransferClassifier | null = null;

/** The classifier chunk, imported once per page while it succeeds. */
export function loadTransferClassifier(): Promise<TransferClassifier> {
  if (pending === null) {
    const attempt = import("@/lib/calculator-transfer/classify").then((m) => (loaded = m));
    attempt.catch(() => {
      if (pending === attempt) pending = null;
    });
    pending = attempt;
  }
  return pending;
}

/** The classifier once loaded, else null; an active caller starts the load when it mounts. */
export function useTransferClassifier(active: boolean): TransferClassifier | null {
  const [module, setModule] = useState(loaded);
  useEffect(() => {
    if (!active || module !== null) return;
    let live = true;
    loadTransferClassifier().then(
      (m) => {
        if (live) setModule(() => m);
      },
      () => {}
    );
    return () => {
      live = false;
    };
  }, [active, module]);
  return active ? module : null;
}
