// Golden graph cases through the real pipeline (AR-44): every graph.ts case is analysed,
// evaluated, mapped to plot inputs and plotted headless, exactly as the executor does it, then
// checked against its G- rule in the default 800×600 view.

import { expect, it } from "vitest";
import { analyzeRows, type RowSource } from "../core/analysis/index";
import cases from "../core/corpus/cases/graph";
import type { CorpusCase } from "../core/corpus/types";
import { NO_DEADLINE } from "../core/deadline";
import { evaluateRows, type EvalSettings } from "../core/eval/compile";
import {
  mid,
  pointToSegmentPx,
  pxDistance,
  runsOf,
  segmentsOf,
  VIEW_800,
  type Pt,
} from "./__fixtures__/measure";
import { buildCompileScope, plotInputFor } from "./from-analysis";
import type { Geometry } from "./geometry";
import { EXPLICIT_BUDGET, IMPLICIT_BUDGET, plotRow, type PlotInput } from "./index";
import { worldToPx, type ViewSpec } from "./viewport";

interface GoldenRun {
  view: ViewSpec;
  geometry: Map<string, Geometry>;
  kinds: Map<string, PlotInput["kind"]>;
}

// The default 800×600 view at dpr 1: 40 px per unit, so py(y) = (7.5 − y)·40.
const PX_PER_UNIT = 40;
const py = (y: number) => (7.5 - y) * PX_PER_UNIT;
// Evaluations each plot input may spend (G-15); points and constant regions evaluate nothing.
const BUDGET: Record<PlotInput["kind"], number> = {
  explicit: EXPLICIT_BUDGET,
  lines: EXPLICIT_BUDGET,
  implicit: IMPLICIT_BUDGET,
  region: IMPLICIT_BUDGET,
  points: 0,
  "constant-region": 0,
};

/**
 * Runs `c` as the executor would: context rows `ctx-1…` in order, then the case row `case`;
 * analyzeRows, evaluateRows, buildCompileScope, then plotInputFor and plotRow for every
 * graphable row in the default view.
 */
function runGolden(c: CorpusCase): GoldenRun {
  if (!("latex" in c.input)) throw new Error(`${c.id}: graph cases take latex input`);
  const settings: EvalSettings = {
    angleMode: c.settings?.angleMode ?? "radians",
    complex: c.settings?.complex ?? false,
  };
  const sources: RowSource[] = [
    ...(c.rows ?? []).map((latex, k) => ({ id: `ctx-${k + 1}`, latex, hidden: false })),
    { id: "case", latex: c.input.latex, hidden: false },
  ];
  const analysis = analyzeRows(sources, settings);
  const values = evaluateRows(analysis, settings, () => NO_DEADLINE);
  const scope = buildCompileScope(analysis, values, settings);
  const run: GoldenRun = { view: VIEW_800, geometry: new Map(), kinds: new Map() };
  for (const row of analysis.rows) {
    const input = plotInputFor(row, scope, values.get(row.id) ?? null);
    if (input === null) continue;
    run.kinds.set(row.id, input.kind);
    run.geometry.set(row.id, plotRow(input, run.view, NO_DEADLINE));
  }
  return run;
}

const isPair = (x: number, y: number) =>
  (Number.isNaN(x) && Number.isNaN(y)) || (Number.isFinite(x) && Number.isFinite(y));
const allFinite = (a: Float64Array | Float32Array) => a.every((v) => Number.isFinite(v));

/** Every number in `g` is finite except NaN, NaN run breaks in polylines. */
function expectFinite(g: Geometry): void {
  switch (g.kind) {
    case "curve": {
      const p = g.polylines;
      let bad = p.length % 2;
      for (let k = 0; k + 1 < p.length; k += 2) if (!isPair(p[k], p[k + 1])) bad++;
      expect(bad, `${g.rowId} polylines`).toBe(0);
      expect(allFinite(g.bands), `${g.rowId} bands`).toBe(true);
      return;
    }
    case "lines":
      return expect(allFinite(g.positions), `${g.rowId} positions`).toBe(true);
    case "points":
      return expect(allFinite(g.coords), `${g.rowId} coords`).toBe(true);
    case "region":
      expect(allFinite(g.spans), `${g.rowId} spans`).toBe(true);
      g.boundaries.forEach(expectFinite);
  }
}

/** NaN only as x, y pairs, and no more evaluations than the input kind's G-15 budget. */
function expectFiniteWithinBudget(g: Geometry, kind: PlotInput["kind"]): void {
  expectFinite(g);
  expect(g.evaluations, `${g.rowId} evaluations`).toBeLessThanOrEqual(BUDGET[kind]);
}

/** The geometry of `rowId`, which must be of `kind`. */
function geometryOf<K extends Geometry["kind"]>(
  r: GoldenRun,
  kind: K,
  rowId = "case"
): Extract<Geometry, { kind: K }> {
  const g = r.geometry.get(rowId);
  expect(g?.kind, rowId).toBe(kind);
  return g as Extract<Geometry, { kind: K }>;
}

/** The case row's curve: its vertices and segments, each list non-empty. */
function curveOf(r: GoldenRun, rowId = "case") {
  const g = geometryOf(r, "curve", rowId);
  const vertices = runsOf(g.polylines).flat();
  const segments = segmentsOf(g.polylines);
  expect(segments.length, `${rowId} segments`).toBeGreaterThan(0);
  return { g, vertices, segments };
}

/** The segments of the case curve with x0 < c < x1. */
function crossing(r: GoldenRun, c: number): [Pt, Pt][] {
  return curveOf(r).segments.filter(
    ([a, b]) => Math.min(a[0], b[0]) < c && c < Math.max(a[0], b[0])
  );
}

/** The least CSS px distance from the world point `p` to a vertex of the case curve. */
function nearestVertexPx(r: GoldenRun, p: Pt): number {
  return curveOf(r).vertices.reduce(
    (best, v) => Math.min(best, pxDistance(r.view, v, p)),
    Infinity
  );
}

/** The least CSS px distance from the world point `p` to anything `g` draws. */
function distancePx(view: ViewSpec, g: Geometry, p: Pt): number {
  switch (g.kind) {
    case "table":
      return Infinity; // no golden case plots a table
    case "curve": {
      let best = Infinity;
      for (const run of runsOf(g.polylines)) {
        if (run.length === 1) best = Math.min(best, pxDistance(view, run[0], p));
        for (let k = 1; k < run.length; k++)
          best = Math.min(best, pointToSegmentPx(view, p, run[k - 1], run[k]));
      }
      return best;
    }
    case "lines": {
      const vertical = g.orientation === "vertical";
      const [ux, uy] = worldToPx(view, p[0], p[1]);
      return Math.min(
        ...Array.from(g.positions, (c) => {
          const [qx, qy] = worldToPx(view, vertical ? c : p[0], vertical ? p[1] : c);
          return Math.hypot(qx - ux, qy - uy);
        })
      );
    }
    case "points": {
      let best = Infinity;
      for (let k = 0; k + 1 < g.coords.length; k += 2)
        best = Math.min(best, pxDistance(view, [g.coords[k], g.coords[k + 1]], p));
      return best;
    }
    case "region":
      return Math.min(...g.boundaries.map((b) => distancePx(view, b, p)));
  }
}

/** Every point of `points` lies within 0.5 px of `rowId`'s geometry. */
function expectThrough(r: GoldenRun, points: Pt[], rowId = "case"): void {
  const g = r.geometry.get(rowId);
  expect(g, rowId).toBeDefined();
  for (const p of points)
    expect(distancePx(r.view, g!, p), `${rowId} (${p[0]}, ${p[1]})`).toBeLessThanOrEqual(0.5);
}

/** `actual` has the length of `expected` and each entry within `tolerance` of it. */
function expectNear(actual: Float64Array, expected: number[], tolerance: number): void {
  expect(actual).toHaveLength(expected.length);
  expected.forEach((e, k) => expect(Math.abs(actual[k] - e)).toBeLessThanOrEqual(tolerance));
}

/** G-11: every vertex and segment midpoint lies within 0.5 px of y = f(x), slope df. */
function expectOnCurve(r: GoldenRun, f: (x: number) => number, df: (x: number) => number) {
  const { vertices, segments } = curveOf(r);
  const worst = [...vertices, ...segments.map(([a, b]) => mid(a, b))].reduce(
    (w, [x, y]) => Math.max(w, (Math.abs(y - f(x)) * PX_PER_UNIT) / Math.sqrt(1 + df(x) ** 2)),
    0
  );
  expect(worst).toBeLessThanOrEqual(0.5);
}

const quadrant = ([x, y]: Pt) => (x > 0 && y > 0 ? 1 : x < 0 && y < 0 ? 3 : x <= 0 ? 2 : 4);
const tanInterval = (x: number) => Math.floor((x + Math.PI / 2) / Math.PI);

const CHECKS: Record<string, (r: GoldenRun) => void> = {
  "graph-1": (r) => {
    const { segments } = curveOf(r);
    expect(segments.filter(([a, b]) => tanInterval(a[0]) !== tanInterval(b[0]))).toEqual([]);
  },
  "graph-2": (r) => expect(crossing(r, 0)).toEqual([]),
  "graph-3": (r) => expect(crossing(r, 2)).toEqual([]),
  "graph-4": (r) => {
    expect(nearestVertexPx(r, [-1, 0])).toBeLessThanOrEqual(0.5);
    expect(nearestVertexPx(r, [1, 0])).toBeLessThanOrEqual(0.5);
  },
  "graph-5": (r) => expect(nearestVertexPx(r, [0, 0])).toBeLessThanOrEqual(0.5),
  "graph-6": (r) => expect(nearestVertexPx(r, [3, 2])).toBeLessThanOrEqual(0.5),
  "graph-7": (r) => {
    const lowest = curveOf(r).vertices.reduce((low, [, y]) => Math.min(low, y), Infinity);
    expect(lowest).toBeLessThanOrEqual(-7.5 + 0.0125);
  },
  "graph-8": (r) =>
    expectOnCurve(
      r,
      (x) => x * x,
      (x) => 2 * x
    ),
  "graph-9": (r) => expectOnCurve(r, Math.sin, Math.cos),
  "graph-10": (r) => expect(geometryOf(r, "curve").bands.length).toBeGreaterThan(0),
  "graph-11": (r) => {
    if (crossing(r, 1).length > 0) return;
    const { vertices } = curveOf(r);
    const left = vertices.filter(([x]) => x < 1).reduce((a, v) => (v[0] > a[0] ? v : a));
    const right = vertices.filter(([x]) => x > 1).reduce((a, v) => (v[0] < a[0] ? v : a));
    expect(pxDistance(r.view, left, right)).toBeLessThanOrEqual(1);
  },
  "graph-12": (r) => {
    const { vertices } = curveOf(r);
    const worst = vertices.reduce((w, [x, y]) => Math.max(w, Math.abs(Math.hypot(x, y) - 5)), 0);
    expect(worst * PX_PER_UNIT).toBeLessThanOrEqual(0.5);
  },
  "graph-13": (r) => {
    const { vertices, segments } = curveOf(r);
    expect([...new Set(vertices.map(quadrant))].sort()).toEqual([1, 3]);
    expect(segments.filter(([a, b]) => quadrant(a) !== quadrant(b))).toEqual([]);
  },
  "graph-14": (r) => {
    expectThrough(r, [[0, 5]]);
    expectThrough(r, [[0, 5]], "ctx-1");
  },
  "graph-15": (r) => {
    const g = geometryOf(r, "lines");
    expect(g.orientation).toBe("vertical");
    expectNear(g.positions, [3], 0.0125);
  },
  "graph-16": (r) => expectNear(geometryOf(r, "points").coords, [2, 3], 0.0125),
  "graph-17": (r) => {
    const [top, bottom] = [py(3), py(1)];
    const { spans } = geometryOf(r, "region");
    const rows: [number, number][] = [];
    for (let k = 0; k + 3 < spans.length; k += 4)
      if (spans[k + 2] <= 400 && 400 < spans[k + 3]) rows.push([spans[k], spans[k + 1]]);
    expect(rows.filter(([a, b]) => a < top - 1 || b > bottom + 1)).toEqual([]);
    let reach = top + 1;
    for (const [a, b] of rows.sort((p, q) => p[0] - q[0]))
      if (a <= reach) reach = Math.max(reach, b);
    expect(reach).toBeGreaterThanOrEqual(bottom - 1);
  },
  "graph-18": (r) => {
    const { boundaries } = geometryOf(r, "region");
    expect(boundaries.length).toBeGreaterThan(0);
    expect(boundaries.every((b) => b.dashed)).toBe(true);
  },
  "graph-19": (r) => {
    const { boundaries } = geometryOf(r, "region");
    expect(boundaries.length).toBeGreaterThan(0);
    expect(boundaries.some((b) => b.dashed)).toBe(false);
  },
  "graph-20": (r) =>
    expectThrough(
      r,
      [
        [0, 1],
        [1, 2],
      ],
      "ctx-1"
    ),
  "graph-21": (r) =>
    expectThrough(r, [
      [4, 2],
      [4, -2],
      [0, 0],
    ]),
};

it("AR-44 every graph.ts case has exactly one golden check", () =>
  expect(Object.keys(CHECKS).sort()).toEqual(cases.map((c) => c.id).sort()));
it.each(cases.map((c) => [c.id, c] as const))(
  "AR-44 golden %s runs through analyzeRows, evaluateRows, plotInputFor and plotRow",
  (id, c) => {
    const run = runGolden(c);
    for (const [rowId, g] of run.geometry) expectFiniteWithinBudget(g, run.kinds.get(rowId)!);
    CHECKS[id](run);
  }
);
