// The point built-ins (FN-70, FN-71) and coordinate members (PR-45), on one pair of evaluated
// values; lists broadcast through mapN and map1, which the evaluator applies. Values as Desmos
// evaluates them (function catalogue, geometry, captured live 2026-10-19). Pure TypeScript: no
// DOM (AR-44).

import type { Axis } from "../latex/ast";
import { numberValue, UNDEFINED, type Value } from "../eval/values";

/** FN-70, FN-71: the built-ins that take two points. */
export const POINT_FUNCTIONS: ReadonlySet<string> = new Set(["distance", "midpoint"]);

/**
 * FN-70: distance(P, Q), the length of Q − P without overflow (`distance((0,0),(10^{200},10^{200}))`
 * is 1.414…×10^200); FN-71: midpoint(P, Q), P/2 + Q/2, so (10^308, 10^308) halves to 5×10^307
 * instead of overflowing. Anything but two points is UNDEFINED (analysis reports Desmos's error);
 * an undefined coordinate makes the distance undefined and the midpoint's coordinate NaN.
 */
export function applyPointFunction(name: string, args: readonly Value[]): Value {
  const [p, q] = args;
  if (args.length !== 2 || p.type !== "point" || q.type !== "point") return UNDEFINED;
  const [[x1, y1], [x2, y2]] = [p.value, q.value];
  if (name === "distance") return numberValue(Math.hypot(x2 - x1, y2 - y1));
  if (name !== "midpoint") return UNDEFINED;
  const half = (a: number, b: number) => {
    const m = a / 2 + b / 2;
    return Number.isFinite(m) ? m : NaN;
  };
  return { type: "point", value: [half(x1, x2), half(y1, y2)] };
}

/**
 * PR-45: `P.x` and `P.y`, a point's coordinate (undefined when it is NaN: `(\frac{1}{0},1).x`);
 * a point has no `.z`, and anything else has no coordinate.
 */
export function coordinate(v: Value, axis: Axis): Value {
  if (v.type !== "point" || axis === "z") return UNDEFINED;
  return numberValue(v.value[axis === "x" ? 0 : 1]);
}
