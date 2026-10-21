import { expect, it } from "vitest";
import { analyzeRows, type AnalysisSettings } from "./index";

const REAL = { angleMode: "radians", complex: false } as const;
const src = (l: string[]) => l.map((latex, k) => ({ id: `r${k}`, latex, hidden: false }));
const analyze = (l: string[], s: AnalysisSettings = REAL) => analyzeRows(src(l), s);
const codes = (l: string[]) => analyze(l).rows.map((row) => row.error?.code ?? null);

it("RC-7 only the rows that use a name defined twice error, as in Desmos (2026-10-20)", () => {
  const d = "duplicate-definition";
  expect(codes(["a=1", "a=2", "a+1", "f(x)=x", "f=2", "f(3)"])).toEqual([
    null,
    null,
    d,
    null,
    null,
    d,
  ]);
  expect(codes(["a=1", "a=2", "b=a", "b+1"])).toEqual([null, null, d, d]);
  expect(analyze(["a=1", "a=2", "a+1"]).rows[2].error?.message).toBe(
    "a is defined more than once."
  );
});

it("RC-8 every row in a cycle errors, and so does every row that uses one", () => {
  expect([codes(["a=a+1"]), codes(["a=b", "b=a", "c=a+1"])]).toEqual([
    ["implicit-variables"],
    ["cycle", "cycle", "cycle"],
  ]);
  expect(codes(["f(x)=g(x)", "g(x)=f(x)", "h(x)=h(x-1)"])).toEqual([
    "function-cycle",
    "function-cycle",
    "recursive-cycle",
  ]);
  expect(analyze(["a=b", "b=a"]).rows[0].error?.message).toBe(
    "a and b are defined using each other."
  );
});

it("RC-9 definitions resolve in any row order and hidden rows still define", () => {
  expect(analyze(["y=a", "a=2"]).rows[0]).toMatchObject({ kind: "horizontal-lines", chips: [] });
  expect(analyze(["f(2)", "f(x)=x^{2}"]).rows[0]).toMatchObject({ kind: "value", chips: [] });
  const hidden = analyzeRows(
    [
      { id: "h", latex: "a=3", hidden: true },
      { id: "u", latex: "a+1", hidden: false },
    ],
    REAL
  );
  expect(hidden.byId.get("u")?.chips).toEqual([]);
  expect(analyze(["c=b+1", "b=a+1", "a=1", "f(x)=cx"]).valueOrder).toEqual([
    "r2",
    "r1",
    "r0",
    "r3",
  ]);
});

it("RC-20 a call with the wrong number of arguments names the expected count", () => {
  const sin = analyze(["\\sin(1,2)"]).rows[0].error;
  expect([sin?.code, sin?.names, sin?.message, sin?.span?.start]).toEqual([
    "arity",
    ["sin", "1", "2"],
    "sin takes only 1 input, like sin(x).",
    0,
  ]);
  // A user function's arity error has Desmos's wording too (captured by the 2026-10-19 review),
  // and an empty f() is an arity error with no arguments, not a syntax error.
  const user = (rows: string[]) => analyze(rows).rows[rows.length - 1].error?.message;
  expect(user(["f(x)=x", "f(1,2)"])).toBe("f takes only 1 input, like f(x).");
  expect(user(["f(x)=x", "f()"])).toBe("f needs an input, like f(x).");
  for (const call of ["g(1)", "g(1,2,3)", "g()"]) {
    expect(user(["g(a,b)=a+b", call]), call).toBe("g needs 2 inputs, like g(1, 2).");
  }
  expect(analyze(["\\arctan(1,2,3)"]).rows[0].error?.message).toBe(
    "arctan needs 2 inputs, like arctan(1, 2)."
  );
  expect(codes(["\\arctan(1,2)", "\\log_{2}(8)"])).toEqual([null, null]);
});

it("RC-20 a built-in's arity error uses Desmos's wording (appendix F decision 2)", () => {
  const message = (latex: string) => analyze([latex]).rows[0].error?.message;
  expect([
    message("\\operatorname{floor}(2.7,1)"),
    message("\\operatorname{nCr}(5)"),
    message("\\operatorname{mod}(1,2,3)"),
    message("\\operatorname{round}(1,2,3)"),
    message("\\operatorname{nPr}(1,2,3)"),
    message("\\operatorname{nCr}(1,2,3,4)"),
    message("\\log(1,2,3)"),
  ]).toEqual([
    "floor takes only 1 input, like floor(x).",
    "nCr needs 2 inputs, like nCr(1, 2).",
    "mod needs 2 inputs, like mod(1, 2).",
    "round needs 2 inputs, like round(1, 2).",
    "nPr needs 2 inputs, like nPr(1, 2).",
    "nCr needs 2 inputs, like nCr(1, 2).",
    "log takes only 1 input, like log(x).",
  ]);
});
