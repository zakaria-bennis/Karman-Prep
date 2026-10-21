// Printer (PR-37): a parse tree back to canonical MathQuill LaTeX, which parseLatex reads back to
// the same tree. Used only for the TR-35 duplicate check (appendix C). A composite wraps a child in
// `\left(…\right)` ("wrap") where the parser would otherwise group it differently (G2, G5), and a
// unary minus also wraps a negation (`-\left(-x\right)`).

import { isAxis, type Node, type RelOp } from "./ast";
import { isBuiltinName } from "./operator-names";

/** Built-ins MathQuill writes as their own command; every other built-in is `\operatorname{…}`. */
const COMMAND_NAMES: ReadonlySet<string> = new Set([
  "sin",
  "cos",
  "tan",
  "csc",
  "sec",
  "cot",
  "arcsin",
  "arccos",
  "arctan",
  "sinh",
  "cosh",
  "tanh",
  "coth",
  "exp",
  "ln",
  "log",
  "arg",
  "det",
  "gcd",
  "max",
  "min",
]);
const RELATIONS: Readonly<Record<RelOp, string>> = {
  "=": "=",
  "<": "<",
  ">": ">",
  "<=": "\\le",
  ">=": "\\ge",
};
/** A value too large for a double prints as 1 followed by 309 zeros, which reads back as Infinity. */
const NON_FINITE = "1" + "0".repeat(309);

type Kind = Node["kind"];
/** Bases that `^` takes without parentheses: each ends in a closing token or is one atom. */
const BARE_BASES: ReadonlySet<Kind> = new Set([
  "num",
  "id",
  "const",
  "call",
  "abs",
  "root",
  "pct",
  "deg",
  "fact",
  "point",
  "list",
  "index",
  "piecewise",
]);
/** Wrapped as a sum's right operand and as a product's left factor. */
const SUMS: ReadonlySet<Kind> = new Set(["add", "sub"]);
/** Wrapped as a product's right factor: products group left to right (PR-18). */
const PRODUCTS: ReadonlySet<Kind> = new Set(["add", "sub", "mul"]);
/** Wrapped under a unary minus. */
const NEGATED: ReadonlySet<Kind> = new Set(["add", "sub", "mul", "neg"]);
/** Wrapped before `\%`, `^{\circ}` and `!`. */
const POSTFIXED: ReadonlySet<Kind> = new Set(["add", "sub", "mul", "neg", "rel"]);

/** The canonical MathQuill LaTeX of `tree` (PR-37). */
export function printLatex(tree: Node): string {
  switch (tree.kind) {
    case "num":
      return tree.mixed === undefined
        ? plainDecimal(tree.value)
        : `${tree.mixed.whole}\\frac{${tree.mixed.numerator}}{${tree.mixed.denominator}}`;
    case "id":
      return tree.name;
    case "const":
      return tree.name === "e" ? "e" : `\\${tree.name}`;
    case "add":
    case "sub":
      return join([
        printLatex(tree.left),
        tree.kind === "add" ? "+" : "-",
        wrapIf(tree.right, SUMS),
      ]);
    case "mul":
      return printProduct(tree.left, tree.right);
    case "div":
      return join(["\\frac{", printLatex(tree.left), "}{", printLatex(tree.right), "}"]);
    case "pow":
      return join([
        BARE_BASES.has(tree.left.kind) ? printLatex(tree.left) : wrap(tree.left),
        "^{",
        printLatex(tree.right),
        "}",
      ]);
    case "neg":
      return join(["-", wrapIf(tree.arg, NEGATED)]);
    case "pct":
      return join([wrapIf(tree.arg, POSTFIXED), "\\%"]);
    case "deg":
      return join([wrapIf(tree.arg, POSTFIXED), "^{\\circ}"]);
    case "fact":
      return join([wrapIf(tree.arg, POSTFIXED), "!"]);
    case "abs":
      return join(["\\left|", printLatex(tree.arg), "\\right|"]);
    case "root":
      return tree.index === null
        ? join(["\\sqrt{", printLatex(tree.arg), "}"])
        : join(["\\sqrt[", printLatex(tree.index), "]{", printLatex(tree.arg), "}"]);
    case "point":
      return join(["\\left(", printLatex(tree.x), ",", printLatex(tree.y), "\\right)"]);
    case "list":
      return join(["\\left[", ...listItems(tree.items, tree.range), "\\right]"]);
    case "index": // PR-34: the target is an id, call, list, number or index, each one atom
      return join([
        printLatex(tree.target),
        "\\left[",
        ...listItems(tree.items, tree.range),
        "\\right]",
      ]);
    case "rel":
      return join(
        tree.operands.flatMap((operand, i) =>
          i === 0 ? [printLatex(operand)] : [RELATIONS[tree.ops[i - 1]], printLatex(operand)]
        )
      );
    case "call":
      if (tree.member !== undefined) return printMember(tree.name, tree.args, tree.member);
      return printCall(tree.name, tree.args, tree.base === true);
    case "sim":
      return join([printLatex(tree.left), "\\sim", printLatex(tree.right)]);
    case "piecewise": // PR-31: `\left\{x>0:x,-x\right\}`
      return join(["\\left\\{", piecewiseParts(tree).join(","), "\\right\\}"]);
  }
}

/**
 * `L·R`: the left factor is wrapped when it is a sum, the right one when it is a sum or a product
 * (products group left to right, PR-18). A number juxtaposes with a right factor that starts with
 * a Latin letter or a command (`2x`, `2\pi`), and every factor with a restriction (PR-32:
 * `x\left\{x>0\right\}`, as MathQuill writes it); anything else takes `\cdot`.
 */
function printProduct(left: Node, right: Node): string {
  const l = wrapIf(left, SUMS);
  const r = wrapIf(right, PRODUCTS);
  // PR-7: a percent sign is only read before `of`, as in Desmos (`25\%\operatorname{of}80`)
  if (endsWithPercent(left)) return join([l, "\\operatorname{of}", r]);
  // PR-34: a `[` right after a number indexes it, so a list factor takes `\cdot`.
  const juxtapose =
    right.kind === "piecewise" ||
    (left.kind === "num" && (isLetter(r[0]) || (r[0] === "\\" && !r.startsWith("\\left["))));
  return juxtapose ? join([l, r]) : join([l, "\\cdot", r]);
}

/** True when the last factor printed for `node` is a percent, so `of` must follow it. */
function endsWithPercent(node: Node): boolean {
  if (node.kind === "pct") return true;
  if (node.kind === "mul") return endsWithPercent(node.right);
  return node.kind === "neg" && endsWithPercent(node.arg);
}

/**
 * A call: `\sin`-style commands, `\operatorname{…}` for other built-ins and the bare name for user
 * functions, then the parenthesised arguments. A `log` base (PR-27) is written as `_{B}`.
 */
function printCall(name: string, args: readonly Node[], base: boolean): string {
  const head = COMMAND_NAMES.has(name)
    ? `\\${name}`
    : isBuiltinName(name)
      ? `\\operatorname{${name}}`
      : name;
  if (base) {
    const written = args.slice(0, -1);
    return join([head, "_{", printLatex(args[args.length - 1]), "}", parenthesised(written)]);
  }
  return join([head, parenthesised(args)]);
}

/** PR-45: `T.\operatorname{pdf}\left(x\right)`, or `T.\operatorname{mean}` for a property. */
function printMember(name: string, args: readonly Node[], member: "method" | "property"): string {
  const [target, ...rest] = args;
  // PR-45: a coordinate is typed as the letter, `P.x`; `.\operatorname{x}` is an error in Desmos
  if (member === "property" && isAxis(name)) return join([printLatex(target), ".", name]);
  const head = join([printLatex(target), ".\\operatorname{", name, "}"]);
  return member === "method" ? join([head, parenthesised(rest)]) : head;
}

/**
 * PR-34: list items separated by commas, as MathQuill writes them; a range puts `\\ldots` after
 * its `range` starts, joined to them directly after at most one start (`1\\ldots10`, `\\ldots3`)
 * and by commas after more (`1,3,\\ldots,10`), its ends following it by commas (`1\\ldots9,10`).
 * An index's range may have no ends (`2\\ldots`, `1,3,\\ldots`).
 */
function listItems(items: readonly Node[], range: number | undefined): string[] {
  const parts = items.map(printLatex);
  const commas = (part: string, i: number) => (i === 0 ? [part] : [",", part]);
  if (range === undefined) return parts.flatMap(commas);
  const [starts, ends] = [
    parts.slice(0, range).flatMap(commas),
    parts.slice(range).flatMap(commas),
  ];
  const several = range >= 2;
  const after = several && ends.length > 0 ? [","] : [];
  return [...starts, several ? ",\\ldots" : "\\ldots", ...after, ...ends];
}

/** A piecewise's parts as MathQuill writes them: `c:v`, a bare `c`, then the otherwise value. */
function piecewiseParts(tree: Extract<Node, { kind: "piecewise" }>): string[] {
  const parts = tree.branches.map(({ cond, value }) =>
    value === null ? printLatex(cond) : join([printLatex(cond), ":", printLatex(value)])
  );
  return tree.otherwise === null ? parts : [...parts, printLatex(tree.otherwise)];
}

function parenthesised(args: readonly Node[]): string {
  return join(["\\left(", args.map(printLatex).join(","), "\\right)"]);
}

function wrap(node: Node): string {
  return join(["\\left(", printLatex(node), "\\right)"]);
}

function wrapIf(node: Node, kinds: ReadonlySet<Kind>): string {
  return kinds.has(node.kind) ? wrap(node) : printLatex(node);
}

/**
 * Concatenates `parts`, with one space only where a command name would otherwise run into a
 * following Latin letter (`\pi x`, `\cdot x`, `\le x`).
 */
function join(parts: readonly string[]): string {
  let out = "";
  for (const part of parts) {
    if (isLetter(part[0]) && endsWithCommandName(out)) out += " ";
    out += part;
  }
  return out;
}

/** True when `text` ends with `\` and a run of letters. Reads back from the end only. */
function endsWithCommandName(text: string): boolean {
  let i = text.length - 1;
  while (i >= 0 && isLetter(text[i])) i -= 1;
  return i < text.length - 1 && i >= 0 && text[i] === "\\";
}

function isLetter(ch: string | undefined): boolean {
  return ch !== undefined && ((ch >= "a" && ch <= "z") || (ch >= "A" && ch <= "Z"));
}

/**
 * `String(v)` with any exponent expanded into positional digits and no rounding (`1e-7` is
 * `0.0000001`, `1e+21` is `1000000000000000000000`); a non-finite value prints NON_FINITE.
 */
function plainDecimal(v: number): string {
  if (!Number.isFinite(v)) return NON_FINITE;
  const text = String(v);
  const match = /^(-?)(\d+)(?:\.(\d+))?e([+-]\d+)$/.exec(text);
  if (match === null) return text;
  const [, sign, whole, fraction = "", exponent] = match;
  const digits = whole + fraction;
  const point = whole.length + Number(exponent);
  if (point <= 0) return `${sign}0.${"0".repeat(-point)}${digits}`;
  if (point >= digits.length) return sign + digits + "0".repeat(point - digits.length);
  return `${sign}${digits.slice(0, point)}.${digits.slice(point)}`;
}
