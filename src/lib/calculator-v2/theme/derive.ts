// Derives the calculator v2 skin palettes from the site themes of src/lib/themes/palettes.ts:
// the 10.3 role mapping with the TH-4 adjustment, plus Desmos's curve colours and shading (F-A1).
import type { SiteTheme } from "../../themes/palettes";
import { adjustLightness, compositeOver, contrastRatio } from "./contrast";
import { DESMOS_FILL_ALPHA, desmosCurves } from "./desmos-palette";
import {
  COLOR_ROLES,
  CURVE_SLOTS,
  SKIN_IDS,
  type ColorRole,
  type CurveSlot,
  type SkinId,
  type SkinPalette,
} from "./skins";
import { MINOR_GRID_TARGET, TEXT_BACKGROUNDS } from "./targets";

const MAX_ADJUST_ROUNDS = 10;

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

/** `border` mixed toward the paper at the largest alpha (in 0.01 steps) at most 1.5:1 on it. */
function minorGrid(border: string, paper: string): string {
  for (let k = 100; k >= 0; k--) {
    const mixed = compositeOver(border, k / 100, paper);
    if (contrastRatio(mixed, paper) <= MINOR_GRID_TARGET) return mixed;
  }
  return paper;
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
    axis: adjustLightness(theme.text, paper, 7),
    gridMajor: adjustLightness(theme.border, paper, 3),
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

/** One skin's roles, with Desmos's curve colours and 40% fill on every slot (F-A1). */
export function buildSkinPalette(theme: SiteTheme): SkinPalette {
  const roles = deriveRoles(theme);
  const curves = desmosCurves(theme.dark);
  const fillAlpha = Object.fromEntries(
    CURVE_SLOTS.map((slot) => [slot, DESMOS_FILL_ALPHA])
  ) as Record<CurveSlot, number>;
  return { dark: theme.dark, roles, curves, fillAlpha };
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
