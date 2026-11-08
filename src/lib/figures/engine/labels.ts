/**
 * Label placement: the one routine builders use to put text next to a point
 * so it never overlaps another label or a line, and never leaves the figure.
 *
 * Collision rules, kept simple on purpose:
 * - Lines are the M/L segments of path items. An A (arc) command is tested by
 *   short chords along its curve, so a label never sits on an arc. Grid-weight paths are ignored, since they
 *   cross everything, and so are fills drawn without a stroke (a shaded
 *   region). Rect items are not tested.
 * - Text boxes come from the house advance estimate, not real font metrics,
 *   except between two numbers, which compare by their digits' measured size.
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
  /** A variable (r, h, A) prints in italic. */
  italic?: boolean;
  /** When given, a spot counts only if its box [left, right, top, bottom] passes (inside a region). */
  within?: (box: [number, number, number, number]) => boolean;
};

type Box = { width: number; height: number };
/** [left, right, top, bottom] */
type Rect = [number, number, number, number];
type Seg = [number, number, number, number];
type Pt = [number, number];
type TextItem = Extract<SceneItem, { t: "text" }>;

/**
 * Characters narrower than the house advance in the figure serif (STIX Two
 * Text): each is counted at NARROW_EM, every other at HOUSE.charWidthEm, so the
 * estimate is never under a real advance. Digits are tabular (0.5em), so "1"
 * is not narrow; the hyphen (0.33em) is. The minus sign that writes a negative
 * tick number is wider than the advance and is counted at its own 0.72em.
 */
const NARROW = new Set("il.,'|-");
const NARROW_EM = 0.35;
/** The minus sign (U+2212) is wider than the house advance: 0.72em as the figure font renders it. */
const WIDE: Record<string, number> = { "\u2212": 0.72 };
const ANGLE_STEPS = 8;
const DISTANCE_FACTORS = [1, 1.8, 2.6];
/** Clear space kept between a label box and another label or a line. */
const GAP = 1.5;

/** Estimated advance width of `text` in px: the one text-width estimate every builder uses. */
export function textWidth(text: string): number {
  let em = 0;
  for (const ch of text) em += WIDE[ch] ?? (NARROW.has(ch) ? NARROW_EM : HOUSE.charWidthEm);
  return em * HOUSE.font;
}

/** A number as a tick prints it: digits with an optional minus, thousands commas and a point. */
const NUMBER = /^[\u2212-]?\d[\d,]*(\.\d+)?$/;

/**
 * The width a number really takes: digits at their tabular 0.5em in the figure font
 * (0.495em measured), the minus at 0.72em, comma and point narrow. textWidth stays
 * the generous estimate for every other text.
 */
export function numberWidth(text: string): number {
  let em = 0;
  for (const ch of text) em += ch === "\u2212" ? 0.72 : /\d/.test(ch) ? 0.5 : 0.35;
  return em * HOUSE.font;
}

/** Digits' height above the baseline in the figure font (0.68em measured), rounded up. */
const DIGIT_HEIGHT_EM = 0.7;
/** Clear space two numbers keep around their glyphs. */
const DIGIT_PAD = 1;

/**
 * The glyphs of an upright number: its real width, digit height above the
 * baseline and nothing below (digits have no descender), padded by DIGIT_PAD.
 * Null for any other text, which keeps its generous box.
 */
function digitBox(t: TextItem): Rect | null {
  if (t.rotate || !NUMBER.test(t.text)) return null;
  const w = numberWidth(t.text);
  const x0 = t.anchor === "start" ? t.x : t.anchor === "middle" ? t.x - w / 2 : t.x - w;
  const top = t.y - DIGIT_HEIGHT_EM * HOUSE.font;
  return [x0 - DIGIT_PAD, x0 + w + DIGIT_PAD, top - DIGIT_PAD, t.y + DIGIT_PAD];
}

/** The box [left, right, top, bottom] of a text item before any rotation. */
function uprightBox(t: TextItem): Rect {
  const w = textWidth(t.text);
  const x0 = t.anchor === "start" ? t.x : t.anchor === "middle" ? t.x - w / 2 : t.x - w;
  // Cap height above the baseline, a descender's room below it.
  return [x0, x0 + w, t.y - HOUSE.font, t.y + 0.25 * HOUSE.font];
}

/** p turned `deg` degrees (clockwise on screen, as SVG rotate) about c. */
function turn([x, y]: [number, number], [cx, cy]: [number, number], deg: number) {
  const a = (deg * Math.PI) / 180;
  const [dx, dy] = [x - cx, y - cy];
  return [cx + dx * Math.cos(a) - dy * Math.sin(a), cy + dx * Math.sin(a) + dy * Math.cos(a)];
}

/** The four corners of a text's box as drawn (turned with it). */
function corners(t: TextItem): [number, number][] {
  const b = uprightBox(t);
  const raw: [number, number][] = [
    [b[0], b[2]],
    [b[1], b[2]],
    [b[1], b[3]],
    [b[0], b[3]],
  ];
  return t.rotate ? raw.map((p) => turn(p, [t.x, t.y], t.rotate!) as [number, number]) : raw;
}

/** Separating-axis test for two convex quads: true when some side's normal separates them. */
function separated(p: [number, number][], q: [number, number][]): boolean {
  for (const poly of [p, q]) {
    for (let i = 0; i < poly.length; i++) {
      const [x0, y0] = poly[i];
      const [x1, y1] = poly[(i + 1) % poly.length];
      const n = [y0 - y1, x1 - x0];
      const proj = (pts: [number, number][]) => pts.map(([x, y]) => x * n[0] + y * n[1]);
      const a = proj(p);
      const b = proj(q);
      const len = Math.hypot(n[0], n[1]) || 1;
      // Apart by more than the 1px the overlap checks allow.
      if (Math.min(...a) - Math.max(...b) > -len || Math.min(...b) - Math.max(...a) > -len) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Estimated box [left, right, top, bottom] of a text item on screen: for a
 * rotated text, the upright box around its turned corners.
 */
export function textBox(t: TextItem): Rect {
  const b = uprightBox(t);
  if (!t.rotate) return b;
  const turned = [
    [b[0], b[2]],
    [b[1], b[2]],
    [b[0], b[3]],
    [b[1], b[3]],
  ].map((p) => turn(p as [number, number], [t.x, t.y], t.rotate!));
  const xs = turned.map((p) => p[0]);
  const ys = turned.map((p) => p[1]);
  return [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
}

/**
 * How far two texts overlap, as [width, height] of their shared box (≤ 0: apart).
 * Two upright numbers are compared by their glyphs (digitBox), padded to keep a
 * clear gap; every other pair by the generous text box.
 * Two texts turned by the same angle (a row of slanted category names) are
 * compared in their own turned frame, so their slanted boxes count, not the
 * larger upright boxes around them.
 */
export function textOverlap(a: TextItem, b: TextItem): [number, number] {
  const r = a.rotate ?? 0;
  let ra: Rect;
  let rb: Rect;
  const da = digitBox(a);
  const db = digitBox(b);
  if (da && db) {
    // Two numbers (a y tick label beside an x tick label where the axes meet) are
    // compared by their glyphs, so the corner keeps both, as the SAT prints them.
    ra = da;
    rb = db;
  } else if (r && (b.rotate ?? 0) === r) {
    // Turn b's anchor back into a's frame; both boxes are then upright there.
    const [bx, by] = turn([b.x, b.y], [a.x, a.y], -r);
    ra = uprightBox(a);
    rb = uprightBox({ ...b, x: bx, y: by });
  } else {
    // Texts at different angles: apart when a side of either separates them.
    if ((a.rotate || b.rotate) && separated(corners(a), corners(b))) return [0, 0];
    ra = textBox(a);
    rb = textBox(b);
  }
  return [
    Math.min(ra[1], rb[1]) - Math.max(ra[0], rb[0]),
    Math.min(ra[3], rb[3]) - Math.max(ra[2], rb[2]),
  ];
}

/** Samples along a circular SVG arc (SVG's endpoint-to-center conversion, no rotation). */
export function svgArcPoints(
  a: Pt,
  b: Pt,
  radius: number,
  large: boolean,
  sweep: boolean,
  steps = 16
): Pt[] {
  const hx = (a[0] - b[0]) / 2;
  const hy = (a[1] - b[1]) / 2;
  const h2 = hx * hx + hy * hy;
  if (h2 === 0 || radius <= 0) return [b];
  const r = Math.max(radius, Math.sqrt(h2));
  const k = (large === sweep ? -1 : 1) * Math.sqrt(Math.max(0, (r * r - h2) / h2));
  const c: Pt = [k * hy + (a[0] + b[0]) / 2, -k * hx + (a[1] + b[1]) / 2];
  const t0 = Math.atan2(a[1] - c[1], a[0] - c[0]);
  let span = Math.atan2(b[1] - c[1], b[0] - c[0]) - t0;
  if (sweep && span < 0) span += 2 * Math.PI;
  if (!sweep && span > 0) span -= 2 * Math.PI;
  return Array.from({ length: steps + 1 }, (_, i) => {
    const t = t0 + (span * i) / steps;
    return [c[0] + r * Math.cos(t), c[1] + r * Math.sin(t)] as Pt;
  });
}

/** M/L segments of an SVG path; an arc contributes short chords along its curve. */
export function pathSegments(d: string): Seg[] {
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
        const pts = svgArcPoints(
          [cx, cy],
          [n[i + 5], n[i + 6]],
          n[i],
          n[i + 3] === 1,
          n[i + 4] === 1
        );
        let prev: Pt = [cx, cy];
        for (const p of pts) {
          out.push([prev[0], prev[1], p[0], p[1]]);
          prev = p;
        }
        cx = n[i + 5];
        cy = n[i + 6];
      }
    }
  }
  return out;
}

/** Does the segment touch the (padded) rect? Liang-Barsky clipping. */
export function segHitsRect([x0, y0, x1, y1]: Seg, [l, r, t, b]: Rect): boolean {
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
 * other labels and the figure edge wins. When none is, the label tries the
 * four corners next to the anchor (its box's nearest corner one offset away
 * diagonally, nearest the preferred side first), which clears two lines that
 * cross at the anchor ("(s, t)" below and left of where two boundaries meet).
 * A label with no free spot is left out and reported as a `label_collision` issue.
 */
export function placeLabels(
  items: SceneItem[],
  labels: PendingLabel[],
  box: Box
): { items: SceneItem[]; issues: SceneIssue[] } {
  const lines = items.flatMap((i) =>
    i.t === "path" && i.weight !== "grid" && i.stroke !== false ? pathSegments(i.d) : []
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

    /** The label centred near (x, y), slid inside the box, when that spot is free. */
    const at = (x: number, y: number): TextItem | null => {
      // Near an edge the box slides inward rather than leaving the figure.
      const cx = clamp(x, hw, box.width - hw);
      const cy = clamp(y, hh, box.height - hh);
      const item: TextItem = {
        t: "text",
        x: cx,
        y: cy + hh - 0.25 * HOUSE.font,
        text: label.text,
        role: "ink",
        anchor: "middle",
        partId: label.partId,
      };
      if (label.italic) item.italic = true;
      const r = textBox(item);
      if (r[0] < 0 || r[1] > box.width || r[2] < 0 || r[3] > box.height) return null;
      const padded = pad(r, GAP);
      if (
        label.anchor.x > padded[0] &&
        label.anchor.x < padded[1] &&
        label.anchor.y > padded[2] &&
        label.anchor.y < padded[3]
      )
        return null;
      if (taken.some((o) => rectsOverlap(padded, o))) return null;
      if (label.within && !label.within(r)) return null;
      if (lines.some((sg) => segHitsRect(sg, padded))) return null;
      return item;
    };

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
        found = at(label.anchor.x + ux * dist, label.anchor.y + uy * dist);
        if (found) break search;
      }
    }
    if (!found) {
      const corners = [
        [1, -1],
        [-1, -1],
        [1, 1],
        [-1, 1],
      ].sort(
        (p, q) =>
          Math.abs(angleBetween(Math.atan2(p[1], p[0]), base)) -
          Math.abs(angleBetween(Math.atan2(q[1], q[0]), base))
      );
      corner: for (const factor of DISTANCE_FACTORS) {
        const d = (HOUSE.labelOffset * factor) / Math.SQRT2 + GAP;
        for (const [sx, sy] of corners) {
          found = at(label.anchor.x + sx * (d + hw), label.anchor.y + sy * (d + hh));
          if (found) break corner;
        }
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

/** The signed difference a − b of two angles, in (−π, π]. */
const angleBetween = (a: number, b: number) => Math.atan2(Math.sin(a - b), Math.cos(a - b));
