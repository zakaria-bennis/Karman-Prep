// Viewport arithmetic for the graph (G-5, G-7, G-23). World means math units; px means CSS px of
// the view's size with the origin at the top left. Pure functions: no DOM, safe in the worker.

export interface Viewport {
  left: number;
  right: number;
  bottom: number;
  top: number;
}
export interface PixelSize {
  width: number;
  height: number;
}
export interface ViewSpec {
  viewport: Viewport;
  size: PixelSize;
  dpr: number;
}
export const ZOOM_BUTTON_FACTOR = 2; // G-5: + button zoomViewport(v, 2, centre), − button zoomViewport(v, 1/2, centre)
export const ZOOM_KEY_FACTOR = 1.25; // KB table: + or = zoomViewport(v, 1.25, centre); − zoomViewport(v, 1/1.25, centre)
export const KEY_PAN_FRACTION = 0.1;
export const MIN_SPAN_FACTOR = 1e-9; // G-23: span >= 1e-9 * max(1, |centre|)
export const MAX_SPAN = 1e15;
export const MAX_ABS_BOUND = 1e15;

/** G-23: the smallest span an axis centred on `centre` may have, MIN_SPAN_FACTOR · max(1, |centre|). */
export function minSpan(centre: number): number {
  return MIN_SPAN_FACTOR * Math.max(1, Math.abs(centre));
}

const isPositive = (n: number) => Number.isFinite(n) && n > 0;
const isPositiveSize = (s: PixelSize) => isPositive(s.width) && isPositive(s.height);

/** Clamps a centre so an axis of span `span` about it stays within ±MAX_ABS_BOUND. */
function clampCentre(centre: number, span: number): number {
  const limit = MAX_ABS_BOUND - span / 2;
  return Math.min(limit, Math.max(-limit, centre));
}

/** One axis of `clampViewport`: unchanged when it meets every G-23 limit. */
function clampAxis(lo: number, hi: number): [number, number] {
  const span = hi - lo;
  const centre = (lo + hi) / 2;
  if (span <= MAX_SPAN && span >= minSpan(centre) && lo >= -MAX_ABS_BOUND && hi <= MAX_ABS_BOUND) {
    return [lo, hi];
  }
  const s1 = Math.min(span, MAX_SPAN);
  const c1 = clampCentre(centre, s1);
  const s2 = Math.max(s1, minSpan(c1));
  const limit = MAX_ABS_BOUND - s2 / 2;
  const c2 = clampCentre(c1, s2);
  // A centre held at its limit puts a bound on ±MAX_ABS_BOUND: set it exactly, keep the span.
  if (c2 >= limit || c2 + s2 / 2 > MAX_ABS_BOUND) return [MAX_ABS_BOUND - s2, MAX_ABS_BOUND];
  if (c2 <= -limit || c2 - s2 / 2 < -MAX_ABS_BOUND) return [-MAX_ABS_BOUND, -MAX_ABS_BOUND + s2];
  return [c2 - s2 / 2, c2 + s2 / 2];
}

/** G-23 limits per axis: span at most MAX_SPAN and at least minSpan(centre), bounds within ±MAX_ABS_BOUND. */
export function clampViewport(v: Viewport): Viewport {
  const [left, right] = clampAxis(v.left, v.right);
  const [bottom, top] = clampAxis(v.bottom, v.top);
  return { left, right, bottom, top };
}

/** G-5: x from −10 to 10, y centred on 0, equal units on both axes. */
export function defaultViewport(size: PixelSize): Viewport {
  if (!isPositiveSize(size)) return { left: -10, right: 10, bottom: -10, top: 10 };
  const top = (10 * size.height) / size.width;
  return { left: -10, right: 10, bottom: -top, top };
}

/** Each bound lies within 1e-9 × its axis's default span of the default view for `size`. */
export function isDefaultViewport(v: Viewport, size: PixelSize): boolean {
  const d = defaultViewport(size);
  const tx = 1e-9 * (d.right - d.left);
  const ty = 1e-9 * (d.top - d.bottom);
  return (
    Math.abs(v.left - d.left) <= tx &&
    Math.abs(v.right - d.right) <= tx &&
    Math.abs(v.bottom - d.bottom) <= ty &&
    Math.abs(v.top - d.top) <= ty
  );
}

/**
 * The largest zoom-in factor f for one axis whose view meets G-23 at its own post-zoom centre
 * `anchor + (centre − anchor)/f`: span/f ≥ minSpan(that centre) holds exactly when f ≤ K and
 * |anchor·f + centre − anchor| ≤ K, with K = span/MIN_SPAN_FACTOR.
 */
function zoomInLimit(span: number, centre: number, anchor: number): number {
  const k = span / MIN_SPAN_FACTOR;
  if (anchor === 0) return k;
  return Math.min(k, 1 + (k - Math.sign(anchor) * centre) / Math.abs(anchor));
}

/** factor > 1 zooms in (each span divided by factor) about `anchor`; clamped by G-23. */
export function zoomViewport(
  v: Viewport,
  factor: number,
  anchor: { x: number; y: number }
): Viewport {
  if (!isPositive(factor) || !Number.isFinite(anchor.x) || !Number.isFinite(anchor.y)) {
    return { ...v };
  }
  const sx = v.right - v.left;
  const sy = v.top - v.bottom;
  let f: number;
  if (factor < 1) {
    f = Math.min(1, Math.max(factor, sx / MAX_SPAN, sy / MAX_SPAN));
  } else {
    const fx = zoomInLimit(sx, (v.left + v.right) / 2, anchor.x);
    const fy = zoomInLimit(sy, (v.bottom + v.top) / 2, anchor.y);
    f = Math.max(1, Math.min(factor, fx, fy));
  }
  if (f === 1) return clampViewport(v);
  const move = (bound: number, a: number) => a + (bound - a) / f;
  return clampViewport({
    left: move(v.left, anchor.x),
    right: move(v.right, anchor.x),
    bottom: move(v.bottom, anchor.y),
    top: move(v.top, anchor.y),
  });
}

/** Shifts the view by (dx, dy) world units, then clamps. */
export function panViewport(v: Viewport, dx: number, dy: number): Viewport {
  if (!Number.isFinite(dx) || !Number.isFinite(dy)) return { ...v };
  return clampViewport({
    left: v.left + dx,
    right: v.right + dx,
    bottom: v.bottom + dy,
    top: v.top + dy,
  });
}

/** Keeps each centre and the units per px: spans scale by `to/from` per axis, then clamps. */
export function resizeViewport(v: Viewport, from: PixelSize, to: PixelSize): Viewport {
  if (!isPositiveSize(from) || !isPositiveSize(to)) return { ...v };
  const cx = (v.left + v.right) / 2;
  const cy = (v.bottom + v.top) / 2;
  const hx = ((v.right - v.left) * (to.width / from.width)) / 2;
  const hy = ((v.top - v.bottom) * (to.height / from.height)) / 2;
  return clampViewport({ left: cx - hx, right: cx + hx, bottom: cy - hy, top: cy + hy });
}

/** World (x, y) to CSS px of `view.size`, origin top left; `view.dpr` is ignored. */
export function worldToPx(view: ViewSpec, x: number, y: number): [number, number] {
  const { viewport: v, size } = view;
  return [
    ((x - v.left) / (v.right - v.left)) * size.width,
    ((v.top - y) / (v.top - v.bottom)) * size.height,
  ];
}

/** The inverse of `worldToPx`. */
export function pxToWorld(view: ViewSpec, px: number, py: number): [number, number] {
  const { viewport: v, size } = view;
  return [
    v.left + (px / size.width) * (v.right - v.left),
    v.top - (py / size.height) * (v.top - v.bottom),
  ];
}
