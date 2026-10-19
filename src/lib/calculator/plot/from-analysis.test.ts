import { expect, it } from "vitest";
import { analyzeRows } from "../core/analysis/index";
import { NO_DEADLINE } from "../core/deadline";
import { evaluateRows, type EvalSettings } from "../core/eval/compile";
import { buildCompileScope, plotInputFor } from "./from-analysis";
import type { CurveGeometry, LineSetGeometry } from "./geometry";
import { plotRow } from "./index";
import { defaultViewport, worldToPx, type ViewSpec } from "./viewport";

const RAD: EvalSettings = { angleMode: "radians", complex: false };
// 800×600 at dpr 1: x from -10 to 10 and y from -7.5 to 7.5, so 40 px per unit on both axes.
const VIEW: ViewSpec = {
  viewport: defaultViewport({ width: 800, height: 600 }),
  size: { width: 800, height: 600 },
  dpr: 1,
};

/**
 * Analyses `rows` as r0, r1, … (the last one hidden when `options.hidden`) and evaluates them
 * with no deadline; `input(i)` is row i's plot input and `plot(i)` its geometry for VIEW.
 */
function run(rows: readonly string[], settings = RAD, options?: { hidden?: boolean }) {
  const last = rows.length - 1;
  const analysis = analyzeRows(
    rows.map((latex, k) => ({
      id: `r${k}`,
      latex,
      hidden: options?.hidden === true && k === last,
    })),
    settings
  );
  const values = evaluateRows(analysis, settings, () => NO_DEADLINE);
  const scope = buildCompileScope(analysis, values, settings);
  const input = (i = last) => {
    const row = analysis.rows[i];
    return plotInputFor(row, scope, values.get(row.id) ?? null);
  };
  const plot = (i = last) => plotRow(input(i)!, VIEW, NO_DEADLINE);
  return { input, plot };
}

/** The runs of `g.polylines` as world points; a NaN pair ends a run. */
function runsOf(g: CurveGeometry): [number, number][][] {
  const runs: [number, number][][] = [];
  let current: [number, number][] = [];
  for (let k = 0; k + 1 < g.polylines.length; k += 2) {
    const [x, y] = [g.polylines[k], g.polylines[k + 1]];
    if (Number.isNaN(x) || Number.isNaN(y)) {
      if (current.length > 0) runs.push(current);
      current = [];
    } else {
      current.push([x, y]);
    }
  }
  if (current.length > 0) runs.push(current);
  return runs;
}

/** The finite (x, y) pairs of `g.polylines`. */
function vertices(g: CurveGeometry): [number, number][] {
  return runsOf(g).flat();
}

/** The smallest CSS px distance from the world point (x, y) to any segment of `g.polylines`. */
function distPx(g: CurveGeometry, x: number, y: number): number {
  const [px, py] = worldToPx(VIEW, x, y);
  let best = Infinity;
  for (const run of runsOf(g)) {
    for (let k = 1; k < run.length; k++) {
      const [ax, ay] = worldToPx(VIEW, run[k - 1][0], run[k - 1][1]);
      const [bx, by] = worldToPx(VIEW, run[k][0], run[k][1]);
      const [dx, dy] = [bx - ax, by - ay];
      const length2 = dx * dx + dy * dy;
      const s =
        length2 > 0 ? Math.min(1, Math.max(0, ((px - ax) * dx + (py - ay) * dy) / length2)) : 0;
      best = Math.min(best, Math.hypot(px - (ax + s * dx), py - (ay + s * dy)));
    }
  }
  return best;
}

it("NM-16 y=x^{1/3} and y=x^{2/3} are sampled through x = -4", () => {
  for (const [latex, f] of [
    ["y=x^{1/3}", Math.cbrt],
    ["y=x^{2/3}", (x: number) => Math.cbrt(x * x)],
  ] as const)
    expect(distPx(run([latex]).plot() as CurveGeometry, -4, f(-4))).toBeLessThanOrEqual(0.5);
});
it("NM-16 y=x^{2/3} matches y=\\sqrt[3]{x^{2}} within 0.5 px for x < 0", () => {
  const a = run(["y=x^{2/3}"]).plot() as CurveGeometry,
    b = run(["y=\\sqrt[3]{x^{2}}"]).plot() as CurveGeometry;
  for (const [p, q] of [
    [a, b],
    [b, a],
  ])
    for (const [x, y] of vertices(p)) if (x < 0) expect(distPx(q, x, y)).toBeLessThanOrEqual(0.5);
});
it.each([
  [
    "y=2x+3",
    "explicit",
    [
      [0, 3],
      [1, 5],
    ],
  ],
  [
    "y-1=2(x+3)",
    null,
    [
      [0, 7],
      [-3, 1],
    ],
  ],
  [
    "2x+3y=6",
    null,
    [
      [0, 2],
      [3, 0],
    ],
  ],
  [
    "x=y^{2}",
    "explicit",
    [
      [4, 2],
      [4, -2],
      [0, 0],
    ],
  ],
  [
    "x^{2}+y^{2}=25",
    "implicit",
    [
      [3, 4],
      [-5, 0],
    ],
  ],
] as const)("AR-44 plotInputFor graphs %s through compiled closures", (latex, kind, points) => {
  const p = run([latex]);
  if (kind) expect(p.input()!.kind).toBe(kind);
  for (const [x, y] of points)
    expect(distPx(p.plot() as CurveGeometry, x, y)).toBeLessThanOrEqual(0.5);
});
it("AR-44 plotInputFor maps x^{2}=4 and y^{2}=9 to lines at their roots", () => {
  for (const [latex, orientation, roots] of [
    ["x^{2}=4", "vertical", [-2, 2]],
    ["y^{2}=9", "horizontal", [-3, 3]],
  ] as const) {
    expect(run([latex]).input()).toMatchObject({ kind: "lines", orientation });
    const g = run([latex]).plot() as LineSetGeometry;
    expect(g.orientation).toBe(orientation);
    const positions = [...g.positions].sort((a, b) => a - b);
    expect(positions).toHaveLength(2);
    positions.forEach((p, i) => expect(Math.abs(p - roots[i])).toBeLessThanOrEqual(0.0125));
  }
});
it("AR-44 plotInputFor graphs y=a after the dependent definition a=2x (RC-6)", () => {
  const p = run(["a=2x", "y=a"]);
  expect(p.input()!.kind).toBe("explicit");
  expect(distPx(p.plot() as CurveGeometry, 1, 2)).toBeLessThanOrEqual(0.5);
});
it("AR-44 plotInputFor graphs the function-definition row f(x)=x^{2} itself (RC-5)", () => {
  const p = run(["f(x)=x^{2}"]);
  expect(p.input()!.kind).toBe("explicit");
  expect(distPx(p.plot() as CurveGeometry, 2, 4)).toBeLessThanOrEqual(0.5);
});
it("AR-44 buildCompileScope puts constant definitions in values and dependent definitions only in functions", () => {
  const analysis = analyzeRows(
    [
      { id: "r0", latex: "a=2x", hidden: false },
      { id: "r1", latex: "b=3", hidden: false },
    ],
    RAD
  );
  const scope = buildCompileScope(
    analysis,
    evaluateRows(analysis, RAD, () => NO_DEADLINE),
    RAD
  );
  expect([...scope.values.entries()]).toEqual([["b", { type: "number", value: 3 }]]);
  expect(scope.functions.has("a")).toBe(true);
});
it("AR-44 plotInputFor maps inequalities to regions and evaluates 3>2 once", () => {
  const a = run(["1<y<3"]).input()!;
  expect(a.kind === "region" && [a.ops, a.terms.map((t) => t(0, 2))]).toEqual([
    ["<", "<"],
    [1, 2, 3],
  ]);
  const b = run(["y\\le2x+1"]).input()!;
  expect(b.kind === "region" && [b.ops, b.terms.map((t) => t(1, 0))]).toEqual([["<="], [0, 3]]);
  expect(run(["3>2"]).input()).toMatchObject({ kind: "constant-region", holds: true });
  expect(run(["3<2"]).input()).toMatchObject({ kind: "constant-region", holds: false });
});
it("AR-44 plotInputFor plots (2,3) and returns null for undefined points, hidden, error and non-graphing rows", () => {
  expect(run(["(2,3)"]).input()).toEqual({ rowId: "r0", kind: "points", points: [[2, 3]] });
  for (const latex of ["(\\frac{1}{0},2)", "\\frac{", "2+3", "a=2"])
    expect(run([latex]).input()).toBeNull();
  expect(run(["y=x"], RAD, { hidden: true }).input()).toBeNull();
});
