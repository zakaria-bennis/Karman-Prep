// The grid plan (G-5): gridlines, polar rings and spokes, axes, arrows and tick labels for one view,
// in CSS px, so the renderer only paints. Ticks come from axisTicks (NM-8) unless a custom
// axis step (S-1, S-7) is sparse enough; labels are formatAxisLabel(value, step). Pure: no DOM.

import type { CalculatorSettings } from "../core/api/types";
import { axisTicks } from "../plot/ticks";
import { worldToPx, type ViewSpec } from "../plot/viewport";
import { axisNumber, isScientificAxis } from "./axis-number";
import {
  ARROW_AXIS_START_PX,
  ARROW_INSET_PX,
  AXIS_FONT_PX,
  AXIS_OFFSET_PX,
  CUSTOM_STEP_MIN_PX,
  POLAR_SPOKE_DEG,
  SCI_EXPONENT_OVERLAP_PX,
  TICK_LENGTH_PX,
} from "./constants";
import type { GridSettings } from "./types";

export type PxSegment = { x0: number; y0: number; x1: number; y1: number };
export type PxEllipse = { cx: number; cy: number; rx: number; ry: number };
export type Align = "left" | "center" | "right";
/** "axis": the number font; "title" and "letter": a word or one-letter axis title (GP-9). */
export type LabelFont = "axis" | "title" | "letter";
/**
 * A label at alphabetic baseline `y`; `exponent` follows the text raised (GP-16); `pinned` numbers
 * sit on a canvas edge in the pinned grey (GP-15).
 */
export type PxLabel = {
  text: string;
  x: number;
  y: number;
  align: Align;
  exponent?: string;
  font?: LabelFont;
  pinned?: boolean;
};
export type PxArrow = { x: number; y: number; direction: "right" | "up" }; // x, y is the tip
// polar: minorLines and majorLines hold the spokes, which are stroked; otherwise they are filled
// rects. Axes and ticks are stroked at their exact px (GP-5, GP-7).
export type GridPlan = Record<"minorLines" | "majorLines" | "axes" | "ticks", PxSegment[]> &
  Record<"minorEllipses" | "majorEllipses", PxEllipse[]> & {
    polar: boolean;
    arrows: PxArrow[];
    labels: PxLabel[];
  };
export type AxisSteps = { step: number; major: number[]; minor: number[] };
export type Measure = (text: string, font?: LabelFont) => number;

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

const LABEL_HEIGHT_PX = AXIS_FONT_PX; // a label's box is measure(text) by the font size
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

/** Full-height lines at the x ticks and full-width ones at the y ticks, ascending; none under an axis. */
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
  // GP-2: minors run under the majors too; the major ink then stacks over them.
  const all = (minor: number[], major: number[]) => [...minor, ...major].sort((p, q) => p - q);
  if (grid.minorGridlines)
    plan.minorLines = lines(all(t.xs.minor, t.xs.major), all(t.ys.minor, t.ys.major));
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

/** GP-11 to GP-15: baselines and insets of the axis numbers, in CSS px. */
const X_NUMBER_BASELINE_PX = 15.8; // below the x-axis
const Y_NUMBER_GAP_PX = 5; // between a y number's right edge and the y-axis
const Y_NUMBER_BASELINE_PX = 3.8; // below the gridline
const EDGE_INSET_PX = 3; // numbers slide this far inside the canvas edge
const TOP_BASELINE_PX = 13.8; // a number pinned to the top edge
const BOTTOM_BASELINE_PX = 6.2; // above the bottom edge
/** GP-16: a scientific number's "m×10" drops this much and its exponent rises this much above it. */
const SCI_DROP_PX = 4.8;
/** GP-9: axis titles. */
const X_TITLE_BASELINE_PX = 33;
const X_TITLE_END_PX = 17; // from the right edge
const Y_TITLE_GAP_PX = 22.4; // from the y-axis to the title's right edge
const Y_TITLE_BASELINE_PX = 29;

type Box = { left: number; right: number; top: number; bottom: number };

/** A label's box: its measured width by the font's size above the baseline. */
function boxOf(l: PxLabel, w: number): Box {
  const left = l.align === "left" ? l.x : l.align === "right" ? l.x - w : l.x - w / 2;
  return { left, right: left + w, top: l.y - LABEL_HEIGHT_PX, bottom: l.y };
}

const overlaps = (a: Box, b: Box) =>
  a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;

const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), Math.max(lo, hi));

/** A number at `v`: plain, or scientific with its exponent (GP-16). */
function numberLabel(v: number, step: number, sci: boolean): Pick<PxLabel, "text" | "exponent"> {
  const n = axisNumber(v, step, sci);
  return n.exponent === undefined ? { text: n.text } : { text: n.text, exponent: n.exponent };
}

/**
 * Tick numbers (GP-10 to GP-16): x numbers centred under their gridline 15.8 px below the x-axis,
 * y numbers ending 5 px left of the y-axis 3.8 px below their gridline, and one "0" below-left of
 * the origin. A number crossing the canvas edge slides 3 px inside it. When an axis is out of view,
 * or its numbers have no room beside it, they pin to the nearest edge in the pinned grey and never
 * flip to the axis's other side. Titles (GP-9): x below its numbers near the right end, y left of
 * the axis at the top; a single letter is set as a math variable. Order: x numbers ascending, y
 * numbers ascending, "0", then the titles; a number overlapping the last one kept on its axis is
 * dropped. Hiding an axis hides its numbers and its title.
 */
function planLabels(view: ViewSpec, grid: GridSettings, t: Ticks, measure: Measure): PxLabel[] {
  const { width, height } = view.size;
  const [axisX, axisY] = worldToPx(view, 0, 0);
  const labels: PxLabel[] = [];
  const widthOf = (l: Pick<PxLabel, "text" | "exponent" | "font">) =>
    measure(l.text, l.font) +
    (l.exponent === undefined ? 0 : measure(l.exponent, l.font) - SCI_EXPONENT_OVERLAP_PX);
  const addTicks = (axis: readonly PxLabel[]) => {
    let last: Box | null = null;
    for (const l of axis) {
      const b = boxOf(l, widthOf(l));
      if (last !== null && overlaps(b, last)) continue;
      labels.push(l);
      last = b;
    }
  };
  /** Sci numbers drop their "m×10" below the plain baseline (GP-16). */
  const drop = (l: PxLabel): PxLabel =>
    l.exponent === undefined ? l : { ...l, y: l.y + SCI_DROP_PX };

  const v = view.viewport;
  if (grid.axisNumbers) {
    const xSci = isScientificAxis(v.left, v.right);
    const ySci = isScientificAxis(v.bottom, v.top);
    const xBottom = height - BOTTOM_BASELINE_PX;
    const xPinned = axisY < 0 || axisY + X_NUMBER_BASELINE_PX > xBottom;
    const xBaseline =
      axisY < 0 ? TOP_BASELINE_PX : xPinned ? xBottom : axisY + X_NUMBER_BASELINE_PX;
    const xs = grid.xAxis.show ? t.xs.major.filter((x) => x !== 0) : [];
    addTicks(
      xs.map((x) => {
        const n = numberLabel(x, t.xs.step, xSci);
        const w = widthOf(n);
        const main = measure(n.text);
        // The digits of "m×10" centre on the line, a minus and the exponent hang outside them;
        // the whole stays inside the canvas.
        const minus = n.text.startsWith("-") ? measure("-") / 2 : 0;
        const centre = clamp(
          worldToPx(view, x, 0)[0] - minus,
          EDGE_INSET_PX + main / 2,
          width - EDGE_INSET_PX - w + main / 2
        );
        const l: PxLabel = { ...n, x: centre, y: xBaseline, align: "center" };
        return drop(xPinned ? { ...l, pinned: true } : l);
      })
    );
    const ys = grid.yAxis.show ? t.ys.major.filter((y) => y !== 0) : [];
    addTicks(
      ys.map((y) => {
        const n = numberLabel(y, t.ys.step, ySci);
        const w = widthOf(n);
        const exp = w - measure(n.text); // the exponent's share past "m×10"
        const baseline = clamp(
          worldToPx(view, 0, y)[1] + Y_NUMBER_BASELINE_PX,
          TOP_BASELINE_PX,
          height - BOTTOM_BASELINE_PX
        );
        let l: PxLabel;
        if (axisX > width) {
          l = { ...n, x: width - EDGE_INSET_PX - exp, y: baseline, align: "right", pinned: true };
        } else if (axisX - Y_NUMBER_GAP_PX - w < EDGE_INSET_PX) {
          l = { ...n, x: EDGE_INSET_PX, y: baseline, align: "left", pinned: true };
        } else {
          l = { ...n, x: axisX - Y_NUMBER_GAP_PX - exp, y: baseline, align: "right" };
        }
        return drop(l);
      })
    );
    if (t.xAxisDrawn && t.yAxisDrawn && grid.xAxis.show && grid.yAxis.show) {
      labels.push({
        text: "0",
        x: axisX - Y_NUMBER_GAP_PX,
        y: axisY + X_NUMBER_BASELINE_PX,
        align: "right",
      });
    }
  }

  const font = (title: string): LabelFont => ([...title].length === 1 ? "letter" : "title");
  const xTitle = grid.xAxis.show ? grid.xAxis.label : "";
  if (xTitle !== "" && t.xAxisDrawn) {
    labels.push({
      text: xTitle,
      x: width - X_TITLE_END_PX,
      y: axisY + X_TITLE_BASELINE_PX,
      align: "right",
      font: font(xTitle),
    });
  }
  const yTitle = grid.yAxis.show ? grid.yAxis.label : "";
  if (yTitle !== "" && t.yAxisDrawn) {
    labels.push({
      text: yTitle,
      x: axisX - Y_TITLE_GAP_PX,
      y: Y_TITLE_BASELINE_PX,
      align: "right",
      font: font(yTitle),
    });
  }
  return labels;
}

/** GP-7: where the axes stroke, a quarter px before the origin rounded to a whole CSS px. */
const axisPx = (view: ViewSpec) =>
  worldToPx(view, 0, 0).map((p) => Math.round(p) - AXIS_OFFSET_PX) as [number, number];

/** GP-5: with the grid hidden, a short tick across each drawn axis at every nonzero major. */
function addTicks(plan: GridPlan, view: ViewSpec, t: Ticks): void {
  const [axisX, axisY] = axisPx(view);
  const half = TICK_LENGTH_PX / 2;
  if (t.xAxisDrawn) {
    for (const x of t.xs.major) {
      if (x === 0 && t.yAxisDrawn) continue;
      const px = worldToPx(view, x, 0)[0] - AXIS_OFFSET_PX;
      const y = axisY;
      plan.ticks.push({ x0: px, y0: y - half, x1: px, y1: y + half });
    }
  }
  if (t.yAxisDrawn) {
    for (const y of t.ys.major) {
      if (y === 0 && t.xAxisDrawn) continue;
      const py = worldToPx(view, 0, y)[1] - AXIS_OFFSET_PX;
      const x = axisX;
      plan.ticks.push({ x0: x - half, y0: py, x1: x + half, y1: py });
    }
  }
}

/** The whole grid for `view`; an empty plan when the view or its size cannot be drawn. */
export function planGrid(view: ViewSpec, grid: GridSettings, measure: Measure): GridPlan {
  const plan: GridPlan = {
    minorLines: [],
    majorLines: [],
    axes: [],
    ticks: [],
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
  } else addTicks(plan, view, t);
  // GP-7, GP-8: axes stroke a quarter px before the origin's whole px, as the reference rounds it;
  // with arrows the tip sits 1.5 px inside the edge.
  const [axisX, axisY] = axisPx(view);
  if (t.xAxisDrawn) {
    const end = grid.arrows ? size.width - ARROW_AXIS_START_PX : size.width;
    plan.axes.push({ x0: 0, y0: axisY, x1: end, y1: axisY });
    if (grid.arrows)
      plan.arrows.push({ x: size.width - ARROW_INSET_PX, y: axisY, direction: "right" });
  }
  if (t.yAxisDrawn) {
    const start = grid.arrows ? ARROW_AXIS_START_PX : 0;
    plan.axes.push({ x0: axisX, y0: start, x1: axisX, y1: size.height });
    if (grid.arrows) plan.arrows.push({ x: axisX, y: ARROW_INSET_PX, direction: "up" });
  }
  plan.labels = planLabels(view, grid, t, measure);
  return plan;
}
