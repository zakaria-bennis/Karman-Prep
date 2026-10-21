// Exact constant arithmetic, as Desmos folds it (MATHS-CORE-1, captured 2026-10-20): a constant
// built from number literals with + − · ÷ and whole powers is computed in exact fractions, so
// `0.1+0.2-0.3` is 0 and `0.3-0.1-0.2` is 0, not ±2.8×10^-17. Literals are read as the simplest
// fraction that rounds to their double (0.1 is 1/10); a fraction past 2^53 − 1, a division by
// zero, or any other node gives null, and the caller works in doubles. Pure TypeScript: no DOM.

import type { Node } from "../latex/ast";
import {
  addFractions,
  divFractions,
  fractionOf,
  mulFractions,
  subFractions,
  type Fraction,
} from "../lib/rational";

const ARITHMETIC: ReadonlySet<Node["kind"]> = new Set(["add", "sub", "mul", "div", "neg", "pow"]);
const MAX_POWER = 64;

/** The double of `node` folded exactly, or null when it is not an exact constant (see above). */
export function exactConstant(node: Node): number | null {
  if (!ARITHMETIC.has(node.kind)) return null;
  const f = fractionValue(node);
  return f === null ? null : f.n / f.d;
}

function fractionValue(node: Node): Fraction | null {
  switch (node.kind) {
    case "num":
      return fractionOf(node.value);
    case "neg": {
      const a = fractionValue(node.arg);
      // −0 stays a double, so `\arctan(-0,-1)` keeps its sign (−π)
      return a === null || a.n === 0 ? null : { n: -a.n, d: a.d };
    }
    case "add":
    case "sub":
    case "mul":
    case "div": {
      const a = fractionValue(node.left);
      const b = a === null ? null : fractionValue(node.right);
      if (a === null || b === null) return null;
      if (node.kind === "add") return addFractions(a, b);
      if (node.kind === "sub") return subFractions(a, b);
      return node.kind === "mul" ? mulFractions(a, b) : divFractions(a, b);
    }
    case "pow": {
      const k = node.right.kind === "num" ? node.right.value : NaN;
      if (!Number.isInteger(k) || Math.abs(k) > MAX_POWER) return null;
      const base = fractionValue(node.left);
      if (base === null || (base.n === 0 && k <= 0)) return null;
      let result: Fraction | null = { n: 1, d: 1 };
      for (let i = 0; i < Math.abs(k) && result !== null; i++) result = mulFractions(result, base);
      return result === null || k >= 0 ? result : divFractions({ n: 1, d: 1 }, result);
    }
    default:
      return null;
  }
}
