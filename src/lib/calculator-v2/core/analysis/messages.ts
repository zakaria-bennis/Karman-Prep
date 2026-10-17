// Row error copy (01-interfaces.md section 3) and the display text of names. Pure TypeScript: no
// DOM (AR-44).

import type { RowErrorCode } from "../corpus/types";

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

/** `{n}` is `names[0]` and `{k}` is `names[1]`, both already display text (04 decision 3). */
const MESSAGES: Readonly<Record<RowErrorCode, string>> = {
  syntax: "This can't be read. Check for a missing bracket or operator.",
  unsupported: "This calculator doesn't support that notation.",
  "point-arity": "A point needs exactly two coordinates.",
  "relation-chain": "A chain of inequalities must point one way and use at most one =.",
  "too-many-nodes": "This row is too long to evaluate. Split it into smaller definitions.",
  "too-deep": "This row is nested too deeply.",
  "too-many-params": "Functions can have at most 8 parameters.",
  "duplicate-definition": "{n} is defined more than once.",
  dependency: "{n} has more than one definition.",
  cycle: "{n} is defined in terms of itself.",
  "reserved-name": "{n} is reserved and can't be redefined.",
  arity: "{n} takes {k} arguments.",
  "point-coordinates": "A point's coordinates can't use x or y.",
  "mixed-variables": "Use an equation such as y=… to graph an expression in x and y.",
  "polar-variable": "{n} only has a meaning in a polar equation.",
  timeout: "This is taking too long. Try a smaller range or fewer terms.",
};
/** RC-2, Phase 1: `unsupported` naming r or θ, whose polar graphs ship in Phase 2. */
const POLAR_UNSUPPORTED = "{n} is for polar graphs, which aren't available yet.";
const SINGLE_ARGUMENT = "{n} takes {k} argument.";
const POLAR_NAMES: ReadonlySet<string> = new Set(["r", "θ"]);

/** The exact message for a row error; `names` holds display text, `[name, count]` for `arity`. */
export function rowErrorMessage(code: RowErrorCode, names: string[]): string {
  const [n = "", k = ""] = names;
  let template = MESSAGES[code];
  if (code === "unsupported" && POLAR_NAMES.has(n)) template = POLAR_UNSUPPORTED;
  if (code === "arity" && k === "1") template = SINGLE_ARGUMENT;
  return template.replace("{n}", () => n).replace("{k}", () => k);
}
