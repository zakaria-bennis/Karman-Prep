// What one graph frame draws (01-interfaces-runtime.md section 10): the view, the grid settings,
// the rows' geometry in their resolved colours, and the skin's graph roles read from the host.

import type { CalculatorSettings, LineStyle, PointStyle } from "../core/api/types";
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
  selected?: boolean; // POI-17: the selected row strokes at CURVE_SELECTED_LINE_PX
  pointStyle?: PointStyle; // D-12: a table column's points; filled when absent
  lineStyle?: LineStyle; // D-12: "dotted" overrides the geometry's dash flag
}
/** POI-1: a point-of-interest dot of the selected row; `open` while its label shows (POI-13). */
export interface PoiDot {
  x: number;
  y: number;
  open: boolean;
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
  poi?: readonly PoiDot[]; // POI-1, drawn above the row points
  trace?: { x: number; y: number; color: string } | null; // POI-14's trace dot, drawn last
}
