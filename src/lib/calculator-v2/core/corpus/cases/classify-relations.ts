import type { CorpusCase, RowErrorCode, RowKind } from "../types";

const FILE = "classify-relations";
type Context = Pick<CorpusCase, "rows" | "settings">;
/** A row of `kind` with its RC-10 chips in order (none listed: `[]`). */
const k = (
  n: number,
  rules: string[],
  latex: string,
  kind: RowKind,
  chips: string[] = [],
  context: Context = {}
): CorpusCase => ({ id: `${FILE}-${n}`, rules, input: { latex }, ...context, kind, chips });
/** A row of kind `error` with the row error `error`. */
const x = (
  n: number,
  rules: string[],
  latex: string,
  error: RowErrorCode,
  context: Context = {}
): CorpusCase => ({
  id: `${FILE}-${n}`,
  rules,
  input: { latex },
  ...context,
  kind: "error",
  error,
});

const cases: CorpusCase[] = [
  k(1, ["PR-42", "RC-11"], "y=2x+3", "curve-y"),
  k(2, ["PR-42", "RC-11"], "x=y^{2}", "curve-x"),
  k(3, ["RC-11"], "2x+3=y", "curve-y"),
  k(4, ["RC-11"], "y=a", "horizontal-lines", [], { rows: ["a=3"] }),
  k(5, ["RC-6", "RC-11"], "y=a", "curve-y", [], { rows: ["a=2x"] }),
  k(6, ["RC-6", "RC-11"], "y=a(x+1)", "curve-y", [], { rows: ["a=2x"] }),
  k(7, ["RC-3", "RC-4", "RC-11"], "y=x(x+1)", "curve-y", [], { rows: ["x(t)=t"] }),
  k(8, ["RC-11", "RC-19"], "y=5", "horizontal-lines"),
  k(9, ["RC-11", "RC-19"], "x=-3", "vertical-lines"),
  k(10, ["RC-12"], "2x+3y=12", "implicit"),
  k(11, ["RC-12"], "2x+5=17", "vertical-lines"),
  k(12, ["PR-42", "RC-12"], "x^{2}+y^{2}=25", "implicit"),
  k(13, ["PR-42", "RC-12"], "x^{2}=4", "vertical-lines"),
  k(14, ["PR-42", "RC-12"], "y^{2}=9", "horizontal-lines"),
  k(15, ["PR-42", "RC-12"], "y-1=2(x+3)", "implicit"),
  k(16, ["PR-42", "RC-12"], "2x+3y=6", "implicit"),
  k(17, ["PR-42", "RC-12"], "(x-2)^{2}+(y+1)^{2}=9", "implicit"),
  k(18, ["RC-13"], "3p+4=19", "unsolved-relation", ["p"]),
  k(19, ["RC-13"], "3p+4<19", "unsolved-relation", ["p"]),
  k(20, ["RC-13"], "3p+4>19", "unsolved-relation", ["p"]),
  k(21, ["RC-14"], "y>2x+1", "region"),
  k(22, ["RC-14"], "x\\le3", "region"),
  k(23, ["RC-14"], "2<3", "constant-relation"),
  k(24, ["RC-14"], "3>2", "constant-relation"),
  k(25, ["RC-14"], "2=3", "constant-relation"),
  k(26, ["PR-42", "RC-14"], "1<y<3", "region"),
  k(27, ["PR-42", "RC-14"], "y\\le2x+1", "region"),
  k(28, ["PR-42", "RC-14"], "-2\\le x<5", "region"),
  k(29, ["PR-42", "RC-14"], "y>x", "region"),
  k(30, ["PR-42", "RC-14"], "y<-x+4", "region"),
  k(31, ["RC-10", "RC-11"], "y=ax+b", "curve-y", ["a", "b"]),
  k(32, ["RC-10", "RC-14"], "y>ax", "region", ["a"]),
  k(33, ["PR-42", "RC-11"], "y=2(x-3)^{2}+1", "curve-y"),
  k(34, ["PR-42", "RC-11"], "y=(x-1)(x+3)", "curve-y"),
  k(35, ["PR-42", "RC-11"], "y=x^{2}+2x-3", "curve-y"),
  k(36, ["PR-42", "RC-11"], "y=(1.20)^{x/4}", "curve-y"),
  k(37, ["PR-42", "RC-11"], "y=\\left|x-3\\right|", "curve-y"),
  k(38, ["PR-42", "RC-11"], "y=\\sqrt{x-3}+2", "curve-y"),
  k(39, ["PR-42", "RC-11"], "y=\\frac{x^{2}-1}{x-1}", "curve-y"),
  k(40, ["PR-42", "RC-11"], "y=-x+7", "curve-y"),
  k(41, ["PR-42", "RC-4", "RC-5"], "P(t)=500(1.03)^{t}", "function-definition"),
  k(42, ["PR-42", "RC-4", "RC-5"], "f(x)=3x-2", "function-definition"),
  k(43, ["PR-42", "RC-4", "RC-5"], "f(4)", "value", [], { rows: ["f(x)=3x-2"] }),
  k(44, ["RC-5"], "h(y)=y+1", "function-definition"),
  x(45, ["RC-2"], "r=2\\sin\\theta", "unsupported"),
  x(46, ["RC-2"], "y=A", "unsupported", { rows: ["A=\\pi r^{2}"] }),
];
export default cases;
