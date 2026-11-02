/**
 * How the series of a line chart with three or more series tell themselves
 * apart without color, as Bluebook draws them: each has its own line pattern
 * and its own marker at every data point, and its legend swatch shows both
 * (2024-03_UNSPECIFIED_VA_RW_M1_Q12: solid with filled triangles, dashed with
 * open squares, dotted with open circles; 2023-11_UNSPECIFIED_V1_RW_M1_Q11 adds
 * a fourth). Open markers are filled with the figure's own surface (`paper`),
 * so the line does not show through them. One or two series keep the plain
 * look: solid and dashed, with filled dots.
 */
import { HOUSE } from "./house";
import { fmt } from "./plane-axes";
import type { SceneItem, Weight } from "./scene";

export type MarkerShape = "triangle" | "square" | "circle" | "diamond";
export type LineStyle = { weight: Weight; marker: MarkerShape; open: boolean };

/** Series styles in turn, from the third series on; a seventh series repeats the first. */
export const LINE_STYLES: readonly LineStyle[] = [
  { weight: "line", marker: "triangle", open: false },
  { weight: "dashed", marker: "square", open: true },
  { weight: "dotted", marker: "circle", open: true },
  { weight: "dashdot", marker: "diamond", open: false },
  { weight: "line", marker: "square", open: false },
  { weight: "dashed", marker: "triangle", open: true },
];

/** The fewest line series that get patterns and markers. */
export const STYLED_FROM = 3;

/** The style of series `index` of `count` line series; null for the plain one- or two-series look. */
export function lineStyle(index: number, count: number): LineStyle | null {
  return count >= STYLED_FROM ? LINE_STYLES[index % LINE_STYLES.length] : null;
}

/** A marker centred on (X, Y), in role ink, open ones filled with the paper role. */
export function marker(X: number, Y: number, style: LineStyle, partId: string): SceneItem {
  const s = HOUSE.markerSize;
  const p = (pts: [number, number][]) =>
    `${pts.map(([x, y], i) => `${i ? "L" : "M"}${fmt(X + x)} ${fmt(Y + y)}`).join(" ")} Z`;
  let d: string;
  if (style.marker === "triangle") {
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
  return { t: "path", d, role: "ink", weight: "line", fill: style.open ? "paper" : "ink", partId };
}

/** Width of a styled legend swatch: long enough to show the pattern on both sides of the marker. */
export const STYLED_SWATCH = 30;
