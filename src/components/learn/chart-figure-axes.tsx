// ============================================================
// Layout, coordinate maps and axes for ChartFigure. Split out of
// ChartFigure.tsx to keep it under the 700-line cap. Text uses the
// shared figure serif (globals.css .themed-question-figure rule).
// ============================================================

import type { ChartAxis, ChartFigure } from "@/types/chart";
import { numericTicks, formatTickLabel } from "./chart-figure-helpers";

export interface ChartLayout {
  viewW: number;
  viewH: number;
  pad: { top: number; right: number; bottom: number; left: number };
  plotW: number;
  plotH: number;
}

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

/** 600x400 by default; "square" for figures whose source plot is square. */
export function makeLayout(data: ChartFigure): ChartLayout {
  const square = data.frame === "square";
  const viewW = square ? 500 : 600;
  const viewH = square ? 500 : 400;
  const variableX = isVariableLabel(data.x_axis.label);
  const variableY = isVariableLabel(data.y_axis.label);
  const pad = {
    top: variableY ? 34 : 28,
    right: variableX ? 34 : 24,
    bottom: variableX ? 34 : 60,
    left: variableY ? 46 : 68,
  };
  return {
    viewW,
    viewH,
    pad,
    plotW: viewW - pad.left - pad.right,
    plotH: viewH - pad.top - pad.bottom,
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
                {cat}
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
        <text x={left + L.plotW / 2} y={L.viewH - 14} textAnchor="middle">
          {xLabel}
        </text>
      )}
      {isVariableLabel(yLabel) ? (
        <text x={left} y={top - 14} textAnchor="middle" fontStyle="italic" fontSize={20}>
          {yLabel.trim()}
        </text>
      ) : (
        <text x={20} y={midY} textAnchor="middle" transform={`rotate(-90, 20, ${midY})`}>
          {yLabel}
        </text>
      )}
    </g>
  );
}
