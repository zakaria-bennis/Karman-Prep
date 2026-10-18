"use client";

// D4 (00-index section 7, AR-33): 12's classifier and the Transfer control are too large for the
// quiz routes' eager budget, so eager code reaches them, and the wrappers' item lookup in
// transfer-items.ts, only through these import()s, loaded together in their own chunks apart from
// the calculator's. Callers render no Transfer control until all have resolved; a failed chunk
// renders none and the next caller retries.

import { useEffect, useState } from "react";

export type TransferClassifier = typeof import("@/lib/calculator-transfer/classify") &
  typeof import("./transfer-items") & {
    TransferControl: typeof import("./TransferControl").TransferControl;
  };

let pending: Promise<TransferClassifier> | null = null;
let loaded: TransferClassifier | null = null;

/** The classifier and control chunks, imported once per page while they succeed. */
export function loadTransferClassifier(): Promise<TransferClassifier> {
  if (pending === null) {
    const attempt = Promise.all([
      import("@/lib/calculator-transfer/classify"),
      import("./transfer-items"),
      import("./TransferControl"),
    ]).then(([classify, items, control]) => {
      loaded = { ...classify, ...items, TransferControl: control.TransferControl };
      return loaded;
    });
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
