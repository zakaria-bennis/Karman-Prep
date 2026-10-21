import type { CorpusCase, RowErrorCode } from "../types";

const FILE = "parse-operators";
const t = (
  n: number,
  rules: string[],
  latex: string,
  tree: string,
  rows?: string[]
): CorpusCase => ({ id: `${FILE}-${n}`, rules, input: { latex }, ...(rows ? { rows } : {}), tree });
const x = (n: number, rules: string[], latex: string, error: RowErrorCode): CorpusCase => ({
  id: `${FILE}-${n}`,
  rules,
  input: { latex },
  error,
});
const v = (
  n: number,
  rules: string[],
  latex: string,
  display: string,
  rows?: string[]
): CorpusCase => ({
  id: `${FILE}-${n}`,
  rules,
  input: { latex },
  ...(rows ? { rows } : {}),
  display,
});

const cases: CorpusCase[] = [
  t(1, ["PR-3"], "\\dfrac{1}{2}", "(div (num 1) (num 2))"),
  t(2, ["PR-3"], "\\tfrac{1}{2}", "(div (num 1) (num 2))"),
  t(3, ["PR-3"], "2\\times3", "(mul (num 2) (num 3))"),
  t(4, ["PR-3"], "6\\div2", "(div (num 6) (num 2))"),
  t(5, ["PR-3"], "\\left(x+1\\right)", "(add (id x) (num 1))"),
  t(6, ["PR-4"], "x²", "(pow (id x) (num 2))"),
  t(7, ["PR-4"], "3−2", "(sub (num 3) (num 2))"),
  t(8, ["PR-4"], "2×3", "(mul (num 2) (num 3))"),
  t(9, ["PR-4"], "x₁", "(id x_{1})"),
  // Desmos's percent needs `of`: "'%' must be used with 'of'. Try '25% of 12'." (2026-10-20)
  x(10, ["PR-7"], "44\\%", "percent-of"),
  x(11, ["PR-7"], "44%", "percent-of"),
  t(12, ["PR-7"], "p\\%\\operatorname{of}q", "(mul (pct (id p)) (id q))"),
  x(14, ["PR-7"], "\\operatorname{of}3", "operator-side"),
  t(13, ["PR-7"], "25\\%\\operatorname{of}80", "(mul (pct (num 25)) (num 80))"),
  // PR-8: as in Desmos, `\degree` is the name degree and `^{\circ}` a power of the name circ;
  // a raw ° is a symbol Desmos does not read (owner decision, 2026-10-21)
  t(15, ["PR-8"], "30^{\\circ}", "(pow (num 30) (id \\circ))"),
  t(16, ["PR-8"], "30^\\circ", "(pow (num 30) (id \\circ))"),
  x(17, ["PR-8"], "30°", "unknown-symbol"),
  t(18, ["PR-8"], "30\\degree", "(mul (num 30) (id \\degree))"),
  t(19, ["PR-16"], "1+2\\cdot3", "(add (num 1) (mul (num 2) (num 3)))"),
  t(20, ["PR-16"], "2\\cdot3^{2}", "(mul (num 2) (pow (num 3) (num 2)))"),
  t(23, ["PR-16"], "2*3", "(mul (num 2) (num 3))"),
  t(21, ["PR-16"], "1-2-3", "(sub (sub (num 1) (num 2)) (num 3))"),
  t(22, ["PR-16"], "6/2\\cdot3", "(mul (div (num 6) (num 2)) (num 3))"),
  t(25, ["PR-16"], "-2x", "(mul (neg (num 2)) (id x))"),
  t(24, ["PR-16"], "2\\cdot-3", "(mul (num 2) (neg (num 3)))"),
  t(49, ["PR-16"], "\\frac12", "(div (num 1) (num 2))"),
  t(50, ["PR-16"], "{x+1}2", "(mul (add (id x) (num 1)) (num 2))"),
  t(26, ["PR-17"], "-x^{2}", "(neg (pow (id x) (num 2)))"),
  t(27, ["PR-17"], "-2^{2}", "(neg (pow (num 2) (num 2)))"),
  t(28, ["PR-17"], "(-2)^{2}", "(pow (neg (num 2)) (num 2))"),
  t(29, ["PR-18"], "6\\div2(1+2)", "(mul (div (num 6) (num 2)) (add (num 1) (num 2)))"),
  t(30, ["PR-18"], "1/2x", "(mul (div (num 1) (num 2)) (id x))"),
  t(31, ["PR-18"], "\\frac{1}{2x}", "(div (num 1) (mul (num 2) (id x)))"),
  t(32, ["PR-18"], "6/2/3", "(div (div (num 6) (num 2)) (num 3))"),
  t(33, ["PR-19"], "x^{2}", "(pow (id x) (num 2))"),
  t(34, ["PR-19"], "x^23", "(mul (pow (id x) (num 2)) (num 3))"),
  t(35, ["PR-19"], "a^{b^{c}}", "(pow (id a) (pow (id b) (id c)))"),
  x(36, ["PR-19"], "a^b^c", "syntax"),
  x(37, ["PR-19"], "a^{b}^{c}", "syntax"),
  t(38, ["PR-19"], "x^{-1}", "(pow (id x) (neg (num 1)))"),
  t(39, ["PR-19"], "2^x", "(pow (num 2) (id x))"),
  t(40, ["PR-19"], "x^\\pi", "(pow (id x) (const pi))"),
  t(41, ["PR-20"], "x^{2}\\%\\operatorname{of}2", "(mul (pct (pow (id x) (num 2))) (num 2))"),
  t(42, ["PR-20"], "2x\\%\\operatorname{of}2", "(mul (mul (num 2) (pct (id x))) (num 2))"),
  x(43, ["PR-19", "PR-8"], "x^{2}^{\\circ}", "syntax"),
  t(44, ["PR-8"], "2x^{\\circ}", "(mul (num 2) (pow (id x) (id \\circ)))"),
  t(45, ["PR-27"], "\\sqrt{x}", "(root (id x))"),
  t(46, ["PR-27"], "\\sqrt[3]{x}", "(root (id x) (num 3))"),
  t(47, ["PR-27"], "\\sqrt2x", "(mul (root (num 2)) (id x))"),
  t(48, ["PR-27"], "\\sqrt(x+1)", "(root (add (id x) (num 1)))"),
  t(51, ["PR-21"], "\\left|x\\right|", "(abs (id x))"),
  // Desmos reads only `\\left|…\\right|` bars: a raw `|` is "Sorry, I don't understand the '|'
  // symbol." (captured 2026-10-20); the question dialect pairs raw bars before parsing.
  x(52, ["PR-21"], "|x|", "unknown-symbol"),
  x(53, ["PR-21"], "|x|-|y|", "unknown-symbol"),
  x(58, ["PR-21"], "|x", "unknown-symbol"),
  x(54, ["PR-21"], "||x|-1|", "unknown-symbol"),
  x(55, ["PR-21"], "2|x-3|", "unknown-symbol"),
  x(59, ["PR-21"], "\\left|x|", "syntax"),
  x(56, ["PR-21"], "|x||y|", "unknown-symbol"),
  t(57, ["PR-21"], "\\left|x-\\left|y\\right|\\right|", "(abs (sub (id x) (abs (id y))))"),
  x(67, ["PR-21"], "\\left|x|y|\\right|", "unknown-symbol"),
  t(60, ["PR-22"], "(1,2)", "(point (num 1) (num 2))"),
  t(61, ["PR-22"], "(x)", "(id x)"),
  t(62, ["PR-22"], "(a+1,b)", "(point (add (id a) (num 1)) (id b))"),
  x(64, ["PR-22"], "(1,2,3)", "point-3d"), // Desmos: "This calculator cannot plot a 3d point."
  t(63, ["PR-22"], "\\left(1,2\\right)", "(point (num 1) (num 2))"),
  x(65, ["PR-22"], "1,2", "point-syntax"), // Desmos: "Points are written like this: (1, 2)."
  x(66, ["PR-22"], "(,)", "operator-side"), // Desmos: "…on both sides of the ',' symbol."
  x(68, ["PR-22"], "{1,2}", "point-syntax"), // Desmos: "Points are written like this: (1, 2)."
  x(69, ["PR-22"], "{1,2,3}", "point-syntax"),
  v(70, ["PR-7"], "44\\%\\operatorname{of}1", "0.44"),
  v(71, ["PR-7"], "25\\%\\operatorname{of}80", "20"),
  v(72, ["PR-7"], "p\\%\\operatorname{of}q", "20", ["p=25", "q=80"]),
  v(73, ["PR-17"], "-2^{2}", "-4"),
  v(74, ["PR-17"], "(-2)^{2}", "4"),
  v(75, ["PR-18"], "6\\div2(1+2)", "9"),
  v(76, ["PR-18"], "1/2a", "2", ["a=4"]),
  v(77, ["PR-15"], "\\tau", "6.28318530718"),
  v(78, ["PR-15"], "e", "2.71828182846"),
  // Factorial (NM-15, PR-17, PR-20), moved here from parse-errors 11 to 15 when it shipped
  t(79, ["NM-15"], "3!", "(fact (num 3))"),
  t(80, ["PR-20"], "x^{2}!", "(fact (pow (id x) (num 2)))"),
  t(81, ["PR-20"], "2x!", "(mul (num 2) (fact (id x)))"),
  t(82, ["PR-17"], "-3!", "(neg (fact (num 3)))"),
  t(83, ["PR-20"], "3!^{2}", "(pow (fact (num 3)) (num 2))"),
  t(84, ["NM-15"], "(-1)!", "(fact (neg (num 1)))"),
  v(85, ["NM-15"], "3!", "6"),
  v(86, ["PR-17"], "-3!", "-6"),
  v(87, ["PR-20"], "3!^{2}", "36"),
  v(88, ["NM-15"], "0.5!", "0.886226925453"),
  v(89, ["NM-15"], "171!", "undefined"),
  v(90, ["NM-15"], "(-1)!", "undefined"),
  v(91, ["NM-15"], "0!", "1"),
  v(92, ["NM-15", "FN-79"], "2.5!", "3.32335097045"),
  v(93, ["NM-15", "FN-79"], "170!", "7.25741561531×10^306"),
  v(94, ["PR-20", "NM-15"], "a!", "24", ["a=4"]),
  // NM-32: factorial applies element by element to a list, as other one-operand operators do
  {
    id: "parse-operators-95",
    rules: ["NM-15", "NM-32"],
    input: { latex: "[0,1,2,3]!" },
    display: "[1, 1, 2, 6]",
  },
];
export default cases;
