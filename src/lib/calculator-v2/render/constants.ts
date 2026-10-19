// The graph renderer's and graph panel's constants (08 Constants). Values with no named source are
// package decisions. Pixel quantities are CSS px.

/** Line widths. */
export const CURVE_LINE_PX = 2.5;
export const CURVE_SELECTED_LINE_PX = 4; // POI-17: the selected row's curve
export const GRID_LINE_PX = 1; // G-25
export const AXIS_LINE_PX = 1.5; // G-25

/** Marks (G-25, appendix F): strict boundaries dash 12 on 6 off; points are 10 px discs. */
export const DASH_PX = [12, 6] as const; // G-25
export const DOT_PX = [0.1, 6] as const; // D-12: round caps make each dash a dot
export const POINT_RADIUS_PX = 5; // G-25: 10 px discs
export const POINT_STROKE_PX = 2; // D-12: open circles and crosses
/** POI-1, POI-13: a point-of-interest dot, and the larger dot of one whose label is open. */
export const POI_RADIUS_PX = 4;
export const POI_OPEN_RADIUS_PX = 5.5;
/** POI-1: the grey of a closed dot, this share of the text colour over the paper. */
export const POI_DOT_TEXT_SHARE = 0.45;

/** Labels: system Arial (TH-17) and the TH-9 halo technique. */
export const AXIS_FONT = "13px Arial, sans-serif";
export const LABEL_GAP_PX = 4;
export const LABEL_HALO_PX = 3;

/** Grid decorations. v1 drew 12 spokes every 30°, which stay the major spokes. */
export const ARROW_LENGTH_PX = 8;
export const ARROW_HALF_WIDTH_PX = 4;
export const POLAR_SPOKE_DEG = 15;

/**
 * Wheel: the rate and the clamp of the raw deltaY are v1's (karman-calculator/lib/ui.js:102).
 * WHEEL_LINE_PX and the deltaMode conversion (lines × 16 px, pages × the graph height) are package
 * decisions; v1 has neither.
 */
export const WHEEL_ZOOM_RATE = 0.002;
export const WHEEL_DELTA_LIMIT = 100;
export const WHEEL_LINE_PX = 16;

/** Tolerances and timing. */
export const CUSTOM_STEP_MIN_PX = 8;
export const JOIN_TOLERANCE_PX = 0.5;
export const NAME_DEBOUNCE_MS = 250;
export const NAME_MAX_WAIT_MS = 400;
