/**
 * House style: the one set of sizes every figure uses, in SVG user units.
 * Specs never carry sizes; builders and FigureView read them from here.
 */
export const HOUSE = {
  line: 1.5,
  grid: 1,
  dashed: 1.25,
  dashPattern: "4 3",
  font: 15,
  minFontOnScreen: 12,
  labelOffset: 6,
  arrowLength: 8,
  arrowWidth: 6,
  tickLength: 6,
  /** Side of the square that marks a right angle. */
  rightAngleSide: 10,
  /** Radius of the innermost equal-angle arc. */
  angleArcRadius: 14,
  /** Spacing between repeated ticks, arcs or parallel chevrons in one mark. */
  markGap: 4,
  margin: 16,
  /** Radius of a plotted point's dot. */
  pointRadius: 3,
  /** Radius of a dot in a dot plot, and the clear space between stacked dots. */
  dotPlotRadius: 5,
  dotPlotGap: 2,
  /** Estimated text advance per character, as a fraction of the font size. */
  charWidthEm: 0.6,
  /** Snapping tolerance as a fraction of the figure's larger side. */
  snapTolerance: 0.02,
  /** Oblique view of a 3D solid (the SAT's): depth recedes at this angle, in degrees... */
  obliqueAngle: 30,
  /** ...drawn at this fraction of its true length. */
  obliqueDepth: 0.5,
  /** Points sampled around every circle of a curved solid. */
  circleSamples: 64,
} as const;
