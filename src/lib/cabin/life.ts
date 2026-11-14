// What moves in the cabin scene (scene.ts): chimney smoke, the light in the windows and the lantern, drifting
// fog, twinkling stars, deer crossing behind the cabin, birds, and falling snow.
import { rng, type CabinMode, type Place } from "./scene";
import { cabinParts } from "./shapes";

type Flake = { x: number; y: number; s: number; v: number; sway: number; ph: number; near: 0 | 1 };
type Puff = { x: number; y: number; r: number; age: number; life: number };
type Deer = { off: number; size: number; antlers: boolean; ph: number };
type Bank = { band: 0 | 1 | 2; x: number; dy: number; wide: number; v: number; a: number };
type Twinkle = { x: number; y: number; s: number; v: number; ph: number };
type Bird = { dx: number; dy: number; ph: number; s: number };

export type Life = {
  flakes: Flake[];
  puffs: Puff[];
  deer: Deer[];
  birds: Bird[];
  banks: Bank[];
  twinkles: Twinkle[];
  rand: () => number;
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
    banks: Array.from({ length: 15 }, (_, i) => {
      const band = (i % 3) as 0 | 1 | 2;
      return {
        band,
        x: r(),
        dy: (r() - 0.5) * 50,
        wide: 620 + r() * 760,
        v: (6 + r() * 12) * (r() > 0.5 ? 1 : -1),
        a: [0.2, 0.24, 0.17][band] * (0.6 + r() * 0.5),
      };
    }),
    twinkles: Array.from({ length: 16 }, () => ({
      x: r(),
      y: r(),
      s: r() * 0.9,
      v: 0.5 + r() * 1.1,
      ph: r() * 7,
    })),
    rand: r,
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
    // Legs, as a deer's are built: a strong upper leg, a thin cannon bone below the joint, and a small hoof.
    // The hind leg's hock bends backward. The front pair and the back pair swing against each other.
    const leg = (hx: number, hy: number, a: number, back: boolean, far: boolean) => {
      const up = back ? 15 : 14;
      const kx = hx + Math.sin(a) * up + (back ? 5 : -1);
      const ky = hy + Math.cos(a) * up;
      const b = a + (back ? -0.42 : 0.1) + (back ? 0.5 : -0.45) * (0.5 + 0.5 * Math.sin(stride));
      const low = back ? 18 : 17;
      const fx = kx + Math.sin(b) * low;
      const fy = ky + Math.cos(b) * low;
      c.globalAlpha = far ? 0.78 : 1;
      // upper leg, tapering to the joint
      c.beginPath();
      const wTop = back ? 5.4 : 3.6;
      c.moveTo(hx - wTop, hy);
      c.quadraticCurveTo((hx + kx) / 2 - wTop * 0.7, (hy + ky) / 2, kx - 1.7, ky);
      c.lineTo(kx + 1.7, ky);
      c.quadraticCurveTo((hx + kx) / 2 + wTop * 0.9, (hy + ky) / 2, hx + wTop, hy);
      c.fill();
      // cannon bone and hoof
      c.lineWidth = 2.5;
      c.beginPath();
      c.moveTo(kx, ky);
      c.lineTo(fx, fy);
      c.stroke();
      c.lineWidth = 3.6;
      c.beginPath();
      c.moveTo(fx, fy - 0.5);
      c.lineTo(fx - 2.2, fy + 2.6);
      c.stroke();
      c.globalAlpha = 1;
    };
    const swing = Math.sin(stride) * 0.55;
    // the far pair first, so the near pair overlaps them
    leg(-12, -31, -swing * 0.7 + 0.16, false, true);
    leg(20, -35, swing * 0.7 - 0.2, true, true);
    leg(-16, -31, -swing - 0.1, false, false);
    leg(16, -35, swing + 0.06, true, false);
    // the body in one outline: deep chest, withers, a level back, a round rump and a tucked belly
    c.beginPath();
    c.moveTo(-23, -40);
    c.bezierCurveTo(-23, -47, -18, -51, -12, -50.5);
    c.bezierCurveTo(-3, -48.5, 8, -49, 16, -50);
    c.bezierCurveTo(23, -50.5, 27.5, -46, 27, -40);
    c.bezierCurveTo(26.5, -34, 23, -30.5, 17, -29.5);
    c.bezierCurveTo(9, -27.5, 2, -27, -6, -27.5);
    c.bezierCurveTo(-14, -27.5, -22, -30, -23, -40);
    c.fill();
    // neck: thick where it leaves the chest, slimmer under the jaw
    c.beginPath();
    c.moveTo(-10, -49.5);
    c.quadraticCurveTo(-16, -60, -20.5, -70);
    c.lineTo(-28.5, -65);
    c.quadraticCurveTo(-27, -50, -22.5, -36);
    c.fill();
    // head: the skull, a tapering muzzle, and an ear laid back
    c.beginPath();
    c.ellipse(-25.5, -70, 6.2, 4.8, 0.3, 0, 7);
    c.fill();
    c.beginPath();
    c.moveTo(-27, -74.5);
    c.quadraticCurveTo(-35, -72.5, -40, -66.5);
    c.quadraticCurveTo(-40.5, -63.8, -37.5, -63.5);
    c.quadraticCurveTo(-32, -63.5, -26, -65.5);
    c.fill();
    c.beginPath();
    c.moveTo(-22.5, -73);
    c.quadraticCurveTo(-21, -82, -14.5, -84.5);
    c.quadraticCurveTo(-15.5, -77, -19, -71.5);
    c.fill();
    // a short tail, held up as they bound
    c.beginPath();
    c.moveTo(25.5, -47);
    c.quadraticCurveTo(31, -52, 32, -57);
    c.quadraticCurveTo(27.5, -55, 23.5, -48.5);
    c.fill();
    if (d.antlers) {
      // each antler: a main beam that sweeps back and then forward, with tines standing up from it
      for (const side of [1, 0]) {
        const ox = side * 3.6;
        const oy = side * -1.2;
        c.globalAlpha = side ? 0.78 : 1;
        c.lineWidth = 2.3;
        c.beginPath();
        c.moveTo(-23.5 + ox, -74 + oy);
        c.bezierCurveTo(-17 + ox, -80 + oy, -9 + ox, -90 + oy, -16 + ox, -101 + oy);
        c.stroke();
        c.lineWidth = 1.7;
        c.beginPath();
        c.moveTo(-21.5 + ox, -76.5 + oy);
        c.quadraticCurveTo(-26 + ox, -80 + oy, -27.5 + ox, -87 + oy);
        c.moveTo(-16.5 + ox, -82.5 + oy);
        c.quadraticCurveTo(-20 + ox, -88 + oy, -20.5 + ox, -96 + oy);
        c.moveTo(-12.8 + ox, -90 + oy);
        c.quadraticCurveTo(-9 + ox, -95 + oy, -8.5 + ox, -101 + oy);
        c.stroke();
      }
      c.globalAlpha = 1;
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

/** The warm light: each window glows and spills onto the snow, and the lantern by the door burns steady. All
 *  of it breathes slowly, like a fire you cannot see inside. */
export function drawGlow(c: CanvasRenderingContext2D, pl: Place, t: number, mode: CabinMode) {
  const { u } = pl;
  const night = mode === "night";
  const parts = cabinParts(pl);
  const breath = 0.84 + 0.1 * Math.sin(t * 1.3) + 0.06 * Math.sin(t * 5.7 + 1);
  c.save();
  c.globalCompositeOperation = "lighter";
  for (const wx of parts.windows) {
    const wy = parts.windowY + 26 * u;
    const g = c.createRadialGradient(wx, wy, 6 * u, wx, wy, 150 * u);
    g.addColorStop(0, `rgba(255, 190, 96, ${(night ? 0.55 : 0.3) * breath})`);
    g.addColorStop(1, "rgba(255, 170, 80, 0)");
    c.fillStyle = g;
    c.fillRect(wx - 150 * u, wy - 150 * u, 300 * u, 300 * u);
    // the pool of light on the snow under the window, flattened to lie on the ground
    const gy = pl.cabinY + 30 * u;
    c.save();
    c.translate(wx, gy);
    c.scale(1, 0.3);
    const sp = c.createRadialGradient(0, 0, 0, 0, 0, 130 * u);
    sp.addColorStop(0, `rgba(255, 176, 90, ${(night ? 0.42 : 0.24) * breath})`);
    sp.addColorStop(1, "rgba(255, 170, 80, 0)");
    c.fillStyle = sp;
    c.fillRect(-130 * u, -130 * u, 260 * u, 260 * u);
    c.restore();
  }
  const ln = parts.lantern;
  const lg = c.createRadialGradient(ln.x, ln.y, 0, ln.x, ln.y, 70 * u);
  lg.addColorStop(0, `rgba(255, 214, 140, ${(night ? 0.7 : 0.4) * breath})`);
  lg.addColorStop(0.25, `rgba(255, 170, 80, ${(night ? 0.3 : 0.16) * breath})`);
  lg.addColorStop(1, "rgba(255, 170, 80, 0)");
  c.fillStyle = lg;
  c.fillRect(ln.x - 70 * u, ln.y - 70 * u, 140 * u, 140 * u);
  c.restore();
}

/** Fog lying in the hollows: long soft banks that drift sideways, each at its own pace. `band` 0 lies at the
 *  foot of the mountains, 1 among the far trees, 2 low over the snow. */
export function drawFog(
  c: CanvasRenderingContext2D,
  pl: Place,
  life: Life,
  t: number,
  thick: number,
  band: 0 | 1 | 2
) {
  const { w, u, horizon } = pl;
  const y0 = horizon + [-40, 14, 74][band] * u;
  const tall = [120, 90, 110][band] * u;
  const span = w + 900 * u;
  for (const b of life.banks) {
    if (b.band !== band) continue;
    const x = ((b.x * span + t * b.v * u) % span) - 450 * u;
    const wide = b.wide * u;
    c.globalAlpha = thick * b.a * (0.8 + 0.2 * Math.sin(t * 0.2 + b.x * 9));
    c.drawImage(soft(), x - wide / 2, y0 + b.dy * u - tall / 2, wide, tall);
  }
  c.globalAlpha = 1;
}

/** A handful of stars that brighten and dim, so the sky is not a still picture. */
export function drawTwinkle(
  c: CanvasRenderingContext2D,
  pl: Place,
  life: Life,
  t: number,
  mode: CabinMode
) {
  const { w, u, horizon } = pl;
  c.fillStyle = "#ffffff";
  for (const s of life.twinkles) {
    const a = Math.max(0, Math.sin(t * s.v + s.ph)) ** 3 * (mode === "night" ? 0.95 : 0.5);
    if (a < 0.03) continue;
    const x = s.x * w;
    const y = s.y * horizon * 0.7;
    const r = (1.2 + s.s) * Math.max(0.8, u);
    c.globalAlpha = a;
    c.beginPath();
    c.arc(x, y, r, 0, 7);
    c.fill();
    // a small four-point glint on the brightest
    c.fillRect(x - r * 3, y - 0.4, r * 6, 0.8);
    c.fillRect(x - 0.4, y - r * 3, 0.8, r * 6);
  }
  c.globalAlpha = 1;
}
