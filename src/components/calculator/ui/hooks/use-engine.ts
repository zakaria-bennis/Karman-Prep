// React bindings for the headless engine. The UI reads the
// engine from EngineContext and its state through useEngineSnapshot. Parse, analysis and
// evaluation errors arrive as row messages in the snapshot and are never thrown into React
// (AR-54); getSnapshot never throws, even after destroy().

import { createContext, useCallback, useContext, useSyncExternalStore } from "react";
import type { CalculatorEngine, EngineSnapshot } from "@/lib/calculator/core/api/engine";

export const EngineContext = createContext<CalculatorEngine | null>(null);

/**
 * The engine's current snapshot, re-read after every commit and worker frame. React calls
 * getSnapshot without `this`, so both callbacks wrap the engine's methods rather than passing
 * them unbound.
 */
export function useEngineSnapshot(engine: CalculatorEngine): EngineSnapshot {
  const subscribe = useCallback((listener: () => void) => engine.subscribe(listener), [engine]);
  const getSnapshot = useCallback(() => engine.getSnapshot(), [engine]);
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

/** The engine that EngineContext provides; throws when no provider is above the caller. */
export function useEngine(): CalculatorEngine {
  const engine = useContext(EngineContext);
  if (engine === null) throw new Error("useEngine must be used inside EngineContext");
  return engine;
}
