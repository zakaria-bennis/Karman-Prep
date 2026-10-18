// Evaluator values (01-interfaces.md section 4). "Undefined" is the single non-value state
// (NM-6): every non-finite number or complex part becomes UNDEFINED here. Pure TypeScript: no DOM
// (AR-44).

export interface Complex {
  re: number;
  im: number;
}

export type Value =
  | { type: "number"; value: number }
  | { type: "complex"; value: Complex }
  | { type: "point"; value: [number, number] }
  | { type: "list"; value: Value[] } // produced from Phase 2
  | { type: "undefined" };

export const UNDEFINED: Value = Object.freeze({ type: "undefined" as const });

/** A real value: non-finite → UNDEFINED; -0 stays -0 (only formatNumber shows it as 0). */
export function numberValue(v: number): Value {
  return Number.isFinite(v) ? { type: "number", value: v } : UNDEFINED;
}

/** A complex value: a non-finite part → UNDEFINED; a zero imaginary part gives a number (decision 7). */
export function complexValue(re: number, im: number): Value {
  if (!Number.isFinite(re) || !Number.isFinite(im)) return UNDEFINED;
  return im === 0 ? { type: "number", value: re } : { type: "complex", value: { re, im } };
}
