/*
 * The two places of the Library's world (founder, 2026-11-08: "one world, two places"):
 * - Math: a white observatory with a copper-green dome on a grassy hilltop, a lamp-lit path
 *   winding up to it, wildflowers, a lone round tree and a valley far below. At night the dome's
 *   slit is open, the telescope points at the stars and the windows glow.
 * - Reading and Writing: a lantern-lit reading house of stone and timber under a steep roof, its
 *   tall windows warm and full of books, lanterns strung along the eaves and on posts beside a
 *   stepping-stone path, under a big tree.
 * Each is drawn in pixels for the screen's size, then painted as brushwork (painterly.ts); the
 * lights it returns are where the glow layer (glow.ts) adds the warm light on top.
 */
import type { TimeOfDay } from "../../light";
import { ctx2d, makeCanvas, mix, rgb, rng, type Color } from "../../noise";
import { cirrus, cumulus, starfield } from "./clouds";
import { SHINKAI, type ShinkaiLight } from "./palette";

const TAU = Math.PI * 2;
type Pt = [number, number];

/** A warm point of light for the glow layer: x, y (px), radius (px), strength 0 to 1. */
export type Light = [number, number, number, number];

export interface Place {
  canvas: HTMLCanvasElement;
  sun: Pt;
  lights: Light[];
  /** Where the box opens from (px). */
  anchor: Pt;
}

function sky(g: CanvasRenderingContext2D, W: number, H: number, L: ShinkaiLight, horizon: number) {
  const gr = g.createLinearGradient(0, 0, 0, H * horizon);
  L.sky.forEach((c, i) => gr.addColorStop(i / (L.sky.length - 1), rgb(c)));
  g.fillStyle = gr;
  g.fillRect(0, 0, W, H);
}

/** A rolling hill: a smooth ridge, lit from one side, grass darker toward the viewer. */
function hill(
  g: CanvasRenderingContext2D,
  W: number,
  H: number,
  ridge: (x: number) => number,
  top: Color,
  bottom: Color
) {
  g.beginPath();
  g.moveTo(0, H);
  for (let x = 0; x <= W; x += 6) g.lineTo(x, ridge(x));
  g.lineTo(W, H);
  g.closePath();
  const gr = g.createLinearGradient(0, H * 0.4, 0, H);
  gr.addColorStop(0, rgb(top));
  gr.addColorStop(1, rgb(bottom));
  g.fillStyle = gr;
  g.fill();
}

/** Grass blades and flowers scattered over a band, smaller further away. */
function meadow(
  g: CanvasRenderingContext2D,
  r: () => number,
  W: number,
  H: number,
  ridge: (x: number) => number,
  L: ShinkaiLight,
  flowers: string[]
) {
  for (let i = 0; i < W * 2.2; i++) {
    const x = r() * W;
    const y0 = ridge(x);
    const y = y0 + Math.pow(r(), 0.7) * (H - y0);
    const near = (y - y0) / Math.max(1, H - y0);
    const h = 3 + near * 16;
    g.strokeStyle = rgb(mix(L.grass, L.grassShade, r() * 0.6), 0.7);
    g.lineWidth = 1 + near;
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x + (r() - 0.5) * h * 0.5, y - h);
    g.stroke();
  }
  for (let i = 0; i < W * 0.12; i++) {
    const x = r() * W;
    const y0 = ridge(x);
    const y = y0 + Math.pow(r(), 0.6) * (H - y0);
    const near = (y - y0) / Math.max(1, H - y0);
    g.fillStyle = flowers[i % flowers.length];
    g.beginPath();
    g.arc(x, y, 1.2 + near * 3, 0, TAU);
    g.fill();
  }
}

/** A round, Ghibli-like tree: a trunk and a crown of many leafy puffs, lit on the sun side. */
function tree(
  g: CanvasRenderingContext2D,
  r: () => number,
  x: number,
  y: number,
  s: number,
  L: ShinkaiLight,
  sun: Pt
) {
  g.strokeStyle = rgb(mix([84, 60, 44], L.grassShade, 0.4));
  g.lineWidth = s * 0.08;
  g.beginPath();
  g.moveTo(x, y);
  g.quadraticCurveTo(x - s * 0.05, y - s * 0.5, x + s * 0.03, y - s * 0.75);
  g.stroke();
  const toSun = sun[0] > x ? 1 : -1;
  for (let i = 0; i < 90; i++) {
    const a = r() * TAU;
    const d = Math.sqrt(r());
    const px = x + Math.cos(a) * d * s * 0.5;
    const py = y - s * 0.95 + Math.sin(a) * d * s * 0.38;
    const lit = (px - x) * toSun > 0 && py < y - s * 0.9;
    g.fillStyle = rgb(
      mix(
        lit ? L.grass : L.grassShade,
        i > 60 ? L.cloudRim : L.grassShade,
        i > 70 && lit ? 0.25 : 0.1
      )
    );
    g.beginPath();
    g.arc(px, py, s * (0.07 + r() * 0.08), 0, TAU);
    g.fill();
  }
}

/** A lamp on a post (or a hanging lantern when `post` is 0). Returns its light. */
function lantern(
  g: CanvasRenderingContext2D,
  x: number,
  y: number,
  s: number,
  L: ShinkaiLight,
  post: number
): Light {
  if (post) {
    g.strokeStyle = rgb(mix([50, 40, 36], L.grassShade, 0.3));
    g.lineWidth = Math.max(1.5, s * 0.12);
    g.beginPath();
    g.moveTo(x, y + post);
    g.lineTo(x, y);
    g.stroke();
  }
  g.fillStyle = rgb(mix([60, 44, 36], L.grassShade, 0.2));
  g.fillRect(x - s * 0.35, y - s * 0.55, s * 0.7, s * 0.12);
  g.fillStyle = rgb(mix(L.lamp, [255, 255, 255], 0.2 * L.lampGlow), 0.6 + 0.4 * L.lampGlow);
  g.fillRect(x - s * 0.28, y - s * 0.45, s * 0.56, s * 0.7);
  return [x, y - s * 0.1, s * 3.2, 0.4 + 0.6 * L.lampGlow];
}

/** The observatory: a white tower, a copper-green dome with its slit, a door and windows. */
export function observatory(
  g: CanvasRenderingContext2D,
  x: number,
  ground: number,
  s: number,
  L: ShinkaiLight,
  sun: Pt
): Light[] {
  const lights: Light[] = [];
  const w = s;
  const h = s * 0.7;
  const toSun = sun[0] > x ? 1 : -1;
  const wall = mix([246, 242, 232], L.cloudLit, 0.3);
  const face = g.createLinearGradient(x - w / 2, 0, x + w / 2, 0);
  face.addColorStop(toSun > 0 ? 0 : 1, rgb(mix(wall, L.cloudShade, 0.45)));
  face.addColorStop(toSun > 0 ? 1 : 0, rgb(mix(wall, L.cloudRim, 0.3)));
  g.fillStyle = face;
  g.fillRect(x - w / 2, ground - h, w, h);
  /* The dome. */
  const copper: Color = mix([96, 170, 150], L.cloudShade, 0.25);
  const dome = g.createRadialGradient(
    x + toSun * w * 0.2,
    ground - h - w * 0.3,
    w * 0.05,
    x,
    ground - h,
    w * 0.55
  );
  dome.addColorStop(0, rgb(mix(copper, L.cloudRim, 0.45)));
  dome.addColorStop(1, rgb(mix(copper, L.cloudShade, 0.5)));
  g.fillStyle = dome;
  g.beginPath();
  g.arc(x, ground - h, w * 0.52, Math.PI, 0);
  g.closePath();
  g.fill();
  /* The slit: open with the telescope at night, closed (a darker band) by day. */
  const open = L.lampGlow > 0.6;
  g.fillStyle = rgb(open ? [20, 22, 40] : mix(copper, L.cloudShade, 0.6));
  g.beginPath();
  g.moveTo(x - w * 0.07, ground - h);
  g.lineTo(x - w * 0.05, ground - h - w * 0.5);
  g.lineTo(x + w * 0.05, ground - h - w * 0.5);
  g.lineTo(x + w * 0.07, ground - h);
  g.closePath();
  g.fill();
  if (open) {
    g.strokeStyle = rgb([200, 196, 186]);
    g.lineWidth = w * 0.05;
    g.beginPath();
    g.moveTo(x, ground - h - w * 0.1);
    g.lineTo(x + w * 0.16, ground - h - w * 0.62);
    g.stroke();
  }
  /* A band under the dome, a door, two round windows. */
  g.fillStyle = rgb(mix(wall, L.cloudShade, 0.55));
  g.fillRect(x - w / 2 - 2, ground - h - 2, w + 4, w * 0.05);
  g.fillStyle = rgb(mix([110, 74, 50], L.grassShade, 0.3));
  g.beginPath();
  g.moveTo(x - w * 0.11, ground);
  g.lineTo(x - w * 0.11, ground - h * 0.42);
  g.arc(x, ground - h * 0.42, w * 0.11, Math.PI, 0);
  g.lineTo(x + w * 0.11, ground);
  g.closePath();
  g.fill();
  for (const dx of [-0.3, 0.3]) {
    const wx = x + dx * w;
    const wy = ground - h * 0.62;
    g.fillStyle = rgb(L.lampGlow > 0.5 ? L.lamp : mix([90, 130, 170], L.cloudLit, 0.3));
    g.beginPath();
    g.arc(wx, wy, w * 0.07, 0, TAU);
    g.fill();
    if (L.lampGlow > 0.3) lights.push([wx, wy, w * 0.5, L.lampGlow]);
  }
  return lights;
}

/** The reading house: stone below, timber above, a steep roof, tall warm windows full of books. */
export function readingHouse(
  g: CanvasRenderingContext2D,
  r: () => number,
  x: number,
  ground: number,
  s: number,
  L: ShinkaiLight,
  sun: Pt
): Light[] {
  const lights: Light[] = [];
  const w = s * 1.3;
  const h = s * 0.62;
  const toSun = sun[0] > x ? 1 : -1;
  const stone = mix([196, 186, 168], L.cloudShade, 0.25);
  const timber = mix([150, 104, 70], L.grassShade, 0.2);
  g.fillStyle = rgb(stone);
  g.fillRect(x - w / 2, ground - h, w, h);
  g.fillStyle = rgb(mix(stone, L.cloudShade, 0.35), 0.5);
  for (let i = 0; i < 40; i++)
    g.fillRect(x - w / 2 + r() * w, ground - r() * h, w * 0.05, h * 0.04);
  /* The roof. */
  const roof = mix([150, 70, 56], L.cloudShade, 0.3);
  g.fillStyle = rgb(roof);
  g.beginPath();
  g.moveTo(x - w * 0.6, ground - h);
  g.lineTo(x - w * 0.05, ground - h - s * 0.62);
  g.lineTo(x + w * 0.05, ground - h - s * 0.62);
  g.lineTo(x + w * 0.6, ground - h);
  g.closePath();
  g.fill();
  g.fillStyle = rgb(mix(roof, L.cloudRim, 0.25), 0.6);
  g.beginPath();
  g.moveTo(x + toSun * w * 0.05, ground - h - s * 0.62);
  g.lineTo(x + toSun * w * 0.6, ground - h);
  g.lineTo(x + toSun * w * 0.45, ground - h);
  g.closePath();
  g.fill();
  /* A chimney. */
  g.fillStyle = rgb(mix(stone, L.cloudShade, 0.3));
  g.fillRect(x + w * 0.22, ground - h - s * 0.55, w * 0.07, s * 0.3);
  /* Timber gable band. */
  g.fillStyle = rgb(timber);
  g.fillRect(x - w / 2, ground - h - 2, w, h * 0.08);
  /* Tall arched windows with shelves of books behind warm glass. */
  const spines = ["#b5523b", "#3f6f8f", "#d8a642", "#5b7f4a", "#7a4f8a", "#c9785a"];
  for (const dx of [-0.32, 0, 0.32]) {
    const wx = x + dx * w;
    const ww = w * 0.16;
    const wh = h * 0.6;
    const wy = ground - h * 0.18;
    g.fillStyle = rgb(mix(L.lamp, [255, 240, 210], 0.3 + 0.3 * (1 - L.lampGlow)));
    g.beginPath();
    g.moveTo(wx - ww / 2, wy);
    g.lineTo(wx - ww / 2, wy - wh + ww / 2);
    g.arc(wx, wy - wh + ww / 2, ww / 2, Math.PI, 0);
    g.lineTo(wx + ww / 2, wy);
    g.closePath();
    g.fill();
    for (let row = 0; row < 3; row++) {
      const sy = wy - wh * (0.18 + row * 0.27);
      for (let i = 0; i < 6; i++) {
        g.fillStyle = spines[(i + row * 2) % spines.length];
        g.fillRect(wx - ww * 0.4 + i * ww * 0.13, sy - wh * 0.14, ww * 0.1, wh * 0.14);
      }
      g.fillStyle = rgb(timber);
      g.fillRect(wx - ww / 2, sy, ww, Math.max(1.5, wh * 0.02));
    }
    g.strokeStyle = rgb(mix(timber, [40, 28, 20], 0.4));
    g.lineWidth = Math.max(2, ww * 0.08);
    g.stroke();
    lights.push([wx, wy - wh * 0.5, ww * (1.6 + L.lampGlow * 1.6), 0.35 + 0.65 * L.lampGlow]);
  }
  /* Lanterns strung along the eaves. */
  g.strokeStyle = rgb([60, 46, 40], 0.7);
  g.lineWidth = 1.5;
  g.beginPath();
  const n = 7;
  for (let i = 0; i <= n; i++) {
    const lx = x - w * 0.55 + (w * 1.1 * i) / n;
    const ly = ground - h + Math.sin((i / n) * Math.PI) * s * 0.06 + s * 0.02;
    if (i === 0) g.moveTo(lx, ly);
    else g.lineTo(lx, ly);
  }
  g.stroke();
  for (let i = 1; i < n; i++) {
    const lx = x - w * 0.55 + (w * 1.1 * i) / n;
    const ly = ground - h + Math.sin((i / n) * Math.PI) * s * 0.06 + s * 0.06;
    lights.push(lantern(g, lx, ly, s * 0.05, L, 0));
  }
  return lights;
}

const FLOWERS = ["#fff4d0", "#f6b6c8", "#ffffff", "#c8b6f0", "#ffd36a"];

function paint(time: TimeOfDay, W: number, H: number, kind: "observatory" | "library"): Place {
  const L = SHINKAI[time];
  const c = makeCanvas(W, H);
  const g = ctx2d(c);
  const r = rng(kind === "observatory" ? 202 : 303);
  const horizon = 0.62;
  const sun: Pt =
    time === "night"
      ? [W * 0.2, H * 0.16]
      : [W * (time === "day" ? 0.3 : 0.18), H * (time === "day" ? 0.18 : 0.5)];
  sky(g, W, H, L, horizon);
  starfield(g, r, W, H, L.stars, 0.6);
  cirrus(g, r, W, H * 0.6, L, 5);
  cumulus(g, r, { x: W * 0.84, base: H * 0.6, w: W * 0.3, h: H * 0.38 }, L, sun, L.warm);
  cumulus(g, r, { x: W * 0.12, base: H * 0.58, w: W * 0.2, h: H * 0.2 }, L, sun, L.cool);
  /* The valley far below, in haze. */
  const far = (x: number) => H * (0.6 + 0.03 * Math.sin((x / W) * 5 + 1));
  hill(g, W, H, far, mix(L.haze, L.grass, 0.3), mix(L.haze, L.grassShade, 0.5));
  const lights: Light[] = [];
  if (L.lampGlow > 0.5) {
    for (let i = 0; i < 26; i++) {
      const x = r() * W;
      const y = H * (0.62 + r() * 0.05);
      g.fillStyle = rgb(L.lamp, 0.9);
      g.fillRect(x, y, 2, 2);
      lights.push([x, y, 10, 0.5]);
    }
  }
  const mid = (x: number) => H * (0.7 + 0.05 * Math.sin((x / W) * 3.4 + 2));
  hill(g, W, H, mid, mix(L.grass, L.haze, 0.35), mix(L.grassShade, L.haze, 0.3));
  let anchor: Pt;
  if (kind === "observatory") {
    /* The hilltop, rising to the right, the observatory on its crest. */
    const crest = (x: number) => H * (0.66 + 0.24 * Math.pow((x / W - 0.68) / 0.6, 2));
    hill(g, W, H, crest, L.grass, L.grassShade);
    meadow(g, r, W, H, crest, L, FLOWERS);
    const ox = W * 0.68;
    const og = crest(ox) + 4;
    lights.push(...observatory(g, ox, og, W * 0.13, L, sun));
    tree(g, r, W * 0.44, crest(W * 0.44) + 6, H * 0.22, L, sun);
    /* The path winding up, with lamps. */
    g.strokeStyle = rgb(mix([226, 210, 176], L.cloudShade, 0.25), 0.9);
    g.lineCap = "round";
    g.lineWidth = W * 0.012;
    g.beginPath();
    g.moveTo(W * 0.5, H);
    g.bezierCurveTo(W * 0.62, H * 0.92, W * 0.52, H * 0.82, ox - W * 0.02, og);
    g.stroke();
    for (const t of [0.25, 0.55, 0.82]) {
      const px = W * (0.5 + t * 0.14) + Math.sin(t * 6) * W * 0.02;
      const py = H - t * (H - og) - 4;
      lights.push(lantern(g, px + W * 0.03, py - H * 0.03, H * 0.022, L, H * 0.05));
    }
    anchor = [ox, og - W * 0.13];
  } else {
    /* A gentle green, the reading house on it, a stepping-stone path and a big tree. */
    const lawn = (x: number) => H * (0.74 + 0.03 * Math.sin((x / W) * 2.2));
    hill(g, W, H, lawn, L.grass, L.grassShade);
    meadow(g, r, W, H, lawn, L, FLOWERS);
    tree(g, r, W * 0.9, H * 0.86, H * 0.42, L, sun);
    const hx = W * 0.64;
    const hg = lawn(hx) + 6;
    lights.push(...readingHouse(g, r, hx, hg, W * 0.16, L, sun));
    for (let i = 0; i < 6; i++) {
      const t = i / 5;
      g.fillStyle = rgb(mix([210, 200, 184], L.cloudShade, 0.3));
      g.beginPath();
      g.ellipse(
        W * (0.6 - t * 0.12),
        hg + (H - hg) * (0.15 + t * 0.8),
        W * (0.012 + t * 0.016),
        H * (0.006 + t * 0.012),
        0,
        0,
        TAU
      );
      g.fill();
    }
    lights.push(lantern(g, W * 0.52, hg + H * 0.06, H * 0.028, L, H * 0.07));
    lights.push(lantern(g, W * 0.75, hg + H * 0.08, H * 0.028, L, H * 0.07));
    anchor = [hx, hg - W * 0.1];
  }
  return { canvas: c, sun, lights, anchor };
}

export const renderObservatoryPlace = (time: TimeOfDay, W: number, H: number) =>
  paint(time, W, H, "observatory");
export const renderLibraryPlace = (time: TimeOfDay, W: number, H: number) =>
  paint(time, W, H, "library");
