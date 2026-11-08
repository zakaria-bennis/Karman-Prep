/* What lives in the sky: stars, birds, a hawk, geese, gulls, bats, shooting stars, aurora, an owl. */
import { rnd, TAU, type Drawer } from "./types";

interface Star {
  u: number;
  v: number;
  p: number;
  s: number;
}
interface Bird {
  du: number;
  dv: number;
  ph: number;
  sz: number;
}
interface Flock {
  dir: number;
  u: number;
  v: number;
  speed: number;
  birds: Bird[];
}
interface Flier {
  dir: number;
  u: number;
  v: number;
  p: number;
}
interface Bat {
  p: number;
  sp: number;
  cu: number;
  cv: number;
}
interface Spark {
  u: number;
  v: number;
  life: number;
}
interface Owl {
  phase: "perch" | "fly";
  timer: number;
  fly: number;
}

export const stars: Drawer = (it, { g, t, X, Y }) => {
  for (const s of it.parts as Star[]) {
    const tw = 0.35 + 0.65 * Math.abs(Math.sin(t * s.s + s.p));
    g.fillStyle = `rgba(240,242,255,${tw})`;
    g.fillRect(X(s.u), Y(s.v), 1.6, 1.6);
  }
};

/** A small flock crosses every so often, flapping, in a loose V. */
export const birds: Drawer = (it, { g, dt, t, X, Y, S, ink, state }) => {
  const a = it.a;
  const P = it.parts as Flock[];
  state.birdsAt -= dt;
  if (state.birdsAt <= 0 && P.length < 2) {
    const dir = Math.random() < 0.5 ? 1 : -1;
    const n = Math.floor(rnd(3, 8));
    P.push({
      dir,
      u: dir > 0 ? -0.05 : 1.05,
      v: rnd(a[0], a[1]),
      speed: rnd(0.035, 0.06),
      birds: Array.from({ length: n }, (_, i) => ({
        du: -dir * Math.floor((i + 1) / 2) * 0.018,
        dv: (i % 2 ? -1 : 1) * Math.ceil(i / 2) * 0.012,
        ph: Math.random() * TAU,
        sz: rnd(0.8, 1.2),
      })),
    });
    state.birdsAt = rnd(5, 11);
  }
  for (const f of P) {
    f.u += f.dir * f.speed * dt;
    f.v += Math.sin(t * 0.5 + f.speed * 40) * 0.0006;
    for (const b of f.birds) {
      const x = X(f.u + b.du);
      const y = Y(f.v + b.dv + Math.sin(t * 1.3 + b.ph) * 0.004);
      const w = 7 * S * b.sz;
      const flap = Math.sin(t * 9 + b.ph) * 0.8;
      g.strokeStyle = ink + "0.85)";
      g.lineWidth = 1.6;
      g.beginPath();
      g.moveTo(x - w, y - w * flap * 0.6);
      g.quadraticCurveTo(x - w * 0.4, y - w * 0.5, x, y);
      g.quadraticCurveTo(x + w * 0.4, y - w * 0.5, x + w, y - w * flap * 0.6);
      g.stroke();
    }
  }
  it.parts = P.filter((f) => f.u > -0.3 && f.u < 1.3);
};

/** A hawk circles high on a thermal, tilting as it turns. */
export const hawk: Drawer = (it, { g, t, X, Y, S, ink }) => {
  const a = it.a;
  const ang = t * 0.35;
  const x = X(a[0] + Math.cos(ang) * 0.06);
  const y = Y(a[1] + Math.sin(ang) * 0.025);
  const w = 13 * S;
  g.save();
  g.translate(x, y);
  g.rotate(Math.sin(ang) * 0.4);
  g.strokeStyle = ink + "0.9)";
  g.lineWidth = 2;
  g.beginPath();
  g.moveTo(-w, -2);
  g.quadraticCurveTo(-w * 0.4, -w * 0.25, 0, 0);
  g.quadraticCurveTo(w * 0.4, -w * 0.25, w, -2);
  g.stroke();
  g.restore();
};

/** A V of geese, slow wingbeats, crossing once in a while. */
export const geese: Drawer = (it, { g, dt, t, X, Y, S, ink }) => {
  const a = it.a;
  const P = it.parts as Flier[];
  it.clock -= dt;
  if (it.clock <= 0 && !P.length) {
    const dir = Math.random() < 0.5 ? 1 : -1;
    P.push({ dir, u: dir > 0 ? -0.1 : 1.1, v: rnd(a[0], a[1]), p: 0 });
    it.clock = rnd(14, 22);
  }
  for (const f of P) {
    f.u += f.dir * 0.03 * dt;
    for (let i = 0; i < 9; i++) {
      const side = i % 2 ? 1 : -1;
      const rank = Math.ceil(i / 2);
      const x = X(f.u - f.dir * rank * 0.016);
      const y = Y(f.v + side * rank * 0.012);
      const w = 8 * S;
      const flap = Math.sin(t * 5 + i) * 0.5;
      g.strokeStyle = ink + "0.85)";
      g.lineWidth = 1.6;
      g.beginPath();
      g.moveTo(x - w, y - w * flap * 0.5);
      g.lineTo(x, y);
      g.lineTo(x + w, y - w * flap * 0.5);
      g.stroke();
    }
  }
  it.parts = P.filter((f) => f.u > -0.4 && f.u < 1.4);
};

export const gulls: Drawer = (it, { g, dt, t, X, Y, S, night }) => {
  const a = it.a;
  const P = it.parts as Flier[];
  if (P.length < 3 && Math.random() < dt * 0.3) {
    const dir = Math.random() < 0.5 ? 1 : -1;
    P.push({ dir, u: dir > 0 ? -0.05 : 1.05, v: rnd(a[0], a[1]), p: Math.random() * 6 });
  }
  for (const f of P) {
    f.u += f.dir * 0.05 * dt;
    f.v += Math.sin(t * 0.8 + f.p) * 0.006 * dt;
    const x = X(f.u);
    const y = Y(f.v);
    const w = 11 * S;
    const flap = Math.sin(t * 3 + f.p) * 0.35;
    g.strokeStyle = night ? "rgba(230,235,255,.9)" : "rgba(250,250,250,.95)";
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(x - w, y - w * (0.3 + flap));
    g.quadraticCurveTo(x - w * 0.35, y - w * 0.45, x, y);
    g.quadraticCurveTo(x + w * 0.35, y - w * 0.45, x + w, y - w * (0.3 + flap));
    g.stroke();
  }
  it.parts = P.filter((f) => f.u > -0.2 && f.u < 1.2);
};

export const bats: Drawer = (it, { g, t, X, Y, S, night }) => {
  const a = it.a;
  const P = it.parts as Bat[];
  if (!P.length) {
    for (let i = 0; i < 4; i++) {
      P.push({ p: Math.random() * 6, sp: rnd(0.8, 1.5), cu: rnd(a[0], a[1]), cv: rnd(a[2], a[3]) });
    }
  }
  for (const q of P) {
    const ph = t * q.sp + q.p;
    const x = X(q.cu + Math.sin(ph) * 0.08 + Math.sin(ph * 3.1) * 0.02);
    const y = Y(q.cv + Math.sin(ph * 1.7) * 0.05);
    const w = 6 * S;
    const flap = Math.sin(t * 18 + q.p);
    g.fillStyle = night ? "rgba(10,12,20,.95)" : "rgba(30,20,30,.95)";
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x - w, y - w * flap * 0.6);
    g.lineTo(x - w * 0.5, y + 1);
    g.lineTo(x, y + w * 0.3);
    g.lineTo(x + w * 0.5, y + 1);
    g.lineTo(x + w, y - w * flap * 0.6);
    g.closePath();
    g.fill();
  }
};

export const shootingStar: Drawer = (it, { g, dt, X, Y, S }) => {
  const P = it.parts as Spark[];
  it.clock -= dt;
  if (it.clock <= 0) {
    P.push({ u: rnd(0.2, 0.8), v: rnd(0.05, 0.25), life: 0 });
    it.clock = rnd(7, 15);
  }
  for (const q of P) {
    q.life += dt;
    const k = q.life / 0.8;
    const x0 = X(q.u + k * 0.14);
    const y0 = Y(q.v + k * 0.06);
    const gr = g.createLinearGradient(x0, y0, x0 - 90 * S, y0 - 38 * S);
    gr.addColorStop(0, `rgba(255,255,255,${0.9 * Math.sin(Math.min(1, k) * Math.PI)})`);
    gr.addColorStop(1, "rgba(255,255,255,0)");
    g.strokeStyle = gr;
    g.lineWidth = 1.6;
    g.beginPath();
    g.moveTo(x0, y0);
    g.lineTo(x0 - 90 * S, y0 - 38 * S);
    g.stroke();
  }
  it.parts = P.filter((q) => q.life < 0.8);
};

export const aurora: Drawer = (_it, { g, t, X, Y, S }) => {
  for (let b = 0; b < 3; b++) {
    g.beginPath();
    for (let u = 0; u <= 1.001; u += 0.02) {
      const y = Y(0.12 + b * 0.05 + Math.sin(u * 6 + t * 0.4 + b) * 0.03);
      if (u === 0) g.moveTo(X(u), y);
      else g.lineTo(X(u), y);
    }
    g.strokeStyle = `rgba(${b === 1 ? "140,120,230" : "110,230,170"},${0.1 + 0.06 * Math.sin(t * 0.5 + b)})`;
    g.lineWidth = 26 * S;
    g.stroke();
  }
};

/** An owl perches on a branch, blinks and turns its head, flies off and comes back later. */
export const owl: Drawer = (it, { g, dt, t, X, Y, S }) => {
  const a = it.a;
  const P = it.parts as Owl[];
  if (!P.length) P.push({ phase: "perch", timer: rnd(7, 11), fly: 0 });
  const q = P[0];
  const dir = a[2];
  const s2 = 9 * S;
  q.timer -= dt;
  if (q.phase === "perch") {
    const x = X(a[0]);
    const y = Y(a[1]);
    const blink = Math.sin(t * 1.3) > 0.97;
    const turn = Math.sin(t * 0.4) * 2.5 * S;
    const hx = turn * 0.3;
    g.strokeStyle = "#2a201a";
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(x - s2 * 1.6, y + s2 * 1.3);
    g.lineTo(x + s2 * 1.6, y + s2 * 1.2);
    g.stroke();
    g.fillStyle = "#6a5444";
    g.beginPath();
    g.ellipse(x, y, s2 * 0.75, s2 * 1.2, 0, 0, TAU);
    g.fill();
    g.fillStyle = "#7a6250";
    g.beginPath();
    g.arc(x + hx, y - s2 * 1.1, s2 * 0.62, 0, TAU);
    g.fill();
    g.beginPath();
    g.moveTo(x - s2 * 0.5 + hx, y - s2 * 1.5);
    g.lineTo(x - s2 * 0.35 + hx, y - s2 * 1.95);
    g.lineTo(x - s2 * 0.15 + hx, y - s2 * 1.55);
    g.moveTo(x + s2 * 0.5 + hx, y - s2 * 1.5);
    g.lineTo(x + s2 * 0.35 + hx, y - s2 * 1.95);
    g.lineTo(x + s2 * 0.15 + hx, y - s2 * 1.55);
    g.fill();
    for (const ex of [-0.25, 0.25]) {
      g.fillStyle = blink ? "#5a4636" : "#f2c84a";
      g.beginPath();
      g.arc(x + turn + ex * s2, y - s2 * 1.12, s2 * 0.16, 0, TAU);
      g.fill();
    }
    if (q.timer <= 0) {
      q.phase = "fly";
      q.fly = 0;
    }
  } else {
    q.fly += dt;
    const x = X(a[0] + dir * q.fly * 0.07);
    const y = Y(a[1] - q.fly * 0.05 + Math.sin(q.fly * 3) * 0.005);
    const w = s2 * 2.4;
    const flap = Math.sin(t * 6) * 0.7;
    g.fillStyle = "#5a4636";
    g.beginPath();
    g.ellipse(x, y, s2 * 0.6, s2 * 0.4, 0, 0, TAU);
    g.fill();
    g.strokeStyle = "#5a4636";
    g.lineWidth = s2 * 0.45;
    g.lineCap = "round";
    g.beginPath();
    g.moveTo(x - w, y - w * flap * 0.4);
    g.quadraticCurveTo(x - w * 0.4, y - w * 0.2, x, y);
    g.quadraticCurveTo(x + w * 0.4, y - w * 0.2, x + w, y - w * flap * 0.4);
    g.stroke();
    if (q.fly > 9) {
      q.phase = "perch";
      q.timer = rnd(9, 14);
    }
  }
};
