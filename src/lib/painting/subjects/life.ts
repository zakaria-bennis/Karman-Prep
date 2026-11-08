/*
 * Life in the Library's subject pictures once they are painted: the backdrop's own wildlife
 * (birds, glints, rings, butterflies, fireflies, stars) plus two of their own. A light travels
 * along the bridge's parabola and back, mirrored in the water; petals (fireflies at night) lift
 * off the open book's pages. Hovering a picture makes it a little livelier.
 */
import type { TimeOfDay } from "../light";
import { drawLife } from "../life";
import { WHEN, type Drawer, type Item, type LifeCtx, type LifeState } from "../life/types";
import { archPoint } from "./motifs";

interface Petal {
  u: number;
  v: number;
  vu: number;
  vv: number;
  life: number;
  max: number;
  spin: number;
  c: string;
}

const PETALS: Record<TimeOfDay, string[]> = {
  dawn: ["255,226,206", "255,240,220", "246,200,214"],
  day: ["255,255,255", "248,214,226", "246,232,170"],
  sunset: ["255,214,160", "255,190,140", "255,236,200"],
  night: ["250,240,150"],
};

/** A small light that travels the arch, there and back, with its reflection below. */
const arcLight: Drawer = (it, { g, t, X, Y, S, time }) => {
  const [cx, span, base, rise] = it.a;
  const phase = (t / 9) % 1;
  const warm = time === "night" || time === "sunset";
  const col = warm ? "255,214,140" : "255,251,232";
  for (let j = 5; j >= 0; j--) {
    const p = 0.5 - 0.5 * Math.cos((phase - j * 0.006) * Math.PI * 2);
    const [u, v] = archPoint({ cx, span, base, rise }, 0.04 + p * 0.92);
    const r = (j ? 3.5 : 7) * S;
    const a = (j ? 0.18 : 0.8) * (1 - j / 7);
    for (const [y, k] of [
      [Y(v) - 2 * S, 1],
      [Y(base + (base - v)) + 2 * S, 0.4],
    ] as const) {
      const x = X(u);
      const gr = g.createRadialGradient(x, y, 0, x, y, r);
      gr.addColorStop(0, `rgba(${col},${a * k})`);
      gr.addColorStop(1, `rgba(${col},0)`);
      g.fillStyle = gr;
      g.fillRect(x - r, y - r, r * 2, r * 2);
    }
  }
};

/** Petals (or, at night, fireflies) lifting off the book and drifting up into the meadow. */
const petals: Drawer = (it, { g, dt, X, Y, S, time }) => {
  const [u0, u1, v0, v1] = it.a;
  const P = it.parts as Petal[];
  const boost = (it as Item & { boost?: number }).boost ?? 1;
  it.clock -= dt * boost;
  if (it.clock <= 0 && P.length < 14) {
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
    it.clock = 0.35 + Math.random() * 0.5;
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
      const gr = g.createRadialGradient(x, y, 0, x, y, 8 * S);
      gr.addColorStop(0, `rgba(${q.c},${0.85 * k})`);
      gr.addColorStop(1, `rgba(${q.c},0)`);
      g.fillStyle = gr;
      g.fillRect(x - 8 * S, y - 8 * S, 16 * S, 16 * S);
      continue;
    }
    g.fillStyle = `rgba(${q.c},${0.9 * k})`;
    g.beginPath();
    g.ellipse(x, y, 2.6 * S, 1.3 * S, q.spin + q.life * 2.2, 0, Math.PI * 2);
    g.fill();
  }
  it.parts = P.filter((q) => q.life < q.max);
};

const OWN: Record<string, Drawer> = { arcLight, petals };

export interface SubjectLife {
  state: LifeState;
  own: Item[];
}

/** The life for a picture, keeping only what lives at this hour. */
export function subjectLife(items: Item[], time: TimeOfDay): SubjectLife {
  const keep = items.filter(
    (it) =>
      (!WHEN[it.kind] || WHEN[it.kind].includes(time)) && (it.kind !== "stars" || time === "night")
  );
  return {
    state: {
      scene: -1,
      time,
      items: keep.filter((it) => !OWN[it.kind]),
      birdsAt: 0.8 + Math.random() * 2,
      ringsAt: 1 + Math.random() * 2,
    },
    own: keep.filter((it) => OWN[it.kind]),
  };
}

/** Draws one frame. `boost` above 1 makes it livelier (a hovered picture). */
export function drawSubjectLife(
  g: CanvasRenderingContext2D,
  life: SubjectLife,
  dt: number,
  t: number,
  map: { X: (u: number) => number; Y: (v: number) => number; S: number },
  alpha: number,
  boost: number
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
    (it as Item & { boost?: number }).boost = boost;
    g.save();
    OWN[it.kind](it, ctx);
    g.restore();
  }
  g.restore();
}
