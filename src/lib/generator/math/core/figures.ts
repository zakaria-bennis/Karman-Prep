/*
 * Figures for generated questions, in the figure engine's own format (FigureSpec,
 * src/lib/figures/engine/spec.ts), so they draw exactly like the bank's figures. Function
 * graphs carry their own samples (the engine draws only those), kept small: a line is its two
 * end points, a curve about a hundred rounded points, split where it leaves the frame.
 * build.ts runs every figure through parseFigureSpec and checkSpec before an item is kept.
 */
import type { FigureSpec, Label, Mark, Part, PlaneFrame } from "@/lib/figures/engine/spec";

type Pt = [number, number];

const round = (v: number, places = 4) => Number(v.toFixed(places)) || 0;

/** A coordinate-plane frame in the bank's usual style: arrows, x and y, the origin marked O. */
export function frame(
  x: [number, number],
  y: [number, number],
  opts: Partial<PlaneFrame> = {}
): PlaneFrame {
  const span = Math.max(x[1] - x[0], y[1] - y[0]);
  const step = opts.step ?? (span <= 12 ? 1 : span <= 24 ? 2 : span <= 60 ? 5 : 10);
  return {
    x,
    y,
    step,
    arrows: true,
    xLabel: "x",
    yLabel: "y",
    originLabel: "O",
    labelStep: opts.labelStep ?? (span <= 12 ? 2 : step * 2),
    ...opts,
  };
}

/** Where the segment from a to b crosses the horizontal line y = level. */
function crossAt(a: Pt, b: Pt, level: number): Pt {
  const t = (level - a[1]) / (b[1] - a[1]);
  return [a[0] + t * (b[0] - a[0]), level];
}

/**
 * The graph of f over the frame (and the domain, when given) as polylines, broken where the
 * curve leaves the frame's y range.
 */
export function sampleCurve(
  f: (x: number) => number,
  fr: PlaneFrame,
  domain?: [number, number],
  steps = 120
): Pt[][] {
  const lo = Math.max(fr.x[0], domain?.[0] ?? -Infinity);
  const hi = Math.min(fr.x[1], domain?.[1] ?? Infinity);
  const [ylo, yhi] = fr.y;
  const runs: Pt[][] = [];
  let run: Pt[] = [];
  let prev: Pt | null = null;
  const inside = (p: Pt) => p[1] >= ylo && p[1] <= yhi;
  for (let i = 0; i <= steps; i++) {
    const x = lo + ((hi - lo) * i) / steps;
    const y = f(x);
    if (!Number.isFinite(y)) {
      if (run.length > 1) runs.push(run);
      run = [];
      prev = null;
      continue;
    }
    const p: Pt = [x, y];
    if (prev) {
      const pin = inside(prev);
      const cin = inside(p);
      if (pin && !cin) {
        run.push(crossAt(prev, p, p[1] > yhi ? yhi : ylo));
        if (run.length > 1) runs.push(run);
        run = [];
      } else if (!pin && cin) {
        run = [crossAt(prev, p, prev[1] > yhi ? yhi : ylo), p];
      } else if (pin && cin) {
        run.push(p);
      }
    } else if (inside(p)) {
      run = [p];
    }
    prev = p;
  }
  if (run.length > 1) runs.push(run);
  return runs.map((r) => r.map(([px, py]) => [round(px), round(py)] as Pt));
}

/** The line y = slope x + intercept across the frame, as its two end points (exact). */
export function sampleLine(slope: number, intercept: number, fr: PlaneFrame): Pt[][] {
  const [xlo, xhi] = fr.x;
  const [ylo, yhi] = fr.y;
  const pts: Pt[] = [];
  const add = (p: Pt) => {
    if (p[0] >= xlo - 1e-9 && p[0] <= xhi + 1e-9 && p[1] >= ylo - 1e-9 && p[1] <= yhi + 1e-9) {
      if (!pts.some((q) => Math.abs(q[0] - p[0]) < 1e-9 && Math.abs(q[1] - p[1]) < 1e-9)) {
        pts.push(p);
      }
    }
  };
  add([xlo, slope * xlo + intercept]);
  add([xhi, slope * xhi + intercept]);
  if (slope !== 0) {
    add([(ylo - intercept) / slope, ylo]);
    add([(yhi - intercept) / slope, yhi]);
  }
  if (pts.length < 2) return [];
  pts.sort((a, b) => a[0] - b[0]);
  return [[pts[0], pts[pts.length - 1]].map(([x, y]) => [round(x), round(y)] as Pt)];
}

/** A function part drawn from its JS form, with its LaTeX for the description. */
export function curve(
  id: string,
  latex: string,
  f: (x: number) => number,
  fr: PlaneFrame,
  domain?: [number, number]
): Part {
  return {
    kind: "function",
    id,
    latex,
    ...(domain ? { domain } : {}),
    samples: sampleCurve(f, fr, domain),
  };
}

/** A straight line part y = slope x + intercept. */
export function line(
  id: string,
  latex: string,
  slope: number,
  intercept: number,
  fr: PlaneFrame
): Part {
  return { kind: "function", id, latex, samples: sampleLine(slope, intercept, fr) };
}

/** A vertical line x = c, as a function part with one upright run. */
export function vertical(id: string, c: number, fr: PlaneFrame): Part {
  return {
    kind: "function",
    id,
    latex: `x=${c}`,
    samples: [
      [
        [round(c), round(fr.y[0])],
        [round(c), round(fr.y[1])],
      ],
    ],
  };
}

export function point(id: string, x: number, y: number, on?: string[]): Part {
  return { kind: "point", id, x: round(x), y: round(y), ...(on && on.length ? { on } : {}) };
}

export function plane(
  fr: PlaneFrame,
  parts: Part[],
  labels: Label[] = [],
  marks: Mark[] = []
): FigureSpec {
  return { version: "figure-spec/1", type: "plane", frame: fr, parts, labels, marks };
}

/** A flat shape traced in y-down units (as geometry2d expects). */
export function geometry(
  parts: Part[],
  labels: Label[] = [],
  marks: Mark[] = [],
  notToScale = true
): FigureSpec {
  return {
    version: "figure-spec/1",
    type: "geometry2d",
    parts,
    labels,
    marks,
    ...(notToScale ? { notToScale: true } : {}),
  };
}

/** A table with a header row; every cell is text (MathText-style math allowed). */
export function table(header: string[], rows: string[][], title?: string): FigureSpec {
  return {
    version: "figure-spec/1",
    type: "table",
    parts: [{ kind: "table", id: "t1", header, rows }],
    labels: [],
    marks: [],
    ...(title ? { title } : {}),
  };
}

/** A scatterplot of points on a framed grid. */
export function scatter(
  fr: PlaneFrame,
  points: Pt[],
  extra: Part[] = [],
  title?: string
): FigureSpec {
  return {
    version: "figure-spec/1",
    type: "scatter",
    frame: fr,
    parts: [{ kind: "series", id: "s1", seriesKind: "scatter", values: points }, ...extra],
    labels: [],
    marks: [],
    ...(title ? { title } : {}),
  };
}

/** A histogram: [left edge, count] for each bar of width `step`. */
export function histogram(fr: PlaneFrame, bars: Pt[], title?: string): FigureSpec {
  return {
    version: "figure-spec/1",
    type: "histogram",
    frame: fr,
    parts: [{ kind: "series", id: "s1", seriesKind: "histogram", values: bars }],
    labels: [],
    marks: [],
    ...(title ? { title } : {}),
  };
}

/** A dot plot: [value, how many dots]. */
export function dotPlot(fr: PlaneFrame, counts: Pt[], title?: string): FigureSpec {
  return {
    version: "figure-spec/1",
    type: "dot_plot",
    frame: fr,
    parts: [{ kind: "series", id: "s1", values: counts }],
    labels: [],
    marks: [],
    ...(title ? { title } : {}),
  };
}

/** A box plot from its five numbers: minimum, first quartile, median, third quartile, maximum. */
export function boxPlot(
  fr: PlaneFrame,
  five: [number, number, number, number, number],
  title?: string
): FigureSpec {
  return {
    version: "figure-spec/1",
    type: "box_plot",
    frame: { ...fr, y: [0, 1], grid: false },
    parts: [{ kind: "series", id: "b1", seriesKind: "box_plot", values: five }],
    labels: [],
    marks: [],
    ...(title ? { title } : {}),
  };
}

/** A bar graph over named categories. */
export function bars(fr: PlaneFrame, values: number[], title?: string): FigureSpec {
  return {
    version: "figure-spec/1",
    type: "bar",
    frame: fr,
    parts: [{ kind: "series", id: "s1", seriesKind: "bar", values }],
    labels: [],
    marks: [],
    ...(title ? { title } : {}),
  };
}
