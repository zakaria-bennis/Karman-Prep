/*
 * Life in the Library's two ground scenes (scenes.ts) once the camera has landed: the backdrop's
 * own wildlife (birds, glints, rings, butterflies, fireflies, stars), a small light travelling
 * along the bridge's parabola, petals lifting off the book, and letters falling from the reading
 * tree like leaves. The hover animations live up in the sky (sky-life.ts).
 */
import type { TimeOfDay } from "../light";
import { drawLife, type PictureMap } from "../life";
import { WHEN, type Drawer, type Item, type LifeCtx, type LifeState } from "../life/types";
import { archPoint } from "./motifs";

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
