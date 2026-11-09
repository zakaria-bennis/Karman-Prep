/**
 * The strongest mark each background world may draw, as an alpha of the text
 * colour over the canvas. scripts/contrast.mjs reads these to check body text
 * over each world's brightest (dark mode) and darkest (light mode) spot.
 */
export const BG_MAX_ALPHA = {
  sky: 0.14,
  ruled: 0.14,
  contour: 0.14,
  grain: 0.05,
} as const;

export const BG_LABELS = {
  sky: "Night sky",
  ruled: "Ruled field",
  contour: "Contour lines",
  grain: "Quiet grain",
} as const;

export const BG_RECOMMENDED = "contour";
