// The plot entry point (G-1, G-11, G-15, G-23): plotRow sends one row's PlotInput to its sampler
// for a ViewSpec, which calls per row. A hidden or invalid view evaluates nothing.
// Pure TypeScript, no DOM (AR-44); DeadlineExceeded propagates to the caller.

import type { Deadline } from "../core/deadline";
import type { InequalityOp } from "../core/latex/ast";
import { plotExplicit } from "./explicit";
import { explicitBranchBudget, implicitBranchBudget } from "./budget";
import type { Geometry, RealFn1, RealFn2 } from "./geometry";
import { plotImplicit } from "./implicit";
import { plotLines } from "./lines";
import { mergeCurves, mergeLines, mergeRegions } from "./merge";
import { plotPoints } from "./points";
import { plotConstantRegion, plotRegion } from "./region";
import type { ViewSpec } from "./viewport";

/**
 * One row's closures, one per branch (G-22: a list of curves has one per element, and an empty
 * list none): y=f(x) or x=f(y); F = lhs − rhs; the roots of f in view; points; and regions where
 * terms[i] ops[i] terms[i+1] holds for every i, one terms array per branch.
 */
export type PlotInput =
  | { rowId: string; kind: "explicit"; independent: "x" | "y"; fs: RealFn1[] }
  | { rowId: string; kind: "implicit"; Fs: RealFn2[] }
  | { rowId: string; kind: "lines"; orientation: "vertical" | "horizontal"; fs: RealFn1[] }
  | { rowId: string; kind: "points"; points: [number, number][] }
  | { rowId: string; kind: "region"; branches: RealFn2[][]; ops: InequalityOp[] }
  | { rowId: string; kind: "constant-region"; holds: boolean };
export { EXPLICIT_BUDGET, IMPLICIT_BUDGET } from "./budget"; // so no plot module imports index.ts

/** A view at least 1 px wide and tall in finite CSS px; anything else (a hidden graph) draws nothing. */
const isDrawable = ({ size }: ViewSpec) =>
  Number.isFinite(size.width) &&
  Number.isFinite(size.height) &&
  size.width >= 1 &&
  size.height >= 1;

/** The empty geometry of the input's kind, with no evaluations, for a view that draws nothing. */
function emptyGeometry(input: PlotInput): Geometry {
  const { rowId } = input;
  switch (input.kind) {
    case "explicit":
    case "implicit":
      return {
        rowId,
        kind: "curve",
        polylines: Float64Array.from([]),
        bands: Float64Array.from([]),
        dashed: false,
        evaluations: 0,
      };
    case "lines":
      return {
        rowId,
        kind: "lines",
        orientation: input.orientation,
        positions: Float64Array.from([]),
        dashed: false,
        evaluations: 0,
      };
    case "points":
      return plotPoints(rowId, input.points);
    case "region":
    case "constant-region":
      return {
        rowId,
        kind: "region",
        spans: Float32Array.from([]),
        boundaries: [],
        evaluations: 0,
      };
  }
}

/**
 * One row's geometry for `view`, within its G-15 budget split across its branches (G-22), the
 * branches joined into one geometry; throws DeadlineExceeded once expired.
 */
export function plotRow(input: PlotInput, view: ViewSpec, deadline: Deadline): Geometry {
  if (!isDrawable(view)) return emptyGeometry(input);
  const { rowId } = input;
  switch (input.kind) {
    case "explicit": {
      const { fs, independent } = input,
        limit = explicitBranchBudget(fs.length);
      if (fs.length === 0) return emptyGeometry(input);
      return mergeCurves(fs.map((f) => plotExplicit(rowId, independent, f, view, deadline, limit)));
    }
    case "implicit": {
      const limit = implicitBranchBudget(input.Fs.length);
      if (input.Fs.length === 0) return emptyGeometry(input);
      return mergeCurves(input.Fs.map((F) => plotImplicit(rowId, F, view, deadline, limit)));
    }
    case "lines": {
      const { fs, orientation } = input,
        limit = explicitBranchBudget(fs.length);
      if (fs.length === 0) return emptyGeometry(input);
      return mergeLines(fs.map((f) => plotLines(rowId, orientation, f, view, deadline, limit)));
    }
    case "points":
      return plotPoints(rowId, input.points);
    case "region": {
      const { branches, ops } = input,
        limit = implicitBranchBudget(branches.length);
      if (branches.length === 0) return emptyGeometry(input);
      return mergeRegions(
        branches.map((terms) => plotRegion(rowId, terms, ops, view, deadline, limit))
      );
    }
    case "constant-region":
      return plotConstantRegion(rowId, input.holds, view);
  }
}
