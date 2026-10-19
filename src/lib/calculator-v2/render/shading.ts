// Inequality shading for the graph (G-5, G-17, TH-8). Region spans become opaque device-px
// rectangles, each painted the compositeShading colour of every region covering it, so overlaps
// are never alpha-stacked and stay within TH-8's cap. alignRegionSpans keeps a region's spans under
// the pointer through a pan while fresh geometry is pending. Pure: no DOM.

import type { RegionGeometry } from "../plot/geometry";
import { worldToPx, type PixelSize, type Viewport, type ViewSpec } from "../plot/viewport";
import { compositeShading } from "../theme/contrast";

// spans: CSS px [yTop, yBottom, x0, x1, …]
export type ShadingRegion = { spans: Float32Array; color: string; fillAlpha: number };
export type ShadingRect = { x: number; y: number; width: number; height: number; color: string }; // device px

/** One span clipped to the device grid: rows [r0, r1) and columns [c0, c1) of region `index`. */
type DeviceSpan = { r0: number; r1: number; c0: number; c1: number; index: number };
/** A maximal run [x0, x1) of one row whose covering region set is `key` (indices in row order). */
type Run = { x0: number; x1: number; key: string };

/** Device index of the first pixel whose centre is at or past CSS px `v`. */
const firstCentreAtOrPast = (v: number, dpr: number) => Math.ceil(v * dpr - 0.5);

/** Every span of every region, clipped to [0, w) × [0, h); empty and non-finite spans are dropped. */
function deviceSpans(regions: readonly ShadingRegion[], w: number, h: number, dpr: number) {
  const out: DeviceSpan[] = [];
  regions.forEach(({ spans }, index) => {
    for (let k = 0; k + 3 < spans.length; k += 4) {
      const r0 = Math.max(0, firstCentreAtOrPast(spans[k], dpr));
      const r1 = Math.min(h, firstCentreAtOrPast(spans[k + 1], dpr));
      const c0 = Math.max(0, firstCentreAtOrPast(spans[k + 2], dpr));
      const c1 = Math.min(w, firstCentreAtOrPast(spans[k + 3], dpr));
      if (r0 < r1 && c0 < c1) out.push({ r0, r1, c0, c1, index });
    }
  });
  return out.sort((p, q) => p.r0 - q.r0);
}

/** The runs of a row covered by `active`: a sweep over the column edges, one key per region set. */
function rowRuns(active: readonly DeviceSpan[], counts: number[]): Run[] {
  const edges: [x: number, delta: number, index: number][] = [];
  for (const s of active) edges.push([s.c0, 1, s.index], [s.c1, -1, s.index]);
  edges.sort((p, q) => p[0] - q[0]);
  const runs: Run[] = [];
  for (let e = 0; e < edges.length; ) {
    const x = edges[e][0];
    for (; e < edges.length && edges[e][0] === x; e++) counts[edges[e][2]] += edges[e][1];
    if (e === edges.length) break;
    const covering: number[] = [];
    counts.forEach((n, index) => {
      if (n > 0) covering.push(index);
    });
    if (covering.length === 0) continue;
    const key = covering.join(",");
    const last = runs[runs.length - 1];
    if (last && last.x1 === x && last.key === key) last.x1 = edges[e][0];
    else runs.push({ x0: x, x1: edges[e][0], key });
  }
  return runs;
}

const sameRuns = (p: readonly Run[], q: readonly Run[]) =>
  p.length === q.length &&
  p.every((r, i) => r.x0 === q[i].x0 && r.x1 === q[i].x1 && r.key === q[i].key);

/**
 * Opaque device-px rectangles for `regions` (row order) on a `size` canvas at `dpr`. A device pixel
 * is shaded when its centre lies inside a span, in compositeShading(paper, the fills of every
 * region covering it, in row order); rows with equal runs merge into one rect. Sorted by y, then x.
 */
export function buildShadingRects(
  regions: readonly ShadingRegion[],
  paper: string,
  size: PixelSize,
  dpr: number,
  cap?: number // TH-8: the skin's shadingCap
): ShadingRect[] {
  const w = Math.round(size.width * dpr);
  const h = Math.round(size.height * dpr);
  if (!(w > 0 && h > 0)) return [];
  const spans = deviceSpans(regions, w, h, dpr);
  const rows = [...new Set(spans.flatMap((s) => [s.r0, s.r1]))].sort((p, q) => p - q);
  const fill = (r: ShadingRegion) => ({ color: r.color, alpha: r.fillAlpha });
  const colours = new Map<string, string>(); // memoised per region set
  const colourOf = (key: string) => {
    let colour = colours.get(key);
    if (colour === undefined) {
      colour = compositeShading(
        paper,
        key.split(",").map((i) => fill(regions[Number(i)])),
        cap
      );
      colours.set(key, colour);
    }
    return colour;
  };
  const counts = regions.map(() => 0);
  const rects: ShadingRect[] = [];
  let active: DeviceSpan[] = [];
  let next = 0;
  let previous: Run[] = [];
  let open: ShadingRect[] = [];
  // Between consecutive row edges every device row has the same runs, so each band is swept once.
  for (let k = 0; k + 1 < rows.length; k++) {
    const y = rows[k];
    const height = rows[k + 1] - y;
    active = active.filter((s) => s.r1 > y);
    for (; next < spans.length && spans[next].r0 <= y; next++) active.push(spans[next]);
    const runs = rowRuns(active, counts);
    if (runs.length > 0 && sameRuns(runs, previous)) {
      for (const rect of open) rect.height += height;
    } else {
      open = runs.map((r) => ({ x: r.x0, y, width: r.x1 - r.x0, height, color: colourOf(r.key) }));
      rects.push(...open);
    }
    previous = runs;
  }
  return rects;
}

const REL_SAME_BOUND = 1e-12;
const REL_SAME_SCALE = 1e-9;

/** Each bound of `p` lies within 1e-12 × its axis span of `q`'s. */
function sameBounds(p: Viewport, q: Viewport): boolean {
  const tx = REL_SAME_BOUND * Math.abs(q.right - q.left);
  const ty = REL_SAME_BOUND * Math.abs(q.top - q.bottom);
  return (
    Math.abs(p.left - q.left) <= tx &&
    Math.abs(p.right - q.right) <= tx &&
    Math.abs(p.bottom - q.bottom) <= ty &&
    Math.abs(p.top - q.top) <= ty
  );
}

const nearlyEqual = (p: number, q: number) =>
  Math.abs(p - q) <= REL_SAME_SCALE * Math.max(Math.abs(p), Math.abs(q));

/** Same size and the same world units per CSS px on both axes, within 1e-9 relative. */
function sameScale(from: ViewSpec, to: ViewSpec): boolean {
  const { viewport: p, size } = from;
  const { viewport: q } = to;
  return (
    nearlyEqual((p.right - p.left) / size.width, (q.right - q.left) / size.width) &&
    nearlyEqual((p.top - p.bottom) / size.height, (q.top - q.bottom) / size.height)
  );
}

const sameSize = (p: PixelSize, q: PixelSize) => p.width === q.width && p.height === q.height;

/**
 * `g`'s spans, computed for `from`, in `to`'s pixel frame: `g` itself for the same view, a copy
 * shifted by the pan offset for the same size and scale, and otherwise a copy with no spans (the
 * boundaries, in world units, still draw) until geometry computed for `to` arrives.
 */
export function alignRegionSpans(g: RegionGeometry, from: ViewSpec, to: ViewSpec): RegionGeometry {
  if (sameSize(from.size, to.size) && sameBounds(to.viewport, from.viewport)) return g;
  if (!sameSize(from.size, to.size) || !sameScale(from, to)) {
    return { ...g, spans: new Float32Array(0) };
  }
  const { left, right, bottom, top } = from.viewport;
  const c = [(left + right) / 2, (bottom + top) / 2] as const;
  const [fx, fy] = worldToPx(from, ...c);
  const [tx, ty] = worldToPx(to, ...c);
  const dx = tx - fx;
  const dy = ty - fy;
  const spans = new Float32Array(g.spans.length);
  for (let k = 0; k + 3 < g.spans.length; k += 4) {
    spans[k] = g.spans[k] + dy;
    spans[k + 1] = g.spans[k + 1] + dy;
    spans[k + 2] = g.spans[k + 2] + dx;
    spans[k + 3] = g.spans[k + 3] + dx;
  }
  return { ...g, spans };
}
