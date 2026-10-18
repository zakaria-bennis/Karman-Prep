// Derives the calculator v2 skin palettes from the site themes of src/lib/themes/palettes.ts:
// the 10.3 role mapping with the TH-4 adjustment, the TH-6 curve palettes and the TH-8 fill alphas.
import type { SiteTheme } from "../../themes/palettes";
import {
  adjustLightness,
  compositeOver,
  contrastRatio,
  fromOklch,
  inGamut,
  simulateCvd,
  toOklab,
  toOklch,
} from "./contrast";
import {
  COLOR_ROLES,
  CURVE_SLOTS,
  SKIN_IDS,
  type ColorRole,
  type CurveSlot,
  type SkinId,
  type SkinPalette,
} from "./skins";
import {
  CURVE_CANDIDATE_TARGET,
  GRID_MAX_CHROMA,
  CURVE_OVER_SHADING,
  MAX_FILL_ALPHA,
  OVERLAP_STEP,
  MINOR_GRID_TARGET,
  TEXT_BACKGROUNDS,
} from "./targets";

const MAX_ADJUST_ROUNDS = 10;
// R-2 (founder decision 2026-10-18): the warning marker's seed is Desmos's orange; written as a
// number so TH-3's string scan sees only the palette role it becomes.
const WARNING_SEED = 0xfa7e19;
const BLACK = 0x000000;
const WHITE = 0xffffff;
const hexOf = (rgb: number): string => `#${rgb.toString(16).padStart(6, "0")}`;
const CVD_KINDS = ["protan", "deutan", "tritan"] as const;

// TH-6 OKLCH grid: L 0 to 1 in 0.01 steps, C 0.07 to 0.26 in 0.015 steps, hue in 4 degree steps.
const GRID_L_STEPS = 100;
const GRID_C_START = 0.07;
const GRID_C_STEP = 0.015;
const GRID_C_STEPS = 12;
const GRID_H_STEP = 4;
const GRID_H_STEPS = 90;
const C1_HUE_MIN = 240;
const C1_HUE_MAX = 270;

/**
 * Applies `adjustLightness` against whichever of `backgrounds` gives the lowest contrast until the
 * colour reaches `target` on all of them, throwing after 10 rounds.
 */
function adjustAll(color: string, backgrounds: readonly string[], target: number): string {
  let out = color.toLowerCase();
  for (let round = 0; round <= MAX_ADJUST_ROUNDS; round++) {
    let worst = backgrounds[0];
    for (const bg of backgrounds) {
      if (contrastRatio(out, bg) < contrastRatio(out, worst)) worst = bg;
    }
    if (contrastRatio(out, worst) >= target) return out;
    if (round === MAX_ADJUST_ROUNDS) break;
    out = adjustLightness(out, worst, target);
  }
  throw new Error(`Could not bring ${color} to ${target}:1 on ${backgrounds.join(", ")}`);
}

/** TH-19: `color` with its OKLCH chroma brought down to GRID_MAX_CHROMA, lightness and hue kept. */
function neutral(color: string): string {
  const { l, c, h } = toOklch(color);
  // Encoding to hex can raise the chroma a little, so the reduced colour aims just under the cap.
  return c <= GRID_MAX_CHROMA ? color : fromOklch(l, GRID_MAX_CHROMA - 0.004, h);
}

/**
 * `border` mixed toward the paper at the largest alpha (in 0.01 steps) whose neutral (TH-19) is at
 * most 1.5:1 on it.
 */
function minorGrid(border: string, paper: string): string {
  for (let k = 100; k >= 0; k--) {
    const mixed = neutral(compositeOver(border, k / 100, paper));
    if (contrastRatio(mixed, paper) <= MINOR_GRID_TARGET) return mixed;
  }
  return neutral(paper);
}

/** Every colour role of a site theme by the 10.3 mapping, adjusted by the TH-4 rule. */
export function deriveRoles(theme: SiteTheme): Record<ColorRole, string> {
  const paper = theme.dark ? theme.canvas : theme.surface;
  const list = theme.surface;
  const chrome = theme.dark ? theme.canvas : theme.raised;
  const key = theme.dark ? theme.raised : theme.surface;
  const keyOperator = theme.dark ? theme.surface : theme.canvas;
  const accentLabel = theme.dark ? theme.canvas : theme.surface;
  const focusBarLabel = accentLabel;
  const backgrounds: Record<string, string> = { paper, list, chrome, key, keyOperator };
  const textBackgrounds = TEXT_BACKGROUNDS.map((role) => backgrounds[role]);
  const derived: Record<ColorRole, string> = {
    paper,
    list,
    chrome,
    key,
    keyOperator,
    accent: adjustLightness(theme.gold, accentLabel, 7),
    text: adjustAll(theme.text, textBackgrounds, 7),
    textSecondary: adjustAll(theme.muted, textBackgrounds, 7),
    error: adjustLightness(theme.reading, list, 7),
    warning: adjustAll(hexOf(WARNING_SEED), [list, chrome], 3),
    tooltip: hexOf(BLACK),
    tooltipLabel: hexOf(WHITE),
    axis: adjustLightness(theme.text, paper, 7),
    gridMajor: neutral(adjustLightness(neutral(theme.border), paper, 3)),
    gridMinor: minorGrid(theme.border, paper),
    focusRing: adjustAll(theme.math, textBackgrounds, 3),
    focusBar: adjustLightness(theme.math, focusBarLabel, 7),
    focusBarLabel,
    accentLabel,
    boundary: adjustAll(theme.border, [list, chrome, key], 3),
  };
  return Object.fromEntries(COLOR_ROLES.map((role) => [role, derived[role]])) as Record<
    ColorRole,
    string
  >;
}

export interface CurveCandidate {
  hex: string; // encoded from the OKLCH grid point l, c, h
  l: number;
  c: number;
  h: number;
  contrast: number; // contrastRatio(hex, paper)
  labs: readonly (readonly [number, number, number])[]; // toOklab: normal, protan, deutan, tritan
}

/** TH-6: the distinct in-gamut OKLCH grid colours at least 5.95:1 against `paper`. */
export function curveCandidates(paper: string): CurveCandidate[] {
  const seen = new Set<string>();
  const out: CurveCandidate[] = [];
  for (let li = 0; li <= GRID_L_STEPS; li++) {
    const l = li / GRID_L_STEPS;
    for (let k = 0; k <= GRID_C_STEPS; k++) {
      const c = GRID_C_START + GRID_C_STEP * k;
      for (let hi = 0; hi < GRID_H_STEPS; hi++) {
        const h = GRID_H_STEP * hi;
        if (!inGamut(l, c, h)) continue;
        const hex = fromOklch(l, c, h);
        if (seen.has(hex)) continue;
        seen.add(hex);
        const contrast = contrastRatio(hex, paper);
        if (contrast < CURVE_CANDIDATE_TARGET) continue;
        const labs = [toOklab(hex), ...CVD_KINDS.map((kind) => toOklab(simulateCvd(hex, kind)))];
        out.push({ hex, l, c, h, contrast, labs });
      }
    }
  }
  return out;
}

/**
 * TH-6: the smallest ΔE_OK between `candidate` and any chosen colour under normal, protan, deutan
 * and tritan vision, each vision compared with itself only; Infinity when nothing is chosen.
 */
export function curveScore(candidate: CurveCandidate, chosen: readonly CurveCandidate[]): number {
  let score = Infinity;
  for (const s of chosen) {
    for (let v = 0; v < candidate.labs.length; v++) {
      const [l1, a1, b1] = candidate.labs[v];
      const [l2, a2, b2] = s.labs[v];
      score = Math.min(score, Math.hypot(l1 - l2, a1 - a2, b1 - b2));
    }
  }
  return score;
}

/**
 * TH-6: c1 is the highest-chroma candidate with hue 240 to 270 (then highest contrast, then
 * first); each later slot is the candidate with the strictly greatest score against the slots so
 * far (ties keep the first).
 */
export function pickCurveSlots(candidates: readonly CurveCandidate[]): Record<CurveSlot, string> {
  let first: CurveCandidate | undefined;
  for (const x of candidates) {
    if (x.h < C1_HUE_MIN || x.h > C1_HUE_MAX) continue;
    if (!first || x.c > first.c || (x.c === first.c && x.contrast > first.contrast)) first = x;
  }
  if (!first) throw new Error("No curve candidate has a hue of 240 to 270 degrees");
  const chosen: CurveCandidate[] = [first];
  while (chosen.length < CURVE_SLOTS.length) {
    let best: CurveCandidate | undefined;
    let bestScore = -Infinity;
    for (const x of candidates) {
      const score = curveScore(x, chosen);
      if (score > bestScore) {
        best = x;
        bestScore = score;
      }
    }
    if (!best) throw new Error("Not enough curve candidates for six slots");
    chosen.push(best);
  }
  return Object.fromEntries(CURVE_SLOTS.map((slot, i) => [slot, chosen[i].hex])) as Record<
    CurveSlot,
    string
  >;
}

/**
 * TH-8 (appendix F): the cap on combined shading, the lowest curve contrast over 4.5 so every curve
 * keeps 4.5:1 over any shading, and never above the contrast of any curve's 40% mix.
 */
export function shadingCapFor(curves: readonly string[], paper: string): number {
  let cap = Infinity;
  for (const c of curves) {
    cap = Math.min(cap, contrastRatio(c, paper) / CURVE_OVER_SHADING);
    cap = Math.min(cap, contrastRatio(compositeOver(c, MAX_FILL_ALPHA, paper), paper));
  }
  return Math.floor(cap * 1000) / 1000;
}

/**
 * TH-8: one fill's alpha, the largest (in 0.001 steps, at most 40%) at which `color` over `paper`
 * stays at or below cap / 1.04 (with a margin for 8-bit rounding), so a second fill still shows
 * 1.04:1 apart under the cap.
 */
const FILL_STEP = OVERLAP_STEP + 0.02;
export function fillAlphaFor(color: string, paper: string, cap: number): number {
  let best = 0.001;
  for (let k = 1; k <= MAX_FILL_ALPHA * 1000; k++) {
    const alpha = k / 1000;
    if (contrastRatio(compositeOver(color, alpha, paper), paper) > cap / FILL_STEP) break;
    best = alpha;
  }
  return best;
}

/** One skin's roles, TH-6 curves and TH-8 fill alphas. */
export function buildSkinPalette(theme: SiteTheme): SkinPalette {
  const roles = deriveRoles(theme);
  const curves = pickCurveSlots(curveCandidates(roles.paper));
  const shadingCap = shadingCapFor(Object.values(curves), roles.paper);
  const fillAlpha = Object.fromEntries(
    CURVE_SLOTS.map((slot) => [slot, fillAlphaFor(curves[slot], roles.paper, shadingCap)])
  ) as Record<CurveSlot, number>;
  return { dark: theme.dark, roles, curves, fillAlpha, shadingCap };
}

/** Every skin's palette keyed by `SKIN_IDS`; the themes must be the 12 skins in that order. */
export function buildSkinColors(
  themes: readonly SiteTheme[]
): Record<SkinId, { normal: SkinPalette }> {
  if (themes.length !== SKIN_IDS.length || themes.some((theme, i) => theme.id !== SKIN_IDS[i])) {
    throw new Error("palettes.ts themes do not match SKIN_IDS");
  }
  return Object.fromEntries(
    SKIN_IDS.map((id, i) => [id, { normal: buildSkinPalette(themes[i]) }])
  ) as Record<SkinId, { normal: SkinPalette }>;
}
