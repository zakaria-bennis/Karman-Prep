// The calculator theme closest to the quiz's colours (founder, 2026-11-08): the same lightness
// (light or dark) first, then the nearest paper to the quiz background and accent to the quiz
// accent, in OKLab. Only the existing skins (TH-*); no new theme is made. Lazy module.

import { SKIN_COLORS } from "@/lib/calculator/theme/skin-colors.generated";
import { SKIN_IDS, type SkinId } from "@/lib/calculator/theme/skins";
import type { ThemeHint } from "../theme-hint";

type Rgb = readonly [number, number, number];

function hexRgb(hex: string): Rgb {
  const n = parseInt(hex.slice(1, 7), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function oklab([r, g, b]: Rgb): Rgb {
  const lin = (c: number) => {
    const v = c / 255;
    return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  const [lr, lg, lb] = [lin(r), lin(g), lin(b)];
  const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
  const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
  const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

function distance(a: Rgb, b: Rgb): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}

/** The skin whose darkness matches the hint's background and whose colours sit nearest to it. */
export function nearestSkin(hint: ThemeHint): SkinId {
  const background = oklab(hint.background);
  const accent = oklab(hint.accent);
  const dark = background[0] < 0.5;
  let best: SkinId = "classic";
  let bestScore = Number.POSITIVE_INFINITY;
  for (const id of SKIN_IDS) {
    const palette = SKIN_COLORS[id].normal;
    const score =
      (palette.dark === dark ? 0 : 100) +
      distance(background, oklab(hexRgb(palette.roles.paper))) +
      1.5 * distance(accent, oklab(hexRgb(palette.roles.accent)));
    if (score < bestScore) {
      best = id;
      bestScore = score;
    }
  }
  return best;
}
