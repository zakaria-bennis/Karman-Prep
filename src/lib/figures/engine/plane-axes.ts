/**
 * The frame every plane and chart shares: grid, axes, tick marks, tick labels
 * and axis names, and the world-to-pixel map of the plot they frame.
 *
 * - Tick labels follow Bluebook density. Without a label step from the spec,
 *   labels sit every grid step, doubled (every other step) while they would
 *   sit closer than MIN_LABEL_SPACING_PX, or overlap on the x-axis; the
 *   thinning is reported on the scene (`thinned`) so a check can say why a
 *   tick number of the original is missing. A label step the spec sets
 *   (`labelStep`, `yLabelStep`) is kept whenever the labels do not overlap;
 *   when they would, every other one is drawn and a `crowded_ticks` issue
 *   says so. A tick label is never dropped silently.
 * - `thousands` groups tick numbers with commas ("1,200"), as the SAT prints them.
 * - The origin prints "0", or the SAT's italic "O" (`originLabel: "O"`), below
 *   and left of where the axes meet. When a tick label is in the way it moves to
 *   the next free corner (below right, above left, above right); with no free
 *   corner it is reported as a `label_collision`, never dropped silently.
 * - Axis names: a short name (x, y, t) sits at the positive end of its axis, in
 *   italic when it is one letter, and a longer one is a title. `xTitle` and
 *   `yTitle` add a title beside the letter: the x title centered under the tick
 *   labels, the y title turned to read upward left of the y tick labels.
 * - `arrows` puts arrowheads on the axes' positive ends (or both ends), just
 *   past the grid; the letters then sit at the arrow tips, as in Bluebook.
 * - Category names wrap within their band; when one does not fit (a word wider
 *   than the band) or `rotateCategories` is set, they all turn 45° and end
 *   under their band.
 */
import { HOUSE } from "./house";
import { axisNames, categoryLabels } from "./axis-names";
import { numberWidth, textBox, textOverlap, textWidth } from "./labels";
import type { SceneIssue, SceneItem, ThinnedTicks as Thinned } from "./scene";
import type { PlaneFrame } from "./spec";
import { axisTicks, tickValues } from "./ticks";

export type Box = { width: number; height: number };
/** Distance in px from each box edge to the plot area. */
export type Inset = { left: number; right: number; top: number; bottom: number };
export type Mapper = ReturnType<typeof mapper>;
/** [left, right, top, bottom] in px. */
export type Rect = [number, number, number, number];
type TextItem = Extract<SceneItem, { t: "text" }>;

const EPS = 1e-9;

const MARGIN_INSET: Inset = {
  left: HOUSE.margin,
  right: HOUSE.margin,
  top: HOUSE.margin,
  bottom: HOUSE.margin,
};

/** World-to-pixel mapping for the frame inside the box, less `inset` on each side. */
export function mapper(frame: PlaneFrame, box: Box, inset: Inset = MARGIN_INSET) {
  const [x0, x1] = frame.x;
  const [y0, y1] = frame.y;
  const w = box.width - inset.left - inset.right;
  const h = box.height - inset.top - inset.bottom;
  return {
    w,
    h,
    px: (x: number) => inset.left + ((x - x0) / (x1 - x0)) * w,
    py: (y: number) => inset.top + ((y1 - y) / (y1 - y0)) * h,
  };
}

/** A coordinate rounded to 2 decimals for path data. */
export const fmt = (n: number) => String(Math.round(n * 100) / 100);

/** The minus sign the SAT prints in math (U+2212), never the ASCII hyphen. */
export const MINUS = "\u2212";

/**
 * A tick number as printed: fmt, with the true minus sign (U+2212, "−2") for a
 * negative, and with thousands grouped by commas when `group` ("1,200", "−1,200").
 * Path data keeps fmt and its ASCII "-".
 */
export function tickText(v: number, group = false): string {
  const s = fmt(v);
  if (!/^-?\d+(\.\d+)?$/.test(s)) return s.replace(/^-/, MINUS);
  const [int, dec] = s.split(".");
  const neg = int.startsWith("-");
  const digits = neg ? int.slice(1) : int;
  const grouped = group ? digits.replace(/\B(?=(\d{3})+(?!\d))/g, ",") : digits;
  return `${neg ? MINUS : ""}${grouped}${dec === undefined ? "" : `.${dec}`}`;
}

/** How the y-axis is drawn: with grid, ticks and labels, or not at all (a number line). */
export type YAxisMode = "ticks" | "none";

/**
 * Options for planeAxes: the y-axis mode, room kept clear for titles, legends and
 * row labels, and boxes (a chart title's lines) no axis text may overlap.
 */
export type AxesOptions = { y?: YAxisMode; reserve?: Partial<Inset>; avoid?: Rect[] };

/** Grid and tick steps per axis (undefined: the automatic step from ./ticks). */
function steps(frame: PlaneFrame) {
  const x = frame.step;
  const y = frame.yStep ?? frame.step;
  // labelStep spans both axes only while they share one step.
  const yLabel = frame.yLabelStep ?? (frame.yStep === undefined ? frame.labelStep : undefined);
  const yMinor = frame.yMinorStep ?? frame.minorStep;
  return { x, y, xLabel: frame.labelStep, yLabel, xMinor: frame.minorStep, yMinor };
}

/**
 * Where a broken axis starts, in world units: BREAK_STEPS of a step (the grid step,
 * else the automatic one for a plot about `box` wide) before the range, a corner
 * that stands for 0. Undefined for an axis without a break.
 */
export type Corners = { x?: number; y?: number };

/** A break's length, in steps: 2/3, as Bluebook draws the "0 ⌇ 9 10 11" of a histogram. */
const BREAK_STEPS = 2 / 3;

function breakCorners(frame: PlaneFrame, box: Box, yMode: YAxisMode): Corners {
  const s = steps(frame);
  const at = (range: [number, number], step: number | undefined, length: number) =>
    range[0] -
    BREAK_STEPS *
      (step ?? (axisTicks(range[0], range[1], length).step || (range[1] - range[0]) / 10));
  const out: Corners = {};
  if (frame.xBreak && !frame.categories) {
    out.x = at(frame.x, s.x, box.width - 2 * HOUSE.margin);
  }
  if (frame.yBreak && yMode === "ticks") {
    out.y = at(frame.y, s.y, box.height - 2 * HOUSE.margin);
  }
  return out;
}

/** The frame as drawn: each broken axis runs from its corner. */
const drawnFrame = (frame: PlaneFrame, c: Corners): PlaneFrame => ({
  ...frame,
  x: [c.x ?? frame.x[0], frame.x[1]],
  y: [c.y ?? frame.y[0], frame.y[1]],
});

/** Half the width of an axis break's zig-zag, and how far it rises and falls. */
const ZIG_HALF = 6;
const ZIG_RISE = 4;

/**
 * An axis from `a` to `b` (px, along x when `horizontal`), with a zig-zag
 * centered on `zig` when the axis is broken there, as path data.
 */
function axisPath(a: number, b: number, at: number, horizontal: boolean, zig?: number): string {
  const along = zig === undefined ? [] : [-ZIG_HALF, -ZIG_HALF / 2, ZIG_HALF / 2, ZIG_HALF];
  const off = [0, -ZIG_RISE, ZIG_RISE, 0];
  const dir = Math.sign(b - a) || 1;
  const pts: [number, number][] = [
    [a, 0],
    ...along.map((d, k): [number, number] => [zig! + dir * d, off[k]]),
    [b, 0],
  ];
  return pts
    .map(([u, v], k) => {
      const [x, y] = horizontal ? [u, at + v] : [at + v, u];
      return `${k ? "L" : "M"}${fmt(x)} ${fmt(y)}`;
    })
    .join(" ");
}

function grid(frame: PlaneFrame, m: Mapper, yMode: YAxisMode, c: Corners): SceneItem[] {
  if (frame.grid === false) return [];
  const { px, py } = m;
  const w = px(frame.x[1]) - px(frame.x[0]);
  const h = py(frame.y[0]) - py(frame.y[1]);
  // Lines reach back to a broken axis's corner.
  const left = c.x ?? frame.x[0];
  const bottom = c.y ?? frame.y[0];
  const s = steps(frame);
  const items: SceneItem[] = [];
  // Categories get no vertical lines; a number line (no y-axis) gets no grid at all.
  if (yMode === "none") return items;
  const xs = frame.categories
    ? []
    : s.x
      ? tickValues(frame.x[0], frame.x[1], s.x)
      : axisTicks(frame.x[0], frame.x[1], w).major;
  const ys = s.y
    ? tickValues(frame.y[0], frame.y[1], s.y)
    : axisTicks(frame.y[0], frame.y[1], h).major;
  for (const x of xs) {
    items.push({
      t: "path",
      d: `M${fmt(px(x))} ${fmt(py(frame.y[1]))} L${fmt(px(x))} ${fmt(py(bottom))}`,
      role: "grid",
      weight: "grid",
    });
  }
  for (const y of ys) {
    items.push({
      t: "path",
      d: `M${fmt(px(left))} ${fmt(py(y))} L${fmt(px(frame.x[1]))} ${fmt(py(y))}`,
      role: "grid",
      weight: "grid",
    });
  }
  return items;
}

/** Bluebook density: labels need at least this much center spacing along an axis. */
export const MIN_LABEL_SPACING_PX = 28;
/** Clear space between neighbouring tick labels (Bluebook sets them tight). */
const TICK_LABEL_GAP = 2;

type AxisLabels = {
  /** The step between drawn labels; 0 means no labels. */
  step: number;
  /** The step the spec asked for (its label step, else its grid step); 0 when automatic. */
  asked: number;
  /** A label step the spec set explicitly could not be kept. */
  crowded: boolean;
};

/**
 * The step between tick labels on an axis `lengthPx` long. A label step the spec
 * sets (`every`, snapped to a whole number of ticks so labels sit on ticks) is kept
 * while its labels are at least `need(step)` px apart, the room they really take;
 * otherwise, and without one, every grid step (`step`, else the step axisTicks
 * picks) while labels are MIN_LABEL_SPACING_PX and `need` apart. While too close,
 * the step doubles: every other label.
 */
function labelStep(
  range: [number, number],
  lengthPx: number,
  need: (step: number) => number,
  step?: number,
  every?: number
): AxisLabels {
  const tick = step ?? axisTicks(range[0], range[1], lengthPx).step;
  const base = every && tick ? tick * Math.max(1, Math.round(every / tick)) : (every ?? tick);
  if (!base || !(lengthPx > 0)) return { step: 0, asked: 0, crowded: false };
  const pxPerUnit = lengthPx / (range[1] - range[0]);
  const min = (s: number) => (every ? need(s) : Math.max(MIN_LABEL_SPACING_PX, need(s)));
  let drawn = base;
  // Doubling ends on any sensible axis; the cap guards a degenerate one.
  for (let k = 0; k < 30 && drawn * pxPerUnit < min(drawn); k++) drawn *= 2;
  const asked = every || step ? base : 0;
  return { step: drawn, asked, crowded: Boolean(every) && drawn !== base };
}

const clamp = (v: number, [lo, hi]: [number, number]) => Math.min(hi, Math.max(lo, v));

/**
 * True when text `t` would overlap a text in `items` by more than 1px both ways
 * (checks.ts): two numbers by their glyphs, or, when `roomy`, every pair by the
 * generous text box (the origin's 0 keeps clear room around it).
 */
function collides(t: TextItem, items: SceneItem[], roomy = false): boolean {
  return items.some((o) => {
    if (o.t !== "text") return false;
    let [w, h] = textOverlap(t, o);
    if (roomy) {
      const [a, b] = [textBox(t), textBox(o)];
      [w, h] = [
        Math.min(a[1], b[1]) - Math.max(a[0], b[0]),
        Math.min(a[3], b[3]) - Math.max(a[2], b[2]),
      ];
    }
    return w > 1 && h > 1;
  });
}

/** How far the axis runs past the grid to carry an arrowhead. */
const ARROW_RUN = HOUSE.arrowLength + 2;

/** Which axis ends carry arrowheads. */
function arrowEnds(frame: PlaneFrame): "end" | "both" | null {
  if (!frame.arrows) return null;
  return frame.arrows === "both" ? "both" : "end";
}

/** Should the axis group thousands in its tick numbers? */
const groups = (frame: PlaneFrame, axis: "x" | "y") =>
  frame.thousands === true || frame.thousands === axis;

type Axes = { items: SceneItem[]; issues: SceneIssue[]; thinned: Thinned[] };

/**
 * The origin's label at the first free corner of where the axes meet (px X, Y),
 * or an issue.
 */
function originLabel(frame: PlaneFrame, X: number, Y: number, items: SceneItem[]): Axes {
  const text = frame.originLabel === "O" ? "O" : "0";
  const tick = HOUSE.tickLength / 2;
  const off = HOUSE.labelOffset;
  const font = HOUSE.font;
  const left = X - tick - off / 2;
  const right = X + tick + off / 2;
  const below = Y + tick + font;
  const above = Y - tick - off / 2;
  const corners: [number, number, "start" | "end"][] = [
    [left, below, "end"],
    [right, below, "start"],
    [left, above, "end"],
    [right, above, "start"],
  ];
  for (const [x, y, anchor] of corners) {
    const label: TextItem = { t: "text", x, y, text, role: "ink-muted", anchor };
    if (text === "O") label.italic = true;
    if (!collides(label, items, true)) return { items: [label], issues: [], thinned: [] };
  }
  return {
    items: [],
    thinned: [],
    issues: [
      {
        code: "label_collision",
        partId: "axis",
        detail: `the origin label "${text}" has no free corner clear of the tick labels; widen the frame or the label step, or set frame.originLabel to false if the original prints none`,
      },
    ],
  };
}

/**
 * Axes, tick marks, tick numbers, the origin's label and the axis names. `frame` is the
 * frame's own range; a broken axis (`c`) starts at its corner, which `m` maps too.
 */
function axes(frame: PlaneFrame, m: Mapper, yMode: YAxisMode, c: Corners = {}): Axes {
  const { px, py } = m;
  const w = px(frame.x[1]) - px(frame.x[0]);
  const h = py(frame.y[0]) - py(frame.y[1]);
  const yAxis = yMode === "ticks";
  const cy = yAxis ? c.y : undefined;
  // The x-axis sits at y = 0, or the nearer frame edge, or a broken y-axis's corner; a
  // number line sits at the bottom. The y-axis likewise.
  const ax = cy ?? (yAxis ? clamp(0, frame.y) : frame.y[0]);
  const ay = c.x ?? clamp(0, frame.x);
  const font = HOUSE.font;
  const off = HOUSE.labelOffset;
  const arrows = arrowEnds(frame);
  const run = arrows ? ARROW_RUN : 0;
  const back = arrows === "both" ? ARROW_RUN : 0;
  // A break's zig-zag sits halfway between its corner and the range's start.
  const xZig = c.x === undefined ? undefined : (px(c.x) + px(frame.x[0])) / 2;
  const yZig = cy === undefined ? undefined : (py(cy) + py(frame.y[0])) / 2;
  const xFrom = c.x ?? frame.x[0];
  const yFrom = cy ?? frame.y[0];
  const xAxis: SceneItem = {
    t: "path",
    d: axisPath(px(xFrom) - back, px(frame.x[1]) + run, py(ax), true, xZig),
    role: "ink",
    weight: "line",
    partId: "axis",
  };
  if (arrows) xAxis.arrows = arrows;
  const items: SceneItem[] = [xAxis];
  const issues: SceneIssue[] = [];
  const thinned: Thinned[] = [];
  if (yAxis) {
    const yLine: SceneItem = {
      t: "path",
      d: axisPath(py(yFrom) + back, py(frame.y[1]) - run, px(ay), false, yZig),
      role: "ink",
      weight: "line",
      partId: "axis",
    };
    if (arrows) yLine.arrows = arrows;
    items.push(yLine);
  }
  const tick = HOUSE.tickLength / 2;
  const s = steps(frame);
  // Where both labelled axes cross at 0 (a broken axis's corner stands for 0), one
  // origin label serves both, unless the frame asks for a 0 on each axis.
  const both = frame.originLabel === "both";
  const xAtZero = c.x !== undefined || ay === 0;
  const yAtZero = cy !== undefined || ax === 0;
  const sharedOrigin = yAxis && !frame.categories && xAtZero && yAtZero && !both;
  const cornerZero = frame.originLabel !== false && !sharedOrigin;
  // Baseline of the lowest text under the plot, for the x-axis title.
  let below = py(frame.y[0]);
  const report = (axis: "x" | "y", l: AxisLabels, key: string, spacing: number) => {
    if (l.asked && l.step !== l.asked) thinned.push({ axis, asked: l.asked, drawn: l.step });
    if (!l.crowded) return;
    issues.push({
      code: "crowded_ticks",
      partId: "axis",
      detail: `${axis} tick labels every ${fmt(l.asked)} would overlap (${fmt(spacing)}px apart); every other one was drawn (every ${fmt(l.step)}). Set frame.${key} to ${fmt(l.step)} to thin them on purpose, or widen the frame's range`,
    });
  };
  let xStep = 0;
  if (frame.categories) {
    for (const t of categoryLabels(frame, m, py(frame.y[0]))) {
      items.push(t);
      below = Math.max(below, textBox(t)[3] - 0.25 * font);
    }
  } else {
    const group = groups(frame, "x");
    const widest = (step: number) =>
      Math.max(
        0,
        ...tickValues(frame.x[0], frame.x[1], step).map((v) => numberWidth(tickText(v, group)))
      ) + TICK_LABEL_GAP;
    const l = labelStep(frame.x, w, widest, s.x, s.xLabel);
    report("x", l, "labelStep", (l.asked * w) / (frame.x[1] - frame.x[0]));
    xStep = l.step;
    for (const x of xStep ? tickValues(frame.x[0], frame.x[1], xStep) : []) {
      if (sharedOrigin && Math.abs(x) < EPS) continue; // the origin is labeled once, below
      const X = px(x);
      const Y = py(ax);
      items.push({
        t: "path",
        d: `M${fmt(X)} ${fmt(Y - tick)} L${fmt(X)} ${fmt(Y + tick)}`,
        role: "ink",
        weight: "line",
      });
      const text = tickText(x, group);
      // The digits center on the tick and a minus sign hangs to their left, as the SAT
      // sets negative numbers, which also keeps "−1" clear of the y labels by the origin.
      const hang = x < 0 ? textWidth(MINUS) / 2 : 0;
      items.push({
        t: "text",
        x: X - hang,
        y: Y + tick + font,
        text,
        role: "ink-muted",
        anchor: "middle",
      });
      below = Math.max(below, Y + tick + font);
    }
    // A broken x-axis's corner reads 0, under the y-axis.
    if (c.x !== undefined && cornerZero && xStep) {
      items.push({
        t: "text",
        x: px(c.x),
        y: py(ax) + tick + font,
        text: "0",
        role: "ink-muted",
        anchor: "middle",
      });
    }
  }
  // Width of the widest y tick label, for the y-axis title.
  let yLabelWidth = 0;
  let yStep = 0;
  if (yAxis) {
    const group = groups(frame, "y");
    // A label's box is 1.25 font tall; neighbours keep a small gap.
    const l = labelStep(frame.y, h, () => 1.25 * font + TICK_LABEL_GAP / 2, s.y, s.yLabel);
    report("y", l, "yLabelStep", (l.asked * h) / (frame.y[1] - frame.y[0]));
    yStep = l.step;
    const ys = yStep ? tickValues(frame.y[0], frame.y[1], yStep) : [];
    // A broken y-axis's corner reads 0, beside the x-axis.
    if (cy !== undefined && cornerZero && yStep) ys.unshift(cy);
    for (const y of ys) {
      if (sharedOrigin && Math.abs(y) < EPS) continue;
      const corner = y === cy;
      const X = px(ay);
      const Y = py(y);
      if (!corner) {
        items.push({
          t: "path",
          d: `M${fmt(X - tick)} ${fmt(Y)} L${fmt(X + tick)} ${fmt(Y)}`,
          role: "ink",
          weight: "line",
        });
      }
      const text = corner ? "0" : tickText(y, group);
      const label: TextItem = {
        t: "text",
        x: X - tick - off / 2,
        y: Y + font / 3,
        text,
        role: "ink-muted",
        anchor: "end",
      };
      // Where the axes meet away from the origin (a histogram from 10), the x-axis
      // label at the corner wins and a y label that really meets it is left off. Any
      // other y label that meets an x label (near the origin, in a small box), or a
      // 0 the frame asks for on each axis, is reported.
      if (!collides(label, items)) items.push(label);
      else if (sharedOrigin || both || corner || Math.abs(y - ax) > EPS) {
        issues.push({
          code: "crowded_ticks",
          partId: "axis",
          detail: `the y tick label ${text} meets an x tick label where the axes cross and was left out; widen the figure, or set frame.labelStep or frame.yLabelStep to thin the labels on purpose`,
        });
      }
      yLabelWidth = Math.max(yLabelWidth, textWidth(text) + tick + off / 2);
    }
  }
  if (sharedOrigin && frame.originLabel !== false && (xStep || yStep)) {
    const origin = originLabel(frame, px(ay), py(ax), items);
    items.push(...origin.items);
    issues.push(...origin.issues);
  }
  if (!frame.categories) {
    items.push(
      ...minorTicks(
        frame.x,
        s.xMinor,
        xStep,
        ay,
        (v, d) => `M${fmt(px(v))} ${fmt(py(ax) - d)} L${fmt(px(v))} ${fmt(py(ax) + d)}`
      )
    );
  }
  if (yAxis) {
    items.push(
      ...minorTicks(
        frame.y,
        s.yMinor,
        yStep,
        ax,
        (v, d) => `M${fmt(px(ay) - d)} ${fmt(py(v))} L${fmt(px(ay) + d)} ${fmt(py(v))}`
      )
    );
  }
  const names = drawnFrame(frame, { x: c.x, y: cy });
  items.push(...axisNames(names, m, { ax, ay, yAxis, below, yLabelWidth, run }));
  return { items, issues, thinned };
}

/**
 * Unlabelled tick marks every `step` along `range`, shorter than a labelled tick
 * (HOUSE.minorTickLength): none where a labelled tick (every `labelled`) or the
 * other axis (`cross`) already is. `path` draws one across the axis at a value.
 */
function minorTicks(
  range: [number, number],
  step: number | undefined,
  labelled: number,
  cross: number,
  path: (v: number, half: number) => string
): SceneItem[] {
  if (!step) return [];
  const onLabel = (v: number) => {
    if (!labelled) return false;
    const k = v / labelled;
    return Math.abs(k - Math.round(k)) < 1e-6;
  };
  return tickValues(range[0], range[1], step)
    .filter((v) => !onLabel(v) && Math.abs(v - cross) > EPS)
    .map((v) => ({
      t: "path",
      d: path(v, HOUSE.minorTickLength / 2),
      role: "ink",
      weight: "line",
    }));
}

/**
 * The plot inset that keeps every axis label inside the box: the house margin
 * plus any reserved room, grown on any side where labels would hang past the
 * edge (an axis on a frame edge, as in a first-quadrant plane), and at the top
 * where a y name above the plot would meet a chart's title (`avoid`). Labels
 * keep their place outside the axes; the plot shrinks to make room. A few
 * passes settle the mapping.
 */
function labelInset(frame: PlaneFrame, c: Corners, box: Box, opts: AxesOptions): Inset {
  const r = opts.reserve ?? {};
  const inset = {
    left: MARGIN_INSET.left + (r.left ?? 0),
    right: MARGIN_INSET.right + (r.right ?? 0),
    top: MARGIN_INSET.top + (r.top ?? 0),
    bottom: MARGIN_INSET.bottom + (r.bottom ?? 0),
  };
  const yMode = opts.y ?? "ticks";
  const avoid = opts.avoid ?? [];
  for (let pass = 0; pass < 6; pass++) {
    const m = mapper(drawnFrame(frame, c), box, inset);
    const texts = axes(frame, m, yMode, c).items.filter((i): i is TextItem => i.t === "text");
    const over = { left: 0, right: 0, top: 0, bottom: 0 };
    for (const t of texts) {
      const [left, right, top, bottom] = textBox(t);
      over.left = Math.max(over.left, (r.left ?? 0) - left);
      over.right = Math.max(over.right, right - (box.width - (r.right ?? 0)));
      over.top = Math.max(over.top, (r.top ?? 0) - top);
      over.bottom = Math.max(over.bottom, bottom - (box.height - (r.bottom ?? 0)));
      // A text that meets a box to avoid (a chart's title) moves down below it.
      for (const a of avoid) {
        if (left < a[1] && a[0] < right && top < a[3] && a[2] < bottom) {
          over.top = Math.max(over.top, a[3] + TICK_LABEL_GAP - top);
        }
      }
    }
    let grew = false;
    for (const side of ["left", "right", "top", "bottom"] as const) {
      if (over[side] > 0.01) {
        inset[side] += over[side];
        grew = true;
      }
    }
    if (!grew) break;
  }
  return inset;
}

/**
 * Grid, axes, tick labels and axis names for `frame` in `box`, and the
 * world-to-pixel map of the plot they frame. Charts and planes share it.
 * With categories the x range becomes [0, n], one band per category. A broken
 * axis (xBreak, yBreak) is drawn from its corner, which `map` covers; the
 * returned `frame` keeps the frame's own range, for clipping.
 * `issues` are the frame's own (crowded tick labels, an origin label with no
 * room); `thinned` lists the axes that label fewer ticks than the spec's steps.
 */
export function planeAxes(
  frame: PlaneFrame,
  box: Box,
  opts: AxesOptions = {}
): {
  items: SceneItem[];
  map: Mapper;
  frame: PlaneFrame;
  issues: SceneIssue[];
  thinned: Thinned[];
} {
  const f: PlaneFrame = frame.categories ? { ...frame, x: [0, frame.categories.length] } : frame;
  const yMode = opts.y ?? "ticks";
  const c = breakCorners(f, box, yMode);
  const map = mapper(drawnFrame(f, c), box, labelInset(f, c, box, opts));
  const drawn = axes(f, map, yMode, c);
  return {
    items: [...grid(f, map, yMode, c), ...drawn.items],
    map,
    frame: f,
    issues: drawn.issues,
    thinned: drawn.thinned,
  };
}
