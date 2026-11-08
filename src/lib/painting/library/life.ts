/*
 * Life in the Library's two opening paintings once they are painted.
 *
 * Always, gently: the backdrop's own wildlife (birds, glints, rings, butterflies, fireflies,
 * stars), a small light travelling along the bridge's parabola, petals lifting off the book, and
 * letters falling from the reading tree like leaves.
 *
 * On hover (founder, 2026-11-08: "an animated hover effect"), each painting comes alive its own
 * way, faded in and out by `k` (0 to 1):
 * - Math: a bright light sweeps along the bridge's arch and plots the curve behind it, the posts
 *   light up as samples, and figures draw themselves in light over the scene: the parabola
 *   carried on into the sky, a circle around the sun with its radius, a triangle on the peak,
 *   and the bar chart's tops joined into a line.
 * - Reading and Writing: pages turn over in the open book, and letters lift off its pages and
 *   drift up into the meadow like leaves.
 */
import type { TimeOfDay } from "../light";
import { drawLife, type PictureMap } from "../life";
import { WHEN, type Drawer, type Item, type LifeCtx, type LifeState } from "../life/types";
import { archPoint, type BookAt } from "./motifs";
import type { MathAnchors, ReadingAnchors } from "./scenes";

const TAU = Math.PI * 2;
const LETTERS = "abcdefghijklmnopqrstuvwxyzAEGKMRSW&";

interface Drift {
  u: number;
  v: number;
  vu: number;
  vv: number;
  life: number;
  max: number;
  spin: number;
  c: string;
  ch?: string;
  size?: number;
}

const PETALS: Record<TimeOfDay, string[]> = {
  dawn: ["255,226,206", "255,240,220", "246,200,214"],
  day: ["255,255,255", "248,214,226", "246,232,170"],
  sunset: ["255,214,160", "255,190,140", "255,236,200"],
  night: ["250,240,150"],
};

/** Ink for letters in this light: dark by day, pale gold by night, so they read on the paint. */
function letterInk(time: TimeOfDay) {
  return time === "night" ? "252,236,170" : time === "sunset" ? "58,30,34" : "40,34,30";
}

/** A small light that travels the arch, there and back, with its reflection below. */
const arcLight: Drawer = (it, { g, t, X, Y, S, time }) => {
  const [cx, span, base, rise] = it.a;
  const phase = (t / 9) % 1;
  const warm = time === "night" || time === "sunset";
  const col = warm ? "255,214,140" : "255,251,232";
  const p = 0.5 - 0.5 * Math.cos(phase * TAU);
  const [u, v] = archPoint({ cx, span, base, rise }, 0.04 + p * 0.92);
  for (const [y, k] of [
    [Y(v) - 2 * S, 1],
    [Y(base + (base - v)) + 2 * S, 0.4],
  ] as const) {
    glow(g, X(u), y, 6 * S, col, 0.7 * k);
  }
};

/** Petals (or, at night, fireflies) lifting off the book and drifting up into the meadow. */
const petals: Drawer = (it, { g, dt, X, Y, S, time }) => {
  const [u0, u1, v0, v1] = it.a;
  const P = it.parts as Drift[];
  it.clock -= dt;
  if (it.clock <= 0 && P.length < 10) {
    const cs = PETALS[time];
    P.push({
      u: u0 + Math.random() * (u1 - u0),
      v: v0 + Math.random() * 0.02,
      vu: (Math.random() - 0.3) * 0.02,
      vv: -(0.02 + Math.random() * 0.025),
      life: 0,
      max: 3 + Math.random() * 2.5,
      spin: Math.random() * 6,
      c: cs[Math.floor(Math.random() * cs.length)],
    });
    it.clock = 0.5 + Math.random() * 0.7;
  }
  const night = time === "night";
  for (const q of P) {
    q.life += dt;
    q.u += (q.vu + Math.sin(q.life * 1.7 + q.spin) * 0.012) * dt;
    q.v += q.vv * dt;
    const k = Math.sin(Math.min(1, q.life / q.max) * Math.PI);
    const x = X(q.u);
    const y = Y(Math.max(v1, q.v));
    if (night) {
      glow(g, x, y, 7 * S, q.c, 0.85 * k);
      continue;
    }
    g.fillStyle = `rgba(${q.c},${0.9 * k})`;
    g.beginPath();
    g.ellipse(x, y, 2.6 * S, 1.3 * S, q.spin + q.life * 2.2, 0, TAU);
    g.fill();
  }
  it.parts = P.filter((q) => q.life < q.max);
};

/** Now and then a letter lets go of the reading tree and falls, rocking, like a leaf. */
const letterLeaves: Drawer = (it, { g, dt, X, Y, S, time }) => {
  const [cu, cv, ru, rv] = it.a;
  const P = it.parts as Drift[];
  it.clock -= dt;
  if (it.clock <= 0 && P.length < 6) {
    const a = Math.random() * TAU;
    P.push({
      u: cu + Math.cos(a) * ru * 0.8,
      v: cv + Math.sin(a) * rv * 0.6,
      vu: 0.006 + Math.random() * 0.01,
      vv: 0.018 + Math.random() * 0.012,
      life: 0,
      max: 6 + Math.random() * 3,
      spin: Math.random() * 6,
      c: letterInk(time),
      ch: LETTERS[Math.floor(Math.random() * LETTERS.length)],
      size: 13 + Math.random() * 7,
    });
    it.clock = 1.4 + Math.random() * 1.8;
  }
  const font = (it as Item & { font?: string }).font ?? "Georgia, serif";
  for (const q of P) {
    q.life += dt;
    q.u += (q.vu + Math.sin(q.life * 1.3 + q.spin) * 0.02) * dt;
    q.v += q.vv * dt;
    const k = Math.min(1, q.life / 0.6, (q.max - q.life) / 1.2);
    letter(
      g,
      X(q.u),
      Y(q.v),
      q.ch ?? "a",
      (q.size ?? 14) * S,
      font,
      q.c,
      0.85 * k,
      Math.sin(q.life * 1.3 + q.spin) * 0.6
    );
  }
  it.parts = P.filter((q) => q.life < q.max);
};

const OWN: Record<string, Drawer> = { arcLight, petals, letterLeaves };

function glow(
  g: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  col: string,
  a: number
) {
  if (a <= 0.003 || r <= 0) return;
  const gr = g.createRadialGradient(x, y, 0, x, y, r);
  gr.addColorStop(0, `rgba(${col},${a})`);
  gr.addColorStop(1, `rgba(${col},0)`);
  g.fillStyle = gr;
  g.fillRect(x - r, y - r, r * 2, r * 2);
}

function letter(
  g: CanvasRenderingContext2D,
  x: number,
  y: number,
  ch: string,
  size: number,
  font: string,
  col: string,
  a: number,
  rot: number
) {
  if (a <= 0.01) return;
  g.save();
  g.translate(x, y);
  g.rotate(rot);
  g.font = `${Math.round(size)}px ${font}`;
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillStyle = `rgba(${col},${a})`;
  g.fillText(ch, 0, 0);
  g.restore();
}

export interface PaintingLife {
  state: LifeState;
  own: Item[];
}

/** The life for a painting, keeping only what lives at this hour. */
export function paintingLife(items: Item[], time: TimeOfDay, font: string): PaintingLife {
  const keep = items.filter(
    (it) =>
      (!WHEN[it.kind] || WHEN[it.kind].includes(time)) && (it.kind !== "stars" || time === "night")
  );
  const own = keep.filter((it) => OWN[it.kind]);
  for (const it of own) (it as Item & { font?: string }).font = font;
  return {
    state: {
      scene: -1,
      time,
      items: keep.filter((it) => !OWN[it.kind]),
      birdsAt: 0.8 + Math.random() * 2,
      ringsAt: 1 + Math.random() * 2,
    },
    own,
  };
}

/** Draws one frame of a painting's gentle, always-on life. */
export function drawPaintingLife(
  g: CanvasRenderingContext2D,
  life: PaintingLife,
  dt: number,
  t: number,
  map: PictureMap,
  alpha: number
) {
  drawLife(g, life.state, dt, t, map, alpha);
  const night = life.state.time === "night";
  const dusk = life.state.time === "sunset" || life.state.time === "dawn";
  const ctx: LifeCtx = {
    g,
    dt,
    t,
    ...map,
    ink: night ? "rgba(220,228,255," : dusk ? "rgba(40,24,30," : "rgba(30,34,40,",
    night,
    time: life.state.time,
    state: life.state,
  };
  g.save();
  g.globalAlpha = alpha;
  for (const it of life.own) {
    g.save();
    OWN[it.kind](it, ctx);
    g.restore();
  }
  g.restore();
}

/* ---------- Hover: Math ---------- */

const ease = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x * x * (3 - 2 * x));

/** Strokes the first `p` (0 to 1) of a polyline. */
function partial(g: CanvasRenderingContext2D, pts: [number, number][], p: number) {
  if (p <= 0 || pts.length < 2) return;
  const n = (pts.length - 1) * Math.min(1, p);
  const whole = Math.floor(n);
  g.beginPath();
  g.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i <= whole; i++) g.lineTo(pts[i][0], pts[i][1]);
  if (whole < pts.length - 1) {
    const f = n - whole;
    const [ax, ay] = pts[whole];
    const [bx, by] = pts[whole + 1];
    g.lineTo(ax + (bx - ax) * f, ay + (by - ay) * f);
  }
  g.stroke();
}

/**
 * Math comes alive: a light sweeps the arch and plots it; the posts light up as samples; figures
 * draw themselves over the scene. `h` is seconds since the hover began.
 */
export function drawMathHover(
  g: CanvasRenderingContext2D,
  at: MathAnchors,
  k: number,
  h: number,
  map: PictureMap,
  time: TimeOfDay
) {
  if (k <= 0.01) return;
  const { X, Y, S } = map;
  const b = at.bridge;
  const warm = time === "night" || time === "sunset";
  const col = warm ? "255,214,150" : "255,248,226";
  const chalk = time === "day" ? "255,255,250" : col;
  g.save();
  g.lineCap = "round";
  g.lineJoin = "round";

  /* 1. The sweep: every 2.4 s the light runs the arch left to right, plotting it as it goes. */
  const cycle = 2.4;
  const run = (h % cycle) / 1.5;
  const p = ease(run);
  const arch = Array.from({ length: 41 }, (_, i) => {
    const [u, v] = archPoint(b, i / 40);
    return [X(u), Y(v) - 2 * S] as [number, number];
  });
  const mirror = arch.map(([x, y]) => [x, Y(b.base) * 2 - y + 4 * S] as [number, number]);
  const plotted = h < 1.5 ? p : 1;
  g.strokeStyle = `rgba(${col},${0.85 * k})`;
  g.lineWidth = 2.6 * S;
  g.shadowColor = `rgba(${col},${0.9 * k})`;
  g.shadowBlur = 10 * S;
  partial(g, arch, plotted);
  g.shadowBlur = 0;
  g.strokeStyle = `rgba(${col},${0.3 * k})`;
  g.lineWidth = 2 * S;
  partial(g, mirror, plotted);
  if (run <= 1) {
    const [u, v] = archPoint(b, p);
    glow(g, X(u), Y(v) - 2 * S, 16 * S, col, 0.95 * k);
    glow(g, X(u), Y(b.base * 2 - v) + 2 * S, 12 * S, col, 0.35 * k);
  }

  /* 2. The posts: each lights as the sweep passes, a sample of the curve. */
  const posts = 9;
  for (let i = 1; i < posts; i++) {
    const t = i / posts;
    const lit = ease((plotted - t) * 6) * (run <= 1 ? 1 : ease(1 - (run - 1) * 2) * 0.6 + 0.4);
    if (lit <= 0) continue;
    const [u, v] = archPoint(b, t);
    glow(g, X(u), Y(v) - 2 * S, 7 * S, col, 0.9 * k * lit);
    g.strokeStyle = `rgba(${col},${0.35 * k * lit})`;
    g.lineWidth = 1.2 * S;
    g.beginPath();
    g.moveTo(X(u), Y(v));
    g.lineTo(X(u), Y(b.base));
    g.stroke();
  }

  /* 3. Figures drawing themselves, one after another, then holding. */
  g.strokeStyle = `rgba(${chalk},${0.6 * k})`;
  g.lineWidth = 1.6 * S;
  /* The graph's axes under the arch: the waterline as the x-axis with a tick under each post,
     and a dashed y-axis up through the crown, so the bridge reads as a plotted curve. */
  const ax0 = X(b.cx - b.span * 0.62);
  const ax1 = X(b.cx + b.span * 0.62);
  const ay = Y(b.base) - 1.5 * S;
  const px = ease((h - 0.2) / 1.1);
  if (px > 0) {
    g.beginPath();
    g.moveTo(ax0, ay);
    g.lineTo(ax0 + (ax1 - ax0) * px, ay);
    g.stroke();
    for (let i = 1; i < posts; i++) {
      const tx = X(b.cx - b.span / 2 + (b.span * i) / posts);
      if (tx > ax0 + (ax1 - ax0) * px) break;
      g.beginPath();
      g.moveTo(tx, ay - 4 * S);
      g.lineTo(tx, ay + 4 * S);
      g.stroke();
    }
  }
  const py = ease((h - 0.5) / 0.9);
  if (py > 0) {
    const top = Y(b.base - b.rise * 1.9);
    g.setLineDash([5 * S, 6 * S]);
    g.beginPath();
    g.moveTo(X(b.cx), ay);
    g.lineTo(X(b.cx), ay + (top - ay) * py);
    g.stroke();
    g.setLineDash([]);
  }
  /* A circle around the sun, drawn round, then its radius. */
  const [su, sv] = at.sun;
  const r = map.X(su + 0.05) - map.X(su);
  const pc = ease((h - 0.6) / 1.1);
  if (pc > 0) {
    g.beginPath();
    g.arc(X(su), Y(sv), r, -Math.PI / 2, -Math.PI / 2 + pc * TAU);
    g.stroke();
  }
  const pr = ease((h - 1.6) / 0.4);
  if (pr > 0) {
    g.beginPath();
    g.moveTo(X(su), Y(sv));
    g.lineTo(X(su) + r * pr * Math.cos(-0.5), Y(sv) + r * pr * Math.sin(-0.5));
    g.stroke();
    glow(g, X(su), Y(sv), 4 * S, chalk, 0.8 * k * pr);
  }
  /* A triangle on the sharp peak. */
  const tri = [...at.peak, at.peak[0]].map(([u, v]) => [X(u), Y(v)] as [number, number]);
  partial(g, tri, ease((h - 0.9) / 1.2));
  /* The terraces' tops joined into a rising line, with a point on each. */
  const bars = at.terraces.map(([u, v]) => [X(u), Y(v) - 3 * S] as [number, number]);
  const pb = ease((h - 0.4) / 1.3);
  partial(g, bars, pb);
  bars.forEach(([x, y], i) => {
    const on = ease((pb * (bars.length - 1) - i + 1) * 2);
    glow(g, x, y, 6 * S, chalk, 0.9 * k * on);
  });
  g.restore();
}

/* ---------- Hover: Reading and Writing ---------- */

interface Lift extends Drift {
  ch: string;
  size: number;
}

export interface ReadingHoverState {
  letters: Lift[];
  clock: number;
}

export const readingHoverState = (): ReadingHoverState => ({ letters: [], clock: 0 });

/** A point on the top edge of a page, t from the spine (0) to the outer corner (1), in pixels. */
function pageTop(b: BookAt, map: PictureMap, side: number, t: number): [number, number] {
  const cx = map.X(b.cx);
  const by = map.Y(b.by);
  const bw = map.X(b.cx + b.bw) - cx;
  const ph = map.Y(b.by) - map.Y(b.by - b.ph);
  const p0: [number, number] = [cx, by - ph * 0.9];
  const c: [number, number] = [cx + side * bw * 0.45, by - ph * 1.24];
  const p1: [number, number] = [cx + side * bw * 0.93, by - ph];
  const u = 1 - t;
  return [
    u * u * p0[0] + 2 * u * t * c[0] + t * t * p1[0],
    u * u * p0[1] + 2 * u * t * c[1] + t * t * p1[1],
  ];
}

/**
 * Reading and Writing comes alive: pages turn over in the book, and letters lift off the pages
 * and drift up like leaves.
 */
export function drawReadingHover(
  g: CanvasRenderingContext2D,
  at: ReadingAnchors,
  st: ReadingHoverState,
  k: number,
  h: number,
  dt: number,
  map: PictureMap,
  time: TimeOfDay,
  font: string
) {
  const { S } = map;
  const b = at.book;
  const cx = map.X(b.cx);
  const by = map.Y(b.by);
  const bw = map.X(b.cx + b.bw) - cx;
  const ph = map.Y(b.by) - map.Y(b.by - b.ph);

  /* 1. Pages turning: one every 1.1 s while hovered, each lifting off the right page, curling
     up and over, and settling on the left. */
  if (k > 0.01) {
    const period = 1.1;
    const night = time === "night";
    const paper = night ? [196, 200, 214] : time === "sunset" ? [255, 226, 196] : [252, 246, 230];
    for (let j = 0; j < 2; j++) {
      const age = h - j * period * 0.5;
      if (age < 0) continue;
      const f = ((age % period) / period) * 1.25;
      if (f > 1) continue;
      const th = ease(f) * Math.PI;
      const c = Math.cos(th);
      const lift = Math.sin(th);
      const ox = cx + bw * 0.93 * c;
      const curl = bw * 0.25 * lift;
      const shade = 0.72 + 0.28 * Math.abs(c);
      const [r, gg, bb] = paper.map((v) => Math.round(v * shade));
      g.save();
      g.globalAlpha = k * (f > 0.9 ? (1 - f) / 0.1 : 1);
      g.fillStyle = `rgb(${r},${gg},${bb})`;
      g.strokeStyle = `rgba(90,80,70,${0.45})`;
      g.lineWidth = Math.max(1, ph * 0.025);
      g.beginPath();
      g.moveTo(cx, by - ph * 0.02);
      g.quadraticCurveTo(
        cx + (ox - cx) * 0.5,
        by + ph * 0.06 - curl * 0.4,
        ox,
        by - ph * 0.04 - lift * ph * 0.5
      );
      g.lineTo(ox - (c >= 0 ? 1 : -1) * bw * 0.04 * lift, by - ph * 1.0 - lift * ph * 0.65);
      g.quadraticCurveTo(cx + (ox - cx) * 0.5, by - ph * 1.26 - curl * 0.6, cx, by - ph * 0.9);
      g.closePath();
      g.fill();
      g.stroke();
      /* Lines of text on the turning page, foreshortened with it. */
      g.strokeStyle = `rgba(70,60,52,${0.3 * Math.abs(c)})`;
      g.lineWidth = Math.max(1, ph * 0.035);
      for (let i = 0; i < 5; i++) {
        const y0 = by - ph * (0.72 - i * 0.12) - lift * ph * 0.3;
        g.beginPath();
        g.moveTo(cx + (ox - cx) * 0.12, y0 + ph * 0.02);
        g.lineTo(cx + (ox - cx) * 0.86, y0 - lift * ph * 0.25);
        g.stroke();
      }
      g.restore();
    }
  }

  /* 2. Letters lift off the pages while hovered, and keep drifting after. */
  st.clock -= dt * k;
  while (k > 0.2 && st.clock <= 0 && st.letters.length < 46) {
    const side = Math.random() < 0.5 ? -1 : 1;
    const [x, y] = pageTop(b, map, side, 0.1 + Math.random() * 0.8);
    st.letters.push({
      u: x,
      v: y - ph * 0.15,
      vu: side * (8 + Math.random() * 22) * S,
      vv: -(40 + Math.random() * 40) * S,
      life: 0,
      max: 2.6 + Math.random() * 1.6,
      spin: Math.random() * 6,
      c: letterInk(time),
      ch: LETTERS[Math.floor(Math.random() * LETTERS.length)],
      size: 15 + Math.random() * 13,
    });
    st.clock += 0.07 + Math.random() * 0.06;
  }
  if (st.clock < -1) st.clock = 0;
  for (const q of st.letters) {
    q.life += dt;
    const sway = Math.sin(q.life * 2.2 + q.spin);
    q.u += (q.vu + sway * 18 * S) * dt;
    q.v += q.vv * dt;
    q.vv *= 1 - dt * 0.35;
    const a = Math.min(1, q.life / 0.25, (q.max - q.life) / 0.9);
    letter(g, q.u, q.v, q.ch, q.size * S, font, q.c, 0.9 * a, sway * 0.5);
  }
  st.letters = st.letters.filter((q) => q.life < q.max);
}
