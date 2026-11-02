import type { CorpusCase, RowErrorCode, RowKind } from "../types";

const FILE = "parse-errors";
const x = (n: number, rules: string[], latex: string, error: RowErrorCode): CorpusCase => ({
  id: `${FILE}-${n}`,
  rules,
  input: { latex },
  error,
});

/** A row that parses: Desmos reads its unknown command as an undefined name. */
const n = (
  k: number,
  rules: string[],
  latex: string,
  kind: RowKind,
  chips: string[]
): CorpusCase => ({ id: `${FILE}-${k}`, rules, input: { latex }, kind, chips });

const cases: CorpusCase[] = [
  // Desmos reads an unknown command as a name (2026-10-20): `x\\ne3` is x·ne·3, "Too many
  // variables. Try defining 'ne'."
  n(1, ["PR-9"], "\\pm1", "value", ["\\pm"]),
  n(2, ["PR-9"], "x\\mp1", "curve-y", ["\\mp"]),
  n(3, ["PR-9"], "x\\ne3", "curve-y", ["\\ne"]),
  n(4, ["PR-9"], "x\\neq3", "curve-y", ["\\neq"]),
  x(5, ["PR-9"], "x\\approx3", "unknown-symbol"), // "Sorry, I don't understand the '≈' symbol."
  x(7, ["PR-9"], "\\text{hello}", "syntax"), // "Sorry, I don't understand this."
  x(8, ["PR-9"], "\\begin{matrix}1\\end{matrix}", "syntax"),
  n(9, ["PR-9"], "x\\simeq3", "curve-y", ["\\simeq"]),
  n(10, ["PR-9"], "y\\propto x", "value", ["\\propto"]),
  x(16, ["PR-9"], "T.score", "unsupported"),
  x(20, ["PR-9"], "\\sum_{n=1}^{3}n", "unsupported"),
  x(21, ["PR-9"], "\\prod_{n=1}^{3}n", "unsupported"),
  x(22, ["PR-9"], "\\int_{0}^{1}xdx", "unsupported"),
  x(23, ["PR-9", "FN-61"], "\\frac{d}{dx}", "derivative-operand"), // "What do you want to take the derivative of?"
  x(24, ["PR-9"], "f'(x)", "function-undefined"),
  x(25, ["PR-9"], "x\\operatorname{with}x=1", "unsupported"),
  x(26, ["PR-9"], "x>0\\operatorname{and}y>0", "unsupported"),
  x(27, ["PR-9"], "x>0\\operatorname{or}y>0", "unsupported"),
  // "'stats' requires a list. For example, try typing: stats([1,2,3])."
  x(28, ["PR-9"], "\\operatorname{stats}(1,2)", "requires-list"),
  x(29, ["PR-9"], "stats(1,2)", "requires-list"),
  n(32, ["PR-9"], "\\operatorname{foo}(x)", "curve-y", ["\\operatorname{foo}"]),
  x(33, ["PR-9"], "nthrootx", "unsupported"),
  x(54, ["PR-9", "NM-37"], "x\\operatorname{for}", "operator-side"),
  n(55, ["PR-11"], "\\omicron", "value", ["\\omicron"]),
  x(35, ["PR-38"], "\\frac{}{}", "fraction-empty"),
  x(36, ["PR-38"], "x^{}", "empty-superscript"),
  x(37, ["PR-38"], "\\sqrt{}", "empty-root"), // Desmos: "Radical cannot be empty."
  x(38, ["PR-38"], "2+", "operator-side"),
  x(39, ["PR-38"], "\\left(", "syntax"),
  x(40, ["PR-38"], "\\operatorname{}", "syntax"),
  x(41, ["PR-38"], "=", "operator-side"),
  x(42, ["PR-38"], ")", "unmatched"),
  x(43, ["PR-38"], "(x", "unmatched"),
  x(44, ["PR-38"], "x)", "unmatched"),
  x(45, ["PR-38"], "\\frac{1}", "syntax"),
  x(46, ["PR-38"], "x@y", "unknown-symbol"),
  x(47, ["PR-38"], "", "syntax"),
  x(48, ["PR-38"], "x_{}", "empty-subscript"),
  x(49, ["PR-38"], "\\text{}", "syntax"),
  x(50, ["PR-38"], "\\sqrt[]{x}", "empty-root-index"), // Desmos: "Radical index cannot be empty."
  x(51, ["NM-42", "PR-38"], `-${Array(500).fill("xy").join("+")}=2x`, "too-many-nodes"),
];
export default cases;
