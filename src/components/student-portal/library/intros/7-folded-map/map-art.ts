/*
 * Intro 7's old painted paper map, drawn in code: aged parchment, ink lines that wander like a
 * hand-held pen, and watercolor washes. painterly.ts then turns it into brushwork like every
 * Karman painting.
 *
 * - The folded map: both subjects' lands, split by the diagonal crease (seam.ts). Math lands: a
 *   lake crossed by the parabola bridge, a range with one sharp peak, terraced fields like a bar
 *   chart, pines. Reading and Writing lands: a meadow with an open book, a river running from its
 *   spine, a tree, a quill in its inkpot, flowers, soft hills.
 * - One subject's map: the same landmarks where its ground scene has them (scenes.ts anchors), so
 *   when the camera lowers into it the map lines up with the real landscape.
 * The paper takes the hour's light: rosy at dawn, plain by day, amber at sunset, moonlit at night.
 */
import { ctx2d, fbm, makeCanvas, rng } from "@/lib/painting/noise";
import type { TimeOfDay } from "@/lib/painting/light";
import type { LibraryPicture } from "@/lib/painting/library/scenes";
import type { Layout } from "@/lib/painting/library/seam";

type G = CanvasRenderingContext2D;
type Pt = [number, number];

const INK = "#3a2716";
const WATER = "#6f9fb3";
const GRASS = "#8fae63";
const MEADOW = "#a9c27a";
const STONE = "#a89a86";
const EARTH = "#c79f6a";

/** The table under the map, in this light. */
export const TABLE: Record<TimeOfDay, string> = {
  dawn: "#3b2a2c",
  day: "#4a3423",
  sunset: "#3a2219",
  night: "#0b0f1c",
};

class Pen {
  r: () => number;
  constructor(
    public g: G,
    public S: number,
    seed: number
  ) {
    this.r = rng(seed);
  }
  j(a: number) {
    return (this.r() - 0.5) * a * this.S;
  }
  /** An ink line through the points, wobbling a little, thicker in the middle. */
  line(pts: Pt[], w = 0.0022, color = INK, alpha = 0.85) {
    const { g } = this;
    g.save();
    g.strokeStyle = color;
    g.globalAlpha = alpha;
    g.lineCap = "round";
    g.lineJoin = "round";
    for (let pass = 0; pass < 2; pass++) {
      g.lineWidth = w * this.S * (pass ? 0.55 : 1);
      g.beginPath();
      pts.forEach(([x, y], i) => {
        const p: Pt = [x + this.j(0.002), y + this.j(0.002)];
        if (i === 0) g.moveTo(p[0], p[1]);
        else g.lineTo(p[0], p[1]);
      });
      g.stroke();
    }
    g.restore();
  }
  /** A watercolor wash: several soft, slightly shifted coats with a darker rim. */
  wash(path: Pt[], color: string, alpha = 0.32) {
    const { g } = this;
    g.save();
    g.fillStyle = color;
    for (let i = 0; i < 4; i++) {
      g.globalAlpha = alpha * (i === 0 ? 1 : 0.45);
      g.beginPath();
      path.forEach(([x, y], k) => {
        const p: Pt = [x + this.j(0.006), y + this.j(0.006)];
        if (k === 0) g.moveTo(p[0], p[1]);
        else g.lineTo(p[0], p[1]);
      });
      g.closePath();
      g.fill();
    }
    g.globalAlpha = alpha * 0.8;
    g.strokeStyle = color;
    g.lineWidth = 0.003 * this.S;
    g.stroke();
    g.restore();
  }
}

const blob = (cx: number, cy: number, rx: number, ry: number, seed: number, n = 28): Pt[] =>
  Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2;
    const k = 0.82 + 0.36 * fbm(Math.cos(a) * 1.4 + seed, Math.sin(a) * 1.4, seed, 3);
    return [cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k];
  });

/* ---------- Landmarks (positions in pixels, sizes as a fraction of S) ---------- */

function mountain(p: Pen, x: number, y: number, s: number, sharp = false) {
  const h = s * p.S * (sharp ? 1.5 : 1);
  const w = s * p.S * 0.95;
  const top: Pt = [x + p.j(0.004), y - h];
  p.wash([[x - w, y], top, [x + w, y]], STONE, 0.4);
  p.wash([top, [x + w, y], [x + w * 0.1, y]], "#6e6152", 0.28);
  p.line([[x - w, y], top, [x + w, y]], 0.0024);
  for (let i = 1; i < 5; i++) {
    const t = i / 5;
    const a: Pt = [top[0] + (w * 0.9 - 0) * t * 0.2, top[1] + h * t];
    p.line([a, [a[0] + w * 0.45 * (1 - t * 0.4), a[1] + h * 0.08]], 0.0012, INK, 0.5);
  }
  if (sharp) p.wash([top, [x - w * 0.3, y - h * 0.62], [x + w * 0.3, y - h * 0.62]], "#fff", 0.6);
}

function pine(p: Pen, x: number, y: number, s: number) {
  const h = s * p.S;
  p.wash(
    [
      [x, y - h],
      [x + h * 0.36, y - h * 0.1],
      [x - h * 0.36, y - h * 0.1],
    ],
    "#4f7a45",
    0.55
  );
  p.line(
    [
      [x - h * 0.36, y - h * 0.1],
      [x, y - h],
      [x + h * 0.36, y - h * 0.1],
    ],
    0.0016
  );
  p.line(
    [
      [x, y - h * 0.1],
      [x, y + h * 0.12],
    ],
    0.0016
  );
}

function lake(p: Pen, cx: number, cy: number, rx: number, ry: number) {
  const edge = blob(cx, cy, rx, ry, 3);
  p.wash(edge, WATER, 0.5);
  p.line([...edge, edge[0]], 0.0022);
  for (const k of [0.82, 0.64]) {
    const ring = blob(cx, cy, rx * k, ry * k, 3);
    p.line(ring.slice(2, 11), 0.0011, INK, 0.38);
    p.line(ring.slice(16, 24), 0.0011, INK, 0.38);
  }
}

function bridge(p: Pen, cx: number, y: number, span: number, accent: string) {
  const half = span / 2;
  const rise = span * 0.26;
  const arch: Pt[] = Array.from({ length: 17 }, (_, i) => {
    const x = cx - half + (i / 16) * span;
    return [x, y - rise * (1 - ((x - cx) / half) ** 2)];
  });
  const deck = y - rise * 1.18;
  p.wash(
    [
      [cx - half * 1.1, deck],
      [cx + half * 1.1, deck],
      [cx + half * 1.1, deck + rise * 0.12],
      [cx - half * 1.1, deck + rise * 0.12],
    ],
    accent,
    0.6
  );
  p.line(arch, 0.0026);
  p.line(
    [
      [cx - half * 1.1, deck],
      [cx + half * 1.1, deck],
    ],
    0.0024
  );
  for (let i = 1; i < 8; i++) {
    const x = cx - half + (i / 8) * span;
    p.line(
      [
        [x, deck],
        [x, y - rise * (1 - ((x - cx) / half) ** 2)],
      ],
      0.0013
    );
  }
}

function terraces(p: Pen, x0: number, base: number, w: number, step: number) {
  const bw = w / 5;
  for (let i = 0; i < 5; i++) {
    const h = step * (i + 1);
    const x = x0 + i * bw;
    const box: Pt[] = [
      [x, base],
      [x, base - h],
      [x + bw, base - h],
      [x + bw, base],
    ];
    p.wash(box, i % 2 ? GRASS : EARTH, 0.5);
    p.line([...box], 0.0018);
  }
}

function tree(p: Pen, x: number, y: number, s: number) {
  const r = s * p.S;
  const crown = blob(x, y - r * 1.4, r, r * 0.9, 9, 22);
  p.line(
    [
      [x, y],
      [x, y - r * 0.8],
    ],
    0.0035
  );
  p.wash(crown, "#5f8a45", 0.55);
  p.line([...crown, crown[0]], 0.002);
  for (let i = 0; i < 6; i++) {
    const a = p.r() * Math.PI * 2;
    const q: Pt = [x + Math.cos(a) * r * 0.5, y - r * 1.4 + Math.sin(a) * r * 0.45];
    p.line([q, [q[0] + r * 0.18, q[1] - r * 0.08]], 0.0012, INK, 0.5);
  }
}

function hills(p: Pen, x0: number, x1: number, y: number, s: number) {
  const n = 4;
  for (let i = 0; i < n; i++) {
    const a = x0 + ((x1 - x0) * i) / n;
    const b = a + ((x1 - x0) / n) * 1.3;
    const h = s * p.S * (0.7 + 0.5 * p.r());
    const arc: Pt[] = Array.from({ length: 12 }, (_, k) => {
      const t = k / 11;
      return [a + (b - a) * t, y - Math.sin(t * Math.PI) * h];
    });
    p.wash([...arc], GRASS, 0.42);
    p.line(arc, 0.0018);
  }
}

function river(p: Pen, pts: Pt[], w: number) {
  const left: Pt[] = pts.map(([x, y], i) => [x - w * (0.5 + i / pts.length), y]);
  const right: Pt[] = pts.map(([x, y], i) => [x + w * (0.5 + i / pts.length), y]);
  p.wash([...left, ...right.reverse()], WATER, 0.5);
  p.line(left, 0.0016);
  p.line(right.reverse(), 0.0016);
}

function book(p: Pen, cx: number, by: number, bw: number, accent: string) {
  const ph = bw * 0.62;
  for (const side of [-1, 1]) {
    const cover: Pt[] = [
      [cx, by + ph * 0.06],
      [cx + side * bw * 1.06, by],
      [cx + side * bw * 1.0, by - ph * 1.05],
      [cx, by - ph * 0.95],
    ];
    p.wash(cover, accent, 0.65);
    const page: Pt[] = [
      [cx, by],
      [cx + side * bw * 0.5, by + ph * 0.06],
      [cx + side * bw, by - ph * 0.04],
      [cx + side * bw * 0.94, by - ph],
      [cx + side * bw * 0.45, by - ph * 1.16],
      [cx, by - ph * 0.9],
    ];
    p.wash(page, "#fbf3df", 0.95);
    p.line([...page, page[0]], 0.002);
    for (let i = 1; i < 6; i++) {
      const y = by - ph * (0.9 - i * 0.14);
      p.line(
        [
          [cx + side * bw * 0.14, y],
          [cx + side * bw * 0.8, y + ph * 0.02],
        ],
        0.0011,
        INK,
        0.45
      );
    }
  }
}

function quill(p: Pen, x: number, y: number, s: number) {
  const h = s * p.S;
  const pot = blob(x, y - h * 0.18, h * 0.22, h * 0.18, 21, 16);
  p.wash(pot, "#2b3550", 0.75);
  p.line([...pot, pot[0]], 0.0018);
  const tip: Pt = [x, y - h * 0.3];
  const top: Pt = [x - h * 0.45, y - h * 1.3];
  p.wash(
    [tip, [top[0] - h * 0.18, top[1] + h * 0.3], top, [top[0] + h * 0.16, top[1] + h * 0.4]],
    "#f5efe2",
    0.85
  );
  p.line([tip, top], 0.0018);
}

function flowers(p: Pen, x: number, y: number, rx: number, ry: number, n: number) {
  const colors = ["#e8a0b8", "#f4e3a0", "#c8a0e0", "#ffffff"];
  const { g } = p;
  for (let i = 0; i < n; i++) {
    g.globalAlpha = 0.8;
    g.fillStyle = colors[i % colors.length];
    g.beginPath();
    g.arc(x + (p.r() - 0.5) * rx * 2, y + (p.r() - 0.5) * ry * 2, p.S * 0.0045, 0, Math.PI * 2);
    g.fill();
  }
  g.globalAlpha = 1;
}

function trail(p: Pen, pts: Pt[]) {
  const { g } = p;
  g.save();
  g.setLineDash([p.S * 0.008, p.S * 0.008]);
  p.line(pts, 0.0018, "#8a3b25", 0.7);
  g.restore();
}

/* ---------- Paper and light ---------- */

function paper(g: G, W: number, H: number, time: TimeOfDay) {
  const base = { dawn: "#eedac8", day: "#ecdcbc", sunset: "#efcfa4", night: "#d9cdb3" }[time];
  g.fillStyle = base;
  g.fillRect(0, 0, W, H);
  const img = g.getImageData(0, 0, W, H);
  const d = img.data;
  for (let y = 0; y < H; y += 2)
    for (let x = 0; x < W; x += 2) {
      const n = fbm(x / 180, y / 180, 77, 4) - 0.5;
      const e = Math.min(x, y, W - x, H - y) / (Math.min(W, H) * 0.18);
      const k = n * 34 - Math.max(0, 1 - e) * 46;
      for (const [dx, dy] of [
        [0, 0],
        [1, 0],
        [0, 1],
        [1, 1],
      ]) {
        const i = ((y + dy) * W + x + dx) * 4;
        if (i >= d.length) continue;
        d[i] += k;
        d[i + 1] += k * 0.92;
        d[i + 2] += k * 0.75;
      }
    }
  g.putImageData(img, 0, 0);
  /* A double ink border and a faint grid of lines, like an old survey. */
  const S = Math.min(W, H);
  const pen = new Pen(g, S, 5);
  const m = S * 0.035;
  for (const inset of [m, m * 1.35]) {
    pen.line(
      [
        [inset, inset],
        [W - inset, inset],
        [W - inset, H - inset],
        [inset, H - inset],
        [inset, inset],
      ],
      inset === m ? 0.003 : 0.0013,
      INK,
      0.6
    );
  }
  const step = S / 6;
  for (let x = m + step; x < W - m; x += step)
    pen.line(
      [
        [x, m],
        [x, H - m],
      ],
      0.0008,
      INK,
      0.14
    );
  for (let y = m + step; y < H - m; y += step)
    pen.line(
      [
        [m, y],
        [W - m, y],
      ],
      0.0008,
      INK,
      0.14
    );
}

/** The hour's light falling on the paper. */
function light(g: G, W: number, H: number, time: TimeOfDay) {
  g.save();
  if (time === "night") {
    g.fillStyle = "rgba(14, 22, 48, 0.55)";
    g.fillRect(0, 0, W, H);
    const lamp = g.createRadialGradient(
      W * 0.5,
      H * 0.45,
      0,
      W * 0.5,
      H * 0.45,
      Math.max(W, H) * 0.7
    );
    lamp.addColorStop(0, "rgba(255, 214, 150, 0.32)");
    lamp.addColorStop(1, "rgba(255, 214, 150, 0)");
    g.fillStyle = lamp;
    g.fillRect(0, 0, W, H);
  } else if (time !== "day") {
    const tint = time === "dawn" ? "255, 170, 160" : "255, 140, 60";
    const sun = g.createLinearGradient(0, 0, W, H);
    sun.addColorStop(0, `rgba(${tint}, 0.22)`);
    sun.addColorStop(1, `rgba(${tint}, 0.05)`);
    g.fillStyle = sun;
    g.fillRect(0, 0, W, H);
  }
  g.restore();
}

function canvasFor(w: number, h: number) {
  const W = Math.min(1100, Math.max(480, Math.round(w)));
  return makeCanvas(W, Math.round(W * (h / w)));
}

/* ---------- The two maps ---------- */

/** Landmark spots on the folded map, as fractions, per layout. */
const SPOTS = {
  wide: {
    lake: [0.16, 0.66, 0.11, 0.09],
    range: [0.05, 0.42, 0.13],
    terraces: [0.36, 0.5, 0.15],
    pines: [
      [0.06, 0.88],
      [0.3, 0.84],
      [0.5, 0.16],
    ],
    trail: [
      [0.08, 0.55],
      [0.2, 0.46],
      [0.32, 0.56],
      [0.45, 0.4],
    ],
    hills: [0.72, 1, 0.16],
    book: [0.82, 0.88, 0.065],
    river: [
      [0.93, 0.18],
      [0.86, 0.34],
      [0.95, 0.46],
      [0.88, 0.62],
      [0.82, 0.8],
    ],
    tree: [0.64, 0.33],
    quill: [0.52, 0.93],
    flowers: [0.62, 0.86, 0.12, 0.06],
  },
  tall: {
    lake: [0.24, 0.42, 0.18, 0.06],
    range: [0.1, 0.12, 0.08],
    terraces: [0.62, 0.36, 0.3],
    pines: [
      [0.08, 0.5],
      [0.85, 0.12],
    ],
    trail: [
      [0.15, 0.3],
      [0.4, 0.33],
      [0.55, 0.28],
    ],
    hills: [0.05, 0.6, 0.66],
    book: [0.3, 0.92, 0.12],
    river: [
      [0.85, 0.6],
      [0.75, 0.7],
      [0.85, 0.8],
      [0.7, 0.9],
    ],
    tree: [0.12, 0.84],
    quill: [0.86, 0.95],
    flowers: [0.55, 0.92, 0.2, 0.03],
  },
} as const;

/** Both subjects' lands on one sheet, for the folded map. */
export function renderFoldedMap(
  layout: Layout,
  time: TimeOfDay,
  w: number,
  h: number,
  accent: string
): HTMLCanvasElement {
  const c = canvasFor(w, h);
  const W = c.width;
  const H = c.height;
  const g = ctx2d(c);
  paper(g, W, H, time);
  const S = Math.min(W, H);
  const p = new Pen(g, S, 11);
  const sp = SPOTS[layout];
  const X = (u: number) => u * W;
  const Y = (v: number) => v * H;
  /* Math lands. */
  const [rx0, ry, rs] = sp.range;
  for (let i = 0; i < 4; i++) mountain(p, X(rx0) + i * rs * S * 1.3, Y(ry), rs * 0.8, i === 1);
  terraces(p, X(sp.terraces[0]), Y(sp.terraces[1]), X(sp.terraces[2]), S * 0.022);
  const [lx, ly, lrx, lry] = sp.lake;
  lake(p, X(lx), Y(ly), X(lrx), Y(lry));
  bridge(p, X(lx), Y(ly) + Y(lry) * 0.3, X(lrx) * 1.25, accent);
  for (const [x, y] of sp.pines) pine(p, X(x), Y(y), 0.045);
  trail(
    p,
    sp.trail.map(([x, y]) => [X(x), Y(y)])
  );
  /* Reading and Writing lands. */
  if (layout === "wide") hills(p, X(sp.hills[0]), X(sp.hills[1]), Y(sp.hills[2]), 0.05);
  else hills(p, X(sp.hills[0]), X(sp.hills[1]), Y(sp.hills[2]), 0.035);
  river(
    p,
    sp.river.map(([x, y]) => [X(x), Y(y)]),
    S * 0.012
  );
  flowers(p, X(sp.flowers[0]), Y(sp.flowers[1]), X(sp.flowers[2]), Y(sp.flowers[3]), 40);
  tree(p, X(sp.tree[0]), Y(sp.tree[1]), 0.05);
  book(p, X(sp.book[0]), Y(sp.book[1]), X(sp.book[2]), accent);
  quill(p, X(sp.quill[0]), Y(sp.quill[1]), 0.07);
  light(g, W, H, time);
  return c;
}

/** One subject's map, its landmarks where the ground scene has them. */
export function renderSubjectMap(
  pic: LibraryPicture,
  time: TimeOfDay,
  w: number,
  h: number,
  accent: string
): HTMLCanvasElement {
  const c = canvasFor(w, h);
  const W = c.width;
  const H = c.height;
  const g = ctx2d(c);
  paper(g, W, H, time);
  const S = Math.min(W, H);
  const p = new Pen(g, S, 23);
  if (pic.math) {
    const { bridge: b, peak, terraces: tops } = pic.math;
    const water = b.base * H;
    for (let i = 0; i < 7; i++) {
      const x = (i / 6) * W;
      mountain(p, x, water - H * 0.06, 0.07, false);
    }
    mountain(p, peak[1][0] * W, water - H * 0.05, 0.1, true);
    lake(p, W * 0.5, water + (H - water) * 0.42, W * 0.5, (H - water) * 0.42);
    bridge(p, b.cx * W, water + H * 0.02, b.span * W, accent);
    if (tops.length) {
      const x0 = tops[0][0] * W;
      const x1 = tops[tops.length - 1][0] * W;
      terraces(p, x0, water, Math.max(S * 0.08, (x1 - x0) * 1.2), S * 0.02);
    }
    for (const u of [0.04, 0.9, 0.96]) pine(p, u * W, H * 0.97, 0.06);
  } else if (pic.reading) {
    const { book: b, tree: t, quill: q } = pic.reading;
    const horizon = H * 0.5;
    p.wash(
      [
        [0, horizon],
        [W, horizon],
        [W, H],
        [0, H],
      ],
      MEADOW,
      0.3
    );
    hills(p, 0, W, horizon, 0.07);
    river(
      p,
      [
        [W * 0.7, horizon + H * 0.06],
        [W * 0.62, horizon + H * 0.14],
        [W * 0.7, horizon + H * 0.22],
        [b.cx * W, (b.by - b.ph) * H],
      ],
      S * 0.016
    );
    flowers(p, W * 0.5, H * 0.8, W * 0.45, H * 0.15, 90);
    tree(p, t[0] * W, t[1] * H, t[2] * 0.22);
    book(p, b.cx * W, b.by * H, b.bw * W, accent);
    quill(p, q.x * W, q.y * H, q.h * 2.2);
  }
  light(g, W, H, time);
  return c;
}
