/*
 * Shinkai-style clouds for the Library's world: towering cumulus built of many round puffs, each
 * lit on the side facing the sun with a bright rim and shaded beneath; a rolling sea of cloud tops
 * toward the horizon; and long thin cirrus high up. Drawn in pixels on a canvas, then painted as
 * brushwork by painterly.ts, with the glow layer (glow.ts) added smoothly on top.
 */
import { mix, rgb, type Color } from "../../noise";
import type { ShinkaiLight } from "./palette";

const TAU = Math.PI * 2;
type Pt = [number, number];

export interface Tower {
  /** Middle of the base, width and height, in pixels. */
  x: number;
  base: number;
  w: number;
  h: number;
}

/**
 * A puff: a slightly flattened billow, lit toward the sun and shaded beneath. `rim` adds the thin
 * bright edge where the light grazes it (only on the outer billows, as in Shinkai's clouds).
 */
function puff(
  g: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  L: ShinkaiLight,
  sun: Pt,
  lift: number,
  tint: Color,
  flat = 0.85,
  rim = true
) {
  const dx = sun[0] - x;
  const dy = sun[1] - y;
  const d = Math.hypot(dx, dy) || 1;
  const ux = dx / d;
  const uy = dy / d;
  const lit = mix(mix(L.cloudLit, tint, 0.14), L.cloudShade, Math.max(0, 0.2 - lift * 0.2));
  g.save();
  g.translate(x, y);
  g.scale(1, flat);
  const gr = g.createRadialGradient(ux * r * 0.4, uy * r * 0.4 - r * 0.25, r * 0.05, 0, 0, r);
  gr.addColorStop(0, rgb(lit));
  gr.addColorStop(0.55, rgb(mix(lit, L.cloudShade, 0.22)));
  gr.addColorStop(1, rgb(mix(L.cloudShade, tint, 0.12)));
  g.fillStyle = gr;
  g.beginPath();
  g.arc(0, 0, r, 0, TAU);
  g.fill();
  /* Shade gathers in the lower part of each billow. */
  const low = g.createLinearGradient(0, -r * 0.1, 0, r);
  low.addColorStop(0, rgb(L.cloudShade, 0));
  low.addColorStop(1, rgb(L.cloudShade, 0.45));
  g.fillStyle = low;
  g.beginPath();
  g.arc(0, 0, r, 0, TAU);
  g.fill();
  if (rim) {
    const a = Math.atan2(uy, ux);
    g.strokeStyle = rgb(L.cloudRim, 0.6);
    g.lineWidth = Math.max(1.2, r * 0.05);
    g.beginPath();
    g.arc(0, 0, r * 0.98, a - 0.7, a + 0.7);
    g.stroke();
  }
  g.restore();
}

/** A towering cumulus, flat underneath, billowing up: big billows first, then small detail. */
export function cumulus(
  g: CanvasRenderingContext2D,
  r: () => number,
  t: Tower,
  L: ShinkaiLight,
  sun: Pt,
  tint: Color
) {
  const puffs: [number, number, number, number, boolean][] = [];
  /* Billows keep a painterly size however big the tower: a big tower just has more of them. */
  const unit = Math.min(t.w, 420);
  const count = Math.round(130 * Math.max(1, (t.w * t.h) / (420 * 420)));
  for (let i = 0; i < count; i++) {
    const up = Math.pow(r(), 0.8);
    /* The tower narrows toward the top and leans a little away from the sun. */
    const spread = t.w * (0.5 - up * 0.3);
    const lean = (sun[0] > t.x ? -1 : 1) * up * t.w * 0.08;
    const x = t.x + lean + (r() - 0.5) * 2 * spread;
    const y = t.base - up * t.h;
    const big = i < count * 0.38;
    const rad = unit * (big ? 0.1 + r() * 0.1 : 0.03 + r() * 0.05) * (1 - up * 0.4);
    puffs.push([x, y, rad, up, !big]);
  }
  puffs.sort((a, b) => b[1] - a[1] || b[2] - a[2]);
  for (const [x, y, rad, up, detail] of puffs)
    puff(g, x, y, rad, L, sun, up, tint, 0.82, detail || up > 0.6);
  /* The flat, shaded base. */
  const base = g.createLinearGradient(0, t.base - t.h * 0.1, 0, t.base + t.h * 0.05);
  base.addColorStop(0, rgb(L.cloudShade, 0));
  base.addColorStop(1, rgb(L.cloudShade, 0.8));
  g.fillStyle = base;
  g.fillRect(t.x - t.w * 0.65, t.base - t.h * 0.1, t.w * 1.3, t.h * 0.15);
}

/** A sea of cloud tops from `y0` down, bigger toward the viewer, lit along their tops. */
export function cloudSea(
  g: CanvasRenderingContext2D,
  r: () => number,
  W: number,
  H: number,
  y0: number,
  L: ShinkaiLight,
  sun: Pt,
  tint: Color
) {
  const fill = g.createLinearGradient(0, y0, 0, H);
  fill.addColorStop(0, rgb(mix(L.cloudLit, L.haze, 0.4)));
  fill.addColorStop(1, rgb(mix(L.cloudShade, L.cloudLit, 0.3)));
  g.fillStyle = fill;
  g.fillRect(0, y0 + 6, W, H - y0);
  /* Swells of wide, flat billows, of mixed sizes, small and many far away, larger near. */
  const rows = 13;
  for (let row = 0; row < rows; row++) {
    const t = row / (rows - 1);
    const y = y0 + Math.pow(t, 1.5) * (H - y0) * 0.98;
    const size = H * (0.016 + t * 0.07);
    let x = -size * r();
    while (x < W + size) {
      const big = r() < 0.3;
      const rad = size * (big ? 1.2 + r() * 0.8 : 0.5 + r() * 0.5);
      const swell = Math.sin((x / W) * 7 + row * 1.3) * size * 0.5;
      puff(
        g,
        x,
        y + swell + (r() - 0.5) * size * 0.8,
        rad,
        L,
        sun,
        0.35 + t * 0.3,
        tint,
        0.55,
        big && r() < 0.6
      );
      x += rad * (0.7 + r() * 0.9);
    }
  }
  /* Far away the sea melts into the haze of the horizon. */
  const haze = g.createLinearGradient(0, y0 - H * 0.02, 0, y0 + H * 0.14);
  haze.addColorStop(0, rgb(mix(L.haze, L.sky[3], 0.5), 0.9));
  haze.addColorStop(1, rgb(mix(L.haze, L.sky[3], 0.5), 0));
  g.fillStyle = haze;
  g.fillRect(0, y0 - H * 0.02, W, H * 0.16);
}

/** A band of billows across [x0, x1] at y, to tuck the foot of an island into the cloud sea. */
export function cloudBand(
  g: CanvasRenderingContext2D,
  r: () => number,
  x0: number,
  x1: number,
  y: number,
  size: number,
  L: ShinkaiLight,
  sun: Pt,
  tint: Color
) {
  for (let x = x0; x < x1; x += size * (0.5 + r() * 0.5)) {
    puff(
      g,
      x,
      y + (r() - 0.5) * size * 0.5,
      size * (0.7 + r() * 0.6),
      L,
      sun,
      0.5,
      tint,
      0.55,
      r() < 0.4
    );
  }
}

/** Long, thin, high cirrus, streaked across the upper sky. */
export function cirrus(
  g: CanvasRenderingContext2D,
  r: () => number,
  W: number,
  H: number,
  L: ShinkaiLight,
  n = 7
) {
  for (let i = 0; i < n; i++) {
    const x = r() * W;
    const y = H * (0.05 + r() * 0.3);
    const w = W * (0.15 + r() * 0.25);
    g.save();
    g.translate(x, y);
    g.rotate(-0.08 + r() * 0.16);
    const gr = g.createLinearGradient(-w / 2, 0, w / 2, 0);
    gr.addColorStop(0, rgb(L.cloudRim, 0));
    gr.addColorStop(0.5, rgb(L.cloudRim, 0.45));
    gr.addColorStop(1, rgb(L.cloudRim, 0));
    g.fillStyle = gr;
    for (let j = 0; j < 5; j++) {
      g.beginPath();
      g.ellipse((r() - 0.5) * w * 0.3, j * H * 0.004, w / 2, H * 0.004, 0, 0, TAU);
      g.fill();
    }
    g.restore();
  }
}

/** The night sky: many stars of different sizes and a soft band of the Milky Way. */
export function starfield(
  g: CanvasRenderingContext2D,
  r: () => number,
  W: number,
  H: number,
  amount: number,
  until: number
) {
  if (amount <= 0) return;
  /* The Milky Way: a soft diagonal band of faint light. */
  for (let i = 0; i < 180 * amount; i++) {
    const t = r();
    const x = W * (0.1 + t * 0.9);
    const y = H * until * (0.95 - t * 0.85) + (r() - 0.5) * H * 0.12;
    const s = W * (0.02 + r() * 0.05);
    const gr = g.createRadialGradient(x, y, 0, x, y, s);
    gr.addColorStop(0, `rgba(200,214,255,${0.06 * amount})`);
    gr.addColorStop(1, "rgba(200,214,255,0)");
    g.fillStyle = gr;
    g.fillRect(x - s, y - s, s * 2, s * 2);
  }
  for (let i = 0; i < 600 * amount; i++) {
    const big = r() < 0.04;
    g.fillStyle = `rgba(240,244,255,${0.35 + r() * 0.65})`;
    g.beginPath();
    g.arc(r() * W, Math.pow(r(), 1.2) * H * until, big ? 2 : 0.6 + r() * 0.9, 0, TAU);
    g.fill();
  }
}
