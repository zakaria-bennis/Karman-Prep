// Points of interest of one curve (POI-2, POI-4, POI-7, POI-9, POI-10): intercepts and extrema by
// curve kind, intersections with the other visible curves, coincident points merged, a kind with
// more than POI_CAP points dropped, and only points inside the view returned. Pure TypeScript.

import type { Deadline } from "../core/deadline";
import type { Viewport, ViewSpec } from "../plot/viewport";
import { implicitCrossings, implicitPolylines, implicitTopsAndBottoms, type Fn2 } from "./implicit";
import { findExtrema, findRoots, type Search1D } from "./roots";
import { POI_KINDS, type PoiCurve, type PoiKind, type PoiPoint } from "./types";

export const POI_CAP = 100; // POI-10, per kind
const SEARCH_MARGIN = 0.1; // POI-9: 10% of the view on each side
const SAMPLES_PER_PX = 2;
const MERGE = 1e-9; // POI-7
/** Extrema are accurate to 1e-7 (POI-11), so a point merging with one uses that tolerance. */
const MERGE_EXTREMUM = 1e-7;
const EXTREMUM_KINDS: ReadonlySet<PoiKind> = new Set(["maximum", "minimum", "top", "bottom"]);

const isNum = Number.isFinite;

interface Raw {
  x: number;
  y: number;
  kind: PoiKind;
  withRowId: string | null;
}

/** POI-9: the view widened by 10% on each side. */
export function searchRange(view: ViewSpec): Viewport {
  const { left, right, bottom, top } = view.viewport,
    mx = (right - left) * SEARCH_MARGIN,
    my = (top - bottom) * SEARCH_MARGIN;
  return { left: left - mx, right: right + mx, bottom: bottom - my, top: top + my };
}

/** The curve as H(x, y) = 0, the form another curve's intersections solve against. */
function implicitForm(c: PoiCurve): Fn2 {
  switch (c.kind) {
    case "explicit":
      return c.independent === "x" ? (x, y) => y - c.f(x) : (x, y) => x - c.f(y);
    case "implicit":
      return c.F;
    case "lines":
      return c.orientation === "vertical" ? (x) => c.f(x) : (_x, y) => c.f(y);
  }
}

/**
 * The points of interest of `curve` against `others` (every other visible curve) in `view`,
 * sorted by x then y. `deadline` is checked between stages.
 */
export function findPois(
  curve: PoiCurve,
  others: readonly { rowId: string; curve: PoiCurve }[],
  view: ViewSpec,
  deadline: Deadline
): PoiPoint[] {
  const box = searchRange(view),
    unit = {
      x: (view.viewport.right - view.viewport.left) / view.size.width,
      y: (view.viewport.top - view.viewport.bottom) / view.size.height,
    };
  const xs: Search1D = {
      lo: box.left,
      hi: box.right,
      samples: Math.ceil(view.size.width * (1 + 2 * SEARCH_MARGIN) * SAMPLES_PER_PX),
    },
    ys: Search1D = {
      lo: box.bottom,
      hi: box.top,
      samples: Math.ceil(view.size.height * (1 + 2 * SEARCH_MARGIN) * SAMPLES_PER_PX),
    };
  const raw: Raw[] = [];
  const add = (x: number, y: number, kind: PoiKind, withRowId: string | null = null) => {
    if (isNum(x) && isNum(y)) raw.push({ x, y, kind, withRowId });
  };
  deadline.check();
  switch (curve.kind) {
    case "explicit": {
      const { f } = curve,
        alongX = curve.independent === "x",
        s = alongX ? xs : ys;
      const pt = (t: number, v: number): [number, number] => (alongX ? [t, v] : [v, t]);
      for (const t of findRoots(f, s)) add(...pt(t, 0), "zero");
      const at0 = f(0);
      if (0 >= s.lo && 0 <= s.hi) add(...pt(0, at0), alongX ? "y-intercept" : "x-intercept");
      for (const e of findExtrema(f, s)) add(...pt(e.t, f(e.t)), e.kind);
      for (const o of others) {
        const H = implicitForm(o.curve);
        for (const t of findRoots((u) => (alongX ? H(u, f(u)) : H(f(u), u)), s)) {
          add(...pt(t, f(t)), "intersection", o.rowId);
        }
      }
      break;
    }
    case "lines": {
      const vertical = curve.orientation === "vertical";
      for (const c of findRoots(curve.f, vertical ? xs : ys)) {
        if (vertical) add(c, 0, "x-intercept");
        else add(0, c, "y-intercept");
        for (const o of others) {
          const H = implicitForm(o.curve);
          for (const t of findRoots((u) => (vertical ? H(c, u) : H(u, c)), vertical ? ys : xs)) {
            if (vertical) add(c, t, "intersection", o.rowId);
            else add(t, c, "intersection", o.rowId);
          }
        }
      }
      break;
    }
    case "implicit": {
      const { F } = curve;
      if (0 >= box.bottom && 0 <= box.top)
        for (const x of findRoots((u) => F(u, 0), xs)) add(x, 0, "x-intercept");
      if (0 >= box.left && 0 <= box.right)
        for (const y of findRoots((u) => F(0, u), ys)) add(0, y, "y-intercept");
      deadline.check();
      const runs = implicitPolylines(F, box, view, deadline);
      for (const p of implicitTopsAndBottoms(F, runs, unit)) add(p.x, p.y, p.kind);
      deadline.check();
      for (const o of others) {
        const oc = o.curve;
        if (oc.kind === "explicit") {
          const { f } = oc,
            alongX = oc.independent === "x";
          for (const t of findRoots((u) => (alongX ? F(u, f(u)) : F(f(u), u)), alongX ? xs : ys)) {
            if (alongX) add(t, f(t), "intersection", o.rowId);
            else add(f(t), t, "intersection", o.rowId);
          }
        } else if (oc.kind === "lines") {
          const vertical = oc.orientation === "vertical";
          for (const c of findRoots(oc.f, vertical ? xs : ys)) {
            for (const t of findRoots((u) => (vertical ? F(c, u) : F(u, c)), vertical ? ys : xs)) {
              if (vertical) add(c, t, "intersection", o.rowId);
              else add(t, c, "intersection", o.rowId);
            }
          }
        } else {
          for (const [x, y] of implicitCrossings(F, oc.F, runs, unit))
            add(x, y, "intersection", o.rowId);
        }
      }
      break;
    }
  }
  return finish(raw, view);
}

/** POI-10 cap per kind in the search region, POI-7 merge, then the points inside the view. */
function finish(raw: Raw[], view: ViewSpec): PoiPoint[] {
  const counts = new Map<PoiKind, number>();
  for (const r of raw) counts.set(r.kind, (counts.get(r.kind) ?? 0) + 1);
  const merged: PoiPoint[] = [];
  for (const r of raw) {
    if ((counts.get(r.kind) ?? 0) > POI_CAP) continue;
    const same = merged.find((p) => {
      const tol =
        EXTREMUM_KINDS.has(r.kind) || p.kinds.some((k) => EXTREMUM_KINDS.has(k))
          ? MERGE_EXTREMUM
          : MERGE;
      return (
        Math.abs(p.x - r.x) <= tol * Math.max(1, Math.abs(r.x)) &&
        Math.abs(p.y - r.y) <= tol * Math.max(1, Math.abs(r.y))
      );
    });
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
      x: p.x === 0 ? 0 : p.x, // -0
      y: p.y === 0 ? 0 : p.y,
      kinds: [...p.kinds].sort((a, b) => POI_KINDS.indexOf(a) - POI_KINDS.indexOf(b)),
    }))
    .sort((a, b) => a.x - b.x || a.y - b.y);
}
