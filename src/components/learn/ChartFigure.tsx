// ============================================================
// ChartFigure — SVG renderer for the four coordinate-plane chart
// types (scatterplot / line graph / bar chart / function plot).
// Driven by quiz_questions.figure_chart_data (JSONB matching
// ChartFigure in src/types/chart.ts).
//
// Phase 4d. Replaces raster PDF crops with clean, theme-aware,
// scalable SVG. Cool "blueprint" theme matching the navy quiz app:
//   · navy ground (matches the page background)
//   · sky-blue text + axes
//   · light-blue series fills, cool sequential palette for multi-series
//
// The component is pure: given a ChartFigure + a subject, it
// renders a deterministic SVG. No client-side state, no
// interactivity. The Inspector wraps it in a side-by-side review
// panel when confidence is below the auto-publish threshold.
// ============================================================

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
import { SUBJECT_CHART_COLOR, SEQUENTIAL_PALETTE } from "@/types/chart";
import { numericTicks, formatTickLabel, generateAltText } from "./chart-figure-helpers";

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

// ── Layout constants ──────────────────────────────────────────
// 600x400 viewBox so the SVG scales nicely without breakpoints.
// Pad enough on the left for y-axis labels (digits + a unit word)
// and on the bottom for x-axis labels. Top + right are tight.
const VIEW_W = 600;
const VIEW_H = 400;
const PAD = { top: 28, right: 24, bottom: 56, left: 64 };
const PLOT_W = VIEW_W - PAD.left - PAD.right;
const PLOT_H = VIEW_H - PAD.top - PAD.bottom;

// Cool "blueprint" palette — figures follow the navy quiz-app tokens
// (sky on navy, per docs/design-tokens.md), not the warm observatory
// brand. Keys kept for minimal churn; values are the new cool set.
const COLOR = {
  bgNight: "#0a0f1e", // app background (navy) — figure sits flush on the page
  surface: "#0f172a", // slate-900 (legend inset)
  ivory: "#bae6fd", // sky-200 (primary text: title + axis labels)
  taupe: "#7dd3fc", // sky-300 (tick labels)
  bronze: "#38bdf8", // sky-400 (axis lines + tick marks)
  bronzeMuted: "#1e293b", // slate-800 (grid lines + border)
} as const;

export default function ChartFigure({ data, subject, className, alt }: Props) {
  // ── Pick the per-series color ───────────────────────────────
  // Single series: subject-coded (math = blue, R&W = rose). Falls
  // back to the gold accent if subject is null/unknown.
  // Multi series: walk the sequential palette in order.
  const colors: string[] =
    data.series.length === 1
      ? [SUBJECT_CHART_COLOR[subject ?? ""] ?? SEQUENTIAL_PALETTE[0]]
      : data.series.map((_, i) => SEQUENTIAL_PALETTE[i % SEQUENTIAL_PALETTE.length]);

  const describedBy = `chart-desc-${Math.random().toString(36).slice(2, 9)}`;
  const accessibleSummary = alt ?? generateAltText(data);

  return (
    <figure className={cn("inline-block max-w-full", className)}>
      <svg
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        role="img"
        aria-describedby={describedBy}
        className="block h-auto w-full rounded-lg border border-slate-800 bg-[#0a0f1e]"
      >
        <desc id={describedBy}>{accessibleSummary}</desc>

        {data.title && (
          <text
            x={VIEW_W / 2}
            y={16}
            textAnchor="middle"
            fontSize={13}
            fontFamily="var(--font-plex-sans), system-ui, sans-serif"
            fill={COLOR.ivory}
            fontWeight={600}
          >
            {data.title}
          </text>
        )}

        {/* Pie has no axes (its own circular layout); boxplot uses only a
            value axis. Everything else gets the standard axes + series. */}
        {data.kind === "pie" ? (
          <PieGlyph series={data.series} />
        ) : data.kind === "boxplot" ? (
          <BoxplotGlyph series={data.series} xAxis={data.x_axis} showGrid={data.show_grid} />
        ) : (
          <>
            {/* ── Axes ─── */}
            <Axes xAxis={data.x_axis} yAxis={data.y_axis} showGrid={data.show_grid} />

            {/* ── Series ─── */}
            {data.series.map((s, i) => (
              <SeriesGlyph
                key={i}
                series={s}
                color={colors[i]}
                xAxis={data.x_axis}
                yAxis={data.y_axis}
              />
            ))}

            {/* ── Legend (only when multi-series) ─── */}
            {data.series.length > 1 && <Legend series={data.series} colors={colors} />}
          </>
        )}
      </svg>
    </figure>
  );
}

// ── Coordinate transforms ────────────────────────────────────
// Map a value in axis space (e.g. y = 7 on an axis 0..10) to the
// pixel y inside the plot area. SVG's y grows downward so we
// invert for the y-axis.

function makeXMap(xAxis: ChartAxis): (v: number) => number {
  if (xAxis.categories) {
    // Categorical x-axis: position each category in the center of
    // its bucket. categoryWidth = PLOT_W / N.
    const n = xAxis.categories.length;
    const w = PLOT_W / n;
    return (idx) => PAD.left + w * (idx + 0.5);
  }
  const min = xAxis.min ?? 0;
  const max = xAxis.max ?? 1;
  const span = max - min || 1;
  return (v) => PAD.left + ((v - min) / span) * PLOT_W;
}

function makeYMap(yAxis: ChartAxis): (v: number) => number {
  const min = yAxis.min ?? 0;
  const max = yAxis.max ?? 1;
  const span = max - min || 1;
  // Invert: high y-values land at the top of the plot.
  return (v) => PAD.top + PLOT_H - ((v - min) / span) * PLOT_H;
}

// ── Axes + grid ──────────────────────────────────────────────

function Axes({
  xAxis,
  yAxis,
  showGrid,
}: {
  xAxis: ChartAxis;
  yAxis: ChartAxis;
  showGrid: boolean;
}) {
  // Numeric tick positions for the y-axis. Categorical x-axis falls
  // back to per-category label centers; numeric x-axis uses ticks.
  const yTicks = numericTicks(yAxis);
  const xTicks = xAxis.categories ? null : numericTicks(xAxis);
  const xMap = makeXMap(xAxis);
  const yMap = makeYMap(yAxis);

  return (
    <g>
      {/* Grid lines */}
      {showGrid && (
        <g stroke={COLOR.bronzeMuted} strokeWidth={0.5}>
          {yTicks.map((v, i) => (
            <line key={`gy-${i}`} x1={PAD.left} x2={PAD.left + PLOT_W} y1={yMap(v)} y2={yMap(v)} />
          ))}
          {xTicks?.map((v, i) => (
            <line key={`gx-${i}`} y1={PAD.top} y2={PAD.top + PLOT_H} x1={xMap(v)} x2={xMap(v)} />
          ))}
        </g>
      )}

      {/* Axis lines */}
      <line
        x1={PAD.left}
        y1={PAD.top + PLOT_H}
        x2={PAD.left + PLOT_W}
        y2={PAD.top + PLOT_H}
        stroke={COLOR.bronze}
        strokeWidth={1}
      />
      <line
        x1={PAD.left}
        y1={PAD.top}
        x2={PAD.left}
        y2={PAD.top + PLOT_H}
        stroke={COLOR.bronze}
        strokeWidth={1}
      />

      {/* Tick marks + labels */}
      <g
        fill={COLOR.taupe}
        fontSize={10}
        fontFamily="var(--font-plex-mono), ui-monospace, monospace"
      >
        {yTicks.map((v, i) => (
          <g key={`yt-${i}`}>
            <line
              x1={PAD.left - 4}
              x2={PAD.left}
              y1={yMap(v)}
              y2={yMap(v)}
              stroke={COLOR.bronze}
              strokeWidth={1}
            />
            <text x={PAD.left - 6} y={yMap(v) + 3} textAnchor="end">
              {formatTickLabel(v)}
            </text>
          </g>
        ))}
        {xAxis.categories
          ? xAxis.categories.map((cat, i) => (
              <text key={`xc-${i}`} x={xMap(i)} y={PAD.top + PLOT_H + 16} textAnchor="middle">
                {cat}
              </text>
            ))
          : xTicks?.map((v, i) => (
              <g key={`xt-${i}`}>
                <line
                  y1={PAD.top + PLOT_H}
                  y2={PAD.top + PLOT_H + 4}
                  x1={xMap(v)}
                  x2={xMap(v)}
                  stroke={COLOR.bronze}
                  strokeWidth={1}
                />
                <text x={xMap(v)} y={PAD.top + PLOT_H + 16} textAnchor="middle">
                  {formatTickLabel(v)}
                </text>
              </g>
            ))}
      </g>

      {/* Axis labels (slightly larger, ivory) */}
      <text
        x={PAD.left + PLOT_W / 2}
        y={VIEW_H - 16}
        textAnchor="middle"
        fontSize={12}
        fontFamily="var(--font-plex-sans), system-ui, sans-serif"
        fill={COLOR.ivory}
      >
        {xAxis.label}
      </text>
      <text
        x={20}
        y={PAD.top + PLOT_H / 2}
        textAnchor="middle"
        transform={`rotate(-90, 20, ${PAD.top + PLOT_H / 2})`}
        fontSize={12}
        fontFamily="var(--font-plex-sans), system-ui, sans-serif"
        fill={COLOR.ivory}
      >
        {yAxis.label}
      </text>
    </g>
  );
}

// ── Per-series rendering ─────────────────────────────────────

function SeriesGlyph({
  series,
  color,
  xAxis,
  yAxis,
}: {
  series: ChartSeries;
  color: string;
  xAxis: ChartAxis;
  yAxis: ChartAxis;
}) {
  if (series.kind === "scatter")
    return <ScatterDots series={series} color={color} xAxis={xAxis} yAxis={yAxis} />;
  if (series.kind === "line")
    return <LinePath series={series} color={color} xAxis={xAxis} yAxis={yAxis} />;
  if (series.kind === "bar")
    return <BarRects series={series} color={color} xAxis={xAxis} yAxis={yAxis} />;
  if (series.kind === "function")
    return <FunctionCurve series={series} color={color} xAxis={xAxis} yAxis={yAxis} />;
  // boxplot / pie render via their own dedicated layouts, never here.
  return null;
}

function ScatterDots({
  series,
  color,
  xAxis,
  yAxis,
}: {
  series: ScatterSeries;
  color: string;
  xAxis: ChartAxis;
  yAxis: ChartAxis;
}) {
  const xMap = makeXMap(xAxis);
  const yMap = makeYMap(yAxis);
  return (
    <g fill={color}>
      {series.points.map(([x, y], i) => (
        <circle key={i} cx={xMap(x)} cy={yMap(y)} r={3.5} />
      ))}
    </g>
  );
}

function LinePath({
  series,
  color,
  xAxis,
  yAxis,
}: {
  series: LineSeries;
  color: string;
  xAxis: ChartAxis;
  yAxis: ChartAxis;
}) {
  const xMap = makeXMap(xAxis);
  const yMap = makeYMap(yAxis);
  const d = series.points
    .map(([x, y], i) => `${i === 0 ? "M" : "L"} ${xMap(x)} ${yMap(y)}`)
    .join(" ");
  return (
    <>
      <path d={d} stroke={color} strokeWidth={2} fill="none" strokeLinecap="round" />
      {/* Also dot the vertices so individual data points stay visible. */}
      <g fill={color}>
        {series.points.map(([x, y], i) => (
          <circle key={i} cx={xMap(x)} cy={yMap(y)} r={2.5} />
        ))}
      </g>
    </>
  );
}

function BarRects({
  series,
  color,
  xAxis,
  yAxis,
}: {
  series: BarSeries;
  color: string;
  xAxis: ChartAxis;
  yAxis: ChartAxis;
}) {
  const categories = xAxis.categories ?? series.bars.map((b) => b.category);
  const n = categories.length;
  const slotW = PLOT_W / n;
  const barW = slotW * 0.6;
  const yMap = makeYMap(yAxis);
  const yBaseline = yMap(0); // bars rise from y=0
  return (
    <g fill={color}>
      {series.bars.map((b, i) => {
        const idx = categories.indexOf(b.category);
        if (idx < 0) return null;
        const cx = PAD.left + slotW * (idx + 0.5);
        const yTop = yMap(b.value);
        const h = Math.abs(yBaseline - yTop);
        const yRect = Math.min(yBaseline, yTop);
        return <rect key={i} x={cx - barW / 2} y={yRect} width={barW} height={h} rx={1} />;
      })}
    </g>
  );
}

function FunctionCurve({
  series,
  color,
  xAxis,
  yAxis,
}: {
  series: FunctionSeries;
  color: string;
  xAxis: ChartAxis;
  yAxis: ChartAxis;
}) {
  const xMap = makeXMap(xAxis);
  const yMap = makeYMap(yAxis);
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
  return <path d={d} stroke={color} strokeWidth={2} fill="none" strokeLinecap="round" />;
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

function Legend({ series, colors }: { series: ChartSeries[]; colors: string[] }) {
  const itemsWithLabel = series
    .map((s, i) => ({ label: s.label ?? `Series ${i + 1}`, color: colors[i] }))
    .filter((s) => s.label && s.label.length > 0);
  if (itemsWithLabel.length === 0) return null;
  const x0 = PAD.left + 8;
  const y0 = PAD.top + 8;
  return (
    <g fontSize={10} fontFamily="var(--font-plex-sans), system-ui, sans-serif" fill={COLOR.ivory}>
      <rect
        x={x0 - 6}
        y={y0 - 12}
        width={Math.max(...itemsWithLabel.map((i) => i.label.length)) * 6 + 32}
        height={itemsWithLabel.length * 14 + 8}
        fill={COLOR.surface}
        stroke={COLOR.bronze}
        rx={3}
        opacity={0.85}
      />
      {itemsWithLabel.map((item, i) => (
        <g key={i}>
          <rect x={x0} y={y0 + i * 14 - 6} width={8} height={8} fill={item.color} rx={1} />
          <text x={x0 + 14} y={y0 + i * 14}>
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

function PieGlyph({ series }: { series: ChartSeries[] }) {
  const slices = series.flatMap((s) => (s.kind === "pie" ? (s as PieSeries).slices : []));
  const total = slices.reduce(
    (sum, sl) => sum + (Number.isFinite(sl.value) ? Math.max(0, sl.value) : 0),
    0
  );
  if (slices.length === 0 || total <= 0) return null;

  const cx = VIEW_W / 2;
  const cy = PAD.top + PLOT_H / 2 + 4;
  const r = Math.min(PLOT_W, PLOT_H) / 2 - 18;

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
          fontSize={11}
          fontFamily="var(--font-plex-sans), system-ui, sans-serif"
          fill={COLOR.ivory}
        >
          {`${a.label} (${a.pct}%)`}
        </text>
      ))}
    </g>
  );
}

// ── Boxplot (horizontal box-and-whisker on a value x-axis) ───
// One row per box; whiskers min→max, box q1→q3, median line. Reuses the
// numeric-axis helpers for the value axis along the bottom.

function BoxplotGlyph({
  series,
  xAxis,
  showGrid,
}: {
  series: ChartSeries[];
  xAxis: ChartAxis;
  showGrid: boolean;
}) {
  const boxes = series.flatMap((s) => (s.kind === "boxplot" ? (s as BoxplotSeries).boxes : []));
  if (boxes.length === 0) return null;
  const xMap = makeXMap(xAxis);
  const xTicks = numericTicks(xAxis);
  const baseY = PAD.top + PLOT_H;
  const rowH = PLOT_H / boxes.length;
  const boxH = Math.min(46, rowH * 0.5);

  return (
    <g>
      {showGrid && (
        <g stroke={COLOR.bronzeMuted} strokeWidth={0.5}>
          {xTicks.map((v, i) => (
            <line key={`g-${i}`} x1={xMap(v)} x2={xMap(v)} y1={PAD.top} y2={baseY} />
          ))}
        </g>
      )}
      <line
        x1={PAD.left}
        y1={baseY}
        x2={PAD.left + PLOT_W}
        y2={baseY}
        stroke={COLOR.bronze}
        strokeWidth={1}
      />
      <g
        fill={COLOR.taupe}
        fontSize={10}
        fontFamily="var(--font-plex-mono), ui-monospace, monospace"
      >
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
            <text x={xMap(v)} y={baseY + 16} textAnchor="middle">
              {formatTickLabel(v)}
            </text>
          </g>
        ))}
      </g>
      <text
        x={PAD.left + PLOT_W / 2}
        y={VIEW_H - 16}
        textAnchor="middle"
        fontSize={12}
        fontFamily="var(--font-plex-sans), system-ui, sans-serif"
        fill={COLOR.ivory}
      >
        {xAxis.label}
      </text>
      {boxes.map((b, i) => {
        const yc = PAD.top + rowH * (i + 0.5);
        const cap = boxH * 0.35;
        return (
          <g key={`b-${i}`} stroke={COLOR.bronze} strokeWidth={1.5}>
            <line x1={xMap(b.min)} x2={xMap(b.max)} y1={yc} y2={yc} />
            <line x1={xMap(b.min)} x2={xMap(b.min)} y1={yc - cap} y2={yc + cap} />
            <line x1={xMap(b.max)} x2={xMap(b.max)} y1={yc - cap} y2={yc + cap} />
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
                x={PAD.left - 6}
                y={yc}
                textAnchor="end"
                dominantBaseline="middle"
                stroke="none"
                fill={COLOR.taupe}
                fontSize={10}
                fontFamily="var(--font-plex-sans), system-ui, sans-serif"
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
