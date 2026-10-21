// Coordinate labels for points of interest and the trace (POI-TRACE-19, POI-TRACE-24). Each
// coordinate is formatted on its own against a scale of 1000 px of its axis: plain decimals while
// the scale is between 1e-4 and 1e7, with max(5, floor(6.5 − log10 scale)) decimals; scientific
// outside that; rational multiples of π (denominator up to 24) as π fractions. A label whose
// coordinates include a clean rational can also show them as fractions (owner decision, 2026-10-21).
// Pure TypeScript.

import type { ViewSpec } from "../plot/viewport";

const MINUS = "−";
const MIN_DECIMALS = 5;
const DECIMAL_OFFSET = 6.5;
const PLAIN_LO = 1e-4;
const PLAIN_HI = 1e7;
const PI_DENOMINATOR = 24;
const SCALE_PX = 1000;

/** One coordinate as the label shows it. */
export type CoordinateParts =
  | { kind: "undefined" }
  | { kind: "number"; text: string } // "-1.41421": ASCII minus
  | { kind: "pi"; negative: boolean; n: number; d: number } // ±(n/d)π, n > 0
  | { kind: "scientific"; mantissa: string; exponent: string }
  | { kind: "fraction"; negative: boolean; n: number; d: number }; // ±n/d, n > 0, d ≥ 2

export interface FormattedCoordinate {
  text: string; // display text with a true minus, e.g. "−1.41421", "π/2", "2×10^6"
  latex: string; // e.g. "-1.41421", "\\frac{\\pi}{2}", "2\\times10^{6}"
  value: number; // the value the text stands for
  parts: CoordinateParts;
}

const display = (s: string): string => s.replace(/-/g, MINUS);

/** Removes trailing zeros (and a bare point) from a fixed or exponential numeral. */
function trimZeros(s: string): string {
  const e = s.indexOf("e");
  if (s.indexOf(".") === -1) return s;
  if (e === -1) return s.replace(/\.?0+$/, "");
  return s.slice(0, e).replace(/\.?0+$/, "") + s.slice(e);
}

/** max(5, floor(6.5 − log10 |s|)), with |s| floored at 1e-16. */
function decimalsFor(s: number): number {
  return Math.max(
    MIN_DECIMALS,
    Math.floor(DECIMAL_OFFSET - Math.log10(Math.max(Math.abs(s), 1e-16)))
  );
}

/** Whether a and b agree to within about 8 units in the last place of max(|a|, |b|, 1). */
function nearlyEqual(a: number, b: number): boolean {
  if (a === b) return true;
  const big = Math.max(Math.abs(a), Math.abs(b), 1);
  return big + Math.abs(a - b) / 8 === big;
}

/** The best rational approximation n/d of v with 0 < d ≤ maxD (continued-fraction convergents). */
export function rationalApproximation(v: number, maxD: number): { n: number; d: number } {
  // The convergents h/k start from the seeds h(−2)/k(−2) = 0/1 and h(−1)/k(−1) = 1/0.
  let [hPrev, h, kPrev, k] = [0, 1, 1, 0];
  let x = v;
  for (let iter = 0; iter < 64; iter++) {
    const a = Math.floor(x);
    const hNext = a * h + hPrev,
      kNext = a * k + kPrev;
    if (kNext > maxD) break;
    [hPrev, h, kPrev, k] = [h, hNext, k, kNext];
    if (x === a) break;
    x = 1 / (x - a);
  }
  return { n: h, d: k };
}

/** POI-TRACE-19: `v` formatted against `scale` (1000 px of its axis, in units). */
export function formatCoordinate(v: number, scale: number): FormattedCoordinate {
  if (!Number.isFinite(v)) {
    return {
      text: "undefined",
      latex: "\\mathrm{undefined}",
      value: v,
      parts: { kind: "undefined" },
    };
  }
  if (v === 0) return { text: "0", latex: "0", value: 0, parts: { kind: "number", text: "0" } };
  const s = Math.abs(v) > Math.abs(scale) ? Math.abs(v) : Math.abs(scale);
  const plain = s > PLAIN_LO && s < PLAIN_HI;
  if (plain) {
    const { n, d } = rationalApproximation(v / Math.PI, PI_DENOMINATOR);
    if (n !== 0 && nearlyEqual((n / d) * Math.PI, v)) return piCoordinate(n, d);
    let t = trimZeros(v.toFixed(decimalsFor(s)));
    if (t === "-0") t = "0";
    return { text: display(t), latex: t, value: parseFloat(t), parts: { kind: "number", text: t } };
  }
  const exp = trimZeros(v.toExponential(Math.min(100, decimalsFor(s / v)))).replace("+", "");
  const [mantissa, exponent] = exp.split("e");
  return {
    text: `${display(mantissa)}×10^${display(exponent)}`,
    latex: `${mantissa}\\times10^{${exponent}}`,
    value: parseFloat(exp),
    parts: { kind: "scientific", mantissa, exponent },
  };
}

function piCoordinate(n: number, d: number): FormattedCoordinate {
  const negative = n < 0,
    m = Math.abs(n),
    sign = negative ? "-" : "",
    num = m === 1 ? "\\pi" : `${m}\\pi`,
    numText = m === 1 ? "π" : `${m}π`;
  const latex = d === 1 ? `${sign}${num}` : `${sign}\\frac{${num}}{${d}}`;
  const text = `${negative ? MINUS : ""}${numText}${d === 1 ? "" : `/${d}`}`;
  return { text, latex, value: (n / d) * Math.PI, parts: { kind: "pi", negative, n: m, d } };
}

/** The scale of each axis for POI-TRACE-19: 1000 px of it, in units. */
export function coordinateScale(view: ViewSpec): { x: number; y: number } {
  const { viewport: v, size } = view;
  return {
    x: (SCALE_PX * (v.right - v.left)) / size.width,
    y: (SCALE_PX * (v.top - v.bottom)) / size.height,
  };
}

export interface FormattedLabel {
  x: FormattedCoordinate;
  y: FormattedCoordinate;
  text: string; // "(1.41421, 0)"
  latex: string; // "\\left(1.41421,\\ 0\\right)", the exported row
}

/** POI-TRACE-19, POI-TRACE-24: the label of the point (x, y) in `view`. */
export function formatPoiLabel(p: { x: number; y: number }, view: ViewSpec): FormattedLabel {
  const s = coordinateScale(view);
  const x = formatCoordinate(p.x, s.x),
    y = formatCoordinate(p.y, s.y);
  return {
    x,
    y,
    text: `(${x.text}, ${y.text})`,
    latex: `\\left(${x.latex},\\ ${y.latex}\\right)`,
  };
}

// The label's fraction form (owner decision, 2026-10-21): a coordinate converts when it is within
// 1e-9·max(1, |x|) of p/q with q ≤ 100 (points of interest come from numeric root-finding, so
// 0.333333333 is 1/3), shows as a plain decimal, and is not whole. Improper, as rows show it: 5/2.
export const LABEL_FRACTION_MAX_D = 100;
const LABEL_FRACTION_TOLERANCE = 1e-9;

/** A coordinate's clean fraction n/d (d ≥ 2, sign on n), or null. */
export function labelFraction(c: FormattedCoordinate, v: number): { n: number; d: number } | null {
  if (c.parts.kind !== "number" || !Number.isFinite(v)) return null;
  const { n, d } = rationalApproximation(v, LABEL_FRACTION_MAX_D);
  if (d < 2 || !(Math.abs(v - n / d) <= LABEL_FRACTION_TOLERANCE * Math.max(1, Math.abs(v)))) {
    return null;
  }
  return { n, d };
}

function fractionCoordinate(n: number, d: number): FormattedCoordinate {
  const negative = n < 0,
    m = Math.abs(n);
  return {
    text: `${negative ? MINUS : ""}${m}/${d}`,
    latex: `${negative ? "-" : ""}\\frac{${m}}{${d}}`,
    value: n / d,
    parts: { kind: "fraction", negative, n: m, d },
  };
}

/** Whether the label of the point `p` gets the decimal/fraction toggle. */
export function hasLabelFraction(label: FormattedLabel, p: { x: number; y: number }): boolean {
  return labelFraction(label.x, p.x) !== null || labelFraction(label.y, p.y) !== null;
}

/** The label with each convertible coordinate as a fraction; the others stay decimal. */
export function fractionLabel(label: FormattedLabel, p: { x: number; y: number }): FormattedLabel {
  const as = (c: FormattedCoordinate, v: number) => {
    const f = labelFraction(c, v);
    return f === null ? c : fractionCoordinate(f.n, f.d);
  };
  const x = as(label.x, p.x),
    y = as(label.y, p.y);
  return {
    x,
    y,
    text: `(${x.text}, ${y.text})`,
    latex: `\\left(${x.latex},\\ ${y.latex}\\right)`,
  };
}
