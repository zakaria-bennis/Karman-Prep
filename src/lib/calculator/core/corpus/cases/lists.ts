// PR-34 list syntax and NM-32 to NM-38 list meaning (calculator lists package, 2026-10-18).
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
  t(8, ["PR-34", "NM-30"], "2[1,2]", "(index (num 2) (list (num 1) (num 2)))"), // Desmos indexes
  t(9, ["PR-34"], "(L_{1},L_{2})", "(point (id L_{1}) (id L_{2}))"),
  x(10, ["PR-34"], "[1...]", "range-bound"), // Desmos: "Range must have an upper and lower bound."
  // Desmos takes any number of values before and after the ellipsis (validateRangeLength).
  t(11, ["PR-34"], "[1,2,3,...,10]", "(range ((num 1) (num 2) (num 3)) ((num 10)))"),
  t(47, ["PR-34"], "[1,...,9,10]", "(range ((num 1)) ((num 9) (num 10)))"),
  t(12, ["PR-34", "NM-30"], "L[2]", "(index (id L) (num 2))"),
  t(13, ["PR-34", "NM-31"], "L[1...2]", "(index (id L) (range (num 1) (num 2)))"),
  t(14, ["PR-34", "NM-31"], "L[L>2]", "(index (id L) (rel > (id L) (num 2)))"),
  t(51, ["PR-34", "NM-30"], "[1,2][1]", "(index (list (num 1) (num 2)) (num 1))"),
  t(52, ["PR-34", "NM-30"], "L[[1,3]]", "(index (id L) (list (num 1) (num 3)))"),
  t(53, ["PR-34", "NM-30"], "L[1,3]", "(index (id L) (list (num 1) (num 3)))"),
  t(54, ["PR-34", "NM-31"], "L[2...]", "(index (id L) (range ((num 2)) ()))"),
  t(55, ["PR-34", "NM-31"], "L[...3]", "(index (id L) (range () ((num 3))))"),
  t(56, ["PR-34", "NM-31"], "L[L>3][1]", "(index (index (id L) (rel > (id L) (num 3))) (num 1))"),
  d(57, ["NM-30"], "L[2]", "3", { rows: ["L=[5,3,8,1]"] }),
  d(58, ["NM-30"], "L[1.6]", "5", { rows: ["L=[5,3,8,1]"] }), // Desmos rounds the index down
  d(59, ["NM-31"], "L[2...]", "[3, 8, 1]", { rows: ["L=[5,3,8,1]"] }),
  d(60, ["NM-31"], "L[L=3]", "[3]", { rows: ["L=[5,3,8,1]"] }),
  x(61, ["PR-34"], "L[]", "empty-brackets", { rows: ["L=[5,3,8,1]"] }),
  x(62, ["NM-30"], "5[1]", "index-type"), // Desmos: "Cannot index a number with a number."
  x(63, ["NM-31"], "L[L>x]", "list-length-free", { rows: ["L=[5,3,8,1]"] }),
  k(64, ["G-3", "NM-30"], "[(1,2),(3,4)][1]", "point"),
  x(15, ["PR-34", "NM-37"], "[n\\operatorname{for}n=[1,2],n]", "for-ambiguous"),
  x(16, ["PR-30"], "y_{1}\\sim", "sim-side"),
  x(17, ["PR-30"], "\\sim x_{1}", "sim-side"),
  d(18, ["NM-32"], "[1,2,3]+1", "[2, 3, 4]"),
  d(19, ["NM-32"], "2\\cdot[1,2,3]", "[2, 4, 6]"),
  d(20, ["NM-32"], "[1,2,3]^{2}", "[1, 4, 9]"),
  d(21, ["NM-32"], "\\sqrt{[4,9,16]}", "[2, 3, 4]"),
  d(22, ["NM-32"], "f(L)", "[2, 5, 10]", { rows: ["f(a)=a^{2}+1", "L=[1,2,3]"] }),
  d(23, ["NM-33"], "[1,2,3]+[10,20]", "[11, 22]"),
  d(24, ["NM-33", "G-3"], "(L_{1},L_{2})", "[(1, 4), (2, 5)]", {
    rows: ["L_{1}=[1,2,3]", "L_{2}=[4,5]"],
  }),
  d(25, ["NM-36"], "[0,0.1,...,1]", "[0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1]"),
  d(26, ["NM-36"], "[10...1]", "[10, 9, 8, 7, 6, 5, 4, 3, 2, 1]"),
  d(27, ["NM-36"], "[1...10.5]", "[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]"), // Desmos rounds the count
  d(28, ["NM-36"], "[1,3,...,10]", "[1, 3, 5, 7, 9, 11]"),
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
  x(48, ["NM-36"], "[1,2,4,...,10]", "range-step"), // a written value off the sequence
  d(49, ["NM-36"], "[1,2,3,...,6]", "[1, 2, 3, 4, 5, 6]"),
  d(50, ["NM-36"], "[1,1.1,...,1.25]", "[1, 1.1, 1.2, 1.3]"), // 2.5 steps exactly, rounded up
  x(29, ["NM-36"], "[1,2,...,0]", "range-step"), // Desmos: "Ranges must be arithmetic sequences."
  x(38, ["NM-34"], "[(L,1)]", "nested-list", { rows: ["L=[1,2]"] }),
  k(39, ["G-22"], "y=[1,2,3]x", "curve-y"), // three curves, as in Desmos
  k(40, ["G-22"], "y=Lx", "curve-y", { rows: ["L=[1,2]"] }),
  k(41, ["G-22"], "f(x)=[1,2]x", "function-definition"),
  k(42, ["G-3"], "(L_{1},L_{2})", "point", { rows: ["L_{1}=[1,2]", "L_{2}=[3,4]"] }),
  k(43, ["G-3"], "[(1,2),(3,4)]", "point"),
  k(44, ["D-22"], "y_{1}\\sim mx_{1}+b", "regression", {
    rows: ["x_{1}=[1,2,3]", "y_{1}=[3,5,7]"],
  }),
  k(45, ["NM-32"], "[1,2,3]+1", "value"),
  k(46, ["NM-32", "G-22"], "f(x)=x^{2}+L_{1}", "function-definition", { rows: ["L_{1}=[1,2]"] }),
  // FN-2, FN-23 to FN-29: statistics reducers and length (Desmos values, 2026-10-19)
  d(65, ["FN-23"], "\\operatorname{mean}(1,2)", "1.5"),
  d(66, ["FN-23", "PR-13"], "mean(1,2)", "1.5"),
  d(67, ["FN-23"], "\\max([1,2],5)", "[5, 5]"),
  d(68, ["FN-23"], "\\operatorname{total}([])", "0"),
  d(69, ["FN-23"], "\\operatorname{mean}([])", "undefined"),
  d(70, ["FN-27"], "\\operatorname{quartile}(L,[1,2,3])", "[2, 4, 6.5]", { rows: ["L=[5,3,8,1]"] }),
  d(71, ["FN-2"], "\\operatorname{length}(L)", "4", { rows: ["L=[5,3,8,1]"] }),
  k(72, ["FN-23"], "\\operatorname{mean}(L)", "value", { rows: ["L=[5,3,8,1]"] }),
  k(73, ["FN-23", "G-22"], "y=\\max(x,2)", "curve-y"),
  x(74, ["FN-23"], "\\operatorname{mean}()", "reducer-arguments"),
  x(75, ["FN-23"], "\\min()", "arity"),
  x(76, ["FN-27"], "\\operatorname{quantile}(5,0.5)", "first-argument-list"),
  x(77, ["FN-23"], "\\operatorname{median}(P)", "argument-type", { rows: ["P=[(1,2),(3,4)]"] }),
  x(78, ["FN-2"], "\\operatorname{length}(L,10)", "argument-type", { rows: ["L=[5,3,8,1]"] }),
  // FN-30 to FN-38: two-list statistics, list operations, argmin and argmax (Desmos, 2026-10-19)
  d(79, ["FN-36"], "\\operatorname{sort}(L)", "[1, 3, 5, 8]", { rows: ["L=[5,3,8,1]"] }),
  d(80, ["FN-30"], "\\operatorname{cov}([1,2,3],[2,4,7])", "2.5"),
  d(81, ["FN-35"], "\\operatorname{join}(1,[2,3],4)", "[1, 2, 3, 4]"),
  d(82, ["FN-34"], "\\operatorname{repeat}([1,2],[2,3])", "[1, 1, 2, 2, 2]"),
  d(83, ["FN-23"], "\\operatorname{argmax}([5,5,5])", "3"),
  x(84, ["FN-30"], "\\operatorname{cov}(1,2)", "both-lists"),
  x(85, ["FN-35"], "\\operatorname{join}(5)", "arity"),
  x(86, ["FN-36"], "\\operatorname{sort}(L,5)", "argument-type", { rows: ["L=[5,3,8,1]"] }),
  // FN-4: an elementary built-in of a point, "Function 'sin' cannot be applied to a point."
  x(87, ["FN-4"], "\\sin((1,2))", "argument-type"),
  x(88, ["FN-4"], "\\sqrt{P}", "argument-type", { rows: ["P=[(1,2),(3,4)]"] }),
];
export default cases;
