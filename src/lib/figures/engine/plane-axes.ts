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
import { textBox, textOverlap, textWidth } from "./labels";
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

/**
 * The width a tick number really takes, for spacing labels along an axis: digits at
 * their tabular 0.5em in the figure font (0.495em measured), the minus at 0.72em,
 * comma and point narrow. textWidth stays the generous estimate for boxes.
 */
function tickWidth(text: string): number {
  let em = 0;
  for (const ch of text) em += ch === MINUS ? 0.72 : /\d/.test(ch) ? 0.5 : 0.35;
  return em * HOUSE.font;
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
  return { x, y, xLabel: frame.labelStep, yLabel };
}

function grid(frame: PlaneFrame, m: Mapper, yMode: YAxisMode): SceneItem[] {
  if (frame.grid === false) return [];
  const { w, h, px, py } = m;
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
      d: `M${fmt(px(x))} ${fmt(py(frame.y[1]))} L${fmt(px(x))} ${fmt(py(frame.y[0]))}`,
      role: "grid",
      weight: "grid",
    });
  }
  for (const y of ys) {
    items.push({
      t: "path",
      d: `M${fmt(px(frame.x[0]))} ${fmt(py(y))} L${fmt(px(frame.x[1]))} ${fmt(py(y))}`,
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

/** Line height for wrapped text. */
export const LINE_HEIGHT = Math.round(HOUSE.font * 1.2);

/** Words of `text` packed into lines no wider than `maxWidth`; a long word keeps its own line. */
export function wrapText(text: string, maxWidth: number): string[] {
  const lines: string[] = [];
  for (const word of text.trim().split(/\s+/).filter(Boolean)) {
    const last = lines[lines.length - 1];
    if (last !== undefined && textWidth(`${last} ${word}`) <= maxWidth) {
      lines[lines.length - 1] = `${last} ${word}`;
    } else lines.push(word);
  }
  return lines;
}

/**
 * wrapText into as few lines as `maxWidth` allows, with the lines as even as they
 * can be ("Concentration of bacteria / (millions of cells per mL)", not a lone "mL)").
 */
export function balancedWrap(text: string, maxWidth: number): string[] {
  const lines = wrapText(text, maxWidth);
  if (lines.length < 2) return lines;
  const total = textWidth(text);
  for (let w = total / lines.length; w < maxWidth; w += 2) {
    const even = wrapText(text, w);
    if (even.length === lines.length) return even;
  }
  return lines;
}

/** A short axis name (x, y, t, f(x)) sits at the axis end; a longer one is a title beside the plot. */
const isShortName = (name: string) => name.length <= 4 && !/\s/.test(name);
/** A single-letter name is a variable and prints in italic. */
const isVariable = (name: string) => /^[A-Za-z]$/.test(name);

/** True when text `t` would overlap a text in `items` by more than 1px both ways (checks.ts). */
function collides(t: TextItem, items: SceneItem[]): boolean {
  return items.some((o) => {
    if (o.t !== "text") return false;
    const [w, h] = textOverlap(t, o);
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

/** Category names under their bands: wrapped, or turned 45° when one does not fit. */
function categoryLabels(frame: PlaneFrame, m: Mapper, axisY: number): TextItem[] {
  const names = frame.categories ?? [];
  const off = HOUSE.labelOffset;
  const font = HOUSE.font;
  const band = m.w / Math.max(1, names.length);
  const tooWide = names.some((n) => n.split(/\s+/).some((word) => textWidth(word) > band - off));
  const turn = frame.rotateCategories ?? tooWide;
  const out: TextItem[] = [];
  names.forEach((name, i) => {
    const cx = m.px(i + 0.5);
    if (turn) {
      // The text's end sits just under its band, so it reads up to the right toward it.
      const text = name.trim().replace(/\s+/g, " ");
      if (!text) return;
      out.push({
        t: "text",
        x: cx + 0.35 * font,
        y: axisY + off + 0.7 * font,
        text,
        role: "ink",
        anchor: "end",
        rotate: -45,
      });
      return;
    }
    wrapText(name, band - off).forEach((line, k) => {
      out.push({
        t: "text",
        x: cx,
        y: axisY + off + font + k * LINE_HEIGHT,
        text: line,
        role: "ink",
        anchor: "middle",
      });
    });
  });
  return out;
}

/** The origin's label at the first free corner of where the axes meet, or an issue. */
function originLabel(frame: PlaneFrame, m: Mapper, items: SceneItem[]): Axes {
  const text = frame.originLabel === "O" ? "O" : "0";
  const tick = HOUSE.tickLength / 2;
  const off = HOUSE.labelOffset;
  const font = HOUSE.font;
  const X = m.px(0);
  const Y = m.py(0);
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
    if (!collides(label, items)) return { items: [label], issues: [], thinned: [] };
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

function axes(frame: PlaneFrame, m: Mapper, yMode: YAxisMode): Axes {
  const { w, h, px, py } = m;
  const yAxis = yMode === "ticks";
  // The x-axis sits at y = 0, or the nearer frame edge; a number line sits at the bottom.
  const ax = yAxis ? clamp(0, frame.y) : frame.y[0];
  const ay = clamp(0, frame.x);
  const font = HOUSE.font;
  const off = HOUSE.labelOffset;
  const arrows = arrowEnds(frame);
  const run = arrows ? ARROW_RUN : 0;
  const back = arrows === "both" ? ARROW_RUN : 0;
  const xAxis: SceneItem = {
    t: "path",
    d: `M${fmt(px(frame.x[0]) - back)} ${fmt(py(ax))} L${fmt(px(frame.x[1]) + run)} ${fmt(py(ax))}`,
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
      d: `M${fmt(px(ay))} ${fmt(py(frame.y[0]) + back)} L${fmt(px(ay))} ${fmt(py(frame.y[1]) - run)}`,
      role: "ink",
      weight: "line",
      partId: "axis",
    };
    if (arrows) yLine.arrows = arrows;
    items.push(yLine);
  }
  const tick = HOUSE.tickLength / 2;
  const s = steps(frame);
  // Where both labelled axes cross at 0, one origin label serves both.
  const sharedOrigin = yAxis && !frame.categories && ax === 0 && ay === 0;
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
        ...tickValues(frame.x[0], frame.x[1], step).map((v) => tickWidth(tickText(v, group)))
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
    for (const y of yStep ? tickValues(frame.y[0], frame.y[1], yStep) : []) {
      if (sharedOrigin && Math.abs(y) < EPS) continue;
      const X = px(ay);
      const Y = py(y);
      items.push({
        t: "path",
        d: `M${fmt(X - tick)} ${fmt(Y)} L${fmt(X + tick)} ${fmt(Y)}`,
        role: "ink",
        weight: "line",
      });
      const text = tickText(y, group);
      const label: TextItem = {
        t: "text",
        x: X - tick - off / 2,
        y: Y + font / 3,
        text,
        role: "ink-muted",
        anchor: "end",
      };
      // Where the axes meet away from the origin (a histogram from 10), the x-axis
      // label at the corner wins and the y label beside it is left off. Any other y
      // label that meets an x label (near the origin, in a small box) is reported.
      if (!collides(label, items)) items.push(label);
      else if (sharedOrigin || Math.abs(y - ax) > EPS) {
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
    const origin = originLabel(frame, m, items);
    items.push(...origin.items);
    issues.push(...origin.issues);
  }
  items.push(...axisNames(frame, m, { ax, ay, yAxis, below, yLabelWidth, run }));
  return { items, issues, thinned };
}

/**
 * Axis letters and titles. A letter (a short name) sits at the positive end of
 * its axis, at the arrow's tip when the axis has one; a title goes under the x
 * tick labels or, for y, above the plot (a long yLabel) or turned upright left
 * of the y tick labels (yTitle).
 */
function axisNames(
  frame: PlaneFrame,
  m: Mapper,
  at: {
    ax: number;
    ay: number;
    yAxis: boolean;
    below: number;
    yLabelWidth: number;
    run: number;
  }
): SceneItem[] {
  const { w, h, px, py } = m;
  const off = HOUSE.labelOffset;
  const font = HOUSE.font;
  const items: SceneItem[] = [];
  // With a title, the letter is only the one the spec names; else the name may be either.
  const xTitle = frame.xTitle?.trim() ?? "";
  const yTitle = at.yAxis ? (frame.yTitle?.trim() ?? "") : "";
  // Category bands (a bar chart) have no x variable to name.
  const xName = xTitle
    ? (frame.xLabel ?? "").trim()
    : (frame.xLabel ?? (frame.categories ? "" : "x")).trim();
  const yName = !at.yAxis
    ? ""
    : yTitle
      ? (frame.yLabel ?? "").trim()
      : (frame.yLabel ?? "y").trim();
  const xLetter = xName && (xTitle || isShortName(xName)) ? xName : "";
  const yLetter = yName && (yTitle || isShortName(yName)) ? yName : "";
  if (xLetter) {
    const item: TextItem = at.run
      ? {
          t: "text",
          x: px(frame.x[1]) + at.run + off / 2,
          y: py(at.ax) + font / 3,
          text: xLetter,
          role: "ink",
          anchor: "start",
        }
      : {
          t: "text",
          x: px(frame.x[1]) - off,
          y: py(at.ax) - off,
          text: xLetter,
          role: "ink",
          anchor: "end",
        };
    if (isVariable(xLetter)) item.italic = true;
    items.push(item);
  }
  const xLong = xTitle || (xLetter ? "" : xName);
  if (xLong) {
    const mid = (px(frame.x[0]) + px(frame.x[1])) / 2;
    wrapText(xLong, w).forEach((line, k) => {
      items.push({
        t: "text",
        x: mid,
        y: at.below + font + off + k * LINE_HEIGHT,
        text: line,
        role: "ink",
        anchor: "middle",
      });
    });
  }
  if (yLetter) {
    const item: TextItem = at.run
      ? {
          t: "text",
          x: px(at.ay),
          y: py(frame.y[1]) - at.run - off / 2,
          text: yLetter,
          role: "ink",
          anchor: "middle",
        }
      : {
          t: "text",
          x: px(at.ay) + off,
          y: py(frame.y[1]) + font,
          text: yLetter,
          role: "ink",
          anchor: "start",
        };
    if (isVariable(yLetter)) item.italic = true;
    items.push(item);
  }
  if (yTitle) {
    // Turned to read upward, centered on the plot, its last line nearest the tick labels.
    const lines = balancedWrap(yTitle, h);
    const right = px(at.ay) - at.yLabelWidth - off - 0.25 * font;
    lines.forEach((line, k) => {
      items.push({
        t: "text",
        x: right - (lines.length - 1 - k) * LINE_HEIGHT,
        y: (py(frame.y[0]) + py(frame.y[1])) / 2,
        text: line,
        role: "ink",
        anchor: "middle",
        rotate: -90,
      });
    });
  } else if (yName && !yLetter) {
    // Above the plot, left-aligned with the y tick labels.
    const left = px(at.ay) - at.yLabelWidth;
    const lines = wrapText(yName, px(frame.x[1]) - left);
    const top = py(frame.y[1]) - font - off - (lines.length - 1) * LINE_HEIGHT;
    lines.forEach((line, k) => {
      items.push({
        t: "text",
        x: left,
        y: top + k * LINE_HEIGHT,
        text: line,
        role: "ink",
        anchor: "start",
      });
    });
  }
  return items;
}

/**
 * The plot inset that keeps every axis label inside the box: the house margin
 * plus any reserved room, grown on any side where labels would hang past the
 * edge (an axis on a frame edge, as in a first-quadrant plane), and at the top
 * where a y name above the plot would meet a chart's title (`avoid`). Labels
 * keep their place outside the axes; the plot shrinks to make room. A few
 * passes settle the mapping.
 */
function labelInset(frame: PlaneFrame, box: Box, opts: AxesOptions): Inset {
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
    const m = mapper(frame, box, inset);
    const texts = axes(frame, m, yMode).items.filter((i): i is TextItem => i.t === "text");
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
 * With categories the x range becomes [0, n], one band per category.
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
  const map = mapper(f, box, labelInset(f, box, opts));
  const drawn = axes(f, map, yMode);
  return {
    items: [...grid(f, map, yMode), ...drawn.items],
    map,
    frame: f,
    issues: drawn.issues,
    thinned: drawn.thinned,
  };
}
