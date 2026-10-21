// React bindings for the headless engine. The UI reads the
// engine from EngineContext and its state through useEngineSnapshot. Parse, analysis and
// evaluation errors arrive as row messages in the snapshot and are never thrown into React
// (AR-54); getSnapshot never throws, even after destroy().

import { createContext, useCallback, useContext, useSyncExternalStore } from "react";
import type { CalculatorEngine, EngineSnapshot } from "@/lib/calculator/core/api/engine";
import { isUpdateDepthError } from "../ErrorBoundary";

export const EngineContext = createContext<CalculatorEngine | null>(null);

/**
 * React's listener, guarded: when fast input trips React's update-depth guard inside it (see
 * ErrorBoundary), React has reset its count, so the change is passed on again in the next task
 * instead of escaping the engine's listener loop and skipping the other subscribers.
 */
function guarded(listener: () => void): () => void {
  return () => {
    try {
      listener();
    } catch (error) {
      if (!isUpdateDepthError(error)) throw error;
      setTimeout(listener, 0);
    }
  };
}

/**
 * The engine's current snapshot, re-read after every commit and worker frame. React calls
 * getSnapshot without `this`, so both callbacks wrap the engine's methods rather than passing
 * them unbound.
 */
export function useEngineSnapshot(engine: CalculatorEngine): EngineSnapshot {
  const subscribe = useCallback(
    (listener: () => void) => engine.subscribe(guarded(listener)),
    [engine]
  );
  const getSnapshot = useCallback(() => engine.getSnapshot(), [engine]);
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

/** The engine that EngineContext provides; throws when no provider is above the caller. */
export function useEngine(): CalculatorEngine {
  const engine = useContext(EngineContext);
  if (engine === null) throw new Error("useEngine must be used inside EngineContext");
  return engine;
}
