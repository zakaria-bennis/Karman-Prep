import type { CorpusCase } from "../types";

const FILE = "sat-forms";
const t = (
  n: number,
  rules: string[],
  latex: string,
  tree: string,
  rows?: string[]
): CorpusCase => ({ id: `${FILE}-${n}`, rules, input: { latex }, ...(rows ? { rows } : {}), tree });
// Question-dialect twin of t: compared by the transfer-core runner.
const q = (
  n: number,
  rules: string[],
  question: string,
  tree: string,
  rows?: string[]
): CorpusCase => ({
  id: `${FILE}-${n}`,
  rules,
  input: { question },
  ...(rows ? { rows } : {}),
  tree,
});

const cases: CorpusCase[] = [
  t(1, ["PR-42"], "y=2x+3", "(rel = (id y) (add (mul (num 2) (id x)) (num 3)))"),
  t(2, ["PR-42"], "y-1=2(x+3)", "(rel = (sub (id y) (num 1)) (mul (num 2) (add (id x) (num 3))))"),
  t(3, ["PR-42"], "2x+3y=6", "(rel = (add (mul (num 2) (id x)) (mul (num 3) (id y))) (num 6))"),
  t(13, ["PR-42"], "y=x+2", "(rel = (id y) (add (id x) (num 2)))", ["y=2x+3"]),
  t(
    4,
    ["PR-42"],
    "y=2(x-3)^{2}+1",
    "(rel = (id y) (add (mul (num 2) (pow (sub (id x) (num 3)) (num 2))) (num 1)))"
  ),
  t(14, ["PR-42"], "y=x^{2}", "(rel = (id y) (pow (id x) (num 2)))", ["y=x+2"]),
  t(5, ["PR-42"], "y=(x-1)(x+3)", "(rel = (id y) (mul (sub (id x) (num 1)) (add (id x) (num 3))))"),
  t(12, ["PR-42"], "y=-x+4", "(rel = (id y) (add (neg (id x)) (num 4)))"),
  t(
    6,
    ["PR-42"],
    "y=x^{2}+2x-3",
    "(rel = (id y) (sub (add (pow (id x) (num 2)) (mul (num 2) (id x))) (num 3)))"
  ),
  t(
    7,
    ["PR-42"],
    "P(t)=500(1.03)^{t}",
    "(rel = (call P (id t)) (mul (num 500) (pow (num 1.03) (id t))))"
  ),
  t(8, ["PR-42"], "y=(1.20)^{x/4}", "(rel = (id y) (pow (num 1.2) (div (id x) (num 4))))"),
  t(9, ["PR-42"], "y=100(0.95)^{x}", "(rel = (id y) (mul (num 100) (pow (num 0.95) (id x))))"),
  t(10, ["PR-42"], "f(x)=3x-2", "(rel = (call f (id x)) (sub (mul (num 3) (id x)) (num 2)))"),
  t(11, ["PR-42"], "f(4)", "(call f (num 4))", ["f(x)=3x-2"]),
  t(
    16,
    ["PR-42"],
    "x^{2}+y^{2}=25",
    "(rel = (add (pow (id x) (num 2)) (pow (id y) (num 2))) (num 25))"
  ),
  t(
    15,
    ["PR-42"],
    "(x-2)^{2}+(y+1)^{2}=9",
    "(rel = (add (pow (sub (id x) (num 2)) (num 2)) (pow (add (id y) (num 1)) (num 2))) (num 9))"
  ),
  t(17, ["PR-42"], "y=\\left|x-3\\right|", "(rel = (id y) (abs (sub (id x) (num 3))))"),
  t(18, ["PR-42"], "y=\\sqrt{x+4}", "(rel = (id y) (root (add (id x) (num 4))))"),
  t(19, ["PR-42"], "y=\\frac{1}{x-2}", "(rel = (id y) (div (num 1) (sub (id x) (num 2))))"),
  t(21, ["PR-42"], "y>2x+1", "(rel > (id y) (add (mul (num 2) (id x)) (num 1)))"),
  t(
    20,
    ["PR-42"],
    "y=\\frac{x^{2}-4}{x-2}",
    "(rel = (id y) (div (sub (pow (id x) (num 2)) (num 4)) (sub (id x) (num 2))))"
  ),
  t(22, ["PR-42"], "y\\le2x+1", "(rel <= (id y) (add (mul (num 2) (id x)) (num 1)))", ["y<-2x+4"]),
  t(23, ["PR-42"], "-2<x\\le5", "(rel (< <=) (neg (num 2)) (id x) (num 5))"),
  t(24, ["PR-42"], "1<y<3", "(rel (< <) (num 1) (id y) (num 3))"),
  t(25, ["PR-42"], "y\\ge x-1", "(rel >= (id y) (sub (id x) (num 1)))"),
  t(27, ["PR-42"], "x=y^{2}", "(rel = (id x) (pow (id y) (num 2)))"),
  t(26, ["PR-42"], "y<-2x+4", "(rel < (id y) (add (mul (neg (num 2)) (id x)) (num 4)))"),
  t(28, ["PR-42"], "x^{2}=4", "(rel = (pow (id x) (num 2)) (num 4))"),
  t(29, ["PR-42"], "y^{2}=9", "(rel = (pow (id y) (num 2)) (num 9))"),
  t(30, ["PR-42"], "3>2", "(rel > (num 3) (num 2))"),
  t(31, ["PR-42"], "(2,3)", "(point (num 2) (num 3))"),
  t(32, ["PR-42"], "\\left(2+\\frac{1}{2}\\right)", "(add (num 2) (div (num 1) (num 2)))"),
  t(33, ["PR-42"], "25\\%\\operatorname{of}80", "(mul (pct (num 25)) (num 80))"),
  t(34, ["PR-42"], "\\sin(30^{\\circ})", "(call sin (deg (num 30)))"),
  t(38, ["PR-42"], "2x+5=17", "(rel = (add (mul (num 2) (id x)) (num 5)) (num 17))"),
  q(35, ["PR-42"], "2\\frac{1}{2}", "(add (num 2) (div (num 1) (num 2)))"),
  q(36, ["PR-42"], "25\\%", "(pct (num 25))"),
  q(37, ["PR-42"], "\\sin 30^{\\circ}", "(call sin (deg (num 30)))"),
];
export default cases;
