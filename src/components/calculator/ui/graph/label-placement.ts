// Placement of coordinate labels (POI-TRACE-17, POI-TRACE-24, GP-38), the way Desmos places them:
// every label, open, hovered or traced, tries eight spots around its dot (right, left, above, above
// left, above right, below, below left, below right, in that order). Each spot scores 400 (380 for
// the spot the label had last time, so a moving label keeps its side), plus 10 per px² outside the
// graph, plus the ink under it (the grid, curves, dots and graph controls, at 1/200 per unit of
// alpha), plus its overlap with the other labels: a label already placed counts with its spot,
// a later one with the average over its spots. The lowest score wins; the first on a tie. Unless
// the layout is redone (`relayout`: while tracing, and once a trace ends), a label that was
// already showing keeps its spot and only new labels choose. Box
// sizes are estimated from the label (GP-37): the 20.24 px math serif, 4 px side padding and a
// 1 px border, 42.27 px tall (taller with a fraction), plus the decimal/fraction toggle and the
// export button when they show.

import type { FormattedCoordinate, FormattedLabel } from "@/lib/calculator/poi/format";

export const ORIENTATIONS = ["right", "left", "above", "tl", "tr", "below", "bl", "br"] as const;
export type Orientation = (typeof ORIENTATIONS)[number];
export interface PlacedLabel {
  left: number;
  top: number;
  orientation: Orientation;
}
export interface Box {
  left: number;
  top: number;
  right: number;
  bottom: number;
}
/** The ink under a box of the graph, in Desmos's units (alpha summed over the box / 200). */
export type InkSampler = (box: Box) => number;

/** A dot's reach for its label: half the 8 px point size plus 3 px. */
export const LABEL_RADIUS_PX = 7;
/** A diagonal spot's corner sits this far off the dot on each axis: round(7 / √2). */
export const LABEL_OFFSET_PX = Math.round(LABEL_RADIUS_PX / Math.SQRT2);
const BASE_SCORE = 400;
const PRIOR_BONUS = 20;
const OUTSIDE_PER_PX = 10;
const EM = 20.24; // the label's math size (GP-37)
const CHROME_PX = 10; // 4 px side padding and a 1 px border each side
const HEIGHT_PX = 42.27;
const FRACTION_EXTRA_PX = 19;
const EXPORT_PX = 21.6; // POI-TRACE-18's button: 25.6 px wide, 4 px of it over the math and padding
const FRACTION_TOGGLE_PX = 28; // the label's decimal/fraction toggle: 24 px and 4 px of air before it
const CHAR_EM: Readonly<Record<string, number>> = { ".": 0.25, ",": 0.5, "−": 0.7, "-": 0.7 };

const textEm = (s: string) => [...s].reduce((w, c) => w + (CHAR_EM[c] ?? 0.5), 0);

function coordinateEm(c: FormattedCoordinate): number {
  const p = c.parts;
  switch (p.kind) {
    case "undefined":
      return 4.6;
    case "number":
      return textEm(p.text);
    case "pi": {
      const num = textEm(p.n === 1 ? "" : String(p.n)) + 0.55;
      const body = p.d === 1 ? num : 0.9 * Math.max(num, textEm(String(p.d))) + 0.4;
      return body + (p.negative ? 0.7 : 0);
    }
    case "scientific":
      return textEm(p.mantissa) + 0.9 + 1 + 0.7 * textEm(p.exponent);
    case "fraction":
      return (
        0.9 * Math.max(textEm(String(p.n)), textEm(String(p.d))) + 0.4 + (p.negative ? 0.7 : 0)
      );
  }
}

/** The buttons a label shows after its math. */
export interface LabelButtons {
  export: boolean; // POI-TRACE-18
  fraction: boolean; // the decimal/fraction toggle (owner decision, 2026-10-21)
}

const stacked = (c: FormattedCoordinate) =>
  c.parts.kind === "fraction" || (c.parts.kind === "pi" && c.parts.d !== 1);

/** GP-37: the label box's size for `label`, with room for the buttons that show. */
export function labelBoxSize(
  label: FormattedLabel,
  buttons: LabelButtons
): { width: number; height: number } {
  const em = 1.1 + coordinateEm(label.x) + 0.5 + coordinateEm(label.y);
  const fraction = stacked(label.x) || stacked(label.y);
  return {
    width:
      CHROME_PX +
      em * EM +
      (buttons.fraction ? FRACTION_TOGGLE_PX : 0) +
      (buttons.export ? EXPORT_PX : 0),
    height: HEIGHT_PX + (fraction ? FRACTION_EXTRA_PX : 0),
  };
}

/** The box's centre offset from the dot for `o`: a fraction of the box plus a fixed px offset. */
const SPOTS: Readonly<Record<Orientation, readonly [number, number, number, number]>> = {
  right: [0.5, LABEL_RADIUS_PX + 3, 0, 0],
  left: [-0.5, -LABEL_RADIUS_PX - 3, 0, 0],
  above: [0, 0, -0.5, -LABEL_RADIUS_PX],
  tl: [-0.5, -LABEL_OFFSET_PX, -0.5, -LABEL_OFFSET_PX],
  tr: [0.5, LABEL_OFFSET_PX, -0.5, -LABEL_OFFSET_PX],
  below: [0, 0, 0.5, LABEL_RADIUS_PX],
  bl: [-0.5, -LABEL_OFFSET_PX, 0.5, LABEL_OFFSET_PX],
  br: [0.5, LABEL_OFFSET_PX, 0.5, LABEL_OFFSET_PX],
};

interface Spot {
  orientation: Orientation;
  box: Box;
  left: number; // unrounded, for the label's style
  top: number;
  score: number;
}

const area = (a: Box, b: Box) =>
  Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left)) *
  Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));

export interface LabelToPlace {
  x: number; // the dot, CSS px of the graph
  y: number;
  width: number;
  height: number;
  prior?: Orientation; // where the label sat last time
}

function spotsFor(
  l: LabelToPlace,
  graph: { width: number; height: number },
  ink: InkSampler
): Spot[] {
  const view: Box = { left: 0, top: 0, right: graph.width, bottom: graph.height };
  return ORIENTATIONS.map((orientation) => {
    const [sx, ax, sy, ay] = SPOTS[orientation];
    const cx = l.x + sx * l.width + ax,
      cy = l.y + sy * l.height + ay;
    const box: Box = {
      left: Math.round(cx - l.width / 2),
      right: Math.round(cx + l.width / 2),
      top: Math.round(cy - l.height / 2),
      bottom: Math.round(cy + l.height / 2),
    };
    const size = (box.right - box.left) * (box.bottom - box.top);
    const score =
      BASE_SCORE -
      (orientation === l.prior ? PRIOR_BONUS : 0) +
      OUTSIDE_PER_PX * (size - area(box, view)) +
      ink(box);
    return { orientation, box, left: cx - l.width / 2, top: cy - l.height / 2, score };
  });
}

const NO_INK: InkSampler = () => 0;

/**
 * Places `labels` in order over a graph of `graph` px whose ink `ink` reads; without `relayout`
 * a label with a prior spot keeps it.
 */
export function placeLabels(
  labels: readonly LabelToPlace[],
  graph: { width: number; height: number },
  ink: InkSampler = NO_INK,
  relayout = false
): PlacedLabel[] {
  const spots = labels.map((l) => {
    const all = spotsFor(l, graph, ink);
    return relayout || l.prior === undefined ? all : all.filter((s) => s.orientation === l.prior);
  });
  const chosen: Spot[] = [];
  spots.forEach((own, r) => {
    let best: Spot | null = null,
      bestScore = Infinity;
    for (const s of own) {
      let overlap = 0;
      spots.forEach((others, i) => {
        if (i === r) return;
        const list = i < r ? [chosen[i]] : others;
        overlap += list.reduce((sum, o) => sum + area(s.box, o.box), 0) / list.length;
      });
      if (best === null || s.score + overlap < bestScore) {
        best = s;
        bestScore = s.score + overlap;
      }
    }
    chosen.push(best!);
  });
  return chosen.map((s) => ({ left: s.left, top: s.top, orientation: s.orientation }));
}
