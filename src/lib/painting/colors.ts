/*
 * One hue per painting (founder, 2026-11-08). The skill levels, rings and main button all take
 * their color from the day's picture. The hue is the most common strongly colored hue in it.
 * The main button keeps white text, so its shade is darkened until the text passes 4.5 to 1.
 * Ported from pictureColors in prototypes/today-directions/painterly.js.
 */
import { ctx2d } from "./noise";

export interface PaintingColors {
  /** Hue in degrees, 0 to 360. */
  hue: number;
  /** Saturation in percent, 38 to 72. */
  sat: number;
  /** Lightness in percent of the main button, dark enough for white text. */
  buttonL: number;
  /** The main button color, as CSS. */
  accent: string;
}

/** The colors before the day's painting has loaded: Karman's calm blue. */
export const DEFAULT_COLORS: PaintingColors = {
  hue: 208,
  sat: 55,
  buttonL: buttonLightness(208, 55),
  accent: `hsl(208 55% ${buttonLightness(208, 55)}%)`,
};

/** Relative luminance of hsl(h s% L%), as WCAG defines it. */
export function hslLuminance(h: number, s: number, L: number): number {
  const a = (s / 100) * Math.min(L / 100, 1 - L / 100);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const v = L / 100 - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * f(0) + 0.7152 * f(8) + 0.0722 * f(4);
}

/** Contrast of white text on hsl(h s% L%). */
export function whiteContrast(h: number, s: number, L: number): number {
  return 1.05 / (hslLuminance(h, s, L) + 0.05);
}

/** The lightest shade, from 46% down, where white text passes 4.5 to 1 (with a small margin). */
export function buttonLightness(h: number, s: number): number {
  for (let L = 46; L > 15; L--) if (whiteContrast(h, s, L) >= 4.6) return L;
  return 16;
}

export function colorsFor(hue: number, sat: number): PaintingColors {
  const buttonL = buttonLightness(hue, sat);
  return { hue, sat, buttonL, accent: `hsl(${hue} ${sat}% ${buttonL}%)` };
}

/** Finds the painting's hue: the most common strongly colored hue, by 10-degree bins. */
export function pictureColors(pic: HTMLCanvasElement): PaintingColors | null {
  try {
    const d = ctx2d(pic).getImageData(0, 0, pic.width, pic.height).data;
    const bins = new Array<number>(36).fill(0);
    const sat = new Array<number>(36).fill(0);
    for (let i = 0; i < d.length; i += 4 * 53) {
      const r = d[i] / 255;
      const gg = d[i + 1] / 255;
      const b = d[i + 2] / 255;
      const mx = Math.max(r, gg, b);
      const mn = Math.min(r, gg, b);
      const c = mx - mn;
      const l = (mx + mn) / 2;
      if (c < 0.08 || l < 0.1 || l > 0.94) continue;
      let hh = mx === r ? ((gg - b) / c) % 6 : mx === gg ? (b - r) / c + 2 : (r - gg) / c + 4;
      hh = (hh * 60 + 360) % 360;
      const k = Math.floor(hh / 10) % 36;
      bins[k] += c;
      sat[k] += c / (1 - Math.abs(2 * l - 1) || 1);
    }
    let best = 0;
    bins.forEach((v, i) => {
      if (v > bins[best]) best = i;
    });
    if (!bins[best]) return null;
    const hue = best * 10 + 5;
    const s = Math.round(Math.min(72, Math.max(38, (sat[best] / bins[best]) * 100)));
    return colorsFor(hue, s);
  } catch {
    return null;
  }
}

/** Is the picture light or dark where the greeting and menus sit (the top-left band)? */
export function pictureTone(pic: HTMLCanvasElement): "light" | "dark" | null {
  try {
    const w = Math.max(1, Math.round(pic.width * 0.45));
    const h = Math.max(1, Math.round(pic.height * 0.14));
    const d = ctx2d(pic).getImageData(0, 0, w, h).data;
    let L = 0;
    let n = 0;
    for (let i = 0; i < d.length; i += 64) {
      L += d[i] * 0.3 + d[i + 1] * 0.59 + d[i + 2] * 0.11;
      n++;
    }
    return L / n > 150 ? "light" : "dark";
  } catch {
    return null;
  }
}

/** Writes the painting's colors as CSS variables. The level shades are derived in CSS. */
export function applyPaintingColors(el: HTMLElement, c: PaintingColors) {
  el.style.setProperty("--hue", String(c.hue));
  el.style.setProperty("--hs", `${c.sat}%`);
  el.style.setProperty("--accent", c.accent);
}

export function clearPaintingColors(el: HTMLElement) {
  for (const k of ["--hue", "--hs", "--accent"]) el.style.removeProperty(k);
}
