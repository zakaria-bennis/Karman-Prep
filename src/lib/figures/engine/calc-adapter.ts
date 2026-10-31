/**
 * The figure engine's only door into the calculator. Function parts are parsed,
 * analysed and sampled with the calculator's own formula reader and plotting
 * math, so domains, gaps, asymptotes and adaptive sampling match the calculator.
 * Nothing else in the engine imports calculator internals.
 */
import { analyzeRows } from "@/lib/calculator/core/analysis/index";
import { buildCompileScope, plotInputFor } from "@/lib/calculator/plot/from-analysis";
import { plotRow } from "@/lib/calculator/plot/index";
import { axisTicks as calcAxisTicks, type AxisTicks } from "@/lib/calculator/plot/ticks";
import type { ViewSpec } from "@/lib/calculator/plot/viewport";
import { createWorkDeadline, SliceClock } from "@/lib/calculator/worker/slice";
import type { PlaneFrame } from "./spec";

const SETTINGS = { angleMode: "radians", complex: false } as const;
const ROW_ID = "figure-function";

export type { AxisTicks };

/** Major and minor tick positions for an axis `lengthPx` long, as the calculator's graph places them. */
export function axisTicks(min: number, max: number, lengthPx: number): AxisTicks {
  return calcAxisTicks(min, max, lengthPx);
}

/** A deadline that never expires (plot sampling), built as the calculator's worker builds it. */
function plotDeadline() {
  const now = () => Date.now();
  const clock = new SliceClock({ now, sliceMs: 8, heartbeatMs: 200 }, () => {});
  return createWorkDeadline({ clock, now, limitMs: null, rowId: ROW_ID });
}

/**
 * The graph of `latex` over `frame`, sampled for a view `box` px in size, as
 * polylines in world units, each a flat [x0, y0, x1, y1, ...] run. A run breaks wherever the calculator
 * breaks it (gaps, asymptotes, domain ends). A formula the calculator cannot
 * graph gives no polylines.
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
