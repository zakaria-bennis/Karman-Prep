// Points of interest (POI-TRACE-4, POI-TRACE-5). Pure TypeScript: no DOM.

/** Kinds in the order a merged point lists them. */
export const POI_KINDS = ["zero", "intercept", "extremum", "intersection"] as const;
export type PoiKind = (typeof POI_KINDS)[number];

export interface PoiPoint {
  x: number;
  y: number;
  kinds: PoiKind[]; // coincident records of different kinds share one dot and one label
  /** The other curve's row of an intersection, else null. */
  withRowId: string | null;
}

/**
 * One explicit branch a row draws (POI-TRACE-5): y = f(x) when `independent` is "x", x = f(y)
 * when it is "y". Only these get points of interest and can be traced.
 */
export interface PoiBranch {
  independent: "x" | "y";
  f: (t: number) => number;
}
