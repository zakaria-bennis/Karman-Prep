/*
 * The pictures behind the Library's course choice, composed from Karman's painting primitives
 * (studio.ts) and the subject motifs, in the day's light and hue. painterly.ts then paints
 * them in as brushwork, so they sit in the same world as the backdrop.
 *
 * - "math" / "reading-writing": a tall window onto each subject's landscape.
 * - "split": one wide landscape holding both, the bridge on the left, the book on the right,
 *   the book's stream running into the bridge's lake.
 * - "math-object" / "reading-object": the subject as objects on a shelf, with a silhouette mask.
 * - "shelf": the board they stand on.
 */
import { LIGHT, type TimeOfDay } from "../light";
import { ctx2d, makeCanvas, vnoise, type Color } from "../noise";
import { Studio } from "../studio";
import type { Item } from "../life/types";
import { bridge, hslColor, openBook, spineTop, type BookAt, type BridgeAt } from "./motifs";
import { mathObjects, readingObjects, shelfBoard } from "./objects";

export type SubjectArt =
  | "math"
  | "reading-writing"
  | "split"
  | "math-object"
  | "reading-object"
  | "shelf";

export interface SubjectPicture {
  src: HTMLCanvasElement;
  /** White where the painting shows, transparent elsewhere (objects only). */
  mask: HTMLCanvasElement | null;
  /** What lives in the picture once it is painted, in picture units. */
  life: Item[];
}

export interface Tint {
  hue: number;
  sat: number;
}

const FLOWERS = ["#f4e3a0", "#e8a0b8", "#ffffff", "#c8a0e0"];
const SEED = 4242;

const item = (kind: string, ...a: number[]): Item => ({ kind, a, parts: [], clock: 0 });

/** The sky's own life: birds by day, stars and a shooting star by night. */
function skyLife(horizon: number, birds: [number, number]): Item[] {
  const stars: Item = item("stars", 0, horizon);
  stars.parts = Array.from({ length: 46 }, () => ({
    u: Math.random(),
    v: Math.random() * horizon * 0.9,
    p: Math.random() * 6.28,
    s: 0.6 + Math.random() * 1.2,
  }));
  return [item("birds", ...birds), stars, item("shootingStar")];
}

function studio(w: number, h: number, time: TimeOfDay, sunAt: [number, number]) {
  const L = LIGHT[time] ?? LIGHT.day;
  return new Studio(w, h, { ...L, sunAt }, SEED);
}

function mathWindow(k: Studio, accent: Color): Item[] {
  const water = 0.615;
  const at: BridgeAt = { cx: 0.5, span: 0.8, base: water, rise: 0.12 };
  k.sky(water);
  k.clouds(3, 0.06, 0.34);
  k.sun(0.06);
  k.range({ base: water, top: 0.42, amp: 0.12, s: 5, far: 0.55 });
  k.range({ base: water + 0.005, top: 0.5, amp: 0.07, freq: 3, s: 9, far: 0.15, snow: 0.25 });
  k.mist(water - 0.03, 0.03);
  k.forest(water, { height: 0.025, density: 1.4, far: 0.3 });
  bridge(k, at, accent);
  k.lake(water);
  k.hill(1.02, 0.1, 1.6, 4, "#5d7f40", "#2f4426", 0, 0.3);
  k.hill(1.02, 0.12, 1.6, 7, "#5d7f40", "#2f4426", 0.74, 1);
  k.grass(0.93, 0, 0.28);
  k.grass(0.92, 0.76, 1);
  k.pine(0.07, 1.0, 0.34);
  k.pine(0.93, 0.99, 0.27);
  k.rock(0.28, 0.98, 0.022);
  return [
    ...skyLife(water, [0.34, 0.44]),
    item("glints", 0.15, 0.85, water + 0.02, 0.9),
    item("rings", 0.2, 0.8, water + 0.05, 0.88),
    item("ducks", 0.25, 0.75, water + 0.1, 0.86),
    item("moonpath", 0.72, water + 0.01, 0.88),
    item("arcLight", at.cx, at.span, at.base, at.rise),
  ];
}

function readingWindow(k: Studio, accent: Color): Item[] {
  const horizon = 0.5;
  const book: BookAt = { cx: 0.5, by: 0.93, bw: 0.45, ph: 0.13 };
  k.sky(horizon);
  k.clouds(3, 0.05, 0.3);
  k.sun(0.05);
  k.range({ base: horizon, top: 0.36, amp: 0.1, s: 13, far: 0.6 });
  k.hill(0.57, 0.07, 2.5, 4, "#7a9a52", "#4a6a36");
  k.forest(0.56, { kind: "round", height: 0.035, density: 1.1, far: 0.25 });
  k.ground(0.6, "#6f9a48", "#557f3a");
  k.river([[0.62, 0.6], [0.42, 0.65], [0.6, 0.72], [0.47, 0.77], spineTop(book)], 0.004, 0.02);
  k.flowers(0.63, 0, 1, 60, FLOWERS);
  k.tree(0.12, 0.76, 0.22, ["#4f7a35", "#7aa04a"]);
  k.tree(0.9, 0.7, 0.15, ["#5b8a3a", "#8ab050"]);
  openBook(k, book, accent, FLOWERS);
  k.grass(0.95, 0, 0.12);
  k.grass(0.95, 0.88, 1);
  return [
    ...skyLife(horizon, [0.47, 0.52]),
    item("butterflies", 0.15, 0.85, 0.62, 0.78),
    item("swallows", 0.2, 1, 0.5, 0.66),
    item("fireflies", 0.05, 0.95, 0.6, 0.86),
    item("petals", book.cx - book.bw * 0.9, book.cx + book.bw * 0.9, book.by - book.ph * 1.1, 0.4),
  ];
}

function splitScene(k: Studio, accent: Color): Item[] {
  const water = 0.6;
  const at: BridgeAt = { cx: 0.25, span: 0.4, base: water, rise: 0.11 };
  const book: BookAt = { cx: 0.76, by: 0.93, bw: 0.2, ph: 0.12 };
  const { g, W, H } = k;
  k.sky(water - 0.04);
  k.clouds(4, 0.05, 0.3);
  k.sun(0.045);
  k.range({ base: water - 0.04, top: 0.38, amp: 0.12, s: 21, far: 0.55 });
  k.range({ base: water, top: 0.47, amp: 0.07, freq: 3, s: 4, far: 0.2, snow: 0.2, x1: 0.56 });
  k.hill(water - 0.01, 0.06, 2.5, 6, "#7a9a52", "#4a6a36", 0.5, 1);
  k.mist(water - 0.04, 0.03);
  k.forest(water, { height: 0.025, from: 0, to: 0.5, density: 1.4, far: 0.3 });
  k.forest(water - 0.015, { kind: "round", height: 0.03, from: 0.52, to: 1, far: 0.25 });
  bridge(k, at, accent);
  k.lake(water);
  /* The meadow on the right comes down to the lake in a soft shore. */
  g.save();
  g.beginPath();
  g.moveTo(W * 0.46, H);
  g.bezierCurveTo(W * 0.5, H * 0.8, W * 0.5, H * (water + 0.04), W * 0.6, H * (water + 0.01));
  g.lineTo(W, H * (water - 0.005));
  g.lineTo(W, H);
  g.closePath();
  g.clip();
  k.ground(water - 0.02, "#6f9a48", "#557f3a");
  g.restore();
  k.river([spineTop(book), [0.68, 0.75], [0.6, 0.7], [0.52, 0.65]], 0.022, 0.007);
  k.flowers(0.66, 0.56, 1, 50, FLOWERS);
  k.tree(0.95, 0.72, 0.16, ["#4f7a35", "#7aa04a"]);
  k.hill(1.02, 0.1, 1.6, 4, "#5d7f40", "#2f4426", 0, 0.18);
  k.pine(0.04, 1.0, 0.3);
  k.rock(0.4, 0.97, 0.025);
  openBook(k, book, accent, FLOWERS);
  return [
    ...skyLife(water - 0.04, [0.44, 0.5]),
    item("glints", 0.06, 0.48, water + 0.02, 0.9),
    item("rings", 0.1, 0.42, water + 0.05, 0.85),
    item("moonpath", 0.5, water + 0.01, 0.8),
    item("arcLight", at.cx, at.span, at.base, at.rise),
    item("butterflies", 0.58, 0.95, 0.64, 0.78),
    item("fireflies", 0.55, 0.98, 0.62, 0.86),
    item("petals", book.cx - book.bw * 0.9, book.cx + book.bw * 0.9, book.by - book.ph * 1.1, 0.4),
  ];
}

/** Renders an object scene and its silhouette. */
function objectScene(
  w: number,
  h: number,
  time: TimeOfDay,
  accent: Color,
  draw: typeof mathObjects
): SubjectPicture {
  const k = studio(w, h, time, [0.15, 0.1]);
  /* The ground color under the strokes: the object's own middle tone, so brush edges blend. */
  k.g.fillStyle = `rgb(${accent.map((v) => Math.round(v * 0.75)).join(",")})`;
  k.g.fillRect(0, 0, w, h);
  draw(k, accent, false);
  const m = studio(w, h, time, [0.15, 0.1]);
  draw(m, accent, true);
  return { src: k.c, mask: roughEdge(m.c), life: [] };
}

/**
 * A silhouette with a painted edge: softened, then cut along a noisy threshold, so the outline
 * wanders like the end of a brush stroke instead of a clean vector line.
 */
function roughEdge(sil: HTMLCanvasElement): HTMLCanvasElement {
  const { width: w, height: h } = sil;
  /* Soften by drawing small and back up (works in every browser, unlike canvas filters). */
  const small = makeCanvas(Math.max(1, Math.round(w / 4)), Math.max(1, Math.round(h / 4)));
  ctx2d(small).drawImage(sil, 0, 0, small.width, small.height);
  const out = makeCanvas(w, h);
  const g = ctx2d(out);
  g.imageSmoothingQuality = "high";
  g.drawImage(small, 0, 0, w, h);
  g.globalAlpha = 0.6;
  g.drawImage(sil, 0, 0);
  g.globalAlpha = 1;
  const img = g.getImageData(0, 0, w, h);
  const d = img.data;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (x + y * w) * 4;
      const a = d[i + 3] / 255;
      const cut =
        0.38 + (vnoise(x / 2.6, y / 7, 17) - 0.5) * 0.5 + (vnoise(x / 9, y / 9, 23) - 0.5) * 0.25;
      const t = Math.max(0, Math.min(1, (a - cut) / 0.16 + 0.5));
      d[i] = d[i + 1] = d[i + 2] = 255;
      d[i + 3] = Math.round(t * t * (3 - 2 * t) * 255);
    }
  }
  g.putImageData(img, 0, 0);
  return out;
}

/** Composes a subject picture at aspect (height over width). */
export function renderSubject(
  art: SubjectArt,
  time: TimeOfDay,
  tint: Tint,
  aspect: number
): SubjectPicture {
  const accent = hslColor(tint.hue, Math.max(40, tint.sat), 46);
  if (art === "math-object" || art === "reading-object") {
    const w = 360;
    return objectScene(
      w,
      Math.round(w * aspect),
      time,
      accent,
      art === "math-object" ? mathObjects : readingObjects
    );
  }
  if (art === "shelf") {
    const k = studio(600, Math.max(24, Math.round(600 * aspect)), time, [0.2, 0.1]);
    shelfBoard(k);
    return { src: k.c, mask: null, life: [] };
  }
  const w = art === "split" ? 640 : 480;
  const h = Math.round(w * aspect);
  const sun: Record<string, [number, number]> = {
    math: [0.74, 0.38],
    "reading-writing": [0.76, 0.43],
    split: [0.5, 0.44],
  };
  const k = studio(w, h, time, sun[art]);
  const life =
    art === "math"
      ? mathWindow(k, accent)
      : art === "reading-writing"
        ? readingWindow(k, accent)
        : splitScene(k, accent);
  return { src: k.c, mask: null, life };
}
