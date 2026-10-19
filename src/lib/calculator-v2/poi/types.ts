// Points of interest (01-interfaces.md section 1 of the parity plan). Pure TypeScript: no DOM.

/** Kinds in the order a merged point lists them (POI-7). */
export const POI_KINDS = [
  "zero",
  "x-intercept",
  "y-intercept",
  "maximum",
  "minimum",
  "top",
  "bottom",
  "intersection",
] as const;
export type PoiKind = (typeof POI_KINDS)[number];

export interface PoiPoint {
  x: number;
  y: number;
  kinds: PoiKind[];
  /** The other curve's row of an intersection, else null. */
  withRowId: string | null;
}

/** One curve a row draws, as the closures plotInputFor compiles. */
export type PoiCurve =
  | { kind: "explicit"; independent: "x" | "y"; f: (t: number) => number }
  | { kind: "implicit"; F: (x: number, y: number) => number }
  | { kind: "lines"; orientation: "vertical" | "horizontal"; f: (t: number) => number };
