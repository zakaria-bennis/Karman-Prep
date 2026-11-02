import { describe, expect, it } from "vitest";
import { parseFigureSpec, FIGURE_SPEC_VERSION, type FigureSpec } from "@/lib/figures/engine/spec";
import { curveFor, sampleSpec } from "../../../../scripts/figures/sample-functions";

const FRAME = { x: [-5, 5] as [number, number], y: [-5, 5] as [number, number], step: 1 };
const BOX = { width: 320, height: 320 };
const SPAN = 10;

/** Nearest polyline vertex distance to (x, y), in world units. */
function nearest(runs: number[][], x: number, y: number): number {
  let best = Infinity;
  for (const run of runs) {
    for (let i = 0; i + 1 < run.length; i += 2) {
      best = Math.min(best, Math.hypot(run[i] - x, run[i + 1] - y));
    }
  }
  return best;
}

describe("curveFor", () => {
  it("y=2x^2-3 passes through (1,-1) and (2,5)", () => {
    const runs = curveFor("y=2x^2-3", FRAME, BOX);
    expect(runs.length).toBeGreaterThan(0);
    expect(nearest(runs, 1, -1)).toBeLessThan(0.01 * SPAN);
    expect(nearest(runs, 2, 5)).toBeLessThan(0.01 * SPAN);
  });

  it("1/(x-2) has no segment crossing x=2", () => {
    const runs = curveFor("y=\\frac{1}{x-2}", FRAME, BOX);
    expect(runs.length).toBeGreaterThanOrEqual(2);
    for (const run of runs) {
      for (let i = 0; i + 3 < run.length; i += 2) {
        const a = run[i] - 2;
        const b = run[i + 2] - 2;
        expect(a * b < 0).toBe(false);
      }
    }
  });

  it("\\sqrt{x} draws nothing left of 0", () => {
    const runs = curveFor("y=\\sqrt{x}", FRAME, BOX);
    expect(runs.length).toBeGreaterThan(0);
    for (const run of runs) {
      for (let i = 0; i < run.length; i += 2) expect(run[i]).toBeGreaterThanOrEqual(-1e-9);
    }
  });
});

describe("curveFor: flat and vertical lines (the calculator draws them as line sets)", () => {
  it.each(["y=-5", "y=0", "y=\\frac{3}{2}", "y = -0.5"])(
    "%s draws one level run across the frame",
    (latex) => {
      const level = { "y=-5": -5, "y=0": 0, "y=\\frac{3}{2}": 1.5, "y = -0.5": -0.5 }[latex]!;
      const f = { ...FRAME, y: [-6, 6] as [number, number] };
      const runs = curveFor(latex, f, BOX);
      expect(runs).toHaveLength(1);
      const [x0, y0, x1, y1] = runs[0];
      expect([x0, x1]).toEqual([-5, 5]);
      expect(y0).toBeCloseTo(level, 12);
      expect(y1).toBeCloseTo(level, 12);
    }
  );

  it("x=3 draws one vertical run from the frame's bottom to its top", () => {
    expect(curveFor("x=3", FRAME, BOX)).toEqual([[3, -5, 3, 5]]);
  });

  it("a constant off the frame draws nothing", () => {
    expect(curveFor("y=9", FRAME, BOX)).toEqual([]);
    expect(curveFor("x=-9", FRAME, BOX)).toEqual([]);
  });

  it("a bare expression graphs as y = it: -5 is the level line, x^2 the parabola", () => {
    expect(curveFor("-5", FRAME, BOX)).toEqual(curveFor("y=-5", FRAME, BOX));
    expect(curveFor("x^2", FRAME, BOX)).toEqual(curveFor("y=x^2", FRAME, BOX));
  });

  it("plain bars |x| read as absolute value", () => {
    const runs = curveFor("y=|x-2|", FRAME, BOX);
    expect(runs).toEqual(curveFor("y=\\left|x-2\\right|", FRAME, BOX));
    expect(nearest(runs, 2, 0)).toBeLessThan(0.01 * SPAN);
  });

  it("sampleSpec keeps a constant to its domain", () => {
    const spec: FigureSpec = {
      version: FIGURE_SPEC_VERSION,
      type: "plane",
      parts: [{ kind: "function", id: "c", latex: "y=-2", domain: [-1, 2] }],
      labels: [],
      marks: [],
      frame: FRAME,
    };
    const out = sampleSpec(spec, BOX).parts[0];
    expect(out.kind === "function" && out.samples).toEqual([
      [
        [-1, -2],
        [2, -2],
      ],
    ]);
  });
});

describe("sampleSpec", () => {
  const spec: FigureSpec = {
    version: FIGURE_SPEC_VERSION,
    type: "plane",
    parts: [
      { kind: "point", id: "A", x: 1, y: 1 },
      { kind: "function", id: "f", latex: "y=\\frac{1}{x-2}" },
      { kind: "function", id: "g", latex: "y=x", domain: [0, 3] },
      { kind: "function", id: "h", latex: "y=x", domain: [8, 9] },
    ],
    labels: [],
    marks: [],
    frame: FRAME,
  };

  it("fills samples for every function part as finite pairs, and the result validates", () => {
    const out = sampleSpec(spec);
    const parsed = parseFigureSpec(out);
    expect(parsed.ok, parsed.ok ? "" : parsed.errors.join("; ")).toBe(true);
    expect(out.parts[0]).toEqual(spec.parts[0]);
    for (const part of out.parts) {
      if (part.kind !== "function") continue;
      expect(part.samples, part.id).toBeDefined();
      for (const run of part.samples!)
        for (const p of run) expect(p.every(Number.isFinite)).toBe(true);
    }
  });

  it("keeps the asymptote break, the domain, and an empty result for a domain off the frame", () => {
    const out = sampleSpec(spec);
    const [f, g, h] = out.parts.slice(1) as Extract<
      FigureSpec["parts"][number],
      { kind: "function" }
    >[];
    expect(f.samples!.length).toBeGreaterThanOrEqual(2);
    const gx = g.samples!.flat().map(([x]) => x);
    expect(Math.min(...gx)).toBeGreaterThanOrEqual(-1e-9);
    expect(Math.max(...gx)).toBeLessThanOrEqual(3 + 1e-9);
    expect(h.samples).toEqual([]);
  });

  it("does not change its input", () => {
    const before = JSON.stringify(spec);
    sampleSpec(spec);
    expect(JSON.stringify(spec)).toBe(before);
  });
});

describe("sampleSpec regions", () => {
  type Region = Extract<FigureSpec["parts"][number], { kind: "region" }>;
  const regionSpec = (latex: string): FigureSpec => ({
    version: FIGURE_SPEC_VERSION,
    type: "plane",
    parts: [{ kind: "region", id: "R", latex }],
    labels: [{ text: "R", on: "R" }],
    marks: [],
    frame: FRAME,
  });
  const rings = (latex: string) => (sampleSpec(regionSpec(latex)).parts[0] as Region).samples!;
  const onFrameEdge = ([x, y]: [number, number]) =>
    Math.abs(Math.abs(x) - 5) < 1e-9 || Math.abs(Math.abs(y) - 5) < 1e-9;
  const inFrame = ([x, y]: [number, number]) =>
    x >= -5 - 1e-9 && x <= 5 + 1e-9 && y >= -5 - 1e-9 && y <= 5 + 1e-9;

  it("sampleSpec fills y > 2x - 1 region on a -5..5 frame with one ring whose every vertex satisfies y >= 2x - 1 - 1e-6 and lies inside the frame", () => {
    const out = rings("y>2x-1");
    expect(out).toHaveLength(1);
    expect(out[0].length).toBeGreaterThanOrEqual(3);
    for (const [x, y] of out[0]) {
      expect(y).toBeGreaterThanOrEqual(2 * x - 1 - 1e-6);
      expect(inFrame([x, y])).toBe(true);
    }
  });

  it("linear y > 2x - 1: every vertex is on the frame edge or on the line within 1e-9", () => {
    for (const p of rings("y>2x-1")[0]) {
      expect(onFrameEdge(p) || Math.abs(p[1] - (2 * p[0] - 1)) < 1e-9).toBe(true);
    }
  });

  it("a system of two inequalities gives the exact quadrilateral or triangle", () => {
    // y < 3 and x > -1 cut the frame to the rectangle (-1..5) × (-5..3).
    const quad = rings("y<3, x>-1");
    expect(quad).toHaveLength(1);
    const key = (ps: [number, number][]) => ps.map(([x, y]) => `${x},${y}`).sort();
    expect(key(quad[0])).toEqual(
      key([
        [-1, -5],
        [5, -5],
        [5, 3],
        [-1, 3],
      ])
    );
    // y \ge x and y \le 2, within the frame: the triangle (-5,-5), (2,2), (-5,2).
    const tri = rings("y\\ge x \\\\ y\\le 2");
    expect(tri).toHaveLength(1);
    expect(tri[0]).toHaveLength(3);
    for (const [x, y] of [
      [-5, -5],
      [2, 2],
      [-5, 2],
    ]) {
      expect(tri[0].some(([a, b]) => Math.hypot(a - x, b - y) < 1e-9)).toBe(true);
    }
  });

  it("nonlinear y > x^2 gives a ring whose boundary samples lie within 1% of the frame span of y = x^2", () => {
    const out = rings("y>x^2");
    expect(out.length).toBeGreaterThanOrEqual(1);
    const curve: [number, number][] = [];
    for (let x = -5; x <= 5; x += 0.001) curve.push([x, x * x]);
    const toCurve = ([x, y]: [number, number]) =>
      Math.min(
        ...curve.filter(([a]) => Math.abs(a - x) < 0.2).map(([a, b]) => Math.hypot(a - x, b - y))
      );
    let onCurve = 0;
    for (const p of out.flat()) {
      expect(inFrame(p)).toBe(true);
      if (onFrameEdge(p)) continue;
      onCurve++;
      expect(toCurve(p)).toBeLessThan(0.01 * SPAN);
    }
    expect(onCurve).toBeGreaterThan(4);
  });

  it("the filled region spec validates", () => {
    const out = sampleSpec(regionSpec("y>x^2"));
    const parsed = parseFigureSpec(out);
    expect(parsed.ok, parsed.ok ? "" : parsed.errors.join("; ")).toBe(true);
  });
});
