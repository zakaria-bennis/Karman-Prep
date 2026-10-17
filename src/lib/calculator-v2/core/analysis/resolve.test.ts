import { expect, it } from "vitest";
import { analyzeRows, type AnalysisSettings } from "./index";

const REAL = { angleMode: "radians", complex: false } as const;
const src = (l: string[]) => l.map((latex, k) => ({ id: `r${k}`, latex, hidden: false }));
const analyze = (l: string[], s: AnalysisSettings = REAL) => analyzeRows(src(l), s);
const codes = (l: string[]) => analyze(l).rows.map((row) => row.error?.code ?? null);

it("RC-7 every defining row of a duplicated name errors and its users show dependency", () => {
  const d = "duplicate-definition";
  expect(codes(["a=1", "a=2", "a+1", "f(x)=x", "f=2", "f(3)"])).toEqual([
    d,
    d,
    "dependency",
    d,
    d,
    "dependency",
  ]);
  expect(analyze(["a=1", "a=2", "a+1"]).rows[2].error?.message).toBe(
    "a has more than one definition."
  );
});

it("RC-8 every row in a cycle errors, including recursion through functions", () => {
  expect([codes(["a=a+1"]), codes(["a=b", "b=a", "c=a+1"])]).toEqual([
    ["cycle"],
    ["cycle", "cycle", null],
  ]);
  expect(codes(["f(x)=g(x)", "g(x)=f(x)", "h(x)=h(x-1)"])).toEqual(["cycle", "cycle", "cycle"]);
  expect(analyze(["a=b", "b=a"]).rows[0].error?.message).toBe("a is defined in terms of itself.");
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
    ["sin", "1"],
    "sin takes 1 argument.",
    0,
  ]);
  expect(analyze(["f(x)=x", "f(1,2)"]).rows[1].error?.message).toBe("f takes 1 argument.");
  expect(analyze(["g(a,b)=a+b", "g(1)"]).rows[1].error?.message).toBe("g takes 2 arguments.");
  expect(analyze(["\\arctan(1,2,3)"]).rows[0].error?.message).toBe(
    "arctan takes 1 or 2 arguments."
  );
  expect(codes(["\\arctan(1,2)", "\\log_{2}(8)"])).toEqual([null, null]);
});
