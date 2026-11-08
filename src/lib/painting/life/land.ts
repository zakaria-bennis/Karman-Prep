/* What lives on the land and in the air near it: deer, a fox, swallows, chimney smoke, a glowing
   window, snow, leaves, butterflies, fireflies and drifting mist. */
import { rnd, TAU, type Drawer } from "./types";

interface Deer {
  u: number;
  v: number;
  phase: "walk" | "graze";
  timer: number;
  dir: number;
}
interface Swallow {
  p: number;
  sp: number;
}
interface Puff {
  x: number;
  y: number;
  life: number;
  r: number;
  drift: number;
}
interface Flake {
  u: number;
  v: number;
  sp: number;
  r: number;
  p: number;
}
interface Leaf {
  u: number;
  v: number;
  sp: number;
  p: number;
  r: number;
  c: string;
}
interface Wing {
  u: number;
  v: number;
  p: number;
  c: string;
}
interface Bank {
  u: number;
  v: number;
  sp: number;
  r: number;
}
interface Walker {
  u: number;
  dir: number;
}

/** A deer steps out, grazes a while, lifts its head, then walks off. */
export const deer: Drawer = (it, { g, dt, t, X, Y, S, ink }) => {
  const a = it.a;
  const P = it.parts as Deer[];
  if (!P.length) P.push({ u: a[0] - 0.05, v: a[2], phase: "walk", timer: rnd(6, 10), dir: 1 });
  for (const q of P) {
    if (q.phase === "walk") {
      q.u += q.dir * 0.012 * dt;
      if (q.u > (a[0] + a[1]) / 2 && q.dir > 0 && q.timer > 0) q.phase = "graze";
    } else {
      q.timer -= dt;
      if (q.timer <= 0) q.phase = "walk";
    }
    if (q.u > a[1] + 0.1) {
      q.u = a[0] - 0.05;
      q.timer = rnd(6, 10);
    }
    const x = X(q.u);
    const y = Y(q.v);
    const s2 = 11 * S;
    const step = q.phase === "walk" ? Math.sin(t * 6) * 0.3 : 0;
    const head = q.phase === "graze" ? (Math.sin(t * 0.7) > 0.6 ? 0 : 1) : 0;
    g.fillStyle = ink + "0.95)";
    g.strokeStyle = g.fillStyle;
    g.lineWidth = 1.6 * S;
    g.beginPath();
    g.ellipse(x, y - s2 * 1.2, s2 * 0.9, s2 * 0.4, 0, 0, TAU);
    g.fill();
    for (const [dx, sw] of [
      [-0.6, step],
      [-0.4, -step],
      [0.5, -step],
      [0.7, step],
    ]) {
      g.beginPath();
      g.moveTo(x + dx * s2, y - s2);
      g.lineTo(x + dx * s2 + sw * s2 * 0.4, y);
      g.stroke();
    }
    const hx = x + s2 * 0.9;
    const hy = head ? y - s2 * 0.6 : y - s2 * 2.1;
    g.beginPath();
    g.moveTo(x + s2 * 0.6, y - s2 * 1.3);
    g.lineTo(hx, hy);
    g.stroke();
    g.beginPath();
    g.ellipse(hx + s2 * 0.15, hy, s2 * 0.3, s2 * 0.16, 0.3, 0, TAU);
    g.fill();
    if (!head) {
      g.beginPath();
      g.moveTo(hx, hy - 2);
      g.lineTo(hx - s2 * 0.2, hy - s2 * 0.6);
      g.moveTo(hx + 3, hy - 2);
      g.lineTo(hx + s2 * 0.2, hy - s2 * 0.6);
      g.stroke();
    }
  }
};

export const fox: Drawer = (it, { g, dt, t, X, Y, S, night }) => {
  const a = it.a;
  const P = it.parts as Walker[];
  if (!P.length) P.push({ u: a[0], dir: 1 });
  const q = P[0];
  q.u += q.dir * 0.02 * dt;
  if (q.u > a[1]) q.u = a[0] - 0.05;
  const x = X(q.u);
  const y = Y(a[2]);
  const s2 = 9 * S;
  const step = Math.sin(t * 9) * 0.35;
  g.fillStyle = night ? "#a85a2e" : "#c86a32";
  g.strokeStyle = g.fillStyle;
  g.lineWidth = 1.6 * S;
  g.beginPath();
  g.ellipse(x, y - s2, s2 * 1.1, s2 * 0.42, 0, 0, TAU);
  g.fill();
  g.beginPath();
  g.moveTo(x + s2, y - s2 * 1.1);
  g.lineTo(x + s2 * 1.6, y - s2 * 1.4);
  g.lineTo(x + s2 * 1.5, y - s2 * 0.9);
  g.fill();
  g.beginPath();
  g.moveTo(x + s2 * 1.3, y - s2 * 1.4);
  g.lineTo(x + s2 * 1.35, y - s2 * 1.8);
  g.lineTo(x + s2 * 1.5, y - s2 * 1.4);
  g.fill();
  g.beginPath();
  g.moveTo(x - s2, y - s2);
  g.quadraticCurveTo(x - s2 * 2, y - s2 * 1.4, x - s2 * 2.2, y - s2 * 0.8);
  g.lineWidth = s2 * 0.5;
  g.stroke();
  g.lineWidth = 1.6 * S;
  for (const [dx, sw] of [
    [-0.6, step],
    [-0.3, -step],
    [0.5, -step],
    [0.8, step],
  ]) {
    g.beginPath();
    g.moveTo(x + dx * s2, y - s2 * 0.7);
    g.lineTo(x + dx * s2 + sw * s2 * 0.5, y);
    g.stroke();
  }
};

export const swallows: Drawer = (it, { g, t, X, Y, S, ink }) => {
  const a = it.a;
  const P = it.parts as Swallow[];
  if (!P.length) for (let i = 0; i < 4; i++) P.push({ p: Math.random() * 6, sp: rnd(0.6, 1.1) });
  for (const q of P) {
    const ph = t * q.sp + q.p;
    const x = X(a[0] + (a[1] - a[0]) * (0.5 + 0.5 * Math.sin(ph)));
    const y = Y(a[2] + (a[3] - a[2]) * (0.5 + 0.5 * Math.sin(ph * 2.3)));
    const d = Math.cos(ph) > 0 ? 1 : -1;
    const w = 6 * S;
    g.fillStyle = ink + "0.9)";
    g.beginPath();
    g.moveTo(x + d * w, y);
    g.lineTo(x - d * w * 0.4, y - w * 0.7);
    g.lineTo(x - d * w * 0.1, y);
    g.lineTo(x - d * w * 0.4, y + w * 0.7);
    g.closePath();
    g.fill();
  }
};

export const smoke: Drawer = (it, { g, dt, X, Y, S, night }) => {
  const a = it.a;
  const P = it.parts as Puff[];
  if (Math.random() < dt * 6) P.push({ x: 0, y: 0, life: 0, r: rnd(3, 5), drift: rnd(4, 10) });
  for (const q of P) {
    q.life += dt;
    q.y -= 14 * dt;
    q.x += (q.drift + Math.sin(q.life * 1.5) * 6) * dt;
    const rr = (q.r + q.life * 7) * S;
    g.fillStyle = `rgba(${night ? "170,180,200" : "220,220,225"},${Math.max(0, 0.35 - q.life * 0.08)})`;
    g.beginPath();
    g.arc(X(a[0]) + q.x * S, Y(a[1]) + q.y * S, rr, 0, TAU);
    g.fill();
  }
  it.parts = P.filter((q) => q.life < 4.5);
};

export const windowGlow: Drawer = (it, { g, t, X, Y, S }) => {
  const a = it.a;
  const f = 0.55 + 0.25 * Math.sin(t * 7) * Math.sin(t * 3.1);
  const gr = g.createRadialGradient(X(a[0]), Y(a[1]), 0, X(a[0]), Y(a[1]), 40 * S);
  gr.addColorStop(0, `rgba(255,200,110,${0.35 * f})`);
  gr.addColorStop(1, "rgba(255,200,110,0)");
  g.fillStyle = gr;
  g.fillRect(X(a[0]) - 40 * S, Y(a[1]) - 40 * S, 80 * S, 80 * S);
};

export const snow: Drawer = (it, { g, dt, t, X, Y, S }) => {
  const P = it.parts as Flake[];
  if (!P.length) {
    for (let i = 0; i < 80; i++) {
      P.push({
        u: Math.random(),
        v: Math.random(),
        sp: rnd(0.02, 0.05),
        r: rnd(0.8, 2.2),
        p: Math.random() * 6,
      });
    }
  }
  for (const q of P) {
    q.v += q.sp * dt;
    q.u += Math.sin(t * 0.8 + q.p) * 0.004 * dt;
    if (q.v > 1) {
      q.v = -0.02;
      q.u = Math.random();
    }
    g.fillStyle = "rgba(255,255,255,.85)";
    g.beginPath();
    g.arc(X(q.u), Y(q.v), q.r * S, 0, TAU);
    g.fill();
  }
};

const LEAF_COLORS = ["#d0702e", "#eab048", "#b8452a"];
export const leaves: Drawer = (it, { g, dt, t, X, Y, S }) => {
  const a = it.a;
  const P = it.parts as Leaf[];
  if (P.length < 18 && Math.random() < dt * 1.5) {
    P.push({
      u: rnd(a[0], a[1]),
      v: rnd(a[2], a[3]),
      sp: rnd(0.025, 0.05),
      p: Math.random() * 6,
      r: rnd(3, 6),
      c: LEAF_COLORS[Math.floor(Math.random() * 3)],
    });
  }
  for (const q of P) {
    q.v += q.sp * dt;
    q.u += Math.sin(t * 1.4 + q.p) * 0.012 * dt;
    g.save();
    g.translate(X(q.u), Y(q.v));
    g.rotate(t * 2 + q.p);
    g.fillStyle = q.c;
    g.beginPath();
    g.ellipse(0, 0, q.r * S, q.r * 0.45 * S, 0, 0, TAU);
    g.fill();
    g.restore();
  }
  it.parts = P.filter((q) => q.v < 1.02);
};

const WING_COLORS = ["#f6e08a", "#ffffff", "#f0a24a", "#c8a0e0"];
export const butterflies: Drawer = (it, { g, dt, t, X, Y, S }) => {
  const a = it.a;
  const P = it.parts as Wing[];
  if (!P.length) {
    for (let i = 0; i < 5; i++)
      P.push({
        u: rnd(a[0], a[1]),
        v: rnd(a[2], a[3]),
        p: Math.random() * 6,
        c: WING_COLORS[i % 4],
      });
  }
  for (const q of P) {
    q.u += Math.sin(t * 0.7 + q.p) * 0.02 * dt;
    q.v += Math.cos(t * 0.9 + q.p * 2) * 0.015 * dt;
    q.u = Math.min(a[1], Math.max(a[0], q.u));
    q.v = Math.min(a[3], Math.max(a[2], q.v));
    const w = Math.abs(Math.sin(t * 14 + q.p)) * 4 * S + 1;
    g.fillStyle = q.c;
    g.beginPath();
    g.ellipse(X(q.u) - w / 2, Y(q.v), w, 3 * S, -0.4, 0, TAU);
    g.ellipse(X(q.u) + w / 2, Y(q.v), w, 3 * S, 0.4, 0, TAU);
    g.fill();
  }
};

export const fireflies: Drawer = (it, { g, dt, t, X, Y, S }) => {
  const a = it.a;
  const P = it.parts as Wing[];
  if (!P.length)
    for (let i = 0; i < 22; i++)
      P.push({ u: rnd(a[0], a[1]), v: rnd(a[2], a[3]), p: Math.random() * 6, c: "" });
  for (const q of P) {
    q.u += Math.sin(t * 0.4 + q.p) * 0.01 * dt;
    q.v += Math.cos(t * 0.5 + q.p) * 0.008 * dt;
    const k = Math.max(0, Math.sin(t * 1.6 + q.p * 3));
    const x = X(q.u);
    const y = Y(q.v);
    const gr = g.createRadialGradient(x, y, 0, x, y, 9 * S);
    gr.addColorStop(0, `rgba(250,240,150,${0.9 * k})`);
    gr.addColorStop(1, "rgba(250,240,150,0)");
    g.fillStyle = gr;
    g.fillRect(x - 9 * S, y - 9 * S, 18 * S, 18 * S);
  }
};

export const mist: Drawer = (it, { g, dt, X, Y, night }) => {
  const a = it.a;
  const P = it.parts as Bank[];
  if (!P.length) {
    for (let i = 0; i < 5; i++)
      P.push({ u: Math.random(), v: rnd(a[0], a[1]), sp: rnd(0.004, 0.01), r: rnd(0.12, 0.22) });
  }
  for (const q of P) {
    q.u += q.sp * dt;
    if (q.u > 1.3) q.u = -0.3;
    const x = X(q.u);
    const y = Y(q.v);
    const rr = X(q.r) - X(0);
    const gr = g.createRadialGradient(x, y, 0, x, y, rr);
    gr.addColorStop(0, night ? "rgba(150,165,200,.14)" : "rgba(255,255,255,.2)");
    gr.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = gr;
    g.beginPath();
    g.ellipse(x, y, rr, rr * 0.25, 0, 0, TAU);
    g.fill();
  }
};
