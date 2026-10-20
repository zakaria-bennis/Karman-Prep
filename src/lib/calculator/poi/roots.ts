// One-dimensional searches for points of interest (POI-TRACE-6, POI-TRACE-8, POI-TRACE-10), run
// the way Desmos's sampler finds them: the range is sampled, then cut into segments wherever f is
// undefined or jumps (a jump that stays wider than a pixel however far its pair is halved, as at
// floor's steps or a pole). A segment that starts or ends within ZERO_EDGE of 0 has a zero there;
// inside a segment a zero is a change of sign (refined by Brent's method, or the middle of a run of
// exact zeros) and an extremum a change of direction (refined by golden-section search, or the
// middle of a flat run). Pure TypeScript: no DOM.

import { rationalApproximation } from "./format";
import { simplestDecimal } from "./simplest";

export interface Search1D {
  lo: number;
  hi: number;
  samples: number; // intervals between lo and hi
  /** One pixel of the value axis: a pair whose values stay further apart is a jump. */
  tol?: number;
}
export interface Extremum {
  t: number;
  kind: "maximum" | "minimum";
}

/**
 * The samples in t order. `joined[k]` is true when sample k continues the segment of sample k − 1
 * (both finite, no jump between them); `edge[k]` is the neighbouring sample's value when k was
 * inserted at a domain edge, else NaN.
 */
export interface Scan {
  t: number[];
  v: number[];
  joined: boolean[];
  edge: number[];
}

const EPS = 2.220446049250313e-16;
const GOLDEN = (Math.sqrt(5) - 1) / 2;
const TOUCH_RATIO = 1e-8; // a local minimum of |f| this far below its neighbours is a touching root
const ENDPOINT_RATIO = 1e-5; // a domain endpoint whose value falls this far is a true zero
const ZERO_EDGE = 5e-8; // POI-TRACE-6: a segment's end this near 0 is a zero
const POLE_RATIO = 1e-3; // a refined bracket must end this far below its starting values
const JUMP_HALVINGS = 64;
const EDGE_HALVINGS = 80;

const isNum = Number.isFinite;

/**
 * The bracket [lo, hi] of a jump inside the finite pair (a, fa), (b, fb): halves it, keeping the
 * half that changes more, until the change is at most `tol` (continuous: null) or the pair cannot
 * be halved. `gap` is set when an undefined value was met inside the pair.
 */
function jumpIn(
  f: (t: number) => number,
  a: number,
  fa: number,
  b: number,
  fb: number,
  tol: number
) {
  for (let n = 0; n < JUMP_HALVINGS; n++) {
    if (Math.abs(fb - fa) <= tol) return null;
    const m = 0.5 * (a + b);
    if (!(m > a && m < b)) break;
    const fm = f(m);
    if (!isNum(fm)) return { lo: a, flo: fa, hi: b, fhi: fb, gap: true };
    if (Math.abs(fm - fa) >= Math.abs(fb - fm)) [b, fb] = [m, fm];
    else [a, fa] = [m, fm];
  }
  return Math.abs(fb - fa) > tol ? { lo: a, flo: fa, hi: b, fhi: fb, gap: false } : null;
}

/** The boundary between a finite sample `inside` and a non-finite sample `outside`. */
function domainEdge(f: (t: number) => number, inside: number, outside: number): number {
  for (let k = 0; k < EDGE_HALVINGS; k++) {
    const mid = (inside + outside) / 2;
    if (mid === inside || mid === outside) break;
    if (isNum(f(mid))) inside = mid;
    else outside = mid;
  }
  return inside;
}

/**
 * Samples f at s.samples + 1 evenly spaced points, adds each domain edge between a finite and an
 * undefined sample, and, when s.tol is set, cuts every pair that jumps at its jump (adding the
 * jump's two sides as the ends of their segments).
 */
export function scanRange(f: (t: number) => number, s: Search1D): Scan {
  const n = Math.max(2, Math.floor(s.samples));
  const out: Scan = { t: [], v: [], joined: [], edge: [] };
  const add = (t: number, v: number, joined: boolean, edge = NaN) => {
    out.t.push(t);
    out.v.push(v);
    out.joined.push(joined && isNum(v) && out.v.length > 1 && isNum(out.v[out.v.length - 2]));
    out.edge.push(edge);
  };
  let pt = NaN,
    pv = NaN;
  for (let k = 0; k <= n; k++) {
    const t = k === n ? s.hi : s.lo + ((s.hi - s.lo) * k) / n,
      v = f(t);
    if (k > 0 && isNum(pv) !== isNum(v)) {
      const [inside, outside, value] = isNum(pv) ? [pt, t, pv] : [t, pt, v];
      const e = domainEdge(f, inside, outside),
        fe = f(e);
      if (e !== inside && isNum(fe)) {
        if (isNum(pv)) add(e, fe, true, value);
        else {
          add(e, fe, false, value);
          add(t, v, true);
          [pt, pv] = [t, v];
          continue;
        }
      }
    }
    let joined = true;
    if (k > 0 && s.tol !== undefined && isNum(pv) && isNum(v)) {
      const j = jumpIn(f, pt, pv, t, v, s.tol);
      if (j !== null) {
        joined = false;
        if (j.lo > pt) add(j.lo, j.flo, true);
        if (j.hi < t) {
          add(j.hi, j.fhi, false);
          joined = true;
        }
      }
    }
    add(t, v, joined);
    [pt, pv] = [t, v];
  }
  return out;
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

const sameRoot = (a: number, b: number): boolean =>
  Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(a));

function pushUnique(out: number[], t: number): void {
  if (!out.some((r) => sameRoot(r, t))) out.push(t);
}

/** Where f stops equalling `target` between `outside` (f ≠ target) and `inside` (f = target): the last point equal. */
function plateauEdge(
  f: (t: number) => number,
  outside: number,
  inside: number,
  target: number
): number {
  for (let k = 0; k < EDGE_HALVINGS; k++) {
    const m = 0.5 * (outside + inside);
    if (m === outside || m === inside) break;
    if (f(m) === target) inside = m;
    else outside = m;
  }
  return inside;
}

/** The middle of the run of samples first..last where f equals their value, its edges refined. */
function plateauMiddle(f: (t: number) => number, sc: Scan, first: number, last: number): number {
  const target = sc.v[first];
  const lo =
    first > 0 && sc.joined[first]
      ? plateauEdge(f, sc.t[first - 1], sc.t[first], target)
      : sc.t[first];
  const hi =
    last + 1 < sc.t.length && sc.joined[last + 1]
      ? plateauEdge(f, sc.t[last + 1], sc.t[last], target)
      : sc.t[last];
  return 0.5 * (lo + hi);
}

/** True when sample k starts or ends its segment. */
const segmentEnd = (sc: Scan, k: number) =>
  !sc.joined[k] || k + 1 >= sc.t.length || !sc.joined[k + 1];

/**
 * POI-TRACE-6: the zeros of f in [lo, hi], ascending: the start or end of a segment within
 * ZERO_EDGE of 0 (or, at a domain edge, ENDPOINT_RATIO of its neighbour, such as √x at 0); a sign
 * change between joined samples refined by Brent's method (a bracket that does not shrink is
 * dropped); and the middle of a run of exact zeros the sign changes across. A touching root is not
 * a zero (it is an extremum) unless `touching` is set, which intersections use (POI-TRACE-10):
 * then an interior local minimum of |f| that falls to TOUCH_RATIO of its neighbours counts too.
 */
export function findRoots(
  f: (t: number) => number,
  s: Search1D,
  touching = false,
  sc: Scan = scanRange(f, s)
): number[] {
  const { t, v, joined, edge } = sc,
    out: number[] = [];
  let buf: number[] = []; // Desmos's zero buffer: a nonzero sample, then maybe a first exact zero
  for (let k = 0; k < t.length; k++) {
    if (!joined[k]) buf = [];
    const a = v[k];
    if (!isNum(a)) continue;
    if (segmentEnd(sc, k)) {
      const atEdge = isNum(edge[k]) && Math.abs(a) <= ENDPOINT_RATIO * Math.abs(edge[k]);
      if (Math.abs(a) <= ZERO_EDGE || atEdge) pushUnique(out, t[k]);
    }
    if (buf.length === 0) {
      if (Math.abs(a) > ZERO_EDGE) buf.push(k);
    } else if (buf.length === 1 && a === 0) {
      buf.push(k);
    } else if (buf.length === 2 && a === 0) {
      // still in the run of exact zeros
    } else {
      const p = v[buf[0]];
      if (a > 0 !== p > 0) {
        if (buf.length === 2) pushUnique(out, plateauMiddle(f, sc, buf[1], k - 1));
        else {
          const r = brent(f, t[buf[0]], t[k], p, a);
          if (r !== null && r.size <= POLE_RATIO * Math.min(Math.abs(p), Math.abs(a)))
            pushUnique(out, r.t);
        }
      } else if (touching && buf.length === 2) {
        pushUnique(out, plateauMiddle(f, sc, buf[1], k - 1)); // touches 0 on exact zeros
      }
      buf = [k];
    }
    if (touching && k > 0 && joined[k] && k + 1 < t.length && joined[k + 1] && a !== 0) {
      const l = Math.abs(v[k - 1]),
        m = Math.abs(a),
        r = Math.abs(v[k + 1]);
      const sameSign = v[k - 1] > 0 === a > 0 && a > 0 === v[k + 1] > 0;
      if (sameSign && m < l && m <= r) {
        const tm = goldenMin((x) => Math.abs(f(x)), t[k - 1], t[k + 1]),
          fm = Math.abs(f(tm));
        if (isNum(fm) && fm <= TOUCH_RATIO * Math.max(l, r)) pushUnique(out, tm);
      }
    }
  }
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

/**
 * POI-TRACE-8: local maxima and minima of f in (lo, hi), corners included, ascending: where
 * joined samples change direction (rising then falling, or the reverse, across any flat run in
 * between). A flat run between a rise and a fall is an extremum at its middle; a rise, a flat run
 * and a rise again (a step) is none, and a segment's break resets the search.
 */
export function findExtrema(
  f: (t: number) => number,
  s: Search1D,
  sc: Scan = scanRange(f, s)
): Extremum[] {
  const { t, v, joined } = sc,
    out: Extremum[] = [];
  const add = (tm: number, kind: Extremum["kind"], variation: number, near: number) => {
    const fm = f(tm);
    // A pole's neighbourhood keeps growing as it is refined; a true extremum gains little.
    if (!isNum(fm) || Math.abs(fm - near) > 4 * variation) return;
    if (!out.some((e) => sameRoot(e.t, tm))) out.push({ t: tm, kind });
  };
  let buf: number[] = []; // Desmos's extremum buffer: [before, at] or [before, flat start, flat end]
  for (let k = 0; k < t.length; k++) {
    if (!joined[k]) buf = [];
    const m = v[k];
    if (!isNum(m)) continue;
    if (buf.length === 0) {
      buf = [k];
      continue;
    }
    if (buf.length === 1) {
      buf = m === v[buf[0]] ? [k] : [buf[0], k];
      continue;
    }
    const [a, b] = buf,
      flat = buf.length === 3;
    if (m === v[b]) {
      if (!flat) buf.push(k);
      else buf[2] = k;
      continue;
    }
    const rising = v[b] > v[a];
    if (m > v[b] !== rising) {
      const kind = rising ? "maximum" : "minimum";
      const variation = Math.max(Math.abs(v[b] - v[a]), Math.abs(m - v[b]));
      if (flat) add(plateauMiddle(f, sc, b, buf[2]), kind, variation, v[b]);
      else {
        const sign = rising ? -1 : 1;
        const g = (x: number) => {
          const y = f(x);
          return isNum(y) ? sign * y : Infinity;
        };
        add(polishExtremum(g, goldenMin(g, t[a], t[k])), kind, variation, v[b]);
      }
    }
    buf = [buf[buf.length - 1], k];
  }
  return out.sort((x, y) => x.t - y.t);
}
