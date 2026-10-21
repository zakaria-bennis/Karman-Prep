import { describe, expect, it } from "vitest";
import { createTestEngine } from "./__fixtures__/test-engine";

/**
 * Every row's outcome as `expressionAnalysis` reports it: the error message, else "VALUE" for a
 * shown value, "GRAPH" for a graphable row and "ok" otherwise.
 */
async function outcomes(rows: string[]): Promise<string[]> {
  const t = createTestEngine(undefined, { backend: "main-thread" });
  t.engine.setExpressions(rows.map((latex, i) => ({ id: `r${i}`, latex })));
  await t.settled();
  const analysis = t.engine.expressionAnalysis;
  return rows.map((_, i) => {
    const a = analysis[`r${i}`];
    if (a.isError) return a.errorMessage ?? "";
    if (a.evaluationDisplayed) return "VALUE";
    return a.isGraphable ? "GRAPH" : "ok";
  });
}

const both = (s: string) => `'${s}' needs something on both sides.`;
const after = (s: string) => `'${s}' needs something after it.`;
const PARSE = "Can't read this expression.";
const expected = (open: string, close: string) => `Missing '${open}' or '${close}'.`;
const subscript = (s: string) => `'${s}' can't go in a subscript.`;

// Each case is one row and its error text: the rows and outcomes live Desmos gave (captured
// 2026-10-20), each error in Karman's own copy (owner decision, 2026-10-21).
const ROWS: [string, string][] = [
  ["1+", both("+")],
  ["\\frac{1}{0}+", both("+")],
  ["x=", both("=")],
  ["=2", both("=")],
  ["+", after("+")],
  ["-", after("-")],
  ["1-", both("-")],
  ["(1+)", both("+")],
  ["\\left(1+\\right)", both("+")],
  ["1*", both("*")],
  ["1/", both("/")],
  ["/2", both("/")],
  ["<1", both("<")],
  ["1<", both("<")],
  ["[1,]", both(",")],
  ["1,", both(",")],
  [",1", both(",")],
  ["x\\cdot", both("⋅")],
  ["\\cdot", both("⋅")],
  ["\\le1", both("≤")],
  ["1\\le", both("≤")],
  ["!", "'!' needs something before it."],
  ["!2", "'!' needs something before it."],
  ["1+*2", both("*")],
  ["-=2", both("=")],
  ["+=2", both("=")],
  ["1+=2", both("=")],
  ["(+)", after("+")],
  ["(-)", after("-")],
  ["1,+", after("+")],
  ["\\sqrt{1+}", both("+")],
  ["\\frac{1+}{2}", both("+")],
  ["\\frac{1}{2+}", both("+")],
  ["2^{1+}", both("+")],
  ["[1+]", both("+")],
  ["1=2=", both("=")],
  ["\\operatorname{with}a=2", both("with")],
  ["1^", PARSE],
  ["\\sqrt", PARSE],
  ["x_", PARSE],
  ["2^{3}^{4}", PARSE],
  ["x_{1}_{2}", PARSE],
  ["{", PARSE],
  ["}", PARSE],
  ["1^{}", "The exponent is empty."],
  ["x^{}", "The exponent is empty."],
  ["x_{}", "The subscript is empty."],
  ["\\left|\\right|", "The absolute value bars are empty."],
  ["\\left(\\right)", "The parentheses are empty."],
  ["\\frac{}{}", "The fraction is empty."],
  ["\\frac{1}{}", "The fraction has no bottom."],
  ["\\frac{}{2}", "The fraction has no top."],
  ["|", "Unknown symbol '|'."],
  ["|-5|", "Unknown symbol '|'."],
  ["|x", "Unknown symbol '|'."],
  ["x|", "Unknown symbol '|'."],
  ["x_{1^{2}}", subscript("^{2}")],
  ["x_{a+b}", subscript("+")],
  ["x_{1.5}", subscript(".")],
  ["x_{\\alpha}", subscript("α")],
  ["a_{1,3}", subscript(",")],
  ["1_2", "Only names can have subscripts."],
  ["(1)_2", "Only names can have subscripts."],
  ["(1", expected("(", ")")],
  ["1)", expected("(", ")")],
  ["(1]", expected("(", ")")],
  ["2(", expected("(", ")")],
  ["\\sin(", expected("(", ")")],
  ["[1", expected("[", "]")],
  ["1]", expected("[", "]")],
  ["\\{1", expected("{", "}")],
  ["1\\}", expected("{", "}")],
  ["1.2.3", "Put * or parentheses between 1.2 and .3."],
  ["1..5", "Unexpected '.' after a number."],
  [".", both(".")],
  ["a.b", "'.' can't be used here."],
  ["1...5", "'...' can't be used here."],
  ["y\\sim mx\\sim b", "'~' can't be used here."],
  ["(1,2,3)", "3D points can't be plotted."],
  ["(1,2,3,4)", "Points can have only 2 coordinates."],
  // built-ins this calculator reads but does not evaluate, and commands Desmos reads as names
  ["\\operatorname{factorial}(1,2)", "factorial takes only 1 input, like factorial(x)."],
  ["\\operatorname{polygon}\\left(1\\right)", "polygon needs several points."],
  ["\\operatorname{dt}", "dt can't be used here."],
  ["\\operatorname{cumsum}()", "Function cumsum is not defined."],
  ["-\\operatorname{rgb}\\left(1,2,3\\right)", "Can't negate a color."],
  ["x\\ne1", "ne is not defined."],
  ["\\operatorname{hsv}\\left(1\\right)", "hsv needs 3 inputs, like hsv(180, 0.5, 0.5)."],
  ["\\operatorname{shuffle}\\left(\\right)", "shuffle needs an input, like shuffle([1,2,3])."],
  ["\\operatorname{real}(3)", "real works only in complex mode."],
  ["x\\approx3", "Unknown symbol '≈'."],
  ["\\operatorname{common_log}(100)", "Unknown symbol 'common_log'."],
  ["\\operatorname{segment}\\left((0,0),(4,0),(0,3)\\right)", "segment needs 2 inputs."],
  ["\\operatorname{translate}(1,2)", "translate isn't available in this calculator."],
  ["\\operatorname{inv}", "inv isn't available in this calculator."],
  ["\\operatorname{real}()", "real needs an input, like real(x)."],
  ["\\operatorname{ans}_{1}", "'ans' can't be used here."],
  ["\\begin{matrix}1&2\\end{matrix}", PARSE],
  ["L.\\operatorname{StdDev}", "'.' can't be used here."],
  ["f(x,x)=x", "x is used for two inputs."],
];

describe("row error texts", () => {
  it.each(ROWS)("%s", async (latex, message) => {
    expect(await outcomes([latex])).toEqual([message]);
  });
});

const dup = (n: string) => `${n} is defined more than once.`;
const IMPLICIT = "Implicit equations can use only x and y.";
const Y_EQUALS = "Add y= at the start.";
const recursive = (f: string) => `${f} depends on itself. Add a base case.`;

// Each case is a list of rows and what live Desmos showed on each (captured 2026-10-20), errors in
// Karman's copy. A slider row such as `a=1` shows no value ("ok"), as Desmos's evaluationDisplayed
// says.
const LISTS: [string[], string[]][] = [
  // a name defined twice: only the rows that use it, directly or through a definition, are marked
  [
    ["a=1", "a=2"],
    ["ok", "ok"],
  ],
  [
    ["a=1", "a=2", "a+1"],
    ["ok", "ok", dup("a")],
  ],
  [
    ["a=1", "a=2", "b=a", "b+1"],
    ["ok", "ok", dup("a"), dup("a")],
  ],
  [
    ["a=1", "a=2", "y=ax"],
    ["ok", "ok", dup("a")],
  ],
  [
    ["f(x)=x", "f(x)=2x", "f(1)"],
    ["GRAPH", "GRAPH", dup("f")],
  ],
  [
    ["a=1", "a=2", "f(x)=ax", "f(2)"],
    ["ok", "ok", dup("a"), dup("a")],
  ],
  // cycles
  [["a=a+1"], [IMPLICIT]],
  [["a=2a"], [IMPLICIT]],
  [
    ["a=1", "a=a+1"],
    ["ok", IMPLICIT],
  ],
  [["a=b", "b=a"], Array(2).fill("a and b are defined using each other.")],
  [["c=b", "b=a", "a=c"], Array(3).fill("a, b and c are defined using each other.")],
  [["a=b+1", "b=a", "a+1"], Array(3).fill("a and b are defined using each other.")],
  [["a=b", "b=c", "c=b"], Array(3).fill("b and c are defined using each other.")],
  [["f(x)=a", "a=f(1)"], Array(2).fill("a and f are defined using each other.")],
  [
    ["f(x)=f(x-1)", "f(2)"],
    [recursive("f"), recursive("f")],
  ],
  [["f(x,y)=f(y,x)"], [recursive("f")]],
  [["f(x)=1+f(x)"], ["f depends on itself."]],
  [["f(x)=g(x)", "g(x)=f(x)", "f(1)"], Array(3).fill("Functions g and f depend on each other.")],
  [["g(x)=f(x)", "f(x)=g(x)"], Array(2).fill("Functions f and g depend on each other.")],
  [
    ["f(x)=g(x)", "g(x)=h(x)", "h(x)=f(x)"],
    Array(3).fill("Functions g, h and f depend on each other."),
  ],
  [
    ["f(x)=g(x)", "g(x)=h(x)", "h(x)=g(x)"],
    Array(3).fill("Functions h and g depend on each other."),
  ],
  [
    ["f(x)=g(x-1)", "g(x)=f(x)"],
    Array(2).fill("Functions g and f depend on each other. Add a base case."),
  ],
  // a coordinate or constant called like a function defines a function that graphs
  [["y(x)=x"], ["GRAPH"]],
  [["x(t)=t^2"], ["GRAPH"]],
  // free variables in an expression
  [["a"], [Y_EQUALS]],
  [["a+1"], [Y_EQUALS]],
  [["t"], [Y_EQUALS]],
  [["a_{1}"], [Y_EQUALS]],
  [["\\sin(a)"], [Y_EQUALS]],
  [["n!"], [Y_EQUALS]],
  [["ab"], ["a and b are not defined."]],
  [["a+x"], ["a is not defined."]],
  [["y=mx+b"], ["m and b are not defined."]],
  [["x+y"], ["Add an equals sign to make an equation."]],
  [["y(x)"], ["Add an equals sign to make an equation."]],
  [["\\theta"], ["Add r= at the start."]],
  // calls
  [["a()"], ["Function a is not defined."]],
  [["2()"], ["The parentheses are empty."]],
  [["g'(2)"], ["Function g is not defined."]],
  [["x'"], ["Prime notation can't be used this way."]],
  // a product of a point and x is not a curve: Desmos neither graphs nor marks it
  [["y=(1,2)x"], ["ok"]],
  [["y=[(1,2),(3,4)]x"], ["ok"]],
];

describe("errors between rows", () => {
  it.each(LISTS)("%j", async (rows, shown) => {
    expect(await outcomes(rows)).toEqual(shown);
  });
});
