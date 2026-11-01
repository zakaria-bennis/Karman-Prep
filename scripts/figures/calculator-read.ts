/**
 * Read-only access to the calculator for authoring-time figure sampling
 * (sample-functions.ts, sample-regions.ts). This folder is the only place
 * figure code reads the calculator: formulas are parsed and analysed with the
 * calculator's own reader, then plotted with its plotting math.
 */
import { analyzeRows } from "@/lib/calculator/core/analysis/index";
import { buildCompileScope, plotInputFor } from "@/lib/calculator/plot/from-analysis";
import { plotRow, type PlotInput } from "@/lib/calculator/plot/index";
import type { Geometry } from "@/lib/calculator/plot/geometry";
import type { ViewSpec } from "@/lib/calculator/plot/viewport";
import { createWorkDeadline, SliceClock } from "@/lib/calculator/worker/slice";
import type { PlaneFrame } from "@/lib/figures/engine/spec";

const SETTINGS = { angleMode: "radians", complex: false } as const;
const ROW_ID = "figure-row";

/** A deadline that never expires (plot sampling), built as the calculator's worker builds it. */
function plotDeadline() {
  const now = () => Date.now();
  const clock = new SliceClock({ now, sliceMs: 8, heartbeatMs: 200 }, () => {});
  return createWorkDeadline({ clock, now, limitMs: null, rowId: ROW_ID });
}

/** The calculator's plot input for one formula row, or null when it cannot graph it. */
export function plotInput(latex: string): PlotInput | null {
  const analysis = analyzeRows([{ id: ROW_ID, latex, hidden: false }], SETTINGS);
  const row = analysis.byId.get(ROW_ID);
  if (!row || row.graph === null) return null;
  const scope = buildCompileScope(analysis, new Map(), SETTINGS);
  return plotInputFor(row, scope, null);
}

/** The view of `frame` at `box` px, as the calculator's plotting reads it. */
export function viewFor(frame: PlaneFrame, box: { width: number; height: number }): ViewSpec {
  return {
    viewport: { left: frame.x[0], right: frame.x[1], bottom: frame.y[0], top: frame.y[1] },
    size: { width: box.width, height: box.height },
    dpr: 1,
  };
}

/** `input` plotted over `view`. */
export function plot(input: PlotInput, view: ViewSpec): Geometry {
  return plotRow(input, view, plotDeadline());
}
