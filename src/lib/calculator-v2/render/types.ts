// What one graph frame draws (01-interfaces-runtime.md section 10): the view, the grid settings,
// the rows' geometry in their resolved colours, and the skin's graph roles read from the host.

import type { CalculatorSettings } from "../core/api/types";
import type { Geometry } from "../plot/geometry";
import type { ViewSpec } from "../plot/viewport";
import type { CurveSlot } from "../theme/skins";

export interface RenderTheme {
  paper: string;
  text: string;
  axis: string;
  gridMajor: string;
  gridMinor: string;
  focusRing: string;
  curves: Record<CurveSlot, string>;
  fillAlpha: Record<CurveSlot, number>;
}
export interface RenderRow {
  rowId: string;
  color: string; // resolveRowColor(row.color, skin).hex
  fillAlpha: number; // resolveRowColor(row.color, skin).fillAlpha
  geometry: Geometry;
}
export type GridSettings = Pick<
  CalculatorSettings,
  "showGrid" | "polarGrid" | "minorGridlines" | "arrows" | "axisNumbers" | "xAxis" | "yAxis"
>;
export interface RenderFrame {
  view: ViewSpec;
  grid: GridSettings;
  rows: readonly RenderRow[];
  theme: RenderTheme;
}
