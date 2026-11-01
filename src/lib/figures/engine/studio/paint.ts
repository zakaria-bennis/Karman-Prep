/**
 * Studio colors and light. Every color is a CSS expression over the theme roles:
 * no typed color ever appears, so a figure follows each theme in light and dark.
 *
 * One key light, upper left and in front, lights every studio figure; a faint
 * rim light from the back right lifts the shadow side off the paper.
 */
import type { V3 } from "../solid-camera";
import type { Pt } from "../marks";
import type { StudioGradient, StudioLayer, StudioShape, StudioStop } from "./types";

export const role = (name: string) => `var(--figure-${name})`;

const num = (n: number) => String(Math.round(n * 1000) / 1000);
const pct = (n: number) => `${Math.round(Math.min(100, Math.max(0, n)) * 10) / 10}%`;

/** A color lighter (dl > 0) or darker in perceptual lightness, same hue. */
export function lift(color: string, dl: number): string {
  if (dl === 0) return color;
  const op = dl > 0 ? "+" : "-";
  return `oklch(from ${color} calc(l ${op} ${num(Math.abs(dl))}) c h)`;
}

/** p percent of a over b. */
export const mix = (a: string, p: number, b: string) => `color-mix(in oklab, ${a} ${pct(p)}, ${b})`;

/** a at p percent opacity. */
export const fade = (a: string, p: number) => mix(a, p, "transparent");

// ---------------------------------------------------------------- light

const norm = (v: V3): V3 => {
  const l = Math.hypot(...v) || 1;
  return [v[0] / l, v[1] / l, v[2] / l];
};
const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

/** Camera space: x right, y up, z toward the viewer. */
export const KEY_LIGHT: V3 = norm([-0.55, 0.7, 0.6]);
const RIM_LIGHT: V3 = norm([0.85, 0.1, -0.35]);
const HALF: V3 = norm([KEY_LIGHT[0], KEY_LIGHT[1], KEY_LIGHT[2] + 1]);
/** The key light's direction on screen (y down), toward the light. */
export const LIGHT_ON_SCREEN: Pt = (() => {
  const l = Math.hypot(KEY_LIGHT[0], KEY_LIGHT[1]);
  return [KEY_LIGHT[0] / l, -KEY_LIGHT[1] / l];
})();

/** Lambert diffuse with a little ambient and rim light (0 to 1), and a soft specular (0 to 1). */
export function lightAt(n: V3): { diffuse: number; specular: number } {
  const u = norm(n);
  // Wrapped Lambert: a large soft key light, as in a studio render, so the turn
  // into shadow is gradual and the lit side stays bright.
  const lambert = Math.max(0, (dot(u, KEY_LIGHT) + 0.35) / 1.35);
  const rim = Math.max(0, dot(u, RIM_LIGHT));
  const diffuse = Math.min(1, 0.1 + 0.9 * lambert + 0.12 * rim);
  const specular = 0.7 * Math.pow(Math.max(0, dot(u, HALF)), 40);
  return { diffuse, specular };
}

/** The body color of a solid's surface, from the studio material roles. */
export function bodyPaint(diffuse: number, specular = 0): string {
  const base = mix(role("studio-lit"), diffuse * 100, role("studio-shade"));
  return specular > 0.004 ? mix(role("studio-spec"), specular * 100, base) : base;
}

/** The body color with the normal's own light. */
export const litPaint = (n: V3, dDiffuse = 0) => {
  const { diffuse, specular } = lightAt(n);
  return bodyPaint(Math.min(1, Math.max(0, diffuse + dDiffuse)), specular);
};

// ---------------------------------------------------------------- building a layer

/** A gradient before it has an id (distributes over the linear and radial kinds). */
type GradientInput = StudioGradient extends infer G
  ? G extends StudioGradient
    ? Omit<G, "id"> & { id?: string }
    : never
  : never;

export class LayerBuilder {
  readonly layer: StudioLayer = { gradients: [], clips: [], before: {}, restyle: {} };
  private n = 0;

  /** A gradient under a fresh id, or under `id` once (shared gradients). */
  gradient(g: GradientInput): { grad: string } {
    const id = g.id ?? `g${++this.n}`;
    if (!this.layer.gradients.some((x) => x.id === id)) {
      this.layer.gradients.push({ ...g, id } as StudioGradient);
    }
    return { grad: id };
  }

  clip(d: string): string {
    const id = `c${++this.n}`;
    this.layer.clips.push({ id, d });
    return id;
  }

  before(index: number, ...shapes: StudioShape[]) {
    (this.layer.before[index] ??= []).push(...shapes);
  }

  restyle(index: number, style: StudioLayer["restyle"][number]) {
    this.layer.restyle[index] = { ...this.layer.restyle[index], ...style };
  }
}

/** Gradient stops from a function of the offset, `n` of them. */
export function stopsOf(n: number, color: (t: number) => string): StudioStop[] {
  return Array.from({ length: n }, (_, i) => {
    const t = i / (n - 1);
    return { offset: Math.round(t * 1000) / 1000, color: color(t) };
  });
}

// ---------------------------------------------------------------- paths

export const f2 = (n: number) => String(Math.round(n * 100) / 100);

export function polyPath(pts: Pt[], close = true): string {
  const body = pts.map(([x, y], i) => `${i ? "L" : "M"}${f2(x)} ${f2(y)}`).join(" ");
  return close ? `${body} Z` : body;
}

/** Every coordinate pair in a path's data (M, L and the end points of A). */
export function pathPoints(d: string): Pt[] {
  const out: Pt[] = [];
  const re = /([MLA])([^MLAZ]*)/g;
  for (const m of d.matchAll(re)) {
    const n = m[2]
      .trim()
      .split(/[\s,]+/)
      .filter(Boolean)
      .map(Number);
    if (m[1] === "A") {
      for (let i = 0; i + 6 < n.length; i += 7) out.push([n[i + 5], n[i + 6]]);
    } else {
      for (let i = 0; i + 1 < n.length; i += 2) out.push([n[i], n[i + 1]]);
    }
  }
  return out.filter((p) => Number.isFinite(p[0]) && Number.isFinite(p[1]));
}

export function bounds(pts: Pt[]): { x0: number; y0: number; x1: number; y1: number } | null {
  if (!pts.length) return null;
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  return { x0: Math.min(...xs), y0: Math.min(...ys), x1: Math.max(...xs), y1: Math.max(...ys) };
}

/** Convex hull (monotone chain), counter-clockwise. */
export function hull(points: Pt[]): Pt[] {
  const p = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  if (p.length < 3) return p;
  const cross = (o: Pt, a: Pt, b: Pt) =>
    (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lower: Pt[] = [];
  for (const q of p) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], q) <= 0)
      lower.pop();
    lower.push(q);
  }
  const upper: Pt[] = [];
  for (const q of [...p].reverse()) {
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], q) <= 0)
      upper.pop();
    upper.push(q);
  }
  return [...lower.slice(0, -1), ...upper.slice(0, -1)];
}

/** A dot drawn by dotAt: "M x-r y A r r 0 1 0 x+r y A …". Its center and radius, or null. */
export function dotOf(d: string): { c: Pt; r: number } | null {
  const m = /^M(-?[\d.]+) (-?[\d.]+) A([\d.]+) \3 0 1 0 (-?[\d.]+) \2 A\3 \3 0 1 0 \1 \2 Z$/.exec(
    d
  );
  if (!m) return null;
  const r = Number(m[3]);
  if (r > 7) return null;
  return { c: [Number(m[1]) + r, Number(m[2])], r };
}
