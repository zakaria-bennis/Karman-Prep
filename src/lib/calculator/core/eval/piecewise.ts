// Piecewise evaluation (PR-31, PR-32, NM-41), as Desmos evaluates it (captured 2026-10-19): the
// first condition that holds picks its value, a bare condition's value is 1, and with none holding
// the otherwise value or, without one, undefined; `\{\}` is 1. Desmos's piecewise broadcasts every
// list among its conditions and values, truncating to the shortest list (NM-33):
// `\{[1,2,3]>1:4,9\}` is [9, 4, 4] and `\{1>0:1,[1,2]\}` is [1, 1]. Pure TypeScript: no DOM (AR-44).

import { mapN } from "./lists";
import { numberValue, UNDEFINED, type Value } from "./values";

/** A compiled value; `safe` when evaluating it unpicked cannot recurse (it calls no user function). */
export interface PiecewiseValue {
  run: () => Value;
  safe: boolean;
}

/** A compiled part: its condition, 1 or undefined (a list of them for a list condition), and value. */
export interface PiecewisePart {
  test: () => Value;
  value: PiecewiseValue | null; // null: a bare condition, whose value is 1
}

const ONE: Value = Object.freeze(numberValue(1));
const isList = (v: Value) => v.type === "list";

/**
 * Evaluates the parts in order. Every condition is evaluated. While none is a list, the picked
 * value is, and so is every safe value, to find the lists the result broadcasts over; a value that
 * calls a user function runs only when picked, so a recursive definition's other branch never
 * runs where its base case holds (`p(n)=\{n=0:1,np(n-1)\}`).
 */
export function piecewiseValue(
  parts: readonly PiecewisePart[],
  otherwise: PiecewiseValue | null
): Value {
  if (parts.length === 0 && otherwise === null) return ONE;
  const tests = parts.map((part) => part.test());
  if (tests.some(isList)) {
    const values = parts.map((part) => (part.value === null ? ONE : part.value.run()));
    const other = otherwise === null ? UNDEFINED : otherwise.run();
    const n = tests.length;
    return mapN([...tests, ...values, other], (at) => {
      const k = at.findIndex((t, i) => i < n && t.type !== "undefined");
      return k < 0 ? at[2 * n] : at[n + k];
    });
  }
  const k = tests.findIndex((t) => t.type !== "undefined");
  const chosen = k < 0 ? otherwise : parts[k].value;
  const picked = chosen !== null ? chosen.run() : k < 0 ? UNDEFINED : ONE;
  const lists = [picked, ...unpicked(parts, otherwise, chosen)].filter(isList);
  if (lists.length === 0) return picked;
  const n = Math.min(...lists.map((list) => (list.type === "list" ? list.value.length : 0)));
  const at = (i: number) => (picked.type === "list" ? picked.value[i] : picked);
  return { type: "list", value: Array.from({ length: n }, (_, i) => at(i)) };
}

/** The values of the safe values other than `chosen`. */
function unpicked(
  parts: readonly PiecewisePart[],
  otherwise: PiecewiseValue | null,
  chosen: PiecewiseValue | null
): Value[] {
  const all = [...parts.map((part) => part.value), otherwise];
  return all.flatMap((v) => (v === null || v === chosen || !v.safe ? [] : [v.run()]));
}
