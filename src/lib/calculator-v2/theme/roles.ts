// Theme roles of the calculator v2 (01-interfaces-runtime.md section 6): the custom property maps,
// the TH-5 skin fallback, the `:host` theme declarations, and the TH-10 and TH-11 row colours.
import { adjustLightness, contrastRatio } from "./contrast";
import { fillAlphaFor } from "./derive";
import { SKIN_COLORS } from "./skin-colors.generated";
import { COLOR_ROLES, CURVE_SLOTS, SKIN_IDS, type CurveSlot, type SkinId } from "./skins";
import { CURVE_TARGET } from "./targets";
import { CURVE_VARS, FILL_ALPHA_VARS, ROLE_VARS, SHADING_CAP_VAR } from "./vars";

export { ROLE_VARS, CURVE_VARS, FILL_ALPHA_VARS, CHROME_VARS, type ChromeRole } from "./vars";

/** TH-11: the note a row shows when its explicit colour was adjusted for the active skin. */
export const EXPLICIT_COLOUR_NOTE = "Colour adjusted for contrast on this theme";

/** A row colour resolved against one skin (TH-10, TH-11). */
type RowColor = { hex: string; fillAlpha: number; adjusted: boolean };

const HEX_COLOR = /^#[0-9a-f]{6}$/i;
const explicitColors = new Map<string, RowColor>();

/**
 * TH-5: the site theme id when it is one of the 12 skins, else Warm ivory or Observatory by
 * `prefers-color-scheme`.
 */
export function resolveSkinId(themeId: string | null | undefined, prefersDark: boolean): SkinId {
  if (isSkinId(themeId)) return themeId;
  return prefersDark ? "observatory" : "ivory";
}

/**
 * TH-3: the skin's declarations for the shadow root, `:host{name:value;…}` with every role in
 * `COLOR_ROLES` order, then the six curves, then the six fill alphas.
 */
export function hostThemeCss(skin: SkinId): string {
  const { roles, curves, fillAlpha, shadingCap } = SKIN_COLORS[skin].normal;
  const decls = [
    ...COLOR_ROLES.map((role) => `${ROLE_VARS[role]}:${roles[role]}`),
    ...CURVE_SLOTS.map((slot) => `${CURVE_VARS[slot]}:${curves[slot]}`),
    ...CURVE_SLOTS.map((slot) => `${FILL_ALPHA_VARS[slot]}:${String(fillAlpha[slot])}`),
    `${SHADING_CAP_VAR}:${String(shadingCap)}`,
  ];
  return `:host{${decls.join(";")}}`;
}

/** TH-10: the slot a new row takes, c1 to c6 in order, then repeating. */
export function nextSlot(index: number): CurveSlot {
  return CURVE_SLOTS[((index % 6) + 6) % 6];
}

/**
 * TH-10, TH-11 (OI-1): a slot id takes the skin's curve and fill alpha; an explicit `#rrggbb` (any
 * case) below the 5.85:1 curve target on the paper moves in OKLCH lightness by the TH-4 rule until
 * it meets it (`adjusted: true`), so it stays 4.5:1 over capped shading; anything else is `c1`.
 */
export function resolveRowColor(color: string, skin: SkinId): RowColor {
  const { curves, fillAlpha } = SKIN_COLORS[skin].normal;
  if (isCurveSlot(color)) {
    return { hex: curves[color], fillAlpha: fillAlpha[color], adjusted: false };
  }
  if (!HEX_COLOR.test(color)) return resolveRowColor(CURVE_SLOTS[0], skin);
  const hex = color.toLowerCase();
  const key = `${skin}|${hex}`;
  let resolved = explicitColors.get(key);
  if (resolved === undefined) {
    const { roles, shadingCap } = SKIN_COLORS[skin].normal;
    resolved = resolveExplicitColor(hex, roles.paper, shadingCap);
    explicitColors.set(key, resolved);
  }
  return { ...resolved };
}

function resolveExplicitColor(hex: string, paper: string, shadingCap: number): RowColor {
  if (contrastRatio(hex, paper) >= CURVE_TARGET) {
    return { hex, fillAlpha: fillAlphaFor(hex, paper, shadingCap), adjusted: false };
  }
  const lifted = adjustLightness(hex, paper, CURVE_TARGET);
  return { hex: lifted, fillAlpha: fillAlphaFor(lifted, paper, shadingCap), adjusted: true };
}

function isCurveSlot(id: string): id is CurveSlot {
  return (CURVE_SLOTS as readonly string[]).includes(id);
}

function isSkinId(id: string | null | undefined): id is SkinId {
  return typeof id === "string" && (SKIN_IDS as readonly string[]).includes(id);
}
