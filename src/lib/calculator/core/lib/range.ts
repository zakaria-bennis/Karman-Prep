// The range rule (NM-35, NM-36), shared by analysis, which checks ranges of number literals before
// anything runs, and evaluation, which builds every range. Pure TypeScript: no DOM (AR-44).

/** NM-35: the most elements a list holds. */
export const MAX_LIST_ELEMENTS = 10_000;

/** The step and element count of a range, or why it has none. */
export type RangeShape = { step: number; count: number } | "range-step" | "list-too-long";

/**
 * NM-36, as Desmos counts a range: `[a...c]` (b null) steps by 1, or −1 when c < a, and
 * `[a,b,...,c]` steps by s = b − a. The count is 1 + round((c − a)/s), rounding halves up, so the
 * last element can pass c by up to half a step: `[1...3.5]` is [1, 2, 3, 4] and `[1,3,...,8]` is
 * [1, 3, 5, 7, 9]. A count that is not finite (a bound that is not a finite number, or a step of 0)
 * or smaller than the number of values written before the ellipsis (`[1,3,...,1]`, `[1,2,...,0]`)
 * is `range-step`, Desmos's "Ranges must be arithmetic sequences."; a count over
 * MAX_LIST_ELEMENTS is `list-too-long`.
 */
export function rangeShape(a: number, b: number | null, c: number): RangeShape {
  const step = b === null ? (c - a >= 0 ? 1 : -1) : b - a;
  const count = 1 + Math.round((c - a) / step);
  if (!Number.isFinite(count) || count < (b === null ? 1 : 2)) return "range-step";
  return count > MAX_LIST_ELEMENTS ? "list-too-long" : { step, count };
}
