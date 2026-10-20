// A list of curves as one row's geometry (G-22): each branch is plotted on its own and the
// results are joined, so the worker protocol, the renderer and hit testing see one geometry of the
// row's kind, drawn in the row's one colour as Desmos draws every element. Pure TypeScript.

import type { CurveGeometry, LineSetGeometry, RegionGeometry } from "./geometry";

/** Joins typed arrays in order. */
function joined<T extends Float64Array | Float32Array>(
  parts: readonly T[],
  make: (n: number) => T
): T {
  const out = make(parts.reduce((n, p) => n + p.length, 0));
  let at = 0;
  for (const part of parts) {
    out.set(part, at);
    at += part.length;
  }
  return out;
}

const sum = (parts: readonly { evaluations: number }[]) =>
  parts.reduce((n, p) => n + p.evaluations, 0);

/**
 * Curves joined: each branch's polylines, a NaN pair ending a run that does not already end in
 * one, then every band; evaluations summed. `parts` holds at least one curve.
 */
export function mergeCurves(parts: readonly CurveGeometry[]): CurveGeometry {
  if (parts.length === 1) return parts[0];
  const runs: Float64Array[] = [];
  for (const { polylines: p } of parts) {
    if (p.length === 0) continue;
    runs.push(p);
    if (!(Number.isNaN(p[p.length - 2]) && Number.isNaN(p[p.length - 1]))) {
      runs.push(Float64Array.of(NaN, NaN));
    }
  }
  return {
    ...parts[0],
    polylines: joined(runs, (n) => new Float64Array(n)),
    bands: joined(
      parts.map((p) => p.bands),
      (n) => new Float64Array(n)
    ),
    evaluations: sum(parts),
  };
}

/** Line sets joined: every branch's positions in order; evaluations summed. */
export function mergeLines(parts: readonly LineSetGeometry[]): LineSetGeometry {
  if (parts.length === 1) return parts[0];
  return {
    ...parts[0],
    positions: joined(
      parts.map((p) => p.positions),
      (n) => new Float64Array(n)
    ),
    evaluations: sum(parts),
  };
}

/**
 * Regions joined: every branch's spans, with where each branch's elements start, then every
 * branch's boundaries; evaluations summed. The renderer shades each element on its own, so where
 * a list's elements overlap the shading is darker, as on the reference.
 */
export function mergeRegions(parts: readonly RegionGeometry[]): RegionGeometry {
  if (parts.length === 1) return parts[0];
  const elements: number[] = [];
  let at = 0;
  for (const p of parts) {
    for (const start of p.elements ?? [0]) elements.push(at + start);
    at += p.spans.length;
  }
  return {
    ...parts[0],
    spans: joined(
      parts.map((p) => p.spans),
      (n) => new Float32Array(n)
    ),
    elements,
    boundaries: parts.flatMap((p) => p.boundaries),
    evaluations: sum(parts),
  };
}
