// Generates src/assets/hero-bg.png — the landing hero's observatory sky.
// Deterministic SVG composition (no AI image gen): warm night gradient,
// ivory star field, one faint constellation trace, lamp-warm horizon,
// baked film grain. Rasterized at 2880×1620 via sharp.
//   node scripts/design/generate-hero-bg.mjs
import sharp from "sharp";
import { mkdirSync, writeFileSync } from "node:fs";

const W = 2880;
const H = 1620;

// Deterministic PRNG (mulberry32) so the sky is reproducible.
function mulberry32(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(20260516); // brand.md set-date as seed

// ── Star field — ivory, sparse near the horizon, denser up top ──
const IVORY = "#F3ECDD";
const GOLD = "#E4C86A";
let stars = "";
for (let i = 0; i < 420; i++) {
  const x = rand() * W;
  // Bias stars toward the upper sky (quadratic falloff toward horizon).
  const y = Math.pow(rand(), 1.6) * H * 0.92;
  const r = 0.7 + rand() * 2.1;
  const isGold = rand() < 0.06; // a handful of warm accents
  const o = (0.08 + rand() * 0.45) * (isGold ? 0.8 : 1);
  stars += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(2)}" fill="${isGold ? GOLD : IVORY}" opacity="${o.toFixed(3)}"/>`;
}

// A few brighter "named" stars with a soft cross flare.
let brights = "";
for (let i = 0; i < 9; i++) {
  const x = (0.08 + rand() * 0.84) * W;
  const y = (0.06 + rand() * 0.55) * H;
  const s = 5 + rand() * 7;
  const o = 0.5 + rand() * 0.3;
  brights += `
    <g opacity="${o.toFixed(2)}">
      <line x1="${x - s}" y1="${y}" x2="${x + s}" y2="${y}" stroke="${IVORY}" stroke-width="1.1" stroke-linecap="round" opacity="0.55"/>
      <line x1="${x}" y1="${y - s}" x2="${x}" y2="${y + s}" stroke="${IVORY}" stroke-width="1.1" stroke-linecap="round" opacity="0.55"/>
      <circle cx="${x}" cy="${y}" r="2.1" fill="${IVORY}"/>
    </g>`;
}

// ── One quiet constellation — an abstract "ascent" polyline rising
//    left-to-right (the product motif), traced in hairline ivory. ──
const C = [
  [0.16, 0.62],
  [0.24, 0.5],
  [0.34, 0.55],
  [0.45, 0.38],
  [0.58, 0.42],
  [0.7, 0.27],
  [0.82, 0.31],
].map(([fx, fy]) => [fx * W, fy * H]);
const cPath = C.map(([x, y], i) => `${i === 0 ? "M" : "L"} ${x.toFixed(0)} ${y.toFixed(0)}`).join(
  " "
);
const cNodes = C.map(
  ([x, y], i) =>
    `<circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="${i === C.length - 2 ? 4 : 2.6}" fill="${i === C.length - 2 ? GOLD : IVORY}" opacity="${i === C.length - 2 ? 0.85 : 0.7}"/>`
).join("");

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#040302"/>
      <stop offset="45%" stop-color="#070605"/>
      <stop offset="78%" stop-color="#0D0A08"/>
      <stop offset="100%" stop-color="#12110D"/>
    </linearGradient>
    <radialGradient id="lamp" cx="50%" cy="118%" r="85%">
      <stop offset="0%" stop-color="#C8AB6A" stop-opacity="0.16"/>
      <stop offset="38%" stop-color="#C8AB6A" stop-opacity="0.055"/>
      <stop offset="70%" stop-color="#C8AB6A" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="vignette" cx="50%" cy="42%" r="78%">
      <stop offset="0%" stop-color="#000000" stop-opacity="0"/>
      <stop offset="78%" stop-color="#000000" stop-opacity="0"/>
      <stop offset="100%" stop-color="#000000" stop-opacity="0.42"/>
    </radialGradient>
    <filter id="grain">
      <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch"/>
      <feColorMatrix values="0 0 0 0 0.55  0 0 0 0 0.52  0 0 0 0 0.45  0 0 0 0.05 0"/>
      <feComposite operator="over" in2="SourceGraphic"/>
    </filter>
    <filter id="soften"><feGaussianBlur stdDeviation="0.4"/></filter>
  </defs>

  <rect width="${W}" height="${H}" fill="url(#sky)"/>
  <rect width="${W}" height="${H}" fill="url(#lamp)"/>

  <g filter="url(#soften)">${stars}</g>
  ${brights}

  <g>
    <path d="${cPath}" fill="none" stroke="${IVORY}" stroke-opacity="0.13" stroke-width="1.4"/>
    ${cNodes}
  </g>

  <rect width="${W}" height="${H}" fill="url(#vignette)"/>
</svg>`;
// (No baked grain — the live CSS .bg-grain overlay supplies texture;
// noise in the PNG would block compression and quintuple the weight.)

mkdirSync("src/assets", { recursive: true });
const png = await sharp(Buffer.from(svg))
  .png({ compressionLevel: 9, adaptiveFiltering: true })
  .toBuffer();
writeFileSync("src/assets/hero-bg.png", png);
const meta = await sharp(png).metadata();
console.log(
  `hero-bg.png written: ${meta.width}×${meta.height}, ${(png.length / 1024).toFixed(0)} KB`
);
