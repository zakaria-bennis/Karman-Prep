/**
 * Free-standing text a figure prints apart from its labels' placement search:
 * the "Note: Figure not drawn to scale." under a shape, solid or coordinate
 * plane, and a label set at a `text` part's spot (a region's name such as
 * "pool", the quadrant names I to IV, a point's "(8, 0)" where the original
 * prints it).
 */
import { HOUSE } from "./house";
import { textWidth } from "./labels";
import type { SceneItem } from "./scene";
import type { FigureSpec } from "./spec";

type Box = { width: number; height: number };
type TextItem = Extract<SceneItem, { t: "text" }>;

export const NOT_TO_SCALE = "Note: Figure not drawn to scale.";
/** The note printed once under several figures (a list, or figures side by side in one). */
export const NOT_TO_SCALE_PLURAL = "Note: Figures not drawn to scale.";

/** Height of one line of figure text. */
const LINE = 1.25 * HOUSE.font;

/**
 * The note as one line, or as two broken at the space nearest the middle
 * when one line would not fit the box less the margin. Joined with one
 * space, the lines are always exactly the note: NOT_TO_SCALE, or
 * NOT_TO_SCALE_PLURAL when `which` is "figures".
 */
export function noteLines(width: number, which: true | "figures" = true): string[] {
  const note = which === "figures" ? NOT_TO_SCALE_PLURAL : NOT_TO_SCALE;
  if (textWidth(note) <= width - 2 * HOUSE.margin) return [note];
  const mid = note.length / 2;
  let cut = -1;
  for (let i = 0; i < note.length; i++) {
    if (note[i] === " " && (cut < 0 || Math.abs(i - mid) < Math.abs(cut - mid))) cut = i;
  }
  return [note.slice(0, cut), note.slice(cut + 1)];
}

/**
 * The lines printed at the foot of a shape, solid or plane in a box `width` wide: its
 * caption, then its note; none when the spec asks for neither.
 */
export const specNote = (spec: FigureSpec, width: number): string[] => [
  ...(spec.caption?.trim() ? [spec.caption.trim()] : []),
  ...(spec.notToScale ? noteLines(width, spec.notToScale) : []),
];

/** The band the note's lines take at the foot of the box, gap above included. */
export const noteBand = (lines: string[]): number =>
  lines.length ? lines.length * LINE + HOUSE.labelOffset : 0;

/** The note's text items: the last line just above the box's bottom edge, earlier lines above it. */
export function noteItems(lines: string[], box: Box): SceneItem[] {
  return lines.map((text, i) => ({
    t: "text",
    x: box.width / 2,
    y: box.height - HOUSE.margin / 2 - (lines.length - 1 - i) * LINE,
    text,
    role: "ink",
    anchor: "middle",
  }));
}

/**
 * The labels on the spec's `text` parts, each centered on its part's spot, which
 * `toPx` maps to the box. They are set where the author put them, not searched for;
 * the checks still report one that meets a line or another text.
 */
export function freeTexts(spec: FigureSpec, toPx: (p: [number, number]) => [number, number]) {
  const spots = new Map<string, [number, number]>();
  for (const p of spec.parts) if (p.kind === "text") spots.set(p.id, [p.x, p.y]);
  const items: TextItem[] = [];
  for (const label of spec.labels) {
    const at = spots.get(label.on);
    if (!at || !label.text.trim()) continue;
    const [X, Y] = toPx(at);
    // The text box is 1.25 font tall with its baseline 0.25 font above the bottom.
    items.push({
      t: "text",
      x: X,
      y: Y + LINE / 2 - 0.25 * HOUSE.font,
      text: label.text,
      role: "ink",
      anchor: "middle",
      partId: label.on,
    });
  }
  return items;
}
