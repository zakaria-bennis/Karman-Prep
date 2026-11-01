// ============================================================
// The figure types and default boxes, with no Zod and no builders, so quiz
// routes can pick a figure path and size its placeholder before the figure
// engine loads (page bundle budget, AR-33). Validation (parseFigureSpec) and
// drawing stay in the lazily loaded engine.
// ============================================================

import type { Box } from "./plane";

export const FIGURE_TYPES = [
  "table",
  "bar",
  "line",
  "scatter",
  "dot_plot",
  "histogram",
  "box_plot",
  "plane",
  "geometry2d",
  "solid3d",
] as const;

export type FigureType = (typeof FIGURE_TYPES)[number];

export type ChartKind = "bar" | "line" | "scatter" | "dot_plot" | "histogram" | "box_plot";

export const CHART_TYPES: readonly ChartKind[] = [
  "bar",
  "line",
  "scatter",
  "dot_plot",
  "histogram",
  "box_plot",
];

/**
 * The `type` a stored, unvalidated figure_spec names, when it is one of FIGURE_TYPES; else
 * null. A shape check only: a spec with a known type may still be invalid (parseFigureSpec).
 */
export function storedSpecType(input: unknown): FigureType | null {
  if (input === null || typeof input !== "object") return null;
  const type = (input as { type?: unknown }).type;
  return typeof type === "string" && (FIGURE_TYPES as readonly string[]).includes(type)
    ? (type as FigureType)
    : null;
}

/**
 * The box a figure of `type` is laid out in before it scales to its container (SVG viewBox).
 * Planes use the box their function samples were computed in
 * (scripts/figures/sample-functions.ts), charts the ChartFigure box, and shapes a 4:3 box.
 */
export function defaultBoxForType(type: string): Box {
  if (type === "plane") return { width: 640, height: 480 };
  if ((CHART_TYPES as readonly string[]).includes(type)) return { width: 600, height: 400 };
  return { width: 400, height: 300 };
}

/**
 * The box every figure choice is laid out in. Small on purpose: the house font
 * (15 units) must render at 12px or more, so a choice's figure may shrink to
 * 0.8 of this width and no further. The choice grid (FigureChoices) only puts
 * two choices side by side when each figure gets at least that width.
 */
export const CHOICE_BOX: Box = { width: 240, height: 180 };
