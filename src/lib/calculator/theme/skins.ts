// Skin ids, colour roles, tones and curve slots of the calculator theme (section 6). "classic" is
// the hand-set skin that matches the reference graphing calculator (desmos-palette.ts), used when
// no site theme applies; the 12 site skins are the site themes of src/lib/themes/palettes.ts in
// order (TH-5), derived by derive.ts.

export const SITE_SKIN_IDS = [
  "observatory",
  "charcoal",
  "forest",
  "ivory",
  "paper",
  "sand",
  "sage",
  "lavender",
  "peach",
  "rose",
  "blush",
  "plum",
] as const;
export type SiteSkinId = (typeof SITE_SKIN_IDS)[number];
export const SKIN_IDS = ["classic", ...SITE_SKIN_IDS] as const;
export type SkinId = (typeof SKIN_IDS)[number];
export type BackgroundRole =
  | "paper"
  | "list"
  | "chrome"
  | "key"
  | "keyOperator"
  | "accent"
  | "tooltip"
  | "selection";
export type ForegroundRole =
  | "text"
  | "textSecondary"
  | "error"
  | "warning"
  | "tooltipLabel"
  | "axis"
  | "gridMajor"
  | "gridMinor"
  | "focusRing"
  | "focusBar"
  | "focusBarLabel"
  | "accentLabel"
  | "boundary";
export type ColorRole = BackgroundRole | ForegroundRole;
export type CurveSlot = "c1" | "c2" | "c3" | "c4" | "c5" | "c6";
/** A tone: a role's ink mixed over a background at a per-skin strength (tones.ts). */
export type Tone =
  | "rowNumber"
  | "textMuted"
  | "equals"
  | "fieldText"
  | "fieldPlaceholder"
  | "segmentText"
  | "selectedFill"
  | "fieldLine"
  | "errorTip";
export interface SkinPalette {
  dark: boolean;
  roles: Record<ColorRole, string>; // "#rrggbb"
  tones: Record<Tone, number>; // ink strength 0 to 1, in hundredths
  curves: Record<CurveSlot, string>; // F-A1: Desmos's six colours, inverted on dark skins
  fillAlpha: Record<CurveSlot, number>; // F-A1: Desmos's 40% inequality fill
}

/** Every colour role in section 6 order: the background roles, then the foreground roles. */
export const COLOR_ROLES: readonly ColorRole[] = [
  "paper",
  "list",
  "chrome",
  "key",
  "keyOperator",
  "accent",
  "text",
  "textSecondary",
  "error",
  "warning",
  "tooltipLabel",
  "tooltip",
  "axis",
  "gridMajor",
  "gridMinor",
  "focusRing",
  "focusBar",
  "focusBarLabel",
  "accentLabel",
  "boundary",
  "selection",
];

/** The six curve palette slots (F-A1, Desmos's colours; TH-10). */
export const CURVE_SLOTS: readonly CurveSlot[] = ["c1", "c2", "c3", "c4", "c5", "c6"];
