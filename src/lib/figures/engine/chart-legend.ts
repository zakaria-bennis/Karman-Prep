/**
 * A chart's legend: a swatch and the series name for each named series, packed in
 * rows below the plot and wrapped when a name is wider than the figure. Bars show
 * their fill, line series their pattern and marker, other series their dot.
 */
import { LINE_HEIGHT, wrapText } from "./axis-names";
import { HOUSE } from "./house";
import { textWidth } from "./labels";
import { lineRole, marker, STYLED_SWATCH, type LineStyle } from "./line-styles";
import { dotAt } from "./plane";
import { fmt } from "./plane-axes";
import type { Role, SceneItem } from "./scene";
import type { ChartKind } from "./spec-types";

/** Opaque fills, one per series in turn: grid lines never show through. */
export const FILLS: Role[] = ["ink-muted", "ink", "highlight"];
const SWATCH = 12;

export const seg = (x1: number, y1: number, x2: number, y2: number) =>
  `M${fmt(x1)} ${fmt(y1)} L${fmt(x2)} ${fmt(y2)}`;

export type LegendEntry = {
  id: string;
  name: string;
  kind: ChartKind;
  index: number;
  /** A line series' own pattern and marker, when the chart has three or more. */
  style?: LineStyle | null;
  /** The name as drawn: one line, or wrapped when it is wider than the figure (a phone). */
  lines?: string[];
};

/** Legend rows packed within `width`: each entry is a swatch and its series name. */
export function legendRows(entries: LegendEntry[], width: number): LegendEntry[][] {
  const rows: LegendEntry[][] = [];
  let used = 0;
  for (const entry of entries) {
    // A name too wide for the figure wraps beside its swatch.
    const room = width - swatchWidth(entry) - 4 * HOUSE.labelOffset;
    const e = { ...entry, lines: wrapText(entry.name, room) };
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

const swatchWidth = (e: LegendEntry) => (e.style ? STYLED_SWATCH : SWATCH);

const nameLines = (e: LegendEntry) => e.lines ?? [e.name];

const legendWidth = (e: LegendEntry) =>
  swatchWidth(e) +
  HOUSE.labelOffset +
  Math.max(...nameLines(e).map(textWidth)) +
  3 * HOUSE.labelOffset;

/** Text lines in each legend row: its most wrapped name. */
const rowLines = (row: LegendEntry[]) => Math.max(...row.map((e) => nameLines(e).length));

/** The legend's height: its text lines, with room above and below. */
export const legendHeight = (rows: LegendEntry[][]) =>
  rows.length
    ? rows.reduce((sum, row) => sum + rowLines(row), 0) * LINE_HEIGHT + 2 * HOUSE.labelOffset
    : 0;

export function legendItems(rows: LegendEntry[][], width: number, top: number): SceneItem[] {
  const items: SceneItem[] = [];
  const off = HOUSE.labelOffset;
  let before = 0; // text lines in the rows above
  rows.forEach((row) => {
    const rowW = row.reduce((sum, e) => sum + legendWidth(e), 0) - 2 * off;
    let x = (width - rowW) / 2;
    const y = top + off + HOUSE.font + before * LINE_HEIGHT;
    before += rowLines(row);
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
      } else if (e.kind === "line" && e.style) {
        items.push({
          t: "path",
          d: seg(x, mid, x + STYLED_SWATCH, mid),
          role: lineRole(e.style),
          weight: e.style.weight,
          partId: "legend",
        });
        const m = marker(x + STYLED_SWATCH / 2, mid, e.style, "legend");
        if (m) items.push(m);
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
      nameLines(e).forEach((text, k) => {
        items.push({
          t: "text",
          x: x + swatchWidth(e) + off,
          y: y + k * LINE_HEIGHT,
          text,
          role: "ink",
          anchor: "start",
          partId: "legend",
        });
      });
      x += legendWidth(e);
    }
  });
  return items;
}
