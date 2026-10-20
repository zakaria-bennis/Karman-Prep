import type { CorpusCase, RowErrorCode } from "../types";

const FILE = "parse-literals";
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

const cases: CorpusCase[] = [
  t(1, ["PR-10"], "12", "(num 12)"),
  t(2, ["PR-10"], "0.5", "(num 0.5)"),
  t(3, ["PR-10"], ".5", "(num 0.5)"),
  t(4, ["PR-10"], "5.", "(num 5)"),
  t(5, ["PR-10"], "2 3", "(num 23)"),
  t(6, ["PR-10"], "-5", "(neg (num 5))"),
  t(7, ["PR-10"], "2e3", "(mul (mul (num 2) (const e)) (num 3))"),
  x(8, ["PR-10"], "1.2.3", "adjacent-numbers"),
  t(34, ["PR-10"], "2\\pi", "(mul (num 2) (const pi))"),
  t(9, ["PR-11"], "A", "(id A)"),
  t(10, ["PR-11"], "a", "(id a)"),
  t(11, ["PR-11"], "a_{1}", "(id a_{1})"),
  t(12, ["PR-11"], "a_1", "(id a_{1})"),
  t(13, ["PR-11"], "a_{01}", "(id a_{01})"),
  t(14, ["PR-11"], "v_{max}", "(id v_{max})"),
  t(15, ["PR-11"], "x_{12}", "(id x_{12})"),
  t(16, ["PR-11"], "\\alpha", "(id \\alpha)"),
  t(17, ["PR-11"], "\\alpha_{2}", "(id \\alpha_{2})"),
  x(18, ["PR-11"], "x_{1+2}", "invalid-subscript"),
  x(19, ["PR-11"], "\\Delta", "unsupported"),
  t(20, ["PR-14"], "x1", "(id x_{1})"),
  t(21, ["PR-14"], "a12", "(id a_{12})"),
  t(22, ["PR-14"], "2x1", "(mul (num 2) (id x_{1}))"),
  t(23, ["PR-14"], "x 1", "(mul (id x) (num 1))"),
  t(24, ["PR-14"], "x1.5", "(mul (id x) (num 1.5))"),
  t(25, ["PR-15"], "e", "(const e)"),
  t(26, ["PR-15"], "\\pi", "(const pi)"),
  t(27, ["PR-15"], "\\tau", "(const tau)"),
  t(28, ["PR-15"], "i", "(id i)"),
  t(29, ["PR-15"], "\\theta", "(id \\theta)"),
  t(30, ["PR-15"], "E", "(id E)"),
  t(31, ["PR-15"], "e_{3}", "(id e_{3})"),
  t(32, ["PR-15"], "2e_{3}", "(mul (num 2) (id e_{3}))"),
  t(33, ["PR-15", "PR-14"], "e3", "(mul (const e) (num 3))"),
  t(35, ["PR-39", "PR-40", "PR-41"], "x_{1}", "(id x_{1})"),
];
export default cases;
