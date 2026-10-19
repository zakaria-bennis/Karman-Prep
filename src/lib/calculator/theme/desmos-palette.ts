// Desmos's curve colours and inequality shading (owner instruction 2026-10-19, appendix F
// amendment F-A1). It replaces the TH-6 generated curve palettes, the TH-7 colour-blind spacing, the TH-8
// fill alphas and shading cap, and the TH-11 explicit-colour lift. The 10.3 role targets for text,
// axes, gridlines and focus still apply.
import type { ColorRole, CurveSlot } from "./skins";

/**
 * Desmos's six colour-picker colours by slot: red, blue, green, purple, orange, black. The slot
 * numbers are stored in saved states and never change; the picker draws them in PICKER_SLOTS order.
 */
export const DESMOS_CURVES: Readonly<Record<CurveSlot, string>> = {
  c1: "#c74440",
  c2: "#2d70b3",
  c3: "#348543",
  c4: "#6042a6",
  c5: "#fa7e19",
  c6: "#000000",
};

/** Desmos's colour-picker order (captured 2026-10-19): red, blue, green, orange, purple, black. */
export const PICKER_SLOTS: readonly CurveSlot[] = ["c1", "c2", "c3", "c5", "c4", "c6"];

/**
 * The green Desmos gives new rows (captured 2026-10-19), a shade apart from the picker's c3
 * (#348543, Desmos.Colors.GREEN). It is stored as an explicit colour, so dark skins invert it
 * to #c773b9 like any explicit colour.
 */
export const NEW_ROW_GREEN = "#388c46";

/**
 * The colours new rows cycle through, as Desmos's next-colour rule does: red, blue, Desmos's
 * new-row green, purple, black, then red again. Orange (c5) is only offered in the picker.
 */
export const NEW_ROW_COLOURS: readonly string[] = ["c1", "c2", NEW_ROW_GREEN, "c4", "c6"];

/** Desmos's default fill opacity for inequality shading. */
export const DESMOS_FILL_ALPHA = 0.4;

/**
 * Desmos's Reverse contrast inverts the whole calculator (`invert(100%)`), so on dark skins each
 * curve colour is shown as its inverse: black becomes white, red becomes cyan.
 */
export function invertHex(hex: string): string {
  const n = Number.parseInt(hex.slice(1), 16);
  return `#${(0xffffff - n).toString(16).padStart(6, "0")}`;
}

/** The six curve colours as a skin shows them: Desmos's own, inverted on dark skins. */
export function desmosCurves(dark: boolean): Record<CurveSlot, string> {
  const out = { ...DESMOS_CURVES };
  if (dark) for (const slot of Object.keys(out) as CurveSlot[]) out[slot] = invertHex(out[slot]);
  return out;
}

/**
 * The "classic" skin's roles: the reference calculator's own surfaces and ink, measured 2026-10-19
 * (rea-targets visual MASTER.md section 1). Hand-set, never contrast-adjusted. Alpha tones such as
 * the toolbar rule or the gutter tab are mixed from these in styles/tokens.css.
 */
export const CLASSIC_ROLES: Readonly<Record<ColorRole, string>> = {
  paper: "#ffffff",
  list: "#ffffff",
  chrome: "#f0f0f0",
  key: "#ffffff",
  keyOperator: "#ededed",
  accent: "#2f72dc",
  text: "#000000",
  textSecondary: "#666666",
  error: "#ce4945",
  warning: "#e66b3c",
  tooltipLabel: "#ffffff",
  tooltip: "#000000",
  axis: "#191919",
  gridMajor: "#999999",
  gridMinor: "#e0e0e0",
  focusRing: "#005fcc",
  focusBar: "#2f72dc",
  focusBarLabel: "#ffffff",
  accentLabel: "#ffffff",
  boundary: "#bbbbbb",
  selection: "#b4d5fe",
};
