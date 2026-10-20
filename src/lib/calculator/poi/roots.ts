// One-dimensional searches for points of interest (POI-TRACE-6, POI-TRACE-8, POI-TRACE-10): zeros
// by sign-change bracketing and Brent's method, run ends that reach 0, touching roots for
// intersections only, and extrema (corners included) from a change of direction between samples.
// Pure TypeScript: no DOM.

import { rationalApproximation } from "./format";
import { simplestDecimal } from "./simplest";

export interface Search1D {
  lo: number;
  hi: number;
  samples: number; // intervals between lo and hi
}
export interface Extremum {
  t: number;
  kind: "maximum" | "minimum";
}

const EPS = 2.220446049250313e-16;
const GOLDEN = (Math.sqrt(5) - 1) / 2;
const TOUCH_RATIO = 1e-8; // a local minimum of |f| this far below its neighbours is a touching root
const ENDPOINT_RATIO = 1e-5; // a domain endpoint whose value falls this far is a true zero
const ZERO_EDGE = 5e-8; // POI-TRACE-6: a run's end this near 0 is a zero
const POLE_RATIO = 1e-3; // a refined bracket must end this far below its starting values

const isNum = Number.isFinite;

function sample(f: (t: number) => number, s: Search1D): { t: number[]; v: number[] } {
  const n = Math.max(2, Math.floor(s.samples)),
    t: number[] = [],
    v: number[] = [];
  for (let k = 0; k <= n; k++) {
    const x = s.lo + ((s.hi - s.lo) * k) / n;
    t.push(x);
    v.push(f(x));
  }
  return { t, v };
}

/** Brent's method on a bracket [a, b] with f(a)·f(b) < 0; returns the root and the final |f|. */
function brent(f: (t: number) => number, a: number, b: number, fa: number, fb: number) {
  let c = a,
    fc = fa,
    d = b - a,
    e = d;
  for (let iter = 0; iter < 200; iter++) {
    if (Math.abs(fc) < Math.abs(fb)) {
      [a, b, c] = [b, c, b];
      [fa, fb, fc] = [fb, fc, fb];
    }
    const tol = 2 * EPS * Math.abs(b) + 1e-300,
      m = (c - b) / 2;
    if (Math.abs(m) <= tol || fb === 0) break;
    if (Math.abs(e) < tol || Math.abs(fa) <= Math.abs(fb)) {
      d = e = m;
    } else {
      let p: number, q: number;
      const s = fb / fa;
      if (a === c) {
        p = 2 * m * s;
        q = 1 - s;
      } else {
        const r = fb / fc,
          qq = fa / fc;
        p = s * (2 * m * qq * (qq - r) - (b - a) * (r - 1));
        q = (qq - 1) * (r - 1) * (s - 1);
      }
      if (p > 0) q = -q;
      else p = -p;
      if (2 * p < Math.min(3 * m * q - Math.abs(tol * q), Math.abs(e * q))) {
        e = d;
        d = p / q;
      } else {
        d = e = m;
      }
    }
    a = b;
    fa = fb;
    b += Math.abs(d) > tol ? d : m > 0 ? tol : -tol;
    fb = f(b);
    if (!isNum(fb)) return null;
    if ((fb > 0 && fc > 0) || (fb < 0 && fc < 0)) {
      c = a;
      fc = fa;
      d = e = b - a;
    }
  }
  return { t: b, size: Math.min(Math.abs(fb), Math.abs(fc)) };
}

/** Golden-section search for the minimum of g on [a, b]. */
function goldenMin(g: (t: number) => number, a: number, b: number): number {
  let x1 = b - GOLDEN * (b - a),
    x2 = a + GOLDEN * (b - a),
    g1 = g(x1),
    g2 = g(x2);
  for (
    let iter = 0;
    iter < 200 && b - a > 4 * EPS * Math.max(1, Math.abs(a) + Math.abs(b));
    iter++
  ) {
    if (g1 <= g2) {
      b = x2;
      x2 = x1;
      g2 = g1;
      x1 = b - GOLDEN * (b - a);
      g1 = g(x1);
    } else {
      a = x1;
      x1 = x2;
      g1 = g2;
      x2 = a + GOLDEN * (b - a);
      g2 = g(x2);
    }
  }
  return g1 <= g2 ? x1 : x2;
}

/** The boundary between a finite sample `inside` and a non-finite sample `outside`. */
function domainEdge(f: (t: number) => number, inside: number, outside: number): number {
  for (let k = 0; k < 80; k++) {
    const mid = (inside + outside) / 2;
    if (mid === inside || mid === outside) break;
    if (isNum(f(mid))) inside = mid;
    else outside = mid;
  }
  return inside;
}

const sameRoot = (a: number, b: number): boolean =>
  Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(a));

function pushUnique(out: number[], t: number): void {
  if (!out.some((r) => sameRoot(r, t))) out.push(t);
}

/**
 * POI-TRACE-6: the zeros of f in [lo, hi], ascending: a sign change between consecutive finite
 * samples refined by Brent's method (a pole's bracket does not shrink and is dropped), a sample
 * of exactly 0 where the sign changes around it, and the edge of a run of finite samples where f
 * falls to within ZERO_EDGE of 0 (or ENDPOINT_RATIO of its neighbour), such as √x at 0. A touching
 * root is not a zero (it is an extremum) unless `touching` is set, which intersections use
 * (POI-TRACE-10): then an interior local minimum of |f| that falls to TOUCH_RATIO of its
 * neighbours counts too.
 */
export function findRoots(f: (t: number) => number, s: Search1D, touching = false): number[] {
  const { t, v } = sample(f, s),
    out: number[] = [];
  const last = t.length - 1;
  for (let k = 0; k <= last; k++) {
    const a = v[k],
      b = k < last ? v[k + 1] : NaN;
    if (a === 0) {
      const l = k > 0 ? v[k - 1] : NaN,
        r = b;
      // A zero sample counts where the curve crosses or ends there (touching only for
      // intersections), never along f ≡ 0.
      const nl = isNum(l) && l !== 0,
        nr = isNum(r) && r !== 0;
      const crosses = nl && nr && l > 0 !== r > 0,
        runEnd = (nl && !isNum(r)) || (nr && !isNum(l)),
        touches = touching && nl && nr && l > 0 === r > 0;
      if (crosses || runEnd || touches) pushUnique(out, t[k]);
    }
    if (k === last) break;
    if (isNum(a) && isNum(b) && a !== 0 && b !== 0 && a > 0 !== b > 0) {
      const r = brent(f, t[k], t[k + 1], a, b);
      if (r !== null && r.size <= POLE_RATIO * Math.min(Math.abs(a), Math.abs(b)))
        pushUnique(out, r.t);
    } else if (isNum(a) !== isNum(b)) {
      const [inside, outside, value] = isNum(a) ? [t[k], t[k + 1], a] : [t[k + 1], t[k], b];
      const edge = domainEdge(f, inside, outside),
        fe = f(edge);
      if (
        isNum(fe) &&
        value !== 0 &&
        (Math.abs(fe) <= ZERO_EDGE || Math.abs(fe) <= ENDPOINT_RATIO * Math.abs(value))
      ) {
        pushUnique(out, edge);
      }
    }
    if (touching && k > 0 && isNum(v[k - 1]) && isNum(a) && isNum(b) && a !== 0) {
      const l = Math.abs(v[k - 1]),
        m = Math.abs(a),
        r = Math.abs(b);
      const sameSign = v[k - 1] > 0 === a > 0 && a > 0 === b > 0;
      if (sameSign && m < l && m <= r) {
        const tm = goldenMin((x) => Math.abs(f(x)), t[k - 1], t[k + 1]),
          fm = Math.abs(f(tm));
        if (isNum(fm) && fm <= TOUCH_RATIO * Math.max(l, r)) pushUnique(out, tm);
      }
    }
  }
  // The ends of the sampled range are run ends too.
  for (const k of [0, last]) if (v[k] !== 0 && Math.abs(v[k]) <= ZERO_EDGE) pushUnique(out, t[k]);
  return out.sort((x, y) => x - y);
}

/** How far a polished extremum may move from the golden-section estimate, relative to max(1, |t|). */
const POLISH_SPAN = 1e-6;

/**
 * A golden-section extremum is only good to about √ε, as f is flat there. When a simple value
 * within POLISH_SPAN (a rational multiple of π with denominator up to 24, or the shortest decimal)
 * is at least as extreme, the extremum is that value: sin x peaks at exactly π/2, so its label can
 * read π/2 (POI-TRACE-19).
 */
function polishExtremum(g: (t: number) => number, t: number): number {
  const span = POLISH_SPAN * Math.max(1, Math.abs(t)),
    best = g(t);
  const { n, d } = rationalApproximation(t / Math.PI, 24);
  const candidates = [(n / d) * Math.PI, simplestDecimal(t - span, t + span)];
  for (const c of candidates) {
    if (Math.abs(c - t) <= span && g(c) <= best) return c;
  }
  return t;
}

/** POI-TRACE-8: local maxima and minima of f in (lo, hi), corners included, ascending. */
export function findExtrema(f: (t: number) => number, s: Search1D): Extremum[] {
  const { t, v } = sample(f, s),
    out: Extremum[] = [];
  for (let k = 1; k < t.length - 1; k++) {
    const l = v[k - 1],
      m = v[k],
      r = v[k + 1];
    if (!isNum(l) || !isNum(m) || !isNum(r)) continue;
    const kind = m > l && m >= r ? "maximum" : m < l && m <= r ? "minimum" : null;
    if (kind === null) continue;
    const sign = kind === "maximum" ? -1 : 1;
    const g = (x: number) => {
      const y = f(x);
      return isNum(y) ? sign * y : Infinity;
    };
    const tm = polishExtremum(g, goldenMin(g, t[k - 1], t[k + 1]));
    const fm = f(tm);
    // A pole's neighbourhood keeps growing as it is refined; a true extremum gains little.
    const variation = Math.max(Math.abs(m - l), Math.abs(m - r));
    if (!isNum(fm) || Math.abs(fm - m) > 4 * variation) continue;
    if (!out.some((e) => sameRoot(e.t, tm))) out.push({ t: tm, kind });
  }
  return out.sort((a, b) => a.t - b.t);
}
