/**
 * Authoring-time function sampling for the figure engine. This is the only
 * place figure code reads the calculator, and it does so read-only: function
 * parts are parsed, analysed and sampled with the calculator's own formula
 * reader and plotting math, so domains, gaps, asymptotes and adaptive
 * sampling match the calculator. The result is stored in each function part's
 * `samples`; the runtime engine (src/lib/figures/engine) draws only those and
 * never loads the calculator.
 */
import { analyzeRows } from "@/lib/calculator/core/analysis/index";
import { buildCompileScope, plotInputFor } from "@/lib/calculator/plot/from-analysis";
import { plotRow } from "@/lib/calculator/plot/index";
import type { ViewSpec } from "@/lib/calculator/plot/viewport";
import { createWorkDeadline, SliceClock } from "@/lib/calculator/worker/slice";
import type { FigureSpec, PlaneFrame } from "@/lib/figures/engine/spec";

const SETTINGS = { angleMode: "radians", complex: false } as const;
const ROW_ID = "figure-function";

/** The frame buildPlane uses when a spec has none. */
const DEFAULT_FRAME: PlaneFrame = { x: [-10, 10], y: [-10, 10] };

/** The view size samples are made dense enough for. */
export const DEFAULT_BOX = { width: 640, height: 480 };

/** A deadline that never expires (plot sampling), built as the calculator's worker builds it. */
function plotDeadline() {
  const now = () => Date.now();
  const clock = new SliceClock({ now, sliceMs: 8, heartbeatMs: 200 }, () => {});
  return createWorkDeadline({ clock, now, limitMs: null, rowId: ROW_ID });
}

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
  const analysis = analyzeRows([{ id: ROW_ID, latex, hidden: false }], SETTINGS);
  const row = analysis.byId.get(ROW_ID);
  if (!row || row.graph === null) return [];
  const scope = buildCompileScope(analysis, new Map(), SETTINGS);
  const input = plotInputFor(row, scope, null);
  if (input === null) return [];
  const view: ViewSpec = {
    viewport: { left: frame.x[0], right: frame.x[1], bottom: frame.y[0], top: frame.y[1] },
    size: { width: box.width, height: box.height },
    dpr: 1,
  };
  const geometry = plotRow(input, view, plotDeadline());
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
 * spec's frame (restricted to the part's domain) for a `box`-sized view.
 * Existing samples are replaced; other parts are untouched.
 */
export function sampleSpec(spec: FigureSpec, box = DEFAULT_BOX): FigureSpec {
  const frame = spec.frame ?? DEFAULT_FRAME;
  const parts = spec.parts.map((part) => {
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
