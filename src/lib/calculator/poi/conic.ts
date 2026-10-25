// Implicit curves solvable for one coordinate (POI-TRACE-5): an equation F(x, y) = 0 whose F is a
// polynomial of degree 1 or 2 in y splits into explicit branches y = f(x) (the larger and the
// smaller root of the quadratic), so a circle gets its intercepts, extrema and intersections as two
// `y=` branches. Failing y, the same in x gives x = g(y) branches. Anything else (the folium,
// sin x = cos y) has no points of interest. Pure TypeScript: no DOM.

import { collectNameUses } from "../core/analysis/names";
import type { Node } from "../core/latex/ast";
import type { PoiBranch } from "./types";

type Fn2 = (x: number, y: number) => number;

const uses = (n: Node, name: string): boolean => collectNameUses(n).some((u) => u.name === name);

/** The degree of `n` as a polynomial in `v` (coefficients free of v), or Infinity when it is not one. */
export function polynomialDegree(n: Node, v: "x" | "y"): number {
  switch (n.kind) {
    case "num":
    case "const":
      return 0;
    case "id":
      return n.name === v ? 1 : 0;
    case "add":
    case "sub":
      return Math.max(polynomialDegree(n.left, v), polynomialDegree(n.right, v));
    case "mul":
      return polynomialDegree(n.left, v) + polynomialDegree(n.right, v);
    case "neg":
      return polynomialDegree(n.arg, v);
    case "div":
      return polynomialDegree(n.right, v) === 0 ? polynomialDegree(n.left, v) : Infinity;
    case "pow": {
      const base = polynomialDegree(n.left, v);
      if (uses(n.right, v)) return Infinity;
      if (base === 0) return 0;
      const e = n.right;
      return e.kind === "num" && Number.isInteger(e.value) && e.value >= 0
        ? base * e.value
        : Infinity;
    }
    default:
      return uses(n, v) ? Infinity : 0;
  }
}

const DISC_ROUNDING = 1e-13; // relative to b² + |4ac|

/** The branches t ↦ roots in s of a·s² + b·s + c = 0, the coefficients read from F at s = 0, ±1. */
function quadraticBranches(F: (t: number, s: number) => number, degree: 1 | 2) {
  const coefficients = (t: number) => {
    const c = F(t, 0),
      p = F(t, 1),
      m = F(t, -1);
    return { a: degree === 2 ? (p + m) / 2 - c : 0, b: (p - m) / 2, c };
  };
  const root = (t: number, upper: boolean): number => {
    const { a, b, c } = coefficients(t);
    if (a === 0) return b === 0 ? NaN : -c / b;
    // A discriminant within rounding of 0 is 0, so the two branches meet where the curve turns:
    // otherwise `1=\frac{(y-19)^2}{25}+\frac{(x+3)^2}{49}` ends 3e-12 short of x = 4 and its
    // meeting with `y=19` at (4, 19), which Desmos shows, is lost (live 2026-10-25).
    const raw = b * b - 4 * a * c;
    if (!(raw >= -DISC_ROUNDING * (b * b + Math.abs(4 * a * c)))) return NaN;
    const disc = Math.max(0, raw);
    // The stable pair: q = −(b + sign(b)·√disc)/2 gives the roots q/a and c/q.
    const q = -(b + (b < 0 ? -1 : 1) * Math.sqrt(disc)) / 2;
    const r1 = q / a,
      r2 = q === 0 ? r1 : c / q;
    return upper ? Math.max(r1, r2) : Math.min(r1, r2);
  };
  return degree === 1
    ? [(t: number) => root(t, true)]
    : [(t: number) => root(t, true), (t: number) => root(t, false)];
}

/** POI-TRACE-5: the explicit branches of the curve `expr` = 0 (F compiled from it), or none. */
export function conicBranches(expr: Node, F: Fn2): PoiBranch[] {
  const dy = polynomialDegree(expr, "y");
  if (dy === 1 || dy === 2) {
    return quadraticBranches((x, y) => F(x, y), dy).map((f) => ({ independent: "x", f }));
  }
  const dx = polynomialDegree(expr, "x");
  if (dx === 1 || dx === 2) {
    return quadraticBranches((y, x) => F(x, y), dx).map((f) => ({ independent: "y", f }));
  }
  return [];
}
