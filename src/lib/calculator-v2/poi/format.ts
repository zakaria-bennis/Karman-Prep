// Coordinate label text for points of interest (POI-12) and traces (POI-14). A true minus sign
// U+2212 leads negative numbers; trailing zeros are trimmed. Pure TypeScript: no DOM.

import { formatNumber } from "../core/eval/format";
import type { ViewSpec } from "../plot/viewport";

const MINUS = "−";
const MAX_DECIMALS = 12;
const POI_MIN_DECIMALS = 5; // POI-12 amended: Desmos's floor at the default view
const TRACE_Y_DECIMALS = 5; // POI-14 amended: y is shown to at most 5 decimals
const PLAIN_MIN = 1e-6;
const PLAIN_MAX = 1e12;

const clamp = (d: number): number => Math.min(MAX_DECIMALS, Math.max(0, d));

/** POI-12: clamp(max(5, ceil(−log10 u) + 3), 0, 12) for u world units per px. */
export function poiDecimals(unitsPerPx: number): number {
  return clamp(Math.max(POI_MIN_DECIMALS, Math.ceil(-Math.log10(unitsPerPx)) + 3));
}

/** POI-14: the pixel precision of the view, clamp(ceil(−log10 u) + 1, 0, 12). */
export function traceDecimals(unitsPerPx: number): number {
  return clamp(Math.ceil(-Math.log10(unitsPerPx)) + 1);
}

/** `v` rounded to `decimals`, trimmed; m×10^n outside NM-2's plain range; −0 and tiny values "0". */
export function formatPoiCoordinate(v: number, decimals: number): string {
  if (!Number.isFinite(v)) return "undefined";
  const rounded = Number(v.toFixed(clamp(decimals)));
  if (rounded === 0) return "0";
  const a = Math.abs(rounded);
  const text =
    a >= PLAIN_MIN && a < PLAIN_MAX
      ? String(rounded)
      : formatNumber(Number(v.toPrecision(Math.max(1, decimals))));
  return text.startsWith("-") ? MINUS + text.slice(1) : text;
}

const unitsPerPx = (view: ViewSpec): { x: number; y: number } => {
  const { viewport: v, size } = view;
  return { x: (v.right - v.left) / size.width, y: (v.top - v.bottom) / size.height };
};

/** POI-12: "(x, y)" with each axis's decimals. */
export function formatPoiLabel(p: { x: number; y: number }, view: ViewSpec): string {
  const u = unitsPerPx(view);
  return `(${formatPoiCoordinate(p.x, poiDecimals(u.x))}, ${formatPoiCoordinate(p.y, poiDecimals(u.y))})`;
}

/** POI-14: x rounded to the view's pixel precision. */
export function roundTraceX(x: number, view: ViewSpec): number {
  return Number(x.toFixed(traceDecimals(unitsPerPx(view).x)));
}

/** POI-14: the live trace label for the curve point (x, y), x already rounded by roundTraceX. */
export function formatTraceLabel(x: number, y: number, view: ViewSpec): string {
  const d = traceDecimals(unitsPerPx(view).x);
  return `(${formatPoiCoordinate(x, d)}, ${formatPoiCoordinate(y, TRACE_Y_DECIMALS)})`;
}
