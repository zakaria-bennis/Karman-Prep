// PR-34 list syntax and NM-32 to NM-38 list meaning (calculator v2 lists package, 2026-10-18).
import type { CorpusCase, RowErrorCode, RowKind } from "../types";

const FILE = "lists";
type Context = Pick<CorpusCase, "rows" | "settings">;
/** A row whose parse tree is `tree`. */
const t = (n: number, rules: string[], latex: string, tree: string): CorpusCase => ({
  id: `${FILE}-${n}`,
  rules,
  input: { latex },
  tree,
});
/** A row of `kind` with its RC-10 chips in order (none listed: `[]`). */
const k = (
  n: number,
  rules: string[],
  latex: string,
  kind: RowKind,
  context: Context = {},
  chips: string[] = []
): CorpusCase => ({ id: `${FILE}-${n}`, rules, input: { latex }, ...context, kind, chips });
/** A row whose value formatValue shows as `display`. */
const d = (
  n: number,
  rules: string[],
  latex: string,
  display: string,
  context: Context = {}
): CorpusCase => ({ id: `${FILE}-${n}`, rules, input: { latex }, ...context, display });
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
  x(10, ["PR-34"], "[1...]", "range-bound"), // Desmos: "Range must have an upper and lower bound."
  x(11, ["PR-34"], "[1,2,3,...,10]", "syntax"),
  x(12, ["PR-34", "NM-30"], "L[2]", "unsupported"),
  x(13, ["PR-34", "NM-31"], "L[1...2]", "unsupported"),
  x(14, ["PR-34", "NM-31"], "L[L>2]", "unsupported"),
  x(15, ["PR-34", "NM-37"], "[n^{2}\\operatorname{for}n=[1...5]]", "unsupported"),
  x(16, ["PR-30"], "y_{1}\\sim", "sim-side"),
  x(17, ["PR-30"], "\\sim x_{1}", "sim-side"),
  d(18, ["NM-32"], "[1,2,3]+1", "[2, 3, 4]"),
  d(19, ["NM-32"], "2[1,2,3]", "[2, 4, 6]"),
  d(20, ["NM-32"], "[1,2,3]^{2}", "[1, 4, 9]"),
  d(21, ["NM-32"], "\\sqrt{[4,9,16]}", "[2, 3, 4]"),
  d(22, ["NM-32"], "f(L)", "[2, 5, 10]", { rows: ["f(a)=a^{2}+1", "L=[1,2,3]"] }),
  d(23, ["NM-33"], "[1,2,3]+[10,20]", "[11, 22]"),
  d(24, ["NM-33", "G-3"], "(L_{1},L_{2})", "[(1, 4), (2, 5)]", {
    rows: ["L_{1}=[1,2,3]", "L_{2}=[4,5]"],
  }),
  d(25, ["NM-36"], "[0,0.1,...,1]", "[0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1]"),
  d(26, ["NM-36"], "[10...1]", "[10, 9, 8, 7, 6, 5, 4, 3, 2, 1]"),
  d(27, ["NM-36"], "[1...10.5]", "[1, 2, 3, 4, 5, 6, 7, 8, 9, 10]"),
  d(28, ["NM-36"], "[1,3,...,10]", "[1, 3, 5, 7, 9]"),
  d(29, ["NM-36"], "[1,2,...,0]", "[]"),
  d(30, ["NM-38"], "[1...40]", `[${Array.from({ length: 30 }, (_, k) => k + 1).join(", ")}, …]`),
  d(31, ["RC-6"], "x_{1}=[1...5]", "[1, 2, 3, 4, 5]"),
  k(32, ["RC-6"], "x_{1}=[1...5]", "definition"),
  x(33, ["NM-34"], "[x_{1},x_{1}]\\sim[y_{1},y_{1}]", "nested-list", {
    rows: ["x_{1}=[1...10]", "y_{1}=[1...10]"],
  }),
  x(34, ["NM-34"], "[[1,2],3]", "nested-list"),
  x(35, ["NM-34"], "[1...L]", "nested-list", { rows: ["L=[1,2]"] }),
  x(36, ["NM-35", "NM-42"], "[1...10001]", "list-too-long"),
  x(37, ["NM-36"], "[1,1,...,5]", "range-step"),
  x(38, ["NM-34"], "[(L,1)]", "nested-list", { rows: ["L=[1,2]"] }),
  { ...x(39, ["G-22"], "y=[1,2,3]x", "unsupported"), kind: "error" }, // analysis, not parse
  x(40, ["G-22"], "y=Lx", "unsupported", { rows: ["L=[1,2]"] }),
  { ...x(41, ["G-22"], "f(x)=[1,2]x", "unsupported"), kind: "error" },
  k(42, ["G-3"], "(L_{1},L_{2})", "point", { rows: ["L_{1}=[1,2]", "L_{2}=[3,4]"] }),
  k(43, ["G-3"], "[(1,2),(3,4)]", "point"),
  k(44, ["D-22"], "y_{1}\\sim mx_{1}+b", "regression", {
    rows: ["x_{1}=[1,2,3]", "y_{1}=[3,5,7]"],
  }),
  k(45, ["NM-32"], "[1,2,3]+1", "value"),
  k(46, ["NM-32"], "f(x)=x^{2}+L_{1}", "error", { rows: ["L_{1}=[1,2]"] }),
];
export default cases;
