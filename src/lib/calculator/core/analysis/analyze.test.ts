import { expect, it } from "vitest";
import { analyzeRows, userFunctionNames, type AnalysisSettings } from "./index";
import { parseLatex, toSExpr } from "../latex/index";

const REAL = { angleMode: "radians", complex: false } as const;
const CX = { ...REAL, complex: true } as const;
const src = (l: string[]) => l.map((latex, k) => ({ id: `r${k}`, latex, hidden: false }));
const analyze = (l: string[], s: AnalysisSettings = REAL) => analyzeRows(src(l), s);

it("RC-4 a function definition reports its name, parameters and body", () => {
  const r = analyze(["g(a,b)=a+b"]),
    body = r.functions.get("g")?.body;
  expect([r.rows[0].defines, body && toSExpr(body)]).toEqual([
    { name: "g", type: "function", params: ["a", "b"] },
    "(add (id a) (id b))",
  ]);
});

it("RC-6 a dependent definition joins functions with no parameters and never parses as a call", () => {
  const r = analyze(["a=2x", "b=3", "f(x)=x+1"]),
    helper = parseLatex("a(x+1)", { userFunctions: userFunctionNames(r.functions) });
  expect([
    r.functions.get("a")?.params,
    r.functions.has("b"),
    userFunctionNames(r.functions),
  ]).toEqual([[], false, new Set(["f"])]);
  expect(r.rows[1].defines).toEqual({ name: "b", type: "value", params: [] });
  expect(helper.ok && toSExpr(helper.tree)).toBe("(mul (id a) (add (id x) (num 1)))");
});

it("RC-10 uses lists every referenced name in first-appearance order", () =>
  expect(analyze(["c=1", "b+a+c+b"]).rows[1].uses).toEqual(["b", "a", "c"]));

it("NM-17 in real mode i is an ordinary undefined name, as in Desmos (owner decision, 2026-10-21)", () => {
  expect(analyze(["2i"]).rows[0]).toMatchObject({ chips: ["i"], asksForEquation: true });
  expect(analyze(["i"]).rows[0]).toMatchObject({ chips: ["i"], asksForEquation: true });
  expect(analyze(["i=3", "2i"]).rows[1].chips).toEqual([]);
  expect(analyze(["2i"], CX).rows[0].chips).toEqual([]);
});
