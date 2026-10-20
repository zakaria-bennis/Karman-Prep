// POI-TRACE-5's golden cases through the real pipeline: analyzeRows, evaluateRows, buildCompileScope,
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
  viewport: { left: -10, right: 10, bottom: -8.896, top: 8.896 },
  size: { width: 960, height: 854 },
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

describe("POI-TRACE-5 golden cases at the default view", () => {
  it("explicit curves", () => {
    const parabola = pois("y=x^{2}-2");
    has(parabola, -Math.SQRT2, 0, ["zero"]);
    has(parabola, Math.SQRT2, 0, ["zero"]);
    has(parabola, 0, -2, ["intercept", "extremum"]);
    expect(parabola).toHaveLength(3);

    const square = pois("y=\\left(x-2\\right)^{2}");
    has(square, 2, 0, ["extremum"], 1e-7);
    has(square, 0, 4, ["intercept"]);
    expect(square).toHaveLength(2);

    const abs = pois("y=\\left|x-1\\right|");
    has(abs, 1, 0, ["extremum"], 1e-7);
    has(abs, 0, 1, ["intercept"]);
    expect(abs).toHaveLength(2);

    const tan = pois("y=\\tan x");
    expect(tan.filter((q) => q.kinds.includes("zero"))).toHaveLength(7);
    expect(tan).toHaveLength(7);

    const hole = pois("y=\\frac{x^{2}-1}{x-1}");
    has(hole, -1, 0, ["zero"]);
    has(hole, 0, 1, ["intercept"]);
    expect(hole).toHaveLength(2);

    const sin = pois("y=\\sin x");
    const zeros = sin.filter((q) => q.kinds.includes("zero")).map((q) => q.x / Math.PI);
    expect(zeros.map(Math.round)).toEqual([-3, -2, -1, 0, 1, 2, 3]);
    expect(sin.filter((q) => q.kinds.includes("extremum"))).toHaveLength(6);

    const cubic = pois("f(x)=x^{3}-3x");
    has(cubic, -1, 2, ["extremum"], 1e-7);
    has(cubic, 1, -2, ["extremum"], 1e-7);
    has(cubic, 0, 0, ["zero", "intercept"]);

    const tiny = pois("y=10^{-8}\\left(x-3\\right)");
    has(tiny, 3, 0, ["zero"]);
    has(tiny, 0, -3e-8, ["intercept"]);
    expect(tiny).toHaveLength(2);
  });

  it("x=g(y), lines and their intersections", () => {
    const sideways = pois("x=y^{2}-1");
    has(sideways, 0, 1, ["zero"]);
    has(sideways, 0, -1, ["zero"]);
    has(sideways, -1, 0, ["intercept", "extremum"], 1e-7);
    const vertical = pois("x=2", "y=x^{2}");
    has(vertical, 2, 0, ["intercept"]);
    has(vertical, 2, 4, ["intersection"]);
    expect(pois("y=3").map((q) => [q.x, q.y, q.kinds])).toEqual([[0, 3, ["intercept"]]]);
    has(pois("y=2x+1", "y=-x+7"), 2, 5, ["intersection"]);
    has(pois("y=x^{2}", "y=0"), 0, 0, ["intercept", "extremum", "intersection"], 1e-7);
  });

  it("conics split into y= branches: intercepts, extrema and intersections", () => {
    const circle = pois("x^{2}+y^{2}=25", "y=x+1");
    has(circle, 5, 0, ["zero"], 1e-6);
    has(circle, -5, 0, ["zero"], 1e-6);
    has(circle, 0, 5, ["intercept", "extremum"], 1e-7);
    has(circle, 0, -5, ["intercept", "extremum"], 1e-7);
    has(circle, 3, 4, ["intersection"], 1e-7);
    has(circle, -4, -3, ["intersection"], 1e-7);
    expect(circle).toHaveLength(6);
    const ellipse = pois("\\frac{x^{2}}{16}+\\frac{y^{2}}{9}=1");
    has(ellipse, 0, 3, ["intercept", "extremum"], 1e-7);
    has(ellipse, 0, -3, ["intercept", "extremum"], 1e-7);
    const tangent = pois("x^{2}+y^{2}=25", "y=5");
    expect(tangent.filter((q) => q.kinds.includes("intersection"))).toHaveLength(1);
    // the line meets the circle from the line's side too
    has(pois("y=x+1", "x^{2}+y^{2}=25"), 3, 4, ["intersection"], 1e-7);
  });

  it("parametric-free implicit curves that are not solvable have none", () => {
    expect(pois("x^{3}+y^{3}=3xy")).toEqual([]);
    expect(pois("\\sin x=\\cos y")).toEqual([]);
    expect(pois("y=x", "\\sin x=\\cos y").some((q) => q.kinds.includes("intersection"))).toBe(
      false
    );
    expect(pois("\\left(1,2\\right)")).toEqual([]);
  });

  it("hidden rows contribute no intersections and an error row has no points", () => {
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

  it("an inequality boundary gets the boundary curve's points and meets other curves", () => {
    const region = pois("y>x^{2}-2", "y=x");
    has(region, 0, -2, ["intercept", "extremum"]);
    has(region, 2, 2, ["intersection"]);
    has(region, -1, -1, ["intersection"]);
  });
});

describe("POI-TRACE-19 extrema land on exact values so labels can show π", () => {
  it("sin x peaks at exactly π/2 and |x−1| bottoms out at exactly 1", () => {
    const sin = pois("y=\\sin x").filter((q) => q.kinds.includes("extremum"));
    expect(sin.map((q) => q.x)).toContain(Math.PI / 2);
    expect(sin.map((q) => q.x)).toContain((-5 * Math.PI) / 2);
    expect(pois("y=\\left|x-1\\right|").map((q) => q.x)).toContain(1);
  });
});

describe("G-22 a list of curves has each element's points, as Desmos marks them", () => {
  it("each element's zero and intercept, but no dot where two elements of the row meet", () => {
    const lines = pois("y=[1,-1]x+[0,2]");
    has(lines, 0, 0, ["zero", "intercept"]);
    has(lines, 0, 2, ["intercept"]);
    has(lines, 2, 0, ["zero"]);
    expect(lines.some((q) => Math.abs(q.x - 1) < 1e-9 && Math.abs(q.y - 1) < 1e-9)).toBe(false);
  });

  it("each element meets the other rows, and line sets and circles split per element", () => {
    const fan = pois("y=[1,2]x", "y=2");
    has(fan, 2, 2, ["intersection"]);
    has(fan, 1, 2, ["intersection"]);
    const verticals = pois("x=[1,3]", "y=x");
    has(verticals, 1, 1, ["intersection"]);
    has(verticals, 3, 3, ["intersection"]);
    const circles = pois("x^{2}+y^{2}=[1,4]");
    for (const r of [1, 2])
      for (const [x, y] of [
        [r, 0],
        [-r, 0],
        [0, r],
        [0, -r],
      ])
        has(circles, x, y);
  });
});
