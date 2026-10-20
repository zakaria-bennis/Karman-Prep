// Placement of coordinate labels (POI-TRACE-17, GP-38): each label goes diagonally off its dot into
// the quadrant with the least curve under it, never over another label and inside the graph when
// it can; the box touches the 10 px dot corner to corner, 5 px off its centre on each axis. Box
// sizes are estimated from the label (GP-37): the 20.24 px math serif, 4 px side padding and a
// 1 px border, 42.27 px tall (taller with a fraction), plus the export button.

import type { FormattedCoordinate, FormattedLabel } from "@/lib/calculator/poi/format";

export type Quadrant = "ne" | "nw" | "se" | "sw";
export interface PlacedLabel {
  left: number;
  top: number;
  quadrant: Quadrant;
}

export const LABEL_OFFSET_PX = 5;
const EM = 20.24; // the label's math size (GP-37)
const CHROME_PX = 10; // 4 px side padding and a 1 px border each side
const HEIGHT_PX = 42.27;
const FRACTION_EXTRA_PX = 19;
const EXPORT_PX = 25.6; // POI-TRACE-18's button
const ORDER: readonly Quadrant[] = ["ne", "nw", "se", "sw"];
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
  }
}

/** GP-37: the label box's size for `label`, with room for the export button when it shows. */
export function labelBoxSize(
  label: FormattedLabel,
  withButton: boolean
): { width: number; height: number } {
  const em = 1.1 + coordinateEm(label.x) + 0.5 + coordinateEm(label.y);
  const fraction = [label.x, label.y].some((c) => c.parts.kind === "pi" && c.parts.d !== 1);
  return {
    width: CHROME_PX + em * EM + (withButton ? EXPORT_PX : 0),
    height: HEIGHT_PX + (fraction ? FRACTION_EXTRA_PX : 0),
  };
}

type Box = { left: number; top: number; width: number; height: number };
const overlaps = (a: Box, b: Box) =>
  a.left < b.left + b.width &&
  b.left < a.left + a.width &&
  a.top < b.top + b.height &&
  b.top < a.top + a.height;

function boxAt(x: number, y: number, q: Quadrant, size: { width: number; height: number }): Box {
  const left = q.endsWith("e") ? x + LABEL_OFFSET_PX : x - LABEL_OFFSET_PX - size.width;
  const top = q.startsWith("n") ? y - LABEL_OFFSET_PX - size.height : y + LABEL_OFFSET_PX;
  return { left, top, ...size };
}

/** Places labels in order; `curve` holds the selected curve's vertices in px. */
export function placeLabels(
  labels: readonly { x: number; y: number; width: number; height: number }[],
  curve: readonly (readonly [number, number])[],
  graph: { width: number; height: number }
): PlacedLabel[] {
  const placed: Box[] = [];
  return labels.map(({ x, y, width, height }) => {
    const size = { width, height };
    let best: { box: Box; q: Quadrant; score: number } | null = null;
    for (const q of ORDER) {
      const box = boxAt(x, y, q, size);
      const outside =
        box.left < 0 ||
        box.top < 0 ||
        box.left + box.width > graph.width ||
        box.top + box.height > graph.height;
      let score = (outside ? 1000 : 0) + placed.filter((p) => overlaps(p, box)).length * 100;
      for (const [cx, cy] of curve) {
        if (
          cx >= box.left &&
          cx <= box.left + box.width &&
          cy >= box.top &&
          cy <= box.top + box.height
        )
          score += 1;
      }
      if (best === null || score < best.score) best = { box, q, score };
    }
    placed.push(best!.box);
    return { left: best!.box.left, top: best!.box.top, quadrant: best!.q };
  });
}
