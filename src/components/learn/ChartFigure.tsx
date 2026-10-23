// ============================================================
// ChartFigure — SVG renderer for the four coordinate-plane chart
// types (scatterplot / line graph / bar chart / function plot).
// Driven by quiz_questions.figure_chart_data (JSONB matching
// ChartFigure in src/types/chart.ts).
//
// Phase 4d. Replaces raster PDF crops with clean, theme-aware,
// scalable SVG. Observatory theme (docs/brand.md):
//   · warm night ground (matches the page background)
//   · ivory text, taupe structure, bronze grid
//   · subject-signal series colors, brand sequential palette
//
// The component is pure: given a ChartFigure + a subject, it
// renders a deterministic SVG. No client-side state, no
// interactivity. The Inspector wraps it in a side-by-side review
// panel when confidence is below the auto-publish threshold.
// ============================================================

import { useId } from "react";
import { cn } from "@/lib/utils";
import type {
  ChartFigure,
  ChartSeries,
  ScatterSeries,
  LineSeries,
  BarSeries,
  FunctionSeries,
  BoxplotSeries,
  PieSeries,
  ChartAxis,
} from "@/types/chart";
const SEQUENTIAL_PALETTE = Array.from({ length: 6 }, (_, i) => `var(--figure-series-${i + 1})`);
const SUBJECT_CHART_COLOR: Record<string, string> = {
  math: "var(--figure-math)",
  reading: "var(--figure-reading)",
};
import { numericTicks, formatTickLabel, generateAltText } from "./chart-figure-helpers";
import {
  Axes,
  CHART_COLOR,
  TICK_FONT,
  TITLE_FONT,
  TITLE_LINE_HEIGHT,
  LEGEND_FONT,
  makeLayout,
  makeXMap,
  makeYMap,
  type ChartLayout,
} from "./chart-figure-axes";

interface Props {
  data: ChartFigure;
  /** Drives single-series color selection. Multi-series falls back
   *  to the SEQUENTIAL_PALETTE regardless of subject. */
  subject?: string | null;
  /** Optional className for the wrapping <figure>. */
  className?: string;
  /** A description for screen readers. Defaults to a generated
   *  summary like "Scatterplot of 12 points, x-axis 0 to 10..." */
  alt?: string;
}

const COLOR = CHART_COLOR;

export default function ChartFigure({ data, subject, className, alt }: Props) {
  // ── Pick the per-series color ───────────────────────────────
  // Single series: subject-coded (math = blue, R&W = rose). Falls
  // back to the gold accent if subject is null/unknown.
  // Multi series: walk the sequential palette in order.
  const colors: string[] =
    data.series.length === 1
      ? [SUBJECT_CHART_COLOR[subject ?? ""] ?? SEQUENTIAL_PALETTE[0]]
      : data.series.map((_, i) => SEQUENTIAL_PALETTE[i % SEQUENTIAL_PALETTE.length]);

  // useId keeps the server and client ids identical (Math.random broke hydration).
  const describedBy = `chart-desc-${useId()}`;
  const L = makeLayout(data);
  const accessibleSummary = alt ?? generateAltText(data);

  return (
    // Block + full width: as an inline-block (or flex item) the width:100% SVG had no
    // definite width and collapsed to the 300px replaced-element default.
    <figure className={cn("themed-question-figure block w-full max-w-full", className)}>
      <svg
        viewBox={`0 0 ${L.viewW} ${L.viewH}`}
        role="img"
        aria-describedby={describedBy}
        className="block h-auto w-full rounded-lg border border-bronze bg-night"
      >
        <desc id={describedBy}>{accessibleSummary}</desc>

        {L.titleLines.length > 0 && (
          <text
            x={L.viewW / 2}
            y={20}
            textAnchor="middle"
            fontSize={TITLE_FONT}
            fill={COLOR.ivory}
            fontWeight={600}
          >
            {L.titleLines.map((line, i) => (
              <tspan key={i} x={L.viewW / 2} dy={i === 0 ? 0 : TITLE_LINE_HEIGHT}>
                {line}
              </tspan>
            ))}
          </text>
        )}

        {/* Pie has no axes (its own circular layout); boxplot uses only a
            value axis. Everything else gets the standard axes + series. */}
        {data.kind === "pie" ? (
          <PieGlyph L={L} series={data.series} />
        ) : data.kind === "boxplot" ? (
          <BoxplotGlyph L={L} series={data.series} xAxis={data.x_axis} showGrid={data.show_grid} />
        ) : (
          <>
            {/* ── Axes ─── */}
            <Axes
              L={L}
              xAxis={data.x_axis}
              yAxis={data.y_axis}
              showGrid={data.show_grid}
              hideOriginLabel={!!data.hide_origin_label}
            />

            {/* ── Series ─── */}
            {data.series.map((s, i) => (
              <SeriesGlyph
                L={L}
                key={i}
                series={s}
                color={colors[i]}
                xAxis={data.x_axis}
                yAxis={data.y_axis}
                group={barGroup(data.series, i)}
              />
            ))}

            {/* ── Legend (multi-series): below the plot, clear of it and the title ─── */}
            <Legend L={L} colors={colors} />
          </>
        )}
      </svg>
    </figure>
  );
}

// ── Per-series rendering ─────────────────────────────────────

/** Where a bar series sits among the bar series sharing each category slot. */
function barGroup(series: ChartSeries[], index: number) {
  const bars = series.flatMap((s, i) => (s.kind === "bar" ? [i] : []));
  return { index: Math.max(0, bars.indexOf(index)), count: Math.max(1, bars.length) };
}

function SeriesGlyph({
  L,
  series,
  color,
  xAxis,
  yAxis,
  group,
}: {
  L: ChartLayout;
  series: ChartSeries;
  color: string;
  xAxis: ChartAxis;
  yAxis: ChartAxis;
  group: { index: number; count: number };
}) {
  if (series.kind === "scatter")
    return <ScatterDots L={L} series={series} color={color} xAxis={xAxis} yAxis={yAxis} />;
  if (series.kind === "line")
    return <LinePath L={L} series={series} color={color} xAxis={xAxis} yAxis={yAxis} />;
  if (series.kind === "bar")
    return (
      <BarRects L={L} series={series} color={color} xAxis={xAxis} yAxis={yAxis} group={group} />
    );
  if (series.kind === "function")
    return <FunctionCurve L={L} series={series} color={color} xAxis={xAxis} yAxis={yAxis} />;
  // boxplot / pie render via their own dedicated layouts, never here.
  return null;
}

function ScatterDots({
  L,
  series,
  color,
  xAxis,
  yAxis,
}: {
  L: ChartLayout;
  series: ScatterSeries;
  color: string;
  xAxis: ChartAxis;
  yAxis: ChartAxis;
}) {
  const xMap = makeXMap(L, xAxis);
  const yMap = makeYMap(L, yAxis);
  return (
    <g fill={color}>
      {series.points.map(([x, y], i) => (
        <circle key={i} cx={xMap(x)} cy={yMap(y)} r={5.5} />
      ))}
    </g>
  );
}

function LinePath({
  L,
  series,
  color,
  xAxis,
  yAxis,
}: {
  L: ChartLayout;
  series: LineSeries;
  color: string;
  xAxis: ChartAxis;
  yAxis: ChartAxis;
}) {
  const xMap = makeXMap(L, xAxis);
  const yMap = makeYMap(L, yAxis);
  const d = series.points
    .map(([x, y], i) => `${i === 0 ? "M" : "L"} ${xMap(x)} ${yMap(y)}`)
    .join(" ");
  return (
    <>
      <path d={d} stroke={color} strokeWidth={2.5} fill="none" strokeLinecap="round" />
      {/* Also dot the vertices so individual data points stay visible. */}
      <g fill={color}>
        {series.points.map(([x, y], i) => (
          <circle key={i} cx={xMap(x)} cy={yMap(y)} r={4} />
        ))}
      </g>
    </>
  );
}

/** Printed SAT bar charts draw narrow bars with clear gaps: a bar fills 40% of its category
 *  band, and never grows wider than an eighth of the plot (one category, several series).
 *  Bars of several series stand side by side in each band with a thin gap between them,
 *  never on top of each other, the whole group filling 60% of the band (founder review,
 *  2026-10-23). */
export const BAR_BAND_SHARE = 0.4;
export const GROUP_BAND_SHARE = 0.6;
export const MAX_BAR_SHARE = 0.125;
export const BAR_GAP_SHARE = 0.15;

export function barSlot(slotW: number, group: { index: number; count: number }, plotW: number) {
  const { count, index } = group;
  const gaps = BAR_GAP_SHARE * (count - 1);
  const fit = count > 1 ? (slotW * GROUP_BAND_SHARE) / (count + gaps) : slotW * BAR_BAND_SHARE;
  const barW = Math.min(fit, plotW * MAX_BAR_SHARE);
  const gap = barW * BAR_GAP_SHARE;
  const groupW = barW * count + gap * (count - 1);
  return { barW, offset: -groupW / 2 + (barW + gap) * index };
}

function BarRects({
  L,
  series,
  color,
  xAxis,
  yAxis,
  group,
}: {
  L: ChartLayout;
  series: BarSeries;
  color: string;
  xAxis: ChartAxis;
  yAxis: ChartAxis;
  group: { index: number; count: number };
}) {
  const categories = xAxis.categories ?? series.bars.map((b) => b.category);
  const n = categories.length;
  const slotW = L.plotW / n;
  const { barW, offset } = barSlot(slotW, group, L.plotW);
  const yMap = makeYMap(L, yAxis);
  const yBaseline = yMap(0); // bars rise from y=0
  return (
    <g fill={color}>
      {series.bars.map((b, i) => {
        const idx = categories.indexOf(b.category);
        if (idx < 0) return null;
        const cx = L.pad.left + slotW * (idx + 0.5);
        const yTop = yMap(b.value);
        const h = Math.abs(yBaseline - yTop);
        const yRect = Math.min(yBaseline, yTop);
        return (
          <rect
            key={i}
            data-series={group.index}
            x={cx + offset}
            y={yRect}
            width={barW}
            height={h}
            rx={1}
          />
        );
      })}
    </g>
  );
}

function FunctionCurve({
  L,
  series,
  color,
  xAxis,
  yAxis,
}: {
  L: ChartLayout;
  series: FunctionSeries;
  color: string;
  xAxis: ChartAxis;
  yAxis: ChartAxis;
}) {
  const xMap = makeXMap(L, xAxis);
  const yMap = makeYMap(L, yAxis);
  const [xLo, xHi] = series.domain ?? [xAxis.min ?? 0, xAxis.max ?? 1];
  const f = evaluator(series.expression);
  // 64 samples is enough for smooth quadratics; the renderer
  // clips off-canvas values via the SVG viewBox.
  const N = 64;
  const step = (xHi - xLo) / N;
  const pts: Array<[number, number]> = [];
  for (let i = 0; i <= N; i++) {
    const x = xLo + step * i;
    const y = f(x);
    if (Number.isFinite(y)) pts.push([x, y]);
  }
  if (pts.length === 0) return null;
  const d = pts.map(([x, y], i) => `${i === 0 ? "M" : "L"} ${xMap(x)} ${yMap(y)}`).join(" ");
  return <path d={d} stroke={color} strokeWidth={2.5} fill="none" strokeLinecap="round" />;
}

// Closure-based evaluator. Strictly bounded to the FunctionSeries
// expression union — no freeform string eval, no injection risk.
function evaluator(expr: FunctionSeries["expression"]): (x: number) => number {
  switch (expr.kind) {
    case "linear":
      return (x) => expr.m * x + expr.b;
    case "quadratic":
      return (x) => expr.a * x * x + expr.b * x + expr.c;
    case "absolute_value":
      return (x) => expr.a * Math.abs(x - expr.h) + expr.k;
    case "exponential":
      return (x) => expr.a * Math.pow(expr.b, x);
  }
}

// ── Legend (multi-series only) ───────────────────────────────

function Legend({ L, colors }: { L: ChartLayout; colors: string[] }) {
  if (!L.legendBox || L.legend.length === 0) return null;
  const box = L.legendBox;
  return (
    <g fontSize={LEGEND_FONT} fill={COLOR.ivory} data-chart-legend="">
      <rect
        x={box.x}
        y={box.y}
        width={box.width}
        height={box.height}
        fill="none"
        stroke={COLOR.bronze}
        strokeWidth={1}
        rx={3}
      />
      {L.legend.map((item) => (
        <g key={item.series}>
          <rect
            x={item.x}
            y={item.y - 6}
            width={12}
            height={12}
            fill={colors[item.series]}
            stroke={COLOR.bronze}
            strokeWidth={0.75}
            rx={1}
          />
          <text x={item.x + 20} y={item.y} dominantBaseline="central">
            {item.label}
          </text>
        </g>
      ))}
    </g>
  );
}

// ── Pie chart (own circular layout, no axes) ─────────────────
// Each slice's angle is its share of the total; slices walk the cool
// sequential palette and are labelled with category + percentage.

function PieGlyph({ L, series }: { L: ChartLayout; series: ChartSeries[] }) {
  const slices = series.flatMap((s) => (s.kind === "pie" ? (s as PieSeries).slices : []));
  const total = slices.reduce(
    (sum, sl) => sum + (Number.isFinite(sl.value) ? Math.max(0, sl.value) : 0),
    0
  );
  if (slices.length === 0 || total <= 0) return null;

  const cx = L.viewW / 2;
  const cy = L.pad.top + L.plotH / 2 + 4;
  const r = Math.min(L.plotW, L.plotH) / 2 - 18;

  let a0 = -Math.PI / 2; // start at 12 o'clock
  const arcs = slices.map((sl, i) => {
    const frac = Math.max(0, sl.value) / total;
    const a1 = a0 + frac * 2 * Math.PI;
    const full = slices.length === 1 || frac >= 0.999;
    const d = full
      ? `M ${cx - r} ${cy} A ${r} ${r} 0 1 1 ${cx + r} ${cy} A ${r} ${r} 0 1 1 ${cx - r} ${cy} Z`
      : `M ${cx} ${cy} L ${cx + r * Math.cos(a0)} ${cy + r * Math.sin(a0)} ` +
        `A ${r} ${r} 0 ${a1 - a0 > Math.PI ? 1 : 0} 1 ${cx + r * Math.cos(a1)} ${cy + r * Math.sin(a1)} Z`;
    const am = full ? -Math.PI / 2 : (a0 + a1) / 2;
    const lx = cx + (r + 14) * Math.cos(am);
    const ly = cy + (r + 14) * Math.sin(am);
    const anchor: "start" | "end" | "middle" =
      Math.cos(am) > 0.25 ? "start" : Math.cos(am) < -0.25 ? "end" : "middle";
    const out = {
      d,
      color: SEQUENTIAL_PALETTE[i % SEQUENTIAL_PALETTE.length],
      lx,
      ly,
      anchor,
      label: sl.label,
      pct: Math.round(frac * 100),
    };
    a0 = a1;
    return out;
  });

  return (
    <g>
      {arcs.map((a, i) => (
        <path key={`s-${i}`} d={a.d} fill={a.color} stroke={COLOR.bgNight} strokeWidth={1.5} />
      ))}
      {arcs.map((a, i) => (
        <text
          key={`l-${i}`}
          x={a.lx}
          y={a.ly}
          textAnchor={a.anchor}
          dominantBaseline="middle"
          fontSize={14}
          fill={COLOR.ivory}
        >
          {`${a.label} (${a.pct}%)`}
        </text>
      ))}
    </g>
  );
}

// ── Boxplot (horizontal box-and-whisker on a value x-axis) ───
// One row per box; whiskers min→Q1 and Q3→max, box Q1→Q3, median line. Reuses the
// numeric-axis helpers for the value axis along the bottom.

function BoxplotGlyph({
  L,
  series,
  xAxis,
  showGrid,
}: {
  L: ChartLayout;
  series: ChartSeries[];
  xAxis: ChartAxis;
  showGrid: boolean;
}) {
  const boxes = series.flatMap((s) => (s.kind === "boxplot" ? (s as BoxplotSeries).boxes : []));
  if (boxes.length === 0) return null;
  const xMap = makeXMap(L, xAxis);
  const xTicks = numericTicks(xAxis);
  const baseY = L.pad.top + L.plotH;
  const rowH = L.plotH / boxes.length;
  const boxH = Math.min(46, rowH * 0.5);

  return (
    <g>
      {showGrid && (
        <g stroke={COLOR.bronzeMuted} strokeWidth={0.5} opacity="var(--figure-grid-opacity)">
          {xTicks.map((v, i) => (
            <line key={`g-${i}`} x1={xMap(v)} x2={xMap(v)} y1={L.pad.top} y2={baseY} />
          ))}
        </g>
      )}
      <line
        x1={L.pad.left}
        y1={baseY}
        x2={L.pad.left + L.plotW}
        y2={baseY}
        stroke={COLOR.bronze}
        strokeWidth={1}
      />
      <g fill={COLOR.taupe} fontSize={TICK_FONT}>
        {xTicks.map((v, i) => (
          <g key={`t-${i}`}>
            <line
              x1={xMap(v)}
              x2={xMap(v)}
              y1={baseY}
              y2={baseY + 4}
              stroke={COLOR.bronze}
              strokeWidth={1}
            />
            <text x={xMap(v)} y={baseY + 20} textAnchor="middle">
              {formatTickLabel(v)}
            </text>
          </g>
        ))}
      </g>
      <text
        x={L.pad.left + L.plotW / 2}
        y={L.xTitleY}
        textAnchor="middle"
        fontSize={TITLE_FONT}
        fill={COLOR.ivory}
      >
        {xAxis.label}
      </text>
      {boxes.map((b, i) => {
        const yc = L.pad.top + rowH * (i + 0.5);
        const cap = boxH * 0.35;
        return (
          <g key={`b-${i}`} stroke={COLOR.bronze} strokeWidth={1.5}>
            {/* Whiskers run min→Q1 and Q3→max only; inside the box there are just its
                edges and the median (founder review, 2026-10-22). */}
            <line data-whisker="" x1={xMap(b.min)} x2={xMap(b.q1)} y1={yc} y2={yc} />
            <line data-whisker="" x1={xMap(b.q3)} x2={xMap(b.max)} y1={yc} y2={yc} />
            <line x1={xMap(b.min)} x2={xMap(b.min)} y1={yc - cap} y2={yc + cap} />
            <line x1={xMap(b.max)} x2={xMap(b.max)} y1={yc - cap} y2={yc + cap} />
            {/* Opaque backing: gridlines stay behind the box, never through it. */}
            <rect
              data-box-backing=""
              x={xMap(b.q1)}
              y={yc - boxH / 2}
              width={Math.max(1, xMap(b.q3) - xMap(b.q1))}
              height={boxH}
              fill={COLOR.bgNight}
              stroke="none"
            />
            <rect
              x={xMap(b.q1)}
              y={yc - boxH / 2}
              width={Math.max(1, xMap(b.q3) - xMap(b.q1))}
              height={boxH}
              fill={COLOR.bronze}
              fillOpacity={0.18}
            />
            <line
              x1={xMap(b.median)}
              x2={xMap(b.median)}
              y1={yc - boxH / 2}
              y2={yc + boxH / 2}
              strokeWidth={2}
            />
            {b.category ? (
              <text
                x={L.pad.left - 6}
                y={yc}
                textAnchor="end"
                dominantBaseline="middle"
                stroke="none"
                fill={COLOR.taupe}
                fontSize={TICK_FONT}
              >
                {b.category}
              </text>
            ) : null}
          </g>
        );
      })}
    </g>
  );
}
