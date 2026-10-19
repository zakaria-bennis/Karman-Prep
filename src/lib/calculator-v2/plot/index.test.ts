import { expect, it } from "vitest";
import { NO_DEADLINE } from "../core/deadline";
import { counted, EXPLICIT_ROW, runsOf, viewOf, VIEW_800 } from "./__fixtures__/measure";
import type { CurveGeometry, LineSetGeometry, PointGeometry, RegionGeometry } from "./geometry";
import { plotRow, type PlotInput } from "./index";

it("G-1 y=f(x), x=g(y), implicit equations and inequalities all graph", () => {
  const inputs: PlotInput[] = [
    { rowId: "a", kind: "explicit", independent: "x", f: (x) => 2 * x + 3 },
    { rowId: "b", kind: "explicit", independent: "y", f: (y) => y * y },
    { rowId: "c", kind: "implicit", F: (x, y) => x * x + y * y - 25 },
    { rowId: "d", kind: "region", terms: [(x, y) => y, (x) => 2 * x + 1], ops: ["<="] },
    { rowId: "e", kind: "lines", orientation: "vertical", f: (x) => x * x - 4 },
    { rowId: "f", kind: "points", points: [[2, 3]] },
    { rowId: "g", kind: "constant-region", holds: true },
  ];
  const out = inputs.map((input) => plotRow(input, VIEW_800, NO_DEADLINE));
  const kinds = ["curve", "curve", "curve", "region", "lines", "points", "region"];
  expect(out.map((g) => g.kind)).toEqual(kinds);
  expect(out.map((g) => g.rowId).join("")).toBe("abcdefg");
  for (const g of out.slice(0, 3)) expect((g as CurveGeometry).polylines.length).toBeGreaterThan(0);
  expect((out[3] as RegionGeometry).spans.length).toBeGreaterThan(0);
  const roots = Array.from(
    (out[4] as LineSetGeometry).positions,
    (p, k) => Math.abs(p - [-2, 2][k]) * 40
  );
  expect(roots).toHaveLength(2);
  for (const d of roots) expect(d).toBeLessThanOrEqual(0.5);
  expect(Array.from((out[5] as PointGeometry).coords)).toEqual([2, 3]);
  expect(Array.from((out[6] as RegionGeometry).spans)).toEqual([0, 600, 0, 800]);
  const xOfY = runsOf((out[1] as CurveGeometry).polylines).flat();
  for (const [x, y] of xOfY) expect(x === y * y || x === 20).toBe(true); // 20: the guard line
  const f = counted((x: number) => x);
  const zero = viewOf(VIEW_800.viewport, { width: 0, height: 0 }); // a hidden graph
  const empty = plotRow({ ...EXPLICIT_ROW, f: f.fn }, zero, NO_DEADLINE);
  expect([empty.kind, empty.evaluations, f.calls()]).toEqual(["curve", 0, 0]);
});
