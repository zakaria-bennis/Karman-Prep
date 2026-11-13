/*
 * The Shinkai glow (founder, 2026-11-08: "glowing light, lens-flare-like glows"): drawn smoothly
 * over the painted brushwork in screen blend, the way light sits over a painted cel. The sun's
 * bloom and its rays, a long anamorphic streak and a few soft lens ghosts along the line through
 * the middle of the frame, and warm halos round every window and lantern.
 */
import type { TimeOfDay } from "../../light";
import { rgb, type Color } from "../../noise";
import { SHINKAI } from "./palette";
import type { Light } from "./places";

type Pt = [number, number];

export interface GlowSpec {
  time: TimeOfDay;
  sun: Pt;
  lights: Light[];
  /** 0 to 1 (more on hover, less behind the box). */
  strength?: number;
  rays?: boolean;
  flare?: boolean;
}

function halo(g: CanvasRenderingContext2D, x: number, y: number, r: number, c: Color, a: number) {
  if (a <= 0.003 || r <= 0) return;
  const gr = g.createRadialGradient(x, y, 0, x, y, r);
  gr.addColorStop(0, rgb(c, a));
  gr.addColorStop(0.3, rgb(c, a * 0.45));
  gr.addColorStop(1, rgb(c, 0));
  g.fillStyle = gr;
  g.fillRect(x - r, y - r, r * 2, r * 2);
}

export function drawGlow(g: CanvasRenderingContext2D, W: number, H: number, spec: GlowSpec) {
  const L = SHINKAI[spec.time];
  const k = spec.strength ?? 1;
  const night = spec.time === "night";
  const [sx, sy] = spec.sun;
  g.save();
  g.globalCompositeOperation = "screen";
  /* The bloom: a wide soft wash of the light's color, then a bright core. */
  halo(g, sx, sy, Math.max(W, H) * (night ? 0.35 : 0.7), L.bloom, (night ? 0.2 : 0.42) * k);
  halo(g, sx, sy, W * (night ? 0.05 : 0.09), L.sun, (night ? 0.7 : 0.95) * k);
  /* Rays fanning up from the sun, through gaps in the clouds. */
  if (spec.rays !== false && !night) {
    for (let i = 0; i < 16; i++) {
      const a = -Math.PI * (0.08 + (i / 15) * 0.84) + Math.sin(i * 3.7) * 0.03;
      const len = Math.max(W, H) * (0.6 + ((i * 37) % 10) / 20);
      const spread = 0.012 + ((i * 13) % 5) * 0.006;
      const gr = g.createLinearGradient(sx, sy, sx + Math.cos(a) * len, sy + Math.sin(a) * len);
      gr.addColorStop(0, rgb(L.bloom, (i % 2 ? 0.13 : 0.08) * k));
      gr.addColorStop(1, rgb(L.bloom, 0));
      g.fillStyle = gr;
      g.beginPath();
      g.moveTo(sx, sy);
      g.lineTo(sx + Math.cos(a - spread) * len, sy + Math.sin(a - spread) * len);
      g.lineTo(sx + Math.cos(a + spread) * len, sy + Math.sin(a + spread) * len);
      g.closePath();
      g.fill();
    }
  }
  /* The flare: a long horizontal streak through the sun and soft ghosts across the frame. */
  if (spec.flare !== false) {
    g.save();
    g.translate(sx, sy);
    g.scale(1, 0.018);
    halo(g, 0, 0, W * 0.55, L.bloom, 0.5 * k);
    g.restore();
    const cx = W / 2;
    const cy = H / 2;
    const ghosts: [number, number, Color][] = [
      [0.45, 0.022, [170, 230, 255]],
      [0.8, 0.012, [255, 220, 160]],
      [1.25, 0.04, [190, 255, 220]],
      [1.6, 0.018, [255, 200, 230]],
    ];
    for (const [t, rr, c] of ghosts) {
      halo(g, sx + (cx - sx) * t * 2, sy + (cy - sy) * t * 2, W * rr, c, (night ? 0.12 : 0.22) * k);
    }
  }
  /* Warm halos round the windows and lanterns. */
  for (const [x, y, r, a] of spec.lights) halo(g, x, y, r, L.lamp, Math.min(1, a) * 0.8 * k);
  g.restore();
}
