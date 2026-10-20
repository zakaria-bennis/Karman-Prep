// The graph renderer's and graph panel's constants. Values with no named source are
// package decisions. Pixel quantities are CSS px. GP-n: the reference graph-paper measurements
// (rea-targets visual graph-paper.md, VIS-GRAPH-PAPER-n).

/** Line widths. */
export const CURVE_LINE_PX = 2.5; // GP-20
export const CURVE_SELECTED_LINE_PX = 3.5; // GP-33: the selected row's curve
/** GP-20: sampled curves run this far past the canvas edge, beyond their line width. */
export const CURVE_CUT_PX = 3;
export const GRID_LINE_PX = 1; // GP-2
export const AXIS_LINE_PX = 1.5; // GP-7
/** GP-7: axes are stroked this far before the origin's px, so they anti-alias as the reference's. */
export const AXIS_OFFSET_PX = 0.25;

/** Marks (GP-22, GP-23): dashes 11 on 7 off; dots stroked at twice the width every 8.1 px. */
export const DASH_PX = [11, 7] as const; // GP-22
export const DOT_PERIOD_PX = 8.1; // GP-23
export const DOT_LENGTH_PX = 0.1; // GP-23: round caps make each 0.1 px dash a dot
/** GP-28 to GP-30: filled disc r 4; open ring r 2 to 4; cross arms ±2.83 px, 2.8 px thick. */
export const POINT_RADIUS_PX = 4;
export const POINT_HOLE_PX = 2;
export const CROSS_ARM_PX = 2.83;
export const CROSS_STROKE_PX = 2.8;
/** GP-34, GP-35, GP-36: a POI dot, the clicked POI's dot, and the trace dot. */
export const POI_RADIUS_PX = 4;
export const POI_OPEN_RADIUS_PX = 5;
export const TRACE_RADIUS_PX = 4;
/** GP-34: the grey of a closed dot, this share of the text colour over the paper (#b3b3b3). */
export const POI_DOT_TEXT_SHARE = 0.3;

/** GP-10: axis numbers in 14 px Arial over a 3 px wide paper halo (1.5 px outside the glyph). */
export const AXIS_FONT_PX = 14;
export const AXIS_FONT = `${AXIS_FONT_PX}px Arial, sans-serif`;
export const LABEL_HALO_PX = 1.5;
/** GP-16: a scientific number's exponent sits this much above "m×10", starting this far before its end. */
export const SCI_EXPONENT_RAISE_PX = 6.3;
export const SCI_EXPONENT_OVERLAP_PX = 0.8;
/** GP-9: axis titles; a single letter is set as a math variable. */
export const TITLE_FONT = "17px Arial, sans-serif";
export const TITLE_LETTER_FONT = 'italic 20px "Times New Roman", Times, serif';

/** GP-8: arrow tip inset, length and half-width; the axis line starts this far in. */
export const ARROW_INSET_PX = 1.5;
export const ARROW_LENGTH_PX = 11.6;
export const ARROW_HALF_WIDTH_PX = 3.1;
export const ARROW_AXIS_START_PX = 3;
/** GP-5: with the grid hidden, ticks this long cross the axes at each major. */
export const TICK_LENGTH_PX = 5.5;
export const POLAR_SPOKE_DEG = 15;

/** GP-48: each wheel event zooms by this fixed step about the pointer, whatever its size. */
export const WHEEL_ZOOM_FACTOR = 17 / 16;

/** Tolerances and timing. */
export const CUSTOM_STEP_MIN_PX = 8;
export const JOIN_TOLERANCE_PX = 0.5;
export const NAME_DEBOUNCE_MS = 250;
export const NAME_MAX_WAIT_MS = 400;
