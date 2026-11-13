/*
 * The Library's opening, high up (founder, 2026-11-08: "start the hero split in the sky and then
 * maybe even in space, and then … pan us back down to the scene"). Two skies, painted in code and
 * then in brushwork by painterly.ts, meet on the diagonal (seam.ts). Below them sits a bank of
 * cloud the camera falls through on the way down to the ground scenes (scenes.ts).
 *
 * The hour sets the sky: by day a high, bright sky fading to deep blue at the top, with things
 * that fly in it (sky-day.ts: a balloon and kites, a lettered kite and paper planes); at dawn and
 * sunset the glow low down; only at night deep space:
 *
 * - Math: a ringed planet with its moons on perfect elliptical orbits, and constellations drawn
 *   as a triangle, a square and a hexagon.
 * - Reading and Writing: a nebula whose wisps are ink and letters, and constellations shaped like
 *   an open book and a quill.
 */
import { LIGHT, type TimeOfDay } from "../light";
import { mix, rgb, rng, type Color } from "../noise";
import { Studio } from "../studio";
import { hslColor } from "./motifs";
import type { Tint } from "./scenes";
import { dayMath, dayPlan, dayReading, type DayMath, type DayReading } from "./sky-day";
import type { Layout, Slug } from "./seam";

const TAU = Math.PI * 2;
type Pt = [number, number];

export interface Planet {
  /** Center (fractions), radius as a fraction of the width, ring and orbit tilt in radians. */
  x: number;
  y: number;
  r: number;
  tilt: number;
  /** Orbits as multiples of the radius: [across, down]. */
  orbits: Pt[];
}

export interface MathSky {
  /** At night: the ringed planet and its orbits. */
  planet?: Planet;
  /** At night: the constellations. */
  figures: Pt[][];
  /** By day: the balloon, kites and birds. */
  day?: DayMath;
}

export interface ReadingSky {
  /** At night the nebula; by day the kite. Letters drift away from its middle. */
  nebula: { x: number; y: number; r: number };
  /** By day: the kite, its lettered tail and the paper planes. */
  day?: DayReading;
  /** Points along the nebula's wisps (fractions), where letters drift from. */
  wisps: Pt[];
  figures: Pt[][];
}

export interface SkyPicture {
  src: HTMLCanvasElement;
  /** Background stars for the life layer to twinkle (fractions). */
  stars: [number, number, number][];
  math?: MathSky;
  reading?: ReadingSky;
}

const hexagon = (x: number, y: number, r: number, aspect: number): Pt[] =>
  Array.from({ length: 7 }, (_, i) => {
    const a = (i / 6) * TAU + Math.PI / 6;
    return [x + Math.cos(a) * r, y + (Math.sin(a) * r) / aspect];
  });

/** An open book as a constellation: two page tops and the spine, joined. */
const bookStars = (x: number, y: number, w: number, aspect: number): Pt[] => {
  const h = (w * 0.45) / aspect;
  return [
    [x - w, y - h * 0.1],
    [x - w * 0.55, y - h * 0.55],
    [x, y - h * 0.3],
    [x + w * 0.55, y - h * 0.55],
    [x + w, y - h * 0.1],
    [x + w * 0.9, y + h * 0.55],
    [x, y + h * 0.75],
    [x - w * 0.9, y + h * 0.55],
    [x - w, y - h * 0.1],
  ];
};

/** A quill as a constellation: the nib up to the feather's tip, and the vane's two edges. */
const quillStars = (x: number, y: number, len: number, aspect: number): Pt[] => {
  const d = (u: number, v: number): Pt => [x + u * len, y - (v * len) / aspect];
  return [d(0, 0), d(0.18, 0.32), d(0.36, 0.62), d(0.52, 0.95), d(0.28, 0.66), d(0.18, 0.32)];
};

type NightMath = { planet: Planet; figures: Pt[][] };

interface SkyPlan {
  math: NightMath;
  reading: Omit<ReadingSky, "wisps">;
}

function plan(layout: Layout, aspect: number): SkyPlan {
  if (layout === "wide") {
    return {
      math: {
        planet: {
          x: 0.18,
          y: 0.66,
          r: 0.07,
          tilt: -0.32,
          orbits: [
            [3.1, 1.0],
            [4.4, 1.45],
          ],
        },
        figures: [
          [
            [0.42, 0.09],
            [0.54, 0.16],
            [0.41, 0.23],
            [0.42, 0.09],
          ],
          [
            [0.09, 0.36],
            [0.16, 0.36],
            [0.16, 0.36 + 0.07 / aspect],
            [0.09, 0.36 + 0.07 / aspect],
            [0.09, 0.36],
          ],
          hexagon(0.47, 0.42, 0.045, aspect),
        ],
      },
      reading: {
        nebula: { x: 0.8, y: 0.3, r: 0.2 },
        figures: [bookStars(0.5, 0.78, 0.07, aspect), quillStars(0.9, 0.86, 0.075, aspect)],
      },
    };
  }
  return {
    math: {
      planet: {
        x: 0.27,
        y: 0.42,
        r: 0.1,
        tilt: -0.28,
        orbits: [
          [2.9, 1.0],
          [3.9, 1.35],
        ],
      },
      figures: [
        [
          [0.66, 0.29],
          [0.86, 0.26],
          [0.8, 0.36],
          [0.66, 0.29],
        ],
        [
          [0.1, 0.1],
          [0.22, 0.1],
          [0.22, 0.1 + 0.12 / aspect],
          [0.1, 0.1 + 0.12 / aspect],
          [0.1, 0.1],
        ],
      ],
    },
    reading: {
      nebula: { x: 0.7, y: 0.56, r: 0.34 },
      figures: [bookStars(0.26, 0.86, 0.13, aspect), quillStars(0.8, 0.9, 0.13, aspect)],
    },
  };
}

/** Each subject's sky leans its own way, so the diagonal reads even at rest: Math clear and
 *  cool, Reading and Writing warm and rosy. */
const SKY_TINT: Record<Slug, Color> = { math: [40, 150, 190], "reading-writing": [200, 110, 170] };

/** The sky's colors for this hour: deep at the top, the hour's glow low down. */
function skyColors(k: Studio, tint: Color) {
  const { C, L } = k;
  const space: Color = [3, 6, 20];
  const lean = 0.16 + L.dark * 0.06;
  const top = mix(mix(C.top, space, 0.45 + L.dark * 0.5), tint, lean * 0.6);
  const mid = mix(mix(C.top, C.low, 0.35), tint, lean);
  const low = mix(mix(C.low, [255, 255, 255], 0.1 * (1 - L.dark)), tint, lean * 0.5);
  return { top, mid, low };
}

function paintSky(k: Studio, slug: Slug, seed: number): [number, number, number][] {
  const starDensity = 1;
  const { g, W, H, L } = k;
  const { top, mid, low } = skyColors(k, SKY_TINT[slug]);
  const gr = g.createLinearGradient(0, 0, 0, H);
  gr.addColorStop(0, rgb(top));
  gr.addColorStop(0.55, rgb(mid));
  gr.addColorStop(1, rgb(low));
  g.fillStyle = gr;
  g.fillRect(0, 0, W, H);
  /* Stars: many at night, a few high up at dawn and dusk, faint ones at the very top by day. */
  const r = rng(seed);
  const stars: [number, number, number][] = [];
  /* Stars only at night, and a very few high up at dawn and dusk. Never in daylight. */
  const n = Math.round(starDensity * (L.dark > 0.5 ? 280 : L.dark > 0.1 ? 24 : 0));
  for (let i = 0; i < n; i++) {
    const u = r();
    const v = Math.pow(r(), L.dark > 0.5 ? 1.1 : 2.2) * (L.dark > 0.5 ? 0.9 : 0.6);
    const s = r() < 0.07 ? 2.2 : 1 + r() * 0.6;
    const a = (L.dark > 0.5 ? 0.55 : 0.35) * (1 - v * (L.dark > 0.5 ? 0.3 : 1.3)) + r() * 0.3;
    g.fillStyle = rgb([236, 238, 252], Math.max(0, Math.min(1, a)));
    g.beginPath();
    g.arc(u * W, v * H, s, 0, TAU);
    g.fill();
    if (s > 2 && stars.length < 60) stars.push([u, v, s]);
  }
  /* A bank of cloud along the bottom, where the way down begins. */
  k.clouds(5, 0.88, 0.98);
  return stars;
}

function mathSky(k: Studio, accent: Color, p: NightMath) {
  const { g, W, H, C, L } = k;
  const night = L.dark > 0.5;
  const { planet } = p;
  const px = planet.x * W;
  const py = planet.y * H;
  const pr = planet.r * W;
  const ringC = mix(mix([226, 210, 180], accent, 0.2), C.lit, 0.3);
  const ring = (front: boolean) => {
    g.save();
    g.translate(px, py);
    g.rotate(planet.tilt);
    for (let i = 0; i < 4; i++) {
      g.strokeStyle = rgb(mix(ringC, C.deep, i * 0.12), 0.75 - i * 0.12);
      g.lineWidth = pr * (0.14 - i * 0.02);
      g.beginPath();
      g.ellipse(
        0,
        0,
        pr * (1.7 + i * 0.18),
        pr * (0.36 + i * 0.04),
        0,
        front ? 0 : Math.PI,
        front ? Math.PI : TAU
      );
      g.stroke();
    }
    g.restore();
  };
  /* Orbits: perfect ellipses around the planet, each with its moon. */
  g.save();
  g.translate(px, py);
  g.rotate(planet.tilt);
  for (const [a, b] of planet.orbits) {
    g.strokeStyle = rgb(mix(C.lit, [255, 255, 255], 0.4), night ? 0.4 : 0.5);
    g.lineWidth = Math.max(1.5, W * 0.0022);
    g.beginPath();
    g.ellipse(0, 0, pr * a, pr * b, 0, 0, TAU);
    g.stroke();
  }
  g.restore();
  ring(false);
  /* The planet: lit from the low glow, banded, shaded on the far side. */
  const body = mix(mix(accent, [214, 160, 110], 0.5), C.deep, night ? 0.25 : 0.05);
  const sx = px - pr * 0.4;
  const sy = py - pr * 0.45;
  const gr = g.createRadialGradient(sx, sy, pr * 0.1, px, py, pr * 1.05);
  gr.addColorStop(0, rgb(mix(body, [255, 245, 225], 0.45)));
  gr.addColorStop(0.7, rgb(body));
  gr.addColorStop(1, rgb(mix(body, C.deep, 0.65)));
  g.fillStyle = gr;
  g.beginPath();
  g.arc(px, py, pr, 0, TAU);
  g.fill();
  g.save();
  g.beginPath();
  g.arc(px, py, pr, 0, TAU);
  g.clip();
  for (let i = -3; i <= 3; i++) {
    g.strokeStyle = rgb(mix(body, i % 2 ? C.deep : [255, 240, 220], 0.25), 0.45);
    g.lineWidth = pr * 0.11;
    g.beginPath();
    g.ellipse(px, py + i * pr * 0.27, pr * 1.1, pr * 0.12, planet.tilt, 0, TAU);
    g.stroke();
  }
  g.restore();
  ring(true);
  /* Moons on the orbits. */
  planet.orbits.forEach(([a, b], i) => {
    const t = i ? 2.3 : 5.4;
    const mx = Math.cos(t) * pr * a;
    const my = Math.sin(t) * pr * b;
    const x = px + mx * Math.cos(planet.tilt) - my * Math.sin(planet.tilt);
    const y = py + mx * Math.sin(planet.tilt) + my * Math.cos(planet.tilt);
    g.fillStyle = rgb(mix([236, 232, 222], C.lit, 0.3));
    g.beginPath();
    g.arc(x, y, pr * (i ? 0.16 : 0.12), 0, TAU);
    g.fill();
  });
  /* The constellations: bright stars, faint lines between them. */
  for (const fig of p.figures) {
    g.strokeStyle = rgb([236, 240, 255], night ? 0.35 : 0.42);
    g.lineWidth = Math.max(1.2, W * 0.0016);
    g.beginPath();
    fig.forEach(([u, v], i) => (i ? g.lineTo(u * W, v * H) : g.moveTo(u * W, v * H)));
    g.stroke();
    for (const [u, v] of fig) {
      g.fillStyle = rgb([255, 250, 236], 0.95);
      g.beginPath();
      g.arc(u * W, v * H, Math.max(2.2, W * 0.004), 0, TAU);
      g.fill();
    }
  }
}

const LETTERS = "abcdefghijklmnopqrstuvwxyz";

function readingSky(k: Studio, accent: Color, p: Omit<ReadingSky, "wisps">, font: string): Pt[] {
  const { g, W, H, C, L } = k;
  const night = L.dark > 0.5;
  const { nebula: n } = p;
  const nx = n.x * W;
  const ny = n.y * H;
  const nr = n.r * W;
  const r = rng(97);
  /* The nebula: a long, tilted drift of soft color (the painting's hue, a rose and a teal),
     brightest along its spine. */
  const tilt = -0.45;
  const along = (d: number, off: number): Pt => [
    nx + Math.cos(tilt) * d - Math.sin(tilt) * off,
    ny + Math.sin(tilt) * d + Math.cos(tilt) * off,
  ];
  const hues: Color[] = [accent, [222, 128, 178], [104, 190, 200], [240, 214, 236]];
  for (let i = 0; i < 46; i++) {
    const d = (r() - 0.5) * nr * 1.8;
    const off = (r() - 0.5) * nr * 0.55 * (1 - Math.abs(d) / (nr * 1.1));
    const [x, y] = along(d, off);
    const rr = nr * (0.12 + r() * 0.22);
    const c = mix(hues[i % 4], C.lit, night ? 0.05 : 0.3);
    const gr = g.createRadialGradient(x, y, 0, x, y, rr);
    gr.addColorStop(0, rgb(c, night ? 0.3 : 0.24));
    gr.addColorStop(1, rgb(c, 0));
    g.fillStyle = gr;
    g.fillRect(x - rr, y - rr, rr * 2, rr * 2);
  }
  /* The wisps: long ink strokes curling off the nebula's spine, with letters set along them. */
  const wisps: Pt[] = [];
  const ink = night ? mix(accent, [236, 226, 255], 0.6) : mix(accent, [255, 255, 255], 0.55);
  const letterInk = night ? [246, 238, 255] : [255, 255, 255];
  g.font = `${Math.round(nr * 0.12)}px ${font}`;
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.lineCap = "round";
  for (let w = 0; w < 7; w++) {
    const start = (r() - 0.5) * nr * 1.4;
    const side = r() < 0.5 ? -1 : 1;
    const curl = (0.8 + r() * 0.8) * side;
    const pts: Pt[] = [];
    for (let i = 0; i <= 26; i++) {
      const t = i / 26;
      const d = start + t * nr * 0.7 * (start > 0 ? 1 : -1);
      const off = Math.sin(t * Math.PI * curl) * nr * 0.28 + side * t * t * nr * 0.35;
      pts.push(along(d, off));
    }
    g.strokeStyle = rgb(ink, night ? 0.4 : 0.5);
    g.lineWidth = nr * (0.022 - w * 0.0018);
    g.beginPath();
    pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
    g.stroke();
    for (let i = 5; i < pts.length; i += 4) {
      const [x, y] = pts[i];
      const [x2, y2] = pts[Math.min(pts.length - 1, i + 1)];
      g.save();
      g.translate(x, y);
      g.rotate(Math.atan2(y2 - y, x2 - x));
      g.fillStyle = rgb(letterInk, 0.85);
      g.fillText(LETTERS[Math.floor(r() * LETTERS.length)], 0, -nr * 0.06);
      g.restore();
      wisps.push([x / W, y / H]);
    }
  }
  /* The constellations. */
  for (const fig of p.figures) {
    g.strokeStyle = rgb([236, 240, 255], night ? 0.35 : 0.42);
    g.lineWidth = Math.max(1.2, W * 0.0016);
    g.beginPath();
    fig.forEach(([u, v], i) => (i ? g.lineTo(u * W, v * H) : g.moveTo(u * W, v * H)));
    g.stroke();
    for (const [u, v] of fig) {
      g.fillStyle = rgb([255, 250, 236], 0.95);
      g.beginPath();
      g.arc(u * W, v * H, Math.max(2.2, W * 0.004), 0, TAU);
      g.fill();
    }
  }
  return wisps;
}

/** Composes one of the two skies for a screen of this layout and aspect (height / width). */
export function renderSky(
  slug: Slug,
  layout: Layout,
  time: TimeOfDay,
  tint: Tint,
  aspect: number,
  font: string
): SkyPicture {
  const accent = hslColor(tint.hue, Math.max(40, tint.sat), 50);
  const w = layout === "wide" ? 760 : 480;
  const h = Math.max(200, Math.round(w * aspect));
  const L = LIGHT[time] ?? LIGHT.day;
  const k = new Studio(w, h, { ...L, sunAt: [0.5, 1.4] }, 777);
  const stars = paintSky(k, slug, slug === "math" ? 11 : 13);
  if (time !== "night") {
    const d = dayPlan(layout, aspect);
    if (slug === "math") {
      dayMath(k, accent, d.math);
      return { src: k.c, stars, math: { figures: [], day: d.math } };
    }
    const wisps = dayReading(k, accent, d.reading, font);
    const [kx, ky, ks] = d.reading.kite;
    return {
      src: k.c,
      stars,
      reading: { nebula: { x: kx, y: ky, r: ks }, wisps, figures: [], day: d.reading },
    };
  }
  const p = plan(layout, aspect);
  if (slug === "math") {
    mathSky(k, accent, p.math);
    return { src: k.c, stars, math: p.math };
  }
  const wisps = readingSky(k, accent, p.reading, font);
  return { src: k.c, stars, reading: { ...p.reading, wisps } };
}

/** The cloud bank between the sky and the ground, which the camera falls through. */
export function renderClouds(layout: Layout, time: TimeOfDay, aspect: number): HTMLCanvasElement {
  const w = layout === "wide" ? 640 : 400;
  const h = Math.max(200, Math.round(w * aspect));
  const L = LIGHT[time] ?? LIGHT.day;
  const k = new Studio(w, h, { ...L, sunAt: [0.5, 0.2] }, 909);
  const { g, C } = k;
  const gr = g.createLinearGradient(0, 0, 0, h);
  gr.addColorStop(0, rgb(mix(C.low, C.cloud, 0.5)));
  gr.addColorStop(1, rgb(mix(C.haze, C.cloudShade, 0.4)));
  g.fillStyle = gr;
  g.fillRect(0, 0, w, h);
  k.clouds(9, 0.05, 0.4);
  k.clouds(9, 0.35, 0.7);
  k.clouds(9, 0.6, 0.95);
  return k.c;
}
