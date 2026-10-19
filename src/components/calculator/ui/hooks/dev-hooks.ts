// Development-only test hook (01-interfaces-runtime.md section 8.1): browser specs read the mounted
// engine through globalThis.__calculatorHarness. Called by harness-kit and by 10's quiz host.
// Production builds replace process.env.NODE_ENV, so bundlers fold exposeEngineForTests to a
// function that sets nothing.

import type { CalculatorEngine } from "@/lib/calculator/core/api/engine";

declare global {
  // ESLint 9's no-var does not report a var inside declare global, so it needs no directive.
  var __calculatorHarness: { engine: CalculatorEngine } | undefined;
}

/**
 * Sets globalThis.__calculatorHarness to `{ engine }` outside production. The returned function
 * deletes it only while it still points at this engine, so a later engine's hook survives.
 */
export function exposeEngineForTests(engine: CalculatorEngine): () => void {
  if (process.env.NODE_ENV === "production") return () => undefined;
  globalThis.__calculatorHarness = { engine };
  return () => {
    if (globalThis.__calculatorHarness?.engine === engine) delete globalThis.__calculatorHarness;
  };
}
