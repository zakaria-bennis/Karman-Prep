/**
 * Authoring-time function sampling for the figure engine. Figure code reads
 * the calculator only from scripts/figures, and only read-only
 * (calculator-read.ts): function parts are parsed, analysed and sampled with
 * the calculator's own formula reader and plotting math, so domains, gaps,
 * asymptotes and adaptive sampling match the calculator. The result is stored in each function part's
 * `samples`; the runtime engine (src/lib/figures/engine) draws only those and
 * never loads the calculator.
 */
import type { FigureSpec, PlaneFrame } from "@/lib/figures/engine/spec";
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
  const input = plotInput(latex);
  if (input === null) return [];
  const geometry = plot(input, viewFor(frame, box));
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
