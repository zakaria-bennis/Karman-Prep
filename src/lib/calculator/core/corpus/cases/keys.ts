import type { CorpusCase } from "../types";

// PR-36 keystroke cases, compared by the runner in tests/calculator/math-field.spec.ts on the
// real MathField. One keys element per typed character; longer elements are MathQuill key names
// (Left, Right, Up, Down, Backspace, Del, Home, End, Shift-Left, Shift-Right). latex is the
// field's latex(); tree, when present, is toSExpr of parseLatex(latex). Cases without a tree do
// not parse in Phase 1 (PR-9 unsupported, or a bare relation or name).
const FILE = "keys";
const k = (
  n: number,
  rules: string[],
  keys: string[],
  latex: string,
  tree?: string
): CorpusCase => ({
  id: `${FILE}-${n}`,
  rules,
  input: { keys },
  latex,
  ...(tree !== undefined ? { tree } : {}),
});

const cases: CorpusCase[] = [
  k(
    1,
    ["PR-36", "T-2"],
    ["y", "=", "x", "^", "2", "Right", "+", "3", "/", "4"],
    "y=x^{2}+\\frac{3}{4}",
    "(rel = (id y) (add (pow (id x) (num 2)) (div (num 3) (num 4))))"
  ),
  k(
    2,
    ["PR-36", "T-6"],
    ["x", "^", "2", "+", "1"],
    "x^{2+1}", // founder, 2026-10-26: arithmetic stays in the exponent (Desmos leaves it)
    "(pow (id x) (add (num 2) (num 1)))"
  ),
  k(3, ["PR-36", "T-1"], ["e", "^", "-", "x"], "e^{-x}", "(pow (const e) (neg (id x)))"),
  k(
    4,
    ["PR-36", "T-2"],
    ["3", "x", "/", "4"],
    "\\frac{3x}{4}",
    "(div (mul (num 3) (id x)) (num 4))"
  ),
  k(
    5,
    ["PR-36", "T-3"],
    ["y", "=", "s", "q", "r", "t", "x", "Right", "+", "p", "i"],
    "y=\\sqrt{x}+\\pi",
    "(rel = (id y) (add (root (id x)) (const pi)))"
  ),
  k(6, ["PR-36", "T-4"], ["x", "1"], "x_{1}", "(id x_{1})"),
  k(7, ["PR-36", "T-4"], ["<", "="], "\\le"),
  k(8, ["PR-36", "T-3"], ["s", "i", "n", "x"], "\\sin x", "(call sin (id x))"),
  k(9, ["PR-36"], ["m", "x"], "mx", "(mul (id m) (id x))"),
  // OI-27: T-4 subscripts the digit after e, and e_{3} is an ordinary identifier (PR-15)
  k(10, ["PR-36", "T-4"], ["2", "e", "3"], "2e_{3}", "(mul (num 2) (id e_{3}))"),
  k(11, ["T-1"], ["x", "^", "-", "1"], "x^{-1}", "(pow (id x) (neg (num 1)))"),
  k(12, ["T-1"], ["x", "^", "2", "Right", "y"], "x^{2}y", "(mul (pow (id x) (num 2)) (id y))"),
  k(
    13,
    ["T-2"],
    ["1", "+", "2", "/", "3"],
    "1+\\frac{2}{3}",
    "(add (num 1) (div (num 2) (num 3)))"
  ),
  k(14, ["T-3"], ["c", "b", "r", "t", "x"], "\\sqrt[3]{x}", "(root (id x) (num 3))"),
  k(
    15,
    ["T-3"],
    ["n", "t", "h", "r", "o", "o", "t", "4", "Right", "x"],
    "\\sqrt[4]{x}",
    "(root (id x) (num 4))"
  ),
  k(16, ["T-3"], ["t", "h", "e", "t", "a"], "\\theta", "(id \\theta)"),
  k(17, ["T-3"], ["t", "a", "u"], "\\tau", "(const tau)"),
  k(18, ["T-3"], ["p", "h", "i"], "\\phi", "(id \\phi)"),
  k(19, ["T-3"], ["i", "n", "f", "i", "n", "i", "t", "y"], "\\infty"),
  k(20, ["T-3"], ["i", "n", "f", "t", "y"], "\\infty"),
  k(21, ["T-3"], ["s", "u", "m", "n", "=", "1", "Up", "5", "Right", "n"], "\\sum_{n=1}^{5}n"),
  k(22, ["T-3"], ["p", "r", "o", "d", "n", "=", "1", "Up", "5", "Right", "n"], "\\prod_{n=1}^{5}n"),
  k(23, ["T-3"], ["i", "n", "t", "0", "Up", "1", "Right", "x"], "\\int_{0}^{1}x"),
  k(24, ["T-4"], ["x", "<", "=", "1"], "x\\le1", "(rel <= (id x) (num 1))"),
  k(25, ["T-4"], ["x", ">", "=", "1"], "x\\ge1", "(rel >= (id x) (num 1))"),
  k(26, ["T-4"], ["a", "_", "1", "2"], "a_{12}", "(id a_{12})"),
  k(27, ["T-4"], ["a", "1", "2"], "a_{12}", "(id a_{12})"),
  k(28, ["T-4"], ["v", "_", "m", "a", "x"], "v_{max}", "(id v_{max})"),
  k(29, ["T-6"], ["x", "^", "2", "-", "1"], "x^{2-1}", "(pow (id x) (sub (num 2) (num 1)))"), // founder, 2026-10-26
  k(30, ["T-6"], ["x", "^", "2", "=", "1"], "x^{2}=1", "(rel = (pow (id x) (num 2)) (num 1))"),
  k(31, ["T-6"], ["x", "^", "2", "<", "1"], "x^{2}<1", "(rel < (pow (id x) (num 2)) (num 1))"),
  k(32, ["T-6"], ["x", "^", "2", ">", "1"], "x^{2}>1", "(rel > (pow (id x) (num 2)) (num 1))"),
  // `~` and `,` stay in the exponent, as on live Desmos (2026-10-22): its break-out set is +-=<>*
  k(33, ["T-6"], ["x", "^", "2", "~", "1"], "x^{2}\\sim1"), // founder, 2026-10-26: ~ leaves as = does
  k(34, ["T-6", "T-8"], ["(", "x", "^", "2", ",", "1"], "\\left(x^{2,1}\\right)"),
  k(35, ["T-6"], ["a", "_", "2", "+", "1"], "a_{2+1}"), // founder, 2026-10-26: + stays in
  k(36, ["T-6"], ["x", "^", "+", "1"], "x^{+1}"),
  k(37, ["T-7"], ["2", "*", "3"], "2\\cdot3", "(mul (num 2) (num 3))"),
  k(38, ["T-7"], ["y", "~", "x"], "y\\sim x"),
  // typing % writes Desmos's "% of" as one unit, the caret after it (live Desmos, 2026-10-22)
  k(39, ["T-7"], ["5", "%", "4", "0"], "5\\%\\operatorname{of}40", "(mul (pct (num 5)) (num 40))"),
  k(
    40,
    ["T-7", "PR-34"],
    ["[", "1", ".", ".", ".", "5"],
    "\\left[1\\ldots5\\right]",
    "(range (num 1) (num 5))"
  ),
  k(
    41,
    ["T-7", "PR-34"],
    ["[", "1", ",", "2", ",", ".", ".", ".", ",", "5"],
    "\\left[1,2,\\ldots,5\\right]",
    "(range (num 1) (num 2) (num 5))"
  ),
  k(42, ["T-7"], ["1", ".", ".", "."], "1..."),
  k(43, ["T-8"], ["(", "x"], "\\left(x\\right)", "(id x)"),
  k(44, ["T-8"], ["(", "x", ")", "+", "1"], "\\left(x\\right)+1", "(add (id x) (num 1))"),
  k(45, ["T-8"], ["[", "x"], "\\left[x\\right]"),
  k(46, ["T-8"], ["{", "x"], "\\left\\{x\\right\\}"),
  k(47, ["T-8"], ["|", "x", "|", "+", "1"], "\\left|x\\right|+1", "(add (abs (id x)) (num 1))"),
  k(48, ["T-8"], ["(", "1", ",", "2", "]"], "\\left(\\left[1,2\\right]\\right)"),
  k(49, ["T-8"], ["[", "1", ",", "2", ")"], "\\left[\\left(1,2\\right)\\right]"),
  k(50, ["T-9"], ["s", "i", "n"], "\\sin"),
  k(51, ["T-9"], ["l", "n"], "\\ln"),
  // T-2's own example with no arrow: + stays in the exponent (founder, 2026-10-26; Desmos leaves)
  k(
    52,
    ["T-2", "T-6"],
    ["y", "=", "x", "^", "2", "+", "3", "/", "4"],
    "y=x^{2+\\frac{3}{4}}",
    "(rel = (id y) (pow (id x) (add (num 2) (div (num 3) (num 4)))))"
  ),
  // the caret stays in the denominator after / (the typed half of PR-18)
  k(53, ["T-2"], ["1", "/", "2", "x"], "\\frac{1}{2x}", "(div (num 1) (mul (num 2) (id x)))"),
  k(54, ["T-8"], ["[", "x", "]", "+", "1"], "\\left[x\\right]+1"),
  k(55, ["T-8"], ["{", "x", "}", "+", "1"], "\\left\\{x\\right\\}+1"),
  // an operator name that contains the auto-command int (patch 0009)
  k(56, ["T-3"], ["m", "i", "d", "p", "o", "i", "n", "t"], "\\operatorname{midpoint}"),
];
export default cases;
