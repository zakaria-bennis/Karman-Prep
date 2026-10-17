// Marching squares over a sampled field's 1 px leaves (G-16): inside is v < 0, each crossing lies on
// its lattice edge by linear interpolation, and segments that share a lattice edge chain into runs.
// Unresolved squares whose boundary mixes signs or finiteness become bands (G-15). Pure
// TypeScript, no DOM (AR-44).

import { nodeToWorld, type SampledField } from "./field";
import { pxToWorld, type ViewSpec } from "./viewport";

/** World coords: polylines [x, y, …] with NaN, NaN between runs; bands [x0, x1, yMin, yMax, …]. */
export type ContourResult = { polylines: number[]; bands: number[] };

/**
 * The zero set of relation `k` of `field`. Runs: open chains first, each from a lattice edge used
 * by one segment, in first-appearance order; then closed loops, which repeat their first vertex.
 */
export function contourField(field: SampledField, k: number, view: ViewSpec): ContourResult {
  const stride = field.cellsX * field.cell + 1;
  // A lattice edge's key: 2·(node key) for the edge right of the node, plus 1 for the edge below it.
  const horizontal = (i: number, j: number) => 2 * (j * stride + i);
  const vertical = (i: number, j: number) => 2 * (j * stride + i) + 1;
  const points = new Map<number, [number, number]>();
  // The crossing on the edge from node a to node b, interpolated from a toward b. Both leaves that
  // share an edge pass the same nodes in the same order, so they compute the same point.
  const crossing = (key: number, i: number, j: number, a: number, b: number) => {
    if (!points.has(key)) {
      const t = a / (a - b);
      const [px, py] = key % 2 === 0 ? [i + 0.5 + t, j + 0.5] : [i + 0.5, j + 0.5 + t];
      points.set(key, pxToWorld(view, px, py));
    }
    return key;
  };
  const ends: number[] = []; // segment s joins keys ends[2s] and ends[2s + 1]
  for (const { i, j } of field.leaves) {
    const tl = field.value(i, j, k);
    const tr = field.value(i + 1, j, k);
    const br = field.value(i + 1, j + 1, k);
    const bl = field.value(i, j + 1, k);
    if (
      !(Number.isFinite(tl) && Number.isFinite(tr) && Number.isFinite(br) && Number.isFinite(bl))
    ) {
      continue;
    }
    const [inTL, inTR, inBR, inBL] = [tl < 0, tr < 0, br < 0, bl < 0];
    const top = inTL !== inTR ? crossing(horizontal(i, j), i, j, tl, tr) : -1;
    const right = inTR !== inBR ? crossing(vertical(i + 1, j), i + 1, j, tr, br) : -1;
    const bottom = inBL !== inBR ? crossing(horizontal(i, j + 1), i, j + 1, bl, br) : -1;
    const left = inTL !== inBL ? crossing(vertical(i, j), i, j, tl, bl) : -1;
    const keys = [top, right, bottom, left].filter((key) => key >= 0);
    if (keys.length === 2) {
      ends.push(keys[0], keys[1]);
    } else if (keys.length === 4) {
      // A saddle: the inside corners join through the centre when the corner mean is below 0, so
      // the segments cut off the outside corners; otherwise they cut off the inside corners.
      const joinInside = (tl + tr + br + bl) / 4 < 0;
      const cutTopLeft = joinInside ? !inTL : inTL;
      if (cutTopLeft) ends.push(left, top, right, bottom);
      else ends.push(top, right, bottom, left);
    }
  }
  const polylines: number[] = [];
  for (const run of chain(ends)) {
    if (polylines.length > 0) polylines.push(NaN, NaN);
    for (const key of run) polylines.push(...points.get(key)!);
  }
  const bands: number[] = [];
  for (const s of field.unresolved) {
    if (!field.boundaryMixes(s, k)) continue;
    const [x0, yMax] = nodeToWorld(view, s.i, s.j);
    const [x1, yMin] = nodeToWorld(view, s.i + s.edge, s.j + s.edge);
    bands.push(x0, x1, yMin, yMax);
  }
  return { polylines, bands };
}

/** Chains segments (key pairs in `ends`) that share a key into runs of keys. */
function chain(ends: number[]): number[][] {
  const segments = ends.length / 2;
  const first = new Map<number, number>(); // key → first segment using it
  const second = new Map<number, number>(); // key → second segment using it
  const order: number[] = []; // keys in first-appearance order
  for (let n = 0; n < ends.length; n++) {
    const s = n >> 1;
    if (!first.has(ends[n])) {
      first.set(ends[n], s);
      order.push(ends[n]);
    } else {
      second.set(ends[n], s);
    }
  }
  const visited = new Uint8Array(segments);
  const walk = (start: number, segment: number): number[] => {
    const run = [start];
    let [key, s] = [start, segment];
    for (;;) {
      visited[s] = 1;
      key = ends[2 * s] === key ? ends[2 * s + 1] : ends[2 * s];
      run.push(key);
      const a = first.get(key)!;
      const b = second.get(key);
      const next = !visited[a] ? a : b !== undefined && !visited[b] ? b : -1;
      if (next < 0) return run;
      s = next;
    }
  };
  const runs: number[][] = [];
  for (const key of order) {
    const s = first.get(key)!;
    if (!second.has(key) && !visited[s]) runs.push(walk(key, s));
  }
  for (let s = 0; s < segments; s++) {
    if (!visited[s]) runs.push(walk(ends[2 * s], s));
  }
  return runs;
}
