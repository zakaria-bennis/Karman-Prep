"use client";

// D4 (00-index section 7, AR-33): 12's classifier and the Transfer control are too large for the
// quiz routes' eager budget, so eager code reaches them, the wrappers' item lookup in
// transfer-items.tsx and the bridge's pipeline (transfer-bridge-core.ts) only through the one lazy
// Transfer chunk, transfer-lazy.ts, through this loader's one import(); the bridge's pipeline
// (transfer-bridge-core.ts) loads with it through the hook's own import(). Callers render no
// Transfer control until both have resolved; a failed chunk renders none and the next caller retries.

import { useEffect, useState } from "react";
import { loadTransferCore } from "./use-transfer-bridge";

export type TransferClassifier = typeof import("./transfer-lazy");

let pending: Promise<TransferClassifier> | null = null;
let loaded: TransferClassifier | null = null;

/** The controls' chunk, imported once per page while it succeeds, with the bridge's pipeline (so
 * a control's transfer never waits for it). */
export const loadTransferClassifier = (): Promise<TransferClassifier> =>
  (pending ??= Promise.all([import("./transfer-lazy"), loadTransferCore()]).then(
    ([m]) => (loaded = m),
    (error: unknown) => {
      pending = null;
      throw error;
    }
  ));

/** The classifier once loaded, else null; an active caller starts the load when it mounts. A
 * failed load leaves it null; a later caller retries. */
export function useTransferClassifier(active: boolean): TransferClassifier | null {
  const [module, setModule] = useState(loaded);
  useEffect(() => {
    if (active && !module) loadTransferClassifier().then(setModule, () => {});
  }, [active, module]);
  return active ? module : null;
}
