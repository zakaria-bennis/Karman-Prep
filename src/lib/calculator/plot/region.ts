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
 * pixels where every relation holds at field.pixelValue, clipped to the view's size. An inactive
 * square is judged once at its top-left corner (field.forEachUnsplit), so only leaves, unresolved
 * squares and the lattice's last row and column are judged pixel by pixel, which keeps a list
 * region's elements cheap (G-22).
 */
export function shadedSpans(
  field: SampledField,
  ops: readonly InequalityOp[],
  view: ViewSpec
): number[] {
  const { width, height } = view.size;
  const W = field.width;
  const H = field.height;
  const inside = new Uint8Array(W * H);
  /** 1 when every relation holds at pixel (i, j), judged by pixelValue, or at node (i, j). */
  const holdsAt = (i: number, j: number, node: boolean) => {
    for (let k = 0; k < ops.length; k++) {
      const v = node ? field.value(i, j, k) : field.pixelValue(i, j, k);
      if (!relationHolds(ops[k], v)) return 0;
    }
    return 1;
  };
  const judge = (i: number, j: number) => {
    inside[j * W + i] = holdsAt(i, j, false);
  };
  const judgeBlock = (i0: number, j0: number, i1: number, j1: number) => {
    for (let j = j0; j < j1; j++) for (let i = i0; i < i1; i++) judge(i, j);
  };
  // Every node the quadtree evaluates on an inactive square's top row or left column re-tests it,
  // so with no refusal (no unresolved square) the corner judges the whole square. A refused split
  // may leave fresh nodes there untested, so then those edges are judged pixel by pixel.
  const exactEdges = field.unresolved.length > 0;
  field.forEachUnsplit((s, state) => {
    const i1 = Math.min(s.i + s.edge, W);
    const j1 = Math.min(s.j + s.edge, H);
    if (s.i >= i1 || s.j >= j1) return;
    if (state !== "inactive") return judgeBlock(s.i, s.j, i1, j1);
    if (holdsAt(s.i, s.j, true) === 1) {
      for (let j = s.j + (exactEdges ? 1 : 0); j < j1; j++) {
        inside.fill(1, j * W + s.i + (exactEdges ? 1 : 0), j * W + i1);
      }
    }
    if (!exactEdges) return;
    judgeBlock(s.i, s.j, i1, s.j + 1);
    judgeBlock(s.i, s.j + 1, s.i + 1, j1);
  });
  // A view one pixel past the lattice's last node column or row: those pixels are nodes.
  judgeBlock(Math.min(field.cellsX * field.cell, W), 0, W, H);
  judgeBlock(0, Math.min(field.cellsY * field.cell, H), W, H);
  const spans: number[] = [];
  for (let j = 0; j < H; j++) {
    const row = inside.subarray(j * W, (j + 1) * W);
    for (let start = row.indexOf(1); start >= 0; ) {
      const end = row.indexOf(0, start);
      spans.push(j, Math.min(j + 1, height), start, Math.min(end < 0 ? W : end, width));
      start = end < 0 ? -1 : row.indexOf(1, end);
    }
  }
  return spans;
}

/**
 * The region where terms[k] ops[k] terms[k + 1] holds for every k (G-17), with one boundary per
 * relation, dashed for `<` and `>` and solid for `<=` and `>=` (G-1), within `limit` evaluations.
 */
export function plotRegion(
  rowId: string,
  terms: readonly RealFn2[],
  ops: readonly InequalityOp[],
  view: ViewSpec,
  deadline: Deadline,
  limit = IMPLICIT_BUDGET
): RegionGeometry {
  const budget = new EvaluationBudget(limit, deadline);
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
