/*
 * The Library's high sky by day, dawn and sunset (founder, 2026-11-08: "it doesn't make sense
 * that it's Saturn during the day, right above the clouds"). Space and planets only at night
 * (sky.ts); in daylight the sky holds things that fly:
 * - Math: a striped hot-air balloon whose gores are drawn as true ellipse arcs, two diamond kites
 *   on parabolic strings, and birds flying in a V.
 * - Reading and Writing: a kite whose long ribbon tail is written with letters, and paper planes
 *   folded from pages.
 * Positions are fractions of the picture.
 */
import { mix, rgb, type Color } from "../noise";
import type { Studio } from "../studio";
import type { Layout } from "./seam";

const TAU = Math.PI * 2;
type Pt = [number, number];

export interface DayMath {
  balloon: { x: number; y: number; r: number };
  /** Kite centers and half sizes (across, in width units). */
  kites: [number, number, number][];
  /** Where each kite's string leaves the picture (fractions). */
  anchor: Pt;
  birds: Pt;
}

export interface DayReading {
  kite: [number, number, number];
  /** The ribbon tail, as points (fractions). */
  tail: Pt[];
  planes: [number, number, number][];
}

export function dayPlan(layout: Layout, aspect: number): { math: DayMath; reading: DayReading } {
  const tail = (x: number, y: number, len: number, curl: number): Pt[] =>
    Array.from({ length: 28 }, (_, i) => {
      const t = i / 27;
      return [
        x - t * len * 0.75,
        y + (t * len * 0.9 + Math.sin(t * Math.PI * curl) * len * 0.12) / aspect,
      ];
    });
  if (layout === "wide") {
    return {
      math: {
        balloon: { x: 0.17, y: 0.6, r: 0.06 },
        kites: [
          [0.45, 0.13, 0.03],
          [0.5, 0.4, 0.025],
        ],
        anchor: [0.2, 1.05],
        birds: [0.1, 0.4],
      },
      reading: {
        kite: [0.82, 0.22, 0.04],
        tail: tail(0.82, 0.22 + 0.06 / aspect, 0.34, 2.2),
        planes: [
          [0.55, 0.82, 0.03],
          [0.9, 0.7, 0.025],
        ],
      },
    };
  }
  return {
    math: {
      balloon: { x: 0.27, y: 0.4, r: 0.1 },
      kites: [
        [0.72, 0.28, 0.05],
        [0.85, 0.12, 0.04],
      ],
      anchor: [0.95, 0.66],
      birds: [0.14, 0.12],
    },
    reading: {
      kite: [0.78, 0.55, 0.06],
      tail: tail(0.78, 0.55 + 0.09 / aspect, 0.5, 2),
      planes: [
        [0.25, 0.86, 0.05],
        [0.68, 0.92, 0.04],
      ],
    },
  };
}

/** A kite's diamond (fractions), long axis down. */
export function kiteDiamond([x, y, s]: [number, number, number], aspect: number): Pt[] {
  return [
    [x, y - (s * 1.1) / aspect],
    [x + s, y - (s * 0.2) / aspect],
    [x, y + (s * 1.6) / aspect],
    [x - s, y - (s * 0.2) / aspect],
  ];
}

/** A string from the kite down to its anchor, sagging like a parabola. */
export function kiteString(from: Pt, to: Pt): Pt[] {
  return Array.from({ length: 30 }, (_, i) => {
    const t = i / 29;
    const sag = 0.08 * 4 * t * (1 - t);
    return [from[0] + (to[0] - from[0]) * t - sag * 0.4, from[1] + (to[1] - from[1]) * t + sag];
  });
}

function poly(k: Studio, pts: Pt[]) {
  const { g, W, H } = k;
  g.beginPath();
  pts.forEach(([u, v], i) => (i ? g.lineTo(u * W, v * H) : g.moveTo(u * W, v * H)));
}

function kite(k: Studio, at: [number, number, number], a: Color, b: Color) {
  const { g, W, H, C } = k;
  const aspect = H / W;
  const d = kiteDiamond(at, aspect);
  /* Four panels, two colors, lit on the sun side. */
  const c: Pt = [at[0], at[1] - (at[2] * 0.2) / aspect];
  for (let i = 0; i < 4; i++) {
    poly(k, [c, d[i], d[(i + 1) % 4]]);
    g.fillStyle = rgb(mix(i % 2 ? a : b, C.lit, i < 2 ? 0.2 : 0));
    g.fill();
  }
  g.strokeStyle = rgb(mix(C.deep, a, 0.3), 0.8);
  g.lineWidth = Math.max(1.2, W * 0.002);
  poly(k, [d[0], d[2]]);
  g.stroke();
  poly(k, [d[1], d[3]]);
  g.stroke();
  /* A short bow tail. */
  const [bx, by] = d[2];
  for (let i = 1; i <= 3; i++) {
    const x = bx * W + Math.sin(i * 1.4) * W * 0.008;
    const y = by * H + i * H * 0.025;
    g.fillStyle = rgb(i % 2 ? a : b);
    g.beginPath();
    g.ellipse(x, y, W * 0.006, H * 0.005, 0.6, 0, TAU);
    g.fill();
  }
}

function birds(k: Studio, [x, y]: Pt, n: number, s: number, ink: Color) {
  const { g, W, H } = k;
  g.strokeStyle = rgb(ink, 0.75);
  g.lineWidth = Math.max(1.2, W * 0.0018);
  g.lineCap = "round";
  for (let i = 0; i < n; i++) {
    const row = Math.ceil(i / 2);
    const side = i % 2 ? -1 : 1;
    const bx = (x + row * s * 1.4) * W;
    const by = (y + side * row * s * 0.9) * H;
    const w = s * W;
    g.beginPath();
    g.moveTo(bx - w * 0.5, by - w * 0.12);
    g.quadraticCurveTo(bx - w * 0.2, by - w * 0.35, bx, by);
    g.quadraticCurveTo(bx + w * 0.2, by - w * 0.35, bx + w * 0.5, by - w * 0.12);
    g.stroke();
  }
}

/** Math by day: the balloon, two kites on their strings, birds in a V. */
export function dayMath(k: Studio, accent: Color, p: DayMath) {
  const { g, W, H, C, L } = k;
  const aspect = H / W;
  const warm: Color = [236, 184, 96];
  const cream = mix([246, 238, 220], C.lit, 0.2);
  /* Kite strings first, behind everything. */
  g.strokeStyle = rgb(mix(C.deep, C.lit, 0.4), 0.55);
  g.lineWidth = Math.max(1, W * 0.0014);
  for (const kt of p.kites) {
    const d = kiteDiamond(kt, aspect);
    poly(k, kiteString(d[2], p.anchor));
    g.stroke();
  }
  p.kites.forEach((kt, i) => kite(k, kt, i ? warm : accent, cream));
  /* The balloon: a rounded envelope of gores (ellipse arcs), then ropes and a basket. */
  const { x, y, r } = p.balloon;
  const bx = x * W;
  const by = y * H;
  const R = r * W;
  const env = () => {
    g.beginPath();
    g.moveTo(bx, by + R * 1.45);
    g.bezierCurveTo(bx - R * 0.6, by + R * 1.0, bx - R * 1.1, by + R * 0.4, bx - R, by - R * 0.1);
    g.bezierCurveTo(bx - R * 0.95, by - R * 1.1, bx + R * 0.95, by - R * 1.1, bx + R, by - R * 0.1);
    g.bezierCurveTo(bx + R * 1.1, by + R * 0.4, bx + R * 0.6, by + R * 1.0, bx, by + R * 1.45);
  };
  env();
  g.fillStyle = rgb(mix(cream, C.deep, L.dark * 0.3));
  g.fill();
  g.save();
  env();
  g.clip();
  for (let i = -3; i <= 3; i += 2) {
    g.fillStyle = rgb(mix(i % 4 === 1 || i % 4 === -3 ? accent : warm, C.deep, L.dark * 0.3));
    g.beginPath();
    g.ellipse(bx + (i * R) / 3.4, by, R * 0.16, R * 1.6, 0, 0, TAU);
    g.fill();
  }
  const shade = g.createLinearGradient(bx - R, 0, bx + R, 0);
  shade.addColorStop(0, rgb(C.lit, 0.25));
  shade.addColorStop(1, rgb(C.deep, 0.35));
  g.fillStyle = shade;
  g.fillRect(bx - R * 1.2, by - R * 1.3, R * 2.4, R * 3);
  g.restore();
  g.strokeStyle = rgb(mix(C.deep, [90, 60, 40], 0.4), 0.8);
  g.lineWidth = Math.max(1, R * 0.03);
  for (const s of [-1, 1]) {
    g.beginPath();
    g.moveTo(bx + s * R * 0.32, by + R * 1.3);
    g.lineTo(bx + s * R * 0.18, by + R * 1.75);
    g.stroke();
  }
  g.fillStyle = rgb(mix([150, 104, 64], C.deep, 0.2 + L.dark * 0.3));
  g.fillRect(bx - R * 0.2, by + R * 1.75, R * 0.4, R * 0.3);
  birds(k, p.birds, 5, 0.012, mix(C.deep, C.shade, 0.3));
}

/** A paper plane folded from a page, pointing up and to the right. */
function plane(k: Studio, [x, y, s]: [number, number, number], paper: Color, fold: Color) {
  const { g, W, H } = k;
  const X = x * W;
  const Y = y * H;
  const S = s * W;
  g.fillStyle = rgb(paper);
  g.beginPath();
  g.moveTo(X + S * 1.2, Y - S * 0.5);
  g.lineTo(X - S, Y - S * 0.1);
  g.lineTo(X - S * 0.3, Y + S * 0.05);
  g.closePath();
  g.fill();
  g.fillStyle = rgb(fold);
  g.beginPath();
  g.moveTo(X + S * 1.2, Y - S * 0.5);
  g.lineTo(X - S * 0.3, Y + S * 0.05);
  g.lineTo(X - S * 0.5, Y + S * 0.45);
  g.closePath();
  g.fill();
  /* A few lines of text on the page. */
  g.strokeStyle = rgb(fold, 0.8);
  g.lineWidth = Math.max(1, S * 0.04);
  for (let i = 1; i <= 3; i++) {
    g.beginPath();
    g.moveTo(X - S * (0.7 - i * 0.12), Y - S * (0.12 + i * 0.05));
    g.lineTo(X + S * (0.2 + i * 0.15), Y - S * (0.28 + i * 0.04));
    g.stroke();
  }
}

/** Reading and Writing by day: the letter-tailed kite and two paper planes. Returns where the
 *  letters sit on the tail (fractions), for the life layer to lift them off. */
export function dayReading(k: Studio, accent: Color, p: DayReading, font: string): Pt[] {
  const { g, W, H, C } = k;
  const rose: Color = [214, 120, 160];
  const cream = mix([248, 242, 228], C.lit, 0.2);
  /* The ribbon tail, with letters written along it. */
  g.strokeStyle = rgb(mix(rose, C.lit, 0.25), 0.85);
  g.lineCap = "round";
  g.lineWidth = Math.max(2, W * 0.006);
  poly(k, p.tail);
  g.stroke();
  const spots: Pt[] = [];
  g.font = `${Math.round(W * 0.016)}px ${font}`;
  g.textAlign = "center";
  g.textBaseline = "middle";
  const letters = "readwritethinkspeak";
  for (let i = 3; i < p.tail.length; i += 2) {
    const [u, v] = p.tail[i];
    const [u2, v2] = p.tail[Math.min(p.tail.length - 1, i + 1)];
    g.save();
    g.translate(u * W, v * H);
    g.rotate(Math.atan2((v2 - v) * H, (u2 - u) * W) - Math.PI / 2);
    g.fillStyle = rgb(mix(C.deep, accent, 0.3), 0.9);
    g.fillText(letters[(i >> 1) % letters.length], 0, -W * 0.012);
    g.restore();
    spots.push([u, v]);
  }
  kite(k, p.kite, rose, cream);
  for (const pl of p.planes) plane(k, pl, cream, mix(cream, C.shade, 0.35));
  return spots;
}
