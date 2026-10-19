// The grid plan (G-5): gridlines, polar rings and spokes, axes, arrows and tick labels for one view,
// in CSS px, so the renderer only paints. Ticks come from 06's axisTicks (NM-8) unless a custom
// axis step (S-1, S-7) is sparse enough; labels are formatAxisLabel(value, step) (04). Pure: no DOM.

import type { CalculatorSettings } from "../core/api/types";
import { formatAxisLabel } from "../core/eval/format";
import { axisTicks } from "../plot/ticks";
import { worldToPx, type ViewSpec } from "../plot/viewport";
import { CUSTOM_STEP_MIN_PX, LABEL_GAP_PX, POLAR_SPOKE_DEG } from "./constants";
import type { GridSettings } from "./types";

export type PxSegment = { x0: number; y0: number; x1: number; y1: number };
export type PxEllipse = { cx: number; cy: number; rx: number; ry: number };
export type Align = "left" | "center" | "right";
export type Baseline = "top" | "middle" | "bottom";
export type PxLabel = { text: string; x: number; y: number; align: Align; baseline: Baseline };
export type PxArrow = { x: number; y: number; direction: "right" | "up" }; // x, y is the tip
// polar: minorLines and majorLines hold the spokes, which are stroked; otherwise they are filled rects
export type GridPlan = Record<"minorLines" | "majorLines" | "axes", PxSegment[]> &
  Record<"minorEllipses" | "majorEllipses", PxEllipse[]> & {
    polar: boolean;
    arrows: PxArrow[];
    labels: PxLabel[];
  };
export type AxisSteps = { step: number; major: number[]; minor: number[] };
export type Measure = (text: string) => number;

export const GRID_KEYS: readonly (keyof GridSettings)[] = [
  "showGrid",
  "polarGrid",
  "minorGridlines",
  "arrows",
  "axisNumbers",
  "xAxis",
  "yAxis",
];

/** The settings the grid plan reads (GRID_KEYS). */
export function pickGrid(settings: CalculatorSettings): GridSettings {
  const { showGrid, polarGrid, minorGridlines, arrows, axisNumbers, xAxis, yAxis } = settings;
  return { showGrid, polarGrid, minorGridlines, arrows, axisNumbers, xAxis, yAxis };
}

const LABEL_HEIGHT_PX = 13; // AXIS_FONT's size: a label's box is measure(text) by 13 px
const MAJOR_SPOKE_DEG = 30; // 12 major spokes
const NEAR_MAJOR = 1e-9; // custom minors within 1e-9·step of a major are dropped

/** A custom step is used when finite, positive and giving at most px / CUSTOM_STEP_MIN_PX majors. */
function isUsableStep(
  custom: number | null,
  min: number,
  max: number,
  px: number
): custom is number {
  if (custom === null || !Number.isFinite(custom) || custom <= 0) return false;
  return Math.floor(max / custom) - Math.ceil(min / custom) + 1 <= px / CUSTOM_STEP_MIN_PX;
}

/** Majors k·custom within [min, max] and minors every custom/5 that are not majors (`+ 0` drops −0). */
function customTicks(min: number, max: number, custom: number): AxisSteps {
  const major: number[] = [];
  for (let k = Math.ceil(min / custom), hi = Math.floor(max / custom); k <= hi; k++) {
    major.push(k * custom + 0);
  }
  const sub = custom / 5;
  const minor: number[] = [];
  for (let j = Math.ceil(min / sub), hi = Math.floor(max / sub); j <= hi; j++) {
    const v = j * sub + 0;
    if (Math.abs(v - Math.round(v / custom) * custom) > NEAR_MAJOR * custom) minor.push(v);
  }
  return { step: custom, major, minor };
}

/** One axis's ticks: the custom step when usable (CUSTOM_STEP_MIN_PX), else axisTicks (NM-8). */
export function axisSteps(min: number, max: number, px: number, custom: number | null): AxisSteps {
  return isUsableStep(custom, min, max, px)
    ? customTicks(min, max, custom)
    : axisTicks(min, max, px);
}

const isDrawable = ({ viewport: v, size }: ViewSpec) =>
  [v.left, v.right, v.bottom, v.top, size.width, size.height].every(Number.isFinite) &&
  v.right > v.left &&
  v.top > v.bottom &&
  size.width > 0 &&
  size.height > 0;

type Ticks = { xs: AxisSteps; ys: AxisSteps; xAxisDrawn: boolean; yAxisDrawn: boolean };

/** Full-height lines at the x ticks and full-width ones at the y ticks, ascending; 0 under an axis. */
function addCartesian(plan: GridPlan, view: ViewSpec, grid: GridSettings, t: Ticks): void {
  const { width, height } = view.size;
  const atX = (x: number): PxSegment => {
    const px = worldToPx(view, x, 0)[0];
    return { x0: px, y0: 0, x1: px, y1: height };
  };
  const atY = (y: number): PxSegment => {
    const py = worldToPx(view, 0, y)[1];
    return { x0: 0, y0: py, x1: width, y1: py };
  };
  const lines = (x: number[], y: number[]) => [
    ...x.filter((v) => !(v === 0 && t.yAxisDrawn)).map(atX),
    ...y.filter((v) => !(v === 0 && t.xAxisDrawn)).map(atY),
  ];
  plan.majorLines = lines(t.xs.major, t.ys.major);
  if (grid.minorGridlines) plan.minorLines = lines(t.xs.minor, t.ys.minor);
}

/**
 * Polar rings about the origin from its distance to the view up to the farthest corner, at the x
 * grid's spacing, and spokes every POLAR_SPOKE_DEG (world angles). With unequal units the rings
 * follow the axis with fewer px per unit, so they never crowd closer than the ticks would.
 */
function addPolar(plan: GridPlan, view: ViewSpec, grid: GridSettings): void {
  const { viewport: v, size } = view;
  const { width, height } = size;
  const [cx, cy] = worldToPx(view, 0, 0);
  const xSpan = v.right - v.left;
  const ySpan = v.top - v.bottom;
  const pxPerUnit = Math.min(width / xSpan, height / ySpan);
  const rMin = Math.hypot(Math.max(v.left, 0, -v.right), Math.max(v.bottom, 0, -v.top));
  const rMax = Math.hypot(
    Math.max(Math.abs(v.left), Math.abs(v.right)),
    Math.max(Math.abs(v.bottom), Math.abs(v.top))
  );
  const custom = grid.xAxis.step;
  const radii =
    isUsableStep(custom, v.left, v.right, width) && custom * pxPerUnit >= CUSTOM_STEP_MIN_PX
      ? customTicks(rMin, rMax, custom)
      : axisTicks(rMin, rMax, (rMax - rMin) * pxPerUnit);
  const ring = (r: number): PxEllipse => ({
    cx,
    cy,
    rx: (r * width) / xSpan,
    ry: (r * height) / ySpan,
  });
  plan.majorEllipses = radii.major.filter((r) => r > 0).map(ring);
  if (grid.minorGridlines) plan.minorEllipses = radii.minor.filter((r) => r > 0).map(ring);
  // 2·(width + height) px, or further when the origin lies so far off the canvas that it must.
  const corner = Math.hypot(
    Math.max(Math.abs(cx), Math.abs(width - cx)),
    Math.max(Math.abs(cy), Math.abs(height - cy))
  );
  const length = Math.max(2 * (width + height), corner);
  for (let deg = 0; deg < 360; deg += POLAR_SPOKE_DEG) {
    const major = deg % MAJOR_SPOKE_DEG === 0;
    if (!major && !grid.minorGridlines) continue;
    const a = (deg * Math.PI) / 180;
    const dx = (Math.cos(a) * width) / xSpan;
    const dy = (-Math.sin(a) * height) / ySpan;
    const k = length / Math.hypot(dx, dy);
    (major ? plan.majorLines : plan.minorLines).push({
      x0: cx,
      y0: cy,
      x1: cx + dx * k,
      y1: cy + dy * k,
    });
  }
}

type Box = { left: number; right: number; top: number; bottom: number };

function boxOf(l: PxLabel, w: number): Box {
  const left = l.align === "left" ? l.x : l.align === "right" ? l.x - w : l.x - w / 2;
  const h = LABEL_HEIGHT_PX;
  const top = l.baseline === "top" ? l.y : l.baseline === "bottom" ? l.y - h : l.y - h / 2;
  return { left, right: left + w, top, bottom: top + h };
}

const overlaps = (a: Box, b: Box) =>
  a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;

/**
 * Where a label of `size` px goes beside an axis at `pos` px on a canvas side of `extent` px:
 * LABEL_GAP_PX past it (`after`: towards larger px) or before it, on the preferred side when it
 * fits there and on the other otherwise; an axis out of view pins the label to that edge.
 */
function besideAxis(pos: number, size: number, extent: number, after: boolean) {
  const gap = LABEL_GAP_PX;
  const fits = after ? pos + gap + size <= extent : pos - gap - size >= 0;
  return fits === after
    ? { at: Math.max(pos, 0) + gap, after: true }
    : { at: Math.min(pos, extent) - gap, after: false };
}

/**
 * Tick labels sit below the x-axis and left of the y-axis; titles sit above the x-axis at its
 * right end and right of the y-axis at its top. Order: x ticks ascending, y ticks ascending, "0",
 * then the titles. A label leaving the canvas is dropped, and so is a tick label overlapping the
 * last one kept on its axis. Hiding an axis hides its tick labels and its title.
 */
function planLabels(view: ViewSpec, grid: GridSettings, t: Ticks, measure: Measure): PxLabel[] {
  const { width, height } = view.size;
  const [axisX, axisY] = worldToPx(view, 0, 0);
  const labels: PxLabel[] = [];
  const add = (l: PxLabel, last: Box | null = null): Box | null => {
    const b = boxOf(l, measure(l.text));
    const inside = b.left >= 0 && b.right <= width && b.top >= 0 && b.bottom <= height;
    if (!inside || (last !== null && overlaps(b, last))) return null;
    labels.push(l);
    return b;
  };
  const addTicks = (axis: readonly PxLabel[]) => {
    let last: Box | null = null;
    for (const l of axis) last = add(l, last) ?? last;
  };

  if (grid.axisNumbers) {
    const xs = grid.xAxis.show ? t.xs.major.filter((v) => v !== 0) : [];
    const ys = grid.yAxis.show ? t.ys.major.filter((v) => v !== 0) : [];
    const yTexts = ys.map((v) => formatAxisLabel(v, t.ys.step));
    const widest = Math.max(measure("0"), ...yTexts.map(measure));
    const row = besideAxis(axisY, LABEL_HEIGHT_PX, height, true);
    const column = besideAxis(axisX, widest, width, false);
    const baseline: Baseline = row.after ? "top" : "bottom";
    const align: Align = column.after ? "left" : "right";
    addTicks(
      xs.map((v) => {
        const x = worldToPx(view, v, 0)[0];
        return { text: formatAxisLabel(v, t.xs.step), x, y: row.at, align: "center", baseline };
      })
    );
    addTicks(
      ys.map((v, i) => {
        const y = worldToPx(view, 0, v)[1];
        return { text: yTexts[i], x: column.at, y, align, baseline: "middle" };
      })
    );
    if (t.xAxisDrawn && t.yAxisDrawn) add({ text: "0", x: column.at, y: row.at, align, baseline });
  }

  const xTitle = grid.xAxis.show ? grid.xAxis.label : "";
  if (xTitle !== "") {
    const { at, after } = besideAxis(axisY, LABEL_HEIGHT_PX, height, false);
    const baseline = after ? "top" : "bottom";
    add({ text: xTitle, x: width - LABEL_GAP_PX, y: at, align: "right", baseline });
  }
  const yTitle = grid.yAxis.show ? grid.yAxis.label : "";
  if (yTitle !== "") {
    const { at, after } = besideAxis(axisX, measure(yTitle), width, true);
    add({ text: yTitle, x: at, y: LABEL_GAP_PX, align: after ? "left" : "right", baseline: "top" });
  }
  return labels;
}

/** The whole grid for `view`; an empty plan when the view or its size cannot be drawn. */
export function planGrid(view: ViewSpec, grid: GridSettings, measure: Measure): GridPlan {
  const plan: GridPlan = {
    minorLines: [],
    majorLines: [],
    axes: [],
    minorEllipses: [],
    majorEllipses: [],
    polar: grid.polarGrid,
    arrows: [],
    labels: [],
  };
  if (!isDrawable(view)) return plan;
  const { viewport: v, size } = view;
  const t: Ticks = {
    xs: axisSteps(v.left, v.right, size.width, grid.xAxis.step),
    ys: axisSteps(v.bottom, v.top, size.height, grid.yAxis.step),
    xAxisDrawn: grid.xAxis.show && v.bottom <= 0 && 0 <= v.top,
    yAxisDrawn: grid.yAxis.show && v.left <= 0 && 0 <= v.right,
  };
  if (grid.showGrid) {
    if (grid.polarGrid) addPolar(plan, view, grid);
    else addCartesian(plan, view, grid, t);
  }
  const [axisX, axisY] = worldToPx(view, 0, 0);
  if (t.xAxisDrawn) {
    plan.axes.push({ x0: 0, y0: axisY, x1: size.width, y1: axisY });
    if (grid.arrows) plan.arrows.push({ x: size.width, y: axisY, direction: "right" });
  }
  if (t.yAxisDrawn) {
    plan.axes.push({ x0: axisX, y0: 0, x1: axisX, y1: size.height });
    if (grid.arrows) plan.arrows.push({ x: axisX, y: 0, direction: "up" });
  }
  plan.labels = planLabels(view, grid, t, measure);
  return plan;
}
