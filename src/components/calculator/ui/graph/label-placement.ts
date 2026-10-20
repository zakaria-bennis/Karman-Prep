// Placement of coordinate labels (POI-19): each label goes diagonally off its dot into the
// quadrant with the least curve under it, never over another label and inside the graph when it
// can. Box sizes follow the label (GP-37): a 20.24 px math serif at about 10 px a character,
// 4 px side padding and a 1 px border, 42.27 px tall; GP-38: the box touches the 10 px dot
// corner to corner, 5 px off its centre on each axis.

export type Quadrant = "ne" | "nw" | "se" | "sw";
export interface PlacedLabel {
  left: number;
  top: number;
  quadrant: Quadrant;
}

export const LABEL_OFFSET_PX = 5;
const CHAR_PX = 10;
const PAD_PX = 10;
const HEIGHT_PX = 42.27;
const ORDER: readonly Quadrant[] = ["ne", "nw", "se", "sw"];

export function labelBoxSize(text: string): { width: number; height: number } {
  return { width: PAD_PX + CHAR_PX * text.length, height: HEIGHT_PX };
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
  labels: readonly { x: number; y: number; text: string }[],
  curve: readonly (readonly [number, number])[],
  graph: { width: number; height: number }
): PlacedLabel[] {
  const placed: Box[] = [];
  return labels.map(({ x, y, text }) => {
    const size = labelBoxSize(text);
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
