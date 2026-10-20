// Plot output (G-1, G-7 to G-13, G-16, G-17) as transferable typed arrays (AR-45).

/** A real function of one variable: an explicit curve's f, or a line set's f. NaN is undefined. */
export type RealFn1 = (t: number) => number;
/** A real function of x and y: an implicit curve's F or one region term. NaN is undefined. */
export type RealFn2 = (x: number, y: number) => number;

interface GeometryBase {
  rowId: string;
  evaluations: number;
}
export interface CurveGeometry extends GeometryBase {
  kind: "curve";
  polylines: Float64Array; // world [x0,y0,x1,y1,…]; a NaN,NaN pair ends a run
  bands: Float64Array; // world [x0,x1,yMin,yMax,…] filled G-12 bands
  dashed: boolean;
}
export interface LineSetGeometry extends GeometryBase {
  kind: "lines";
  orientation: "vertical" | "horizontal";
  positions: Float64Array;
  dashed: boolean;
}
/** D-11: a table's plotted columns, each world [x, y, …] pairs in row order. */
export interface TableGeometry {
  kind: "table";
  rowId: string;
  evaluations: number;
  series: { column: number; coords: Float64Array }[];
  regression?: CurveGeometry; // RT-16, RT-28: the table regression's curve over the view
}
export interface PointGeometry extends GeometryBase {
  kind: "points";
  coords: Float64Array; // world [x0,y0,…]
}
export interface RegionGeometry extends GeometryBase {
  kind: "region";
  spans: Float32Array; // CSS px [yTop,yBottom,x0,x1,…] in the ViewSpec's pixel frame
  boundaries: (CurveGeometry | LineSetGeometry)[];
}
export type Geometry =
  | CurveGeometry
  | LineSetGeometry
  | PointGeometry
  | RegionGeometry
  | TableGeometry;

/** Every typed array a geometry holds, in transfer order. */
function arraysOf(g: Geometry): ArrayBufferView[] {
  switch (g.kind) {
    case "curve":
      return [g.polylines, g.bands];
    case "lines":
      return [g.positions];
    case "points":
      return [g.coords];
    case "region":
      return [g.spans, ...g.boundaries.flatMap(arraysOf)];
    case "table":
      return [
        ...g.series.map((s) => s.coords),
        ...(g.regression ? [g.regression.polylines, g.regression.bands] : []),
      ];
  }
}

/**
 * The buffers to transfer with `g`: polylines then bands, positions, coords, or spans then each
 * boundary's, each buffer once. No SharedArrayBuffer is ever created (AR-45).
 */
export function geometryTransferables(g: Geometry): ArrayBuffer[] {
  const buffers: ArrayBuffer[] = [];
  for (const view of arraysOf(g)) {
    const buffer = view.buffer as ArrayBuffer;
    if (!buffers.includes(buffer)) buffers.push(buffer);
  }
  return buffers;
}
