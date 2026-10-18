// List values (NM-32 to NM-36): building a list or range, element-wise application with scalar
// broadcast and truncation to the shorter list, and points whose parts are lists. A list error is
// thrown as ListError inside a compiled closure and caught at its root by compileExpression, so
// it never leaves the evaluator (AR-54). Pure TypeScript: no DOM (AR-44).

import { toPlotNumber } from "./ops";
import { UNDEFINED, type ListErrorCode, type Value } from "./values";

/** NM-35: the most elements a list holds. */
export const MAX_LIST_ELEMENTS = 10_000;
/** NM-36: the tolerance of the element count and of the exact last element, relative to the step. */
const RANGE_TOLERANCE = 1e-9;

type ListValue = Extract<Value, { type: "list" }>;

/** A list error (NM-34 to NM-36), thrown while a closure runs and returned by compileExpression. */
export class ListError extends Error {
  readonly code: ListErrorCode;
  constructor(code: ListErrorCode) {
    super(code);
    this.name = "ListError";
    this.code = code;
  }
}

/** The undefined value that carries `code` to the row that evaluated it. */
export function listErrorValue(code: ListErrorCode): Value {
  return Object.freeze({ type: "undefined" as const, error: code });
}

const isList = (v: Value): v is ListValue => v.type === "list";

/**
 * A list of evaluated items (PR-34). A list item is `nested-list` (NM-34); points mixed with any
 * other defined item are `list-mixed`; more than MAX_LIST_ELEMENTS items are `list-too-long`.
 */
export function makeList(items: Value[]): Value {
  if (items.length > MAX_LIST_ELEMENTS) throw new ListError("list-too-long");
  let points = 0,
    others = 0;
  for (const item of items) {
    if (isList(item)) throw new ListError("nested-list");
    if (item.type === "point") points += 1;
    else if (item.type !== "undefined") others += 1;
  }
  if (points > 0 && others > 0) throw new ListError("list-mixed");
  return { type: "list", value: items };
}

/**
 * NM-36: `[a...c]` (second null) steps by 1, or −1 when c < a; `[a,b,...,c]` steps by s = b − a,
 * and s = 0 is `range-step`. The count is n = floor((c − a)/s + 1e-9) + 1 and the elements are
 * a + k·s, the last one exactly c when within 1e-9·|s| of it; n ≤ 0 is the empty list and more
 * than MAX_LIST_ELEMENTS is `list-too-long`. A list bound is `nested-list`; any other bound that
 * is not a finite real number makes the range undefined.
 */
export function rangeValue(from: Value, second: Value | null, to: Value): Value {
  const bounds = second === null ? [from, to] : [from, second, to];
  if (bounds.some(isList)) throw new ListError("nested-list");
  const [a, b, c] = [from, second ?? from, to].map((v) => (v.type === "number" ? v.value : NaN));
  if (![a, b, c].every(Number.isFinite)) return UNDEFINED;
  const s = second === null ? (c < a ? -1 : 1) : b - a;
  if (s === 0) throw new ListError("range-step");
  const n = Math.floor((c - a) / s + RANGE_TOLERANCE) + 1;
  if (!(n <= MAX_LIST_ELEMENTS)) throw new ListError("list-too-long");
  const items: Value[] = [];
  for (let k = 0; k < n; k++) {
    const v = a + k * s;
    const exact = k === n - 1 && Math.abs(v - c) <= RANGE_TOLERANCE * Math.abs(s);
    items.push({ type: "number", value: exact ? c : v });
  }
  return { type: "list", value: items };
}

/** NM-32: `op` on `a`, or on each element of a list `a`. */
export function map1(a: Value, op: (a: Value) => Value): Value {
  return isList(a) ? { type: "list", value: a.value.map(op) } : op(a);
}

/** NM-32, NM-33: `op` element by element, a scalar paired with every element, lists truncated. */
export function map2(a: Value, b: Value, op: (a: Value, b: Value) => Value): Value {
  if (!isList(a) && !isList(b)) return op(a, b);
  const n = Math.min(isList(a) ? a.value.length : Infinity, isList(b) ? b.value.length : Infinity);
  const value: Value[] = [];
  for (let i = 0; i < n; i++) {
    value.push(op(isList(a) ? a.value[i] : a, isList(b) ? b.value[i] : b));
  }
  return { type: "list", value };
}

/** NM-32, NM-33: map2 for any number of arguments, as built-ins take them. */
export function mapN(args: readonly Value[], op: (args: Value[]) => Value): Value {
  let n = Infinity;
  for (const arg of args) if (isList(arg)) n = Math.min(n, arg.value.length);
  if (n === Infinity) return op([...args]);
  const value: Value[] = [];
  for (let i = 0; i < n; i++) value.push(op(args.map((arg) => (isList(arg) ? arg.value[i] : arg))));
  return { type: "list", value };
}

/**
 * RC-15, G-3, NM-33: the point (x, y), or a list of points when a part is a list. An undefined or
 * non-real coordinate is stored as NaN (04 decision 7).
 */
export function pointValue(x: Value, y: Value): Value {
  return map2(x, y, (a, b) => ({ type: "point", value: [toPlotNumber(a), toPlotNumber(b)] }));
}
