// Piecewise evaluation (PR-31, PR-32, NM-41), as Desmos evaluates it (captured 2026-10-19): the
// first condition that holds picks its value, a bare condition's value is 1, and with none holding
// the otherwise value or, without one, undefined; `\{\}` is 1. A condition with a list operand
// holds element by element, and then every condition and value broadcasts, truncating to the
// shortest list (NM-33): `\{[1,2,3]>1:4,9\}` is [9, 4, 4]. Pure TypeScript: no DOM (AR-44).

import { mapN } from "./lists";
import { numberValue, UNDEFINED, type Value } from "./values";

/** A compiled part: its condition, 1 or undefined (a list of them for a list condition), and value. */
export interface PiecewisePart {
  test: () => Value;
  value: (() => Value) | null; // null: a bare condition, whose value is 1
}

const ONE: Value = Object.freeze(numberValue(1));

/**
 * Evaluates the parts in order. Every condition is evaluated; while none is a list only the
 * picked value is, so a value that recurses runs only where its condition holds.
 */
export function piecewiseValue(
  parts: readonly PiecewisePart[],
  otherwise: (() => Value) | null
): Value {
  if (parts.length === 0 && otherwise === null) return ONE;
  const tests = parts.map((part) => part.test());
  if (!tests.some((t) => t.type === "list")) {
    const k = tests.findIndex((t) => t.type !== "undefined");
    if (k < 0) return otherwise === null ? UNDEFINED : otherwise();
    const pick = parts[k].value;
    return pick === null ? ONE : pick();
  }
  const values = parts.map((part) => (part.value === null ? ONE : part.value()));
  const other = otherwise === null ? UNDEFINED : otherwise();
  const n = tests.length;
  return mapN([...tests, ...values, other], (at) => {
    const k = at.findIndex((t, i) => i < n && t.type !== "undefined");
    return k < 0 ? at[2 * n] : at[n + k];
  });
}
