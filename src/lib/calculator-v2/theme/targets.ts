// Contrast targets of the calculator v2 theme (spec appendix E, 10.3 and TH-1 to TH-11).
import type { ColorRole, ForegroundRole } from "./skins";

/** Curves on the graph paper: 10.3 and TH-11 with OI-1, so a curve stays 4.5:1 over shading. */
export const CURVE_TARGET = 5.85;
/** TH-6 curve candidates: the curve target plus a 0.1 rounding margin. */
export const CURVE_CANDIDATE_TARGET = 5.95;
/** TH-4: OKLCH lightness step of the adjustment rule. */
export const ADJUST_STEP = 0.005;
/** TH-4: an adjusted role stops at its target plus this margin. */
export const ADJUST_MARGIN = 0.05;
/** TH-8: a curve keeps this contrast over the strongest shading, so the cap is curve / 4.5. */
export const CURVE_OVER_SHADING = 4.5;
/** TH-8: a single fill is at most this alpha; the cap never exceeds such a mix's contrast. */
export const MAX_FILL_ALPHA = 0.4;
/** TH-8: the Phase 1 cap, still the default of compositeShading for callers with no skin. */
export const SHADING_CAP = 1.3;
/** TH-8: two overlapping fills stay at least this far from one fill. */
export const OVERLAP_STEP = 1.04;
/** TH-7: minimum pairwise ΔE_OK of a skin's six curves under every simulated vision. */
export const MIN_CURVE_DELTA_E = 0.08;
/** TH-19: gridlines are neutral, at most this OKLCH chroma. */
export const GRID_MAX_CHROMA = 0.02;
/** TH-1: minor gridlines aim at the middle of 1.4:1 to 1.6:1 on the paper. */
export const MINOR_GRID_TARGET = 1.5;

export type RoleTarget = {
  fg: ForegroundRole;
  on: readonly ColorRole[];
  min: number;
  max?: number;
};

/**
 * The backgrounds primary and secondary text and the focus ring sit on. The accent is not one of
 * them: labels on it use the accentLabel role (OI-33 amends 10.3 to match).
 */
export const TEXT_BACKGROUNDS: readonly ColorRole[] = [
  "paper",
  "list",
  "chrome",
  "key",
  "keyOperator",
];

/** 10.3's foreground table: each role's minimum (and maximum) contrast on its backgrounds. */
export const ROLE_TARGETS: readonly RoleTarget[] = [
  { fg: "text", on: TEXT_BACKGROUNDS, min: 7 },
  { fg: "textSecondary", on: TEXT_BACKGROUNDS, min: 7 },
  { fg: "error", on: ["list"], min: 7 },
  { fg: "warning", on: ["list", "chrome"], min: 3 }, // R-2: a non-text marker (WCAG 1.4.11)
  { fg: "tooltipLabel", on: ["tooltip"], min: 7 },
  { fg: "axis", on: ["paper"], min: 7 },
  { fg: "gridMajor", on: ["paper"], min: 3 },
  { fg: "gridMinor", on: ["paper"], min: 1.4, max: 1.6 },
  { fg: "focusRing", on: TEXT_BACKGROUNDS, min: 3 },
  { fg: "focusBarLabel", on: ["focusBar"], min: 7 },
  { fg: "accentLabel", on: ["accent"], min: 7 },
  { fg: "boundary", on: ["list", "chrome", "key"], min: 3 },
];
