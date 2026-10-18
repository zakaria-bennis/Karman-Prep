// Built-in argument counts (RC-20), read from PR-12's one operator-name list so no count is
// restated here. Pure TypeScript: no DOM (AR-44).

import { isShippedBuiltin, OPERATOR_NAMES } from "../latex/operator-names";

/**
 * The accepted argument counts of every shipped built-in function with a panel category and a
 * fixed arity: `[1]` for sin, `[1, 2]` for arctan and log (`\log_{b}x` is `(call log x b)`).
 */
export const BUILTIN_ARITY: ReadonlyMap<string, readonly number[]> = new Map(
  OPERATOR_NAMES.flatMap((o) =>
    o.category !== null && isShippedBuiltin(o.name) && o.arity !== "variadic"
      ? [[o.name, o.arity] as const]
      : []
  )
);

/** The expected count an `arity` error names: [1] → "1", [2] → "2", [1, 2] → "1 or 2". */
export function arityText(arity: readonly number[]): string {
  if (arity.length <= 1) return arity.map(String).join("");
  return `${arity.slice(0, -1).join(", ")} or ${arity[arity.length - 1]}`;
}
