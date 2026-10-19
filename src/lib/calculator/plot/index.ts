// The plot entry point (G-1, G-11, G-15, G-23): plotRow sends one row's PlotInput to its sampler
// for a ViewSpec, which 07-engine-worker calls per row. A hidden or invalid view evaluates nothing.
// Pure TypeScript, no DOM (AR-44); DeadlineExceeded propagates to the caller.

import type { Deadline } from "../core/deadline";
import type { InequalityOp } from "../core/latex/ast";
import { plotExplicit } from "./explicit";
import type { Geometry } from "./geometry";
import { plotImplicit } from "./implicit";
import { plotLines } from "./lines";
import { plotPoints } from "./points";
import { plotConstantRegion, plotRegion } from "./region";
import type { ViewSpec } from "./viewport";

export type PlotInput =
  | { rowId: string; kind: "explicit"; independent: "x" | "y"; f: (t: number) => number } // y=f(x) or x=f(y)
  | { rowId: string; kind: "implicit"; F: (x: number, y: number) => number } // F = lhs - rhs
  | {
      rowId: string;
      kind: "lines";
      orientation: "vertical" | "horizontal";
      f: (t: number) => number;
    } // roots of f in view
  | { rowId: string; kind: "points"; points: [number, number][] }
  | {
      rowId: string;
      kind: "region";
      terms: ((x: number, y: number) => number)[];
      ops: InequalityOp[];
    } // holds where terms[i] ops[i] terms[i+1] for every i
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

/** One row's geometry for `view`, within its G-15 budget; throws DeadlineExceeded once expired. */
export function plotRow(input: PlotInput, view: ViewSpec, deadline: Deadline): Geometry {
  if (!isDrawable(view)) return emptyGeometry(input);
  switch (input.kind) {
    case "explicit":
      return plotExplicit(input.rowId, input.independent, input.f, view, deadline);
    case "implicit":
      return plotImplicit(input.rowId, input.F, view, deadline);
    case "lines":
      return plotLines(input.rowId, input.orientation, input.f, view, deadline);
    case "points":
      return plotPoints(input.rowId, input.points);
    case "region":
      return plotRegion(input.rowId, input.terms, input.ops, view, deadline);
    case "constant-region":
      return plotConstantRegion(input.rowId, input.holds, view);
  }
}
