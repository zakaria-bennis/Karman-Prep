// PR-34 list syntax and NM-32 to NM-38 list meaning (calculator v2 lists package, 2026-10-18).
import type { CorpusCase, RowErrorCode } from "../types";

const FILE = "lists";
type Context = Pick<CorpusCase, "rows" | "settings">;
/** A row whose parse tree is `tree`. */
const t = (n: number, rules: string[], latex: string, tree: string): CorpusCase => ({
  id: `${FILE}-${n}`,
  rules,
  input: { latex },
  tree,
});
/** A row whose parse or row error is `error`. */
const x = (
  n: number,
  rules: string[],
  latex: string,
  error: RowErrorCode,
  context: Context = {}
): CorpusCase => ({ id: `${FILE}-${n}`, rules, input: { latex }, ...context, error });

const cases: CorpusCase[] = [
  t(1, ["PR-34"], "[1,2,3]", "(list (num 1) (num 2) (num 3))"),
  t(2, ["PR-34"], "\\left[\\right]", "(list)"),
  t(3, ["PR-34"], "\\left[1\\ldots5\\right]", "(range (num 1) (num 5))"),
  t(4, ["PR-34"], "\\left[1,2,\\ldots,5\\right]", "(range (num 1) (num 2) (num 5))"),
  t(5, ["PR-34"], "[0,0.1,...,1]", "(range (num 0) (num 0.1) (num 1))"),
  t(6, ["PR-34"], "x_{1}=[1...10]", "(rel = (id x_{1}) (range (num 1) (num 10)))"),
  t(
    7,
    ["PR-34"],
    "[x_{1},x_{1}]\\sim[y_{1},y_{1}]",
    "(sim (list (id x_{1}) (id x_{1})) (list (id y_{1}) (id y_{1})))"
  ),
  t(8, ["PR-34"], "2[1,2]", "(mul (num 2) (list (num 1) (num 2)))"),
  t(9, ["PR-34"], "(L_{1},L_{2})", "(point (id L_{1}) (id L_{2}))"),
  x(10, ["PR-34"], "[1...]", "syntax"),
  x(11, ["PR-34"], "[1,2,3,...,10]", "syntax"),
  x(12, ["PR-34", "NM-30"], "L[2]", "unsupported"),
  x(13, ["PR-34", "NM-31"], "L[1...2]", "unsupported"),
  x(14, ["PR-34", "NM-31"], "L[L>2]", "unsupported"),
  x(15, ["PR-34", "NM-37"], "[n^{2}\\operatorname{for}n=[1...5]]", "unsupported"),
  x(16, ["PR-30"], "y_{1}\\sim", "sim-side"),
  x(17, ["PR-30"], "\\sim x_{1}", "sim-side"),
];
export default cases;
