// Operator-name allowlist (PR-12). This one list generates the
// parser's built-in names, MathQuill's autoOperatorNames and autoCommands (T-3) and the functions
// panel entries (K-4, K-5). Member names are a separate list and appear in none of those.

export type MathFieldAction = { op: "write" | "cmd" | "keystroke" | "typedText"; arg: string };
export interface OperatorName {
  name: string; // "sin", "arcsin", "log", "mean", "with", "of", …
  category: number | null; // 1–15 in K-4 order; null for with/for/and/or/of
  phase: 1 | 2 | 3 | 4; // K-4's planned phase, information only: SHIPPED gates names and the panel
  arity: readonly number[] | "variadic";
}
export interface PanelEntry {
  name: string;
  label: string;
  spoken: string;
  actions: readonly MathFieldAction[];
}
export interface PanelCategory {
  id: number; // 1–15
  heading: string; // CATEGORY_HEADINGS[id - 1]
  entries: readonly PanelEntry[];
}

/** The 15 functions-panel headings in K-4 order; category `id` is `CATEGORY_HEADINGS[id - 1]`. */
export const CATEGORY_HEADINGS: readonly string[] = Object.freeze([
  "Trig",
  "Inverse trig",
  "Statistics",
  "List operations",
  "Visualizations",
  "Probability distributions",
  "Inference",
  "Calculus",
  "Hyperbolic trig",
  "Geometry",
  "Custom colors",
  "Number theory",
  "Matrices",
  "Complex",
  "Advanced",
]);

/**
 * The built-ins whose FN- rule has shipped, by name; a call to any other allowlisted name is
 * `unsupported` (PR-9). Names ship one task at a time, so `phase` below is information only.
 */
export const SHIPPED: ReadonlySet<string> = new Set([
  "sin",
  "cos",
  "tan",
  "csc",
  "sec",
  "cot",
  "arcsin",
  "arccos",
  "arctan",
  "arccsc",
  "arcsec",
  "arccot",
  // FN-23 to FN-29 statistics and FN-2 length (Phase 2 task 5), FN-30 to FN-32 two-list
  // statistics and FN-34 to FN-36, FN-38 list operations (task 6), in OPERATOR_NAMES order
  "mean",
  "median",
  "min",
  "max",
  "quartile",
  "quantile",
  "stdev",
  "stddev",
  "stdDev",
  "stdevp",
  "stddevp",
  "stdDevP",
  "var",
  "variance",
  "varp",
  "cov",
  "covp",
  "mad",
  "corr",
  "spearman",
  "count",
  "total",
  "repeat",
  "join",
  "sort",
  "unique",
  "length",
  // inversecdf of data is quantile (FN-27); of a distribution it waits on distributions
  "inversecdf",
  "inverseCdf",
  "erf", // erf and the legacy distribution names below (Phase 2 T7)
  "exp",
  "ln",
  "log",
  // FN-68 hyperbolic trig (Phase 2 T5)
  "sinh",
  "cosh",
  "tanh",
  "csch",
  "sech",
  "coth",
  "arcsinh",
  "arccosh",
  "arctanh",
  "arccsch",
  "arcsech",
  "arccoth",
  // FN-75 gcd and lcm with their aliases (task 5), FN-76 to FN-78 and abs (Phase 2 T3), in
  // OPERATOR_NAMES order
  "lcm",
  "gcd",
  "gcf",
  "mcd",
  "mcm",
  "mod",
  "ceil",
  "floor",
  "round",
  "sign",
  "nPr",
  "nCr",
  "abs",
  // hidden names, which only pasted latex reaches (HIDDEN_OPERATOR_NAMES); the refused ones
  // (REFUSED_NAMES) parse so that analysis can give Desmos's argument errors and refusal
  "argmin",
  "argmax",
  "sortPerm",
  "complexSortPerm",
  "uniquePerm",
  "repeatAssert",
  "frequencyList",
  "frequencyListAssert",
  "sortedLastLessIndex",
  "sortedLastLessEqualIndex",
  "normalcdf",
  "normalpdf",
  "binomcdf",
  "binompdf",
  "invNorm",
]);

/**
 * PR-24, PR-26: the built-ins Desmos lets you call without parentheses (`\sin x`, `\ln 2`) or with
 * a power on the name (`\sin^{2}x`, `\cosh^{-1}2`): circular and hyperbolic trig, their inverses,
 * ln and log. Any other built-in needs `(`: Desmos reads `\operatorname{floor}2.5` and
 * `\operatorname{abs}^{-1}(2)` as "'floor' is a function. Try using parentheses." (captured
 * 2026-10-19), and exp too: `\exp 2`, `\exp^{2}(1)` and `\exp` each read "'exp' is a function.
 * Try using parentheses." (captured by the 2026-10-19 review).
 */
export const PREFIX_FORM_NAMES: ReadonlySet<string> = new Set([
  ...["sin", "cos", "tan", "csc", "sec", "cot"].flatMap((t) => [t, `arc${t}`, `${t}h`, `arc${t}h`]),
  "ln",
  "log",
]);

type Phase = OperatorName["phase"];
type Arity = OperatorName["arity"];
const V = "variadic";

function op(name: string, category: number | null, phase: Phase, arity: Arity): OperatorName {
  return Object.freeze({
    name,
    category,
    phase,
    arity: arity === V ? V : Object.freeze(arity),
  });
}

/**
 * Every K-4 function name with its category, shipping phase (K-4 and appendix B) and accepted
 * argument counts, in K-4 category order, then the five category-less operator words.
 */
export const OPERATOR_NAMES: readonly OperatorName[] = Object.freeze([
  // 1 Trig
  op("sin", 1, 1, [1]),
  op("cos", 1, 1, [1]),
  op("tan", 1, 1, [1]),
  op("csc", 1, 1, [1]),
  op("sec", 1, 1, [1]),
  op("cot", 1, 1, [1]),
  // 2 Inverse trig
  op("arcsin", 2, 1, [1]),
  op("arccos", 2, 1, [1]),
  op("arctan", 2, 1, [1, 2]),
  op("arccsc", 2, 1, [1]),
  op("arcsec", 2, 1, [1]),
  op("arccot", 2, 1, [1]),
  // 3 Statistics
  op("mean", 3, 2, V),
  op("median", 3, 2, V),
  op("min", 3, 2, V),
  op("max", 3, 2, V),
  op("quartile", 3, 2, [2]),
  op("quantile", 3, 2, [2]),
  op("stdev", 3, 2, V),
  op("stddev", 3, 2, V), // Desmos: stddev and stdDev are stdev, stddevp and stdDevP stdevp,
  op("stdDev", 3, 2, V), // variance var (typed only)
  op("stdevp", 3, 2, V),
  op("stddevp", 3, 2, V),
  op("stdDevP", 3, 2, V),
  op("var", 3, 2, V),
  op("variance", 3, 2, V),
  op("varp", 3, 2, V),
  op("cov", 3, 3, [2]),
  op("covp", 3, 3, [2]),
  op("mad", 3, 2, V),
  op("corr", 3, 3, [2]),
  op("spearman", 3, 3, [2]),
  op("stats", 3, 3, [1]),
  op("count", 3, 2, V),
  op("total", 3, 2, V),
  // 4 List operations
  op("repeat", 4, 3, [2]),
  op("join", 4, 3, V),
  op("sort", 4, 3, [1, 2]),
  op("shuffle", 4, 3, [1, 2]),
  op("unique", 4, 3, [1]),
  op("length", 4, 2, V), // a Desmos name not in PR-12's list (appendix F decision 2)
  // 5 Visualizations
  op("histogram", 5, 3, [1, 2]),
  op("dotplot", 5, 3, [1]),
  op("boxplot", 5, 3, [1]),
  // 6 Probability distributions
  op("normaldist", 6, 3, [0, 1, 2]),
  op("tdist", 6, 3, [1]),
  op("chisqdist", 6, 3, [1]),
  op("uniformdist", 6, 3, [0, 1, 2]),
  op("binomialdist", 6, 3, [2]),
  op("poissondist", 6, 3, [1]),
  op("geodist", 6, 3, [1]),
  op("discretedist", 6, 3, [1, 2]),
  op("pdf", 6, 3, [2]),
  op("cdf", 6, 3, [2, 3]),
  op("inversecdf", 6, 3, [2]),
  op("inverseCdf", 6, 3, [2]), // Desmos: an alias of inversecdf (typed only)
  op("random", 6, 3, [0, 1, 2, 3]),
  op("erf", 6, 3, [1]), // a Desmos name not in PR-12's list, typed only (not on the panel)
  // 7 Inference
  op("ztest", 7, 3, [2, 4]),
  op("ttest", 7, 3, [1, 2]),
  op("zproptest", 7, 3, [2, 4]),
  op("chisqtest", 7, 3, V),
  op("chisqgof", 7, 3, [2]),
  // 8 Calculus
  op("exp", 8, 1, [1]),
  op("ln", 8, 1, [1]),
  op("log", 8, 1, [1, 2]),
  // 9 Hyperbolic trig
  op("sinh", 9, 2, [1]),
  op("cosh", 9, 2, [1]),
  op("tanh", 9, 2, [1]),
  op("csch", 9, 2, [1]),
  op("sech", 9, 2, [1]),
  op("coth", 9, 2, [1]),
  op("arcsinh", 9, 2, [1]),
  op("arccosh", 9, 2, [1]),
  op("arctanh", 9, 2, [1]),
  op("arccsch", 9, 2, [1]),
  op("arcsech", 9, 2, [1]),
  op("arccoth", 9, 2, [1]),
  // 10 Geometry
  op("polygon", 10, 4, V),
  op("distance", 10, 4, [2]),
  op("midpoint", 10, 4, [2]),
  // 11 Custom colors
  op("rgb", 11, 4, [3]),
  op("hsv", 11, 4, [3]),
  op("okhsv", 11, 4, [3]),
  op("oklab", 11, 4, [3]),
  op("oklch", 11, 4, [3]),
  // 12 Number theory
  op("lcm", 12, 2, V),
  op("gcd", 12, 2, V),
  op("gcf", 12, 2, V), // Desmos: gcf and mcd are gcd, mcm is lcm (typed only)
  op("mcd", 12, 2, V),
  op("mcm", 12, 2, V),
  op("mod", 12, 2, [2]),
  op("ceil", 12, 2, [1]),
  op("floor", 12, 2, [1]),
  op("round", 12, 2, [1, 2]),
  op("sign", 12, 2, [1]),
  op("nPr", 12, 2, [2]),
  op("nCr", 12, 2, [2]),
  op("abs", 12, 2, [1]), // a Desmos name not in PR-12's list (appendix F decision 2)
  // 13 Matrices
  op("det", 13, 4, [1]),
  op("trace", 13, 4, [1]),
  op("rref", 13, 4, [1]),
  op("rank", 13, 4, [1]),
  op("rows", 13, 4, [1]),
  op("columns", 13, 4, [1]),
  op("transpose", 13, 4, [1]),
  // 14 Complex
  op("real", 14, 4, [1]),
  op("imag", 14, 4, [1]),
  op("conj", 14, 4, [1]),
  op("arg", 14, 4, [1]),
  // 15 Advanced
  op("tone", 15, 4, [1, 2]),
  // Operator words with no category of their own
  op("with", null, 4, [2]),
  op("for", null, 2, [2]),
  op("and", null, 4, [2]),
  op("or", null, 4, [2]),
  op("of", null, 1, [2]),
]);

/**
 * Desmos built-ins that only pasted or API latex reaches, `\operatorname{argmin}(L)`: typing
 * `argmin` gives `\arg\min` in Desmos, so these are not split targets, MathQuill names or panel
 * entries, and typing `arg` then `min` still splits as before.
 */
export const HIDDEN_OPERATOR_NAMES: readonly OperatorName[] = Object.freeze([
  op("argmin", 3, 2, V),
  op("argmax", 3, 2, V),
  op("sortPerm", 3, 2, [1]),
  op("complexSortPerm", 3, 2, [1]),
  op("uniquePerm", 3, 2, [1]),
  op("repeatAssert", 3, 2, [2]),
  op("frequencyList", 3, 2, [2]),
  op("frequencyListAssert", 3, 2, [2]),
  op("sortedLastLessIndex", 3, 2, [2]),
  op("sortedLastLessEqualIndex", 3, 2, [2]),
  // Desmos's legacy distribution names, for old saved graphs (typing splits them)
  op("normalcdf", 6, 3, [2, 3, 4]),
  op("normalpdf", 6, 3, [1, 2, 3]),
  op("binomcdf", 6, 3, [3, 4]),
  op("binompdf", 6, 3, [2, 3]),
  op("invNorm", 6, 3, [1]),
]);

/**
 * Hidden names Desmos's graphing calculator refuses, once their argument count and types pass and
 * for the bare name, with "This calculator does not support the 'frequencyList' function."
 * (function catalogue, captured live 2026-10-19).
 */
export const REFUSED_NAMES: readonly string[] = Object.freeze([
  "repeatAssert",
  "frequencyList",
  "frequencyListAssert",
  "sortedLastLessIndex",
  "sortedLastLessEqualIndex",
]);

/** Members, read only after `.` (PR-45): never built-ins, split targets or MathQuill names. */
export const MEMBER_NAMES: readonly string[] = Object.freeze([
  "null",
  "p",
  "pleft",
  "pright",
  "score",
  "dof",
  "stderr",
  "conf",
  "lower",
  "upper",
  "estimate",
]);

/** Typed letter sequences MathQuill turns into commands (T-3). */
export const AUTO_COMMANDS: readonly string[] = Object.freeze([
  "sqrt",
  "cbrt",
  "nthroot",
  "pi",
  "theta",
  "tau",
  "phi",
  "infinity",
  "infty",
  "sum",
  "prod",
  "int",
]);

const BY_NAME: ReadonlyMap<string, OperatorName> = new Map(
  [...OPERATOR_NAMES, ...HIDDEN_OPERATOR_NAMES].map((n) => [n.name, n])
);
const AUTO_OPERATOR_NAMES = OPERATOR_NAMES.map((n) => n.name).join(" ");
const AUTO_COMMAND_NAMES = AUTO_COMMANDS.join(" ");

export function isBuiltinName(name: string): boolean {
  return BY_NAME.has(name);
}

/** The allowlist entry of a built-in or hidden name (HIDDEN_OPERATOR_NAMES), or undefined. */
export function operatorName(name: string): OperatorName | undefined {
  return BY_NAME.get(name);
}

export function isShippedBuiltin(name: string): boolean {
  return SHIPPED.has(name) && BY_NAME.has(name);
}

/** Every allowlisted name, space-separated; MEMBER_NAMES are a separate list and never included. */
export function mathQuillAutoOperatorNames(): string {
  return AUTO_OPERATOR_NAMES;
}

export function mathQuillAutoCommands(): string {
  return AUTO_COMMAND_NAMES;
}

function action(op: MathFieldAction["op"], arg: string): MathFieldAction {
  return Object.freeze({ op, arg });
}

function panelEntry(
  name: string,
  label: string,
  spoken: string,
  actions: MathFieldAction[]
): PanelEntry {
  return Object.freeze({ name, label, spoken, actions: Object.freeze(actions) });
}

/** A K-5 function button: writes `<head>\left(\right)`, then moves the caret inside. */
function functionEntry(name: string, label: string, spoken: string, head: string): PanelEntry {
  return panelEntry(name, label, spoken, [
    action("write", `${head}\\left(\\right)`),
    action("keystroke", "Left"),
  ]);
}

const TRIG_SPOKEN: readonly (readonly [base: string, spoken: string])[] = [
  ["sin", "sine"],
  ["cos", "cosine"],
  ["tan", "tangent"],
  ["csc", "cosecant"],
  ["sec", "secant"],
  ["cot", "cotangent"],
];

// Panel presentations of the shipped names; a name without one is typed only (arcsinh, …).
const PANEL_PRESENTATIONS = new Map<string, readonly PanelEntry[]>();
for (const [base, spoken] of TRIG_SPOKEN) {
  PANEL_PRESENTATIONS.set(base, [functionEntry(base, base, spoken, `\\${base}`)]);
}
for (const [base, spoken] of TRIG_SPOKEN) {
  const name = `arc${base}`;
  PANEL_PRESENTATIONS.set(name, [
    functionEntry(name, `${base}⁻¹`, `inverse ${spoken}`, `\\${base}^{-1}`),
  ]);
}
PANEL_PRESENTATIONS.set("exp", [functionEntry("exp", "exp", "exponential", "\\exp")]);
PANEL_PRESENTATIONS.set("ln", [functionEntry("ln", "ln", "natural log", "\\ln")]);
PANEL_PRESENTATIONS.set("log", [
  functionEntry("log", "log", "log", "\\log"),
  panelEntry("log", "logₐ", "log base a", [action("cmd", "\\log"), action("cmd", "_")]),
]);

// Per category id in order: the shipped names with a presentation, in OPERATOR_NAMES order;
// categories left empty are dropped. `phase` is not read: shipping a name with a presentation adds
// it to the panel at once.
const PANEL_CATEGORIES: readonly PanelCategory[] = Object.freeze(
  CATEGORY_HEADINGS.flatMap((heading, index) => {
    const id = index + 1;
    const entries = OPERATOR_NAMES.filter(
      (n) => n.category === id && isShippedBuiltin(n.name)
    ).flatMap((n) => PANEL_PRESENTATIONS.get(n.name) ?? []);
    return entries.length === 0
      ? []
      : [Object.freeze({ id, heading, entries: Object.freeze(entries) })];
  })
);

/** Phase 1: categories 1, 2 and 8 in that order, 8 holding exp, ln, log and logₐ only (K-4). */
export function panelCategories(): readonly PanelCategory[] {
  return PANEL_CATEGORIES;
}
