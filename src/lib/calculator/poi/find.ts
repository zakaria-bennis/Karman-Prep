// Points of interest of the selected row's branches (POI-TRACE-5 to POI-TRACE-11): zeros, the
// intercept and extrema of each branch over the view's range of its independent coordinate (no
// widening), all of them dropped when one branch has more than OWN_CAP; intersections with every
// other visible row's branches, all dropped when there are more than INTERSECTION_CAP; coincident
// points merged into one dot; only points inside the view returned. Pure TypeScript.

import type { Deadline } from "../core/deadline";
import type { ViewSpec } from "../plot/viewport";
import { findExtrema, findRoots, scanRange, type Search1D } from "./roots";
import { POI_KINDS, type PoiBranch, type PoiKind, type PoiPoint } from "./types";

/** POI-TRACE-9: a branch with more zeros, extrema and intercepts than this shows none of them. */
export const OWN_CAP = 250;
/** POI-TRACE-11: more intersections than this for the selected row and none are shown. */
export const INTERSECTION_CAP = 100;
const SAMPLES_PER_PX = 2;
/** Extrema are accurate to about 1e-7, so points merge within that relative distance. */
const MERGE = 1e-7;

const isNum = Number.isFinite;

interface Raw {
  x: number;
  y: number;
  kind: PoiKind;
  withRowId: string | null;
}
export interface OtherBranch {
  rowId: string;
  branch: PoiBranch;
}

/**
 * The view's range of `axis`, sampled SAMPLES_PER_PX times a px; a pair whose value changes by
 * more than one px of the other axis however far it is halved is a jump.
 */
export function searchAlong(view: ViewSpec, axis: "x" | "y"): Search1D {
  const { viewport: v, size } = view;
  return axis === "x"
    ? {
        lo: v.left,
        hi: v.right,
        samples: Math.ceil(size.width * SAMPLES_PER_PX),
        tol: (v.top - v.bottom) / size.height,
      }
    : {
        lo: v.bottom,
        hi: v.top,
        samples: Math.ceil(size.height * SAMPLES_PER_PX),
        tol: (v.right - v.left) / size.width,
      };
}

/** (t, f(t)) as a world point of `b`. */
const pointOf = (b: PoiBranch, t: number, v: number): [number, number] =>
  b.independent === "x" ? [t, v] : [v, t];

/**
 * POI-TRACE-7: a straight line's zero is −b/m when it lies in the searched range (none when the
 * line is flat, even along 0), with no extrema.
 */
function linearZeros(b: PoiBranch, s: Search1D): number[] {
  const c = b.f(0),
    m = b.f(1) - c;
  if (!isNum(c) || !isNum(m) || m === 0) return [];
  const t = -c / m;
  return t >= s.lo && t <= s.hi ? [t] : [];
}

/** POI-TRACE-6 to POI-TRACE-9: one branch's zeros, intercept and extrema, or none over the cap. */
function ownPoints(b: PoiBranch, view: ViewSpec): Raw[] {
  const s = searchAlong(view, b.independent),
    out: Raw[] = [];
  const add = (t: number, v: number, kind: PoiKind) => {
    if (isNum(t) && isNum(v)) out.push({ ...xy(pointOf(b, t, v)), kind, withRowId: null });
  };
  const sc = b.linear ? null : scanRange(b.f, s);
  for (const t of sc === null ? linearZeros(b, s) : findRoots(b.f, s, false, sc)) add(t, 0, "zero");
  if (0 >= s.lo && 0 <= s.hi) add(0, b.f(0), "intercept");
  if (sc !== null) for (const e of findExtrema(b.f, s, sc)) add(e.t, b.f(e.t), "extremum");
  return out.length > OWN_CAP ? [] : out;
}

const xy = ([x, y]: [number, number]) => ({ x, y });

/**
 * POI-TRACE-10: where `b` meets `o`. Branches along the same coordinate solve f − g = 0 (touching
 * meetings included); a y=f(x) against an x=g(y) solves x − g(f(x)) = 0, and the mirror.
 */
function meetings(b: PoiBranch, o: PoiBranch, view: ViewSpec): [number, number][] {
  const s = searchAlong(view, b.independent);
  const d =
    b.independent === o.independent
      ? (t: number) => b.f(t) - o.f(t)
      : (t: number) => t - o.f(b.f(t));
  return findRoots(d, s, true).flatMap((t) => {
    const v = b.f(t);
    return isNum(v) ? [pointOf(b, t, v)] : [];
  });
}

/**
 * The points of interest of the selected row's `branches` against `others` (every other visible
 * row's branches) in `view`, sorted by x then y. `deadline` is checked between branches.
 */
export function findPois(
  branches: readonly PoiBranch[],
  others: readonly OtherBranch[],
  view: ViewSpec,
  deadline: Deadline
): PoiPoint[] {
  const raw: Raw[] = [];
  for (const b of branches) {
    deadline.check();
    raw.push(...ownPoints(b, view));
  }
  const crossings: Raw[] = [];
  search: for (const b of branches) {
    for (const o of others) {
      deadline.check();
      for (const [x, y] of meetings(b, o.branch, view))
        crossings.push({ x, y, kind: "intersection", withRowId: o.rowId });
      if (crossings.length > INTERSECTION_CAP) break search;
    }
  }
  if (crossings.length <= INTERSECTION_CAP) raw.push(...crossings);
  return finish(raw, view);
}

const close = (a: number, b: number) => Math.abs(a - b) <= MERGE * Math.max(1, Math.abs(a));

/** POI-TRACE-4: coincident records merged into one dot; then the points inside the view. */
function finish(raw: readonly Raw[], view: ViewSpec): PoiPoint[] {
  const merged: PoiPoint[] = [];
  for (const r of raw) {
    const same = merged.find((p) => close(p.x, r.x) && close(p.y, r.y));
    if (same === undefined) {
      merged.push({ x: r.x, y: r.y, kinds: [r.kind], withRowId: r.withRowId });
      continue;
    }
    if (!same.kinds.includes(r.kind)) same.kinds.push(r.kind);
    same.withRowId ??= r.withRowId;
  }
  const { left, right, bottom, top } = view.viewport;
  return merged
    .filter((p) => p.x >= left && p.x <= right && p.y >= bottom && p.y <= top)
    .map((p) => ({
      ...p,
      x: p.x === 0 ? 0 : p.x, // −0
      y: p.y === 0 ? 0 : p.y,
      kinds: [...p.kinds].sort((a, b) => POI_KINDS.indexOf(a) - POI_KINDS.indexOf(b)),
    }))
    .sort((a, b) => a.x - b.x || a.y - b.y);
}
