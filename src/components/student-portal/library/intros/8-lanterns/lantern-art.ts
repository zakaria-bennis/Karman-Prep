/*
 * Intro 8's paintings, drawn in code with Karman's painting primitives (studio.ts):
 * - The calm water: a still lake under far hills and a little mist, before the light comes. At
 *   night it is the night itself; at sunset, the dusk after it; at dawn, the blue hour before
 *   sunrise; by day, soft early-morning light (founder, 2026-11-08).
 * - A paper lantern: a round paper body lit from inside, bamboo ribs, a dark cap and rim, and a
 *   small mark painted on its paper (a parabola for Math, an open book for Reading and Writing).
 */
import { LIGHT, type Light, type TimeOfDay } from "@/lib/painting/light";
import { ctx2d, hex, makeCanvas, mix, rgb, rng, type Color } from "@/lib/painting/noise";
import { Studio } from "@/lib/painting/studio";
import type { Layout } from "@/lib/painting/library/seam";

const toHex = (c: Color) =>
  `#${c
    .map((v) =>
      Math.max(0, Math.min(255, Math.round(v)))
        .toString(16)
        .padStart(2, "0")
    )
    .join("")}`;

/** A blend of two lights (colors and numbers), keeping the first one's sun position. */
function blend(a: Light, b: Light, t: number): Light {
  const out: Record<string, unknown> = { ...a };
  for (const key of Object.keys(a) as (keyof Light)[]) {
    const x = a[key];
    const y = b[key];
    if (typeof x === "string" && typeof y === "string") out[key] = toHex(mix(hex(x), hex(y), t));
    else if (typeof x === "number" && typeof y === "number") out[key] = x + (y - x) * t;
  }
  return out as unknown as Light;
}

/** The light before the lanterns rise, for each hour. */
export function waitingLight(time: TimeOfDay): Light {
  if (time === "night") return LIGHT.night;
  if (time === "sunset") return { ...blend(LIGHT.sunset, LIGHT.night, 0.5), stars: 1 };
  if (time === "dawn") return { ...blend(LIGHT.dawn, LIGHT.night, 0.5), stars: 1 };
  return blend(LIGHT.dawn, LIGHT.day, 0.3);
}

export const HORIZON: Record<Layout, number> = { wide: 0.6, tall: 0.62 };

export function renderWater(layout: Layout, time: TimeOfDay, aspect: number): HTMLCanvasElement {
  const w = layout === "wide" ? 760 : 480;
  const h = Math.max(200, Math.round(w * aspect));
  const L = waitingLight(time);
  const horizon = HORIZON[layout];
  const k = new Studio(w, h, { ...L, sunAt: [time === "night" ? 0.82 : 0.5, 0.16] }, 8088);
  k.sky(horizon);
  k.clouds(2, 0.08, 0.3);
  if (time === "night") k.sun(0.014);
  k.range({ base: horizon, top: horizon - 0.12, amp: 0.08, s: 21, far: 0.75 });
  k.range({ base: horizon + 0.004, top: horizon - 0.05, amp: 0.05, freq: 3.4, s: 4, far: 0.4 });
  k.forest(horizon, { kind: "round", height: 0.016, density: 1.2, far: 0.45 });
  k.mist(horizon - 0.02, 0.04, 0.45);
  k.lake(horizon, 0.3);
  return k.c;
}

export type Mark = "parabola" | "book";

/** A paper lantern, drawn at `w` by `w * 1.35` pixels. */
export function renderLantern(w: number, mark: Mark, seed: number): HTMLCanvasElement {
  const h = Math.round(w * 1.35);
  const c = makeCanvas(w, h);
  const g = ctx2d(c);
  const r = rng(seed);
  const cx = w / 2;
  const top = h * 0.16;
  const bot = h * 0.9;
  const rx = w * 0.42;
  const mid = (top + bot) / 2;
  const ry = (bot - top) / 2;
  const body = () => {
    g.beginPath();
    g.ellipse(cx, mid, rx, ry, 0, 0, Math.PI * 2);
  };
  /* The string it hangs from. */
  g.strokeStyle = "rgba(40, 25, 15, 0.8)";
  g.lineWidth = Math.max(1, w * 0.014);
  g.beginPath();
  g.moveTo(cx, 0);
  g.lineTo(cx, top);
  g.stroke();
  /* The paper, lit from inside: warm white at the heart, deep amber at the edge. */
  const lit = g.createRadialGradient(cx, mid + ry * 0.2, w * 0.04, cx, mid, rx * 1.1);
  lit.addColorStop(0, "#fff6d6");
  lit.addColorStop(0.35, "#ffd98a");
  lit.addColorStop(0.75, "#f0a04a");
  lit.addColorStop(1, "#b9581f");
  g.fillStyle = lit;
  body();
  g.fill();
  /* Brushed paper: short soft strokes across the body. */
  g.save();
  body();
  g.clip();
  for (let i = 0; i < 70; i++) {
    const x = cx + (r() - 0.5) * rx * 2;
    const y = top + r() * (bot - top);
    const shade: Color = r() < 0.5 ? [255, 236, 190] : [214, 120, 50];
    g.strokeStyle = rgb(shade, 0.12 + r() * 0.12);
    g.lineWidth = w * (0.02 + r() * 0.03);
    g.lineCap = "round";
    g.beginPath();
    g.moveTo(x, y);
    g.quadraticCurveTo(x + w * 0.05, y + (r() - 0.5) * w * 0.04, x + w * (0.08 + r() * 0.08), y);
    g.stroke();
  }
  /* Bamboo ribs: curved verticals and a few rings. */
  g.strokeStyle = "rgba(150, 70, 25, 0.45)";
  g.lineWidth = Math.max(1, w * 0.012);
  for (const f of [-0.66, -0.33, 0, 0.33, 0.66]) {
    g.beginPath();
    g.ellipse(cx, mid, Math.abs(f) * rx || 0.5, ry, 0, -Math.PI / 2, Math.PI / 2, f < 0);
    g.stroke();
  }
  for (const f of [-0.55, 0, 0.55]) {
    const y = mid + f * ry;
    const half = rx * Math.sqrt(1 - f * f);
    g.beginPath();
    g.ellipse(cx, y, half, w * 0.03, 0, 0, Math.PI);
    g.stroke();
  }
  /* The painted mark. */
  g.strokeStyle = "rgba(120, 40, 20, 0.7)";
  g.lineWidth = w * 0.026;
  g.lineCap = "round";
  g.beginPath();
  if (mark === "parabola") {
    const s = rx * 0.55;
    for (let i = 0; i <= 20; i++) {
      const u = -1 + i / 10;
      const x = cx + u * s;
      const y = mid + ry * 0.25 - (1 - u * u) * s * 0.9;
      if (i === 0) g.moveTo(x, y);
      else g.lineTo(x, y);
    }
  } else {
    const s = rx * 0.5;
    const y = mid + ry * 0.12;
    g.moveTo(cx, y);
    g.quadraticCurveTo(cx - s * 0.5, y - s * 0.25, cx - s, y - s * 0.05);
    g.moveTo(cx, y);
    g.quadraticCurveTo(cx + s * 0.5, y - s * 0.25, cx + s, y - s * 0.05);
    g.moveTo(cx, y);
    g.lineTo(cx, y - s * 0.55);
  }
  g.stroke();
  g.restore();
  /* Cap and rim. */
  g.fillStyle = "#3a2216";
  const cap = (y: number, half: number, tall: number) => {
    g.beginPath();
    g.ellipse(cx, y, half, tall, 0, 0, Math.PI * 2);
    g.fill();
  };
  cap(top + h * 0.012, rx * 0.42, h * 0.03);
  cap(bot - h * 0.012, rx * 0.5, h * 0.032);
  /* A tassel. */
  g.strokeStyle = "#8a2a1a";
  g.lineWidth = Math.max(1, w * 0.02);
  g.beginPath();
  g.moveTo(cx, bot);
  g.lineTo(cx, h * 0.99);
  g.stroke();
  return c;
}
