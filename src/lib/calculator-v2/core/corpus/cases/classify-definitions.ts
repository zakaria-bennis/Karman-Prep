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
  x(13, ["RC-4"], "f(x,x)=x", "duplicate-definition"),
  k(14, ["RC-4"], "f(2)", "value", [], { rows: ["f(x,x)=x"] }),
  x(15, ["RC-3", "RC-4"], "x(t)=t", "reserved-name"),
];
export default cases;
