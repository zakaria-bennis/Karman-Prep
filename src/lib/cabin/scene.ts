// The sign-in pages' own place: a log cabin in snowy woods, drawn entirely in code on one canvas. In light
// mode it is sunrise under a purple dawn sky; in dark mode a foggy night under the northern lights. Still
// things (sky, mountains, hills, forest, snow, the cabin) are painted once into layers; each frame then
// slides the layers a little (depth) and paints what lives: stars, the northern lights, drifting fog, chimney
// smoke, the light in the windows, deer crossing behind the cabin, birds and falling snow.
import {
  drawBirds,
  drawDeer,
  drawFog,
  drawGlow,
  drawSmoke,
  drawSnow,
  drawTwinkle,
  makeLife,
  type Life,
} from "./life";
import { cabinParts, drawCabin, drawPine, hill, mountains, type Needle, type Rock } from "./shapes";

export type CabinMode = "dawn" | "night";

export type Palette = {
  sky: [string, string, string, string, string];
  stars: number;
  farRange: Rock;
  nearRange: Rock;
  hills: [string, string];
  hillSnow: string;
  hillTrees: string;
  forest: [string, string, string];
  treeSnow: string;
  treeSnowShade: string;
  snow: [string, string];
  drift: string;
  haze: string;
  /** how thick the fog lies, 0 to 1 */
  fog: number;
  silhouette: string;
  logs: [string, string];
  roofSnow: string;
  roofShade: string;
  front: string;
};

export const PALETTES: Record<CabinMode, Palette> = {
  dawn: {
    sky: ["#2b2763", "#684a9d", "#bd6aa0", "#f4987c", "#ffd49c"],
    stars: 26,
    farRange: { body: "#9482c0", shade: "#7a68aa", snow: "#ffdcd6", snowShade: "#dcaecb" },
    nearRange: { body: "#7463a6", shade: "#5b4b8c", snow: "#ffe9e0", snowShade: "#cba6cc" },
    hills: ["#8573ae", "#6c5b98"],
    hillSnow: "rgba(255, 226, 220, 0.8)",
    hillTrees: "#5a4b86",
    forest: ["#5c5090", "#413870", "#2b2552"],
    treeSnow: "#fdeae8",
    treeSnowShade: "#b3a0cf",
    snow: ["#f3d2de", "#8478b8"],
    drift: "rgba(96, 78, 150, 0.26)",
    haze: "rgba(255, 196, 170, 0.34)",
    fog: 0.6,
    silhouette: "#2a2248",
    logs: ["#6e4634", "#5b392b"],
    roofSnow: "#fff1ec",
    roofShade: "#b9a8d2",
    front: "#17132e",
  },
  night: {
    sky: ["#040714", "#0b1232", "#18224e", "#27325f", "#3d4878"],
    stars: 210,
    farRange: { body: "#2a3468", shade: "#1f2853", snow: "#8f9bd6", snowShade: "#5f6aa8" },
    nearRange: { body: "#212a5a", shade: "#171f46", snow: "#a8b4ec", snowShade: "#6772b4" },
    hills: ["#1f2856", "#182046"],
    hillSnow: "rgba(150, 165, 235, 0.42)",
    hillTrees: "#111838",
    forest: ["#1a234c", "#121a3a", "#0a1026"],
    treeSnow: "#b2bdf2",
    treeSnowShade: "#5a67a8",
    snow: ["#4a5796", "#192150"],
    drift: "rgba(8, 12, 44, 0.36)",
    haze: "rgba(120, 136, 210, 0.3)",
    fog: 1.7,
    silhouette: "#080c20",
    logs: ["#4d3126", "#3e271f"],
    roofSnow: "#cdd6ff",
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
  phone: boolean;
};

export function place(w: number, h: number): Place {
  const phone = w < 760;
  const u = phone ? w / 600 : Math.min(w / 1440, h / 800);
  const horizon = h * (phone ? 0.3 : 0.56);
  return {
    w,
    h,
    u,
    horizon,
    cabinX: phone ? w * 0.4 : w * 0.29,
    cabinY: horizon + (phone ? 104 : 118) * u,
    cabinW: 330 * u,
    phone,
  };
}

/** The layers, back to front, and how far each slides for depth (in scene units). The cabin moves with the
 *  snow it stands on. */
const SKY = 0;
const RANGE = 1;
const HILLS = 2;
const WOODS = 3;
const GROUND = 4;
const CABIN = 5;
const FRONT = 6;
const DEPTH = [3, 7, 12, 18, 27, 27, 56];
const MARGIN = 64;

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
  const night = mode === "night";
  const X0 = -MARGIN;
  const X1 = w + MARGIN;
  const bottom = h + MARGIN;
  const needle = (col: string): Needle => ({
    col,
    snow: pal.treeSnow,
    snowShade: pal.treeSnowShade,
  });

  // the sky: its colours, the stars, and the moon in its halo or the sun just coming up
  const sky = layer(pl, dpr, (c) => {
    const g = c.createLinearGradient(0, -MARGIN, 0, horizon + 20 * u);
    [0, 0.34, 0.66, 0.88, 1].forEach((at, i) => g.addColorStop(at, pal.sky[i]));
    c.fillStyle = g;
    c.fillRect(X0, -MARGIN, X1 - X0, h + MARGIN * 2);
    const r = rng(11);
    for (let i = 0; i < pal.stars; i++) {
      const x = X0 + r() * (X1 - X0);
      const y = -MARGIN + r() ** 1.7 * (horizon * 0.82 + MARGIN);
      const s = (0.5 + r() * 1.1) * Math.max(0.8, u);
      // the fog near the ground swallows the low stars
      c.globalAlpha = (0.3 + r() * 0.7) * (night ? 1 - (y / horizon) * 0.7 : 0.55);
      c.fillStyle = r() > 0.8 ? "#ffe9c4" : "#ffffff";
      c.beginPath();
      c.arc(x, y, s, 0, 7);
      c.fill();
    }
    c.globalAlpha = 1;
    if (night) {
      const mx = w * (pl.phone ? 0.8 : 0.6);
      const my = horizon * (pl.phone ? 0.3 : 0.24);
      const halo = c.createRadialGradient(mx, my, 0, mx, my, 280 * u);
      halo.addColorStop(0, "rgba(214, 222, 255, 0.4)");
      halo.addColorStop(0.2, "rgba(170, 182, 255, 0.16)");
      halo.addColorStop(1, "rgba(160, 172, 255, 0)");
      c.fillStyle = halo;
      c.fillRect(mx - 300 * u, my - 300 * u, 600 * u, 600 * u);
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
      // the sun, half up behind the mountains, and the light it throws along the horizon
      const sx = pl.phone ? w * 0.74 : pl.cabinX + pl.cabinW * 1.25;
      const sy = horizon - 236 * u;
      const glow = c.createRadialGradient(sx, sy, 0, sx, sy, 640 * u);
      glow.addColorStop(0, "rgba(255, 236, 190, 0.95)");
      glow.addColorStop(0.12, "rgba(255, 196, 140, 0.6)");
      glow.addColorStop(0.45, "rgba(255, 150, 140, 0.2)");
      glow.addColorStop(1, "rgba(255, 150, 160, 0)");
      c.fillStyle = glow;
      c.fillRect(X0, -MARGIN, X1 - X0, horizon + MARGIN + 40 * u);
      c.fillStyle = "#fff3d2";
      c.beginPath();
      c.arc(sx, sy, 40 * u, 0, 7);
      c.fill();
      // a few long clouds, soft at the edges, lit pink from below
      const rc = rng(5);
      for (let i = 0; i < 6; i++) {
        const cx = X0 + rc() * (X1 - X0);
        const cy = horizon * (0.14 + rc() * 0.42);
        for (let j = 0; j < 5; j++) {
          const lw = (120 + rc() * 170) * u;
          const lh = (11 + rc() * 12) * u;
          const lx = cx + (j - 2) * 90 * u + (rc() - 0.5) * 40 * u;
          const ly = cy + (rc() - 0.5) * 12 * u;
          c.save();
          c.translate(lx, ly);
          c.scale(lw / lh, 1);
          const cg = c.createRadialGradient(0, lh * 0.3, 0, 0, 0, lh);
          cg.addColorStop(0, "rgba(255, 204, 180, 0.42)");
          cg.addColorStop(0.6, "rgba(214, 150, 190, 0.2)");
          cg.addColorStop(1, "rgba(180, 130, 200, 0)");
          c.fillStyle = cg;
          c.fillRect(-lh, -lh, lh * 2, lh * 2);
          c.restore();
        }
      }
    }
  });

  // two ranges of mountains, the further one paler
  const range = layer(pl, dpr, (c) => {
    mountains(c, X0, X1, horizon + 10 * u, 330 * u, 330 * u, rng(3), pal.farRange, bottom);
    const far = c.createLinearGradient(0, horizon - 300 * u, 0, horizon + 20 * u);
    far.addColorStop(0, "rgba(255,255,255,0)");
    far.addColorStop(1, pal.haze);
    c.fillStyle = far;
    c.fillRect(X0, horizon - 300 * u, X1 - X0, 320 * u);
    mountains(c, X0, X1, horizon + 16 * u, 210 * u, 240 * u, rng(8), pal.nearRange, bottom);
    const hz = c.createLinearGradient(0, horizon - 130 * u, 0, horizon + 20 * u);
    hz.addColorStop(0, "rgba(255,255,255,0)");
    hz.addColorStop(1, pal.haze);
    c.fillStyle = hz;
    c.fillRect(X0, horizon - 130 * u, X1 - X0, 150 * u);
  });

  // rolling hills with far-off trees on their crests, then the first band of forest
  const band = (
    c: CanvasRenderingContext2D,
    seed: number,
    size: number,
    gap: number,
    base: number,
    col: string,
    clear: number
  ) => {
    const r = rng(seed);
    for (let x = X0 - 20; x < X1 + 20; x += gap * u * (0.55 + r() * 0.9)) {
      const hh = size * u * (0.62 + r() * 0.75);
      if (clear && Math.abs(x - pl.cabinX) < pl.cabinW * clear && r() > 0.12) continue;
      drawPine(c, x, base + r() * 10 * u, hh, needle(col), r);
    }
  };
  const hills = layer(pl, dpr, (c) => {
    hill(
      c,
      X0,
      X1,
      horizon + 14 * u,
      120 * u,
      0.0034 / u,
      1.2,
      pal.hills[0],
      pal.hillSnow,
      pal.hillTrees,
      rng(14),
      bottom
    );
    hill(
      c,
      X0,
      X1,
      horizon + 22 * u,
      78 * u,
      0.0056 / u,
      4.4,
      pal.hills[1],
      pal.hillSnow,
      pal.hillTrees,
      rng(15),
      bottom
    );
    band(c, 21, 84, 24, horizon + 16 * u, pal.forest[0], 0);
  });
  const woods = layer(pl, dpr, (c) => band(c, 34, 156, 46, horizon + 40 * u, pal.forest[1], 0.55));

  // the snow: drifts, sparkle, half-buried rocks, footprints up to the door, and the nearer trees
  const ground = layer(pl, dpr, (c) => {
    const top = horizon + 30 * u;
    const g = c.createLinearGradient(0, top, 0, bottom);
    g.addColorStop(0, pal.snow[0]);
    g.addColorStop(1, pal.snow[1]);
    const r = rng(55);
    const wave = (y: number, amp: number, f: number, ph: number) => (x: number) =>
      y + Math.sin(x * f + ph) * amp + Math.sin(x * f * 2.3 + ph * 1.7) * amp * 0.4;
    const fillTo = (edge: (x: number) => number, style: string | CanvasGradient) => {
      c.beginPath();
      c.moveTo(X0, bottom);
      for (let x = X0; x <= X1; x += 8) c.lineTo(x, edge(x));
      c.lineTo(X1, bottom);
      c.closePath();
      c.fillStyle = style;
      c.fill();
    };
    fillTo(wave(top, 9 * u, 0.006 / u, 1), g);
    for (let i = 0; i < 5; i++) {
      const y = top + (36 + i * 62 + r() * 30) * u * (pl.phone ? 1.5 : 1);
      const edge = wave(y, (10 + i * 5) * u, (0.004 + r() * 0.003) / u, r() * 6);
      const sh = c.createLinearGradient(0, y - 20 * u, 0, y + 90 * u);
      sh.addColorStop(0, "rgba(255,255,255,0)");
      sh.addColorStop(0.03, night ? "rgba(170, 184, 255, 0.16)" : "rgba(255, 240, 236, 0.5)");
      sh.addColorStop(0.14, pal.drift);
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
    mound.addColorStop(0, night ? "rgba(120,132,210,0.4)" : "rgba(255,244,240,0.75)");
    mound.addColorStop(1, "rgba(255,255,255,0)");
    c.fillStyle = mound;
    c.beginPath();
    c.ellipse(pl.cabinX, pl.cabinY + 14 * u, pl.cabinW * 1.1, 46 * u, 0, 0, 7);
    c.fill();

    // footprints: someone walked up to the door
    const door = cabinParts(pl).doorX;
    c.fillStyle = pal.drift;
    for (let i = 0; i < 26; i++) {
      const s = i / 25;
      const px = door + 6 * u + (pl.cabinW * 0.95 + (pl.phone ? 60 : 210) * u) * s ** 1.5;
      const py = pl.cabinY + 12 * u + (pl.phone ? 300 : 250) * u * s ** 1.25;
      const size = (2.6 + 5.4 * s) * u;
      c.beginPath();
      c.ellipse(
        px + (i % 2 ? 1 : -1) * size * 1.5 + Math.sin(s * 7) * 16 * u * s,
        py,
        size * 1.5,
        size * 0.7,
        0.35,
        0,
        7
      );
      c.fill();
    }
    // rocks half under the snow
    const rr = rng(63);
    for (let i = 0; i < (pl.phone ? 3 : 6); i++) {
      const rx = X0 + rr() * (X1 - X0);
      const ry = top + (70 + rr() * 260) * u;
      if (Math.abs(rx - pl.cabinX) < pl.cabinW) continue;
      const rs = (16 + rr() * 22) * u;
      c.fillStyle = pal.drift;
      c.beginPath();
      c.ellipse(rx + rs * 0.5, ry + rs * 0.22, rs * 1.5, rs * 0.3, 0, 0, 7);
      c.fill();
      c.fillStyle = pal.forest[2];
      c.beginPath();
      c.ellipse(rx, ry, rs, rs * 0.55, 0, Math.PI, 0);
      c.fill();
      c.fillStyle = pal.treeSnow;
      c.beginPath();
      c.ellipse(rx - rs * 0.08, ry - rs * 0.3, rs * 0.86, rs * 0.3, 0, Math.PI, 0);
      c.fill();
    }
    // the nearer trees, each with its long shadow on the snow
    const rt = rng(77);
    for (let i = 0; i < (pl.phone ? 5 : 10); i++) {
      const side = i % 2 ? 1 : -1;
      const x = pl.cabinX + side * (pl.cabinW * (0.95 + rt() * 2.7));
      const hh = (190 + rt() * 160) * u;
      const y = horizon + (70 + rt() * 56) * u;
      if (x < X0 || x > X1) continue;
      c.fillStyle = pal.drift;
      c.beginPath();
      c.ellipse(x - hh * 0.36, y + 4 * u, hh * 0.36, hh * 0.035, 0.03, 0, 7);
      c.fill();
      drawPine(c, x, y, hh, needle(pal.forest[2]), rt);
    }
    // sparkle on the crust
    const rs2 = rng(81);
    c.fillStyle = "#ffffff";
    for (let i = 0; i < 90; i++) {
      c.globalAlpha = 0.25 + rs2() * 0.55;
      c.beginPath();
      c.arc(
        X0 + rs2() * (X1 - X0),
        top + 20 * u + rs2() * (bottom - top),
        (0.5 + rs2() * 0.9) * u,
        0,
        7
      );
      c.fill();
    }
    c.globalAlpha = 1;
  });

  // the cabin itself (the deer pass between the snow and it)
  const cabin = layer(pl, dpr, (c) => {
    drawCabin(c, pl, pal, mode);
    // two young firs beside it
    const r = rng(96);
    drawPine(c, pl.cabinX - pl.cabinW * 0.72, pl.cabinY + 10 * u, 96 * u, needle(pal.forest[2]), r);
    drawPine(c, pl.cabinX - pl.cabinW * 0.86, pl.cabinY + 20 * u, 62 * u, needle(pal.forest[2]), r);
  });

  // two big dark pines close to the eye, framing the picture
  const front = layer(pl, dpr, (c) => {
    const r = rng(91);
    const big = Math.max(h * 0.95, 620 * u);
    drawPine(c, -big * 0.1, h + 80 * u, big, needle(pal.front), r);
    if (!pl.phone) drawPine(c, w + big * 0.12, h + 120 * u, big * 1.05, needle(pal.front), r);
    const v = c.createRadialGradient(
      w / 2,
      h * 0.52,
      h * 0.3,
      w / 2,
      h * 0.52,
      Math.hypot(w, h) * 0.62
    );
    v.addColorStop(0, "rgba(8, 6, 20, 0)");
    v.addColorStop(1, night ? "rgba(8, 6, 20, 0.55)" : "rgba(30, 16, 60, 0.42)");
    c.fillStyle = v;
    c.fillRect(X0, -MARGIN, X1 - X0, h + MARGIN * 2);
  });

  return {
    place: pl,
    mode,
    pal,
    layers: [sky, range, hills, woods, ground, cabin, front],
    life: makeLife(pl),
    dpr,
  };
}

export type Pointer = { px: number; py: number; wind: number };

/** Paint one frame. `t` is seconds since the page arrived; `dt` the seconds since the last frame. */
export function paint(c: CanvasRenderingContext2D, sc: Scene, t: number, dt: number, ptr: Pointer) {
  const { place: pl, pal, layers, life, dpr, mode } = sc;
  const { u, w, h } = pl;
  c.setTransform(dpr, 0, 0, dpr, 0, 0);
  // the picture breathes a little by itself, so it moves on a phone too
  const sx = ptr.px + Math.sin(t * 0.13) * 0.22;
  const sy = ptr.py * 0.6 + Math.sin(t * 0.09 + 1) * 0.1;
  const put = (i: number) => {
    const d = DEPTH[i] * u;
    c.drawImage(
      layers[i],
      -MARGIN - sx * d,
      -MARGIN - sy * d * 0.5,
      w + MARGIN * 2,
      h + MARGIN * 2
    );
    return [-sx * d, -sy * d * 0.5] as const;
  };
  put(SKY);
  drawTwinkle(c, pl, life, t, mode);
  if (mode === "night") aurora(c, pl, t);
  drawBirds(c, pl, life, t, pal.silhouette);
  put(RANGE);
  drawFog(c, pl, life, t, pal.fog, 0);
  put(HILLS);
  drawFog(c, pl, life, t, pal.fog, 1);
  put(WOODS);
  const [gx, gy] = put(GROUND);
  c.save();
  c.translate(gx, gy);
  drawDeer(c, pl, life, t, pal.silhouette);
  c.restore();
  drawFog(c, pl, life, t, pal.fog, 2);
  const [cx, cy] = put(CABIN);
  c.save();
  c.translate(cx, cy);
  drawSmoke(c, pl, life, t, dt, ptr.wind, mode);
  drawGlow(c, pl, t, mode);
  c.restore();
  drawSnow(c, pl, life, t, dt, ptr.wind, 0);
  put(FRONT);
  drawSnow(c, pl, life, t, dt, ptr.wind, 1);
}

/** The northern lights: slow green and violet curtains, night only. Painted small and stretched, so they are
 *  soft with no visible bands. */
let auroraCv: HTMLCanvasElement | null = null;
function aurora(c: CanvasRenderingContext2D, pl: Place, t: number) {
  const { w, horizon } = pl;
  const W = 224;
  const H = 112;
  if (!auroraCv) {
    auroraCv = document.createElement("canvas");
    auroraCv.width = W;
    auroraCv.height = H;
  }
  const a = auroraCv.getContext("2d")!;
  a.clearRect(0, 0, W, H);
  a.globalCompositeOperation = "lighter";
  for (let band = 0; band < 3; band++) {
    for (let x = 0; x < W; x += 2) {
      const k = x / W;
      const y =
        H * (0.42 + band * 0.17) +
        Math.sin(k * 5 + t * 0.12 + band * 2) * 13 +
        Math.sin(k * 11 - t * 0.07 + band) * 5;
      // the curtain hangs in rays of uneven length
      const tall = 38 + Math.sin(k * 9 + t * 0.21 + band) * 14 + Math.sin(k * 41 + band * 5) * 8;
      const al =
        (0.13 + 0.15 * Math.sin(k * 7 + t * 0.3 + band * 3) ** 2) *
        (band === 2 ? 0.5 : band ? 0.7 : 1);
      const g = a.createLinearGradient(0, y - tall, 0, y + 8);
      g.addColorStop(0, "rgba(170, 90, 255, 0)");
      g.addColorStop(0.4, `rgba(150, 110, 255, ${al * 0.5})`);
      g.addColorStop(0.72, `rgba(90, 190, 255, ${al * 0.7})`);
      g.addColorStop(0.92, `rgba(80, 255, 180, ${al})`);
      g.addColorStop(1, "rgba(80, 255, 180, 0)");
      a.fillStyle = g;
      a.fillRect(x, y - tall, 2, tall + 8);
    }
  }
  c.save();
  c.globalCompositeOperation = "lighter";
  c.imageSmoothingEnabled = true;
  c.imageSmoothingQuality = "high";
  c.drawImage(auroraCv, -20, -horizon * 0.16, w + 40, horizon * 0.98);
  c.restore();
}
