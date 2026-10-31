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
  margin: 16,
  /** Radius of a plotted point's dot. */
  pointRadius: 3,
  /** Estimated text advance per character, as a fraction of the font size. */
  charWidthEm: 0.6,
  /** Snapping tolerance as a fraction of the figure's larger side. */
  snapTolerance: 0.02,
} as const;
