// Row error copy and the display text of names. Pure TypeScript: no
// DOM (AR-44).

import type { RowErrorCode } from "../corpus/types";
import { DEFERRED_FEATURES } from "../latex/errors";
import { DESMOS_ONLY_CALLS } from "../latex/desmos-names";
import { GREEK_LETTERS } from "../latex/greek";
import { PREFIX_FORM_NAMES, REFUSED_NAMES } from "../latex/operator-names";

/**
 * The text a message shows for a name: Greek commands and the constants `pi` and `tau` as their
 * letters, and a subscript `_{…}` as `_…` (`\theta` → θ, `a_{1}` → a_1, `v_{max}` → v_max).
 */
export function displayName(name: string): string {
  const match = /^(.*?)_\{(.*)\}$/.exec(name);
  const [base, subscript] = match === null ? [name, null] : [match[1], match[2]];
  return subscript === null ? letter(base) : `${letter(base)}_${subscript}`;
}

function letter(base: string): string {
  // a name Desmos reads from another command shows without its backslash or wrapper: `\ne` is
  // ne and `\operatorname{foo}` foo (captured 2026-10-20)
  const wrapped = /^\\operatorname\{(.*)\}$/.exec(base);
  if (wrapped !== null) return wrapped[1];
  if (base.startsWith("\\")) return GREEK_LETTERS[base.slice(1)] ?? base.slice(1);
  return base === "pi" || base === "tau" ? GREEK_LETTERS[base] : base;
}

/**
 * Karman's own row error copy (owner decision, 2026-10-21): short plain English that says what is
 * wrong, about eight words at most, with an example only where it helps. `{n}` is `names[0]` and
 * `{k}` is `names[1]`, both already display text, at every place they appear. Symbols are quoted
 * ('+'); names are not (nCr, m).
 */
const MESSAGES: Readonly<Record<RowErrorCode, string>> = {
  syntax: "Can't read this expression.",
  unsupported: "This notation isn't supported.",
  "point-arity": "Points can have only 2 coordinates.",
  "point-syntax": "Write points like (1, 2).",
  "relation-chain": "Can't mix equations and inequalities in a chain.",
  "relation-side": "'{n}' needs something on both sides.",
  "too-many-nodes": "This row is too long. Split it up.",
  "too-deep": "This row is nested too deeply.",
  "sim-side": "'{n}' needs something on both sides.", // ~ or ∼, as written
  "function-parentheses": "{n} needs parentheses.",
  "argument-parentheses": "Put parentheses around the input of {n}.",
  "comma-side": "',' needs something on both sides.",
  "range-bound": "A range needs a start and an end.",
  "log-power": "Only {n}^2 works here. Use parentheses.",
  "trig-power": "Only {n}^2 and {n}^-1 work here. Use parentheses.",
  "empty-subscript": "The subscript is empty.",
  "name-subscript": "{n} can't have a subscript.",
  "too-many-params": "Functions can have at most 8 inputs.",
  "duplicate-definition": "{n} is defined more than once.",
  dependency: "{n} has more than one definition.",
  cycle: "{n} are defined using each other.", // cycleMessage gives the full text
  "function-cycle": "Functions {n} depend on each other.",
  "recursive-cycle": "Functions {n} depend on each other.",
  "implicit-variables": "Implicit equations can use only x and y.",
  "repeated-parameter": "{n} is used for two inputs.",
  "function-coordinate": "Add {n} as an input, like {k}.",
  "parameter-defined": "{n} is already defined. Use another input name.",
  "equation-required": "Add {n} at the start.",
  "reserved-name": "{n} is built in and can't be redefined.",
  arity: "{n} needs {k} inputs.", // arityMessage gives the full text
  "point-coordinates": "Too many unknown variables.",
  "mixed-variables": "Add an equals sign to make an equation.",
  "polar-variable": "{n} only works in polar equations.",
  timeout: "This took too long. Try a smaller range.",
  "regression-data": "A regression needs a list of data.",
  "regression-predictor": "{n} can't be a regression parameter.",
  "regression-params": "A regression can fit at most 8 parameters.",
  "regression-fit": "This model isn't defined for this data.",
  "nested-list": "A list can't hold lists.",
  "sample-size": "Sample size must be 0 or more.",
  "nested-empty-list": "A list can't hold empty lists.",
  "list-too-long": "A list can hold at most 10,000 items.",
  "range-step": "A range must go up in equal steps.",
  "list-mixed": "A list's items must all be the same type.",
  "index-type": "Can't index {n} with {k}.",
  "list-length-free": "Can't plot a list whose length uses {n}.",
  "empty-brackets": "The square brackets are empty.",
  "empty-root": "The root is empty.",
  "empty-root-index": "The root's index is empty.",
  "reducer-arguments": "{n} needs at least 1 input, like {n}(1, 2).",
  "first-argument-list": "The first input of {n} must be a list.",
  "argument-type": "{n} can't take {k}.",
  "both-lists": "Both inputs of {n} must be lists.",
  "repeat-count": "The repeat count must be a whole number ≥ 0.",
  "repeat-counts": "Each repeat count must be a whole number ≥ 0.",
  "refused-function": "{n} isn't available in this calculator.",
  "repeat-lengths": "The lists given to repeat must match in length.",
  "colon-side": "':' needs something on both sides.",
  "colon-condition": "Put a condition before ':', like x>1.",
  "piecewise-condition": "A piecewise needs at least one condition.",
  "piecewise-part": "Only the last piecewise part can skip a condition.",
  "piecewise-types": "Piecewise parts can't mix {n} and {k}.",
  "comparator-types": "Can't compare {n} to {k}.",
  "chained-equation": "Chained equations can't be plotted.",
  "long-chain": "A chain can have at most 2 inequalities.",
  "double-inequality": "Solve the double inequality, like 1<y<2.",
  "double-direction": "Both inequalities must point the same way.",
  "distribution-call": "Use {n} on a distribution, like D.{n}(x).",
  "distribution-function": "{n} is a distribution. Try {n}.pdf(x).",
  "add-types": "Can't add {n} and {k}.",
  "subtract-types": "Can't subtract {k} from {n}.",
  "multiply-types": "Can't multiply {n} by {k}.",
  "divide-types": "Can't divide {n} by {k}.",
  "power-types": "Can't raise {n} to {k}.",
  "negate-type": "Can't negate {n}.",
  "point-coordinate-type": "Can't use {n} as a point coordinate.",
  "coordinate-type": "Can't get .{n} from {k}.",
  "point-function-arguments": "{n} needs {k}.",
  "point-function-arity": "{n} needs {k} inputs.",
  "dot-call": "{n} can't be used with dot notation.",
  "member-target": "Can't use .{n} on {k}.",
  "unexpected-symbol": "'{n}' can't be used here.",
  "logic-outside-condition": "'{n}' only works inside a condition.",
  "too-many-variables": "{n} is not defined.", // tooManyVariables gives the full text
  "operator-side": "'{n}' needs something on both sides.",
  "operator-after": "'{n}' needs something after it.",
  "operator-before": "'{n}' needs something before it.",
  unmatched: "Missing '{n}' or '{k}'.",
  "unknown-symbol": "Unknown symbol '{n}'.",
  "empty-parentheses": "The parentheses are empty.",
  "empty-pipe": "The absolute value bars are empty.",
  "empty-superscript": "The exponent is empty.",
  "fraction-empty": "The fraction is empty.",
  "fraction-numerator": "The fraction has no top.",
  "fraction-denominator": "The fraction has no bottom.",
  "invalid-subscript": "'{n}' can't go in a subscript.",
  "subscript-target": "Only names can have subscripts.",
  "adjacent-numbers": "Put * or parentheses between {n} and {k}.",
  "for-duplicate": "{n} is defined twice after 'for'.",
  "for-ambiguous": "Put parentheses around the 'for' part.",
  "for-list": "After 'for', {n} must be a list, like {n}=[{k}].",
  "mixed-number": "Mixed number {n} is unclear. Use *.",
  "number-dot": "Unexpected '.' after a number.",
  "point-3d": "3D points can't be plotted.",
  "percent-of": "Use % with 'of', like 25% of 12.",
  "prime-use": "Prime notation can't be used this way.",
  "equality-here": "An equation can't go here.",
  "inequality-here": "An inequality can't go here.",
  "prime-superscript": "Can't combine a prime and an exponent.",
  "function-undefined": "Function {n} is not defined.",
  "color-arity": "{n} needs 3 inputs, like {n}({k}).",
  "random-arguments": "random takes 0 or 1 input, like random(10).",
  "requires-list": "{n} needs a list, like {n}([1,2,3]).",
  "too-many-arguments": "{n} takes at most {k} inputs.",
  "polygon-points": "polygon needs several points.",
  "symbol-context": "{n} can't be used here.",
  "complex-only": "{n} works only in complex mode.",
};
/** A built-in the reference's graphing calculator refuses (desmos-names.ts). */
const isRefused = (name: string) => DESMOS_ONLY_CALLS.get(name)?.refused === true;

/** The closer each opener of an `unmatched` error pairs with. */
const CLOSERS: Readonly<Record<string, string>> = { "(": ")", "[": "]", "{": "}" };
/** RC-2, Phase 1: `unsupported` naming r or θ, whose polar graphs ship in Phase 2. */
const POLAR_UNSUPPORTED = "Polar graphs ({n}) aren't available yet.";
const POLAR_NAMES: ReadonlySet<string> = new Set(["r", "θ"]);
/** PR-34: `unsupported` naming notation whose meaning has not shipped yet. */
const DEFERRED = "{n} isn't supported yet.";
const DEFERRED_NAMES: ReadonlySet<string> = new Set(Object.values(DEFERRED_FEATURES));

/**
 * The message for a row error; `names` holds display text, `[name, expected count, given count]`
 * for `arity`. Every arity error, a built-in's or a user function's, uses the same wording: with
 * f(x)=x and g(a,b)=a+b, `f(1,2)` reads "f takes only 1 input, like f(x)." and `g(1)` "g needs 2
 * inputs, like g(1, 2)."
 */
export function rowErrorMessage(code: RowErrorCode, names: string[]): string {
  const [n = "", k = ""] = names;
  if (code === "arity") return arityMessage(n, k, Number(names[2]));
  if (code === "too-many-variables") return tooManyVariables(names);
  if (code === "cycle" || code === "function-cycle" || code === "recursive-cycle") {
    return cycleMessage(code, names);
  }
  if (code === "equation-required" && names.length === 0) {
    return "Add an equals sign to make an equation.";
  }
  if (code === "unmatched") return MESSAGES.unmatched.replace("{n}", n).replace("{k}", CLOSERS[n]);
  // PR-24: a trig, hyperbolic, ln or log name on its own reads as an empty call.
  if (code === "function-parentheses" && PREFIX_FORM_NAMES.has(n)) {
    return arityMessage(n, "1", 0);
  }
  // A refused name on its own reads as the refusal, not "needs parentheses".
  if (code === "function-parentheses" && (REFUSED_NAMES.includes(n) || isRefused(n))) {
    return rowErrorMessage("refused-function", [n]);
  }
  let template = MESSAGES[code];
  if (code === "unsupported" && POLAR_NAMES.has(n)) template = POLAR_UNSUPPORTED;
  if (code === "unsupported" && DEFERRED_NAMES.has(n)) template = DEFERRED;
  return template.replaceAll("{n}", () => n).replaceAll("{k}", () => k);
}

/**
 * FN-27, FN-30, FN-35, FN-36, FN-38: the arity examples with lists, for one argument
 * (`sort([3,2,1])`) and for the largest count (`quantile([1,2,3], 1)`, `sort([1,2,3],[3,2,1])`).
 */
const QUANTILE_EXAMPLE = { many: "[1,2,3], 1" };
const TWO_LIST_EXAMPLE = { many: "[1,2,3], [3,2,1]" };
const LIST_EXAMPLES = new Map<string, { one?: string; many?: string }>([
  ["quantile", QUANTILE_EXAMPLE],
  ["quartile", QUANTILE_EXAMPLE],
  ["inversecdf", QUANTILE_EXAMPLE],
  ["inverseCdf", QUANTILE_EXAMPLE],
  ["cov", TWO_LIST_EXAMPLE],
  ["covp", TWO_LIST_EXAMPLE],
  ["corr", TWO_LIST_EXAMPLE],
  ["spearman", TWO_LIST_EXAMPLE],
  ["sort", { one: "[3,2,1]", many: "[1,2,3],[3,2,1]" }],
  ["unique", { one: "[1,2,3]" }],
  ["join", { many: "[1,2],[3,4]" }],
  ["shuffle", { one: "[1,2,3]", many: "[1,2,3],2" }],
  ["tone", { one: "440", many: "440, 0.5" }],
  ["lowerQuantileIndex", QUANTILE_EXAMPLE],
  ["upperQuantileIndex", QUANTILE_EXAMPLE],
  ["quartileIndex", QUANTILE_EXAMPLE],
  ["lowerQuartileIndex", QUANTILE_EXAMPLE],
  ["upperQuartileIndex", QUANTILE_EXAMPLE],
  ["sortedLastLessIndex", QUANTILE_EXAMPLE],
  ["sortedLastLessEqualIndex", QUANTILE_EXAMPLE],
]);

/**
 * The arity wording, from the expected count text `k` ("1", "2", "1 or 2") and the count given.
 * A function accepting one argument "needs an input" when given none (`round()`, `arctan()`), and
 * one taking at most one "takes only 1 input" when given more, each with the example `name(x)`;
 * otherwise too few names the smallest accepted count and too many the largest, "needs {count}
 * inputs", with the example `name(1, …, count)` ("mod(1, 2)", `normalcdf(0)`'s "normalcdf(1, 2)").
 */
function arityMessage(name: string, k: string, given: number): string {
  const counts = k.split(/, | or /).map(Number);
  const [min, max] = [Math.min(...counts), Math.max(...counts)];
  const say = (needs: string, args: string) => `${name} ${needs}, like ${name}(${args}).`;
  const example = LIST_EXAMPLES.get(name);
  if (given === 0 && counts.includes(1)) return say("needs an input", example?.one ?? "x");
  if (max === 1) return say("takes only 1 input", example?.one ?? "x");
  // too few names the smallest count above 1 (`normalcdf(0)` "needs 2 inputs"), too many the
  // largest (`normalcdf(1,2,3,4,5)` "needs 4 inputs")
  const named = given < min && min > 1 ? min : max;
  const args = Array.from({ length: named }, (_, i) => String(i + 1)).join(", ");
  return say(`needs ${named} inputs`, named === max ? (example?.many ?? args) : args);
}

/** `a`, `a and b`, `a, b and c`: a plain list of names. */
function nameList(names: readonly string[]): string {
  if (names.length < 2) return names.join("");
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

/**
 * RC-10, EL-35: the warning an add-slider row shows, naming its undefined names in order:
 * "k is not defined." and "m and b are not defined." The slider limits and table cells use it too.
 */
export function tooManyVariables(names: readonly string[]): string {
  if (names.length === 0) return "Too many unknown variables.";
  return `${nameList(names)} ${names.length === 1 ? "is" : "are"} not defined.`;
}

/**
 * RC-8, the cycle texts: values "a and b are defined using each other."; one function "f depends
 * on itself." and more "Functions g and f depend on each other.", each with a base-case hint when
 * the cycle is a recursion.
 */
function cycleMessage(code: "cycle" | "function-cycle" | "recursive-cycle", names: string[]) {
  if (code === "cycle") return `${nameList(names)} are defined using each other.`;
  const hint = code === "recursive-cycle" ? " Add a base case." : "";
  if (names.length === 1) return `${names[0]} depends on itself.${hint}`;
  return `Functions ${nameList(names)} depend on each other.${hint}`;
}
