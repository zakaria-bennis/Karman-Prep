/**
 * How the series of a line chart with three or more series tell themselves
 * apart without color, as Bluebook draws them: each has its own line pattern
 * and its own marker at every data point, and its legend swatch shows both
 * (2024-03_UNSPECIFIED_VA_RW_M1_Q12: solid with filled triangles, dashed with
 * open squares, dotted with open circles; 2023-11_UNSPECIFIED_V1_RW_M1_Q11 adds
 * a fourth). Open markers are filled with the figure's own surface (`paper`),
 * so the line does not show through them. One or two series keep the plain
 * look: solid and dashed, with filled dots.
 *
 * A series may set its own `style` (spec.ts) when the original's differs from
 * the order: its pattern, marker (a star, a plain dot, or none), the marker's
 * fill (solid, open, or shaded in the muted role) and a muted line, as Bluebook
 * draws a gray line (2025-05_US_V2_RW_M2_Q06: a gray line with stars, a dashed
 * line with shaded squares; 2026-06_ASIA_V4_RW_M1_Q09: two series, triangles
 * and squares).
 */
import { HOUSE } from "./house";
import { fmt } from "./plane-axes";
import type { Role, SceneItem, Weight } from "./scene";
import type { Part } from "./spec";

export type MarkerShape = "triangle" | "square" | "circle" | "diamond" | "star";
export type MarkerFill = "solid" | "open" | "shaded";
export type LineStyle = {
  weight: Weight;
  /** "dot": the plain point dot; "none": no marker. */
  marker: MarkerShape | "dot" | "none";
  fill: MarkerFill;
  /** The line in the muted role (a gray line). */
  muted?: boolean;
};

/** Series styles in turn, from the third series on; a seventh series repeats the first. */
export const LINE_STYLES: readonly LineStyle[] = [
  { weight: "line", marker: "triangle", fill: "solid" },
  { weight: "dashed", marker: "square", fill: "open" },
  { weight: "dotted", marker: "circle", fill: "open" },
  { weight: "dashdot", marker: "diamond", fill: "solid" },
  { weight: "line", marker: "square", fill: "solid" },
  { weight: "dashed", marker: "triangle", fill: "open" },
];

/** The fewest line series that get patterns and markers. */
export const STYLED_FROM = 3;

const WEIGHTS: Record<string, Weight> = {
  solid: "line",
  dashed: "dashed",
  dotted: "dotted",
  dashdot: "dashdot",
};

/**
 * The style of series `index` of `count` line series: the series' own `style` laid over
 * the style its order gives (solid or dashed with dots for one or two series); null for
 * the plain one- or two-series look when the series sets none.
 */
export function lineStyle(
  index: number,
  count: number,
  own?: Extract<Part, { kind: "series" }>["style"]
): LineStyle | null {
  const base: LineStyle | null =
    count >= STYLED_FROM ? LINE_STYLES[index % LINE_STYLES.length] : null;
  if (!own) return base;
  const plain: LineStyle = {
    weight: index % 2 ? "dashed" : "line",
    marker: "dot",
    fill: "solid",
  };
  const from = base ?? plain;
  return {
    weight: own.line ? WEIGHTS[own.line] : from.weight,
    marker: own.marker ?? from.marker,
    fill: own.fill ?? from.fill,
    ...(own.muted ? { muted: true } : {}),
  };
}

/** The role a style's line is drawn in. */
export const lineRole = (style: LineStyle | null): Role => (style?.muted ? "ink-muted" : "ink");

const FILLS: Record<MarkerFill, Role> = { solid: "ink", open: "paper", shaded: "ink-muted" };

/**
 * A marker centred on (X, Y), in role ink: filled solid, with the paper role (open), or
 * with the muted role (shaded). Null for no marker; a plain dot for "dot".
 */
export function marker(X: number, Y: number, style: LineStyle, partId: string): SceneItem | null {
  if (style.marker === "none") return null;
  const s = HOUSE.markerSize;
  const p = (pts: [number, number][]) =>
    `${pts.map(([x, y], i) => `${i ? "L" : "M"}${fmt(X + x)} ${fmt(Y + y)}`).join(" ")} Z`;
  let d: string;
  if (style.marker === "dot") {
    const r = HOUSE.pointRadius;
    d = `M${fmt(X - r)} ${fmt(Y)} A${r} ${r} 0 1 0 ${fmt(X + r)} ${fmt(Y)} A${r} ${r} 0 1 0 ${fmt(X - r)} ${fmt(Y)} Z`;
  } else if (style.marker === "star") {
    // A four-pointed star, as Bluebook marks a series: long points, a narrow waist.
    const o = 1.35 * s;
    const i = 0.35 * s;
    d = p([
      [0, -o],
      [i, -i],
      [o, 0],
      [i, i],
      [0, o],
      [-i, i],
      [-o, 0],
      [-i, -i],
    ]);
  } else if (style.marker === "triangle") {
    d = p([
      [0, -1.15 * s],
      [s, 0.75 * s],
      [-s, 0.75 * s],
    ]);
  } else if (style.marker === "square") {
    const h = 0.85 * s;
    d = p([
      [-h, -h],
      [h, -h],
      [h, h],
      [-h, h],
    ]);
  } else if (style.marker === "diamond") {
    d = p([
      [0, -1.2 * s],
      [s, 0],
      [0, 1.2 * s],
      [-s, 0],
    ]);
  } else {
    const r = 0.9 * s;
    d = `M${fmt(X - r)} ${fmt(Y)} A${r} ${r} 0 1 0 ${fmt(X + r)} ${fmt(Y)} A${r} ${r} 0 1 0 ${fmt(X - r)} ${fmt(Y)} Z`;
  }
  return { t: "path", d, role: "ink", weight: "line", fill: FILLS[style.fill], partId };
}

/** Width of a styled legend swatch: long enough to show the pattern on both sides of the marker. */
export const STYLED_SWATCH = 30;
