// CSS custom property names of the calculator theme.
// Type-only imports keep this module free of runtime dependencies, so the TH-5 generator and the
// TH-3 scan import these maps from here and still run when skin-colors.generated.ts is missing.
import type { ColorRole, CurveSlot } from "./skins";

/** Each colour role's shadow-root property on `:host`, in `COLOR_ROLES` order. */
export const ROLE_VARS: Readonly<Record<ColorRole, string>> = {
  paper: "--kc-paper",
  list: "--kc-list",
  chrome: "--kc-chrome",
  key: "--kc-key",
  keyOperator: "--kc-key-operator",
  accent: "--kc-accent",
  text: "--kc-text",
  textSecondary: "--kc-text-secondary",
  error: "--kc-error",
  warning: "--kc-warning",
  tooltipLabel: "--kc-tooltip-label",
  tooltip: "--kc-tooltip",
  axis: "--kc-axis",
  gridMajor: "--kc-grid-major",
  gridMinor: "--kc-grid-minor",
  focusRing: "--kc-focus-ring",
  focusBar: "--kc-focus-bar",
  focusBarLabel: "--kc-focus-bar-label",
  accentLabel: "--kc-accent-label",
  boundary: "--kc-boundary",
};

/** Each curve slot's colour property (F-A1, Desmos's colours; TH-10). */
export const CURVE_VARS: Readonly<Record<CurveSlot, string>> = {
  c1: "--kc-curve-1",
  c2: "--kc-curve-2",
  c3: "--kc-curve-3",
  c4: "--kc-curve-4",
  c5: "--kc-curve-5",
  c6: "--kc-curve-6",
};

/** Each curve slot's inequality fill alpha property (F-A1, Desmos's 40% fill). */
export const FILL_ALPHA_VARS: Readonly<Record<CurveSlot, string>> = {
  c1: "--kc-fill-alpha-1",
  c2: "--kc-fill-alpha-2",
  c3: "--kc-fill-alpha-3",
  c4: "--kc-fill-alpha-4",
  c5: "--kc-fill-alpha-5",
  c6: "--kc-fill-alpha-6",
};

/** The roles the eager light-DOM chrome sheet declares (TH-2, TH-5). */
export type ChromeRole =
  | "chrome"
  | "text"
  | "textSecondary"
  | "boundary"
  | "focusRing"
  | "accent"
  | "accentLabel";

/** The light-DOM properties of calculator-chrome.generated.css, in `ChromeRole` order. */
export const CHROME_VARS: Readonly<Record<ChromeRole, string>> = {
  chrome: "--kcc-chrome",
  text: "--kcc-text",
  textSecondary: "--kcc-text-secondary",
  boundary: "--kcc-boundary",
  focusRing: "--kcc-focus",
  accent: "--kcc-accent",
  accentLabel: "--kcc-accent-label",
};
