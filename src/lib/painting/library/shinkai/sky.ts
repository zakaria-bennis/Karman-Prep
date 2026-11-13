/*
 * The Library's opening, high in the sky (founder, 2026-11-08): two skies of one world, joined on
 * a diagonal (seam.ts). Each looks out over a sea of cloud toward its place: Math toward a hilltop
 * with the white observatory rising through the clouds, cool and clear; Reading and Writing toward
 * a green island with the lantern-lit reading house, warm. Towering cumulus with bright rims,
 * thin cirrus, the sun low over the cloud sea (the moon and the Milky Way at night). The descent
 * frame is the camera among the clouds, the observatory's hill in the gap below.
 */
import type { TimeOfDay } from "../../light";
import { ctx2d, makeCanvas, mix, rgb, rng, type Color } from "../../noise";
import { cirrus, cloudBand, cloudSea, cumulus, starfield } from "./clouds";
import { SHINKAI, type ShinkaiLight } from "./palette";
import { observatory, readingHouse, type Light } from "./places";

type Pt = [number, number];
const TAU = Math.PI * 2;

export interface SkyFrame {
  canvas: HTMLCanvasElement;
  sun: Pt;
  lights: Light[];
  /** Where this side's place peeks through the clouds (px). */
  dest: Pt;
}

/** Where the sun (or moon) sits: low over the cloud sea by day, high at night (fractions). */
export function sunFor(time: TimeOfDay): Pt {
  return time === "night" ? [0.47, 0.22] : time === "sunset" ? [0.46, 0.62] : [0.47, 0.42];
}

function gradient(
  g: CanvasRenderingContext2D,
  W: number,
  H: number,
  L: ShinkaiLight,
  tint: Color,
  lean: number,
  until = 0.75
) {
  const gr = g.createLinearGradient(0, 0, 0, H * until);
  L.sky.forEach((c, i) => gr.addColorStop(i / (L.sky.length - 1), rgb(mix(c, tint, lean))));
  g.fillStyle = gr;
  g.fillRect(0, 0, W, H);
}

/** A green hilltop rising out of the cloud sea: an uneven ridge, lit on the sun side, with a few
 *  round trees, for a place to stand on. */
function island(
  g: CanvasRenderingContext2D,
  r: () => number,
  x: number,
  y: number,
  w: number,
  h: number,
  L: ShinkaiLight,
  sun: Pt
) {
  const ridge = (u: number) => {
    const t = (u - x) / (w / 2);
    const bump = Math.sin(t * 7 + 1) * 0.04 + Math.sin(t * 13) * 0.02;
    return y - h * Math.max(0, 1 - t * t) * (0.92 + bump);
  };
  const toSun = sun[0] > x ? 1 : -1;
  g.beginPath();
  g.moveTo(x - w / 2, y + h * 0.2);
  for (let u = x - w / 2; u <= x + w / 2; u += 2) g.lineTo(u, ridge(u));
  g.lineTo(x + w / 2, y + h * 0.2);
  g.closePath();
  const gr = g.createLinearGradient(x - toSun * w * 0.5, 0, x + toSun * w * 0.5, 0);
  gr.addColorStop(0, rgb(mix(L.grassShade, L.cloudShade, 0.2)));
  gr.addColorStop(0.6, rgb(L.grass));
  gr.addColorStop(1, rgb(mix(L.grass, L.cloudRim, 0.3)));
  g.fillStyle = gr;
  g.fill();
  /* A lit edge along the ridge on the sun side. */
  g.strokeStyle = rgb(mix(L.grass, L.cloudRim, 0.55), 0.8);
  g.lineWidth = Math.max(1.5, h * 0.03);
  g.beginPath();
  for (let u = x; u <= x + (toSun * w) / 2.2; u += toSun * 2) g.lineTo(u, ridge(u) + 1);
  g.stroke();
  for (let i = 0; i < 7; i++) {
    const u = x + (r() - 0.5) * w * 0.7;
    if (Math.abs(u - x) < w * 0.12) continue;
    const ty = ridge(u) + h * 0.05;
    g.fillStyle = rgb(mix(L.grassShade, L.grass, (u - x) * toSun > 0 ? 0.6 : 0.1));
    g.beginPath();
    g.arc(u, ty - h * 0.08, h * (0.07 + r() * 0.05), 0, TAU);
    g.fill();
  }
}

/** A few birds, small and dark against the light. */
export function birds(
  g: CanvasRenderingContext2D,
  x: number,
  y: number,
  s: number,
  n: number,
  ink: string
) {
  g.strokeStyle = ink;
  g.lineWidth = Math.max(1.2, s * 0.12);
  g.lineCap = "round";
  for (let i = 0; i < n; i++) {
    const row = Math.ceil(i / 2);
    const side = i % 2 ? -1 : 1;
    const bx = x - row * s * 1.4;
    const by = y + side * row * s * 0.7 + Math.sin(i * 2.1) * s * 0.2;
    g.beginPath();
    g.moveTo(bx - s * 0.5, by - s * 0.1);
    g.quadraticCurveTo(bx - s * 0.2, by - s * 0.32, bx, by);
    g.quadraticCurveTo(bx + s * 0.2, by - s * 0.32, bx + s * 0.5, by - s * 0.1);
    g.stroke();
  }
}

/** One side's sky, full screen (the other side is masked over it on the diagonal). */
export function renderSkySide(
  side: "math" | "rw",
  time: TimeOfDay,
  W: number,
  H: number
): SkyFrame {
  const L = SHINKAI[time];
  const c = makeCanvas(W, H);
  const g = ctx2d(c);
  const r = rng(side === "math" ? 41 : 43);
  const tint = side === "math" ? L.cool : L.warm;
  const [su, sv] = sunFor(time);
  const sun: Pt = [su * W, sv * H];
  /* Each side leans toward its own light; less at night, so the deep blue stays deep. */
  gradient(g, W, H, L, tint, time === "night" ? 0.1 : 0.32);
  starfield(g, r, W, H, L.stars, 0.7);
  cirrus(g, r, W, H, L, 8);
  /* Towering cumulus on this side, a lower one across the way. */
  if (side === "math") {
    cumulus(g, r, { x: W * 0.12, base: H * 0.76, w: W * 0.34, h: H * 0.55 }, L, sun, tint);
    cumulus(g, r, { x: W * 0.86, base: H * 0.76, w: W * 0.2, h: H * 0.22 }, L, sun, tint);
  } else {
    cumulus(g, r, { x: W * 0.9, base: H * 0.78, w: W * 0.34, h: H * 0.5 }, L, sun, tint);
    cumulus(g, r, { x: W * 0.16, base: H * 0.76, w: W * 0.18, h: H * 0.2 }, L, sun, tint);
  }
  cloudSea(g, r, W, H, H * 0.72, L, sun, tint);
  /* The place, peeking through the clouds far away. */
  const lights: Light[] = [];
  let dest: Pt;
  if (side === "math") {
    const x = W * 0.2;
    const y = H * 0.8;
    island(g, r, x, y, W * 0.22, H * 0.13, L, sun);
    lights.push(...observatory(g, x + W * 0.005, y - H * 0.122, W * 0.045, L, sun));
    dest = [x, y - H * 0.16];
  } else {
    const x = W * 0.8;
    const y = H * 0.83;
    island(g, r, x, y, W * 0.26, H * 0.11, L, sun);
    lights.push(...readingHouse(g, r, x, y - H * 0.1, W * 0.05, L, sun));
    dest = [x, y - H * 0.15];
  }
  /* The island's foot sits in the cloud sea. */
  cloudBand(
    g,
    r,
    dest[0] - W * 0.16,
    dest[0] + W * 0.16,
    dest[1] + H * 0.19,
    H * 0.035,
    L,
    sun,
    tint
  );
  if (time !== "night")
    birds(
      g,
      dest[0] + W * 0.08,
      dest[1] - H * 0.16,
      W * 0.008,
      3,
      rgb(mix(L.cloudShade, [30, 34, 50], 0.5), 0.8)
    );
  /* The moon by night, a solid disc (its glow is added smoothly on top). */
  if (time === "night") {
    g.fillStyle = rgb(L.sun);
    g.beginPath();
    g.arc(sun[0], sun[1], W * 0.018, 0, TAU);
    g.fill();
  }
  return { canvas: c, sun, lights, dest };
}

/** Halfway down: among the clouds, the observatory's hill in the gap below. */
export function renderDescent(time: TimeOfDay, W: number, H: number): SkyFrame {
  const L = SHINKAI[time];
  const c = makeCanvas(W, H);
  const g = ctx2d(c);
  const r = rng(77);
  const sun: Pt = [W * 0.72, H * 0.24];
  gradient(g, W, H, L, L.cool, 0.06, 1);
  cirrus(g, r, W, H * 0.5, L, 6);
  /* The land far below, in the gap, the observatory catching the light. */
  const ground = (x: number) => H * (0.8 + 0.06 * Math.sin((x / W) * 4 + 1));
  g.fillStyle = rgb(mix(L.grass, L.haze, 0.45));
  g.beginPath();
  g.moveTo(0, H);
  for (let x = 0; x <= W; x += 8) g.lineTo(x, ground(x));
  g.lineTo(W, H);
  g.fill();
  const hx = W * 0.52;
  island(g, r, hx, H * 0.86, W * 0.26, H * 0.12, L, sun);
  const lights = observatory(g, hx + W * 0.02, H * 0.76, W * 0.05, L, sun);
  /* Great cloud walls either side, close and glowing at their edges, a soft layer passing below. */
  cumulus(g, r, { x: W * 0.06, base: H * 1.15, w: W * 0.7, h: H * 1.1 }, L, sun, L.warm);
  cumulus(g, r, { x: W * 1.0, base: H * 1.1, w: W * 0.6, h: H * 0.9 }, L, sun, L.cool);
  for (let i = 0; i < 14; i++) {
    const x = W * (0.25 + r() * 0.55);
    const y = H * (0.62 + r() * 0.2);
    const s = W * (0.05 + r() * 0.06);
    const gr = g.createRadialGradient(x, y, 0, x, y, s);
    gr.addColorStop(0, rgb(L.cloudLit, 0.45));
    gr.addColorStop(1, rgb(L.cloudLit, 0));
    g.fillStyle = gr;
    g.fillRect(x - s, y - s, s * 2, s * 2);
  }
  birds(g, W * 0.4, H * 0.5, W * 0.01, 5, rgb(mix(L.cloudShade, [30, 20, 40], 0.5), 0.85));
  return { canvas: c, sun, lights, dest: [hx, H * 0.7] };
}
