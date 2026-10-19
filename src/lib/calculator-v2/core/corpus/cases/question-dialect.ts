// Question-dialect cases (TR-7, PR-1, PR-5, PR-6, PR-44): question math as a question shows it,
// compared on its TR-7 output by src/lib/calculator-transfer/question-dialect.corpus.test.ts;
// t() cases are typed twins routed to 02's and 04's runners. Relative imports only.

import type { CorpusCase } from "../types";

type Expected = Omit<CorpusCase, "id" | "rules" | "input" | "rows" | "settings">;
const q = (
  n: number,
  rules: string[],
  question: string,
  expect: Expected,
  extra?: { context?: "cell" | "coordinate"; rows?: string[] }
): CorpusCase => ({
  id: `question-dialect-${n}`,
  rules,
  input: extra?.context ? { question, context: extra.context } : { question },
  ...(extra?.rows ? { rows: extra.rows } : {}),
  ...expect,
});
const t = (n: number, rules: string[], latex: string, expect: Expected): CorpusCase => ({
  id: `question-dialect-${n}`,
  rules,
  input: { latex },
  ...expect,
});

const cases: CorpusCase[] = [
  q(1, ["TR-7", "PR-1"], "−3x+2", {
    latex: "-3x+2",
    tree: "(add (mul (neg (num 3)) (id x)) (num 2))",
    kind: "curve-y",
  }),
  q(2, ["TR-7", "PR-1"], "5–x", { latex: "5-x", tree: "(sub (num 5) (id x))" }),
  q(3, ["TR-7", "PR-1"], "3\\times4", {
    latex: "3\\cdot4",
    tree: "(mul (num 3) (num 4))",
    display: "12",
  }),
  q(4, ["TR-7", "PR-1"], "2×5", {
    latex: "2\\cdot5",
    tree: "(mul (num 2) (num 5))",
    display: "10",
  }),
  q(5, ["TR-7", "PR-1"], "4·x", { latex: "4\\cdot x", tree: "(mul (num 4) (id x))" }),
  q(6, ["TR-7", "PR-1"], "8÷2", { latex: "8\\div2", tree: "(div (num 8) (num 2))", display: "4" }),
  q(7, ["TR-7", "PR-1"], "\\dfrac{1}{2}x", {
    latex: "\\frac{1}{2}x",
    tree: "(mul (div (num 1) (num 2)) (id x))",
  }),
  q(8, ["TR-7", "PR-1", "PR-44"], "\\tfrac{3}{4}", {
    latex: "\\frac{3}{4}",
    tree: "(div (num 3) (num 4))",
    kind: "value",
    display: "0.75",
  }),
  q(9, ["TR-7", "PR-1"], "x\\leq5", {
    latex: "x\\le5",
    tree: "(rel <= (id x) (num 5))",
    kind: "region",
  }),
  q(10, ["TR-7", "PR-1"], "y\\geq2x", {
    latex: "y\\ge2x",
    tree: "(rel >= (id y) (mul (num 2) (id x)))",
    kind: "region",
  }),
  q(11, ["TR-7", "PR-1", "PR-44"], "x≤3", {
    latex: "x\\le3",
    tree: "(rel <= (id x) (num 3))",
    kind: "region",
  }),
  q(12, ["TR-7", "PR-1"], "y≥x", { latex: "y\\ge x", tree: "(rel >= (id y) (id x))" }),
  q(13, ["TR-7", "PR-1"], "\\displaystyle\\frac{1}{2}", {
    latex: "\\frac{1}{2}",
    tree: "(div (num 1) (num 2))",
  }),
  q(14, ["TR-7", "PR-1"], "\\big(x+1\\big)", { latex: "(x+1)", tree: "(add (id x) (num 1))" }),
  q(15, ["TR-7", "PR-1"], "2\\,x\\;+\\:1\\!", {
    latex: "2x+1",
    tree: "(add (mul (num 2) (id x)) (num 1))",
  }),
  q(16, ["TR-7", "PR-1"], "x\\text{ }=\\text{ }5", {
    latex: "x=5",
    tree: "(rel = (id x) (num 5))",
    kind: "vertical-lines",
  }),
  q(17, ["TR-7", "PR-5"], "30{,}000", { latex: "30000", tree: "(num 30000)", display: "30000" }),
  q(18, ["PR-5"], "1{,}250", { latex: "1250", tree: "(num 1250)", display: "1250" }),
  q(19, ["PR-5"], "(1,250)", {
    latex: "(1,250)",
    tree: "(point (num 1) (num 250))",
    kind: "point",
  }),
  q(20, ["TR-7", "PR-1"], "y=x²", {
    latex: "y=x^{2}",
    tree: "(rel = (id y) (pow (id x) (num 2)))",
    kind: "curve-y",
  }),
  q(21, ["TR-7"], "x³", { latex: "x^{3}", tree: "(pow (id x) (num 3))" }),
  q(22, ["TR-7", "TR-77"], "2πr", {
    latex: "2\\pi r",
    tree: "(mul (mul (num 2) (const pi)) (id r))",
    error: "unsupported",
  }),
  q(23, ["TR-7", "TR-77"], "2θ", {
    latex: "2\\theta",
    tree: "(mul (num 2) (id \\theta))",
    error: "unsupported",
  }),
  q(24, ["TR-7", "PR-1"], "√(x+1)", {
    latex: "\\sqrt{x+1}",
    tree: "(root (add (id x) (num 1)))",
    kind: "curve-y",
  }),
  q(25, ["TR-7", "PR-1"], "3/4", {
    latex: "\\frac{3}{4}",
    tree: "(div (num 3) (num 4))",
    display: "0.75",
  }),
  q(26, ["TR-7", "PR-1"], "0.\\overline{3}", {
    latex: "\\frac{1}{3}",
    tree: "(div (num 1) (num 3))",
    display: "0.333333333333",
  }),
  q(27, ["TR-7"], "0.1\\overline{6}", { latex: "\\frac{1}{6}", display: "0.166666666667" }),
  q(28, ["TR-7"], "1.\\overline{3}", { latex: "\\frac{4}{3}", display: "1.33333333333" }),
  q(29, ["TR-7"], "0.\\overline{9}", { latex: "1", tree: "(num 1)" }),
  q(30, ["TR-7", "PR-44"], "0.\\overline{3}x", {
    latex: "\\frac{1}{3}x",
    tree: "(mul (div (num 1) (num 3)) (id x))",
    kind: "curve-y",
  }),
  q(31, ["TR-7", "PR-1"], "|x-3|", {
    latex: "\\left|x-3\\right|",
    tree: "(abs (sub (id x) (num 3)))",
    kind: "curve-y",
  }),
  q(32, ["TR-7"], "2|x|+1", {
    latex: "2\\left|x\\right|+1",
    tree: "(add (mul (num 2) (abs (id x))) (num 1))",
  }),
  q(33, ["TR-7"], "y=2x+3.", { latex: "y=2x+3", kind: "curve-y" }),
  q(34, ["TR-7"], "x=5,", { latex: "x=5" }),
  q(35, ["TR-7"], "x>4;", { latex: "x>4", kind: "region" }),
  q(36, ["TR-7", "TR-28", "PR-6"], "2 1/2", {
    latex: "\\left(2+\\frac{1}{2}\\right)",
    tree: "(add (num 2) (div (num 1) (num 2)))",
    display: "2.5",
  }),
  q(37, ["TR-28", "PR-6", "PR-44"], "2\\frac{1}{2}", {
    latex: "\\left(2+\\frac{1}{2}\\right)",
    tree: "(add (num 2) (div (num 1) (num 2)))",
    kind: "value",
    display: "2.5",
  }),
  q(38, ["TR-28", "PR-6"], "-2\\frac{1}{2}", {
    latex: "-\\left(2+\\frac{1}{2}\\right)",
    tree: "(neg (add (num 2) (div (num 1) (num 2))))",
    display: "-2.5",
  }),
  q(39, ["TR-28", "PR-6"], "x+3\\frac{1}{4}", {
    latex: "x+\\left(3+\\frac{1}{4}\\right)",
    tree: "(add (id x) (add (num 3) (div (num 1) (num 4))))",
  }),
  q(
    40,
    ["TR-28", "PR-6", "PR-1"],
    "2\\frac{1}{2}",
    { latex: "\\frac{5}{2}", tree: "(div (num 5) (num 2))", display: "2.5" },
    { context: "cell" }
  ),
  q(
    41,
    ["TR-28", "PR-6"],
    "-2\\frac{1}{2}",
    { latex: "-\\frac{5}{2}", tree: "(neg (div (num 5) (num 2)))", display: "-2.5" },
    { context: "coordinate" }
  ),
  q(42, ["PR-6"], "2\\frac{3}{2}", {
    latex: "2\\frac{3}{2}",
    tree: "(mul (num 2) (div (num 3) (num 2)))",
    display: "3",
  }),
  q(43, ["PR-6"], "2.5\\frac{1}{2}", {
    latex: "2.5\\frac{1}{2}",
    tree: "(mul (num 2.5) (div (num 1) (num 2)))",
    display: "1.25",
  }),
  t(44, ["PR-6"], "2\\frac{1}{2}", { tree: "(mul (num 2) (div (num 1) (num 2)))", display: "1" }),
  q(45, ["PR-44", "TR-11", "TR-26"], "y=2x+3", {
    latex: "y=2x+3",
    tree: "(rel = (id y) (add (mul (num 2) (id x)) (num 3)))",
    kind: "curve-y",
  }),
  q(46, ["PR-44", "TR-13"], "P(t)=500(1.03)^{t}", {
    tree: "(rel = (call P (id t)) (mul (num 500) (pow (num 1.03) (id t))))",
    kind: "function-definition",
  }),
  q(47, ["PR-44", "TR-13", "TR-26"], "3p+4=19", {
    tree: "(rel = (add (mul (num 3) (id p)) (num 4)) (num 19))",
    kind: "unsolved-relation",
    chips: ["p"],
  }),
  q(48, ["PR-44", "TR-11"], "2x", { tree: "(mul (num 2) (id x))", kind: "curve-y" }),
  q(49, ["PR-44", "TR-11"], "\\sqrt{50}", {
    tree: "(root (num 50))",
    kind: "value",
    display: "7.07106781187",
  }),
  q(50, ["PR-44", "TR-11"], "2^{10}", {
    tree: "(pow (num 2) (num 10))",
    kind: "value",
    display: "1024",
  }),
  q(51, ["PR-44", "TR-11", "TR-26"], "y>2x+1", {
    tree: "(rel > (id y) (add (mul (num 2) (id x)) (num 1)))",
    kind: "region",
  }),
  q(52, ["PR-44", "TR-11"], "-2<x\\le5", {
    tree: "(rel (< <=) (neg (num 2)) (id x) (num 5))",
    kind: "region",
  }),
  q(53, ["PR-44", "TR-11"], "y\\le-x+4", {
    tree: "(rel <= (id y) (add (neg (id x)) (num 4)))",
    kind: "region",
  }),
  q(54, ["PR-44", "TR-11", "TR-26"], "3p+4>19", {
    tree: "(rel > (add (mul (num 3) (id p)) (num 4)) (num 19))",
    kind: "unsolved-relation",
    chips: ["p"],
  }),
  q(55, ["PR-44", "TR-14"], "(x-2)^2+(y+1)^2=9", {
    tree: "(rel = (add (pow (sub (id x) (num 2)) (num 2)) (pow (add (id y) (num 1)) (num 2))) (num 9))",
    kind: "implicit",
  }),
  q(56, ["PR-44", "TR-13"], "C=8h+15", {
    tree: "(rel = (id C) (add (mul (num 8) (id h)) (num 15)))",
    kind: "definition",
    chips: ["h"],
  }),
  q(57, ["PR-44", "TR-26"], "3>2", { tree: "(rel > (num 3) (num 2))", kind: "constant-relation" }),
  q(58, ["PR-44", "TR-12"], "y=2x", {
    tree: "(rel = (id y) (mul (num 2) (id x)))",
    kind: "curve-y",
  }),
  q(59, ["PR-44", "TR-12"], "y=x+1", {
    tree: "(rel = (id y) (add (id x) (num 1)))",
    kind: "curve-y",
  }),
  q(60, ["PR-44", "TR-12"], "y\\ge x^{2}", {
    tree: "(rel >= (id y) (pow (id x) (num 2)))",
    kind: "region",
  }),
  q(61, ["PR-44", "TR-12"], "y<4", { tree: "(rel < (id y) (num 4))", kind: "region" }),
  q(62, ["PR-44", "TR-77"], "A=\\pi r^{2}", {
    tree: "(rel = (id A) (mul (const pi) (pow (id r) (num 2))))",
    kind: "dependent-definition",
  }),
  q(
    63,
    ["PR-44", "TR-37"],
    "g(x)=f(x)+3",
    { tree: "(rel = (call g (id x)) (add (call f (id x)) (num 3)))", kind: "function-definition" },
    { rows: ["f(x)=x^{2}"] }
  ),
  q(64, ["PR-44", "TR-37"], "f(x)=x^{2}", {
    tree: "(rel = (call f (id x)) (pow (id x) (num 2)))",
    kind: "function-definition",
  }),
  q(65, ["PR-44", "TR-12"], "2x+y=5", {
    tree: "(rel = (add (mul (num 2) (id x)) (id y)) (num 5))",
    kind: "implicit",
  }),
  q(66, ["PR-44", "TR-12"], "x-y=1", {
    tree: "(rel = (sub (id x) (id y)) (num 1))",
    kind: "implicit",
  }),
  q(67, ["PR-44", "TR-14"], "x^{2}+y^{2}=25", {
    tree: "(rel = (add (pow (id x) (num 2)) (pow (id y) (num 2))) (num 25))",
    kind: "implicit",
  }),
  q(68, ["PR-44", "TR-13"], "2x+3y=6", {
    tree: "(rel = (add (mul (num 2) (id x)) (mul (num 3) (id y))) (num 6))",
    kind: "implicit",
  }),
  q(69, ["PR-44", "TR-13"], "y=2(x-3)^{2}+1", {
    tree: "(rel = (id y) (add (mul (num 2) (pow (sub (id x) (num 3)) (num 2))) (num 1)))",
    kind: "curve-y",
  }),
  q(
    70,
    ["PR-44", "TR-37"],
    "y=kx+1",
    { tree: "(rel = (id y) (add (mul (id k) (id x)) (num 1)))", kind: "curve-y" },
    { rows: ["k=3"] }
  ),
  q(71, ["PR-44", "TR-37"], "k=3", { tree: "(rel = (id k) (num 3))", kind: "definition" }),
  q(72, ["PR-44", "TR-18"], "y=a(x+3)", {
    tree: "(rel = (id y) (mul (id a) (add (id x) (num 3))))",
    kind: "curve-y",
    chips: ["a"],
  }),
  q(
    73,
    ["PR-44", "TR-37"],
    "y=f(x)+1",
    { tree: "(rel = (id y) (add (call f (id x)) (num 1)))", kind: "curve-y" },
    { rows: ["f(x)=x^{2}"] }
  ),
  q(74, ["PR-44", "TR-36"], "x_{1}=2", { tree: "(rel = (id x_{1}) (num 2))", kind: "definition" }),
  q(75, ["PR-44", "TR-11"], "1<y<3", {
    tree: "(rel (< <) (num 1) (id y) (num 3))",
    kind: "region",
  }),
  q(76, ["PR-44", "TR-12"], "y=2x+1", {
    tree: "(rel = (id y) (add (mul (num 2) (id x)) (num 1)))",
    kind: "curve-y",
  }),
  q(77, ["PR-44", "TR-12"], "y>x", { tree: "(rel > (id y) (id x))", kind: "region" }),
  q(78, ["PR-44", "TR-77"], "C=2\\pi r", {
    tree: "(rel = (id C) (mul (mul (num 2) (const pi)) (id r)))",
    kind: "dependent-definition",
  }),
  q(
    79,
    ["PR-44", "TR-37"],
    "y=f(x)+2",
    { tree: "(rel = (id y) (add (call f (id x)) (num 2)))", kind: "curve-y" },
    { rows: ["f(x)=x^{2}"] }
  ),
  q(80, ["PR-44", "TR-37"], "y=kx", {
    tree: "(rel = (id y) (mul (id k) (id x)))",
    kind: "curve-y",
    chips: ["k"],
  }),
  q(81, ["PR-44", "TR-40"], "y = 2x + 3", {
    latex: "y = 2x + 3",
    tree: "(rel = (id y) (add (mul (num 2) (id x)) (num 3)))",
    kind: "curve-y",
  }),
  q(82, ["PR-44", "TR-1"], "f(x) = \\dfrac{1}{2}(x + 11)", {
    latex: "f(x) = \\frac{1}{2}(x + 11)",
    tree: "(rel = (call f (id x)) (mul (div (num 1) (num 2)) (add (id x) (num 11))))",
    kind: "function-definition",
  }),
  q(83, ["PR-44", "TR-10"], "x", { tree: "(id x)", kind: "curve-y" }),
  q(84, ["PR-44", "TR-10"], "5", { tree: "(num 5)", kind: "value", display: "5" }),
  q(85, ["PR-44", "TR-10"], "-5", { tree: "(neg (num 5))", kind: "value", display: "-5" }),
  q(86, ["PR-44", "TR-10"], "3.25", { tree: "(num 3.25)", kind: "value", display: "3.25" }),
  q(87, ["PR-44", "TR-10"], "x_{1}", { tree: "(id x_{1})", kind: "value", chips: ["x_{1}"] }),
  q(88, ["PR-44", "TR-10"], "a_{n}", { tree: "(id a_{n})", kind: "value", chips: ["a_{n}"] }),
  q(89, ["PR-44", "TR-10"], "x^{2}", { tree: "(pow (id x) (num 2))", kind: "curve-y" }),
  q(90, ["PR-44", "TR-10"], "x^{-1}", { tree: "(pow (id x) (neg (num 1)))", kind: "curve-y" }),
  q(91, ["PR-44", "TR-10"], "f(x)", { tree: "(mul (id f) (id x))", kind: "curve-y", chips: ["f"] }),
  q(92, ["PR-44", "TR-10"], "x^{\\frac{1}{2}}", {
    latex: "x^{\\frac{1}{2}}",
    tree: "(pow (id x) (div (num 1) (num 2)))",
    kind: "curve-y",
  }),
  q(93, ["PR-44", "TR-10"], "y^{-\\frac{2}{3}}", {
    latex: "y^{-\\frac{2}{3}}",
    tree: "(pow (id y) (neg (div (num 2) (num 3))))",
    kind: "curve-x",
  }),
];
export default cases;
