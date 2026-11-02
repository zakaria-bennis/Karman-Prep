// The engine gaps the 2026-11-02 held-figure redraw found (figure-redraw/held-01/REPORT.md),
// one block each. Function constants (gap 5) are tested with the sampler
// (tests/unit/figures/authoring/sample-functions.test.ts).
import { describe, expect, it } from "vitest";
import { buildChart } from "@/lib/figures/engine/charts";
import { checkSpec, checkSpecs } from "@/lib/figures/engine/checks";
import { buildGeometry2d } from "@/lib/figures/engine/geometry2d";
import { textOverlap } from "@/lib/figures/engine/labels";
import { buildPlane } from "@/lib/figures/engine/plane";
import type { Scene, SceneItem } from "@/lib/figures/engine/scene";
import {
  FIGURE_SPEC_VERSION,
  parseFigureSpec,
  type FigureSpec,
  type PlaneFrame,
} from "@/lib/figures/engine/spec";

type TextItem = Extract<SceneItem, { t: "text" }>;
type PathItem = Extract<SceneItem, { t: "path" }>;
const texts = (s: Scene) => s.items.filter((i): i is TextItem => i.t === "text");
const paths = (s: Scene) => s.items.filter((i): i is PathItem => i.t === "path");
const named = (s: Scene, text: string) => texts(s).filter((t) => t.text === text);
const CHART_BOX = { width: 600, height: 400 };
const PLANE_BOX = { width: 640, height: 480 };

/** 2025-05_ASIA_V3_MATH_M2_Q17's two histograms, as the redraw stored them. */
function histogram(values: [number, number][], frame: PlaneFrame, title: string): FigureSpec {
  return {
    version: FIGURE_SPEC_VERSION,
    type: "histogram",
    parts: [{ kind: "series", id: "s1", values }],
    labels: [],
    marks: [],
    frame,
    title,
  };
}
const AXES = { yStep: 2, xLabel: "Weight (grams)", yLabel: "Number of objects" };
const groupA = (extra: Partial<PlaneFrame> = {}) =>
  histogram(
    [
      [0, 6],
      [1, 3],
      [2, 2],
      [3, 3],
      [4, 6],
    ],
    { x: [0, 5], y: [0, 12], step: 1, ...AXES, ...extra },
    "Group A"
  );
const groupB = (extra: Partial<PlaneFrame> = {}) =>
  histogram(
    [
      [9, 2],
      [10, 3],
      [11, 10],
      [12, 3],
      [13, 2],
    ],
    { x: [9, 14], y: [0, 12], step: 1, ...AXES, ...extra },
    "Group B"
  );
const ticksA = ["0", "2", "4", "6", "8", "10", "12", "0", "1", "2", "3", "4", "5"];
const ticksB = ["0", "2", "4", "6", "8", "10", "12", "0", "9", "10", "11", "12", "13", "14"];
const words = ["Weight (grams)", "Number of objects"];

/** The two shapes "x" and "y" of two text items: [left, right, top, bottom] of each glyph run. */
const apart = (a: TextItem, b: TextItem) => {
  const [w, h] = textOverlap(a, b);
  return !(w > 1 && h > 1);
};

describe("gap 1: a chart labels the y-axis 0 at its base", () => {
  it("keeps the y 0 beside an x tick number where the axes meet away from the origin", () => {
    // Team A of 2024-10_ASIA_V1_MATH_M2_Q07: x from 15, so "0" and "15" share the corner.
    const spec = histogram(
      [
        [25, 43],
        [30, 48],
        [35, 43],
      ],
      { x: [15, 50], y: [0, 50], step: 5, yStep: 10, xLabel: "Score", yLabel: "Frequency" },
      "Team A"
    );
    const scene = buildChart(spec, CHART_BOX);
    const zero = named(scene, "0");
    expect(zero).toHaveLength(1);
    expect(zero[0].anchor).toBe("end");
    expect(apart(zero[0], named(scene, "15")[0])).toBe(true);
    const labels = ["0", "10", "20", "30", "40", "50", "15", "20", "25", "30", "35", "40", "45"];
    expect(checkSpec(spec, [...labels, "50", "Score", "Frequency", "Team A"])).toEqual([]);
  });

  it('prints 0 on each axis with originLabel: "both", as Group A does', () => {
    const one = buildChart(groupA(), CHART_BOX);
    expect(named(one, "0")).toHaveLength(1);
    const both = buildChart(groupA({ originLabel: "both" }), CHART_BOX);
    const zeros = named(both, "0");
    expect(zeros.map((t) => t.anchor).sort()).toEqual(["end", "middle"]);
    expect(apart(zeros[0], zeros[1])).toBe(true);
    expect(checkSpec(groupA({ originLabel: "both" }), [...ticksA, ...words, "Group A"])).toEqual(
      []
    );
  });

  it('says to set originLabel "both" when the original prints a second 0', () => {
    const issues = checkSpec(groupA(), [...ticksA, ...words, "Group A"]);
    expect(issues).toHaveLength(1);
    expect(issues[0].code).toBe("missing_label");
    expect(issues[0].detail).toContain('originLabel to "both"');
  });

  it("tells digits apart by their glyphs, not the generous text box", () => {
    const y0: TextItem = { t: "text", x: 100, y: 205, text: "0", role: "ink", anchor: "end" };
    const x15: TextItem = { t: "text", x: 106, y: 218, text: "15", role: "ink", anchor: "middle" };
    expect(apart(y0, x15)).toBe(true);
    // Words keep the generous box: a descender may hang into the line below.
    const word: TextItem = { ...y0, text: "g" };
    expect(apart(word, x15)).toBe(false);
    // Digits that really touch still overlap.
    expect(apart(y0, { ...x15, x: 98, y: 210 })).toBe(false);
  });
});

describe("gap 2: axis breaks", () => {
  it("parses xBreak and yBreak, and refuses a break on a range that starts at 0 or below", () => {
    expect(parseFigureSpec(groupB({ xBreak: true })).ok).toBe(true);
    const r = parseFigureSpec(groupA({ xBreak: true }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.join()).toContain("break");
    expect(parseFigureSpec(groupB({ yBreak: true })).ok).toBe(false);
  });

  it("draws Group B's x-axis from a 0 at the corner, with a zig-zag before 9", () => {
    const spec = groupB({ xBreak: true, originLabel: "both" });
    const scene = buildChart(spec, CHART_BOX);
    const xAxis = paths(scene).find((p) => p.partId === "axis" && p.d.split("L").length > 3)!;
    expect(xAxis).toBeDefined();
    const xs = named(scene, "9")[0].x;
    const zeros = named(scene, "0");
    expect(zeros).toHaveLength(2);
    const x0 = zeros.find((t) => t.anchor === "middle")!;
    const y0 = zeros.find((t) => t.anchor === "end")!;
    // The x 0 sits 2/3 of a step left of 9 (as Bluebook draws it), under the y-axis; the
    // y 0 sits beside the base.
    const step = named(scene, "10")[0].x - xs;
    expect(xs - x0.x).toBeCloseTo((2 / 3) * step, 1);
    expect(y0.y).toBeLessThan(x0.y);
    // The zig-zag lies between the corner and the first tick.
    const zig = [...xAxis.d.matchAll(/[ML](-?[\d.]+) (-?[\d.]+)/g)].map((m) => +m[1]);
    const inner = zig.slice(1, -1);
    expect(Math.min(...inner)).toBeGreaterThan(x0.x);
    expect(Math.max(...inner)).toBeLessThan(xs);
    // Bins still sit at their values: no tick, number or bin at 8.
    expect(named(scene, "8").filter((t) => t.anchor === "middle")).toHaveLength(0);
    expect(checkSpec(spec, [...ticksB, ...words, "Group B"])).toEqual([]);
  });

  it("breaks the y-axis of a scatterplot whose values start well above 0", () => {
    const spec: FigureSpec = {
      version: FIGURE_SPEC_VERSION,
      type: "scatter",
      parts: [
        {
          kind: "series",
          id: "s",
          values: [
            [1, 62],
            [2, 70],
            [3, 81],
          ],
        },
      ],
      labels: [],
      marks: [],
      frame: { x: [0, 4], y: [60, 90], step: 1, yStep: 10, yBreak: true },
    };
    const scene = buildChart(spec, CHART_BOX);
    const yAxis = paths(scene).filter((p) => p.partId === "axis")[1];
    expect(yAxis.d.split("L").length).toBeGreaterThan(3);
    expect(named(scene, "0")).toHaveLength(1);
    expect(named(scene, "50")).toHaveLength(0);
    // The shared corner reads 0 once; the 60 tick sits one step above it.
    const sixty = named(scene, "60")[0];
    expect(sixty.y).toBeLessThan(named(scene, "0")[0].y);
    expect(scene.issues).toEqual([]);
  });

  it("draws a plane unchanged when no break is asked for", () => {
    const frame = { x: [-5, 5] as [number, number], y: [-5, 5] as [number, number], step: 1 };
    const spec: FigureSpec = {
      version: FIGURE_SPEC_VERSION,
      type: "plane",
      parts: [],
      labels: [],
      marks: [],
      frame,
    };
    const axes = paths(buildPlane(spec, PLANE_BOX)).filter((p) => p.partId === "axis");
    expect(axes.every((p) => p.d.split("L").length === 2)).toBe(true);
  });
});

describe("gap 3: minor ticks between labelled ticks", () => {
  const plane = (frame: PlaneFrame): FigureSpec => ({
    version: FIGURE_SPEC_VERSION,
    type: "plane",
    parts: [],
    labels: [],
    marks: [],
    frame,
  });
  /** Unlabelled tick marks: short axis-crossing paths with no part. */
  const ticks = (s: Scene) => paths(s).filter((p) => p.partId === undefined && p.role === "ink");

  it("draws an unlabelled tick every minorStep, shorter than a labelled one", () => {
    const base = { x: [0, 10] as [number, number], y: [0, 10] as [number, number], step: 2 };
    const plain = buildPlane(plane(base), PLANE_BOX);
    const minor = buildPlane(plane({ ...base, minorStep: 1 }), PLANE_BOX);
    // 0 to 10 every 1 on each axis, less the labelled even ones and the corner.
    expect(ticks(minor).length - ticks(plain).length).toBe(10);
    const len = (p: PathItem) => {
      const n = [...p.d.matchAll(/-?[\d.]+/g)].map((m) => +m[0]);
      return Math.hypot(n[2] - n[0], n[3] - n[1]);
    };
    const majors = new Set(ticks(plain).map((p) => p.d));
    const minors = ticks(minor).filter((p) => !majors.has(p.d));
    expect(Math.max(...minors.map(len))).toBeLessThan(Math.min(...ticks(plain).map(len)));
    expect(texts(minor).map((t) => t.text)).toEqual(texts(plain).map((t) => t.text));
  });

  it("takes a y minor step of its own, and refuses a non-positive one", () => {
    const base = { x: [0, 10] as [number, number], y: [0, 10] as [number, number], step: 2 };
    const plain = buildPlane(plane(base), PLANE_BOX);
    const yOnly = buildPlane(plane({ ...base, yMinorStep: 1, minorStep: 2 }), PLANE_BOX);
    expect(ticks(yOnly).length - ticks(plain).length).toBe(5);
    expect(parseFigureSpec(plane({ ...base, minorStep: 0 })).ok).toBe(false);
  });

  it("puts minor ticks on a dot plot's number line", () => {
    const spec: FigureSpec = {
      version: FIGURE_SPEC_VERSION,
      type: "dot_plot",
      parts: [{ kind: "series", id: "s", values: [1, 2, 2, 3] }],
      labels: [],
      marks: [],
      frame: { x: [0, 4], y: [0, 1], step: 1, minorStep: 0.5 },
    };
    const scene = buildChart(spec, CHART_BOX);
    expect(ticks(scene).length).toBe(9);
    expect(scene.issues).toEqual([]);
  });
});

describe("gap 4: a line without arrowheads", () => {
  const shape = (arrows?: false): FigureSpec => ({
    version: FIGURE_SPEC_VERSION,
    type: "geometry2d",
    parts: [
      { kind: "point", id: "A", x: 0, y: 0 },
      { kind: "point", id: "B", x: 4, y: 1 },
      arrows === false
        ? { kind: "line", id: "l", from: "A", to: "B", arrows: false }
        : { kind: "line", id: "l", from: "A", to: "B" },
    ],
    labels: [],
    marks: [],
  });

  it("draws a line with arrowheads unless it says arrows: false", () => {
    const line = (s: Scene) => paths(s).find((p) => p.partId === "l")!;
    expect(line(buildGeometry2d(shape(), { width: 400, height: 300 })).arrows).toBe("both");
    expect(line(buildGeometry2d(shape(false), { width: 400, height: 300 })).arrows).toBeUndefined();
    expect(checkSpecs([shape(false)], []).filter((i) => i.code === "arrow_rule")).toEqual([]);
  });

  it("draws a plane line without arrowheads, still reaching the frame's edges", () => {
    const spec: FigureSpec = {
      version: FIGURE_SPEC_VERSION,
      type: "plane",
      parts: [
        { kind: "point", id: "A", x: 0, y: 0 },
        { kind: "point", id: "B", x: 1, y: 1 },
        { kind: "line", id: "l", from: "A", to: "B", arrows: false },
      ],
      labels: [],
      marks: [],
      frame: { x: [-5, 5], y: [-5, 5], step: 1 },
    };
    const scene = buildPlane(spec, PLANE_BOX);
    const l = paths(scene).find((p) => p.partId === "l")!;
    expect(l.arrows).toBeUndefined();
    expect(checkSpecs([spec], []).filter((i) => i.code === "arrow_rule")).toEqual([]);
  });

  it("refuses arrows: true and arrows on segments and rays, which keep their rule", () => {
    const withArrows = (kind: string, arrows: unknown) =>
      parseFigureSpec({
        ...shape(),
        parts: [...shape().parts.slice(0, 2), { kind, id: "l", from: "A", to: "B", arrows }],
      }).ok;
    expect(withArrows("line", true)).toBe(false);
    expect(withArrows("segment", false)).toBe(false);
    expect(withArrows("ray", false)).toBe(false);
  });
});
