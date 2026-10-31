/**
 * Chart builder: bar, line, scatter, dot plot, histogram and box plot specs as
 * a role-colored Scene, on the same axes, grid and tick labels as the
 * coordinate plane (plane.ts planeAxes).
 *
 * - Each `series` part draws as its own seriesKind, else as the spec's type, so
 *   a scatterplot can carry a line of best fit (a `function` part).
 * - Bars rise from 0, one band per category; a lone series fills 40% of its
 *   band, several stand side by side filling 60% with a thin gap, and no bar is
 *   wider than an eighth of the plot (founder review, 2026-10-22/23). Bar fills
 *   are opaque roles, so grid lines never show through a bar.
 * - Box plots and dot plots sit on a number line with no y-axis or grid.
 * - A title wraps above the plot; with two or more named series a legend
 *   wraps below it. The figure grows taller for both, so the plot keeps its size.
 */
import { chartDetail } from "./describe-detail";
import { HOUSE } from "./house";
import { textWidth } from "./labels";
import {
  LINE_HEIGHT,
  dotAt,
  fmt,
  functionItems,
  planeAxes,
  wrapText,
  type Box,
  type Mapper,
  type YAxisMode,
} from "./plane";
import type { Role, Scene, SceneIssue, SceneItem, Weight } from "./scene";
import type { FigureSpec, Part, PlaneFrame } from "./spec";
import { niceStep } from "./ticks";

type Series = Extract<Part, { kind: "series" }>;
type Fn = Extract<Part, { kind: "function" }>;
type ChartKind = "bar" | "line" | "scatter" | "dot_plot" | "histogram" | "box_plot";
type Pair = [number, number];

export const CHART_TYPES: readonly ChartKind[] = [
  "bar",
  "line",
  "scatter",
  "dot_plot",
  "histogram",
  "box_plot",
];
const isChartKind = (k: string | undefined): k is ChartKind => CHART_TYPES.includes(k as ChartKind);

/** Share of a category band a lone bar fills, and a group of bars fills. */
const BAR_SHARE = 0.4;
const GROUP_SHARE = 0.6;
/** No bar is wider than this share of the plot. */
const MAX_BAR_SHARE = 1 / 8;
/** Gap between neighbouring bars in a group, as a share of a bar's width. */
const BAR_GAP_SHARE = 0.15;
/** Opaque fills, one per series in turn: grid lines never show through. */
const FILLS: Role[] = ["ink-muted", "ink", "highlight"];
const BOX_HEIGHT = 40;
const SWATCH = 12;

/** A clean [min, max] covering lo..hi, on multiples of the automatic tick step. */
export function niceRange(lo: number, hi: number): [number, number] {
  if (!(hi > lo)) [lo, hi] = [lo - 1, hi + 1];
  const step = niceStep(lo, hi, 400) || 1;
  return [Math.floor(lo / step) * step, Math.ceil(hi / step) * step];
}

const isPair = (v: number | Pair): v is Pair => Array.isArray(v);

/** The frame a spec without one gets: its data's extent, rounded out. */
function autoFrame(type: ChartKind, series: Series[]): PlaneFrame {
  const xs: number[] = [];
  const ys: number[] = [];
  for (const s of series) {
    s.values.forEach((v, i) => {
      if (isPair(v)) {
        xs.push(v[0]);
        ys.push(v[1]);
      } else {
        xs.push(type === "bar" ? i : v);
        ys.push(v);
      }
    });
  }
  const lo = (a: number[]) => (a.length ? Math.min(...a) : 0);
  const hi = (a: number[]) => (a.length ? Math.max(...a) : 10);
  return { x: niceRange(lo(xs), hi(xs)), y: niceRange(Math.min(0, lo(ys)), hi(ys)) };
}

/** The frame a chart spec is drawn in before the chart's own adjustments: its own, or its data's extent. */
export function chartSpecFrame(spec: FigureSpec): PlaneFrame | null {
  if (!isChartKind(spec.type)) return null;
  const series = spec.parts.filter((p): p is Series => p.kind === "series");
  return spec.frame ?? autoFrame(spec.type, series);
}

/** The frame adjusted for the chart: bars include 0, number lines need no y range. */
function chartFrame(type: ChartKind, frame: PlaneFrame, series: Series[]): PlaneFrame {
  if (type === "bar") {
    const n = Math.max(
      frame.categories?.length ?? 0,
      ...series.map((s) => s.values.length),
      ...series.flatMap((s) => s.values.filter(isPair).map(([i]) => i + 1))
    );
    return {
      ...frame,
      categories: frame.categories ?? Array.from({ length: n }, () => ""),
      y: [Math.min(0, frame.y[0]), Math.max(0, frame.y[1])],
    };
  }
  if (type === "histogram") return { ...frame, y: [Math.min(0, frame.y[0]), frame.y[1]] };
  return frame;
}

type Ctx = {
  m: Mapper;
  frame: PlaneFrame;
  issues: SceneIssue[];
  /** Order of this series among the series of its kind, and how many there are. */
  index: number;
  count: number;
};

const inY = (f: PlaneFrame, y: number) => y >= f.y[0] - 1e-9 && y <= f.y[1] + 1e-9;
const inX = (f: PlaneFrame, x: number) => x >= f.x[0] - 1e-9 && x <= f.x[1] + 1e-9;

function clippedIssue(s: Series, detail: string): SceneIssue {
  return { code: "clipped", partId: s.id, detail };
}

function bars(s: Series, c: Ctx): SceneItem[] {
  const n = c.frame.categories?.length ?? 1;
  const band = c.m.w / n;
  const fit =
    c.count > 1
      ? (band * GROUP_SHARE) / (c.count + BAR_GAP_SHARE * (c.count - 1))
      : band * BAR_SHARE;
  const barW = Math.min(fit, c.m.w * MAX_BAR_SHARE);
  const gap = barW * BAR_GAP_SHARE;
  const groupW = barW * c.count + gap * (c.count - 1);
  const items: SceneItem[] = [];
  s.values.forEach((v, k) => {
    const [i, value] = isPair(v) ? v : [k, v];
    if (!Number.isInteger(i) || i < 0 || i >= n) {
      c.issues.push(clippedIssue(s, `bar ${k + 1} has no category`));
      return;
    }
    if (!inY(c.frame, value)) c.issues.push(clippedIssue(s, `bar ${k + 1} runs past the frame`));
    const top = c.m.py(Math.min(c.frame.y[1], Math.max(value, 0)));
    const bottom = c.m.py(Math.max(c.frame.y[0], Math.min(value, 0)));
    items.push({
      t: "rect",
      x: c.m.px(i + 0.5) - groupW / 2 + (barW + gap) * c.index,
      y: top,
      width: barW,
      height: bottom - top,
      role: "ink",
      fill: FILLS[c.index % FILLS.length],
      partId: s.id,
    });
  });
  return items;
}

function histogram(s: Series, c: Ctx): SceneItem[] {
  const bins = s.values.filter(isPair).sort((a, b) => a[0] - b[0]);
  if (bins.length !== s.values.length) {
    c.issues.push(clippedIssue(s, "a histogram needs [bin start, count] pairs"));
  }
  const gaps = bins.slice(1).map((b, i) => b[0] - bins[i][0]);
  // The data's own bin width; the grid step only when there is a single bin.
  const width = gaps.length ? Math.min(...gaps) : (c.frame.step ?? 1);
  return bins.map(([left, count]) => {
    if (!inX(c.frame, left) || !inX(c.frame, left + width) || !inY(c.frame, count)) {
      c.issues.push(clippedIssue(s, `the bin at ${fmt(left)} runs past the frame`));
    }
    const top = c.m.py(Math.min(count, c.frame.y[1]));
    return {
      t: "rect",
      x: c.m.px(left),
      y: top,
      width: c.m.px(left + width) - c.m.px(left),
      height: c.m.py(Math.max(0, c.frame.y[0])) - top,
      role: "ink",
      fill: FILLS[c.index % FILLS.length],
      partId: s.id,
    };
  });
}

/** [x, y] points of a line or scatter series, reporting numbers and points off the frame. */
function points(s: Series, c: Ctx): Pair[] {
  const pts = s.values.filter(isPair);
  if (pts.length !== s.values.length) {
    c.issues.push(clippedIssue(s, "a line or scatter series needs [x, y] pairs"));
  }
  const inside = pts.filter(([x, y]) => inX(c.frame, x) && inY(c.frame, y));
  if (inside.length !== pts.length)
    c.issues.push(clippedIssue(s, "a point lies outside the frame"));
  return inside;
}

function line(s: Series, c: Ctx): SceneItem[] {
  const pts = points(s, c);
  const weight: Weight = c.index % 2 ? "dashed" : "line";
  const items: SceneItem[] = [];
  if (pts.length > 1) {
    const d = pts.map(([x, y], i) => `${i ? "L" : "M"}${fmt(c.m.px(x))} ${fmt(c.m.py(y))}`);
    items.push({ t: "path", d: d.join(" "), role: "ink", weight, partId: s.id });
  }
  for (const [x, y] of pts) items.push(dotAt(c.m.px(x), c.m.py(y), s.id));
  return items;
}

function scatter(s: Series, c: Ctx): SceneItem[] {
  // A second series draws open dots, so the two never rely on color.
  return points(s, c).map(([x, y]) =>
    dotAt(c.m.px(x), c.m.py(y), s.id, HOUSE.pointRadius + 1, c.index % 2 === 1)
  );
}

function dotPlot(s: Series, c: Ctx): SceneItem[] {
  const r = HOUSE.dotPlotRadius;
  const pitch = 2 * r + HOUSE.dotPlotGap;
  const counts = new Map<number, number>();
  for (const v of s.values) {
    const [value, n] = isPair(v) ? v : [v, 1];
    counts.set(value, (counts.get(value) ?? 0) + n);
  }
  const base = c.m.py(c.frame.y[0]);
  const top = c.m.py(c.frame.y[1]);
  const items: SceneItem[] = [];
  for (const [value, n] of [...counts].sort((a, b) => a[0] - b[0])) {
    if (!inX(c.frame, value)) {
      c.issues.push(clippedIssue(s, `the value ${fmt(value)} lies outside the frame`));
      continue;
    }
    for (let k = 0; k < n; k++) {
      const Y = base - HOUSE.dotPlotGap - r - k * pitch;
      if (Y - r < top - 1e-6) {
        c.issues.push(clippedIssue(s, `the stack at ${fmt(value)} is taller than the figure`));
        break;
      }
      items.push(dotAt(c.m.px(value), Y, s.id, r, c.index % 2 === 1));
    }
  }
  return items;
}

const seg = (x1: number, y1: number, x2: number, y2: number) =>
  `M${fmt(x1)} ${fmt(y1)} L${fmt(x2)} ${fmt(y2)}`;

function boxPlot(s: Series, c: Ctx, name: string | undefined): SceneItem[] {
  const v = s.values.filter((x): x is number => !isPair(x));
  if (v.length !== 5 || v.some((x, i) => i > 0 && x < v[i - 1])) {
    c.issues.push(clippedIssue(s, "a box plot needs [min, Q1, median, Q3, max] in order"));
    return [];
  }
  if (!inX(c.frame, v[0]) || !inX(c.frame, v[4])) {
    c.issues.push(clippedIssue(s, "a whisker runs past the frame"));
  }
  const [min, q1, med, q3, max] = v.map((x) =>
    c.m.px(Math.min(c.frame.x[1], Math.max(c.frame.x[0], x)))
  );
  const rowH = c.m.h / c.count;
  const yc = c.m.py(c.frame.y[1]) + rowH * (c.index + 0.5);
  const h = Math.min(BOX_HEIGHT, rowH * 0.5);
  const cap = h / 4;
  const ink = { t: "path", role: "ink", weight: "line", partId: s.id } as const;
  const items: SceneItem[] = [
    { ...ink, d: seg(min, yc, q1, yc) },
    { ...ink, d: seg(q3, yc, max, yc) },
    { ...ink, d: seg(min, yc - cap, min, yc + cap) },
    { ...ink, d: seg(max, yc - cap, max, yc + cap) },
    { t: "rect", x: q1, y: yc - h / 2, width: q3 - q1, height: h, role: "ink", partId: s.id },
    { ...ink, d: seg(med, yc - h / 2, med, yc + h / 2) },
  ];
  if (name) {
    items.push({
      t: "text",
      x: c.m.px(c.frame.x[0]) - HOUSE.labelOffset,
      y: yc + HOUSE.font / 3,
      text: name,
      role: "ink",
      anchor: "end",
      partId: s.id,
    });
  }
  return items;
}

/**
 * The plot height a dot plot or box plot needs: its tallest stack of dots with
 * one dot's room above, or two box heights per box. Null for other charts.
 */
function numberLineHeight(
  type: ChartKind,
  series: Series[],
  kinds: Map<string, ChartKind>
): number | null {
  if (type === "box_plot") {
    const boxes = series.filter((s) => kinds.get(s.id) === "box_plot").length;
    return Math.max(1, boxes) * 2 * BOX_HEIGHT;
  }
  if (type !== "dot_plot") return null;
  const pitch = 2 * HOUSE.dotPlotRadius + HOUSE.dotPlotGap;
  let tallest = 1;
  for (const s of series) {
    if (kinds.get(s.id) !== "dot_plot") continue;
    const counts = new Map<number, number>();
    for (const v of s.values) {
      const [value, n] = isPair(v) ? v : [v, 1];
      counts.set(value, (counts.get(value) ?? 0) + n);
    }
    tallest = Math.max(tallest, ...counts.values());
  }
  return (tallest + 1) * pitch + HOUSE.dotPlotGap;
}

type LegendEntry = { id: string; name: string; kind: ChartKind; index: number };

/** Legend rows packed within `width`: each entry is a swatch and its series name. */
function legendRows(entries: LegendEntry[], width: number): LegendEntry[][] {
  const rows: LegendEntry[][] = [];
  let used = 0;
  for (const e of entries) {
    const w = legendWidth(e);
    const row = rows[rows.length - 1];
    if (row && used + w <= width) {
      row.push(e);
      used += w;
    } else {
      rows.push([e]);
      used = w;
    }
  }
  return rows;
}

const legendWidth = (e: LegendEntry) =>
  SWATCH + HOUSE.labelOffset + textWidth(e.name) + 3 * HOUSE.labelOffset;

function legendItems(rows: LegendEntry[][], width: number, top: number): SceneItem[] {
  const items: SceneItem[] = [];
  const off = HOUSE.labelOffset;
  rows.forEach((row, r) => {
    const rowW = row.reduce((sum, e) => sum + legendWidth(e), 0) - 2 * off;
    let x = (width - rowW) / 2;
    const y = top + off + HOUSE.font + r * LINE_HEIGHT;
    const mid = y - HOUSE.font / 3;
    for (const e of row) {
      if (e.kind === "bar" || e.kind === "histogram") {
        items.push({
          t: "rect",
          x,
          y: mid - SWATCH / 2,
          width: SWATCH,
          height: SWATCH,
          role: "ink",
          fill: FILLS[e.index % FILLS.length],
          partId: "legend",
        });
      } else if (e.kind === "line") {
        items.push({
          t: "path",
          d: seg(x, mid, x + SWATCH, mid),
          role: "ink",
          weight: e.index % 2 ? "dashed" : "line",
          partId: "legend",
        });
      } else {
        items.push(dotAt(x + SWATCH / 2, mid, "legend", HOUSE.pointRadius + 1, e.index % 2 === 1));
      }
      items.push({
        t: "text",
        x: x + SWATCH + off,
        y,
        text: e.name,
        role: "ink",
        anchor: "start",
        partId: "legend",
      });
      x += legendWidth(e);
    }
  });
  return items;
}

const WHAT: Record<ChartKind, string> = {
  bar: "Bar chart",
  line: "Line graph",
  scatter: "Scatterplot",
  dot_plot: "Dot plot",
  histogram: "Histogram",
  box_plot: "Box-and-whisker plot",
};

function describeChart(
  spec: FigureSpec,
  type: ChartKind,
  frame: PlaneFrame,
  series: Series[],
  names: Map<string, string>
) {
  const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
  const x = frame.xLabel?.trim() || "x";
  const y = frame.yLabel?.trim() || "y";
  const values = series.reduce((sum, s) => sum + s.values.length, 0);
  const body: Record<ChartKind, string> = {
    bar: `${WHAT.bar} with ${plural(frame.categories?.length ?? 0, "category", "categories")}. Y-axis: ${y}.`,
    line: `${WHAT.line} of ${plural(series.length, "series", "series")}. X-axis: ${x}. Y-axis: ${y}.`,
    scatter: `${WHAT.scatter} of ${plural(values, "point")}. X-axis: ${x}. Y-axis: ${y}.`,
    dot_plot: `${WHAT.dot_plot} of ${plural(values, "value")}. Axis: ${x}.`,
    histogram: `${WHAT.histogram} with ${plural(values, "bin")}. X-axis: ${x}. Y-axis: ${y}.`,
    box_plot: `${WHAT.box_plot} with ${plural(series.length, "box", "boxes")}. Value axis: ${x}.`,
  };
  const lines = spec.parts.filter((p) => p.kind === "function").length;
  const title = spec.title ? `${spec.title}. ` : "";
  // A function plot: a line chart holding only graphed functions.
  if (type === "line" && series.length === 0 && lines) {
    return `${title}Graph of ${plural(lines, "function")}. X-axis: ${x}. Y-axis: ${y}.`;
  }
  const extra = lines ? ` It also shows ${plural(lines, "graphed line")}.` : "";
  // The data itself, so two charts in one frame never read the same (describe-detail.ts).
  const data = chartDetail(type, frame, series, names);
  return `${title}${body[type]}${extra}${data ? ` ${data[0].toUpperCase()}${data.slice(1)}.` : ""}`;
}

/** The Scene of a chart FigureSpec (bar, line, scatter, dot_plot, histogram or box_plot) in `box`. */
export function buildChart(spec: FigureSpec, box: Box): Scene {
  const issues: SceneIssue[] = [];
  if (!isChartKind(spec.type)) {
    return {
      width: box.width,
      height: box.height,
      items: [],
      issues: [{ code: "clipped", detail: `a ${spec.type} figure is not a chart` }],
      description: "",
    };
  }
  const type = spec.type;
  const series = spec.parts.filter((p): p is Series => p.kind === "series");
  const names = new Map<string, string>();
  for (const l of spec.labels)
    if (!names.has(l.on) && l.text.trim()) names.set(l.on, l.text.trim());
  if (!spec.frame)
    issues.push({ code: "clipped", detail: "no frame given; using the data's extent" });
  const frame = chartFrame(type, spec.frame ?? autoFrame(type, series), series);
  const kindOf = (s: Series): ChartKind => {
    if (isChartKind(s.seriesKind)) return s.seriesKind;
    if (s.seriesKind) issues.push(clippedIssue(s, `unknown series kind "${s.seriesKind}"`));
    return type;
  };
  const kinds = new Map(series.map((s) => [s.id, kindOf(s)]));
  const ofKind = (k: ChartKind) => series.filter((s) => kinds.get(s.id) === k);
  const yMode: YAxisMode = type === "dot_plot" || type === "box_plot" ? "none" : "ticks";

  // Room above for the title, below for the legend, left for box-plot row names.
  const margin = HOUSE.margin;
  const titleLines = spec.title ? wrapText(spec.title, box.width - 2 * margin) : [];
  const titleH = titleLines.length ? titleLines.length * LINE_HEIGHT + HOUSE.labelOffset : 0;
  const fns = spec.parts.filter((p): p is Fn => p.kind === "function");
  const entries: LegendEntry[] =
    type === "box_plot"
      ? []
      : [
          ...series.flatMap((s) => {
            const name = names.get(s.id);
            const kind = kinds.get(s.id)!;
            return name ? [{ id: s.id, name, kind, index: ofKind(kind).indexOf(s) }] : [];
          }),
          // Graphed functions show as line swatches in their own style.
          ...fns.flatMap((f, index) => {
            const name = names.get(f.id);
            return name ? [{ id: f.id, name, kind: "line" as const, index }] : [];
          }),
        ];
  const drawn = series.length + fns.length;
  const rows = drawn > 1 && entries.length ? legendRows(entries, box.width - 2 * margin) : [];
  const legendH = rows.length ? rows.length * LINE_HEIGHT + 2 * HOUSE.labelOffset : 0;
  const rowNames = type === "box_plot" ? series.map((s) => names.get(s.id) ?? "") : [];
  const left = Math.max(0, ...rowNames.map((n) => (n ? textWidth(n) + HOUSE.labelOffset : 0)));
  const full = { width: box.width, height: box.height + titleH + legendH };
  const opts = { y: yMode, reserve: { top: titleH, bottom: legendH, left } };
  let axes = planeAxes(frame, full, opts);
  // A number line (dot or box plot) is only as tall as its stacks or boxes, so the
  // drawing is not left at the foot of an empty box.
  const need = numberLineHeight(type, series, kinds);
  if (need !== null && axes.map.h > need) {
    full.height -= axes.map.h - need;
    axes = planeAxes(frame, full, opts);
  }
  const m = axes.map;

  const items: SceneItem[] = [...axes.items];
  const dots: SceneItem[] = [];
  for (const s of series) {
    const kind = kinds.get(s.id)!;
    const same = ofKind(kind);
    const c: Ctx = { m, frame: axes.frame, issues, index: same.indexOf(s), count: same.length };
    if (kind === "bar") items.push(...bars(s, c));
    else if (kind === "histogram") items.push(...histogram(s, c));
    else if (kind === "line") items.push(...line(s, c));
    else if (kind === "scatter") dots.push(...scatter(s, c));
    else if (kind === "dot_plot") dots.push(...dotPlot(s, c));
    else items.push(...boxPlot(s, c, names.get(s.id)));
  }
  for (const part of spec.parts) {
    if (part.kind === "function") {
      // A second graphed function is dashed, matching its legend swatch.
      const dashed = fns.indexOf(part) % 2 === 1;
      for (const item of functionItems(part, axes.frame, m, issues)) {
        items.push(dashed && item.t === "path" ? { ...item, weight: "dashed" } : item);
      }
    } else if (part.kind !== "series") {
      issues.push({
        code: "clipped",
        partId: part.id,
        detail: `a ${part.kind} is not drawn on a chart`,
      });
    }
  }
  items.push(...dots); // points draw on top of the lines through them
  titleLines.forEach((text, k) => {
    items.push({
      t: "text",
      x: full.width / 2,
      y: margin + HOUSE.font + k * LINE_HEIGHT,
      text,
      role: "ink",
      anchor: "middle",
      partId: "title",
    });
  });
  items.push(...legendItems(rows, full.width, full.height - legendH));
  return {
    width: full.width,
    height: full.height,
    items,
    issues,
    description: describeChart(spec, type, axes.frame, series, names),
  };
}
