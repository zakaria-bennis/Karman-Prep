// S-7 axis bounds (01-interfaces-integration.md section 11; 09 Task 12): a bound field's latex is
// evaluated by a HelperExpression, so the backend computes it and the main thread never evaluates
// it (AR-51). Node tests load this module, so the engine is imported as a type only.

import type { CalculatorEngine } from "@/lib/calculator/core/api/engine";

/**
 * The helper's first result: the number when it is finite, otherwise null (undefined, non-real or
 * not a number). Null when no result arrives within `timeoutMs`. The helper is unobserved and
 * destroyed exactly once, whichever comes first.
 */
export function evaluateBoundLatex(
  engine: Pick<CalculatorEngine, "HelperExpression">,
  latex: string,
  timeoutMs = 1000
): Promise<number | null> {
  return new Promise((resolve) => {
    const helper = engine.HelperExpression({ latex });
    let settled = false;
    const finish = (result: number | null) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      helper.unobserve("numericValue", onValue);
      helper.destroy();
      resolve(result);
    };
    const onValue = () => {
      const v = helper.numericValue;
      finish(Number.isFinite(v) ? v : null);
    };
    const timer = setTimeout(() => finish(null), timeoutMs);
    helper.observe("numericValue", onValue);
  });
}
