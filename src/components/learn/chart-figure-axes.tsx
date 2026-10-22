// ============================================================
// Layout, coordinate maps and axes for ChartFigure. Split out of
// ChartFigure.tsx to keep it under the 700-line cap. Text uses the
// shared figure serif (globals.css .themed-question-figure rule).
// ============================================================

import type { ChartAxis, ChartFigure } from "@/types/chart";
import { numericTicks, formatTickLabel } from "./chart-figure-helpers";

export const CHART_COLOR = {
  bgNight: "var(--figure-background)", // app background (warm night) — figure sits flush
  surface: "var(--figure-background)", // card surface (legend inset)
  ivory: "var(--figure-text)", // primary text: title + axis labels
  taupe: "var(--figure-axis)", // tick labels + axis lines (legible structure)
  bronze: "var(--figure-axis)", // axis lines + tick marks
  bronzeMuted: "var(--figure-grid)", // grid lines + border (bronze proper)
} as const;

/** Tick-label and axis-title sizes in viewBox units (legible at quiz column width). */
export const TICK_FONT = 15;
export const TITLE_FONT = 16;

/** A one-letter axis label (x, y) is printed in italic at the end of its axis, as in print. */
export const isVariableLabel = (label: string) => /^[a-zA-Z]$/.test(label.trim());

/** Approximate width of a line of figure-serif text (≈ 0.52em per character). */
export const textWidth = (text: string, fontSize: number) => text.length * fontSize * 0.52;

/** Splits text into lines of at most `maxWidth` (words never break; a long word gets its own line). */
export function wrapWords(text: string, fontSize: number, maxWidth: number): string[] {
  const lines: string[] = [];
  for (const word of text.trim().split(/\s+/).filter(Boolean)) {
    const last = lines[lines.length - 1];
    if (last !== undefined && textWidth(`${last} ${word}`, fontSize) <= maxWidth)
      lines[lines.length - 1] = `${last} ${word}`;
    else lines.push(word);
  }
  return lines;
}

export const LEGEND_FONT = 14;
const LEGEND_ROW = 22;
const TITLE_LINE = 20;
export const CATEGORY_LINE = 17;
export const Y_TITLE_LINE = 18;
export const TITLE_LINE_HEIGHT = TITLE_LINE;

export interface LegendItem {
  label: string;
  series: number;
  x: number;
  y: number;
}

export interface ChartLayout {
  viewW: number;
  viewH: number;
  pad: { top: number; right: number; bottom: number; left: number };
  plotW: number;
  plotH: number;
  /** Title, wrapped to the figure width (never clipped at the sides). */
  titleLines: string[];
  /** Category tick labels, each wrapped to its own slot. */
  categoryLines: string[][];
  /** Legend swatches below the plot and its axis title, clear of both. */
  legend: LegendItem[];
  legendBox: { x: number; y: number; width: number; height: number } | null;
  /** Baseline of the x-axis title. */
  xTitleY: number;
  /** The rotated y-axis title, wrapped to the plot height. */
  yTitleLines: string[];
}

/** Labelled series get a legend whenever there is more than one series. */
export function legendLabels(data: ChartFigure): { label: string; series: number }[] {
  if (data.series.length < 2 || data.kind === "pie" || data.kind === "boxplot") return [];
  return data.series
    .map((s, i) => ({ label: (s.label ?? "").trim(), series: i }))
    .filter((item) => item.label.length > 0);
}

/**
 * 600x400 by default; "square" for figures whose source plot is square. The plot keeps
 * that size; the figure grows to fit a wrapped title above it and wrapped category labels,
 * the axis title and the legend below it, so none of them overlap the plot or each other.
 */
export function makeLayout(data: ChartFigure): ChartLayout {
  const square = data.frame === "square";
  const viewW = square ? 500 : 600;
  const baseH = square ? 500 : 400;
  const variableX = isVariableLabel(data.x_axis.label);
  const variableY = isVariableLabel(data.y_axis.label);
  const pad = {
    top: variableY ? 34 : 28,
    right: variableX ? 34 : 24,
    // Tick labels plus the x-axis title; without a title, only the tick labels.
    bottom: variableX ? 34 : data.x_axis.label.trim() ? 60 : 36,
    left: variableY ? 46 : 68,
  };
  const plotH = baseH - pad.top - pad.bottom;
  // A long y-axis title wraps onto a second line beside the first, widening the margin.
  const yTitleLines = variableY ? [] : wrapWords(data.y_axis.label, TITLE_FONT, plotH - 8);
  pad.left += Math.max(0, yTitleLines.length - 1) * Y_TITLE_LINE;
  const plotW = viewW - pad.left - pad.right;

  // Titles print at weight 600, a little wider than the estimate, so wrap early.
  const titleLines = data.title ? wrapWords(data.title, TITLE_FONT, viewW - 64) : [];
  if (titleLines.length) pad.top += titleLines.length * TITLE_LINE;

  const categories = data.kind === "pie" ? null : data.x_axis.categories;
  const slot = categories?.length ? plotW / categories.length : 0;
  const categoryLines = (categories ?? []).map((c) => wrapWords(String(c), TICK_FONT, slot - 6));
  const extraCategoryLines = Math.max(0, ...categoryLines.map((l) => l.length - 1));
  pad.bottom += extraCategoryLines * CATEGORY_LINE;
  // Legend rows, packed left to right within the plot width, centred under the plot.
  const items = legendLabels(data).map((item) => ({
    ...item,
    width: 22 + textWidth(item.label, LEGEND_FONT) + 18,
  }));
  const rows: (typeof items)[] = [];
  for (const item of items) {
    const row = rows[rows.length - 1];
    const used = row?.reduce((sum, i) => sum + i.width, 0) ?? 0;
    if (row && used + item.width <= viewW - 32) row.push(item);
    else rows.push([item]);
  }
  const plotBottom = pad.top + plotH;
  // Below the plot: tick or category labels, then the x-axis title, then the legend.
  const legendTop = plotBottom + pad.bottom + 2;
  const legend: LegendItem[] = [];
  let legendBox: ChartLayout["legendBox"] = null;
  if (rows.length) {
    const width = Math.max(...rows.map((r) => r.reduce((sum, i) => sum + i.width, 0))) + 16;
    const x0 = (viewW - width) / 2;
    rows.forEach((row, r) => {
      let x = x0 + 8;
      for (const item of row) {
        legend.push({
          label: item.label,
          series: item.series,
          x,
          y: legendTop + 8 + r * LEGEND_ROW + LEGEND_ROW / 2,
        });
        x += item.width;
      }
    });
    legendBox = { x: x0, y: legendTop, width, height: rows.length * LEGEND_ROW + 16 };
  }
  const viewH = legendBox ? legendBox.y + legendBox.height + 10 : plotBottom + pad.bottom;
  return {
    viewW,
    viewH,
    pad,
    plotW,
    plotH,
    titleLines,
    categoryLines,
    legend,
    legendBox,
    xTitleY: plotBottom + pad.bottom - 14,
    yTitleLines,
  };
}

// Map a value in axis space to the pixel position inside the plot area.
// SVG's y grows downward so the y-axis is inverted.
export function makeXMap(L: ChartLayout, xAxis: ChartAxis): (v: number) => number {
  if (xAxis.categories) {
    // Categorical x-axis: each category sits in the center of its bucket.
    const w = L.plotW / xAxis.categories.length;
    return (idx) => L.pad.left + w * (idx + 0.5);
  }
  const min = xAxis.min ?? 0;
  const span = (xAxis.max ?? 1) - min || 1;
  return (v) => L.pad.left + ((v - min) / span) * L.plotW;
}

export function makeYMap(L: ChartLayout, yAxis: ChartAxis): (v: number) => number {
  const min = yAxis.min ?? 0;
  const span = (yAxis.max ?? 1) - min || 1;
  return (v) => L.pad.top + L.plotH - ((v - min) / span) * L.plotH;
}

/** Ticks that carry a printed label: every `label_step` when set, else every tick. */
function labelled(axis: ChartAxis, v: number, hideZero: boolean) {
  if (hideZero && v === 0) return false;
  if (!axis.label_step) return true;
  const k = (v - (axis.min ?? 0)) / axis.label_step;
  return Math.abs(k - Math.round(k)) < 1e-6;
}

export function Axes({
  L,
  xAxis,
  yAxis,
  showGrid,
  hideOriginLabel,
}: {
  L: ChartLayout;
  xAxis: ChartAxis;
  yAxis: ChartAxis;
  showGrid: boolean;
  hideOriginLabel: boolean;
}) {
  const yTicks = numericTicks(yAxis);
  const xTicks = xAxis.categories ? null : numericTicks(xAxis);
  const xMap = makeXMap(L, xAxis);
  const yMap = makeYMap(L, yAxis);
  const { top, left } = L.pad;
  const bottom = top + L.plotH;
  const right = left + L.plotW;
  const C = CHART_COLOR;

  return (
    <g>
      {showGrid && (
        <g stroke={C.bronzeMuted} strokeWidth={0.75} opacity="var(--figure-grid-opacity)">
          {yTicks.map((v, i) => (
            <line key={`gy-${i}`} x1={left} x2={right} y1={yMap(v)} y2={yMap(v)} />
          ))}
          {xTicks?.map((v, i) => (
            <line key={`gx-${i}`} y1={top} y2={bottom} x1={xMap(v)} x2={xMap(v)} />
          ))}
        </g>
      )}

      <line x1={left} y1={bottom} x2={right} y2={bottom} stroke={C.bronze} strokeWidth={1.5} />
      <line x1={left} y1={top} x2={left} y2={bottom} stroke={C.bronze} strokeWidth={1.5} />

      <g fill={C.ivory} fontSize={TICK_FONT}>
        {yTicks.map((v, i) => (
          <g key={`yt-${i}`}>
            <line x1={left - 5} x2={left} y1={yMap(v)} y2={yMap(v)} stroke={C.bronze} />
            {labelled(yAxis, v, hideOriginLabel) && (
              <text x={left - 9} y={yMap(v)} textAnchor="end" dominantBaseline="central">
                {formatTickLabel(v)}
              </text>
            )}
          </g>
        ))}
        {xAxis.categories
          ? xAxis.categories.map((cat, i) => (
              <text key={`xc-${i}`} x={xMap(i)} y={bottom + 20} textAnchor="middle">
                {(L.categoryLines[i] ?? [String(cat)]).map((line, k) => (
                  <tspan key={k} x={xMap(i)} dy={k === 0 ? 0 : CATEGORY_LINE}>
                    {line}
                  </tspan>
                ))}
              </text>
            ))
          : xTicks?.map((v, i) => (
              <g key={`xt-${i}`}>
                <line y1={bottom} y2={bottom + 5} x1={xMap(v)} x2={xMap(v)} stroke={C.bronze} />
                {labelled(xAxis, v, hideOriginLabel) && (
                  <text x={xMap(v)} y={bottom + 20} textAnchor="middle">
                    {formatTickLabel(v)}
                  </text>
                )}
              </g>
            ))}
      </g>

      <AxisTitles L={L} xLabel={xAxis.label} yLabel={yAxis.label} />
    </g>
  );
}

/** One-letter labels go at the axis ends in italic; longer titles are centered. */
export function AxisTitles({
  L,
  xLabel,
  yLabel,
}: {
  L: ChartLayout;
  xLabel: string;
  yLabel: string;
}) {
  const { top, left } = L.pad;
  const bottom = top + L.plotH;
  const right = left + L.plotW;
  const midY = top + L.plotH / 2;
  return (
    <g fill={CHART_COLOR.ivory} fontSize={TITLE_FONT}>
      {isVariableLabel(xLabel) ? (
        <text x={right + 10} y={bottom} dominantBaseline="central" fontStyle="italic" fontSize={20}>
          {xLabel.trim()}
        </text>
      ) : (
        <text x={left + L.plotW / 2} y={L.xTitleY} textAnchor="middle">
          {xLabel}
        </text>
      )}
      {isVariableLabel(yLabel) ? (
        <text x={left} y={top - 14} textAnchor="middle" fontStyle="italic" fontSize={20}>
          {yLabel.trim()}
        </text>
      ) : (
        <text x={20} y={midY} textAnchor="middle" transform={`rotate(-90, 20, ${midY})`}>
          {(L.yTitleLines.length ? L.yTitleLines : [yLabel]).map((line, k) => (
            <tspan key={k} x={20} dy={k === 0 ? 0 : Y_TITLE_LINE}>
              {line}
            </tspan>
          ))}
        </text>
      )}
    </g>
  );
}
