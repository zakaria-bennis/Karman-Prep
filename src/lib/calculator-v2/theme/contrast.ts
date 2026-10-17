// Colour math of the calculator v2 theme: WCAG 2.x contrast, OKLab and OKLCH (Ottosson 2020),
// the TH-4 lightness adjustment, Machado 2009 colour-vision simulation and alpha compositing.
import { ADJUST_MARGIN, ADJUST_STEP } from "./targets";

type Vec3 = readonly [number, number, number];
type Matrix3 = readonly [Vec3, Vec3, Vec3];

const HEX = /^#[0-9a-f]{6}$/i;
const GAMUT_EPSILON = 1e-7;
const CHROMA_BISECTION_STEPS = 24;
const MAX_ADJUST_STEPS = 200;
const DEG = Math.PI / 180;

// Machado, Oliveira and Fernandes 2009, severity 1.0, applied to linear sRGB.
const CVD_MATRICES: Record<"protan" | "deutan" | "tritan", Matrix3> = {
  protan: [
    [0.152286, 1.052583, -0.204868],
    [0.114503, 0.786281, 0.099216],
    [-0.003882, -0.048116, 1.051998],
  ],
  deutan: [
    [0.367322, 0.860646, -0.227968],
    [0.280085, 0.672501, 0.047413],
    [-0.01182, 0.04294, 0.968881],
  ],
  tritan: [
    [1.255528, -0.076749, -0.178779],
    [-0.078411, 0.930809, 0.147602],
    [0.004733, 0.691367, 0.3039],
  ],
};

function parseHex(hex: string): Vec3 {
  if (typeof hex !== "string" || !HEX.test(hex)) throw new Error(`Expected #rrggbb, got ${hex}`);
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ];
}

function toLinear(channel: number): number {
  const v = channel / 255;
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
}

function encode(linear: number): number {
  const v = Math.min(1, Math.max(0, linear));
  const srgb = v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055;
  return Math.round(255 * srgb);
}

function byteHex(n: number): string {
  return n.toString(16).padStart(2, "0");
}

function linearToHex([r, g, b]: Vec3): string {
  return `#${byteHex(encode(r))}${byteHex(encode(g))}${byteHex(encode(b))}`;
}

function hexToLinear(hex: string): Vec3 {
  const [r, g, b] = parseHex(hex);
  return [toLinear(r), toLinear(g), toLinear(b)];
}

function multiply(m: Matrix3, [x, y, z]: Vec3): Vec3 {
  return [
    m[0][0] * x + m[0][1] * y + m[0][2] * z,
    m[1][0] * x + m[1][1] * y + m[1][2] * z,
    m[2][0] * x + m[2][1] * y + m[2][2] * z,
  ];
}

function luminance(hex: string): number {
  const [r, g, b] = hexToLinear(hex);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG 2.x contrast ratio of two `#rrggbb` colours. */
export function contrastRatio(foreground: string, background: string): number {
  const a = luminance(foreground);
  const b = luminance(background);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

/** OKLab of a `#rrggbb` colour (Ottosson 2020, from linear sRGB). */
export function toOklab(hex: string): readonly [number, number, number] {
  const [r, g, b] = hexToLinear(hex);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

/** OKLCH of a `#rrggbb` colour; hue in degrees in [0, 360), 0 when the chroma is below 1e-9. */
export function toOklch(hex: string): { l: number; c: number; h: number } {
  const [l, a, b] = toOklab(hex);
  const c = Math.hypot(a, b);
  if (c < 1e-9) return { l, c, h: 0 };
  let h = Math.atan2(b, a) / DEG;
  if (h < 0) h += 360;
  if (h >= 360) h -= 360;
  return { l, c, h };
}

function oklchToLinear(l: number, c: number, h: number): Vec3 {
  const a = c * Math.cos(h * DEG);
  const b = c * Math.sin(h * DEG);
  const l1 = (l + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m1 = (l - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s1 = (l - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    4.0767416621 * l1 - 3.3077115913 * m1 + 0.2309699292 * s1,
    -1.2684380046 * l1 + 2.6097574011 * m1 - 0.3413193965 * s1,
    -0.0041960863 * l1 - 0.7034186147 * m1 + 1.707614701 * s1,
  ];
}

/** True when every linear sRGB channel of the OKLCH colour is within [-1e-7, 1 + 1e-7]. */
export function inGamut(l: number, c: number, h: number): boolean {
  return oklchToLinear(l, c, h).every((v) => v >= -GAMUT_EPSILON && v <= 1 + GAMUT_EPSILON);
}

/** `#rrggbb` of an OKLCH colour, gamut-mapped by reducing chroma (24 bisection steps). */
export function fromOklch(l: number, c: number, h: number): string {
  const lightness = Math.min(1, Math.max(0, l));
  let chroma = Math.max(0, c);
  if (!inGamut(lightness, chroma, h)) {
    let lo = 0;
    let hi = chroma;
    for (let i = 0; i < CHROMA_BISECTION_STEPS; i++) {
      const mid = (lo + hi) / 2;
      if (inGamut(lightness, mid, h)) lo = mid;
      else hi = mid;
    }
    chroma = lo;
  }
  return linearToHex(oklchToLinear(lightness, chroma, h));
}

/**
 * TH-4: a colour below `target` against `background` moves in OKLCH lightness only, in 0.005
 * steps away from the background, until it reaches the target plus 0.05. Hue is kept; chroma is
 * reduced only as needed to stay inside sRGB.
 */
export function adjustLightness(color: string, background: string, target: number): string {
  if (contrastRatio(color, background) >= target) return color.toLowerCase();
  const { l, c, h } = toOklch(color);
  const dir = toOklch(background).l > l ? -1 : 1;
  for (let n = 1; n <= MAX_ADJUST_STEPS; n++) {
    const out = fromOklch(l + dir * ADJUST_STEP * n, c, h);
    if (contrastRatio(out, background) >= target + ADJUST_MARGIN) return out;
  }
  return fromOklch(dir < 0 ? 0 : 1, c, h);
}

/** Machado 2009 colour-vision simulation at severity 1.0. */
export function simulateCvd(hex: string, kind: "protan" | "deutan" | "tritan"): string {
  return linearToHex(multiply(CVD_MATRICES[kind], hexToLinear(hex)));
}

/** ΔE_OK: Euclidean distance of the two colours in OKLab. */
export function deltaEOk(a: string, b: string): number {
  const [l1, a1, b1] = toOklab(a);
  const [l2, a2, b2] = toOklab(b);
  return Math.hypot(l1 - l2, a1 - a2, b1 - b2);
}

/** `color` at `alpha` over `background`, mixed per 8-bit gamma-encoded channel as canvas and CSS do. */
export function compositeOver(color: string, alpha: number, background: string): string {
  const fg = parseHex(color);
  const bg = parseHex(background);
  const a = Math.min(1, Math.max(0, alpha));
  return `#${[0, 1, 2].map((i) => byteHex(Math.round(a * fg[i] + (1 - a) * bg[i]))).join("")}`;
}
