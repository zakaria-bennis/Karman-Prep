// Inequality regions (G-1, G-17). The relations terms[k] ops[k] terms[k + 1] share one pixel-centre
// field within IMPLICIT_BUDGET evaluations; a pixel is shaded when every relation holds at the
// value the field judges it by, and each relation's zero set is its boundary, dashed when strict.
// Pure TypeScript, no DOM (AR-44).

import type { Deadline } from "../core/deadline";
import type { InequalityOp } from "../core/latex/ast";
import { EvaluationBudget, IMPLICIT_BUDGET } from "./budget";
import { contourField } from "./contour";
import { sampleField, type SampledField } from "./field";
import type { CurveGeometry, RealFn2, RegionGeometry } from "./geometry";
import type { ViewSpec } from "./viewport";

/** Whether `lhs op rhs` holds, given difference = lhs − rhs; NaN is false. */
export function relationHolds(op: InequalityOp, difference: number): boolean {
  switch (op) {
    case "<":
      return difference < 0;
    case "<=":
      return difference <= 0;
    case ">":
      return difference > 0;
    case ">=":
      return difference >= 0;
  }
}

/**
 * Shaded spans [yTop, yBottom, x0, x1, …] in CSS px: per pixel row j, each maximal run [i0, i1) of
 * pixels where every relation holds, clipped to the view's size.
 */
function shadedSpans(field: SampledField, ops: readonly InequalityOp[], view: ViewSpec): number[] {
  const { width, height } = view.size;
  const holdsAt = (i: number, j: number) => {
    for (let k = 0; k < ops.length; k++) {
      if (!relationHolds(ops[k], field.pixelValue(i, j, k))) return false;
    }
    return true;
  };
  const spans: number[] = [];
  for (let j = 0; j < field.height; j++) {
    let start = -1;
    for (let i = 0; i <= field.width; i++) {
      const inside = i < field.width && holdsAt(i, j);
      if (inside && start < 0) {
        start = i;
      } else if (!inside && start >= 0) {
        spans.push(j, Math.min(j + 1, height), start, Math.min(i, width));
        start = -1;
      }
    }
  }
  return spans;
}

/**
 * The region where terms[k] ops[k] terms[k + 1] holds for every k (G-17), with one boundary per
 * relation, dashed for `<` and `>` and solid for `<=` and `>=` (G-1).
 */
export function plotRegion(
  rowId: string,
  terms: readonly RealFn2[],
  ops: readonly InequalityOp[],
  view: ViewSpec,
  deadline: Deadline
): RegionGeometry {
  const budget = new EvaluationBudget(IMPLICIT_BUDGET, deadline);
  const values = new Float64Array(terms.length);
  const field = sampleField(
    view,
    ops.length,
    terms.length,
    (x, y, out) => {
      for (let t = 0; t < terms.length; t++) values[t] = terms[t](x, y);
      for (let k = 0; k < ops.length; k++) out[k] = values[k] - values[k + 1];
    },
    budget
  );
  const boundaries = ops.map((op, k): CurveGeometry => {
    const { polylines, bands } = contourField(field, k, view);
    return {
      rowId,
      kind: "curve",
      polylines: Float64Array.from(polylines),
      bands: Float64Array.from(bands),
      dashed: op === "<" || op === ">",
      evaluations: 0,
    };
  });
  return {
    rowId,
    kind: "region",
    spans: Float32Array.from(shadedSpans(field, ops, view)),
    boundaries,
    evaluations: budget.used,
  };
}

/** RC-14's constant inequality: the whole view when it holds, else nothing; no boundaries. */
export function plotConstantRegion(rowId: string, holds: boolean, view: ViewSpec): RegionGeometry {
  const { width, height } = view.size;
  return {
    rowId,
    kind: "region",
    spans: Float32Array.from(holds ? [0, height, 0, width] : []),
    boundaries: [],
    evaluations: 0,
  };
}
