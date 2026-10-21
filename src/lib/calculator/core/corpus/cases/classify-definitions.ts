import type { CorpusCase, RowErrorCode, RowKind } from "../types";

const FILE = "classify-definitions";
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
  k(1, ["RC-2", "RC-4", "RC-6"], "a=3", "definition"),
  k(2, ["RC-2", "RC-4", "RC-6"], "f(x)=x^{2}", "function-definition"),
  k(3, ["RC-6"], "a=2x", "dependent-definition"),
  k(4, ["RC-6"], "A=\\pi r^{2}", "dependent-definition"),
  k(5, ["RC-6"], "P=(1,2)", "definition"),
  k(6, ["RC-6"], "b=a+1", "definition", [], { rows: ["a=2"] }),
  k(7, ["RC-6", "RC-17"], "C=2\\pi r", "dependent-definition"),
  k(8, ["RC-6", "RC-10"], "C=8h+15", "definition", ["h"]),
  k(9, ["RC-4"], "g(a,b)=a+b", "function-definition"),
  k(10, ["RC-4"], "f(t)=t+1", "function-definition"),
  k(11, ["RC-4"], "f(a)+a", "value", [], { rows: ["a=5", "f(a)=a+1"] }),
  x(12, ["RC-4"], "f(a,b,c,d,g,h,k,m,n)=a", "too-many-params"),
  x(13, ["RC-4"], "f(x,x)=x", "repeated-parameter"), // Desmos: "Cannot use 'x' for multiple parameters of this function."
  // Desmos repeats the head's error on every row that calls the function (captured 2026-10-20)
  x(14, ["RC-4"], "f(2)", "repeated-parameter", { rows: ["f(x,x)=x"] }),
  // Desmos, 2026-10-20: a reserved name written as a function head graphs its body; a name
  // defined twice marks only the rows that use it; `a=a+1` is an implicit equation
  k(15, ["RC-3", "RC-4"], "x(t)=t", "function-definition"),
  x(16, ["RC-7"], "a+1", "duplicate-definition", { rows: ["a=1", "a=2"] }),
  k(17, ["RC-7"], "a=1", "definition", [], { rows: ["a=2"] }),
  k(18, ["RC-7"], "f=2", "definition", [], { rows: ["f(x)=x"] }),
  x(19, ["RC-7"], "f(3)", "duplicate-definition", { rows: ["f(x)=x", "f=2"] }),
  x(20, ["RC-8"], "a=a+1", "implicit-variables"),
  x(21, ["RC-8"], "a=b", "cycle", { rows: ["b=a"] }),
  x(22, ["RC-8"], "f(x)=g(x)", "function-cycle", { rows: ["g(x)=f(x)"] }),
  x(23, ["RC-8"], "f(x)=f(x-1)", "recursive-cycle"),
  x(24, ["RC-8"], "c=a+1", "cycle", { rows: ["a=b", "b=a"] }),
  k(25, ["RC-9"], "a=2", "definition", [], { rows: ["y=a"] }),
  x(26, ["RC-20"], "\\sin(1,2)", "arity"),
  x(27, ["RC-20"], "f(1,2)", "arity", { rows: ["f(x)=x"] }),
  x(28, ["RC-20"], "g(1)", "arity", { rows: ["g(a,b)=a+b"] }),
  x(29, ["RC-20"], "\\arctan(1,2,3)", "arity"),
  k(30, ["RC-20"], "\\arctan(1,2)", "value"),
  k(31, ["RC-20"], "\\log_{2}(8)", "value"),
  k(32, ["G-6"], "y=f(x)+g(1,2)", "curve-y", [], { rows: ["f(x)=x^{2}", "g(a,b)=a+b"] }),
];
export default cases;
