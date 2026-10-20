// Implicit curves F(x, y) = 0 (G-15, G-16): one relation sampled on the pixel-centre lattice within
// IMPLICIT_BUDGET evaluations, then contoured at its 1 px leaves; squares the budget leaves unsplit
// draw as bands. Pure TypeScript, no DOM (AR-44).

import type { Deadline } from "../core/deadline";
import { EvaluationBudget, IMPLICIT_BUDGET } from "./budget";
import { contourField } from "./contour";
import { sampleField } from "./field";
import type { CurveGeometry, RealFn2 } from "./geometry";
import type { ViewSpec } from "./viewport";

/** The zero set of F, where F = lhs − rhs of an implicit equation, within `limit` evaluations. */
export function plotImplicit(
  rowId: string,
  F: RealFn2,
  view: ViewSpec,
  deadline: Deadline,
  limit = IMPLICIT_BUDGET
): CurveGeometry {
  const budget = new EvaluationBudget(limit, deadline);
  const field = sampleField(
    view,
    1,
    1,
    (x, y, out) => {
      out[0] = F(x, y);
    },
    budget
  );
  const { polylines, bands } = contourField(field, 0, view);
  return {
    rowId,
    kind: "curve",
    polylines: Float64Array.from(polylines),
    bands: Float64Array.from(bands),
    dashed: false,
    evaluations: budget.used,
  };
}
