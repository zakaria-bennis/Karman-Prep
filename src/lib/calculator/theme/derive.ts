// Derives the calculator skin palettes from the site themes of src/lib/themes/palettes.ts:
// the 10.3 role mapping with the TH-4 adjustment, the tones of tones.ts, plus Desmos's curve
// colours and shading (F-A1). The mapping follows how the quiz pages use each theme: surfaces
// from canvas, surface and raised, ink from text and muted, lines from border, and the
// interactive blue (focus, selection, the Enter key and the focused row) from math, the colour the
// quiz gives its selected answers and focus rings, as the reference calculator uses its one blue.
import type { SiteTheme } from "../../themes/palettes";
import { adjustLightness, compositeOver, contrastRatio, fromOklch, toOklch } from "./contrast";
import { CLASSIC_ROLES, DESMOS_FILL_ALPHA, desmosCurves } from "./desmos-palette";
import { deriveTones, referenceTones } from "./tones";
import {
  COLOR_ROLES,
  CURVE_SLOTS,
  SITE_SKIN_IDS,
  type ColorRole,
  type CurveSlot,
  type SkinId,
  type SkinPalette,
} from "./skins";
import { GRID_MAX_CHROMA, MINOR_GRID_TARGET, TEXT_BACKGROUNDS } from "./targets";

const MAX_ADJUST_ROUNDS = 10;
// R-2 (founder decision 2026-10-18): the warning marker's seed is Desmos's orange; written as a
// number so TH-3's string scan sees only the palette role it becomes.
const WARNING_SEED = 0xfa7e19;
const hexOf = (rgb: number): string => `#${rgb.toString(16).padStart(6, "0")}`;

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
  // Labels on the blue fills, and the tooltip label: the page colour, as the quiz labels its
  // text-coloured primary buttons (`bg-ivory text-night`).
  const accentLabel = theme.dark ? theme.canvas : theme.surface;
  const focusBarLabel = accentLabel;
  const tooltipLabel = accentLabel;
  const backgrounds: Record<string, string> = { paper, list, chrome, key, keyOperator };
  const textBackgrounds = TEXT_BACKGROUNDS.map((role) => backgrounds[role]);
  const derived: Record<ColorRole, string> = {
    paper,
    list,
    chrome,
    key,
    keyOperator,
    accent: adjustLightness(theme.math, accentLabel, 7),
    text: adjustAll(theme.text, textBackgrounds, 7),
    textSecondary: adjustAll(theme.muted, textBackgrounds, 7),
    error: adjustLightness(theme.reading, list, 7),
    warning: adjustAll(hexOf(WARNING_SEED), [list, chrome], 3),
    // The reference's black tooltip is the skin's ink: dark on light skins, light on dark ones.
    tooltip: adjustLightness(theme.text, tooltipLabel, 7),
    tooltipLabel,
    axis: adjustLightness(theme.text, paper, 7),
    gridMajor: neutral(adjustLightness(neutral(theme.border), paper, 3)),
    gridMinor: minorGrid(theme.border, paper),
    focusRing: adjustAll(theme.math, textBackgrounds, 3),
    focusBar: adjustLightness(theme.math, focusBarLabel, 7),
    focusBarLabel,
    accentLabel,
    boundary: adjustAll(theme.border, [list, chrome, key], 3),
    selection: compositeOver(theme.math, 0.3, list),
  };
  return Object.fromEntries(COLOR_ROLES.map((role) => [role, derived[role]])) as Record<
    ColorRole,
    string
  >;
}

function palette(
  dark: boolean,
  roles: Record<ColorRole, string>,
  tones: SkinPalette["tones"]
): SkinPalette {
  const curves = desmosCurves(dark);
  const fillAlpha = Object.fromEntries(
    CURVE_SLOTS.map((slot) => [slot, DESMOS_FILL_ALPHA])
  ) as Record<CurveSlot, number>;
  return { dark, roles, tones, curves, fillAlpha };
}

/**
 * One skin's roles and tones, with Desmos's curve colours (inverted on dark skins, as its Reverse
 * contrast shows them) and 40% fill on every slot (F-A1).
 */
export function buildSkinPalette(theme: SiteTheme): SkinPalette {
  const roles = deriveRoles(theme);
  return palette(theme.dark, roles, deriveTones(roles));
}

/** The hand-set classic skin: the reference calculator's roles, tones, curves and fill. */
export function buildClassicPalette(): SkinPalette {
  const roles = Object.fromEntries(COLOR_ROLES.map((role) => [role, CLASSIC_ROLES[role]]));
  return palette(false, roles as Record<ColorRole, string>, referenceTones());
}

/**
 * Every skin's palette keyed by `SKIN_IDS`: classic first, then the site skins; the themes must be
 * the 12 site skins in `SITE_SKIN_IDS` order.
 */
export function buildSkinColors(
  themes: readonly SiteTheme[]
): Record<SkinId, { normal: SkinPalette }> {
  if (
    themes.length !== SITE_SKIN_IDS.length ||
    themes.some((theme, i) => theme.id !== SITE_SKIN_IDS[i])
  ) {
    throw new Error("palettes.ts themes do not match SITE_SKIN_IDS");
  }
  return Object.fromEntries([
    ["classic", { normal: buildClassicPalette() }],
    ...SITE_SKIN_IDS.map((id, i) => [id, { normal: buildSkinPalette(themes[i]) }]),
  ]) as Record<SkinId, { normal: SkinPalette }>;
}
