/*
 * The painting primitives behind Karman's landscapes: sky, clouds, sun, mountain ranges with
 * lit and shaded faces, snow, mist, forests of single trees, water that mirrors everything
 * above it, hills, rocks, bushes, flowers and a dark foreground frame.
 * Ported from prototypes/today-directions/landscapes.js (founder approved, 2026-11-08).
 */
import { LIGHT, type Light } from "./light";
import { ctx2d, fbm, hex, makeCanvas, mix, rgb, rng, vnoise, type Color } from "./noise";

export type LightColors = { [K in keyof Light]: Light[K] extends string ? Color : Light[K] };

function toColors(L: Light): LightColors {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(L)) out[k] = typeof v === "string" ? hex(v) : v;
  return out as LightColors;
}

export interface RangeOptions {
  base: number;
  top: number;
  amp?: number;
  freq?: number;
  s?: number;
  far?: number;
  snow?: number;
  x0?: number;
  x1?: number;
  peak?: [number, number, number] | null;
  tint?: string | null;
}

export interface ForestOptions {
  height?: number;
  from?: number;
  to?: number;
  density?: number;
  kind?: "pine" | "round";
  far?: number;
  colors?: string[] | null;
  rowH?: number;
}

const TAU = 6.283;

export class Studio {
  readonly c: HTMLCanvasElement;
  readonly g: CanvasRenderingContext2D;
  readonly r: () => number;
  /** A second generator for fine detail, so adding detail never moves the composition. */
  readonly d: () => number;
  readonly C: LightColors;

  constructor(
    readonly W: number,
    readonly H: number,
    readonly L: Light,
    seed: number
  ) {
    this.c = makeCanvas(W, H);
    this.g = ctx2d(this.c);
    this.r = rng(seed);
    this.d = rng(seed + 7919);
    this.C = toColors(L);
  }

  sky(horizon: number) {
    const { g, W, H, C, r } = this;
    const gr = g.createLinearGradient(0, 0, 0, H * horizon);
    gr.addColorStop(0, rgb(C.top));
    gr.addColorStop(1, rgb(C.low));
    g.fillStyle = gr;
    g.fillRect(0, 0, W, H);
    const sx = C.sunAt[0] * W;
    const sy = C.sunAt[1] * H;
    const gl = g.createRadialGradient(sx, sy, 0, sx, sy, W * 0.45);
    gl.addColorStop(0, rgb(C.glow, this.L === LIGHT.night ? 0.25 : 0.55));
    gl.addColorStop(1, rgb(C.glow, 0));
    g.fillStyle = gl;
    g.fillRect(0, 0, W, H);
    if (C.stars) {
      for (let i = 0; i < 260; i++) {
        g.fillStyle = rgb([235, 238, 250], 0.4 + r() * 0.6);
        const s = r() < 0.08 ? 1.6 : 0.8;
        g.fillRect(r() * W, r() * H * horizon * 0.85, s, s);
      }
    }
  }

  clouds(n: number, v0: number, v1: number) {
    const { g, W, H, C, r } = this;
    for (let i = 0; i < n; i++) {
      const cx = r() * W;
      const cy = H * (v0 + r() * (v1 - v0));
      const w = W * (0.12 + r() * 0.22);
      for (let j = 0; j < 14; j++) {
        const x = cx + (r() - 0.5) * w;
        const y = cy + (r() - 0.5) * w * 0.12;
        const rr = w * (0.06 + r() * 0.1);
        const gr = g.createRadialGradient(x, y - rr * 0.3, 0, x, y, rr);
        gr.addColorStop(0, rgb(C.cloud, 0.9));
        gr.addColorStop(0.7, rgb(mix(C.cloud, C.cloudShade, 0.5), 0.6));
        gr.addColorStop(1, rgb(C.cloudShade, 0));
        g.fillStyle = gr;
        g.beginPath();
        g.ellipse(x, y, rr * 1.6, rr, 0, 0, TAU);
        g.fill();
        /* The side facing the sun catches a brighter rim. */
        const toSun = C.sunAt[0] * W > x ? 1 : -1;
        g.fillStyle = rgb(mix(C.cloud, [255, 255, 255], 0.35), 0.35);
        g.beginPath();
        g.ellipse(x + toSun * rr * 0.5, y - rr * 0.45, rr * 0.7, rr * 0.28, 0, 0, TAU);
        g.fill();
      }
    }
  }

  sun(size = 0.035) {
    const { g, W, H, C } = this;
    g.fillStyle = rgb(C.sun);
    g.beginPath();
    g.arc(C.sunAt[0] * W, C.sunAt[1] * H, W * size, 0, TAU);
    g.fill();
  }

  /** A mountain range: ridge from noise, each column lit or shaded by its slope, with snow. */
  range(o: RangeOptions) {
    const { g, W, H, C, L } = this;
    const { base, top, amp = 0.2, freq = 2.2, s = 1, far = 0, snow = 0, x0 = 0, x1 = 1 } = o;
    const peak = o.peak ?? null;
    const ridge = new Float32Array(W);
    /* Ridged noise makes sharp peaks and saddles instead of a flat wall. */
    const ridgedN = (u: number) => {
      let v = 0;
      let a2 = 0.6;
      let f = 1;
      for (let i = 0; i < 5; i++) {
        v += a2 * (1 - Math.abs(2 * vnoise(u * freq * f, 0.5 + i, s + i * 7) - 1)) ** 2;
        f *= 2.1;
        a2 *= 0.45;
      }
      return v;
    };
    for (let x = 0; x < W; x++) {
      const u = x / W;
      let v =
        base - (base - top) * (0.25 + 0.75 * ridgedN(u)) - amp * 0.5 * (fbm(u * 3, 1, s) - 0.5);
      if (peak) {
        v = Math.min(
          v,
          peak[1] + Math.abs(u - peak[0]) * peak[2] * (0.85 + 0.3 * vnoise(u * 20, 3, s))
        );
      }
      const edge = Math.min(1, Math.max(0, Math.min((u - x0) / 0.05, (x1 - u) / 0.05)));
      ridge[x] = H * (base + (v - base) * edge);
    }
    /* Inside the range, a height field gives rock faces: the sunward ones lit, the rest in shade. */
    const hf = (x: number, y: number) =>
      fbm(x * 0.018, y * 0.03, s + 5, 5) + 0.6 * vnoise(x * 0.06, y * 0.05, s + 11);
    const sunRight = C.sunAt[0] * W > W * 0.5 ? 1 : -1;
    const hazeK = 0.06 + far * 0.7;
    const T = o.tint ? hex(o.tint) : null;
    for (let x = 0; x < W; x += 1) {
      const y0 = ridge[x];
      const span = H * base - y0;
      if (span <= 0) continue;
      const slope = (ridge[Math.min(W - 1, x + 3)] - ridge[Math.max(0, x - 3)]) / 6;
      for (let y = Math.floor(y0); y < H * base; y += 2) {
        const d = (y - y0) / span;
        const gx = hf(x + 2, y) - hf(x - 2, y);
        const face = d < 0.12 ? -slope * 0.5 : gx * 6;
        const light = Math.max(0, Math.min(1, 0.5 + face * sunRight * 1.6));
        let col = mix(C.shade, C.lit, light * (1 - d * 0.55));
        col = mix(col, C.deep, d * 0.35);
        if (T) col = mix(col, mix(T, C.deep, L.dark * 0.7), 0.45);
        if (snow) {
          const sn = snow * (0.55 + hf(x, y) * 0.6) - d;
          if (sn > 0) {
            col = mix(
              col,
              light > 0.45 ? C.snow : mix(C.snow, C.shade, 0.5),
              Math.min(0.9, sn * 6)
            );
          }
        }
        col = mix(col, C.haze, hazeK * (0.55 + d * 0.45));
        g.fillStyle = rgb(col);
        g.fillRect(x, y, 1, 2);
      }
    }
    return ridge;
  }

  mist(v: number, h = 0.06, a = 0.55) {
    const { g, W, H, C, r } = this;
    for (let i = 0; i < 40; i++) {
      const x = r() * W;
      const y = H * (v + (r() - 0.5) * h);
      const w = W * (0.1 + r() * 0.2);
      const gr = g.createRadialGradient(x, y, 0, x, y, w);
      gr.addColorStop(0, rgb(mix(C.haze, [255, 255, 255], 0.3), a * 0.35));
      gr.addColorStop(1, rgb(C.haze, 0));
      g.fillStyle = gr;
      g.fillRect(x - w, y - w, w * 2, w * 2);
    }
  }

  /** A band of trees: many single evergreens or round trees, smaller and hazier when far. */
  forest(v: number, o: ForestOptions) {
    const { g, W, H, C, r } = this;
    const { height = 0.05, from = 0, to = 1, density = 1, kind = "pine", far = 0, rowH = 0.02 } = o;
    const n = Math.round((W * (to - from) * density) / 6);
    const base = o.colors ? o.colors.map(hex) : [C.deep, C.land];
    for (let row = 0; row < 3; row++) {
      for (let i = 0; i < n; i++) {
        const x = W * (from + r() * (to - from));
        const y = H * (v + row * rowH + (r() - 0.5) * 0.01);
        const h = H * height * (0.6 + r() * 0.7) * (1 + row * 0.15);
        let col = mix(base[Math.floor(r() * base.length)], C.deep, 0.2 + row * 0.15);
        col = mix(col, C.haze, far * 0.7);
        const litc = mix(col, C.lit, 0.35 * (1 - far));
        if (kind === "pine") {
          g.fillStyle = rgb(col);
          g.beginPath();
          g.moveTo(x, y - h);
          for (let t = 0; t <= 6; t++) {
            const yy = y - h + (h * t) / 6;
            const w = (h * 0.32 * t) / 6;
            g.lineTo(x + w, yy + h * 0.06);
            g.lineTo(x + w * 0.55, yy + h * 0.06);
          }
          g.lineTo(x, y);
          for (let t = 6; t >= 0; t--) {
            const yy = y - h + (h * t) / 6;
            const w = (h * 0.32 * t) / 6;
            g.lineTo(x - w * 0.55, yy + h * 0.06);
            g.lineTo(x - w, yy + h * 0.06);
          }
          g.fill();
          g.fillStyle = rgb(litc, 0.6);
          g.beginPath();
          g.moveTo(x, y - h);
          g.lineTo(x + h * 0.18, y - h * 0.3);
          g.lineTo(x + h * 0.04, y - h * 0.3);
          g.fill();
        } else {
          for (let j = 0; j < 5; j++) {
            g.fillStyle = rgb(j < 3 ? col : litc);
            g.beginPath();
            g.arc(
              x + (r() - 0.5) * h * 0.6,
              y - h * 0.55 + (r() - 0.5) * h * 0.4,
              h * (0.22 + r() * 0.14),
              0,
              TAU
            );
            g.fill();
          }
        }
      }
    }
  }

  /** Water: everything above the waterline, mirrored, darkened and rippled, then a sheen. */
  lake(v: number, tint = 0.35) {
    const { g, W, H, C, r, c } = this;
    const y0 = Math.round(H * v);
    const src = makeCanvas(W, y0);
    ctx2d(src).drawImage(c, 0, 0, W, y0, 0, 0, W, y0);
    for (let y = y0; y < H; y++) {
      const d = y - y0;
      const sy = y0 - 1 - d * 1.0;
      if (sy < 0) break;
      const off = Math.sin(y * 0.6) * (1 + d * 0.01) + (fbm(y * 0.2, 1, 3) - 0.5) * 6;
      g.drawImage(src, 0, sy, W, 1, off, y, W, 1);
    }
    const gr = g.createLinearGradient(0, y0, 0, H);
    gr.addColorStop(0, rgb(C.water, tint));
    gr.addColorStop(1, rgb(C.water, Math.min(0.9, tint + 0.35)));
    g.fillStyle = gr;
    g.fillRect(0, y0, W, H - y0);
    g.fillStyle = rgb(mix(C.sun, [255, 255, 255], 0.3), 0.25);
    for (let i = 0; i < 70; i++) {
      const y = y0 + Math.pow(r(), 1.6) * (H - y0);
      const x = C.sunAt[0] * W + (r() - 0.5) * W * 0.25;
      const w = 8 + r() * 50;
      g.fillRect(x - w / 2, y, w, 1);
    }
    /* Ripples: thin light and dark lines, longer toward the viewer. */
    const d = this.d;
    for (let i = 0; i < 220; i++) {
      const t = Math.pow(d(), 1.3);
      const y = y0 + 3 + t * (H - y0 - 3);
      const w = 6 + d() * 40 * (0.3 + t);
      const light = d() < 0.55;
      g.fillStyle = light
        ? rgb(mix(C.low, [255, 255, 255], 0.25), 0.12 + d() * 0.14)
        : rgb(C.deep, 0.1 + d() * 0.12);
      g.fillRect(d() * W, y, w, 1);
    }
    g.fillStyle = rgb(mix(C.haze, [255, 255, 255], 0.4), 0.5);
    g.fillRect(0, y0, W, 1.5);
  }

  ground(v: number, colA: string, colB: string, rough = 1) {
    const { g, W, H, C, L } = this;
    const A = hex(colA);
    const B = hex(colB);
    for (let y = Math.floor(H * v); y < H; y += 2) {
      for (let x = 0; x < W; x += 2) {
        const n = fbm(x * 0.02, y * 0.05, 31, 4);
        const t = (y - H * v) / (H * (1 - v));
        g.fillStyle = rgb(mix(mix(A, B, n * rough), C.deep, t * 0.35 + L.dark * 0.6));
        g.fillRect(x, y, 2, 2);
      }
    }
  }

  hill(
    v: number,
    amp: number,
    freq: number,
    s: number,
    colA: string,
    colB: string,
    x0 = 0,
    x1 = 1
  ) {
    const { g, W, H, C, L } = this;
    g.beginPath();
    g.moveTo(W * x0, H);
    for (let x = W * x0; x <= W * x1; x += 4)
      g.lineTo(x, H * (v - amp * fbm((x / W) * freq, 3, s)));
    g.lineTo(W * x1, H);
    g.closePath();
    const gr = g.createLinearGradient(0, H * (v - amp), 0, H);
    gr.addColorStop(0, rgb(mix(mix(hex(colA), C.lit, 0.2), C.deep, L.dark * 0.6)));
    gr.addColorStop(1, rgb(mix(hex(colB), C.deep, 0.3 + L.dark * 0.5)));
    g.fillStyle = gr;
    g.fill();
  }

  pine(x: number, y: number, h: number, snowy = 0) {
    const { g, W, H, C, L, r } = this;
    const X = x * W;
    const Y = y * H;
    const HH = h * H;
    g.fillStyle = rgb(mix(C.deep, [0, 0, 0], 0.2));
    g.beginPath();
    g.moveTo(X, Y - HH);
    for (let t = 0; t <= 9; t++) {
      const yy = Y - HH + (HH * t) / 9;
      const w = ((HH * 0.3 * t) / 9) * (0.8 + r() * 0.4);
      g.lineTo(X + w, yy + HH * 0.05);
      g.lineTo(X + w * 0.5, yy + HH * 0.05);
    }
    g.lineTo(X, Y);
    for (let t = 9; t >= 0; t--) {
      const yy = Y - HH + (HH * t) / 9;
      const w = ((HH * 0.3 * t) / 9) * (0.8 + r() * 0.4);
      g.lineTo(X - w * 0.5, yy + HH * 0.05);
      g.lineTo(X - w, yy + HH * 0.05);
    }
    g.fill();
    g.fillStyle = rgb(mix(C.land, C.lit, 0.35 - L.dark * 0.3), 0.8);
    for (let t = 2; t <= 8; t++) {
      const yy = Y - HH + (HH * t) / 9;
      const w = (HH * 0.3 * t) / 9;
      g.fillRect(X + w * 0.15, yy, w * 0.6, HH * 0.02);
    }
    const sunSide = C.sunAt[0] > x ? 1 : -1;
    g.strokeStyle = rgb(mix(C.land, C.lit, 0.5 - L.dark * 0.35), 0.5);
    g.lineWidth = Math.max(0.8, HH * 0.006);
    for (let t = 2; t <= 9; t++) {
      const yy = Y - HH + (HH * t) / 9;
      const w = (HH * 0.3 * t) / 9;
      for (let j = 0; j < 5; j++) {
        const sx = X + sunSide * w * (0.1 + this.d() * 0.75);
        const sy = yy + HH * (this.d() * 0.04);
        g.beginPath();
        g.moveTo(sx, sy);
        g.lineTo(sx + sunSide * HH * 0.025, sy + HH * 0.018);
        g.stroke();
      }
    }
    if (snowy) {
      g.fillStyle = rgb(C.snow, 0.9);
      for (let t = 1; t <= 8; t++) {
        const yy = Y - HH + (HH * t) / 9;
        const w = (HH * 0.3 * t) / 9;
        g.fillRect(X - w * 0.8, yy + HH * 0.02, w * 1.4, HH * 0.018);
      }
    }
  }

  tree(x: number, y: number, h: number, colors: string[]) {
    const { g, W, H, C, L, r } = this;
    const X = x * W;
    const Y = y * H;
    const HH = h * H;
    g.strokeStyle = rgb(mix(C.deep, [60, 40, 30], 0.4));
    g.lineWidth = HH * 0.04;
    g.beginPath();
    g.moveTo(X, Y);
    g.quadraticCurveTo(X - HH * 0.04, Y - HH * 0.4, X, Y - HH * 0.7);
    g.stroke();
    const cs = colors.map(hex);
    for (let i = 0; i < 120; i++) {
      const q = i < 60 ? r : this.d;
      const a = q() * TAU;
      const d = Math.sqrt(q());
      const px = X + Math.cos(a) * d * HH * 0.38;
      const py = Y - HH * 0.72 + Math.sin(a) * d * HH * 0.26;
      const lit = (px - X) * (C.sunAt[0] > x ? 1 : -1) > 0;
      /* Later leaves sit on top and on the outside, so they catch more light. */
      const top = i > 80 && lit;
      g.fillStyle = rgb(
        mix(mix(cs[i % cs.length], lit ? C.lit : C.deep, top ? 0.45 : 0.3), C.deep, L.dark * 0.6)
      );
      g.beginPath();
      g.arc(px, py, HH * (i > 80 ? 0.02 + q() * 0.03 : 0.04 + q() * 0.05), 0, TAU);
      g.fill();
    }
  }

  grass(v: number, from = 0, to = 1, colors = ["#7a9a4a", "#b8c46a"]) {
    const { g, W, H, C, L, r } = this;
    const cs = colors.map(hex);
    for (let i = 0; i < W * (to - from) * 1.5; i++) {
      const x = W * (from + r() * (to - from));
      const y = H * (v + r() * (1 - v));
      const h = 4 + r() * 12 * (y / H);
      g.strokeStyle = rgb(mix(mix(cs[i % cs.length], C.deep, 0.2), C.deep, L.dark * 0.7), 0.8);
      g.lineWidth = 1;
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(x + (r() - 0.5) * 4, y - h);
      g.stroke();
    }
  }

  /** A rock: a lumpy shape, lit on the sun side, dark underneath. */
  rock(x: number, y: number, size: number, col: string | null = null) {
    const { g, W, H, C, L, r } = this;
    const X = x * W;
    const Y = y * H;
    const R = size * H;
    const base = col ? hex(col) : mix(C.shade, C.land, 0.3);
    g.beginPath();
    for (let i = 0; i <= 14; i++) {
      const a = Math.PI + (i / 14) * Math.PI;
      const rr = R * (0.75 + r() * 0.35);
      g.lineTo(X + Math.cos(a) * rr * 1.3, Y + Math.sin(a) * rr * 0.8);
    }
    g.closePath();
    const sunRight = C.sunAt[0] > x ? 1 : -1;
    const gr = g.createLinearGradient(X - sunRight * R, Y - R, X + sunRight * R, Y);
    gr.addColorStop(0, rgb(mix(base, C.deep, 0.5 + L.dark * 0.3)));
    gr.addColorStop(1, rgb(mix(base, C.lit, 0.45 * (1 - L.dark))));
    g.fillStyle = gr;
    g.fill();
    /* A lit edge along the top toward the sun, and a few cracks across the face. */
    g.strokeStyle = rgb(mix(base, C.lit, 0.7 * (1 - L.dark)), 0.6);
    g.lineWidth = Math.max(1, R * 0.06);
    g.beginPath();
    g.arc(X + sunRight * R * 0.3, Y - R * 0.1, R * 0.75, -Math.PI * 0.85, -Math.PI * 0.35);
    g.stroke();
    g.strokeStyle = rgb(mix(base, C.deep, 0.7), 0.45);
    g.lineWidth = Math.max(0.8, R * 0.035);
    for (let i = 0; i < 3; i++) {
      const cx = X + (this.d() - 0.5) * R * 1.4;
      const cy = Y - R * (0.15 + this.d() * 0.45);
      g.beginPath();
      g.moveTo(cx, cy);
      g.lineTo(cx + (this.d() - 0.5) * R * 0.5, cy + R * (0.15 + this.d() * 0.25));
      g.stroke();
    }
    g.fillStyle = rgb(C.deep, 0.5);
    g.fillRect(X - R * 1.3, Y - 1, R * 2.6, 3);
  }

  /** A bush: many leaves, dark inside, lit on top toward the sun. */
  bush(x: number, y: number, size: number, colors = ["#3f6a2e", "#6d9a3e"]) {
    const { g, W, H, C, L, r } = this;
    const X = x * W;
    const Y = y * H;
    const R = size * H;
    const cs = colors.map(hex);
    const sunRight = C.sunAt[0] > x ? 1 : -1;
    for (let i = 0; i < 110; i++) {
      const q = i < 70 ? r : this.d;
      const a = Math.PI + q() * Math.PI;
      const d = Math.sqrt(q());
      const px = X + Math.cos(a) * d * R * 1.4;
      const py = Y + Math.sin(a) * d * R * 0.9;
      const lit = (px - X) * sunRight > 0 && py < Y - R * 0.3;
      g.fillStyle = rgb(
        mix(mix(cs[i % cs.length], lit ? C.lit : C.deep, lit ? 0.35 : 0.3), C.deep, L.dark * 0.65)
      );
      g.beginPath();
      const k = i < 70 ? 1 : 0.6;
      g.ellipse(px, py, R * k * (0.06 + q() * 0.06), R * k * (0.04 + q() * 0.04), q() * 3, 0, TAU);
      g.fill();
    }
  }

  flowers(v: number, from: number, to: number, n: number, colors: string[]) {
    const { g, W, H, C, L, r } = this;
    const cs = colors.map(hex);
    for (let i = 0; i < n; i++) {
      const x = W * (from + r() * (to - from));
      const y = H * (v + r() * (1 - v));
      const s2 = 1 + (y / H) * 2.5;
      g.fillStyle = rgb(mix(cs[i % cs.length], C.deep, L.dark * 0.7), 0.95);
      g.beginPath();
      g.arc(x, y, s2, 0, TAU);
      g.fill();
    }
  }

  /** Dark bushes and grass in the lower corners frame the picture, as Bob Ross often did. */
  frame(colors = ["#1f3322", "#2f4a2a"]) {
    const { r } = this;
    for (let i = 0; i < 6; i++)
      this.bush(0.6 + r() * 0.1 + i * 0.07, 1.0 + r() * 0.02, 0.07 + r() * 0.05, colors);
  }

  /** A river seen in perspective: narrow far away, wide near, reflecting the sky. */
  river(path: [number, number][], w0: number, w1: number) {
    const { g, W, H, C, L, r } = this;
    const pts = path.map(([u, v]) => [u * W, v * H]);
    for (let i = 0; i < pts.length - 1; i++) {
      const t = i / (pts.length - 1);
      const wa = H * (w0 + (w1 - w0) * t);
      const wb = H * (w0 + (w1 - w0) * ((i + 1) / (pts.length - 1)));
      const [ax, ay] = pts[i];
      const [bx, by] = pts[i + 1];
      g.beginPath();
      g.moveTo(ax - wa, ay);
      g.lineTo(bx - wb, by);
      g.lineTo(bx + wb, by);
      g.lineTo(ax + wa, ay);
      g.closePath();
      const gr = g.createLinearGradient(0, ay, 0, by);
      gr.addColorStop(0, rgb(mix(C.low, C.water, 0.4)));
      gr.addColorStop(1, rgb(mix(C.water, C.deep, 0.15 + L.dark * 0.4)));
      g.fillStyle = gr;
      g.fill();
      g.fillStyle = rgb(mix(C.sun, [255, 255, 255], 0.4), 0.5);
      for (let j = 0; j < 6; j++) {
        const y = ay + r() * (by - ay);
        const x = ax + (bx - ax) * ((y - ay) / (by - ay || 1));
        g.fillRect(x - wa * 0.6 * r(), y, wa * 0.8 * r() + 3, 1.2);
      }
    }
  }
}
