import type { CorpusCase, RowErrorCode } from "../types";

const FILE = "parse-relations";
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
  t(1, ["PR-29"], "x<y", "(rel < (id x) (id y))"),
  t(2, ["PR-29"], "x\\ge3", "(rel >= (id x) (num 3))"),
  t(3, ["PR-29"], "x\\le3", "(rel <= (id x) (num 3))"),
  t(6, ["PR-29"], "x<=3", "(rel <= (id x) (num 3))"),
  t(7, ["PR-29"], "0\\le x<10", "(rel (<= <) (num 0) (id x) (num 10))"),
  t(8, ["PR-29"], "3>x>1", "(rel (> >) (num 3) (id x) (num 1))"),
  t(9, ["PR-29"], "y=2x", "(rel = (id y) (mul (num 2) (id x)))"),
  x(10, ["PR-29", "RC-14"], "a<x>b", "double-direction"),
  x(11, ["PR-29"], "x=y<3", "relation-chain"),
  x(12, ["PR-29", "RC-14"], "x=y=3", "chained-equation"),
  x(24, ["PR-29"], "x=>1", "relation-side"),
  x(25, ["PR-29"], "1==1", "relation-side"),
  x(26, ["PR-29", "RC-14"], "x<1<2", "double-inequality"),
  x(27, ["PR-29", "RC-14"], "0<x<y<3", "long-chain"),
  t(28, ["PR-29"], "1=1=1", "(rel (= =) (num 1) (num 1) (num 1))"),
  t(29, ["PR-29"], "3<4>1", "(rel (< >) (num 3) (num 4) (num 1))"),
  x(14, ["PR-29"], "=3", "operator-side"),
  x(15, ["PR-29"], "x=", "operator-side"),
  x(16, ["PR-29"], "(x<1)", "inequality-here"),
  t(4, ["PR-29", "PR-3"], "x\\leq3", "(rel <= (id x) (num 3))"),
  t(13, ["PR-29", "PR-3"], "x\\gt1", "(rel > (id x) (num 1))"),
  t(5, ["PR-29", "PR-4"], "x≥3", "(rel >= (id x) (num 3))"),
  t(17, ["PR-30"], "y_{1}\\sim mx_{1}+b", "(sim (id y_{1}) (add (mul (id m) (id x_{1})) (id b)))"),
  t(18, ["PR-30"], "y\\sim x", "(sim (id y) (id x))"),
  t(19, ["PR-30"], "y~x", "(sim (id y) (id x))"),
  x(20, ["PR-30"], "y\\sim x\\sim2", "unexpected-symbol"),
  x(21, ["PR-30"], "(y\\sim x)", "unexpected-symbol"),
  x(22, ["PR-30"], "y=x\\sim2", "unexpected-symbol"),
  x(23, ["PR-30"], "y\\sim x=2", "unexpected-symbol"),
];
export default cases;
