// Indexing, slicing and filtering `L[…]` (PR-34, NM-30, NM-31), as Desmos evaluates them
// (captured 2026-10-19): 1-based, a non-integer index rounded down, anything out of range
// undefined; a list of indices, a range or several items pick each in turn, and a slice is the
// range of its indices, never cut at the list's end (`L[8...20]` is L[8] then 12 undefined). A
// filter keeps the elements whose condition holds. Pure TypeScript: no DOM (AR-44).

import type { RelOp } from "../latex/ast";
import { relationHolds } from "./ops";
import { UNDEFINED, type Value } from "./values";

/**
 * Element `index` of `target`, or one element per index when `index` is a list (NM-30). The index
 * is rounded down first (`L[1.6]` is L[1]); below 1, past the end, not a real number, or a target
 * that is not a list, is undefined.
 */
export function pickValue(target: Value, index: Value): Value {
  if (target.type !== "list") return UNDEFINED;
  const items = target.value;
  const pick = (k: Value): Value => {
    if (k.type !== "number") return UNDEFINED;
    const position = Math.floor(k.value);
    return position >= 1 && position <= items.length ? items[position - 1] : UNDEFINED;
  };
  return index.type === "list" ? { type: "list", value: index.value.map(pick) } : pick(index);
}

/** The number of elements of a list `target`, where an open slice (`L[2...]`, `L[...]`) ends. */
export function lengthOf(target: Extract<Value, { type: "list" }>): Value {
  return { type: "number", value: target.value.length };
}

/**
 * NM-31: the condition of a filter at one element, `values` its operands there: 1 when every link
 * of the chain holds, else undefined.
 */
export function conditionAt(values: readonly Value[], ops: readonly RelOp[]): Value {
  return relationHolds(values, ops) ? { type: "number", value: 1 } : UNDEFINED;
}

/**
 * NM-31: the elements of `target` whose `mask` item is defined (true), paired by position and
 * stopping at the shorter list (`L[[1,2,3]>2]` keeps only L[3]). A scalar mask keeps everything
 * when it holds and nothing otherwise; a target that is not a list is undefined.
 */
export function filterValue(target: Value, mask: Value): Value {
  if (target.type !== "list") return UNDEFINED;
  if (mask.type !== "list") {
    return { type: "list", value: mask.type === "undefined" ? [] : target.value };
  }
  const n = Math.min(target.value.length, mask.value.length);
  const kept: Value[] = [];
  for (let i = 0; i < n; i++) if (mask.value[i].type !== "undefined") kept.push(target.value[i]);
  return { type: "list", value: kept };
}
