// ============================================================
// Pure helpers for ChartFigure — tick math, label formatting, and the
// screen-reader alt-text summary. Extracted from ChartFigure.tsx to keep
// the renderer under the repo's 700-line file cap (CLAUDE.md). No JSX, no
// state — just deterministic functions over the chart data contract.
// ============================================================

import type { ChartFigure, ChartAxis, ScatterSeries } from "@/types/chart";

/** Numeric tick positions for an axis, snapped to clean multiples. */
export function numericTicks(axis: ChartAxis): number[] {
  if (axis.min == null || axis.max == null) return [];
  const step = axis.tick_step ?? autoStep(axis.min, axis.max);
  const ticks: number[] = [];
  // Floor to a clean multiple so ticks land at e.g. 0, 2, 4 rather
  // than 0.13, 2.13, ...
  let start = Math.floor(axis.min / step) * step;
  if (start < axis.min) start += step;
  for (let v = start; v <= axis.max + 1e-9; v += step) {
    ticks.push(Number(v.toFixed(6)));
  }
  return ticks;
}

/** Pick a "nice" tick step (1/2/5 × 10ⁿ) for a numeric range. */
function autoStep(min: number, max: number): number {
  const span = max - min;
  const rough = span / 6;
  // Snap to 1, 2, 5, 10, 20, 50, 100…
  const exp = Math.pow(10, Math.floor(Math.log10(rough)));
  const norm = rough / exp;
  const step = norm < 1.5 ? 1 * exp : norm < 3 ? 2 * exp : norm < 7 ? 5 * exp : 10 * exp;
  return step;
}

/** Trim trailing zeros from a tick label (e.g. 2.50 → 2.5, 3.00 → 3). */
export function formatTickLabel(v: number): string {
  if (Number.isInteger(v)) return String(v);
  return v.toFixed(2).replace(/\.?0+$/, "");
}

/** Deterministic screen-reader summary for the <desc> element. */
export function generateAltText(d: ChartFigure): string {
  const xLabel = d.x_axis.label || "x";
  const yLabel = d.y_axis.label || "y";
  if (d.kind === "scatterplot") {
    const n = (d.series[0] as ScatterSeries | undefined)?.points.length ?? 0;
    return `Scatterplot of ${n} points. X-axis: ${xLabel}. Y-axis: ${yLabel}.`;
  }
  if (d.kind === "line_graph") {
    return `Line graph of ${d.series.length} series. X-axis: ${xLabel}. Y-axis: ${yLabel}.`;
  }
  if (d.kind === "bar_chart") {
    const cats = d.x_axis.categories?.length ?? 0;
    return `Bar chart with ${cats} categories. Y-axis: ${yLabel}.`;
  }
  if (d.kind === "boxplot") {
    const n = d.series.reduce((c, s) => c + (s.kind === "boxplot" ? s.boxes.length : 0), 0);
    return `Box-and-whisker plot with ${n} box${n === 1 ? "" : "es"}. Value axis: ${xLabel}.`;
  }
  if (d.kind === "pie") {
    const n = d.series.reduce((c, s) => c + (s.kind === "pie" ? s.slices.length : 0), 0);
    return `Pie chart with ${n} slice${n === 1 ? "" : "s"}.`;
  }
  return `Function plot. X-axis: ${xLabel}. Y-axis: ${yLabel}.`;
}
