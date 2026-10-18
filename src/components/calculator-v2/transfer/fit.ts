// The view after a transfer (c-transfer TR-39; b D-17): when a table, point-row or point-table
// transfer adds points and none of them lies inside the current graphpaperBounds, the view fits
// them once by D-16's rule (fitPoints); otherwise, and for every other transfer, it stays. The
// points are the payload's own numeric constants (TR-15, TR-24: no names), so their values are
// read here once per transfer, on at most 200 cells, instead of waiting for the worker's results.

import type { CalculatorEngine } from "@/lib/calculator-v2/core/api/engine";
import { fitPoints } from "@/lib/calculator-v2/core/data/fit-view";
import { NO_DEADLINE } from "@/lib/calculator-v2/core/deadline";
import { compileExpression } from "@/lib/calculator-v2/core/eval/compile";
import { parseLatex } from "@/lib/calculator-v2/core/latex/index";

export type FitTarget = Pick<CalculatorEngine, "graphpaperBounds" | "setMathBounds">;

const EMPTY_SCOPE = {
  functions: new Map(),
  values: new Map(),
  settings: { angleMode: "radians", complex: false },
} as const;

function value(latex: string) {
  const parsed = parseLatex(latex, { userFunctions: new Set() });
  return parsed.ok ? compileExpression(parsed.tree, EMPTY_SCOPE)({}, NO_DEADLINE) : null;
}

/** A numeric constant's real value, or null. */
export function constantValue(latex: string): number | null {
  const v = value(latex);
  return v?.type === "number" ? v.value : null;
}

/** A point row `(a,b)` of numeric constants as [a, b], or null for any other row. */
export function pointValue(latex: string): [number, number] | null {
  const v = value(latex);
  return v?.type === "point" && v.value.every(Number.isFinite) ? [v.value[0], v.value[1]] : null;
}

/** A table's plotted points: each later column against the first (none for one column). */
export function tablePoints(columns: readonly (readonly string[])[]): [number, number][] {
  const [xs, ...ys] = columns.map((c) => c.map(constantValue));
  return ys.flatMap((column) =>
    column.flatMap((y, k): [number, number][] => {
      const x = xs[k];
      return x === null || y === null ? [] : [[x, y]];
    })
  );
}

/** TR-39, D-17: fits the view to `points` when there are some and none is visible. */
export function fitAddedPoints(target: FitTarget, points: readonly [number, number][]): void {
  if (points.length === 0) return;
  const v = target.graphpaperBounds.mathCoordinates;
  if (points.some(([x, y]) => x >= v.left && x <= v.right && y >= v.bottom && y <= v.top)) return;
  const fit = fitPoints([Float64Array.from(points.flat())]);
  if (fit !== null) target.setMathBounds(fit);
}
