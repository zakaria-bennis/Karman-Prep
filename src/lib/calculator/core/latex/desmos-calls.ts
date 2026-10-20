// Calls of the reference's built-ins this calculator does not evaluate. Each still reads its
// arguments, so a call gives the reference's own error where its argument count or a literal
// argument already decides it, the reference's refusal for a name its graphing calculator refuses,
// and this calculator's "unsupported" otherwise. Counts and texts are those live Desmos showed
// (function catalogue, 2026-10-19; checked again 2026-10-20). Pure TypeScript: no DOM.

import type { Node } from "./ast";
import { fail, type ParserState } from "./parser";
import { DESMOS_ONLY_CALLS } from "./desmos-names";
import type { Token } from "./tokens";

type CommandToken = Extract<Token, { t: "command" }>;

/** The allowlisted names that are not shipped yet: their counts come from the allowlist. */
const COLORS: ReadonlyMap<string, string> = new Map([
  ["rgb", "150, 30, 100"],
  ["hsv", "180, 0.5, 0.5"],
  ["okhsv", "180, 0.5, 0.5"],
  ["oklab", "0.7, 0.2, 0"],
  ["oklch", "0.8, 0.1, 8"],
]);
const PLOTS: ReadonlySet<string> = new Set(["stats", "histogram", "dotplot", "boxplot"]);
const MATRIX: ReadonlySet<string> = new Set([
  "det",
  "trace",
  "rref",
  "rank",
  "rows",
  "columns",
  "transpose",
]);

const isNumberLiteral = (a: Node) => a.kind === "num" || (a.kind === "neg" && a.arg.kind === "num");

/**
 * The error of a call to a built-in this calculator does not evaluate, `name` with `args`:
 * `counts` are the allowlist's accepted counts (null when it has none or the name is not on it).
 * Fails always: the reference's arity or literal-argument text where it applies, its refusal for
 * a refused name, else `unsupported`.
 */
export function failUnevaluatedCall(
  state: ParserState,
  name: CommandToken,
  args: readonly Node[],
  counts: readonly number[] | null
): never {
  const k = name.name,
    given = args.length,
    rule = DESMOS_ONLY_CALLS.get(k);
  const color = COLORS.get(k);
  if (color !== undefined && given !== 3) {
    return fail("color-arity", name.span, "a colour takes 3 arguments", k, [k, color]);
  }
  if (k === "random" && (given > 3 || args.some((a) => a.kind === "point"))) {
    return fail("random-arguments", name.span, "random's arguments", k);
  }
  if (PLOTS.has(k) && (given === 0 || isNumberLiteral(args[0]) || args[0].kind === "point")) {
    return fail("requires-list", name.span, "a plot of a non-list", k);
  }
  if ((k === "histogram" || k === "dotplot") && given > 2) {
    return fail("too-many-arguments", name.span, "at most 2 arguments", k, [k, "2"]);
  }
  if (k === "polygon" && given === 1 && isNumberLiteral(args[0])) {
    return fail("polygon-points", name.span, "a polygon of one number", k);
  }
  const accepted = rule?.counts ?? counts;
  if (accepted !== null && !accepted.includes(given)) {
    return fail("arity", name.span, "a wrong argument count", k, arityNames(k, accepted, given));
  }
  if (rule?.max !== undefined && given > rule.max) {
    return fail("point-function-arity", name.span, "too many arguments", k, [k, `${rule.max}`]);
  }
  if (MATRIX.has(k) && given === 1 && (isNumberLiteral(args[0]) || args[0].kind === "point")) {
    const shape = args[0].kind === "point" ? "a point" : "a number";
    return fail("argument-type", name.span, "a matrix function of a number", k, [k, shape]);
  }
  if (rule?.refused === true) return fail("refused-function", name.span, "refused", k);
  return fail("unsupported", name.span, `"${k}" is not supported`);
}

/** The display names of an `arity` error: name, accepted counts as text, given count. */
function arityNames(name: string, counts: readonly number[], given: number): string[] {
  const text =
    counts.length <= 1
      ? counts.join("")
      : `${counts.slice(0, -1).join(", ")} or ${counts[counts.length - 1]}`;
  return [name, text, String(given)];
}
