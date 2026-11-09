/*
 * Karman's ten landscapes. Same scene at every hour; only the light changes.
 * The finished picture is broken into brush strokes by painterly.ts, which paints it in.
 * Ported from prototypes/today-directions/landscapes.js (founder approved, 2026-11-08).
 */
import { LIGHT, type TimeOfDay } from "./light";
import { mix, rgb } from "./noise";
import { Studio } from "./studio";

/** The season a painting shows. Its falling particles follow it: snow in winter, leaves only in
 *  autumn, petals in spring, slow motes in summer (founder, 2026-11-08: no autumn leaves over
 *  the winter cabin). */
export type Season = "fall" | "winter" | "spring" | "summer";

interface Scene {
  title: string;
  season: Season;
  paint(k: Studio): void;
}

const SCENES: Scene[] = [
  {
    title: "Evergreens by the mountain lake",
    season: "summer",
    paint(k) {
      k.sky(0.6);
      k.clouds(4, 0.05, 0.3);
      k.sun();
      k.range({ base: 0.6, top: 0.32, amp: 0.22, s: 3, far: 0.5 });
      k.range({
        base: 0.6,
        top: 0.4,
        amp: 0.14,
        freq: 3,
        s: 7,
        snow: 0.35,
        peak: [0.72, 0.18, 0.9],
        x0: 0.35,
      });
      k.mist(0.58, 0.04);
      k.forest(0.6, { height: 0.035, from: 0.2, to: 1, density: 2, far: 0.3 });
      k.lake(0.61);
      k.ground(0.9, "#3f5a35", "#6d8a45");
      k.rock(0.6, 0.93, 0.03);
      k.rock(0.66, 0.95, 0.045);
      k.grass(0.9, 0.55, 1);
      for (const [x, y, h] of [
        [0.72, 0.97, 0.36],
        [0.8, 0.98, 0.5],
        [0.88, 0.96, 0.44],
        [0.95, 1, 0.62],
      ])
        k.pine(x, y, h);
      k.bush(0.76, 0.99, 0.06);
      k.flowers(0.93, 0.55, 0.75, 40, ["#f4e3a0", "#e8a0b8"]);
      k.frame();
    },
  },
  {
    title: "River through the misty valley",
    season: "spring",
    paint(k) {
      k.sky(0.5);
      k.clouds(5, 0.05, 0.28);
      k.sun();
      k.range({ base: 0.58, top: 0.26, amp: 0.2, s: 11, far: 0.3, snow: 0.3 });
      k.mist(0.55, 0.05, 0.35);
      k.range({ base: 0.68, top: 0.44, amp: 0.16, freq: 2.6, s: 13, far: 0.15 });
      k.mist(0.65, 0.04, 0.35);
      k.forest(0.66, { height: 0.04, from: 0, to: 1, density: 1.6, far: 0.3 });
      k.hill(0.8, 0.14, 2, 5, "#6d8a45", "#2f4a28");
      k.river(
        [
          [0.63, 0.67],
          [0.6, 0.72],
          [0.66, 0.79],
          [0.58, 0.88],
          [0.5, 1.02],
        ],
        0.004,
        0.06
      );
      k.rock(0.55, 0.9, 0.025);
      k.rock(0.6, 0.97, 0.035);
      k.grass(0.82, 0.3, 1);
      k.tree(0.84, 0.94, 0.48, ["#4f7a35", "#7aa045", "#355a28"]);
      k.tree(0.94, 0.97, 0.38, ["#5a8038", "#8aa84a"]);
      k.bush(0.74, 0.97, 0.07);
      k.flowers(0.86, 0.3, 0.75, 60, ["#f6e08a", "#f0f0f0"]);
      k.frame();
    },
  },
  {
    title: "Cabin in the winter woods",
    season: "winter",
    paint(k) {
      k.sky(0.55);
      k.clouds(3, 0.05, 0.22);
      k.sun();
      k.range({ base: 0.6, top: 0.3, amp: 0.22, s: 21, snow: 0.8, far: 0.3 });
      k.mist(0.58, 0.05);
      k.forest(0.62, { height: 0.04, from: 0, to: 1, density: 1.6, far: 0.35 });
      k.ground(0.62, "#e9eef4", "#c3cedb", 0.6);
      const { g, W, H } = k;
      const X = W * 0.64;
      const Y = H * 0.8;
      g.fillStyle = "#4a3326";
      g.fillRect(X, Y - H * 0.08, W * 0.09, H * 0.08);
      g.fillStyle = "#5a3a2a";
      g.fillRect(X + W * 0.07, Y - H * 0.135, W * 0.012, H * 0.045);
      g.fillStyle = rgb(k.C.snow);
      g.beginPath();
      g.moveTo(X - W * 0.012, Y - H * 0.075);
      g.lineTo(X + W * 0.045, Y - H * 0.14);
      g.lineTo(X + W * 0.102, Y - H * 0.075);
      g.fill();
      g.fillStyle = "#f6c56b";
      g.fillRect(X + W * 0.02, Y - H * 0.055, W * 0.018, H * 0.025);
      g.fillRect(X + W * 0.055, Y - H * 0.055, W * 0.018, H * 0.025);
      for (const [x, y, h] of [
        [0.52, 0.86, 0.32],
        [0.8, 0.9, 0.48],
        [0.9, 0.95, 0.6],
        [0.98, 0.99, 0.7],
        [0.58, 0.95, 0.4],
      ])
        k.pine(x, y, h, 1);
    },
  },
  {
    title: "Autumn forest on the lake",
    season: "fall",
    paint(k) {
      k.sky(0.55);
      k.clouds(4, 0.06, 0.3);
      k.sun();
      k.range({ base: 0.56, top: 0.38, amp: 0.15, s: 31, far: 0.7 });
      k.mist(0.55, 0.04);
      k.forest(0.58, {
        height: 0.08,
        from: 0,
        to: 1,
        density: 2.2,
        kind: "round",
        colors: ["#c8642c", "#e0a03a", "#a83a24", "#6d7a2c"],
        rowH: 0.012,
      });
      k.forest(0.59, { height: 0.09, from: 0.1, to: 0.9, density: 0.4, colors: ["#23402e"] });
      k.lake(0.6, 0.25);
      k.ground(0.93, "#5a4a2a", "#8a6a3a");
      k.tree(0.86, 0.96, 0.5, ["#d0702e", "#eab048", "#b8452a"]);
      k.grass(0.92, 0.6, 1, ["#9a7a3a", "#c8a050"]);
    },
  },
  {
    title: "Waves on the rocky shore",
    season: "summer",
    paint(k) {
      k.sky(0.52);
      k.clouds(6, 0.05, 0.35);
      k.sun(0.04);
      const { g, W, H, C } = k;
      for (let y = H * 0.52; y < H * 0.86; y += 2) {
        const t = (y - H * 0.52) / (H * 0.34);
        g.fillStyle = rgb(C.water.map((v, i) => v * (1 - t * 0.35) + C.deep[i] * t * 0.35));
        g.fillRect(0, y, W, 2);
      }
      for (let i = 0; i < 260; i++) {
        const y = H * (0.53 + Math.pow(k.r(), 1.4) * 0.3);
        const x = k.r() * W;
        const w = 6 + k.r() * 40 * (y / H);
        g.fillStyle = `rgba(255,255,255,${0.12 + k.r() * 0.3})`;
        g.fillRect(x, y, w, 1.5);
      }
      for (let j = 0; j < 3; j++) {
        const y0 = H * (0.7 + j * 0.06);
        g.strokeStyle = "rgba(255,255,255,.85)";
        g.lineWidth = 2 + j;
        g.beginPath();
        for (let x = 0; x < W * 0.7; x += 6) g.lineTo(x, y0 + Math.sin(x * 0.02 + j) * 4);
        g.stroke();
        for (let i = 0; i < 40; i++) {
          g.fillStyle = `rgba(255,255,255,${0.4 + k.r() * 0.5})`;
          g.beginPath();
          g.arc(k.r() * W * 0.7, y0 + (k.r() - 0.2) * 10, 2 + k.r() * 6, 0, 6.283);
          g.fill();
        }
      }
      k.range({
        base: 0.95,
        top: 0.5,
        amp: 0.2,
        freq: 3,
        s: 41,
        x0: 0.6,
        x1: 1.02,
        peak: [0.8, 0.42, 1.2],
      });
      k.forest(0.5, { height: 0.05, from: 0.66, to: 0.95, density: 1, far: 0.1 });
      for (let i = 0; i < 90; i++) {
        g.fillStyle = `rgba(255,255,255,${0.5 + k.r() * 0.4})`;
        g.beginPath();
        g.arc(W * (0.55 + k.r() * 0.12), H * (0.82 + k.r() * 0.08), 4 + k.r() * 14, 0, 6.283);
        g.fill();
      }
      k.ground(0.88, "#d6c08a", "#a8946a", 0.5);
      g.fillStyle = rgb(C.water, 0.35);
      g.fillRect(0, H * 0.88, W * 0.6, H * 0.03);
      for (const [x, y, s2] of [
        [0.62, 0.95, 0.04],
        [0.7, 0.98, 0.06],
        [0.52, 0.93, 0.025],
      ])
        k.rock(x, y, s2);
      k.bush(0.92, 1, 0.1, ["#4a5a35", "#7a8a45"]);
    },
  },
  {
    title: "The old oak in the meadow",
    season: "summer",
    paint(k) {
      k.sky(0.58);
      k.clouds(7, 0.05, 0.36);
      k.sun();
      k.range({ base: 0.58, top: 0.44, amp: 0.1, s: 51, far: 0.85 });
      k.mist(0.56, 0.04);
      k.hill(0.66, 0.08, 1.6, 52, "#6d8a3e", "#3f5a2e");
      k.forest(0.62, { height: 0.04, from: 0, to: 0.5, density: 1.2, kind: "round", far: 0.3 });
      k.forest(0.64, { height: 0.05, from: 0.55, to: 0.75, density: 0.8, kind: "round", far: 0.2 });
      k.hill(0.78, 0.1, 1.2, 53, "#9aae4e", "#5a7a35");
      k.ground(0.85, "#8aa045", "#c2b65a");
      const { g, W, H } = k;
      g.fillStyle = rgb(mix([210, 190, 140], k.C.deep, k.C.dark * 0.75), 0.75);
      g.beginPath();
      g.moveTo(W * 0.5, H);
      g.quadraticCurveTo(W * 0.6, H * 0.85, W * 0.7, H * 0.74);
      g.lineTo(W * 0.715, H * 0.74);
      g.quadraticCurveTo(W * 0.66, H * 0.86, W * 0.62, H);
      g.fill();
      k.tree(0.8, 0.88, 0.62, ["#3f6a2e", "#6d9a3e", "#2f5226"]);
      k.grass(0.8, 0, 1, ["#9ab050", "#d0c060", "#6a8a3a"]);
      k.flowers(0.82, 0.3, 1, 220, ["#f4d24a", "#ffffff", "#c86ab0", "#e86a4a"]);
      k.bush(0.95, 0.99, 0.08);
      k.rock(0.42, 0.93, 0.03);
    },
  },
  {
    title: "Waterfall in the deep forest",
    season: "summer",
    paint(k) {
      k.sky(0.4);
      k.sun(0.025);
      k.forest(0.42, { height: 0.12, from: 0, to: 1, density: 2, far: 0.6 });
      k.hill(0.8, 0.36, 3, 62, "#2f4a2a", "#1e3020");
      k.forest(0.5, { height: 0.1, from: 0, to: 1, density: 2, far: 0.35 });
      k.range({
        base: 0.85,
        top: 0.4,
        amp: 0.1,
        freq: 4,
        s: 61,
        x0: 0.5,
        x1: 0.85,
        peak: [0.67, 0.34, 0.6],
      });
      const { g, W, H } = k;
      for (let i = 0; i < 120; i++) {
        const x = W * (0.645 + k.r() * 0.05);
        const y = H * (0.36 + k.r() * 0.42);
        const h = 20 + k.r() * 60;
        g.fillStyle = `rgba(255,255,255,${0.4 + k.r() * 0.5})`;
        g.fillRect(x, y, 1.5 + k.r() * 2, h);
      }
      k.forest(0.62, { height: 0.18, from: 0, to: 0.48, density: 1.5 });
      k.forest(0.62, { height: 0.2, from: 0.86, to: 1, density: 1.5 });
      k.lake(0.78, 0.45);
      for (let i = 0; i < 60; i++) {
        g.fillStyle = `rgba(255,255,255,${0.4 + k.r() * 0.5})`;
        g.beginPath();
        g.arc(W * (0.62 + k.r() * 0.1), H * (0.78 + k.r() * 0.03), 3 + k.r() * 10, 0, 6.283);
        g.fill();
      }
      for (const [x, y, h] of [
        [0.55, 0.98, 0.5],
        [0.93, 1, 0.66],
      ])
        k.pine(x, y, h);
    },
  },
  {
    title: "Twin peaks over the glacier lake",
    season: "summer",
    paint(k) {
      k.sky(0.55);
      k.clouds(3, 0.04, 0.2);
      k.sun();
      k.range({ base: 0.58, top: 0.36, amp: 0.15, s: 71, far: 0.6 });
      k.range({
        base: 0.58,
        top: 0.3,
        amp: 0.08,
        s: 72,
        snow: 0.6,
        peak: [0.58, 0.14, 1.3],
        x0: 0.3,
        x1: 0.72,
      });
      k.range({
        base: 0.58,
        top: 0.3,
        amp: 0.08,
        s: 73,
        snow: 0.6,
        peak: [0.8, 0.2, 1.2],
        x0: 0.62,
        x1: 1.02,
      });
      k.mist(0.56, 0.03);
      k.forest(0.59, { height: 0.03, from: 0, to: 1, density: 1.8, far: 0.2 });
      k.lake(0.6, 0.45);
      k.g.fillStyle = "rgba(60,170,170,.18)";
      k.g.fillRect(0, k.H * 0.6, k.W, k.H * 0.4);
      k.ground(0.94, "#4a5a3a", "#7a7a55");
      for (const [x, y, h] of [
        [0.68, 0.98, 0.34],
        [0.94, 1, 0.5],
      ])
        k.pine(x, y, h);
    },
  },
  {
    title: "Birches at the edge of the marsh",
    season: "summer",
    paint(k) {
      k.sky(0.6);
      k.clouds(5, 0.06, 0.32);
      k.sun();
      k.range({ base: 0.6, top: 0.48, amp: 0.08, s: 81, far: 0.85 });
      k.mist(0.6, 0.05);
      k.forest(0.62, { height: 0.06, from: 0, to: 1, density: 1.5, kind: "round", far: 0.25 });
      k.lake(0.63, 0.35);
      const { g, W, H } = k;
      k.ground(0.86, "#5a6a35", "#8a8a45");
      const reed = rgb(
        k.C.deep.map((v, j) => v + [70, 60, 30][j] * (1 - k.C.dark)),
        0.9
      );
      for (let i = 0; i < 500; i++) {
        const x = W * (0.25 + k.r() * 0.75);
        const y = H * (0.8 + k.r() * 0.2);
        const h = H * (0.03 + k.r() * 0.09);
        g.strokeStyle = reed;
        g.lineWidth = 1.2;
        g.beginPath();
        g.moveTo(x, y);
        g.lineTo(x + (k.r() - 0.4) * 8, y - h);
        g.stroke();
      }
      for (const [x, y] of [
        [0.76, 0.92],
        [0.82, 0.95],
        [0.9, 0.91],
      ]) {
        g.fillStyle = "#ece6da";
        g.fillRect(W * x, H * 0.2, W * 0.008, H * (y - 0.2));
        for (let j = 0; j < 14; j++) {
          g.fillStyle = "#2a2422";
          g.fillRect(
            W * x,
            H * (0.22 + j * 0.05 + k.r() * 0.02),
            W * (0.003 + k.r() * 0.005),
            H * 0.006
          );
        }
      }
      k.tree(0.84, 0.5, 0.5, ["#c9b44a", "#e0cc6a", "#8aa04a"]);
      k.flowers(0.86, 0.4, 1, 60, ["#f6e08a", "#c88ad0"]);
      k.frame(["#2a3a22", "#4a5a2e"]);
    },
  },
  {
    title: "Path through the pine forest",
    season: "spring",
    paint(k) {
      k.sky(0.5);
      k.clouds(4, 0.04, 0.22);
      k.sun();
      k.range({ base: 0.55, top: 0.34, amp: 0.15, s: 101, far: 0.55, snow: 0.3 });
      k.mist(0.52, 0.04, 0.5);
      k.forest(0.56, { height: 0.06, from: 0, to: 1, density: 2, far: 0.35 });
      k.hill(0.62, 0.04, 2, 102, "#5d7a3e", "#2f4a28");
      k.ground(0.6, "#4f6a35", "#7a8a45");
      const { g, W, H } = k;
      g.fillStyle = rgb(mix([200, 175, 120], k.C.deep, k.C.dark * 0.75), 0.85);
      g.beginPath();
      g.moveTo(W * 0.48, H);
      g.quadraticCurveTo(W * 0.56, H * 0.75, W * 0.6, H * 0.6);
      g.lineTo(W * 0.615, H * 0.6);
      g.quadraticCurveTo(W * 0.64, H * 0.78, W * 0.72, H);
      g.fill();
      k.grass(0.62, 0, 1);
      k.flowers(0.7, 0.3, 1, 90, ["#f6e08a", "#ffffff", "#c88ad0"]);
      const pines = [
        [0.42, 0.72, 0.28],
        [0.46, 0.8, 0.4],
        [0.38, 0.9, 0.55],
        [0.3, 1, 0.75],
        [0.74, 0.72, 0.3],
        [0.79, 0.8, 0.42],
        [0.86, 0.9, 0.58],
        [0.95, 1, 0.8],
      ];
      for (const [x, y, h] of pines) k.pine(x, y, h);
      k.rock(0.66, 0.94, 0.03);
      k.bush(0.56, 0.99, 0.05);
    },
  },
];

export const PAINTING_TITLES: readonly string[] = SCENES.map((s) => s.title);
export const PAINTING_SEASONS: readonly Season[] = SCENES.map((s) => s.season);
export const PAINTING_COUNT = SCENES.length;

/** The picture is always painted at this size, then cropped to cover the screen. */
export const PICTURE_W = 960;
export const PICTURE_H = 600;

const cache = new Map<string, HTMLCanvasElement>();

/** Renders scene i in a light. Cached, since each takes a moment. */
export function renderLandscape(i: number, time: TimeOfDay): HTMLCanvasElement {
  const key = `${i}:${time}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const n = ((i % SCENES.length) + SCENES.length) % SCENES.length;
  const k = new Studio(PICTURE_W, PICTURE_H, LIGHT[time] ?? LIGHT.day, 1000 + n * 97);
  SCENES[n].paint(k);
  cache.set(key, k.c);
  return k.c;
}
