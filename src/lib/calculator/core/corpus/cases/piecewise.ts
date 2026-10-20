// PR-31, PR-32 piecewise braces and restrictions, NM-41 conditions (Desmos, captured 2026-10-19).
import type { CorpusCase, RowErrorCode, RowKind } from "../types";

const FILE = "piecewise";
type Context = Pick<CorpusCase, "rows" | "settings">;
/** A row whose parse tree is `tree` and whose printLatex output is `latex`. */
const t = (n: number, rules: string[], input: string, tree: string, latex: string): CorpusCase => ({
  id: `${FILE}-${n}`,
  rules,
  input: { latex: input },
  tree,
  latex,
});
/** A row of `kind` with no chips. */
const k = (n: number, rules: string[], latex: string, kind: RowKind): CorpusCase => ({
  id: `${FILE}-${n}`,
  rules,
  input: { latex },
  kind,
  chips: [],
});
/** A row whose value formatValue shows as `display`. */
const d = (
  n: number,
  rules: string[],
  latex: string,
  display: string,
  context: Context = {}
): CorpusCase => ({ id: `${FILE}-${n}`, rules, input: { latex }, ...context, display });
/** A row whose parse or row error is `error`. */
const x = (n: number, rules: string[], latex: string, error: RowErrorCode): CorpusCase => ({
  id: `${FILE}-${n}`,
  rules,
  input: { latex },
  error,
});

const IF_X = "(if (rel > (id x) (num 0))";

const cases: CorpusCase[] = [
  t(
    1,
    ["PR-31"],
    "\\left\\{x>0:x,-x\\right\\}",
    `(piecewise ${IF_X} (id x)) (neg (id x)))`,
    "\\left\\{x>0:x,-x\\right\\}"
  ),
  t(2, ["PR-31"], "\\{x>0\\}", `(piecewise ${IF_X}))`, "\\left\\{x>0\\right\\}"),
  t(3, ["PR-31"], "\\left\\{\\right\\}", "(piecewise)", "\\left\\{\\right\\}"),
  // a bare condition before a part is a part of its own whose value is 1, as in Desmos
  t(
    4,
    ["PR-31"],
    "\\{1>0,2<1:4\\}",
    "(piecewise (if (rel > (num 1) (num 0))) (if (rel < (num 2) (num 1)) (num 4)))",
    "\\left\\{1>0,2<1:4\\right\\}"
  ),
  t(
    5,
    ["PR-31", "PR-29"],
    "\\{0<x\\le2:1\\}",
    "(piecewise (if (rel (< <=) (num 0) (id x) (num 2)) (num 1)))",
    "\\left\\{0<x\\le2:1\\right\\}"
  ),
  // PR-32: a restriction multiplies what it follows, and several chain as products
  t(
    6,
    ["PR-32"],
    "y=x^{2}\\{x>0\\}",
    `(rel = (id y) (mul (pow (id x) (num 2)) (piecewise ${IF_X}))))`,
    "y=x^{2}\\left\\{x>0\\right\\}"
  ),
  t(
    7,
    ["PR-32"],
    "y=x\\{x>0\\}\\{x<1\\}",
    `(rel = (id y) (mul (mul (id x) (piecewise ${IF_X}))) (piecewise (if (rel < (id x) (num 1))))))`,
    "y=x\\left\\{x>0\\right\\}\\left\\{x<1\\right\\}"
  ),
  d(8, ["PR-31"], "\\{1>0:5,7\\}", "5"),
  d(9, ["PR-31"], "\\{1<0:5,7\\}", "7"),
  d(10, ["PR-31"], "\\{1<0:5\\}", "undefined"),
  d(11, ["PR-31"], "\\{\\}", "1"),
  d(12, ["PR-31", "NM-33"], "\\{[1,2,3]>1:4,9\\}", "[9, 4, 4]"),
  d(13, ["PR-31", "NM-33"], "\\{[1,2]>1:[5,6],0\\}", "[0, 6]"),
  d(14, ["PR-31", "NM-41"], "\\{a=1:5,6\\}", "5", { rows: ["a=1"] }),
  d(15, ["PR-32"], "5\\{a<0\\}", "undefined", { rows: ["a=1"] }),
  d(16, ["PR-32"], "f(-1)", "undefined", { rows: ["f(x)=x\\{x>0\\}"] }),
  d(17, ["PR-31", "NM-31"], "L[\\{L>3\\}]", "[5, undefined, 5, undefined]", {
    rows: ["L=[5,3,8,1]"],
  }),
  k(18, ["PR-32", "G-2"], "y=x\\{0<x<2\\}", "curve-y"),
  k(19, ["PR-31", "G-2"], "\\{x<0:-1,x>0:1\\}", "curve-y"),
  k(20, ["PR-32", "G-2"], "x^{2}+y^{2}=1\\{x>0\\}", "implicit"),
  k(21, ["PR-32", "G-2"], "y>x\\{x>0\\}", "region"),
  k(22, ["PR-32", "G-2"], "x=2\\{y>0\\}", "curve-x"),
  // Desmos's piecewise errors
  x(23, ["PR-31"], "\\{1<0:5,\\}", "comma-side"),
  x(24, ["PR-31"], "\\{1>0:\\}", "colon-side"),
  x(25, ["PR-31"], "\\{3:4\\}", "colon-condition"),
  x(26, ["PR-31"], "\\{5,6\\}", "piecewise-condition"),
  x(27, ["PR-32"], "y=x\\{x\\}", "piecewise-condition"),
  x(28, ["PR-31"], "\\{1>0:5,6,7\\}", "piecewise-part"),
  x(29, ["PR-31"], "\\{1>0:(1,2),3\\}", "piecewise-types"),
  x(30, ["PR-31"], "\\{x>0:1", "unmatched"),
];
export default cases;
