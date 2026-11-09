/*
 * The Library's two ground scenes, where the camera lands after falling from the sky (sky.ts),
 * composed from Karman's painting primitives (studio.ts) and the subject motifs, in the day's
 * light and hue. painterly.ts then paints them in as brushwork, like the backdrop. Each fills the
 * screen behind the open box. The land takes the hour's light the same way in both (gradeLand),
 * so at night the meadow darkens as much as the lake.
 *
 * - Math: a lake below mountains with one sharp, triangular peak; the parabola bridge across it;
 *   terraced fields climbing beside it like a bar chart; a ring of light around the sun.
 * - Reading and Writing: a meadow under hills; an open book in the grass with the meadow growing
 *   from its pages and a stream running from its spine; a quill in an inkpot; a tree whose leaves
 *   fall as letters.
 */
import { LIGHT, type TimeOfDay } from "../light";
import type { Color } from "../noise";
import { Studio } from "../studio";
import type { Item } from "../life/types";
import {
  bridge,
  gradeLand,
  hslColor,
  openBook,
  quill,
  spineTop,
  sunRing,
  terraceTops,
  terraces,
  type BookAt,
  type BridgeAt,
  type QuillAt,
  type TerraceAt,
} from "./motifs";
import type { Layout, Slug } from "./seam";

export interface Tint {
  hue: number;
  sat: number;
}

/** Where the subject's shapes are, for the hover animations (picture units). */
export interface MathAnchors {
  bridge: BridgeAt;
  terraces: [number, number][];
  sun: [number, number];
  /** The triangular peak and the two shoulders below it. */
  peak: [number, number][];
}

export interface ReadingAnchors {
  book: BookAt;
  tree: [number, number, number];
  quill: QuillAt;
}

export interface LibraryPicture {
  src: HTMLCanvasElement;
  life: Item[];
  math?: MathAnchors;
  reading?: ReadingAnchors;
}

const FLOWERS = ["#f4e3a0", "#e8a0b8", "#ffffff", "#c8a0e0"];
const SEED = 5151;

const item = (kind: string, ...a: number[]): Item => ({ kind, a, parts: [], clock: 0 });

/** The sky's own life: birds by day, stars and a shooting star by night. */
function skyLife(horizon: number, birds: [number, number], u0 = 0, u1 = 1): Item[] {
  const stars: Item = item("stars", 0, horizon);
  stars.parts = Array.from({ length: 60 }, () => ({
    u: u0 + Math.random() * (u1 - u0),
    v: Math.random() * horizon * 0.9,
    p: Math.random() * 6.28,
    s: 0.6 + Math.random() * 1.2,
  }));
  return [item("birds", ...birds), stars, item("shootingStar")];
}

interface MathPlan {
  water: number;
  sun: [number, number];
  bridge: BridgeAt;
  terraces: TerraceAt;
  peak: [number, number];
  pines: [number, number, number][];
}

const MATH: Record<Layout, MathPlan> = {
  wide: {
    water: 0.62,
    sun: [0.545, 0.12],
    bridge: { cx: 0.2, span: 0.255, base: 0.62, rise: 0.1 },
    terraces: { x0: 0.345, x1: 0.47, base: 0.615, steps: [0.035, 0.06, 0.085, 0.11, 0.135] },
    peak: [0.1, 0.33],
    pines: [
      [0.035, 1.0, 0.3],
      [0.94, 0.99, 0.26],
    ],
  },
  tall: {
    water: 0.42,
    sun: [0.82, 0.1],
    bridge: { cx: 0.61, span: 0.5, base: 0.42, rise: 0.06 },
    terraces: { x0: 0.02, x1: 0.32, base: 0.415, steps: [0.014, 0.022, 0.03, 0.038, 0.046] },
    peak: [0.2, 0.27],
    pines: [
      [0.06, 0.62, 0.14],
      [0.95, 0.6, 0.12],
    ],
  },
};

function mathScene(k: Studio, accent: Color, p: MathPlan): { life: Item[]; at: MathAnchors } {
  const { water } = p;
  k.sky(water);
  k.clouds(3, 0.05, 0.28);
  sunRing(k, 0.034);
  k.sun(0.02);
  const shoulder = 0.08;
  k.range({ base: water, top: 0.4, amp: 0.1, s: 5, far: 0.6, peak: [p.peak[0], p.peak[1], 1.25] });
  k.range({ base: water + 0.005, top: water - 0.1, amp: 0.06, freq: 3, s: 9, far: 0.2, snow: 0.2 });
  k.mist(water - 0.03, 0.03);
  k.forest(water, { height: 0.022, density: 1.3, far: 0.3 });
  terraces(k, p.terraces);
  bridge(k, p.bridge, accent);
  k.lake(water);
  k.hill(1.02, 0.08, 1.6, 4, "#5d7f40", "#2f4426", 0, 0.24);
  k.hill(1.02, 0.1, 1.6, 7, "#5d7f40", "#2f4426", 0.78, 1);
  k.grass(0.95, 0, 0.22);
  k.grass(0.94, 0.8, 1);
  for (const [x, y, h] of p.pines) k.pine(x, y, h);
  k.rock(p.bridge.cx + p.bridge.span * 0.62, 0.975, 0.02);
  gradeLand(k, water - 0.12);
  const b = p.bridge;
  return {
    life: [
      ...skyLife(water, [0.3, 0.42]),
      item("glints", 0.05, 0.95, water + 0.02, 0.92),
      item("rings", 0.1, 0.9, water + 0.05, 0.9),
      item("ducks", 0.3, 0.9, water + 0.1, 0.88),
      item("moonpath", p.sun[0], water + 0.01, 0.9),
      item("arcLight", b.cx, b.span, b.base, b.rise),
    ],
    at: {
      bridge: b,
      terraces: terraceTops(p.terraces),
      sun: p.sun,
      peak: [
        [p.peak[0] - shoulder, p.peak[1] + shoulder * 1.25 * 0.9],
        [p.peak[0], p.peak[1]],
        [p.peak[0] + shoulder, p.peak[1] + shoulder * 1.25 * 0.9],
      ],
    },
  };
}

interface ReadingPlan {
  horizon: number;
  sun: [number, number];
  book: BookAt;
  tree: [number, number, number];
  quill: QuillAt;
  river: [number, number][];
}

const READING: Record<Layout, ReadingPlan> = {
  wide: {
    horizon: 0.52,
    sun: [0.545, 0.12],
    book: { cx: 0.77, by: 0.9, bw: 0.15, ph: 0.12 },
    tree: [0.58, 0.8, 0.36],
    quill: { x: 0.91, y: 0.93, h: 0.05 },
    river: [
      [0.7, 0.6],
      [0.62, 0.65],
      [0.7, 0.71],
      [0.66, 0.75],
    ],
  },
  tall: {
    horizon: 0.6,
    sun: [0.82, 0.1],
    book: { cx: 0.52, by: 0.875, bw: 0.3, ph: 0.065 },
    tree: [0.12, 0.84, 0.2],
    quill: { x: 0.88, y: 0.895, h: 0.028 },
    river: [
      [0.6, 0.68],
      [0.42, 0.71],
      [0.58, 0.75],
      [0.48, 0.78],
    ],
  },
};

function readingScene(
  k: Studio,
  accent: Color,
  p: ReadingPlan
): { life: Item[]; at: ReadingAnchors } {
  const { horizon, book } = p;
  k.sky(horizon);
  k.clouds(3, 0.05, 0.3);
  k.sun(0.02);
  k.range({ base: horizon, top: horizon - 0.15, amp: 0.1, s: 13, far: 0.6 });
  k.hill(horizon + 0.06, 0.07, 2.5, 4, "#7a9a52", "#4a6a36");
  k.forest(horizon + 0.05, { kind: "round", height: 0.035, density: 1.1, far: 0.25 });
  k.ground(horizon + 0.08, "#6f9a48", "#557f3a");
  k.river([...p.river, spineTop(book)], 0.004, 0.02);
  k.flowers(horizon + 0.1, 0, 1, 90, FLOWERS);
  k.tree(p.tree[0], p.tree[1], p.tree[2], ["#4f7a35", "#7aa04a", "#9ab85a"]);
  k.bush(0.98, 0.97, 0.05);
  quill(k, p.quill, accent);
  openBook(k, book, accent, FLOWERS);
  k.grass(0.95, 0, 1);
  gradeLand(k, horizon - 0.02);
  const [tx, ty, th] = p.tree;
  return {
    life: [
      ...skyLife(horizon, [0.6, 0.66]),
      item("butterflies", 0.45, 0.98, horizon + 0.1, 0.9),
      item("swallows", 0.3, 1, horizon - 0.05, horizon + 0.1),
      item("fireflies", 0.05, 0.98, horizon + 0.08, 0.95),
      item("petals", book.cx - book.bw * 0.9, book.cx + book.bw * 0.9, book.by - book.ph, 0.4),
      item("letterLeaves", tx, ty - th * 0.72, th * 0.38, th * 0.26),
    ],
    at: { book, tree: p.tree, quill: p.quill },
  };
}

/** Composes one of the two paintings for a screen of this layout and aspect (height / width). */
export function renderLibraryScene(
  slug: Slug,
  layout: Layout,
  time: TimeOfDay,
  tint: Tint,
  aspect: number
): LibraryPicture {
  const accent = hslColor(tint.hue, Math.max(40, tint.sat), 46);
  const w = layout === "wide" ? 760 : 480;
  const h = Math.max(200, Math.round(w * aspect));
  const L = LIGHT[time] ?? LIGHT.day;
  if (slug === "math") {
    const p = MATH[layout];
    const k = new Studio(w, h, { ...L, sunAt: p.sun }, SEED);
    const { life, at } = mathScene(k, accent, p);
    return { src: k.c, life, math: at };
  }
  const p = READING[layout];
  const k = new Studio(w, h, { ...L, sunAt: p.sun }, SEED + 1);
  const { life, at } = readingScene(k, accent, p);
  return { src: k.c, life, reading: at };
}
