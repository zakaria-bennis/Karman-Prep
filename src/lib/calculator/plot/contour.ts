// Marching squares over a sampled field's 1 px leaves (G-16): inside is v ≤ 0, each crossing lies on
// its lattice edge by linear interpolation, an edge whose sign change is a jump (it does not shrink
// when bisected) has none, and segments that share a lattice edge chain into runs.
// Unresolved squares whose boundary mixes signs or finiteness become bands (G-15). Pure
// TypeScript, no DOM (AR-44).

import { nodeToWorld, type SampledField } from "./field";
import { pxToWorld, type ViewSpec } from "./viewport";

/** World coords: polylines [x, y, …] with NaN, NaN between runs; bands [x0, x1, yMin, yMax, …]. */
export type ContourResult = { polylines: number[]; bands: number[] };
/**
 * Keeps a segment by its midpoint in fractional lattice coordinates (a region keeps the parts of a
 * relation's boundary where its other relations hold).
 */
export type SegmentFilter = (i: number, j: number) => boolean;

/** Halvings a crossing edge gets to show its change shrinking, as a continuous zero's does. */
export const CONTINUITY_HALVINGS = 24;
/** A crossing is continuous once a halved bracket's change is below this share of the edge's. */
export const CONTINUITY_SHARE = 0.1;

/** After this many halvings, a bracket still holding JUMP_SHARE of the edge's change is a jump. */
export const JUMP_HALVINGS = 6;
export const JUMP_SHARE = 0.5;
/** An edge whose ends share a side is searched for a hidden pole when they differ this many times. */
export const HIDDEN_RATIO = 8;
/** A halved change below this share of the last one is shrinking: the function is smooth there. */
const SHRINK = 0.6;

/** The marching-squares side of a value: inside is v ≤ 0, so a zero plateau meets v > 0 (Desmos). */
const inside = (v: number) => v <= 0;

/**
 * The zero set of relation `k` of `field`. Runs: open chains first, each from a lattice edge used
 * by one segment, in first-appearance order; then closed loops, which repeat their first vertex.
 * A lattice edge whose sign change does not shrink when bisected is a jump (floor, an asymptote)
 * and draws nothing; an edge with an exact zero at an end crosses there unchecked.
 */
export function contourField(
  field: SampledField,
  k: number,
  view: ViewSpec,
  keep?: SegmentFilter
): ContourResult {
  const stride = field.cellsX * field.cell + 1;
  // A lattice edge's key: 2·(node key) for the edge right of the node, plus 1 for the edge below it.
  const horizontal = (i: number, j: number) => 2 * (j * stride + i);
  const vertical = (i: number, j: number) => 2 * (j * stride + i) + 1;
  const points = new Map<number, [number, number] | null>(); // null: no crossing drawn
  const jumps = new Set<number>(); // edges whose sign change is a jump
  const nodeBase = 2 * stride * (field.cellsY * field.cell + 1); // keys of crossings on nodes
  const alias = new Map<number, number>(); // edge key → node key for a crossing on a node
  /** Relation k at fraction s along the edge from node (i, j), rightward or downward. */
  const at = (i: number, j: number, across: boolean, s: number) =>
    across ? field.probe(i + s, j, k) : field.probe(i, j + s, k);
  /** True when the sign change of [s0, s1] (values a, b) shrinks under bisection. */
  const continuous = (
    i: number,
    j: number,
    across: boolean,
    [s0, s1, a, b]: [number, number, number, number]
  ) => {
    const d0 = Math.abs(a - b);
    // A smooth crossing is near zero at its interpolated point: one probe settles it. A step's
    // value there is one of its ends' and a pole's is large, so those go on to bisection.
    const vt = at(i, j, across, s0 + (a / (a - b)) * (s1 - s0));
    if (vt === undefined) return true;
    if (Math.abs(vt) < CONTINUITY_SHARE * Math.min(Math.abs(a), Math.abs(b))) return true;
    let [lo, hi, vLo, vHi] = [s0, s1, a, b];
    for (let n = 0; n < CONTINUITY_HALVINGS; n++) {
      const m = 0.5 * (lo + hi);
      const vm = at(i, j, across, m);
      if (vm === undefined) return true; // refused: drawn as before the check
      if (Number.isNaN(vm)) return false; // undefined inside (1/x at x = 0): no path joins the ends
      if (inside(vm) === inside(vLo)) [lo, vLo] = [m, vm];
      else [hi, vHi] = [m, vm];
      const d = Math.abs(vHi - vLo);
      if (d < CONTINUITY_SHARE * d0) return true;
      if (n + 1 >= JUMP_HALVINGS && d >= JUMP_SHARE * d0) return false; // a pole or a clean step
    }
    return false;
  };
  /**
   * An edge whose ends share a side but differ more than HIDDEN_RATIO times may hide a pole with a
   * zero beside it (tan x = y² beside its asymptote): it is halved toward the larger change while
   * that change does not shrink, and once a midpoint flips side, of the two brackets the
   * continuous one, when only one is, holds the crossing. Null for none.
   */
  const hidden = (
    i: number,
    j: number,
    across: boolean,
    a: number,
    b: number
  ): [number, number, number, number] | null => {
    if (!(Math.max(Math.abs(a), Math.abs(b)) > HIDDEN_RATIO * Math.min(Math.abs(a), Math.abs(b)))) {
      return null;
    }
    let [lo, hi, vLo, vHi] = [0, 1, a, b];
    let previous = Math.abs(a - b);
    for (let n = 0; n < CONTINUITY_HALVINGS; n++) {
      const m = 0.5 * (lo + hi);
      const vm = at(i, j, across, m);
      if (vm === undefined || Number.isNaN(vm)) return null;
      if (inside(vm) !== inside(a)) {
        const left: [number, number, number, number] = [lo, m, vLo, vm];
        const right: [number, number, number, number] = [m, hi, vm, vHi];
        const [l, r] = [continuous(i, j, across, left), continuous(i, j, across, right)];
        return l === r ? null : l ? left : right;
      }
      const leftWider = Math.abs(vm - vLo) >= Math.abs(vHi - vm);
      if (leftWider) [hi, vHi] = [m, vm];
      else [lo, vLo] = [m, vm];
      const d = Math.abs(vHi - vLo);
      if (d < SHRINK * previous) return null; // smooth: no pole here
      previous = d;
    }
    return null;
  };
  /**
   * The crossing key of the edge `key` from node (i, j) with end values a, b: the key when a
   * crossing is drawn there, -2 for a jump, -1 for none. Both leaves that share an edge pass the
   * same nodes in the same order, so they compute the same point.
   */
  const crossing = (key: number, i: number, j: number, a: number, b: number) => {
    if (!points.has(key)) {
      const across = key % 2 === 0;
      let bracket: [number, number, number, number] | null = [0, 1, a, b];
      if (inside(a) === inside(b)) {
        bracket = hidden(i, j, across, a, b);
      } else if (a !== 0 && b !== 0 && !continuous(i, j, across, bracket)) {
        jumps.add(key);
        bracket = null;
      }
      if (bracket === null) {
        points.set(key, null);
      } else {
        const [s0, s1, va, vb] = bracket;
        const t = s0 + (va / (va - vb)) * (s1 - s0);
        const [px, py] = across ? [i + 0.5 + t, j + 0.5] : [i + 0.5, j + 0.5 + t];
        points.set(key, pxToWorld(view, px, py));
        if (t === 0 || t === 1) {
          // A crossing on a node (an exact zero) is one point for every edge meeting there.
          const [ni, nj] = t === 0 ? [i, j] : across ? [i + 1, j] : [i, j + 1];
          const node = nodeBase + nj * stride + ni;
          alias.set(key, node);
          points.set(node, points.get(key)!);
        }
      }
    }
    if (points.get(key) === null) return jumps.has(key) ? -2 : -1;
    return alias.get(key) ?? key;
  };
  const ends: number[] = []; // segment s joins keys ends[2s] and ends[2s + 1]
  /** Adds segment (p, q) of the leaf at (i, j) unless the filter drops it. */
  const add = (p: number, q: number, i: number, j: number) => {
    if (p === q) return; // two edges crossing on their shared node
    if (keep !== undefined) {
      const [a, b] = [points.get(p)!, points.get(q)!];
      const [mx, my] = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
      const [i0, j0] = nodeToWorld(view, i, j);
      const [i1, j1] = nodeToWorld(view, i + 1, j + 1);
      if (!keep(i + (mx - i0) / (i1 - i0), j + (my - j0) / (j1 - j0))) return;
    }
    ends.push(p, q);
  };
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
    const [inTL, inTR, inBR, inBL] = [inside(tl), inside(tr), inside(br), inside(bl)];
    const top = crossing(horizontal(i, j), i, j, tl, tr);
    const right = crossing(vertical(i + 1, j), i + 1, j, tr, br);
    const bottom = crossing(horizontal(i, j + 1), i, j + 1, bl, br);
    const left = crossing(vertical(i, j), i, j, tl, bl);
    const keys = [top, right, bottom, left].filter((key) => key >= 0);
    const plain = inTL !== inTR && inTR !== inBR && inBL !== inBR && inTL !== inBL;
    if (keys.length === 2) {
      add(keys[0], keys[1], i, j); // a jump or a hidden pole never joins in
    } else if (keys.length === 4 && plain) {
      // A saddle: the inside corners join through the centre when the corner mean is inside, so
      // the segments cut off the outside corners; otherwise they cut off the inside corners.
      const joinInside = inside((tl + tr + br + bl) / 4);
      const cutTopLeft = joinInside ? !inTL : inTL;
      if (cutTopLeft) {
        add(left, top, i, j);
        add(right, bottom, i, j);
      } else {
        add(top, right, i, j);
        add(bottom, left, i, j);
      }
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
