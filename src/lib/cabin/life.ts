// What moves in the cabin scene (scene.ts): the fire and its embers, chimney smoke, the light in the windows,
// deer crossing behind the cabin, birds, and falling snow.
import { rng, type CabinMode, type Place } from "./scene";
import { windows } from "./shapes";

type Flake = { x: number; y: number; s: number; v: number; sway: number; ph: number; near: 0 | 1 };
type Ember = { x: number; y: number; vx: number; vy: number; age: number; life: number };
type Puff = { x: number; y: number; r: number; age: number; life: number };
type Deer = { off: number; size: number; antlers: boolean; ph: number };
type Bird = { dx: number; dy: number; ph: number; s: number };

export type Life = {
  flakes: Flake[];
  embers: Ember[];
  puffs: Puff[];
  deer: Deer[];
  birds: Bird[];
  rand: () => number;
  emberDebt: number;
  puffDebt: number;
};

/** One soft round puff, painted once and reused for smoke and for the big flakes near the eye. */
let puffCv: HTMLCanvasElement | null = null;
function soft(): HTMLCanvasElement {
  if (puffCv) return puffCv;
  puffCv = document.createElement("canvas");
  puffCv.width = puffCv.height = 64;
  const p = puffCv.getContext("2d")!;
  const g = p.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.5, "rgba(255,255,255,0.45)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  p.fillStyle = g;
  p.fillRect(0, 0, 64, 64);
  return puffCv;
}

export function makeLife(pl: Place): Life {
  const r = rng(404);
  const area = (pl.w * pl.h) / (1440 * 800);
  const count = Math.round(170 * Math.max(0.45, Math.min(1.4, area)));
  const flakes: Flake[] = [];
  for (let i = 0; i < count; i++) {
    const near = i % 9 === 0 ? 1 : 0;
    flakes.push({
      x: r() * pl.w,
      y: r() * pl.h,
      s: near ? 3.5 + r() * 5 : 0.9 + r() * 1.9,
      v: near ? 70 + r() * 50 : 22 + r() * 46,
      sway: 8 + r() * 22,
      ph: r() * 7,
      near,
    });
  }
  return {
    flakes,
    embers: [],
    puffs: [],
    deer: [
      { off: 0, size: 1, antlers: true, ph: 0 },
      { off: 120, size: 0.86, antlers: false, ph: 1.9 },
      { off: 205, size: 0.6, antlers: false, ph: 3.4 },
    ],
    birds: Array.from({ length: 7 }, (_, i) => ({
      dx: -Math.abs(i - 3) * 26 - r() * 8,
      dy: (i - 3) * 13 + r() * 6,
      ph: r() * 7,
      s: 0.8 + r() * 0.5,
    })),
    rand: r,
    emberDebt: 0,
    puffDebt: 0,
  };
}

/** Snow. `near` 0 is the fine snow in the air; 1 is the few big soft flakes close to the eye. */
export function drawSnow(
  c: CanvasRenderingContext2D,
  pl: Place,
  life: Life,
  t: number,
  dt: number,
  wind: number,
  near: 0 | 1
) {
  // a gust on arriving, as if stepping through a flurry into the clearing
  const gust = 1 + 5 * Math.exp(-t * 1.1);
  c.fillStyle = "#ffffff";
  for (const f of life.flakes) {
    if (f.near !== near) continue;
    f.y += f.v * dt * (near ? 1 : 0.8) * (1 + (gust - 1) * 0.35);
    f.x += (wind * (near ? 90 : 46) + 12 * gust) * dt + Math.sin(t * 0.9 + f.ph) * f.sway * dt;
    if (f.y > pl.h + 12) {
      f.y = -12;
      f.x = life.rand() * pl.w;
    }
    if (f.x > pl.w + 12) f.x = -12;
    if (f.x < -12) f.x = pl.w + 12;
    const size = f.s * Math.max(0.8, pl.u);
    if (near) {
      c.globalAlpha = 0.5;
      c.drawImage(soft(), f.x - size * 1.6, f.y - size * 1.6, size * 3.2, size * 3.2);
      continue;
    }
    c.globalAlpha = 0.55 + 0.35 * Math.sin(f.ph + t);
    c.beginPath();
    c.arc(f.x, f.y, size, 0, 7);
    c.fill();
  }
  c.globalAlpha = 1;
}

/** A small flock crossing the upper sky, wings beating. */
export function drawBirds(
  c: CanvasRenderingContext2D,
  pl: Place,
  life: Life,
  t: number,
  col: string
) {
  const { w, u, horizon } = pl;
  const span = w + 500 * u;
  const lead = ((t * 34 * u + w * 0.42) % span) - 120 * u;
  const y0 = horizon * 0.34 + Math.sin(t * 0.21) * 16 * u;
  c.strokeStyle = col;
  c.lineCap = "round";
  c.lineJoin = "round";
  for (const b of life.birds) {
    const x = lead + b.dx * u;
    const y = y0 + b.dy * u + Math.sin(t * 0.7 + b.ph) * 4 * u;
    const flap = Math.sin(t * 6.4 + b.ph);
    const s = 9 * u * b.s;
    c.lineWidth = Math.max(1.2, 2.1 * u * b.s);
    c.beginPath();
    c.moveTo(x - s, y - flap * s * 0.55);
    c.quadraticCurveTo(x - s * 0.4, y - s * 0.25 - flap * s * 0.2, x, y);
    c.quadraticCurveTo(x + s * 0.4, y - s * 0.25 - flap * s * 0.2, x + s, y - flap * s * 0.55);
    c.stroke();
  }
}

/** Three deer in silhouette, bounding from right to left along the tree line, far enough to stay small. */
export function drawDeer(
  c: CanvasRenderingContext2D,
  pl: Place,
  life: Life,
  t: number,
  col: string
) {
  const { w, u, horizon } = pl;
  const span = w + 520 * u;
  const lead = w * 0.84 - ((t * 30 * u) % span);
  for (const d of life.deer) {
    let x = lead + d.off * u;
    if (x < -160 * u) x += span;
    const stride = t * 5.2 + d.ph;
    const hop = Math.abs(Math.sin(stride)) * 9 * u * d.size;
    const s = 0.92 * u * d.size;
    const y = horizon + 62 * u - hop;
    c.save();
    c.translate(x, y);
    c.rotate(Math.cos(stride) * -0.06);
    c.scale(s, s);
    c.fillStyle = col;
    c.strokeStyle = col;
    c.lineCap = "round";
    c.lineJoin = "round";
    // legs: the front pair and the back pair swing against each other
    const leg = (hx: number, a: number, back: boolean) => {
      const kx = hx + Math.sin(a) * 15;
      const ky = -22 + Math.cos(a) * 15;
      const b = a + (back ? 0.55 : -0.5) * (0.6 + 0.4 * Math.sin(stride));
      c.lineWidth = 4;
      c.beginPath();
      c.moveTo(hx, -24);
      c.lineTo(kx, ky);
      c.stroke();
      c.lineWidth = 2.8;
      c.beginPath();
      c.moveTo(kx, ky);
      c.lineTo(kx + Math.sin(b) * 17, ky + Math.cos(b) * 17);
      c.stroke();
    };
    const swing = Math.sin(stride) * 0.62;
    leg(-14, -swing - 0.12, false);
    leg(-9, -swing * 0.7 + 0.14, false);
    leg(15, swing + 0.1, true);
    leg(19, swing * 0.7 - 0.16, true);
    // body, rump, chest
    c.beginPath();
    c.ellipse(2, -31, 23, 10.5, -0.05, 0, 7);
    c.fill();
    c.beginPath();
    c.ellipse(17, -32, 11, 11, 0, 0, 7);
    c.fill();
    c.beginPath();
    c.ellipse(-15, -33, 10, 11.5, 0, 0, 7);
    c.fill();
    // neck and head, facing left
    c.lineWidth = 10;
    c.beginPath();
    c.moveTo(-18, -36);
    c.quadraticCurveTo(-25, -46, -27, -57);
    c.stroke();
    c.beginPath();
    c.ellipse(-32, -60, 8.5, 5, 0.32, 0, 7);
    c.fill();
    c.beginPath();
    c.ellipse(-24, -66, 2.4, 5.5, 0.5, 0, 7);
    c.fill();
    // tail, held up as they bound
    c.beginPath();
    c.ellipse(27, -39, 3, 5.5, -0.5, 0, 7);
    c.fill();
    if (d.antlers) {
      c.lineWidth = 1.9;
      for (const side of [0, 1]) {
        const ox = -27 + side * 3;
        c.beginPath();
        c.moveTo(ox, -64);
        c.quadraticCurveTo(ox + 4, -78, ox + 13, -86);
        c.moveTo(ox + 3, -73);
        c.lineTo(ox - 4, -81);
        c.moveTo(ox + 7, -80);
        c.lineTo(ox + 3, -90);
        c.moveTo(ox + 10, -84);
        c.lineTo(ox + 17, -92);
        c.stroke();
      }
    }
    c.restore();
  }
}

/** Smoke from the chimney: soft puffs that rise, widen, lean with the wind and thin out. */
export function drawSmoke(
  c: CanvasRenderingContext2D,
  pl: Place,
  life: Life,
  t: number,
  dt: number,
  wind: number,
  mode: CabinMode
) {
  const { u } = pl;
  const sx = pl.cabinX + pl.cabinW * 0.24 + 20 * u;
  const sy = pl.cabinY - 118 * u - 104 * u * 0.9 - 8 * u;
  life.puffDebt += dt * 3.2;
  while (life.puffDebt > 1) {
    life.puffDebt -= 1;
    life.puffs.push({
      x: sx + (life.rand() - 0.5) * 10 * u,
      y: sy,
      r: 9 * u,
      age: 0,
      life: 5 + life.rand() * 2.5,
    });
  }
  life.puffs = life.puffs.filter((p) => p.age < p.life);
  for (const p of life.puffs) {
    p.age += dt;
    const k = p.age / p.life;
    p.y -= (30 - 14 * k) * u * dt;
    p.x += (10 + wind * 60 + Math.sin(t * 0.8 + p.life * 9) * 6) * u * dt * (0.4 + k);
    p.r += 9 * u * dt;
    c.globalAlpha =
      (mode === "night" ? 0.2 : 0.17) * Math.sin(Math.PI * Math.min(1, k * 1.05)) ** 1.3;
    c.drawImage(soft(), p.x - p.r * 1.5, p.y - p.r * 1.5, p.r * 3, p.r * 3);
  }
  c.globalAlpha = 1;
}

/** The campfire, its glow on the snow and the cabin, the windows' light, and embers rising. */
export function drawFire(
  c: CanvasRenderingContext2D,
  pl: Place,
  life: Life,
  t: number,
  dt: number,
  fire: number,
  mode: CabinMode
) {
  const { u, fireX: x, fireY: y } = pl;
  const flick = 0.86 + 0.09 * Math.sin(t * 9.1) + 0.05 * Math.sin(t * 23.3 + 1);
  const night = mode === "night";

  // the windows glow and spill onto the snow, steady, with a slow breath
  const breath = 0.85 + 0.15 * Math.sin(t * 1.3);
  c.save();
  c.globalCompositeOperation = "lighter";
  for (const wx of windows(pl)) {
    const wy = pl.cabinY - 70 * u;
    const g = c.createRadialGradient(wx, wy, 6 * u, wx, wy, 120 * u);
    g.addColorStop(0, `rgba(255, 190, 96, ${(night ? 0.5 : 0.3) * breath})`);
    g.addColorStop(1, "rgba(255, 170, 80, 0)");
    c.fillStyle = g;
    c.fillRect(wx - 120 * u, wy - 120 * u, 240 * u, 240 * u);
    const sp = c.createRadialGradient(wx, pl.cabinY + 26 * u, 0, wx, pl.cabinY + 26 * u, 90 * u);
    sp.addColorStop(0, `rgba(255, 176, 90, ${(night ? 0.3 : 0.2) * breath})`);
    sp.addColorStop(1, "rgba(255, 170, 80, 0)");
    c.fillStyle = sp;
    c.save();
    c.translate(wx, pl.cabinY + 26 * u);
    c.scale(1, 0.34);
    c.translate(-wx, -(pl.cabinY + 26 * u));
    c.fillRect(wx - 90 * u, pl.cabinY - 64 * u, 180 * u, 180 * u);
    c.restore();
  }
  // the fire's glow: wide on the snow, warm on everything near it
  if (fire > 0.01) {
    const R = (250 + 30 * flick) * u * Math.min(1.25, 0.4 + fire * 0.7);
    const g = c.createRadialGradient(x, y - 14 * u, 4 * u, x, y - 14 * u, R);
    const a = Math.min(1, fire) * flick * (night ? 0.62 : 0.4);
    g.addColorStop(0, `rgba(255, 170, 70, ${a})`);
    g.addColorStop(0.3, `rgba(255, 120, 50, ${a * 0.42})`);
    g.addColorStop(1, "rgba(255, 90, 40, 0)");
    c.fillStyle = g;
    c.fillRect(x - R, y - R, R * 2, R * 2);
  }
  c.restore();

  // stones and logs
  c.fillStyle = night ? "#2c2a45" : "#6a6480";
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2;
    c.beginPath();
    c.ellipse(x + Math.cos(a) * 30 * u, y + Math.sin(a) * 9 * u + 2 * u, 8 * u, 5.5 * u, 0, 0, 7);
    c.fill();
  }
  c.strokeStyle = night ? "#2b1a14" : "#4a2d20";
  c.lineCap = "round";
  c.lineWidth = 9 * u;
  for (const [a, b] of [
    [-22, 20],
    [22, -19],
    [-4, 6],
  ]) {
    c.beginPath();
    c.moveTo(x + a * u, y + 1 * u);
    c.lineTo(x + b * u, y - 12 * u);
    c.stroke();
  }
  if (fire <= 0.01) return;

  // flames: three tongues inside each other, each licking on its own beat
  const tongue = (wide: number, tall: number, sway: number, col: string, beat: number) => {
    const hgt = tall * u * Math.min(1.5, fire) * (0.82 + 0.18 * Math.sin(t * beat + sway));
    const wd = wide * u * Math.min(1.2, 0.5 + fire * 0.5);
    const tip = Math.sin(t * (beat * 0.6) + sway * 2) * wd * 0.5;
    c.fillStyle = col;
    c.beginPath();
    c.moveTo(x - wd, y - 4 * u);
    c.bezierCurveTo(
      x - wd * 1.7,
      y - hgt * 0.3,
      x - wd * 0.05 + tip,
      y - hgt * 0.62,
      x + tip,
      y - hgt
    );
    c.bezierCurveTo(
      x + wd * 0.5 + tip,
      y - hgt * 0.6,
      x + wd * 1.6,
      y - hgt * 0.26,
      x + wd,
      y - 4 * u
    );
    c.quadraticCurveTo(x, y + 7 * u, x - wd, y - 4 * u);
    c.fill();
  };
  c.save();
  // by night the flames add their light; at dusk the snow is bright, so they are painted as they are
  if (night) c.globalCompositeOperation = "lighter";
  tongue(19, 70, 0, night ? "rgba(255, 96, 32, 0.85)" : "#ee5a24", 7.3);
  tongue(13, 52, 1.7, night ? "rgba(255, 168, 48, 0.9)" : "#ff9a2e", 9.1);
  tongue(7, 32, 3.1, night ? "rgba(255, 238, 170, 0.95)" : "#ffe9a6", 11.7);
  c.globalCompositeOperation = "lighter";

  // embers
  life.emberDebt += dt * 16 * Math.min(1.6, fire);
  while (life.emberDebt > 1) {
    life.emberDebt -= 1;
    life.embers.push({
      x: x + (life.rand() - 0.5) * 22 * u,
      y: y - 20 * u,
      vx: (life.rand() - 0.5) * 26 * u,
      vy: -(34 + life.rand() * 52) * u,
      age: 0,
      life: 1.6 + life.rand() * 2.4,
    });
  }
  life.embers = life.embers.filter((e) => e.age < e.life);
  for (const e of life.embers) {
    e.age += dt;
    e.x += (e.vx + Math.sin(t * 3 + e.life * 20) * 16 * u) * dt;
    e.y += e.vy * dt;
    e.vy *= 1 - 0.25 * dt;
    const k = e.age / e.life;
    c.globalAlpha = (1 - k) ** 1.4;
    c.fillStyle = k < 0.4 ? "#ffd98a" : "#ff8a3c";
    c.beginPath();
    c.arc(e.x, e.y, Math.max(0.9, (2.1 - k * 1.2) * u), 0, 7);
    c.fill();
  }
  c.restore();
}
