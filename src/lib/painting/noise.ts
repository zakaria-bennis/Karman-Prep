/*
 * Small, deterministic helpers shared by Karman's paintings: value noise, fractal noise,
 * a seeded random generator, and color math on [r, g, b] arrays.
 * Ported from prototypes/today-directions/landscapes.js (founder approved, 2026-11-08).
 */

export type Color = number[];

export const hash = (x: number, y: number, s: number): number => {
  let h = (x * 374761393 + y * 668265263 + s * 982451653) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};

const smooth = (t: number) => t * t * (3 - 2 * t);

export function vnoise(x: number, y: number, s: number): number {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = smooth(x - xi);
  const yf = smooth(y - yi);
  const a = hash(xi, yi, s);
  const b = hash(xi + 1, yi, s);
  const c = hash(xi, yi + 1, s);
  const d = hash(xi + 1, yi + 1, s);
  return a + (b - a) * xf + (c - a) * yf + (a - b - c + d) * xf * yf;
}

export function fbm(x: number, y: number, s: number, o = 5): number {
  let v = 0;
  let a = 0.5;
  let f = 1;
  for (let i = 0; i < o; i++) {
    v += a * vnoise(x * f, y * f, s + i * 17);
    f *= 2.03;
    a *= 0.5;
  }
  return v;
}

/** A seeded generator, so the same scene always paints the same way. */
export const rng = (seed: number) => () => {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 4294967296;
};

export const hex = (h: string): Color => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
export const mix = (a: Color, b: Color, t: number): Color => a.map((v, i) => v + (b[i] - v) * t);
export const rgb = (c: Color, a = 1) =>
  `rgba(${c.map((v) => Math.max(0, Math.min(255, Math.round(v)))).join(",")},${a})`;

/** A canvas of the given size. Kept in one place so the engine can move to a worker later. */
export function makeCanvas(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return c;
}

export function ctx2d(c: HTMLCanvasElement): CanvasRenderingContext2D {
  const g = c.getContext("2d", { willReadFrequently: true });
  if (!g) throw new Error("Canvas 2D is not available");
  return g;
}
