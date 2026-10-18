import { expect, it } from "vitest";
import { lexQuestionMath } from "./lex";
import { normalizeQuestionMath } from "./normalize";
import { classifySegment, SEGMENT_LIMITS, TRANSFER_PHASE } from "./segment";

const N = (s: string, c: "math" | "cell" | "coordinate" = "math") => normalizeQuestionMath(s, c);
const S = (l: string, role: "stem" | "choice" = "stem", fns: string[] = []) =>
  classifySegment(N(l), role, new Set(fns));
const verdict = (l: string, role: "stem" | "choice" = "stem", fns: string[] = []) => {
  const r = S(l, role, fns);
  return r.ok ? r.kind : r.rule;
};

it("TR-10 lone numbers, identifiers, numeric powers and bare function references get no control in the stem", () => {
  for (const s of [
    "x",
    "5",
    "-5",
    "+5",
    "3.25",
    ".5",
    "\\frac{3}{4}",
    "-\\frac{3}{4}",
    "2\\frac{1}{2}",
    "-2\\frac{1}{2}",
    "x_{1}",
    "a_n",
    "x^{2}",
    "x^2",
    "y^{-1}",
    // a numeric power is any TR-10 lone number: fractions of integers and mixed numbers too
    "x^{\\frac{1}{2}}",
    "y^{-\\frac{2}{3}}",
    "x^{2\\frac{1}{2}}",
    "f(x)",
    "g(t)",
    "h(x_{1})",
    "r",
    "\\theta",
  ])
    expect(verdict(s), s).toBe("TR-10");
  for (const s of [
    "2x",
    "\\sqrt{50}",
    "2^{10}",
    "-x",
    "x+1",
    "f(3)",
    "\\pi",
    // x^{y} uses x and y, so the core reports mixed-variables (TR-21); a non-numeric power is x^{a}
    "x^{a}",
    "\\frac{x}{2}",
  ])
    expect(verdict(s), s).toBe("expression");
});
it("TR-10 does not apply to a whole answer choice", () => {
  for (const s of [
    "x",
    "5",
    "\\frac{3}{4}",
    "2\\frac{1}{2}",
    "x^{2}",
    "x^{\\frac{1}{2}}",
    "y^{-\\frac{2}{3}}",
    "f(x)",
  ])
    expect(verdict(s, "choice"), s).toBe("expression");
});
it("TR-11 a segment is an expression, an equation or a same-direction inequality; other chains get no control", () => {
  const cases: [string, string][] = [
    ["2x+1", "expression"],
    ["y=2x+3", "equation"],
    ["3p+4=19", "equation"],
    ["y>2x+1", "inequality"],
    ["0\\le x<10", "inequality"],
    ["-2<x\\le5", "inequality"],
    ["5>y\\ge-1", "inequality"],
    ["3p+4>19", "inequality"],
    ["0<x>2", "TR-11"],
    ["x=y<3", "TR-11"],
    ["x<y=3", "TR-11"],
    ["x=y=3", "TR-11"],
    ["1<x\\ge0", "TR-11"],
  ];
  for (const [s, v] of cases) expect(verdict(s), s).toBe(v);
});
it("TR-11 relations below the top level and dangling operators are not well-formed forms", () => {
  for (const s of [
    "(x=2)",
    "\\frac{x<1}{2}",
    "2+",
    "=3",
    "x==2",
    "y=",
    "x^",
    "x^2^3",
    "\\sqrt{}",
    "\\frac{1}{}",
    "()",
    "(1,2,3)",
    "\\sin",
    "\\log_{2}",
    "x+\\left|y",
    "1,2",
  ])
    expect(verdict(s), s).toBe("TR-8");
});
it("TR-12 a cases, aligned, gathered or one-column array block is a system with one row per line and & removed", () => {
  const sys = (s: string) => {
    const r = S(s);
    return r.ok ? [r.kind, r.rows.map((w) => w.latex)] : r.rule;
  };
  expect(sys("\\begin{cases}y=2x\\\\y=x+1\\end{cases}")).toEqual(["system", ["y=2x", "y=x+1"]]);
  expect(sys("\\begin{aligned}2x+y&=5\\\\x-y&=1\\\\\\end{aligned}")).toEqual([
    "system",
    ["2x+y=5", "x-y=1"],
  ]);
  expect(sys("\\begin{gathered}y\\ge x^{2}\\\\y<4\\end{gathered}")).toEqual([
    "system",
    ["y\\ge x^{2}", "y<4"],
  ]);
  expect(sys("\\left\\{\\begin{array}{l}y=2x+1\\\\y>x\\end{array}\\right.")).toEqual([
    "system",
    ["y=2x+1", "y>x"],
  ]);
  expect(sys("\\begin{cases} y = 2x \\\\ y = x + 1 \\end{cases}")).toEqual([
    "system",
    ["y = 2x", "y = x + 1"],
  ]);
});
it("TR-12 every system line must be an equation or inequality passing every rule, and a piecewise definition gets no control", () => {
  const cases: [string, string][] = [
    ["\\begin{cases}y=2x\\\\2x\\end{cases}", "TR-12"],
    ["\\begin{cases}y=2x\\\\y\\ne3\\end{cases}", "TR-9"],
    ["\\begin{cases}y=2x\\\\0<y>2\\end{cases}", "TR-11"],
    ["f(x)=\\begin{cases}x&x<0\\\\2x&x\\ge0\\end{cases}", "TR-12"],
    ["\\begin{cases}y=2x\\end{cases}+1", "TR-12"],
    ["\\begin{cases}\\end{cases}", "TR-12"],
    ["\\begin{cases}y=\\sinh x\\\\y=1\\end{cases}", "TR-77"],
  ];
  for (const [s, v] of cases) expect(verdict(s), s).toBe(v);
});
it("TR-13 function definitions, variable definitions and other single equations are one row each", () => {
  const r = (s: string, fns: string[] = []) => {
    const v = S(s, "stem", fns);
    return v.ok ? [v.kind, v.rows.length, v.rows[0].defines] : v.rule;
  };
  expect(r("P(t)=500(1.03)^{t}")).toEqual([
    "function",
    1,
    { name: "P", type: "function", param: "t" },
  ]);
  expect(r("f_{1}(x)=x^{2}")).toEqual([
    "function",
    1,
    { name: "f_{1}", type: "function", param: "x" },
  ]);
  expect(r("C=8h+15")).toEqual(["equation", 1, { name: "C", type: "value", param: null }]);
  expect(r("3p+4=19")).toEqual(["equation", 1, null]);
  expect(r("y=2x+3")).toEqual(["equation", 1, null]);
  expect(r("g(x)=f(x,1)", ["f"])).toBe("TR-13");
  // the core's function head is a Latin letter (optionally subscripted) with one-letter parameters
  expect(r("\\alpha(x)=x")).toEqual(["equation", 1, null]);
  expect(r("f(x_{1})=x_{1}+1")).toEqual(["equation", 1, null]);
});
it("TR-14 circle equations are equations", () => {
  for (const s of ["(x-2)^2+(y+1)^2=9", "x^{2}+y^{2}=25", "(x+3)^{2}+y^{2}=\\frac{1}{4}"])
    expect(verdict(s), s).toBe("equation");
});
it("TR-18 a name before ( is a call only when it is a question function name", () => {
  const v = S("y=a(x+3)");
  expect(v.ok && [v.kind, v.rows[0].calls, v.rows[0].names]).toEqual([
    "equation",
    [],
    ["y", "a", "x"],
  ]);
  const w = S("y=a(x+3)", "stem", ["a"]);
  expect(w.ok && w.rows[0].calls).toEqual(["a"]);
  const g = S("g(x)=f(x+1)+f(2)", "stem", ["f"]);
  expect(g.ok && [g.kind, g.rows[0].calls, g.rows[0].names]).toEqual(["function", ["f"], []]);
});
it("TR-21 the classifier is narrowed wherever the v2 core reports a row error, with a 600-token cap standing in for the node limit", () => {
  for (const s of [
    "x+y",
    "e=2",
    "\\pi=3",
    "a=a+1",
    "(x,2)+1",
    "P=(1,y)",
    "f(r)=\\pi r^{2}",
    "f(x)=f(x-1)+1",
    // the core reserves x, y and e as function names
    "y(x)=x+1",
    "x(t)=t",
    "e(x)=x",
    "1+".repeat(1025) + "1", // 2,051 characters
    "1+".repeat(300) + "1", // 601 characters and 601 tokens: only the token cap rejects it
    "y=" + "(".repeat(65) + "x" + ")".repeat(65),
    "2^{".repeat(65) + "1" + "}".repeat(65),
    "y=\\sqrt{" + "\\frac{1}{".repeat(64) + "x" + "}".repeat(65),
  ])
    expect(verdict(s), s.slice(0, 20)).toBe("TR-21");
  for (const s of [
    "x+2y=1",
    "t=2",
    "P=(1,2)",
    "f(t)=t+1",
    "1+".repeat(299) + "1", // 599 tokens
    "-" + "1+".repeat(299) + "1", // exactly 600 tokens
    "y=" + "(".repeat(64) + "x" + ")".repeat(64),
    "2^{".repeat(64) + "1" + "}".repeat(64),
  ])
    expect(verdict(s), s.slice(0, 20)).not.toMatch(/^TR-/);
  const tokens = (s: string) => {
    const r = lexQuestionMath(N(s));
    return r.ok ? r.tokens.length : r.rule;
  };
  expect([
    tokens("1+".repeat(300) + "1"),
    tokens("1+".repeat(299) + "1"),
    tokens("-" + "1+".repeat(299) + "1"),
  ]).toEqual([601, 599, 600]);
  expect(SEGMENT_LIMITS).toEqual({ characters: 2048, tokens: 600, depth: 64 });
});
it("TR-77 Phase 1 blocks hyperbolic functions, θ, r outside a definition of another name, pairs and function coordinates; the t gate needs dependencies", () => {
  for (const s of [
    "\\sinh x",
    "y=\\cosh(x)",
    "\\tanh2",
    "\\sin\\theta=\\frac{3}{5}",
    "2\\pi r",
    "r=5",
    "y=r+1",
    "(\\cos t,\\sin t)",
    "(2,5)",
    "(1,2),(3,4)",
    "(1,2);(3,4)",
    "(h,k)",
    "(2a,0)",
  ])
    expect(verdict(s), s).toBe("TR-77");
  expect(verdict("f(2)=5", "stem", ["f"])).toBe("TR-77");
  // P=(t,2) passes here; classify.ts applies decision 8's t gate once dependencies are known (Task 7)
  for (const s of ["A=\\pi r^{2}", "C=2\\pi r", "P=(1,2)", "f(2)=5", "P=(t,2)"])
    expect(verdict(s), s).toBe("equation");
  const p = S("P=(t,2)");
  expect(p.ok && [p.rows[0].names, p.rows[0].pointNames]).toEqual([["t"], ["t"]]);
  expect(TRANSFER_PHASE).toBe(1);
});
