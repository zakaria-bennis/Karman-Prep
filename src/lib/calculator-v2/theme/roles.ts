// Theme roles of the calculator v2 (01-interfaces-runtime.md section 6): the custom property maps,
// the TH-5 skin fallback, the `:host` theme declarations, and the row colours (F-A1).
import { DESMOS_FILL_ALPHA, NEW_ROW_COLOURS, invertHex } from "./desmos-palette";
import { SKIN_COLORS } from "./skin-colors.generated";
import { COLOR_ROLES, CURVE_SLOTS, SKIN_IDS, type CurveSlot, type SkinId } from "./skins";
import { CURVE_VARS, FILL_ALPHA_VARS, ROLE_VARS } from "./vars";

export { ROLE_VARS, CURVE_VARS, FILL_ALPHA_VARS, CHROME_VARS, type ChromeRole } from "./vars";

/** A row colour resolved against one skin (F-A1). */
type RowColor = { hex: string; fillAlpha: number };

const HEX_COLOR = /^#[0-9a-f]{6}$/i;

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
  const { roles, curves, fillAlpha } = SKIN_COLORS[skin].normal;
  const decls = [
    ...COLOR_ROLES.map((role) => `${ROLE_VARS[role]}:${roles[role]}`),
    ...CURVE_SLOTS.map((slot) => `${CURVE_VARS[slot]}:${curves[slot]}`),
    ...CURVE_SLOTS.map((slot) => `${FILL_ALPHA_VARS[slot]}:${String(fillAlpha[slot])}`),
  ];
  return `:host{${decls.join(";")}}`;
}

/**
 * F-A1: the colour a new row at `index` takes. Like Desmos, new rows cycle red, blue, green
 * (Desmos's new-row #388c46), purple, black and repeat; orange (c5) is only offered in the picker.
 */
export function nextSlot(index: number): string {
  const n = NEW_ROW_COLOURS.length;
  return NEW_ROW_COLOURS[((index % n) + n) % n];
}

/**
 * F-A1: the colour after `color` in the new-row cycle (black is followed by red). Picker green c3
 * stands where the new-row green does and orange c5 where purple does, so each is followed by the
 * colour after it in Desmos's picker that the cycle uses (c4 and c6). Anything else, such as an
 * explicit `#rrggbb`, takes `nextSlot(fallback)`.
 */
export function colourAfter(color: string | undefined, fallback: number): string {
  const key = color === "c3" ? NEW_ROW_COLOURS[2] : color === "c5" ? "c4" : color?.toLowerCase();
  const i = key === undefined ? -1 : NEW_ROW_COLOURS.indexOf(key);
  return i < 0 ? nextSlot(fallback) : NEW_ROW_COLOURS[(i + 1) % NEW_ROW_COLOURS.length];
}

/**
 * F-A1: a slot id takes the skin's curve and fill alpha. An explicit `#rrggbb` (any case) is used
 * as is with Desmos's 40% fill, inverted on dark skins as Desmos's Reverse contrast shows it; it is
 * never adjusted for contrast. Anything else is `c1`.
 */
export function resolveRowColor(color: string, skin: SkinId): RowColor {
  const { dark, curves, fillAlpha } = SKIN_COLORS[skin].normal;
  if (isCurveSlot(color)) return { hex: curves[color], fillAlpha: fillAlpha[color] };
  if (!HEX_COLOR.test(color)) return resolveRowColor(CURVE_SLOTS[0], skin);
  const hex = color.toLowerCase();
  return { hex: dark ? invertHex(hex) : hex, fillAlpha: DESMOS_FILL_ALPHA };
}

function isCurveSlot(id: string): id is CurveSlot {
  return (CURVE_SLOTS as readonly string[]).includes(id);
}

function isSkinId(id: string | null | undefined): id is SkinId {
  return typeof id === "string" && (SKIN_IDS as readonly string[]).includes(id);
}
