/*
 * The Climb's mountain, painted pixel by pixel. No vectors and no AI: rock comes
 * from a fan of ridges lit by the moon, mist from noise, trees from brush dabs.
 *
 *   node art/paint.mjs                    every look, theme and shape
 *   node art/paint.mjs ink dark phone .5  one image at half size, for checking
 *
 * Writes art/<look>-<theme>-<shape>.jpg.
 */
import { writeFileSync, mkdirSync, rmSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { deflateSync } from "node:zlib";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const OUT = dirname(fileURLToPath(import.meta.url));

/* ---------- Noise ---------- */
function makeNoise(seed) {
  const perm = new Uint8Array(512), g = new Float32Array(512);
  let s = seed >>> 0;
  const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
  const p = [...Array(256).keys()];
  for (let i = 255; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [p[i], p[j]] = [p[j], p[i]]; }
  for (let i = 0; i < 512; i++) { perm[i] = p[i & 255]; g[i] = rnd() * Math.PI * 2; }
  return { perm, g, rnd };
}
let N = makeNoise(4127);
const fade = (t) => t * t * t * (t * (t * 6 - 15) + 10);
function noise(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const u = fade(xf), v = fade(yf), P = N.perm, G = N.g;
  const c = (ix, iy, dx, dy) => { const a = G[P[(P[ix & 255] + iy) & 255]]; return Math.cos(a) * dx + Math.sin(a) * dy; };
  const a = c(xi, yi, xf, yf), b = c(xi + 1, yi, xf - 1, yf), d = c(xi, yi + 1, xf, yf - 1), e = c(xi + 1, yi + 1, xf - 1, yf - 1);
  return (a + u * (b - a) + v * (d - a + u * (a - b - d + e))) * 1.5;
}
function fbm(x, y, o = 5) { let s = 0, a = 0.5; for (let i = 0; i < o; i++) { s += a * noise(x, y); x = x * 2.03 + 17; y = y * 2.03 + 9; a *= 0.5; } return s; }
function ridged(x, y, o = 5) { let s = 0, a = 0.55, w = 1; for (let i = 0; i < o; i++) { let n = 1 - Math.abs(noise(x, y) * 1.6); n = Math.max(0, n) ** 2; s += n * a * w; w = Math.min(1, n * 1.8); x = x * 2.1 + 31; y = y * 2.1 + 11; a *= 0.5; } return s; }
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };
const mix = (a, b, t) => a + (b - a) * t;
const hex = (h) => [parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255];
const lin = (c) => c.map(hex);
const mixc = (a, b, t) => [mix(a[0], b[0], t), mix(a[1], b[1], t), mix(a[2], b[2], t)];

/* ---------- Palettes ---------- */
const PAL = {
  ink: {
    dark: { skyTop: "#070a12", skyLow: "#2b3648", mist: "#46546a", moon: "#e9e6d6", far1: "#2c3748", far2: "#1d2533", lit: "#8592a6", mid: "#333d4f", shade: "#080b12", snow: "#dfe4ec", near1: "#141a25", near2: "#090c13", near3: "#040509", trail: "#c9d2de", grain: 0.05, star: 1 },
    light: { skyTop: "#d9d3c5", skyLow: "#f1ecdf", mist: "#f4f0e5", moon: "#b6432d", far1: "#b9b6ad", far2: "#8f8e88", lit: "#b4b0a5", mid: "#5d5d5b", shade: "#121317", snow: "#f6f2e8", near1: "#55575a", near2: "#2a2c30", near3: "#111216", trail: "#1a1c20", grain: 0.05, star: 0 },
  },
  wood: {
    dark: { skyTop: "#071433", skyLow: "#2f6d87", mist: "#7fb0b0", moon: "#f3e8c6", far1: "#23506f", far2: "#173a5c", lit: "#3d6f96", mid: "#1c3f68", shade: "#0a1a38", snow: "#f1e9d0", near1: "#123047", near2: "#0a2031", near3: "#050f1a", trail: "#f1e9d0", key: "#030711", cloud: "#d9e0c8", cloudEdge: "#5d8f97", grain: 0.035, star: 1 },
    light: { skyTop: "#8db5c8", skyLow: "#f3e2c0", mist: "#f6ead0", moon: "#c4452c", far1: "#9fb9bb", far2: "#6f9aa6", lit: "#5f8fb2", mid: "#2c5c8c", shade: "#123058", snow: "#fbf4e2", near1: "#3f6f70", near2: "#21474f", near3: "#0e2730", trail: "#fbf4e2", key: "#0d1a2a", cloud: "#fbf3df", cloudEdge: "#c7a776", grain: 0.035, star: 0 },
  },
};

/* The shapes the page needs. Peak and moon are fractions of the picture. Short and
   wide on purpose: the mountain has to leave the screen to the student's work. */
const SHAPES = {
  phone: { w: 1200, h: 1000, px: 0.72, py: 0.37, spread: 1.15, moon: [0.93, 0.42], moonR: 0.035 },
  tablet: { w: 1800, h: 660, px: 0.72, py: 0.2, spread: 1.5, moon: [0.5, 0.2], moonR: 0.05 },
  wide: { w: 3000, h: 660, px: 0.78, py: 0.2, spread: 1.6, moon: [0.58, 0.22], moonR: 0.05 },
};

/* The skyline of the main mountain at x, in picture heights. */
function skyline(x, S, seed) {
  const pxU = S.px * (S.w / S.h), dx = x - pxU, adx = Math.abs(dx);
  let y = S.py + (adx / S.spread) ** 0.86 * (dx < 0 ? 1.0 : 1.15);
  const shoulders = [[-0.2, 0.33, 1.25], [0.2, 0.3, 1.5], [-0.42, 0.53, 1.5], [0.43, 0.48, 1.3], [0.74, 0.58, 1.3], [-0.76, 0.62, 1.2]];
  for (const [ox, oy, k] of shoulders) y = Math.min(y, oy + (S.py - 0.135) * 0.8 + (Math.abs(dx - ox * S.spread) / S.spread) ** 0.9 * k);
  const fall = clamp(adx * 5 + 0.04);
  return y + fall * (fbm(x * 3.1 + seed, 3.1, 4) * 0.11 + ridged(x * 10.5 + seed, 7.7, 4) * 0.035 - 0.02) + fbm(x * 38, 1.3, 3) * 0.006 * fall;
}
/* ---------- Brush marks, stamped into a mask ---------- */
class Mask {
  constructor(w, h) { this.w = w; this.h = h; this.a = new Float32Array(w * h); }
  dab(x, y, r, v = 1) {
    const { w, h, a } = this, R = Math.ceil(r + 1), x0 = Math.max(0, Math.floor(x - R)), x1 = Math.min(w - 1, Math.ceil(x + R)), y0 = Math.max(0, Math.floor(y - R)), y1 = Math.min(h - 1, Math.ceil(y + R));
    for (let j = y0; j <= y1; j++) for (let i = x0; i <= x1; i++) {
      const d = Math.hypot(i - x, j - y), c = clamp(r + 0.5 - d) * v, k = i + j * w;
      if (c > a[k]) a[k] = c;
    }
  }
  stroke(x0, y0, x1, y1, r0, r1, v = 1, dry = 0) {
    const n = Math.ceil(Math.hypot(x1 - x0, y1 - y0) / Math.max(0.6, Math.min(r0, r1) * 0.6)) + 1;
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      if (dry && N.rnd() < dry * t) continue;
      this.dab(mix(x0, x1, t), mix(y0, y1, t), mix(r0, r1, t), v);
    }
  }
}
function pineSprig(m, x, y, ang, len, s) {
  const count = Math.floor(10 + N.rnd() * 7);
  for (let i = 0; i < count; i++) {
    const a = ang + (i / count - 0.5) * 2.6 + (N.rnd() - 0.5) * 0.15, l = len * (0.65 + N.rnd() * 0.45);
    m.stroke(x, y, x + Math.cos(a) * l, y + Math.sin(a) * l * 0.62, 0.95 * s, 0.2 * s, 1, 0.25);
  }
}
function pineBranch(m, x, y, ang, len, w, depth, s) {
  const seg = Math.max(3, Math.floor(len / (22 * s)));
  let cx = x, cy = y, a = ang;
  for (let i = 0; i < seg; i++) {
    a += (N.rnd() - 0.5) * 0.5 + (depth > 1 ? 0.03 : 0);
    const nx = cx + Math.cos(a) * len / seg, ny = cy + Math.sin(a) * len / seg, t = i / seg;
    m.stroke(cx, cy, nx, ny, mix(w, w * 0.45, t), mix(w, w * 0.4, (i + 1) / seg), 1);
    if (depth > 0 && i > 0 && N.rnd() < 0.62) {
      const side = i % 2 ? 1 : -1;
      pineBranch(m, nx, ny, a + side * (0.55 + N.rnd() * 0.4), len * (0.5 + N.rnd() * 0.2), w * 0.55, depth - 1, s);
    }
    if (depth <= 1 && N.rnd() < 0.9) for (let k = 0; k < 2; k++) pineSprig(m, nx + (N.rnd() - 0.5) * 16 * s, ny + (N.rnd() - 0.5) * 12 * s, -Math.PI / 2 + (N.rnd() - 0.5) * 0.7, (24 + N.rnd() * 20) * s, s);
    cx = nx; cy = ny;
  }
  if (depth <= 1) for (let k = 0; k < 3; k++) pineSprig(m, cx, cy, -Math.PI / 2 + (N.rnd() - 0.5) * 1, (28 + N.rnd() * 18) * s, s);
}
/* A small conifer standing on a ridge. */
function conifer(m, x, y, h, s) {
  m.stroke(x, y, x + (N.rnd() - 0.5) * h * 0.06, y - h, h * 0.018 + 0.5 * s, 0.4 * s, 1);
  const tiers = Math.floor(5 + h / (11 * s));
  for (let i = 0; i < tiers; i++) {
    const t = i / tiers, ty = y - h * (0.16 + t * 0.84), span = h * 0.27 * (1 - t) ** 0.8 + 1.4 * s;
    for (const d of [-1, 1]) {
      const l = span * (0.72 + N.rnd() * 0.5);
      m.stroke(x, ty, x + d * l, ty + l * 0.28 + (N.rnd() - 0.5) * 2 * s, 1.5 * s * (1 - t * 0.55), 0.3 * s, 1, 0.1);
    }
  }
}

/* ---------- Painting ---------- */
function paint(lookName, themeName, shapeName, scale = 1) {
  const S = SHAPES[shapeName], C = PAL[lookName][themeName], wood = lookName === "wood", dark = themeName === "dark";
  const W = Math.round(S.w * scale), H = Math.round(S.h * scale), s = H / 1500;
  const c = Object.fromEntries(Object.entries(C).map(([k, v]) => [k, typeof v === "string" ? hex(v) : v]));
  const img = new Float32Array(W * H * 3);
  const ax = W / H, pxU = S.px * ax, seed = lookName === "wood" ? 40 : 0;

  /* Silhouettes, one height per column. Lower y means higher on the page. */
  const mainY = new Float32Array(W), r1 = new Float32Array(W), r2 = new Float32Array(W), far1 = new Float32Array(W), far2 = new Float32Array(W), near3 = new Float32Array(W);
  for (let i = 0; i < W; i++) {
    const x = i / H;
    mainY[i] = skyline(x, S, seed);
    far1[i] = 0.44 + fbm(x * 2.1 + 9, 1.1, 4) * 0.19 + ridged(x * 6 + 3, 2, 3) * 0.02;
    far2[i] = 0.56 + fbm(x * 2.8 + 23, 5.1, 5) * 0.17 + ridged(x * 8 + 5, 3, 3) * 0.018;
    r1[i] = 0.76 + fbm(x * 2.5 + 41, 8.3, 5) * 0.15 + fbm(x * 30, 2, 3) * 0.006;
    r2[i] = 0.875 + fbm(x * 2 + 77, 4.3, 5) * 0.12 + fbm(x * 40, 2, 3) * 0.005;
    near3[i] = 0.965 + fbm(x * 1.7 + 17, 12.3, 4) * 0.09;
  }

  /* Wood prints carry flat bands of stylised cloud. */
  const cluster = (a, b, y, flip) => [[a + 0.09, b - 0.14, y - 0.0165, 0.0065, flip], [a, b, y, 0.0095, flip], [a + 0.15, b + 0.05, y + 0.0172, 0.0072, flip], [a + 0.04, b - 0.22, y + 0.0305, 0.0058, flip]];
  const bands = wood ? [...cluster(0.84, 1.16, 0.34, -1), ...cluster(0.44, 1.12, 0.7, -1), ...cluster(-0.16, 0.42, 0.74, 1)] : [];
  const bandAt = (u, v) => {
    let d = 0;
    for (const [a, b, y, h, flip] of bands) {
      const wob = noise(u * 6, y * 40) * 0.05, dy = Math.abs(v - y);
      if (dy > h) continue;
      const end = Math.sqrt(Math.max(0, 1 - (dy / h) ** 2)) * h * 1.6;
      if (u > a + wob - end && u < b + wob + end) { const along = flip > 0 ? (u - a) / (b - a) : (b - u) / (b - a); d = Math.max(d, smooth(0, 0.08, 1 - dy / h) * mix(1, 0.6, smooth(0.5, 1.05, along))); }
    }
    return d;
  };

  /* Trees and the shrine gate go in masks, then land on their layer. */
  const treesR1 = new Mask(W, H), treesR2 = new Mask(W, H), pine = new Mask(W, H), gate = new Mask(W, H);
  N.rnd = (() => { let q = 91 + seed; return () => ((q = (q * 1664525 + 1013904223) >>> 0) / 4294967296); })();
  for (let i = 0; i < W; i += Math.max(1, Math.round(9 * s))) {
    if (N.rnd() < 0.58 && noise(i / W * 7, 3) > -0.2) conifer(treesR1, i, r1[i] * H + 4 * s, (18 + N.rnd() * 28) * s, s);
    if (N.rnd() < 0.62 && noise(i / W * 5, 9) > -0.15) conifer(treesR2, i, r2[i] * H + 5 * s, (34 + N.rnd() * 52) * s, s);
  }
  /* A gnarled pine in the corner, away from the words. */
  pineBranch(pine, 1.02 * W, 0.99 * H, -Math.PI * 0.83, 0.3 * H, 0.012 * H, 2, Math.max(0.55, s) * 1.15);
  /* A shrine gate on the summit, the thing you are walking to. */
  { const gx = S.px * W, gy = (S.py - 0.002) * H, g = 0.0105 * H + 3, sx = gx;
    gate.stroke(sx - g * 0.5, gy, sx - g * 0.42, gy - g * 1.15, 1.2 * s, 1 * s);
    gate.stroke(sx + g * 0.5, gy, sx + g * 0.42, gy - g * 1.15, 1.2 * s, 1 * s);
    gate.stroke(sx - g * 0.8, gy - g * 1.22, sx + g * 0.8, gy - g * 1.22, 1.1 * s, 1.1 * s);
    gate.stroke(sx - g * 0.55, gy - g * 0.88, sx + g * 0.55, gy - g * 0.88, 0.8 * s, 0.8 * s); }

  /* Rock tone at a point. Ridges fan down from the summit, lit from the moon's side. */
  const rock = (x, v) => {
    const dx = x - pxU, depth = v - S.py + 0.1;
    const w1 = fbm(x * 4 + seed, v * 4, 3) * 0.5, w2 = fbm(x * 4 + 50, v * 4 + 9, 3) * 0.5;
    const u = dx / depth, vv = Math.log(depth + 0.04), e = 0.018;
    const fan = (a) => ridged(a * 4.6 + w1 + seed, vv * 2.4 + w2, 6);
    const big = (fan(u + e) - fan(u - e)) / (2 * e);
    const f = (a, b) => ridged(a * 15 + w2 * 1.5, b * 9 + w1, 4);
    const fine = (f(x + 0.003, v) - f(x - 0.003, v)) / 0.006;
    const spine = fbm(v * 3.4 + 7, 2.2 + seed, 4) * 0.14;
    const k = mix(40, 7, clamp((v - S.py) * 1.5));
    const form = Math.tanh((dx - spine) * k);
    const st = (a) => ridged(a * 26 + w1 * 2 + seed, vv * 4 + w2, 3);
    const streak = (st(u + 0.004) - st(u - 0.004)) / 0.008;
    const tone = 0.5 - form * 0.2 - big * 0.034 - fine * 0.0032 - streak * 0.0024;
    return { tone, form };
  };

  /* Every pixel, far to near. */
  for (let j = 0; j < H; j++) {
    const v = j / H;
    for (let i = 0; i < W; i++) {
      const x = i / H, u = i / W, k = i + j * W;
      /* Sky */
      let col;
      if (wood) {
        const t = smooth(0, 0.6, v);
        const grad = dark ? t : t ** 0.75;
        col = mixc(c.skyTop, c.skyLow, grad);
        if (!dark) { const top = 1 - smooth(0.0, 0.14, v); col = mixc(col, c.skyTop, top * 0.9); }
        /* Grain of the woodblock runs sideways across the sky. */
        const gr = noise(u * 9 + v * 2, v * 240 * s ** 0.2) * 0.014 + noise(u * 3, v * 90) * 0.012;
        col = col.map((q) => q + gr);
      } else {
        const wash = fbm(x * 1.5, v * 3.6, 5) * 0.26;
        col = mixc(c.skyTop, c.skyLow, clamp(smooth(0, 0.62, v) + wash));
      }
      /* Stars, few and uneven */
      if (c.star) { const n = noise(i * 0.55 / s, j * 0.55 / s), bright = n > 0.82 ? (n - 0.82) * (noise(u * 7, v * 7) > 0 ? 3 : 0.4) : 0; col = col.map((q) => q + bright * (1 - smooth(0.05, 0.5, v))); }
      /* Moon, or a low red sun on paper */
      const mdx = (u - S.moon[0]) * ax, mdy = v - S.moon[1], md = Math.hypot(mdx, mdy), mr = S.moonR;
      const moonEdge = 1 - smooth(mr - 0.0016, mr + 0.0016, md);
      if (dark) {
        const halo = Math.exp(-((md / (mr * 3.6)) ** 2)) * 0.2;
        col = col.map((q, n) => q + halo * c.moon[n]);
        const blot = 1 + fbm(mdx * 26 + 3, mdy * 26, 3) * 0.25;
        col = mixc(col, c.moon.map((q) => q * blot), moonEdge);
      } else col = mixc(col, c.moon, moonEdge * (wood ? 1 : 0.86));
      /* High cloud wash crossing the moon */
      if (!wood) { const cl = smooth(0.08, 0.34, fbm(x * 1.2 + 8, v * 11, 5)); col = mixc(col, c.mist, cl * 0.34 * (1 - smooth(0.25, 0.55, v))); }

      /* Far ranges */
      const layer = (ry, lc, h, tex) => {
        if (v < ry) return;
        const edge = smooth(0, 1.6 / H, v - ry), d = (v - ry) / h;
        let t = wood ? 1 - Math.floor(clamp(d) * 3) / 3 * 0.45 : 1 - smooth(0, 1, d + fbm(x * 3, v * 7, 4) * tex);
        if (!wood) t = clamp(t + ridged(x * 12, v * 7, 3) * 0.08 - 0.03);
        col = mixc(col, mixc(c.mist, lc, t), edge);
      };
      layer(far1[i], c.far1, 0.21, 0.45);
      layer(far2[i], c.far2, 0.19, 0.45);
      if (wood) { const b = bandAt(u, v); if (b && v < 0.5) col = mixc(col, c.cloud, b); }

      /* The mountain */
      const my = mainY[i];
      if (v >= my) {
        const edge = smooth(0, 2 / H, v - my);
        const { tone, form } = rock(x, v);
        let m;
        const dep = v - S.py;
        if (wood) {
          const steps = tone + noise(x * 22, v * 16) * 0.05;
          m = steps > 0.57 ? c.lit : steps > 0.42 ? c.mid : c.shade;
          /* Printed hatch lines on shaded rock */
          const hatchV = (x * 90 + v * 24 + noise(x * 10, v * 10) * 2.4) % 1;
          if (steps < 0.42 && hatchV < 0.13 && noise(x * 7, v * 13) > -0.15) m = mixc(m, c.key, 0.75);
          const snowLine = S.py + 0.2 + fbm(x * 5, 2, 4) * 0.1 + Math.abs(noise(x * 16 + 2, 8)) * 0.1;
          if (v < snowLine && tone > 0.36) m = c.snow;
          else if (v < snowLine + 0.05 && tone > 0.56 && noise(x * 40, v * 4) > 0.1) m = c.snow;
          const fadeB = smooth(0.62, 0.96, v) * 0.62;
          m = mixc(m, c.mist, fadeB * (1 - smooth(0.9, 0.98, v)) + Math.floor(fadeB * 3) / 3 * 0.3);
          /* Keyline: the dark outline carved along each ridge edge */
          const key = 1 - smooth(1.4 * s / H, 3.4 * s / H, v - my);
          m = mixc(m, c.key, key * (1 - smooth(0.5, 0.82, v)));
          const t2 = rock(x + 0.0024, v).tone, keyIn = Math.abs(tone - t2) > 0.085 ? 0.8 : 0;
          m = mixc(m, c.key, keyIn * (1 - smooth(0.32, 0.72, dep)));
        } else {
          const dry = fbm(x * 70, v * 34, 3) * 0.09;
          const t = clamp(tone + dry);
          const soft = smooth(0.2, 0.8, t), crisp = smooth(0.44, 0.5, t + noise(x * 60, v * 40) * 0.07);
          const lt = mix(soft, crisp, 0.26);
          m = lt < 0.5 ? mixc(c.shade, c.mid, lt * 2) : mixc(c.mid, c.lit, (lt - 0.5) * 2);
          /* Snow only sits where it can: high, lit, broken by rock */
          const snowLine = S.py + 0.135 + fbm(x * 5, 2.4, 4) * 0.12 + Math.abs(noise(x * 18 + 2, 8)) * 0.07;
          const snow = smooth(0, 0.03, snowLine - v) * smooth(0.42, 0.56, t + (form < 0 ? 0.05 : -0.04));
          m = mixc(m, c.snow, snow);
          /* Wet ink pools along the top edge of the shape */
          const pool = (1 - smooth(0, 0.013, v - my)) * 0.5;
          m = mixc(m, c.shade, pool * (1 - snow));
          const mistRise = smooth(0.46, 0.88, v + fbm(x * 1.6 + 2, v * 6, 5) * 0.32);
          m = mixc(m, c.mist, mistRise * 0.97);
        }
        col = mixc(col, m, edge);
      }
      /* Gate */
      if (gate.a[k]) col = mixc(col, wood ? c.moon && (dark ? c.key : c.moon) : c.shade, gate.a[k]);

      /* Mist in the valley */
      if (!wood) {
        const m1 = smooth(-0.02, 0.32, fbm(x * 1.1 + 11, v * 8.5, 5) + (smooth(0.54, 0.74, v) - 0.3) * 0.65);
        col = mixc(col, c.mist, m1 * smooth(0.48, 0.66, v) * 0.82);
      } else { const b = bandAt(u, v); if (b && v >= 0.5) col = mixc(col, c.cloud, b); const edge = bandAt(u, v - 0.004) && !b ? 1 : 0; if (edge && v > 0.5) col = mixc(col, c.cloudEdge, 0.7); }

      /* Near ridges and their trees */
      const near = (ry, lc, tm, h) => {
        const inShape = v >= ry ? smooth(0, 1.6 / H, v - ry) : 0, a = Math.max(inShape, tm ? tm.a[k] : 0);
        if (!a) return;
        let tone;
        if (wood) {
          tone = lc;
          const hatch = (x * 130 + v * 40 + noise(x * 9, v * 9) * 2) % 1;
          if (hatch < 0.14 && v > ry + 0.012 && noise(x * 7, v * 9) > 0) tone = mixc(tone, c.key, 0.7);
          if (v < ry + 3 * s / H) tone = c.key;
        } else {
          const d = clamp((v - ry) / h), wet = fbm(x * 6, v * 12, 4) * 0.5;
          tone = mixc(lc, c.mist, clamp((d + wet - 0.15) * 0.6) * 0.52);
        }
        col = mixc(col, tone, a);
      };
      near(r1[i], c.near1, treesR1, 0.14);
      if (!wood) { const m2 = smooth(0, 0.3, fbm(x * 1.3 + 31, v * 9, 4) + (v - 0.9) * 1.3); col = mixc(col, c.mist, m2 * smooth(0.76, 0.88, v) * 0.68); }
      near(r2[i], c.near2, treesR2, 0.1);
      near(near3[i], c.near3, null, 0.05);
      /* Foreground pine */
      if (pine.a[k]) col = mixc(col, c.near3, pine.a[k]);

      /* Paper and print grain over everything */
      const fibre = noise(i * 0.34 / s, j * 0.11 / s) * 0.25 + noise(i * 0.9 / s, j * 0.9 / s) * 0.75;
      const g = fibre * c.grain;
      img[k * 3] = col[0] + g; img[k * 3 + 1] = col[1] + g; img[k * 3 + 2] = col[2] + g;
    }
  }
  return { W, H, img };
}

/* ---------- Files ---------- */
function crcTable() { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; }
const CRC = crcTable();
const crc = (b) => { let c = 0xffffffff; for (const x of b) c = CRC[(c ^ x) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
function png(path, W, H, channels, data) {
  const raw = Buffer.alloc((W * channels + 1) * H);
  for (let j = 0; j < H; j++) { raw[j * (W * channels + 1)] = 0; data.copy(raw, j * (W * channels + 1) + 1, j * W * channels, (j + 1) * W * channels); }
  const chunk = (type, d) => { const len = Buffer.alloc(4); len.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(type), d]), cr = Buffer.alloc(4); cr.writeUInt32BE(crc(td)); return Buffer.concat([len, td, cr]); };
  const head = Buffer.alloc(13); head.writeUInt32BE(W, 0); head.writeUInt32BE(H, 4); head[8] = 8; head[9] = channels === 4 ? 6 : 2;
  writeFileSync(path, Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", head), chunk("IDAT", deflateSync(raw, { level: 7 })), chunk("IEND", Buffer.alloc(0))]));
}
function save(look, theme, shape, scale) {
  const { W, H, img } = paint(look, theme, shape, scale);
  const buf = Buffer.alloc(W * H * 3);
  for (let i = 0; i < buf.length; i++) buf[i] = Math.round(clamp(img[i]) * 255);
  const tmp = join(OUT, `.tmp-${look}-${theme}-${shape}.png`), out = join(OUT, `${look}-${theme}-${shape}.jpg`);
  png(tmp, W, H, 3, buf);
  execFileSync("sips", ["-s", "format", "jpeg", "-s", "formatOptions", "84", tmp, "--out", out], { stdio: "ignore" });
  rmSync(tmp);
  console.log(out);
}
mkdirSync(OUT, { recursive: true });
const [look, theme, shape, scale] = process.argv.slice(2);
if (look) save(look, theme, shape, +scale || 1);
else {
  for (const l of ["ink", "wood"]) for (const t of ["dark", "light"]) for (const sh of Object.keys(SHAPES)) save(l, t, sh, 1);
}
