/**
 * Label placement: the one routine builders use to put text next to a point
 * so it never overlaps another label or a line, and never leaves the figure.
 *
 * Collision rules, kept simple on purpose:
 * - Lines are the M/L segments of path items. An A (arc) command is tested by
 *   its chord, start to end point. Grid-weight paths are ignored, since they
 *   cross everything, and so are fills drawn without a stroke (a shaded
 *   region). Rect items are not tested.
 * - Text boxes come from the house advance estimate, not real font metrics.
 */
import { HOUSE } from "./house";
import type { SceneIssue, SceneItem } from "./scene";

export type PendingLabel = {
  text: string;
  /** The point the label belongs to. */
  anchor: { x: number; y: number };
  /** Preferred side, as a direction from the anchor (any length). */
  preferred: { dx: number; dy: number };
  partId: string;
  /** When given, a spot counts only if its box [left, right, top, bottom] passes (inside a region). */
  within?: (box: [number, number, number, number]) => boolean;
};

type Box = { width: number; height: number };
/** [left, right, top, bottom] */
type Rect = [number, number, number, number];
type Seg = [number, number, number, number];
type TextItem = Extract<SceneItem, { t: "text" }>;

/**
 * Characters narrower than the house advance in the figure serif (STIX Two
 * Text): each is counted at NARROW_EM, every other at HOUSE.charWidthEm, so the
 * estimate is never under a real advance. Digits are tabular (0.5em), so "1"
 * is not narrow; the hyphen that writes a negative number (0.33em) is.
 */
const NARROW = new Set("il.,'|-");
const NARROW_EM = 0.35;
const ANGLE_STEPS = 8;
const DISTANCE_FACTORS = [1, 1.8, 2.6];
/** Clear space kept between a label box and another label or a line. */
const GAP = 1.5;

/** Estimated advance width of `text` in px: the one text-width estimate every builder uses. */
export function textWidth(text: string): number {
  let em = 0;
  for (const ch of text) em += NARROW.has(ch) ? NARROW_EM : HOUSE.charWidthEm;
  return em * HOUSE.font;
}

/** Estimated box [left, right, top, bottom] of a text item. */
export function textBox(t: TextItem): Rect {
  const w = textWidth(t.text);
  const x0 = t.anchor === "start" ? t.x : t.anchor === "middle" ? t.x - w / 2 : t.x - w;
  // Cap height above the baseline, a descender's room below it.
  return [x0, x0 + w, t.y - HOUSE.font, t.y + 0.25 * HOUSE.font];
}

/** M/L segments of an SVG path; arcs contribute their chord. */
function segments(d: string): Seg[] {
  const out: Seg[] = [];
  const re = /([MLAZmlaz])([^MLAZmlaz]*)/g;
  let cx = 0;
  let cy = 0;
  let sx = 0;
  let sy = 0;
  for (const m of d.matchAll(re)) {
    const cmd = m[1].toUpperCase();
    const n = (m[2].match(/-?\d*\.?\d+(?:e[-+]?\d+)?/gi) ?? []).map(Number);
    if (cmd === "Z") {
      if (cx !== sx || cy !== sy) out.push([cx, cy, sx, sy]);
      cx = sx;
      cy = sy;
    } else if (cmd === "M" || cmd === "L") {
      for (let i = 0; i + 1 < n.length; i += 2) {
        if (cmd === "L" || i > 0) out.push([cx, cy, n[i], n[i + 1]]);
        else {
          sx = n[i];
          sy = n[i + 1];
        }
        cx = n[i];
        cy = n[i + 1];
      }
    } else if (cmd === "A") {
      for (let i = 0; i + 6 < n.length; i += 7) {
        out.push([cx, cy, n[i + 5], n[i + 6]]);
        cx = n[i + 5];
        cy = n[i + 6];
      }
    }
  }
  return out;
}

/** Does the segment touch the (padded) rect? Liang-Barsky clipping. */
function segHitsRect([x0, y0, x1, y1]: Seg, [l, r, t, b]: Rect): boolean {
  let lo = 0;
  let hi = 1;
  const dx = x1 - x0;
  const dy = y1 - y0;
  const checks: [number, number][] = [
    [-dx, x0 - l],
    [dx, r - x0],
    [-dy, y0 - t],
    [dy, b - y0],
  ];
  for (const [p, q] of checks) {
    if (p === 0) {
      if (q < 0) return false;
    } else {
      const u = q / p;
      if (p < 0) lo = Math.max(lo, u);
      else hi = Math.min(hi, u);
      if (lo > hi) return false;
    }
  }
  return true;
}

const clamp = (v: number, lo: number, hi: number) => (lo > hi ? lo : Math.min(hi, Math.max(lo, v)));

const pad = ([l, r, t, b]: Rect, g: number): Rect => [l - g, r + g, t - g, b + g];

const rectsOverlap = (a: Rect, b: Rect) => a[0] < b[1] && b[0] < a[1] && a[2] < b[3] && b[2] < a[3];

/**
 * Place each label beside its anchor. Candidates go through 3 distances and
 * 8 angles starting at the preferred side; the first spot clear of lines,
 * other labels and the figure edge wins. A label with no free spot is left
 * out and reported as a `label_collision` issue.
 */
export function placeLabels(
  items: SceneItem[],
  labels: PendingLabel[],
  box: Box
): { items: SceneItem[]; issues: SceneIssue[] } {
  const lines = items.flatMap((i) =>
    i.t === "path" && i.weight !== "grid" && i.stroke !== false ? segments(i.d) : []
  );
  const taken: Rect[] = items.filter((i): i is TextItem => i.t === "text").map(textBox);
  const placed: SceneItem[] = [];
  const issues: SceneIssue[] = [];

  for (const label of labels) {
    const len = Math.hypot(label.preferred.dx, label.preferred.dy) || 1;
    const base = Math.atan2(label.preferred.dy / len, label.preferred.dx / len);
    const w = textWidth(label.text);
    const hw = w / 2;
    const hh = (1.25 * HOUSE.font) / 2;
    let found: TextItem | null = null;

    search: for (const factor of DISTANCE_FACTORS) {
      for (let k = 0; k < ANGLE_STEPS; k++) {
        // 0, +45, -45, +90, -90, +135, -135, 180 degrees from the preferred side.
        const step = k === 0 ? 0 : Math.ceil(k / 2) * (k % 2 === 1 ? 1 : -1);
        const a = base + (step * 2 * Math.PI) / ANGLE_STEPS;
        const ux = Math.cos(a);
        const uy = Math.sin(a);
        // The ray from the anchor runs through the box center and enters the
        // box at exactly the offset distance.
        const inside = Math.min(
          Math.abs(ux) < 1e-9 ? Infinity : hw / Math.abs(ux),
          Math.abs(uy) < 1e-9 ? Infinity : hh / Math.abs(uy)
        );
        const dist = HOUSE.labelOffset * factor + inside;
        // Near an edge the box slides inward rather than leaving the figure.
        const cx = clamp(label.anchor.x + ux * dist, hw, box.width - hw);
        const cy = clamp(label.anchor.y + uy * dist, hh, box.height - hh);
        const item: TextItem = {
          t: "text",
          x: cx,
          y: cy + hh - 0.25 * HOUSE.font,
          text: label.text,
          role: "ink",
          anchor: "middle",
          partId: label.partId,
        };
        const r = textBox(item);
        if (r[0] < 0 || r[1] > box.width || r[2] < 0 || r[3] > box.height) continue;
        const padded = pad(r, GAP);
        if (
          label.anchor.x > padded[0] &&
          label.anchor.x < padded[1] &&
          label.anchor.y > padded[2] &&
          label.anchor.y < padded[3]
        )
          continue;
        if (taken.some((o) => rectsOverlap(padded, o))) continue;
        if (label.within && !label.within(r)) continue;
        if (lines.some((s) => segHitsRect(s, padded))) continue;
        found = item;
        break search;
      }
    }

    if (found) {
      placed.push(found);
      taken.push(textBox(found));
    } else {
      issues.push({
        code: "label_collision",
        partId: label.partId,
        detail: `No free spot for label "${label.text}"; it was left out.`,
      });
    }
  }
  return { items: [...items, ...placed], issues };
}
