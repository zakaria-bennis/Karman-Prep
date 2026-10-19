// Row error copy (01-interfaces.md section 3) and the display text of names. Pure TypeScript: no
// DOM (AR-44).

import type { RowErrorCode } from "../corpus/types";
import { DEFERRED_FEATURES } from "../latex/errors";
import { PREFIX_FORM_NAMES } from "../latex/operator-names";

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
 * `{n}` is `names[0]` and `{k}` is `names[1]`, both already display text (04 decision 3), at every
 * place they appear. Appendix F recorded the reference's text for `duplicate-definition` (19),
 * `sim-side` (3) and `nested-list`, which these use; `argument-parentheses`, `comma-side`,
 * `range-bound` and `list-too-long` use the text Desmos gave on 2026-10-19.
 */
const MESSAGES: Readonly<Record<RowErrorCode, string>> = {
  syntax: "This can't be read. Check for a missing bracket or operator.",
  unsupported: "This calculator doesn't support that notation.",
  "point-arity": "A point needs exactly two coordinates.",
  "relation-chain": "A chain of inequalities must point one way and use at most one =.",
  "too-many-nodes": "This row is too long to evaluate. Split it into smaller definitions.",
  "too-deep": "This row is nested too deeply.",
  "sim-side": "You need something on both sides of the '∼' symbol.",
  "function-parentheses": "'{n}' is a function. Try using parentheses.",
  "argument-parentheses": "Use parentheses around the argument of '{n}'.",
  "comma-side": "You need something on both sides of the ',' symbol.",
  "range-bound": "Range must have an upper and lower bound.",
  "too-many-params": "Functions can have at most 8 parameters.",
  "duplicate-definition":
    "You've defined '{n}' in more than one place. Try deleting some of the definitions of '{n}'.",
  dependency: "{n} has more than one definition.",
  cycle: "{n} is defined in terms of itself.",
  "reserved-name": "{n} is reserved and can't be redefined.",
  arity: "Function '{n}' requires {k} arguments.", // arityMessage gives the full text
  "point-coordinates": "A point's coordinates can't use x or y.",
  "mixed-variables": "Use an equation such as y=… to graph an expression in x and y.",
  "polar-variable": "{n} only has a meaning in a polar equation.",
  timeout: "This is taking too long. Try a smaller range or fewer terms.",
  "regression-data": "Regression needs a list of data.",
  "regression-predictor": "Use the table column, such as x₁, not x.",
  "regression-params": "A regression can fit at most 8 parameters.",
  "regression-fit": "We couldn't find any region where this model is defined.",
  "nested-list": "Cannot store a list of numbers in a list.",
  "list-too-long": "Lists may not have more than 10,000 elements.",
  "range-step": "A range can't step by 0. Make its first two values different.",
  "list-mixed": "A list can't mix numbers and points.",
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
  let template = MESSAGES[code];
  if (code === "unsupported" && POLAR_NAMES.has(n)) template = POLAR_UNSUPPORTED;
  if (code === "unsupported" && DEFERRED_NAMES.has(n)) template = DEFERRED;
  return template.replaceAll("{n}", () => n).replaceAll("{k}", () => k);
}

/**
 * Desmos's arity wording (captured 2026-10-19), from the expected count text `k`
 * ("1", "2", "1 or 2") and the count given. A function accepting one argument "requires an
 * argument" when given none (`round()`, `arctan()`), and one taking at most one "requires only 1
 * argument" when given more, each with the example `name(x)`; otherwise only the largest accepted
 * count is named, "requires {max} arguments", too many or too few, with the example
 * `name(1, …, max)` ("mod(1, 2)", "arctan(1, 2)"). `log` reads as a one-argument function, since
 * Desmos writes its base only as a subscript.
 */
function arityMessage(name: string, k: string, given: number): string {
  const counts = name === "log" ? [1] : k.split(/, | or /).map(Number);
  const max = Math.max(...counts);
  const say = (needs: string, args: string) =>
    `Function '${name}' requires ${needs}. For example, try typing: ${name}(${args}).`;
  if (given === 0 && counts.includes(1)) return say("an argument", "x");
  if (max === 1) return say("only 1 argument", "x");
  const args = Array.from({ length: max }, (_, i) => String(i + 1)).join(", ");
  return say(`${max} arguments`, args);
}
