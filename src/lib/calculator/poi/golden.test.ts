// POI-16's golden cases through the real pipeline: analyzeRows, evaluateRows, buildCompileScope,
// then findRowPois for the selected row, exactly as the executor runs them, in the default view.

import { describe, expect, it } from "vitest";
import { analyzeRows } from "../core/analysis/index";
import { NO_DEADLINE } from "../core/deadline";
import { evaluateRows, type EvalSettings } from "../core/eval/compile";
import { buildCompileScope } from "../plot/from-analysis";
import type { ViewSpec } from "../plot/viewport";
import { findRowPois } from "./index";
import type { PoiPoint } from "./types";

const VIEW: ViewSpec = {
  viewport: { left: -10, right: 10, bottom: -7.5, top: 7.5 },
  size: { width: 800, height: 600 },
  dpr: 1,
};
const SETTINGS: EvalSettings = { angleMode: "radians", complex: false };

/** The POIs of row 1 among `rows` (ids "1", "2", …). */
function pois(...rows: string[]): PoiPoint[] {
  const analysis = analyzeRows(
    rows.map((latex, k) => ({ id: String(k + 1), latex, hidden: false })),
    SETTINGS
  );
  const values = evaluateRows(analysis, SETTINGS, () => NO_DEADLINE);
  const scope = buildCompileScope(analysis, values, SETTINGS);
  return findRowPois("1", analysis, scope, VIEW, NO_DEADLINE);
}
const coords = (p: PoiPoint[]) => p.map((q) => [Number(q.x.toFixed(9)), Number(q.y.toFixed(9))]);
const has = (p: PoiPoint[], x: number, y: number, kinds?: string[], tol = 1e-9) => {
  const hit = p.find((q) => Math.abs(q.x - x) <= tol && Math.abs(q.y - y) <= tol);
  expect(hit, `(${x}, ${y}) in ${JSON.stringify(coords(p))}`).toBeDefined();
  if (kinds) expect(hit!.kinds).toEqual(kinds);
};

describe("POI golden cases", () => {
  it("POI-16 the golden cases pass at the default view", () => {
    const parabola = pois("y=x^{2}-2");
    has(parabola, -Math.SQRT2, 0, ["zero"]);
    has(parabola, Math.SQRT2, 0, ["zero"]);
    has(parabola, 0, -2, ["y-intercept", "minimum"]);
    expect(parabola).toHaveLength(3);

    const square = pois("y=\\left(x-2\\right)^{2}");
    has(square, 2, 0, ["zero", "minimum"], 1e-7);
    has(square, 0, 4, ["y-intercept"]);
    expect(square).toHaveLength(2);

    const abs = pois("y=\\left|x-1\\right|");
    has(abs, 1, 0, ["zero", "minimum"], 1e-7);
    has(abs, 0, 1, ["y-intercept"]);
    expect(abs).toHaveLength(2);

    const tan = pois("y=\\tan x");
    expect(tan.filter((q) => q.kinds.includes("zero"))).toHaveLength(7);
    expect(tan).toHaveLength(7);

    const hole = pois("y=\\frac{x^{2}-1}{x-1}");
    has(hole, -1, 0, ["zero"]);
    has(hole, 0, 1, ["y-intercept"]);
    expect(hole).toHaveLength(2);

    has(pois("y=2x+1", "y=-x+7"), 2, 5, ["intersection"]);
    const circleLine = pois("x^{2}+y^{2}=25", "y=x+1");
    has(circleLine, 3, 4, ["intersection"], 1e-7);
    has(circleLine, -4, -3, ["intersection"], 1e-7);
    const tangent = pois("x^{2}+y^{2}=25", "y=5");
    expect(tangent.filter((q) => q.kinds.includes("intersection"))).toHaveLength(1);
    has(tangent, 0, 5, undefined, 1e-6);

    const sin = pois("y=\\sin x");
    const zeros = sin.filter((q) => q.kinds.includes("zero")).map((q) => q.x / Math.PI);
    expect(zeros.map(Math.round)).toEqual([-3, -2, -1, 0, 1, 2, 3]);

    const tiny = pois("y=10^{-8}\\left(x-3\\right)");
    expect(tiny.filter((q) => q.kinds.includes("zero"))).toHaveLength(1);
    has(tiny, 3, 0, ["zero"]);
  });

  it("POI-1 hidden rows contribute no intersections and an error row has no points", () => {
    const analysis = analyzeRows(
      [
        { id: "1", latex: "y=2x+1", hidden: false },
        { id: "2", latex: "y=-x+7", hidden: true },
      ],
      SETTINGS
    );
    const values = evaluateRows(analysis, SETTINGS, () => NO_DEADLINE);
    const scope = buildCompileScope(analysis, values, SETTINGS);
    expect(
      findRowPois("1", analysis, scope, VIEW, NO_DEADLINE).some((q) =>
        q.kinds.includes("intersection")
      )
    ).toBe(false);
    expect(pois("y=x+")).toEqual([]);
  });

  it("POI-4 an inequality boundary gets the boundary curve's points and meets other curves", () => {
    const region = pois("y>x^{2}-2", "y=2");
    has(region, 0, -2, ["y-intercept", "minimum"]);
    has(region, 2, 2, ["intersection"]);
  });
});
