#!/usr/bin/env node
// Makes the endless world's sea surface (public/site/world/waves.jpg; read by src/lib/flight/world-water.ts).
// Not a photograph: real waves, built the way oceanographers model a wind sea. A JONSWAP spectrum says how
// much wave there is at each length and in each direction for a steady wind; random phases are given to
// each, and a Fourier transform adds them into one surface that repeats seamlessly. The shader lays it at
// three sizes that move at each size's own speed, so long swells outrun short chop, as real waves do.
//
//   red, green  how the surface slopes across and along the wind (128 = level)
//   blue        how high it stands (0 trough to 255 crest)
//
// node scripts/dev/world-waves.mjs [--size 512] [--seed 7]
import path from "node:path";
import sharp from "sharp";

const arg = (k, d) => {
  const i = process.argv.indexOf(`--${k}`);
  return i > -1 ? Number(process.argv[i + 1]) : d;
};
const N = arg("size", 512);
let seed = arg("seed", 7);
const rand = () => {
  seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
  return (seed + 0.5) / 4294967296;
};
const gauss = () => Math.sqrt(-2 * Math.log(rand())) * Math.cos(2 * Math.PI * rand());

/* the spectrum: the tile is 16 peak wavelengths across; the wind blows along +x, a little turned */
const PEAK = 16;
const GAMMA = 3.3;
const WIND = [Math.cos(0.25), Math.sin(0.25)];
function spectrum(kx, ky) {
  const k = Math.hypot(kx, ky);
  if (k === 0) return 0;
  const w = Math.sqrt(k);
  const wp = Math.sqrt(PEAK);
  const sigma = w <= wp ? 0.07 : 0.09;
  const peak = GAMMA ** Math.exp(-((w - wp) ** 2) / (2 * sigma * sigma * wp * wp));
  /* Pierson-Moskowitz energy at this frequency, sharpened at the peak (JONSWAP), per unit of k */
  const e = ((Math.exp(-1.25 * (wp / w) ** 4) / w ** 5) * peak) / (2 * w);
  /* spread about the wind: most of the energy runs with it, some across, almost none against */
  const c = (kx * WIND[0] + ky * WIND[1]) / k;
  const spread = c > 0 ? c ** 4 : 0.06 * c ** 4;
  /* the shortest ripples fade, so the smallest copy of the tile stays smooth */
  return (e * spread * Math.exp(-((k / (PEAK * 4)) ** 2))) / k;
}

/* one complex 1-D Fourier transform in place (re, im of length n, n a power of two) */
function fft(re, im, n) {
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      [re[i], re[j]] = [re[j], re[i]];
      [im[i], im[j]] = [im[j], im[i]];
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const a = (2 * Math.PI) / len;
    for (let i = 0; i < n; i += len)
      for (let k = 0; k < len / 2; k++) {
        const cr = Math.cos(a * k);
        const ci = Math.sin(a * k);
        const xr = re[i + k + len / 2] * cr - im[i + k + len / 2] * ci;
        const xi = re[i + k + len / 2] * ci + im[i + k + len / 2] * cr;
        re[i + k + len / 2] = re[i + k] - xr;
        im[i + k + len / 2] = im[i + k] - xi;
        re[i + k] += xr;
        im[i + k] += xi;
      }
  }
}
function fft2(re, im) {
  const r = new Float64Array(N);
  const i = new Float64Array(N);
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) [r[x], i[x]] = [re[y * N + x], im[y * N + x]];
    fft(r, i, N);
    for (let x = 0; x < N; x++) [re[y * N + x], im[y * N + x]] = [r[x], i[x]];
  }
  for (let x = 0; x < N; x++) {
    for (let y = 0; y < N; y++) [r[y], i[y]] = [re[y * N + x], im[y * N + x]];
    fft(r, i, N);
    for (let y = 0; y < N; y++) [re[y * N + x], im[y * N + x]] = [r[y], i[y]];
  }
}

/* random amplitudes, made so the surface comes out real: h(-k) is the conjugate of h(k) */
const hr = new Float64Array(N * N);
const hi = new Float64Array(N * N);
const at = (m) => (m + N) % N;
for (let y = -N / 2; y < N / 2; y++)
  for (let x = -N / 2; x < N / 2; x++) {
    const a = Math.sqrt(spectrum(x, y) / 2);
    const k = at(y) * N + at(x);
    const kn = at(-y) * N + at(-x);
    if (kn < k) continue;
    const re = gauss() * a;
    const im = gauss() * a;
    hr[k] = re;
    hi[k] = im;
    hr[kn] = re;
    hi[kn] = -im;
  }
/* height, and the slopes across and along (i k h) */
const sx = [new Float64Array(N * N), new Float64Array(N * N)];
const sy = [new Float64Array(N * N), new Float64Array(N * N)];
for (let y = 0; y < N; y++)
  for (let x = 0; x < N; x++) {
    const k = y * N + x;
    const kx = x < N / 2 ? x : x - N;
    const ky = y < N / 2 ? y : y - N;
    sx[0][k] = -kx * hi[k];
    sx[1][k] = kx * hr[k];
    sy[0][k] = -ky * hi[k];
    sy[1][k] = ky * hr[k];
  }
fft2(hr, hi);
fft2(sx[0], sx[1]);
fft2(sy[0], sy[1]);

const spread = (a) => {
  const s = Float64Array.from(a).sort();
  return [s[Math.floor(a.length * 0.002)], s[Math.floor(a.length * 0.998)]];
};
const [h0, h1] = spread(hr);
const slope = Math.max(...spread(sx[0]).map(Math.abs), ...spread(sy[0]).map(Math.abs));
const out = Buffer.alloc(N * N * 3);
const byte = (v) => Math.max(0, Math.min(255, Math.round(v * 255)));
for (let k = 0; k < N * N; k++) {
  out[k * 3] = byte(0.5 + (0.5 * sx[0][k]) / slope);
  out[k * 3 + 1] = byte(0.5 + (0.5 * sy[0][k]) / slope);
  out[k * 3 + 2] = byte((hr[k] - h0) / (h1 - h0));
}
const file = path.join(process.cwd(), "public/site/world/waves.jpg");
await sharp(out, { raw: { width: N, height: N, channels: 3 } })
  .jpeg({ quality: 88, chromaSubsampling: "4:4:4", mozjpeg: true })
  .toFile(file);
console.log(
  `waves.jpg ${N}x${N}; steepest slope stored as 1 is ${slope.toFixed(3)} height units a texel`
);
