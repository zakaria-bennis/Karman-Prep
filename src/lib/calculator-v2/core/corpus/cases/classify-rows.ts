import type { CorpusCase, CorpusSettings, RowErrorCode, RowKind } from "../types";

const FILE = "classify-rows";
const CX: CorpusSettings = { complex: true };
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
  { id: `${FILE}-1`, rules: ["RC-2"], input: { latex: "" }, kind: "empty" },
  x(2, ["RC-2"], "y_{1}\\sim mx_{1}+b", "unsupported"),
  k(3, ["RC-2"], "3+4", "value"),
  k(4, ["RC-1"], "A+a", "value", ["a"], { rows: ["A=3"] }),
  k(5, ["RC-1"], "A+a", "value", [], { rows: ["A=3", "a=4"] }),
  k(6, ["RC-10"], "b+a+b", "value", ["b", "a"]),
  k(7, ["RC-10"], "a_{1}+2", "value", ["a_{1}"]),
  k(8, ["RC-10"], "f(2)", "value", ["f"]),
  k(9, ["PR-15", "RC-10"], "2e_{3}", "value", ["e_{3}"]),
  k(10, ["NM-17"], "2i", "value", ["i"]),
  k(11, ["NM-17"], "i+a", "value", ["i", "a"]),
  k(12, ["NM-17"], "2i", "value", [], { rows: ["i=3"] }),
  k(13, ["NM-17"], "2i", "value", [], { settings: CX }),
  x(14, ["RC-3", "RC-19"], "e=2", "reserved-name"),
  x(15, ["RC-3", "RC-19"], "\\pi=3", "reserved-name"),
  k(16, ["RC-3", "RC-19"], "i=2", "definition"),
  k(17, ["RC-3", "RC-19"], "t+1", "value", ["t"]),
  x(18, ["RC-3", "RC-19"], "i=2", "reserved-name", { settings: CX }),
  k(19, ["RC-2", "RC-19"], "t=2", "definition"),
  x(20, ["RC-2", "RC-19"], "r=2", "unsupported"),
  x(21, ["RC-2", "RC-19"], "\\theta=1", "unsupported"),
  k(22, ["RC-15"], "(1,2)", "point"),
  k(23, ["RC-15"], "(a,2)", "point", [], { rows: ["a=3"] }),
  k(24, ["RC-15"], "(a,b)", "point", ["a", "b"]),
  x(25, ["RC-15"], "(x,2)", "point-coordinates"),
  x(26, ["RC-15"], "(1,y)", "point-coordinates"),
  x(27, ["RC-15"], "(a,1)", "point-coordinates", { rows: ["a=2x"] }),
  x(28, ["RC-2"], "(t,t^{2})", "unsupported"),
  k(29, ["RC-19"], "(t,t^{2})", "point", [], { rows: ["t=2"] }),
  k(30, ["RC-17"], "x^{2}", "curve-y"),
  k(31, ["RC-17"], "y^{2}+1", "curve-x"),
  x(32, ["RC-17"], "x+y", "mixed-variables"),
  x(33, ["RC-17"], "2\\pi r", "unsupported"),
  x(34, ["RC-17"], "\\sin\\theta", "unsupported"),
  k(35, ["RC-10", "RC-17"], "a(x-h)^{2}+k", "curve-y", ["a", "h", "k"]),
];
export default cases;
