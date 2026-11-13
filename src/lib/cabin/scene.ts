// The sign-in pages' own place: a log cabin in snowy woods at dusk (light mode) or deep night (dark mode),
// drawn entirely in code on one canvas. Still things (sky, ridges, forest, snow, the cabin) are painted once
// into layers; each frame then slides the layers a little (depth) and paints what lives: the fire catching
// and burning, embers, chimney smoke, window light, deer crossing behind the cabin, birds, the northern
// lights and falling snow.
import { drawBirds, drawDeer, drawFire, drawSmoke, drawSnow, makeLife, type Life } from "./life";
import { drawCabin, drawPine, ridge } from "./shapes";

export type CabinMode = "dusk" | "night";

export type Palette = {
  sky: [string, string, string, string];
  stars: number;
  ridge: [string, string];
  ridgeSnow: string;
  forest: [string, string, string];
  treeSnow: string;
  snow: [string, string];
  drift: string;
  haze: string;
  silhouette: string;
  logs: [string, string];
  roofSnow: string;
  roofShade: string;
  front: string;
};

export const PALETTES: Record<CabinMode, Palette> = {
  dusk: {
    sky: ["#26335f", "#5a5c93", "#c98a86", "#f4c08d"],
    stars: 46,
    ridge: ["#7d7fa9", "#5f6592"],
    ridgeSnow: "rgba(255, 226, 205, 0.6)",
    forest: ["#56608a", "#3b4a6e", "#27344f"],
    treeSnow: "rgba(250, 232, 222, 0.75)",
    snow: ["#d9c6d2", "#6c74a6"],
    drift: "rgba(70, 78, 140, 0.3)",
    haze: "rgba(244, 192, 141, 0.3)",
    silhouette: "#2b2a44",
    logs: ["#6e4634", "#5b392b"],
    roofSnow: "#fbeee6",
    roofShade: "#a9a6cc",
    front: "#141a2e",
  },
  night: {
    sky: ["#050818", "#0e1438", "#232759", "#463863"],
    stars: 240,
    ridge: ["#2b3166", "#1e2450"],
    ridgeSnow: "rgba(190, 200, 255, 0.34)",
    forest: ["#1c2550", "#141b3d", "#0c1128"],
    treeSnow: "rgba(188, 200, 250, 0.5)",
    snow: ["#4b5693", "#1b2250"],
    drift: "rgba(10, 14, 44, 0.34)",
    haze: "rgba(110, 100, 170, 0.22)",
    silhouette: "#0a0e24",
    logs: ["#4d3126", "#3e271f"],
    roofSnow: "#c9d2ff",
    roofShade: "#5c66a6",
    front: "#04060f",
  },
};

/** A small repeatable random source, so the forest is the same forest on every visit. */
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Where things stand, worked out from the screen's shape. */
export type Place = {
  w: number;
  h: number;
  /** one "scene unit" in pixels */
  u: number;
  horizon: number;
  cabinX: number;
  cabinY: number;
  cabinW: number;
  fireX: number;
  fireY: number;
  phone: boolean;
};

export function place(w: number, h: number): Place {
  const phone = w < 760;
  const u = phone ? w / 600 : Math.min(w / 1440, h / 800);
  const horizon = h * (phone ? 0.3 : 0.56);
  const cabinW = 330 * u;
  const cabinX = phone ? w * 0.4 : w * 0.29;
  const cabinY = horizon + (phone ? 104 : 118) * u;
  return {
    w,
    h,
    u,
    horizon,
    cabinX,
    cabinY,
    cabinW,
    fireX: cabinX + cabinW * (phone ? 0.78 : 0.86),
    fireY: cabinY + 46 * u,
    phone,
  };
}

/** How far each layer slides for depth, in scene units. */
const DEPTH = [5, 11, 18, 26, 54];
const MARGIN = 60;

type Layer = HTMLCanvasElement;

export type Scene = {
  place: Place;
  mode: CabinMode;
  pal: Palette;
  layers: Layer[];
  life: Life;
  dpr: number;
};

function layer(pl: Place, dpr: number, paint: (c: CanvasRenderingContext2D) => void): Layer {
  const cv = document.createElement("canvas");
  cv.width = Math.ceil((pl.w + MARGIN * 2) * dpr);
  cv.height = Math.ceil((pl.h + MARGIN * 2) * dpr);
  const c = cv.getContext("2d")!;
  c.scale(dpr, dpr);
  c.translate(MARGIN, MARGIN);
  paint(c);
  return cv;
}

export function buildScene(w: number, h: number, mode: CabinMode, dpr: number): Scene {
  const pl = place(w, h);
  const pal = PALETTES[mode];
  const { u, horizon } = pl;
  const X0 = -MARGIN;
  const X1 = w + MARGIN;

  // 0: the sky, its stars, the moon or the last light, and two snowy ridges
  const sky = layer(pl, dpr, (c) => {
    const g = c.createLinearGradient(0, -MARGIN, 0, horizon + 20 * u);
    g.addColorStop(0, pal.sky[0]);
    g.addColorStop(0.45, pal.sky[1]);
    g.addColorStop(0.82, pal.sky[2]);
    g.addColorStop(1, pal.sky[3]);
    c.fillStyle = g;
    c.fillRect(X0, -MARGIN, X1 - X0, h + MARGIN * 2);
    const r = rng(11);
    for (let i = 0; i < pal.stars; i++) {
      const x = X0 + r() * (X1 - X0);
      const y = -MARGIN + r() ** 1.6 * (horizon * 0.9 + MARGIN);
      const s = (0.5 + r() * 1.1) * Math.max(0.8, u);
      c.globalAlpha = (0.35 + r() * 0.65) * (mode === "night" ? 1 : 0.7);
      c.fillStyle = r() > 0.8 ? "#ffe9c4" : "#ffffff";
      c.beginPath();
      c.arc(x, y, s, 0, 7);
      c.fill();
    }
    c.globalAlpha = 1;
    if (mode === "night") {
      const mx = w * (pl.phone ? 0.8 : 0.6);
      const my = horizon * (pl.phone ? 0.3 : 0.24);
      const halo = c.createRadialGradient(mx, my, 0, mx, my, 220 * u);
      halo.addColorStop(0, "rgba(214, 222, 255, 0.34)");
      halo.addColorStop(0.25, "rgba(160, 172, 255, 0.12)");
      halo.addColorStop(1, "rgba(160, 172, 255, 0)");
      c.fillStyle = halo;
      c.fillRect(mx - 240 * u, my - 240 * u, 480 * u, 480 * u);
      c.fillStyle = "#f3f1ff";
      c.beginPath();
      c.arc(mx, my, 26 * u, 0, 7);
      c.fill();
      c.fillStyle = "rgba(170, 176, 220, 0.5)";
      for (const [dx, dy, s] of [
        [-8, -6, 6],
        [7, 4, 8],
        [-3, 11, 4],
      ]) {
        c.beginPath();
        c.arc(mx + dx * u, my + dy * u, s * u, 0, 7);
        c.fill();
      }
    } else {
      const sx = pl.cabinX - 40 * u;
      const glow = c.createRadialGradient(sx, horizon, 0, sx, horizon, 620 * u);
      glow.addColorStop(0, "rgba(255, 226, 170, 0.75)");
      glow.addColorStop(0.3, "rgba(255, 180, 130, 0.3)");
      glow.addColorStop(1, "rgba(255, 170, 130, 0)");
      c.fillStyle = glow;
      c.fillRect(X0, -MARGIN, X1 - X0, horizon + MARGIN);
    }
    ridge(c, X0, X1, horizon - 6 * u, 150 * u, 0.0042 / u, 3, pal.ridge[0], pal.ridgeSnow, h);
    ridge(c, X0, X1, horizon + 4 * u, 96 * u, 0.0071 / u, 8, pal.ridge[1], pal.ridgeSnow, h);
    c.fillStyle = pal.haze;
    c.fillRect(X0, horizon - 90 * u, X1 - X0, 120 * u);
  });

  // 1 and 2: two bands of far forest, hazier the further back
  const band = (
    seed: number,
    size: number,
    gap: number,
    base: number,
    col: string,
    clear: number
  ) =>
    layer(pl, dpr, (c) => {
      const r = rng(seed);
      for (let x = X0 - 20; x < X1 + 20; x += gap * u * (0.55 + r() * 0.9)) {
        const hh = size * u * (0.62 + r() * 0.75);
        if (clear && Math.abs(x - pl.cabinX) < pl.cabinW * clear && r() > 0.12) continue;
        drawPine(c, x, base + r() * 10 * u, hh, col, pal.treeSnow, r);
      }
    });
  const far = band(21, 86, 26, horizon + 12 * u, pal.forest[0], 0);
  const mid = band(34, 150, 44, horizon + 38 * u, pal.forest[1], 0.55);

  // 3: the snow, with soft drifts, and the nearer trees at its edges
  const ground = layer(pl, dpr, (c) => {
    const top = horizon + 30 * u;
    const g = c.createLinearGradient(0, top, 0, h + MARGIN);
    g.addColorStop(0, pal.snow[0]);
    g.addColorStop(1, pal.snow[1]);
    const r = rng(55);
    const wave = (y: number, amp: number, f: number, ph: number) => (x: number) =>
      y + Math.sin(x * f + ph) * amp + Math.sin(x * f * 2.3 + ph * 1.7) * amp * 0.4;
    const fillTo = (edge: (x: number) => number, style: string | CanvasGradient) => {
      c.beginPath();
      c.moveTo(X0, h + MARGIN);
      for (let x = X0; x <= X1; x += 8) c.lineTo(x, edge(x));
      c.lineTo(X1, h + MARGIN);
      c.closePath();
      c.fillStyle = style;
      c.fill();
    };
    fillTo(wave(top, 9 * u, 0.006 / u, 1), g);
    for (let i = 0; i < 4; i++) {
      const y = top + (40 + i * 70 + r() * 30) * u * (pl.phone ? 1.5 : 1);
      const edge = wave(y, (10 + i * 5) * u, (0.004 + r() * 0.003) / u, r() * 6);
      const sh = c.createLinearGradient(0, y - 20 * u, 0, y + 90 * u);
      sh.addColorStop(0, "rgba(0,0,0,0)");
      sh.addColorStop(0.12, pal.drift);
      sh.addColorStop(1, "rgba(0,0,0,0)");
      fillTo(edge, sh);
    }
    // the rise the cabin stands on
    const mound = c.createRadialGradient(
      pl.cabinX,
      pl.cabinY - 6 * u,
      10 * u,
      pl.cabinX,
      pl.cabinY + 10 * u,
      pl.cabinW * 1.1
    );
    mound.addColorStop(0, mode === "night" ? "rgba(120,132,210,0.4)" : "rgba(255,246,238,0.7)");
    mound.addColorStop(1, "rgba(255,255,255,0)");
    c.fillStyle = mound;
    c.beginPath();
    c.ellipse(pl.cabinX, pl.cabinY + 14 * u, pl.cabinW * 1.1, 46 * u, 0, 0, 7);
    c.fill();
    const rt = rng(77);
    for (let i = 0; i < (pl.phone ? 5 : 9); i++) {
      const side = i % 2 ? 1 : -1;
      const x = pl.cabinX + side * (pl.cabinW * (0.95 + rt() * 2.6));
      if (x < X0 || x > X1) continue;
      const hh = (190 + rt() * 150) * u;
      drawPine(c, x, horizon + (70 + rt() * 50) * u, hh, pal.forest[2], pal.treeSnow, rt);
    }
  });

  // 4: the cabin itself (the deer pass between the snow and it)
  const cabin = layer(pl, dpr, (c) => drawCabin(c, pl, pal, mode));

  // 5: two big dark pines close to the eye, framing the picture
  const front = layer(pl, dpr, (c) => {
    const r = rng(91);
    const big = Math.max(h * 0.95, 620 * u);
    drawPine(c, -big * 0.1, h + 80 * u, big, pal.front, pal.treeSnow, r);
    if (!pl.phone) drawPine(c, w + big * 0.12, h + 120 * u, big * 1.05, pal.front, pal.treeSnow, r);
    const v = c.createRadialGradient(
      w / 2,
      h * 0.52,
      h * 0.3,
      w / 2,
      h * 0.52,
      Math.hypot(w, h) * 0.62
    );
    v.addColorStop(0, "rgba(8, 6, 20, 0)");
    v.addColorStop(1, "rgba(8, 6, 20, 0.55)");
    c.fillStyle = v;
    c.fillRect(X0, -MARGIN, X1 - X0, h + MARGIN * 2);
  });

  return {
    place: pl,
    mode,
    pal,
    layers: [sky, far, mid, ground, cabin, front],
    life: makeLife(pl),
    dpr,
  };
}

export type Pointer = { x: number; y: number; px: number; py: number; wind: number; warm: number };

/** Paint one frame. `t` is seconds since the page arrived; `dt` the seconds since the last frame. */
export function paint(c: CanvasRenderingContext2D, sc: Scene, t: number, dt: number, ptr: Pointer) {
  const { place: pl, pal, layers, life, dpr, mode } = sc;
  const { u, w, h } = pl;
  c.setTransform(dpr, 0, 0, dpr, 0, 0);
  // the picture breathes a little by itself, so it moves on a phone too
  const sx = ptr.px + Math.sin(t * 0.13) * 0.22;
  const sy = ptr.py * 0.6 + Math.sin(t * 0.09 + 1) * 0.1;
  const put = (i: number) => {
    const d = DEPTH[Math.min(i, DEPTH.length - 1)] * u;
    c.drawImage(
      layers[i],
      -MARGIN - sx * d,
      -MARGIN - sy * d * 0.5,
      w + MARGIN * 2,
      h + MARGIN * 2
    );
    return [-sx * d, -sy * d * 0.5] as const;
  };
  // the fire catches a moment after arriving, then settles
  const lit = Math.min(1, Math.max(0, (t - 1.1) / 1.9));
  const fire =
    (1 - (1 - lit) ** 3) * (1 + 0.5 * Math.max(0, 1 - Math.abs(t - 2.3) / 0.9)) + ptr.warm * 0.35;

  put(0);
  if (mode === "night") aurora(c, pl, t);
  drawBirds(c, pl, life, t, pal.silhouette);
  put(1);
  put(2);
  const [gx, gy] = put(3);
  c.save();
  c.translate(gx, gy);
  drawDeer(c, pl, life, t, pal.silhouette);
  c.restore();
  const [cx, cy] = put(4);
  c.save();
  c.translate(cx, cy);
  drawSmoke(c, pl, life, t, dt, ptr.wind, mode);
  drawFire(c, pl, life, t, dt, fire, mode);
  c.restore();
  drawSnow(c, pl, life, t, dt, ptr.wind, 0);
  put(5);
  drawSnow(c, pl, life, t, dt, ptr.wind, 1);
}

/** The northern lights: slow green and violet curtains, night only. Painted small and stretched, so they are
 *  soft with no visible bands. */
let auroraCv: HTMLCanvasElement | null = null;
function aurora(c: CanvasRenderingContext2D, pl: Place, t: number) {
  const { w, horizon } = pl;
  const W = 192;
  const H = 96;
  if (!auroraCv) {
    auroraCv = document.createElement("canvas");
    auroraCv.width = W;
    auroraCv.height = H;
  }
  const a = auroraCv.getContext("2d")!;
  a.clearRect(0, 0, W, H);
  a.globalCompositeOperation = "lighter";
  for (let band = 0; band < 2; band++) {
    for (let x = 0; x < W; x += 2) {
      const k = x / W;
      const y =
        H * (0.5 + band * 0.2) +
        Math.sin(k * 5 + t * 0.12 + band * 2) * 12 +
        Math.sin(k * 11 - t * 0.07) * 5;
      const tall = 40 + Math.sin(k * 9 + t * 0.21 + band) * 16;
      const al = (0.12 + 0.12 * Math.sin(k * 7 + t * 0.3 + band * 3) ** 2) * (band ? 0.6 : 1);
      const g = a.createLinearGradient(0, y - tall, 0, y + 8);
      g.addColorStop(0, "rgba(140, 90, 255, 0)");
      g.addColorStop(0.55, `rgba(110, 150, 255, ${al * 0.55})`);
      g.addColorStop(0.9, `rgba(80, 255, 190, ${al})`);
      g.addColorStop(1, "rgba(80, 255, 190, 0)");
      a.fillStyle = g;
      a.fillRect(x, y - tall, 2, tall + 8);
    }
  }
  c.save();
  c.globalCompositeOperation = "lighter";
  c.imageSmoothingEnabled = true;
  c.imageSmoothingQuality = "high";
  c.drawImage(auroraCv, -20, -horizon * 0.12, w + 40, horizon * 0.86);
  c.restore();
}
