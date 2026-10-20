// Row error copy and the display text of names. Pure TypeScript: no
// DOM (AR-44).

import type { RowErrorCode } from "../corpus/types";
import { DEFERRED_FEATURES } from "../latex/errors";
import { PREFIX_FORM_NAMES, REFUSED_NAMES } from "../latex/operator-names";

/** The letters MathQuill shows for each Greek command (PR-11; omicron is not a name). */
const GREEK_LETTERS: Readonly<Record<string, string>> = {
  alpha: "α",
  beta: "β",
  gamma: "γ",
  delta: "δ",
  epsilon: "ϵ",
  varepsilon: "ε",
  zeta: "ζ",
  eta: "η",
  theta: "θ",
  vartheta: "ϑ",
  iota: "ι",
  kappa: "κ",
  lambda: "λ",
  mu: "μ",
  nu: "ν",
  xi: "ξ",
  pi: "π",
  rho: "ρ",
  varrho: "ϱ",
  sigma: "σ",
  varsigma: "ς",
  tau: "τ",
  upsilon: "υ",
  phi: "ϕ",
  varphi: "φ",
  chi: "χ",
  psi: "ψ",
  omega: "ω",
};

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
  if (base.startsWith("\\")) return GREEK_LETTERS[base.slice(1)] ?? base;
  return base === "pi" || base === "tau" ? GREEK_LETTERS[base] : base;
}

/**
 * `{n}` is `names[0]` and `{k}` is `names[1]`, both already display text, at every
 * place they appear. Appendix F recorded the reference's text for `duplicate-definition` (19),
 * `sim-side` (3) and `nested-list`, which these use; `argument-parentheses`, `comma-side`,
 * `range-bound`, `range-step`, `list-too-long`, `log-power`, `trig-power`, `empty-subscript`,
 * `name-subscript`, `index-type`, `list-length-free`, `empty-brackets`, `empty-root`,
 * `empty-root-index`, `reducer-arguments`, `first-argument-list`, `argument-type`, `both-lists`,
 * `repeat-count`, `repeat-lengths`, `refused-function`, `colon-side`, `colon-condition`,
 * `piecewise-condition`, `piecewise-part`, `piecewise-types`, `relation-side`, `comparator-types`
 * `double-inequality`, `distribution-call`, `distribution-function`, `add-types` and
 * `multiply-types`, `unexpected-symbol`, `logic-outside-condition`, `list-mixed`,
 * `point-coordinates` and the point codes from `point-coordinate-type` to `member-target` use the
 * text Desmos gave on 2026-10-19 (the other operator texts are its
 * bundle's, not yet captured live); `repeat-counts` is Desmos's
 * text for a bad count in a list of counts (its bundle's bad-counts string), and
 * `relation-chain`, `chained-equation`, `long-chain` and `double-direction` are its bundle's
 * comparator chain strings, not yet captured live.
 */
const MESSAGES: Readonly<Record<RowErrorCode, string>> = {
  syntax: "This can't be read. Check for a missing bracket or operator.",
  unsupported: "This calculator doesn't support that notation.",
  "point-arity": "A point needs exactly two coordinates.",
  "point-syntax": "Points are written like this: (1, 2).",
  "relation-chain": "Cannot mix inequalities and equations in a chain of comparisons.",
  "relation-side": "You need something on both sides of the '{n}' symbol.",
  "too-many-nodes": "This row is too long to evaluate. Split it into smaller definitions.",
  "too-deep": "This row is nested too deeply.",
  "sim-side": "You need something on both sides of the '∼' symbol.",
  "function-parentheses": "'{n}' is a function. Try using parentheses.",
  "argument-parentheses": "Use parentheses around the argument of '{n}'.",
  "comma-side": "You need something on both sides of the ',' symbol.",
  "range-bound": "Range must have an upper and lower bound.",
  "log-power": "Only {n}^2 is supported. Otherwise, use parens.",
  "trig-power": "Only {n}^2 and {n}^-1 are supported. Otherwise, use parens.",
  "empty-subscript": "Subscripts cannot be empty.",
  "name-subscript": "'{n}' cannot have a subscript.",
  "too-many-params": "Functions can have at most 8 parameters.",
  "duplicate-definition":
    "You've defined '{n}' in more than one place. Try deleting some of the definitions of '{n}'.",
  dependency: "{n} has more than one definition.",
  cycle: "{n} is defined in terms of itself.",
  "reserved-name": "{n} is reserved and can't be redefined.",
  arity: "Function '{n}' requires {k} arguments.", // arityMessage gives the full text
  "point-coordinates": "Too many variables, I don't know what to do with this.",
  "mixed-variables": "Use an equation such as y=… to graph an expression in x and y.",
  "polar-variable": "{n} only has a meaning in a polar equation.",
  timeout: "This is taking too long. Try a smaller range or fewer terms.",
  "regression-data": "Regression needs a list of data.",
  "regression-predictor": "Use the table column, such as x₁, not x.",
  "regression-params": "A regression can fit at most 8 parameters.",
  "regression-fit": "We couldn't find any region where this model is defined.",
  "nested-list": "Cannot store a list of numbers in a list.",
  "list-too-long": "Lists may not have more than 10,000 elements.",
  "range-step": "Ranges must be arithmetic sequences.",
  "list-mixed": "All elements of a list must have the same type.",
  "index-type": "Cannot index {n} with {k}.",
  "list-length-free": "Can't plot a list whose length depends on free variable '{n}'.",
  "empty-brackets": "Square brackets cannot be empty.",
  "empty-root": "Radical cannot be empty.",
  "empty-root-index": "Radical index cannot be empty.",
  "reducer-arguments":
    "Function '{n}' requires at least one argument. For example, try typing: {n}(1, 2).",
  "first-argument-list":
    "The first argument of '{n}' must be a list. For example, try typing: {n}([1,2,3], 1).",
  "argument-type": "Function '{n}' cannot be applied to {k}.",
  "both-lists":
    "Both arguments of '{n}' must be lists. For example, try typing: {n}([1,2,3], [3,2,1]).",
  "repeat-count": "'repeat' count must be a finite, non-negative integer.",
  "repeat-counts": "Each 'repeat' count must be a finite, non-negative integer.",
  "refused-function": "This calculator does not support the '{n}' function.",
  "repeat-lengths": "When the arguments of 'repeat' are lists, they must have the same length.",
  "colon-side": "You need something on both sides of the ':' symbol.",
  "colon-condition": "The left side of a ':' must be a condition, like 'x>1'.",
  "piecewise-condition": "A piecewise expression must have at least one condition.",
  "piecewise-part": "Every part of a piecewise expression must have a condition except the last.",
  "piecewise-types":
    "Cannot use {n} and {k} as the branches in a piecewise. Every branch must have the same type.",
  "comparator-types": "Cannot compare {n} to {k}.",
  "chained-equation": "This calculator cannot plot chained equations.",
  "long-chain": "This calculator cannot plot chains of more than 2 inequalities.",
  "double-inequality":
    "We only support solved double inequalities. Try deleting one side of the inequality.",
  "double-direction": "Double inequalities must both go the same way, e.g. 1 < y < 2.",
  "distribution-call":
    "'{n}' should be called on a distribution with a number. For example, try typing: D.{n}(x) where D=normaldist().",
  "distribution-function": "Cannot call distribution '{n}' as a function. Try '{n}.pdf(x)'.",
  "add-types": "Cannot add {n} and {k}.",
  "subtract-types": "Cannot subtract {k} from {n}.",
  "multiply-types": "Cannot multiply {n} by {k}.",
  "divide-types": "Cannot divide {n} by {k}.",
  "power-types": "Cannot raise {n} to {k}.",
  "negate-type": "Cannot negate {n}.",
  "point-coordinate-type": "Cannot use {n} as a coordinate of a point.",
  "coordinate-type": "Cannot access coordinate '.{n}' of {k}.",
  "point-function-arguments": "Function '{n}' requires {k}.",
  // Desmos's text ends with a space, the place its example would go (captured 2026-10-19)
  "point-function-arity": "Function '{n}' requires 2 arguments. ",
  "dot-call": "Function '{n}' cannot be called with dot notation.",
  "member-target": "Cannot call '.{n}' on {k}.",
  "unexpected-symbol": "Sorry, I don't understand the way that '{n}' is used here.",
  "logic-outside-condition": "'{n}' can only be used as part of a condition.",
};
/** RC-2, Phase 1: `unsupported` naming r or θ, whose polar graphs ship in Phase 2. */
const POLAR_UNSUPPORTED = "{n} is for polar graphs, which aren't available yet.";
const POLAR_NAMES: ReadonlySet<string> = new Set(["r", "θ"]);
/** PR-34, G-22: `unsupported` naming notation whose meaning has not shipped yet. */
const DEFERRED = "{n} isn't supported yet.";
const DEFERRED_NAMES: ReadonlySet<string> = new Set(Object.values(DEFERRED_FEATURES));

/**
 * The exact message for a row error; `names` holds display text, `[name, expected count, given
 * count]` for `arity`. Every arity error, a built-in's or a user function's, uses Desmos's wording
 * (appendix F decision 2): with f(x)=x and g(a,b)=a+b, `f(1,2)` reads "Function 'f' requires only
 * 1 argument. For example, try typing: f(x)." and `g(1)` "Function 'g' requires 2 arguments. For
 * example, try typing: g(1, 2)." (captured by the 2026-10-19 review).
 */
export function rowErrorMessage(code: RowErrorCode, names: string[]): string {
  const [n = "", k = ""] = names;
  if (code === "arity") return arityMessage(n, k, Number(names[2]));
  // PR-24: a trig, hyperbolic, ln or log name on its own reads as Desmos's empty call.
  if (code === "function-parentheses" && PREFIX_FORM_NAMES.has(n)) {
    return arityMessage(n, "1", 0);
  }
  // A refused name on its own reads as Desmos's refusal, not "is a function".
  if (code === "function-parentheses" && REFUSED_NAMES.includes(n)) {
    return rowErrorMessage("refused-function", [n]);
  }
  let template = MESSAGES[code];
  if (code === "unsupported" && POLAR_NAMES.has(n)) template = POLAR_UNSUPPORTED;
  if (code === "unsupported" && DEFERRED_NAMES.has(n)) template = DEFERRED;
  return template.replaceAll("{n}", () => n).replaceAll("{k}", () => k);
}

/**
 * FN-27, FN-30, FN-35, FN-36, FN-38: the arity examples Desmos gives with lists, for one argument
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
  ["sortedLastLessIndex", QUANTILE_EXAMPLE],
  ["sortedLastLessEqualIndex", QUANTILE_EXAMPLE],
]);

/**
 * Desmos's arity wording (captured 2026-10-19), from the expected count text `k`
 * ("1", "2", "1 or 2") and the count given. A function accepting one argument "requires an
 * argument" when given none (`round()`, `arctan()`), and one taking at most one "requires only 1
 * argument" when given more, each with the example `name(x)`; otherwise too few names the
 * smallest accepted count and too many the largest, "requires {count} arguments", with the
 * example `name(1, …, count)` ("mod(1, 2)", "arctan(1, 2)", `normalcdf(0)`'s "normalcdf(1, 2)").
 */
function arityMessage(name: string, k: string, given: number): string {
  const counts = k.split(/, | or /).map(Number);
  const [min, max] = [Math.min(...counts), Math.max(...counts)];
  const say = (needs: string, args: string) =>
    `Function '${name}' requires ${needs}. For example, try typing: ${name}(${args}).`;
  const example = LIST_EXAMPLES.get(name);
  if (given === 0 && counts.includes(1)) return say("an argument", example?.one ?? "x");
  if (max === 1) return say("only 1 argument", example?.one ?? "x");
  // too few names the smallest count above 1 (`normalcdf(0)` "requires 2 arguments"), too many
  // the largest (`normalcdf(1,2,3,4,5)` "requires 4 arguments")
  const named = given < min && min > 1 ? min : max;
  const args = Array.from({ length: named }, (_, i) => String(i + 1)).join(", ");
  return say(`${named} arguments`, named === max ? (example?.many ?? args) : args);
}
