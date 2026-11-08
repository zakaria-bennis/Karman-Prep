/**
 * Chart builder: bar, line, scatter, dot plot, histogram and box plot specs as
 * a role-colored Scene, on the same axes, grid and tick labels as the
 * coordinate plane (plane.ts planeAxes).
 *
 * - Each `series` part draws as its own seriesKind, else as the spec's type, so
 *   a scatterplot can carry a line of best fit (a `function` part).
 * - Bars rise from 0, one band per category; a lone series fills 40% of its
 *   band, several stand side by side filling 60%, and no bar is wider than an
 *   eighth of the plot (founder review, 2026-10-22/23). Bars in a group touch,
 *   as histogram bins do, and a separator line in the `paper` role (the figure's
 *   own background) is drawn on every shared edge, so neighbours stay distinct
 *   in light and dark without relying on fill color (founder, 2026-11-01). Bar
 *   fills are opaque roles, so grid lines never show through a bar.
 * - Box plots and dot plots sit on a number line with no y-axis or grid.
 * - A title wraps above the plot; with two or more named series a legend
 *   wraps below it. The figure grows taller for both, so the plot keeps its size.
 */
import { chartDetail } from "./describe-detail";
import { HOUSE } from "./house";
import { textWidth } from "./labels";
import {
  FILLS,
  legendHeight,
  legendItems,
  legendRows,
  seg,
  type LegendEntry,
} from "./chart-legend";
import { lineRole, lineStyle, marker } from "./line-styles";
import { dotAt, functionItems } from "./plane";
import { LINE_HEIGHT, wrapText } from "./axis-names";
import {
  fmt,
  planeAxes,
  type Box,
  type Mapper,
  type Rect as Box4,
  type YAxisMode,
  Y_LABEL_PITCH,
} from "./plane-axes";
import type { Scene, SceneIssue, SceneItem, Weight } from "./scene";
import type { FigureSpec, Part, PlaneFrame } from "./spec";
import { CHART_TYPES, type ChartKind } from "./spec-types";
import { niceStep } from "./ticks";

type Series = Extract<Part, { kind: "series" }>;
type Fn = Extract<Part, { kind: "function" }>;
type Pair = [number, number];

const isChartKind = (k: string | undefined): k is ChartKind => CHART_TYPES.includes(k as ChartKind);

/** Share of a category band a lone bar fills, and a group of bars fills. */
const BAR_SHARE = 0.4;
const GROUP_SHARE = 0.6;
/** No bar is wider than this share of the plot. */
const MAX_BAR_SHARE = 1 / 8;
const BOX_HEIGHT = 40;

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

/**
 * The frame adjusted for the chart: bars and bins rise from 0, unless the y-axis
 * is broken (they then rise from the range's start, above the break).
 */
function chartFrame(type: ChartKind, frame: PlaneFrame, series: Series[]): PlaneFrame {
  const y: [number, number] = frame.yBreak
    ? frame.y
    : [Math.min(0, frame.y[0]), Math.max(type === "bar" ? 0 : frame.y[1], frame.y[1])];
  if (type === "bar") {
    const n = Math.max(
      frame.categories?.length ?? 0,
      ...series.map((s) => s.values.length),
      ...series.flatMap((s) => s.values.filter(isPair).map(([i]) => i + 1))
    );
    return {
      ...frame,
      categories: frame.categories ?? Array.from({ length: n }, () => ""),
      y,
    };
  }
  if (type === "histogram") return { ...frame, y };
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

type Rect = Extract<SceneItem, { t: "rect" }>;

function bars(s: Series, c: Ctx): Rect[] {
  const n = c.frame.categories?.length ?? 1;
  const band = c.m.w / n;
  const fit = c.count > 1 ? (band * GROUP_SHARE) / c.count : band * BAR_SHARE;
  const barW = Math.min(fit, c.m.w * MAX_BAR_SHARE);
  // Bars in a group touch: no gap inside a group; the space between groups stays.
  const groupW = barW * c.count;
  const items: Rect[] = [];
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
      x: c.m.px(i + 0.5) - groupW / 2 + barW * c.index,
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

function histogram(s: Series, c: Ctx): Rect[] {
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

/**
 * A separator on every edge two bars or bins share: a line in the `paper` role (the
 * figure's background, which contrasts with every opaque fill in light and dark) down
 * the part of the edge where both sides are filled. The rects keep their exact size,
 * so every value reads where it did; the line only parts touching neighbours.
 */
export function barSeparators(rects: Rect[]): SceneItem[] {
  const out: SceneItem[] = [];
  const sorted = [...rects].sort((a, b) => a.x - b.x);
  for (const a of sorted) {
    const right = a.x + a.width;
    for (const b of sorted) {
      if (b === a || Math.abs(b.x - right) > 1e-6) continue;
      const top = Math.max(a.y, b.y);
      const bottom = Math.min(a.y + a.height, b.y + b.height);
      if (bottom - top <= 1e-6) continue;
      out.push({
        t: "path",
        d: seg(right, top, right, bottom),
        role: "paper",
        weight: "line",
        partId: "separator",
      });
    }
  }
  return out;
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

/**
 * A line series: one or two are solid and dashed with filled dots; three or more
 * each get their own pattern and marker (line-styles.ts), keyed in the legend.
 */
function line(s: Series, c: Ctx): SceneItem[] {
  const pts = points(s, c);
  const style = lineStyle(c.index, c.count, s.style);
  const weight: Weight = style ? style.weight : c.index % 2 ? "dashed" : "line";
  const items: SceneItem[] = [];
  if (pts.length > 1) {
    const d = pts.map(([x, y], i) => `${i ? "L" : "M"}${fmt(c.m.px(x))} ${fmt(c.m.py(y))}`);
    items.push({ t: "path", d: d.join(" "), role: lineRole(style), weight, partId: s.id });
  }
  for (const [x, y] of pts) {
    const X = c.m.px(x);
    const Y = c.m.py(y);
    const m = style ? marker(X, Y, style, s.id) : dotAt(X, Y, s.id);
    if (m) items.push(m);
  }
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
            const same = ofKind(kind);
            const index = same.indexOf(s);
            const style = kind === "line" ? lineStyle(index, same.length, s.style) : null;
            return name ? [{ id: s.id, name, kind, index, style }] : [];
          }),
          // Graphed functions show as line swatches in their own style.
          ...fns.flatMap((f, index) => {
            const name = names.get(f.id);
            return name ? [{ id: f.id, name, kind: "line" as const, index }] : [];
          }),
        ];
  // One named series draws a legend only when the spec asks for it, as its original does.
  const drawn = series.length + fns.length;
  const keyed = drawn > 1 || spec.legend === true;
  const rows = keyed && entries.length ? legendRows(entries, box.width - 2 * margin) : [];
  const legendH = legendHeight(rows);
  const rowNames = type === "box_plot" ? series.map((s) => names.get(s.id) ?? "") : [];
  const left = Math.max(0, ...rowNames.map((n) => (n ? textWidth(n) + HOUSE.labelOffset : 0)));
  const full = { width: box.width, height: box.height + titleH + legendH };
  // The title's lines, which no axis name may overlap (a y name above the plot steps below them).
  const titleBoxes: Box4[] = titleLines.map((text, k) => {
    const w = textWidth(text);
    const base = margin + HOUSE.font + k * LINE_HEIGHT;
    return [
      box.width / 2 - w / 2,
      box.width / 2 + w / 2,
      base - HOUSE.font,
      base + 0.25 * HOUSE.font,
    ];
  });
  const opts = { y: yMode, reserve: { top: titleH, bottom: legendH, left }, avoid: titleBoxes };
  let axes = planeAxes(frame, full, opts);
  // A number line (dot or box plot) is only as tall as its stacks or boxes, so the
  // drawing is not left at the foot of an empty box.
  const need = numberLineHeight(type, series, kinds);
  if (need !== null && axes.map.h > need) {
    full.height -= axes.map.h - need;
    axes = planeAxes(frame, full, opts);
  }
  // A y label step the spec sets is kept: the chart grows taller until its labels fit,
  // as it does for a title or legend (2026-05_US_V2_RW_M2_Q11 labels every 1 to 14).
  const yAsked = frame.yLabelStep ?? (frame.yStep === undefined ? frame.labelStep : undefined);
  const yTick = frame.yStep ?? frame.step;
  // Labels sit on ticks: the step snaps to a whole number of ticks, as plane-axes.ts does.
  const yEvery = yAsked && yTick ? yTick * Math.max(1, Math.round(yAsked / yTick)) : yAsked;
  if (yMode === "ticks" && yEvery) {
    const spacing = Math.abs(axes.map.py(frame.y[0]) - axes.map.py(frame.y[0] + yEvery));
    if (spacing > 0 && spacing < Y_LABEL_PITCH) {
      full.height += Math.ceil(axes.map.h * (Y_LABEL_PITCH / spacing - 1));
      axes = planeAxes(frame, full, opts);
    }
  }
  const m = axes.map;
  issues.push(...axes.issues);

  const items: SceneItem[] = [...axes.items];
  const dots: SceneItem[] = [];
  const filled: Rect[] = [];
  for (const s of series) {
    const kind = kinds.get(s.id)!;
    const same = ofKind(kind);
    const c: Ctx = { m, frame: axes.frame, issues, index: same.indexOf(s), count: same.length };
    if (kind === "bar" || kind === "histogram") {
      const rects = kind === "bar" ? bars(s, c) : histogram(s, c);
      filled.push(...rects);
      items.push(...rects);
    } else if (kind === "line") items.push(...line(s, c));
    else if (kind === "scatter") dots.push(...scatter(s, c));
    else if (kind === "dot_plot") dots.push(...dotPlot(s, c));
    else items.push(...boxPlot(s, c, names.get(s.id)));
  }
  items.push(...barSeparators(filled));
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
  const scene: Scene = {
    width: full.width,
    height: full.height,
    items,
    issues,
    description: describeChart(spec, type, axes.frame, series, names),
  };
  if (axes.thinned.length) scene.thinned = axes.thinned;
  return scene;
}
