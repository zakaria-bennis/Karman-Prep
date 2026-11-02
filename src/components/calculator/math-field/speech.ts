// Row speech text (T-5, A11Y-4), MathSpeak style, built from
// the parser tree by a fixed speech table. Empty or
// unparseable LaTeX has no tree speech (""), and speechText() then falls back to MathQuill's
// mathspeak(). Numbers are spoken from their source digits and are never grouped (T-10).

import { functionDefinitionHead, parseLatex } from "@/lib/calculator/core/latex";
import type { Node, RelOp } from "@/lib/calculator/core/latex/ast";

/** Spoken words of the Phase 1 function names; any other name is spoken as an identifier. */
const SPOKEN_NAMES: ReadonlyMap<string, string> = new Map([
  ["sin", "sine"],
  ["cos", "cosine"],
  ["tan", "tangent"],
  ["csc", "cosecant"],
  ["sec", "secant"],
  ["cot", "cotangent"],
  ["arcsin", "arc sine"],
  ["arccos", "arc cosine"],
  ["arctan", "arc tangent"],
  ["arccsc", "arc cosecant"],
  ["arcsec", "arc secant"],
  ["arccot", "arc cotangent"],
  ["ln", "natural log"],
  ["log", "log"],
  ["exp", "exp"],
]);

/** The singular and plural word of each integer denominator 2 to 10 (`div`). */
const DENOMINATOR_WORDS: ReadonlyMap<number, readonly [string, string]> = new Map([
  [2, ["half", "halves"]],
  [3, ["third", "thirds"]],
  [4, ["fourth", "fourths"]],
  [5, ["fifth", "fifths"]],
  [6, ["sixth", "sixths"]],
  [7, ["seventh", "sevenths"]],
  [8, ["eighth", "eighths"]],
  [9, ["ninth", "ninths"]],
  [10, ["tenth", "tenths"]],
]);

const RELATION_WORDS: Readonly<Record<RelOp, string>> = {
  "=": "equals",
  "<": "less than",
  ">": "greater than",
  "<=": "less than or equal to",
  ">=": "greater than or equal to",
};

/**
 * The speech text of one row of LaTeX: its parser tree spoken word by word, or "" when the row is
 * empty or does not parse. A row's own function-definition head counts as a user function, so
 * `f(x)=x^{2}` is spoken "f of x equals x squared".
 */
export function latexToSpeech(latex: string): string {
  const head = functionDefinitionHead(latex);
  const userFunctions: ReadonlySet<string> = new Set(head === null ? [] : [head.name]);
  const result = parseLatex(latex, { userFunctions });
  return result.ok ? speak(result.tree, result.normalized).trim() : "";
}

/** The words for `node`; `source` is the normalized LaTeX its spans index. */
function speak(node: Node, source: string): string {
  const at = (child: Node, min: number) => {
    const text = speak(child, source);
    return precedence(child) < min ? wrap(text) : text;
  };
  switch (node.kind) {
    case "num":
      return numberText(node, source);
    case "id":
      return identifier(node.name);
    case "const":
      return node.name;
    case "add":
      return words(at(node.left, 2), "plus", at(node.right, 2));
    case "sub":
      return words(at(node.left, 2), "minus", at(node.right, 3));
    case "mul": {
      const right = at(node.right, 3);
      const times = /^[0-9.]/.test(right) ? ["times"] : [];
      return words(at(node.left, 3), ...times, right);
    }
    case "div":
      return fraction(node.left, node.right, source);
    case "pow":
      return power(at(node.left, 7), node.right, source);
    case "neg":
      return words("negative", at(node.arg, 4));
    case "pct":
      return words(at(node.arg, 7), "percent");
    case "fact":
      return words(at(node.arg, 7), "factorial");
    case "abs":
      return `Start Absolute Value, ${speak(node.arg, source)}, End Absolute Value`;
    case "deriv": // FN-61: "d by d x of x squared"
      return words("d by d", identifier(node.variable), "of", at(node.arg, 3));
    case "root":
      return root(node.arg, node.index, source);
    case "call": {
      const args = node.args.map((arg) => at(arg, 6));
      return call(node.name, args);
    }
    case "list":
      return words("list", ...node.items.map((item) => speak(item, source)));
    case "index": // PR-34: "L index 2"
      return words(at(node.target, 7), "index", ...node.items.map((item) => speak(item, source)));
    case "sim": // PR-30: "y sub 1 is fitted to m x sub 1 plus b"
      return words(speak(node.left, source), "is fitted to", speak(node.right, source));
    case "point":
      return words(
        "left parenthesis",
        speak(node.x, source),
        "comma",
        speak(node.y, source),
        "right parenthesis"
      );
    case "piecewise": // PR-31: "piecewise x greater than 0 then x otherwise negative x"
      return words(
        "piecewise",
        ...node.branches.flatMap(({ cond, value }) =>
          value === null ? [speak(cond, source)] : [speak(cond, source), "then", at(value, 2)]
        ),
        ...(node.otherwise === null ? [] : ["otherwise", at(node.otherwise, 2)])
      );
    case "for": // NM-37: "n squared for n equals list 1 2"
      return words(
        speak(node.body, source),
        ...node.bindings.flatMap((b) => [
          "for",
          identifier(b.name),
          "equals",
          speak(b.list, source),
        ])
      );
    case "rel": {
      const parts = [speak(node.operands[0], source)];
      node.ops.forEach((op, i) =>
        parts.push(RELATION_WORDS[op], speak(node.operands[i + 1], source))
      );
      return words(...parts);
    }
  }
}

/**
 * Wrapping precedence: a child below its parent's stated minimum is spoken inside
 * "left parenthesis … right parenthesis".
 */
function precedence(node: Node): number {
  switch (node.kind) {
    case "rel":
      return 1;
    case "add":
    case "sub":
      return 2;
    case "mul":
      return 3;
    case "neg":
      return 4;
    case "call":
      return 5;
    case "pow":
    case "pct":
    case "fact":
      return 6;
    default:
      return 7;
  }
}

function wrap(text: string): string {
  return words("left parenthesis", text, "right parenthesis");
}

function words(...parts: string[]): string {
  return parts.join(" ");
}

/**
 * A number's source digits. A parenthesized number's span includes its brackets, so only digits
 * and the point are kept; a number with no digits in its span (a typed `cbrt`'s index) is its value.
 */
function numberText(node: Extract<Node, { kind: "num" }>, source: string): string {
  const digits = source.slice(node.span.start, node.span.end).replace(/[^0-9.]/g, "");
  return digits === "" ? String(node.value) : digits;
}

/** True for a number written as digits alone, with no decimal point. */
function isIntegerLiteral(node: Node, source: string): node is Extract<Node, { kind: "num" }> {
  return node.kind === "num" && /^[0-9]+$/.test(numberText(node, source));
}

/** `x`; uppercase Latin `upper A`; Greek without `\` or a leading `var`; `a_{1}` is `a sub 1`. */
function identifier(name: string): string {
  const subscript = /^(.+?)_\{(.+)\}$/.exec(name);
  if (subscript !== null) return words(identifier(subscript[1]), "sub", subscript[2]);
  if (name === "\\degree") return "degrees"; // Desmos's word for its ° name
  if (name.startsWith("\\")) return name.slice(1).replace(/^var/, "");
  if (/^[A-Z]$/.test(name)) return words("upper", name);
  return name;
}

/** N over D, both integer literals and D in 2 to 10, is N and D's word; else a spoken fraction. */
function fraction(numerator: Node, denominator: Node, source: string): string {
  if (isIntegerLiteral(numerator, source) && isIntegerLiteral(denominator, source)) {
    const n = numberText(numerator, source);
    const word = DENOMINATOR_WORDS.get(Number(numberText(denominator, source)));
    if (word !== undefined) return words(n, n === "1" ? word[0] : word[1]);
  }
  const top = speak(numerator, source);
  const bottom = speak(denominator, source);
  return `Start Fraction, ${top} Over ${bottom}, End Fraction`;
}

/** A base and its exponent: 2 is "squared", 3 "cubed", any other a spoken superscript. */
function power(base: string, exponent: Node, source: string): string {
  if (exponent.kind === "num" && exponent.value === 2) return words(base, "squared");
  if (exponent.kind === "num" && exponent.value === 3) return words(base, "cubed");
  return `${base} Superscript, ${speak(exponent, source)}, Baseline`;
}

/** A square root, a cube root (index 3) or a root with any other index. */
function root(arg: Node, index: Node | null, source: string): string {
  const radicand = speak(arg, source);
  if (index === null) return `Start Root, ${radicand}, End Root`;
  if (index.kind === "num" && index.value === 3) {
    return `Start Cube Root, ${radicand}, End Cube Root`;
  }
  return `Start Root Index ${speak(index, source)}, ${radicand}, End Root`;
}

/** `NAME of A comma B`; `log` with a base (its last argument) is `log base B of A`. */
function call(name: string, args: readonly string[]): string {
  if (name === "log" && args.length === 2) return words("log base", args[1], "of", args[0]);
  const spoken = SPOKEN_NAMES.get(name) ?? identifier(name);
  return words(spoken, "of", args.join(" comma "));
}
