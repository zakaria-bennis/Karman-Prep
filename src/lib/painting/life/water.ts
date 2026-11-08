/* What lives on the water: ducks, jumping fish, glints, rings, the moon's path, sailboats, surf,
   the waterfall and its spray, a heron and dragonflies. */
import { rnd, TAU, type Drawer } from "./types";

interface Duck {
  u: number;
  v: number;
  dir: number;
  sp: number;
}
interface Jump {
  u: number;
  v: number;
  life: number;
  dir: number;
}
interface Glint {
  u: number;
  v: number;
  life: number;
  max: number;
  w: number;
}
interface Ring {
  u: number;
  v: number;
  life: number;
}
interface Boat {
  u: number;
}
interface Wave {
  v: number;
  w: number;
  ph: number;
}
interface Streak {
  u: number;
  v: number;
  sp: number;
  len: number;
}
interface Drop {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  r: number;
}
interface Heron {
  phase: "stand" | "fly";
  timer: number;
  u: number;
  v: number;
  fly: number;
}
interface Fly {
  u: number;
  v: number;
  tu: number;
  tv: number;
  hold: number;
}

/** A few ducks paddle across, each pulling a V of ripples behind it. */
export const ducks: Drawer = (it, { g, dt, X, Y, S, ink }) => {
  const a = it.a;
  const P = it.parts as Duck[];
  if (!P.length) {
    for (let i = 0; i < 3; i++) {
      P.push({
        u: rnd(a[0], a[1]),
        v: rnd(a[2], a[3]),
        dir: Math.random() < 0.5 ? 1 : -1,
        sp: rnd(0.004, 0.008),
      });
    }
  }
  for (const q of P) {
    q.u += q.dir * q.sp * dt;
    if (q.u > a[1] || q.u < a[0]) q.dir *= -1;
    const x = X(q.u);
    const y = Y(q.v);
    const s2 = (4 + (q.v - a[2]) * 30) * S;
    g.strokeStyle = "rgba(255,255,255,.35)";
    g.lineWidth = 1;
    g.beginPath();
    g.moveTo(x - q.dir * s2 * 4, y - s2 * 0.6 + 4);
    g.lineTo(x, y + 2);
    g.lineTo(x - q.dir * s2 * 4, y + s2 * 0.8 + 4);
    g.stroke();
    g.fillStyle = ink + "0.9)";
    g.beginPath();
    g.ellipse(x, y, s2, s2 * 0.45, 0, 0, TAU);
    g.fill();
    g.beginPath();
    g.arc(x + q.dir * s2 * 0.7, y - s2 * 0.55, s2 * 0.32, 0, TAU);
    g.fill();
  }
};

export const fishJump: Drawer = (it, { g, dt, X, Y, S }) => {
  const a = it.a;
  const P = it.parts as Jump[];
  it.clock -= dt;
  if (it.clock <= 0) {
    P.push({ u: rnd(a[0], a[1]), v: rnd(a[2], a[3]), life: 0, dir: Math.random() < 0.5 ? 1 : -1 });
    it.clock = rnd(6, 12);
  }
  for (const q of P) {
    q.life += dt;
    const k = q.life / 0.7;
    const x = X(q.u) + q.dir * k * 18 * S;
    const y = Y(q.v) - Math.sin(Math.min(1, k) * Math.PI) * 22 * S;
    if (k < 1) {
      g.save();
      g.translate(x, y);
      g.rotate(q.dir * (k - 0.5) * 2);
      g.fillStyle = "rgba(200,210,220,.9)";
      g.beginPath();
      g.ellipse(0, 0, 6 * S, 2.2 * S, 0, 0, TAU);
      g.fill();
      g.restore();
    }
    const rr = Math.max(0, q.life - 0.65) * 26 * S;
    if (rr) {
      g.strokeStyle = `rgba(255,255,255,${Math.max(0, 0.5 - (q.life - 0.65) * 0.3)})`;
      g.beginPath();
      g.ellipse(X(q.u) + q.dir * 18 * S, Y(q.v), rr, rr * 0.28, 0, 0, TAU);
      g.stroke();
    }
  }
  it.parts = P.filter((q) => q.life < 2.4);
};

export const glints: Drawer = (it, { g, dt, X, Y, S }) => {
  const a = it.a;
  const P = it.parts as Glint[];
  if (P.length < 26 && Math.random() < 0.6) {
    P.push({ u: rnd(a[0], a[1]), v: rnd(a[2], a[3]), life: 0, max: rnd(0.8, 2.2), w: rnd(8, 30) });
  }
  for (const q of P) {
    q.life += dt;
    const k = Math.sin((q.life / q.max) * Math.PI);
    g.fillStyle = `rgba(255,250,235,${0.55 * k})`;
    g.fillRect(X(q.u), Y(q.v), q.w * S * (0.5 + (q.v - a[2]) * 2), 1.4);
  }
  it.parts = P.filter((q) => q.life < q.max);
};

export const rings: Drawer = (it, { g, dt, X, Y, S, state }) => {
  const a = it.a;
  const P = it.parts as Ring[];
  state.ringsAt -= dt;
  if (state.ringsAt <= 0) {
    P.push({ u: rnd(a[0], a[1]), v: rnd(a[2], a[3]), life: 0 });
    state.ringsAt = rnd(2.5, 6);
  }
  for (const q of P) {
    q.life += dt;
    for (let r = 0; r < 2; r++) {
      const rr = (q.life * 22 - r * 8) * S;
      if (rr <= 0) continue;
      g.strokeStyle = `rgba(255,255,255,${Math.max(0, 0.45 - q.life * 0.16)})`;
      g.lineWidth = 1;
      g.beginPath();
      g.ellipse(X(q.u), Y(q.v), rr, rr * 0.28, 0, 0, TAU);
      g.stroke();
    }
  }
  it.parts = P.filter((q) => q.life < 3);
};

/** The moon's path on the water, a column of shimmering light. */
export const moonpath: Drawer = (it, { g, t, X, Y, S }) => {
  const a = it.a;
  for (let i = 0; i < 26; i++) {
    const v = a[1] + (i / 26) * (a[2] - a[1]);
    const w = (14 + i * 3) * S * (0.6 + 0.4 * Math.abs(Math.sin(t * 2 + i * 1.7)));
    const x = X(a[0]) + Math.sin(t * 1.3 + i) * 4 * S;
    g.fillStyle = `rgba(235,238,255,${0.12 + 0.3 * Math.abs(Math.sin(t * 1.6 + i * 2.3))})`;
    g.fillRect(x - w / 2, Y(v), w, 1.6);
  }
};

export const sailboat: Drawer = (it, { g, dt, t, X, Y, S, night, time }) => {
  const a = it.a;
  const P = it.parts as Boat[];
  if (!P.length) P.push({ u: rnd(a[0], a[1]) });
  const q = P[0];
  q.u += 0.003 * dt;
  if (q.u > a[1] + 0.1) q.u = a[0] - 0.1;
  const x = X(q.u);
  const y = Y(a[2]) + Math.sin(t * 1.5) * 1.5;
  const s2 = 16 * S;
  g.fillStyle = night ? "rgba(40,50,80,.9)" : "rgba(60,45,40,.95)";
  g.fillRect(x - s2 * 0.6, y - s2 * 0.12, s2 * 1.2, s2 * 0.18);
  g.fillStyle = time === "sunset" ? "rgba(255,210,170,.95)" : "rgba(250,248,240,.95)";
  g.beginPath();
  g.moveTo(x, y - s2 * 1.3);
  g.lineTo(x, y - s2 * 0.15);
  g.lineTo(x + s2 * 0.6, y - s2 * 0.15);
  g.closePath();
  g.fill();
  g.beginPath();
  g.moveTo(x - 1, y - s2 * 1.1);
  g.lineTo(x - 1, y - s2 * 0.15);
  g.lineTo(x - s2 * 0.4, y - s2 * 0.15);
  g.closePath();
  g.fill();
};

/** Lines of surf roll in toward the beach, curl white, and fade on the sand. */
export const waves: Drawer = (it, { g, dt, t, X, Y }) => {
  const a = it.a;
  const P = it.parts as Wave[];
  if (P.length < 4 && Math.random() < dt * 0.6)
    P.push({ v: a[2], w: rnd(0.5, 1), ph: Math.random() * 6 });
  for (const q of P) {
    q.v += 0.018 * dt;
    const k = (q.v - a[2]) / (a[3] - a[2]);
    g.strokeStyle = `rgba(255,255,255,${0.7 * Math.sin(k * Math.PI)})`;
    g.lineWidth = 1.5 + k * 3;
    g.beginPath();
    for (let u = a[0]; u <= a[1] * q.w + 0.05; u += 0.01) {
      const y = Y(q.v + Math.sin(u * 30 + q.ph + t) * 0.003);
      if (u === a[0]) g.moveTo(X(u), y);
      else g.lineTo(X(u), y);
    }
    g.stroke();
  }
  it.parts = P.filter((q) => q.v < a[3]);
};

/** Water streaks pouring down the fall, faster at the bottom. */
export const fall: Drawer = (it, { g, dt, X, Y }) => {
  const a = it.a;
  const P = it.parts as Streak[];
  if (P.length < 70) {
    for (let i = 0; i < 3; i++)
      P.push({ u: rnd(a[0], a[1]), v: a[2], sp: rnd(0.2, 0.35), len: rnd(0.02, 0.05) });
  }
  for (const q of P) {
    q.sp += dt * 0.3;
    q.v += q.sp * dt;
    g.strokeStyle = "rgba(255,255,255,.55)";
    g.lineWidth = 1.4;
    g.beginPath();
    g.moveTo(X(q.u), Y(q.v));
    g.lineTo(X(q.u), Y(q.v - q.len));
    g.stroke();
  }
  it.parts = P.filter((q) => q.v < a[3]);
};

export const spray: Drawer = (it, { g, dt, X, Y, S }) => {
  const a = it.a;
  const P = it.parts as Drop[];
  if (P.length < 40)
    P.push({ x: rnd(-30, 30), y: 0, vx: rnd(-14, 14), vy: rnd(-26, -10), life: 0, r: rnd(3, 8) });
  for (const q of P) {
    q.life += dt;
    q.x += q.vx * dt;
    q.y += q.vy * dt;
    q.vy += 18 * dt;
    g.fillStyle = `rgba(255,255,255,${Math.max(0, 0.4 - q.life * 0.25)})`;
    g.beginPath();
    g.arc(X(a[0]) + q.x * S, Y(a[1]) + q.y * S, (q.r + q.life * 6) * S, 0, TAU);
    g.fill();
  }
  it.parts = P.filter((q) => q.life < 1.6);
};

/** A heron stands in the shallows, now and then dips its head, then flies off and returns. */
export const heron: Drawer = (it, { g, dt, t, X, Y, S, ink }) => {
  const a = it.a;
  const P = it.parts as Heron[];
  if (!P.length) P.push({ phase: "stand", timer: rnd(8, 12), u: a[0], v: a[1], fly: 0 });
  const q = P[0];
  q.timer -= dt;
  if (q.phase === "stand" && q.timer <= 0) {
    q.phase = "fly";
    q.fly = 0;
  }
  const s2 = 14 * S;
  if (q.phase === "stand") {
    const x = X(q.u);
    const y = Y(q.v);
    const dip = Math.sin(t * 0.6) > 0.85;
    g.strokeStyle = ink + "0.95)";
    g.fillStyle = g.strokeStyle;
    g.lineWidth = 1.4;
    g.beginPath();
    g.moveTo(x - 2, y);
    g.lineTo(x - 2, y - s2 * 1.4);
    g.moveTo(x + 2, y);
    g.lineTo(x + 2, y - s2 * 1.4);
    g.stroke();
    g.beginPath();
    g.ellipse(x, y - s2 * 1.75, s2 * 0.6, s2 * 0.32, -0.3, 0, TAU);
    g.fill();
    g.lineWidth = 2;
    const hx = x + s2 * (dip ? 0.9 : 0.7);
    const hy = y - s2 * (dip ? 1.2 : 2.6);
    g.beginPath();
    g.moveTo(x + s2 * 0.4, y - s2 * 1.9);
    g.quadraticCurveTo(x + s2 * 0.6, y - s2 * (dip ? 1.5 : 2.6), hx, hy);
    g.stroke();
    g.beginPath();
    g.moveTo(hx, hy);
    g.lineTo(x + s2 * (dip ? 1.3 : 1.15), y - s2 * (dip ? 1.0 : 2.55));
    g.stroke();
  } else {
    q.fly += dt;
    const x = X(q.u + q.fly * 0.05);
    const y = Y(q.v - q.fly * 0.03) - s2;
    const w = s2 * 1.6;
    const flap = Math.sin(t * 4) * 0.6;
    g.strokeStyle = ink + "0.9)";
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(x - w, y - w * flap * 0.5);
    g.quadraticCurveTo(x - w * 0.3, y - w * 0.3, x, y);
    g.quadraticCurveTo(x + w * 0.3, y - w * 0.3, x + w, y - w * flap * 0.5);
    g.stroke();
    if (q.fly > 12) {
      q.phase = "stand";
      q.timer = rnd(8, 12);
    }
  }
};

export const dragonflies: Drawer = (it, { g, dt, t, X, Y, S }) => {
  const a = it.a;
  const P = it.parts as Fly[];
  if (!P.length)
    for (let i = 0; i < 4; i++)
      P.push({ u: rnd(a[0], a[1]), v: rnd(a[2], a[3]), tu: 0, tv: 0, hold: 0 });
  for (const q of P) {
    q.hold -= dt;
    if (q.hold <= 0) {
      q.tu = rnd(a[0], a[1]);
      q.tv = rnd(a[2], a[3]);
      q.hold = rnd(0.6, 1.8);
    }
    q.u += (q.tu - q.u) * Math.min(1, dt * 4);
    q.v += (q.tv - q.v) * Math.min(1, dt * 4);
    const x = X(q.u);
    const y = Y(q.v);
    g.strokeStyle = "rgba(60,110,120,.95)";
    g.lineWidth = 1.6;
    g.beginPath();
    g.moveTo(x - 6 * S, y);
    g.lineTo(x + 6 * S, y);
    g.stroke();
    g.fillStyle = `rgba(220,240,255,${0.35 + Math.abs(Math.sin(t * 40)) * 0.3})`;
    g.beginPath();
    g.ellipse(x, y - 2, 5 * S, 1.5 * S, 0.4, 0, TAU);
    g.ellipse(x, y + 2, 5 * S, 1.5 * S, -0.4, 0, TAU);
    g.fill();
  }
};
