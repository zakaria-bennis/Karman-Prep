// Skin ids, colour roles and curve slots of the calculator v2 theme (01-interfaces-runtime.md
// section 6). The 12 skins are the site themes of src/lib/themes/palettes.ts in order (TH-5).

export const SKIN_IDS = [
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
export type SkinId = (typeof SKIN_IDS)[number];
export type BackgroundRole =
  | "paper"
  | "list"
  | "chrome"
  | "key"
  | "keyOperator"
  | "accent"
  | "tooltip";
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
export interface SkinPalette {
  dark: boolean;
  roles: Record<ColorRole, string>; // "#rrggbb"
  curves: Record<CurveSlot, string>; // TH-6, >= 5.95:1 on paper
  fillAlpha: Record<CurveSlot, number>; // TH-8: min(40%, the alpha reaching shadingCap / 1.04)
  shadingCap: number; // TH-8: combined shading's contrast cap on the paper
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
];

/** The six curve palette slots (TH-6, TH-10). */
export const CURVE_SLOTS: readonly CurveSlot[] = ["c1", "c2", "c3", "c4", "c5", "c6"];
