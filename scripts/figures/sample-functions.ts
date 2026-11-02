/**
 * Authoring-time function sampling for the figure engine. Figure code reads
 * the calculator only from scripts/figures, and only read-only
 * (calculator-read.ts): function parts are parsed, analysed and sampled with
 * the calculator's own formula reader and plotting math, so domains, gaps,
 * asymptotes and adaptive sampling match the calculator. The result is stored in each function part's
 * `samples`; the runtime engine (src/lib/figures/engine) draws only those and
 * never loads the calculator.
 */
import { isFramed, sharedFrame } from "@/lib/figures/engine/choices";
import type { FigureSpec, PlaneFrame } from "@/lib/figures/engine/spec";
import type { LineSetGeometry, RealFn1 } from "@/lib/calculator/plot/geometry";
import { plot, plotInput, viewFor } from "./calculator-read";
import { regionSamples } from "./sample-regions";

/** The frame buildPlane uses when a spec has none. */
const DEFAULT_FRAME: PlaneFrame = { x: [-10, 10], y: [-10, 10] };

/** The view size samples are made dense enough for. */
export const DEFAULT_BOX = { width: 640, height: 480 };

/**
 * The graph of `latex` over `frame`, sampled for a view `box` px in size, as
 * polylines in world units, each a flat [x0, y0, x1, y1, ...] run. A run breaks
 * wherever the calculator breaks it (gaps, asymptotes, domain ends). A formula
 * the calculator cannot graph gives no polylines.
 */
export function curveFor(
  latex: string,
  frame: PlaneFrame,
  box: { width: number; height: number }
): number[][] {
  // A bare expression ("-5", "x^2") is the graph of y = it, as a function part means.
  const bare = !/[=<>]|\\[lg]eq?\b|\\[lg]t\b/.test(latex);
  const input = plotInput(latex) ?? (bare ? plotInput(`y=${latex}`) : null);
  if (input === null) return [];
  const geometry = plot(input, viewFor(frame, box));
  if (geometry.kind === "lines") {
    const fs = input.kind === "lines" ? input.fs : [];
    return lineSetRuns(geometry, fs, frame);
  }
  if (geometry.kind !== "curve") return [];
  const runs: number[][] = [];
  let run: number[] = [];
  const flat = geometry.polylines;
  for (let i = 0; i + 1 < flat.length; i += 2) {
    const x = flat[i];
    const y = flat[i + 1];
    if (Number.isFinite(x) && Number.isFinite(y)) {
      run.push(x, y);
    } else {
      if (run.length >= 4) runs.push(run);
      run = [];
    }
  }
  if (run.length >= 4) runs.push(run);
  return runs;
}

/**
 * A root the calculator found by bisection, made exact when a short decimal
 * near it is a true zero of the line's equation (y = -5 gives -5, not -4.999997).
 */
function exactRoot(root: number, fs: RealFn1[], tolerance: number): number {
  for (let d = 0; d <= 12; d++) {
    const c = Number(root.toFixed(d)) || 0;
    if (Math.abs(c - root) <= tolerance && fs.some((f) => f(c) === 0)) return c;
  }
  return root;
}

/**
 * A constant (y = -5) or a vertical line (x = 3) as runs across the frame: the
 * calculator draws these as a line set (one level per position), not a sampled
 * curve. A position off the frame draws nothing.
 */
function lineSetRuns(lines: LineSetGeometry, fs: RealFn1[], frame: PlaneFrame): number[][] {
  const horizontal = lines.orientation === "horizontal";
  const [lo, hi] = horizontal ? frame.y : frame.x;
  const tolerance = (hi - lo) * 1e-4;
  const runs: number[][] = [];
  for (const found of lines.positions) {
    if (!Number.isFinite(found)) continue;
    const v = exactRoot(found, fs, tolerance);
    if (v < lo || v > hi) continue;
    runs.push(horizontal ? [frame.x[0], v, frame.x[1], v] : [v, frame.y[0], v, frame.y[1]]);
  }
  return runs;
}

/** Rounds to a millionth of `span`, so stored samples stay compact but sub-pixel exact. */
function rounder(span: number): (v: number) => number {
  const places = Math.max(0, Math.min(15, Math.ceil(6 - Math.log10(span))));
  return (v) => Number(v.toFixed(places)) || 0;
}

/**
 * `spec` with `samples` filled for every function part, sampled over the
 * spec's frame (restricted to the part's domain) for a `box`-sized view, and
 * for every region part (sample-regions.ts). Existing samples are replaced;
 * other parts are untouched. A region the calculator cannot shade keeps no
 * samples, so the engine reports it as unsampled_region.
 */
export function sampleSpec(spec: FigureSpec, box = DEFAULT_BOX): FigureSpec {
  const frame = spec.frame ?? DEFAULT_FRAME;
  const parts = spec.parts.map((part) => {
    if (part.kind === "region") {
      const out = { ...part };
      delete out.samples;
      const filled = regionSamples(part.latex, frame, box);
      if (!filled) return out;
      // Exact (linear) vertices stay exact; traced ones are rounded like curves.
      const rx = rounder(frame.x[1] - frame.x[0]);
      const ry = rounder(frame.y[1] - frame.y[0]);
      const samples = filled.exact
        ? filled.rings
        : filled.rings.map((r) => r.map(([x, y]): [number, number] => [rx(x), ry(y)]));
      return { ...out, samples };
    }
    if (part.kind !== "function") return part;
    let sub = frame;
    let width = box.width;
    if (part.domain) {
      const lo = Math.max(frame.x[0], Math.min(...part.domain));
      const hi = Math.min(frame.x[1], Math.max(...part.domain));
      if (hi <= lo) return { ...part, samples: [] };
      sub = { ...frame, x: [lo, hi] };
      width = Math.max(1, (box.width * (hi - lo)) / (frame.x[1] - frame.x[0]));
    }
    const rx = rounder(frame.x[1] - frame.x[0]);
    const ry = rounder(frame.y[1] - frame.y[0]);
    const samples = curveFor(part.latex, sub, { width, height: box.height }).map((run) => {
      const pts: [number, number][] = [];
      for (let i = 0; i + 1 < run.length; i += 2) pts.push([rx(run[i]), ry(run[i + 1])]);
      return pts;
    });
    return { ...part, samples };
  });
  return { ...spec, parts };
}

/** sampleSpec for each figure of a figure_spec or choice_figure_spec list, in order. */
export function sampleSpecs(specs: FigureSpec[], box = DEFAULT_BOX): FigureSpec[] {
  return specs.map((spec) => sampleSpec(spec, box));
}

/**
 * A figure-choice set ready to store: every framed choice set to the set's
 * shared frame (sharedFrame, the one window the four are drawn in) and sampled
 * in it, so each curve and region reaches the shared frame's edges. Shapes,
 * solids and tables are sampled as they are. `specs` is every figure of the set:
 * a choice holding a list adds each of its figures. choiceScenes refuses a set whose
 * sampled choices were not stored this way (choiceFrameIssues).
 */
export function sampleChoices(specs: FigureSpec[], box = DEFAULT_BOX): FigureSpec[] {
  const framed = specs.filter(isFramed);
  const frame = framed.length ? sharedFrame(framed) : null;
  return specs.map((spec) => sampleSpec(frame && isFramed(spec) ? { ...spec, frame } : spec, box));
}
