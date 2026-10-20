import { describe, expect, it } from "vitest";
import { createTestEngine } from "./__fixtures__/test-engine";

/**
 * Every row's outcome as Desmos's `Calc.expressionAnalysis` reports it: the error message, else
 * "VALUE" for a shown value, "GRAPH" for a graphable row and "ok" otherwise.
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

const both = (s: string) => `You need something on both sides of the '${s}' symbol.`;
const after = (s: string) => `You need something after the '${s}' symbol.`;
const PARSE = "Sorry, I don't understand this.";
const expected = (open: string, close: string) => `Expected '${open}' to match '${close}'.`;
const subscript = (s: string) =>
  `Subscripts may only contain letters and digits. '${s}' is not allowed.`;

// Each case is one row and the exact text live Desmos gave for it (captured 2026-10-20).
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
  ["!", "You need something before the '!' symbol."],
  ["!2", "You need something before the '!' symbol."],
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
  ["1^{}", "Superscripts cannot be empty."],
  ["x^{}", "Superscripts cannot be empty."],
  ["x_{}", "Subscripts cannot be empty."],
  ["\\left|\\right|", "Absolute value symbol cannot be empty."],
  ["\\left(\\right)", "Parentheses cannot be empty."],
  ["\\frac{}{}", "You need a numerator and denominator for your fraction."],
  ["\\frac{1}{}", "You need a denominator for the bottom of your fraction."],
  ["\\frac{}{2}", "You need a numerator for the top of your fraction."],
  ["|", "Sorry, I don't understand the '|' symbol."],
  ["|-5|", "Sorry, I don't understand the '|' symbol."],
  ["|x", "Sorry, I don't understand the '|' symbol."],
  ["x|", "Sorry, I don't understand the '|' symbol."],
  ["x_{1^{2}}", subscript("^{2}")],
  ["x_{a+b}", subscript("+")],
  ["x_{1.5}", subscript(".")],
  ["x_{\\alpha}", subscript("α")],
  ["a_{1,3}", subscript(",")],
  ["1_2", "Only functions and variables may have subscripts."],
  ["(1)_2", "Only functions and variables may have subscripts."],
  ["(1", expected("(", ")")],
  ["1)", expected("(", ")")],
  ["(1]", expected("(", ")")],
  ["2(", expected("(", ")")],
  ["\\sin(", expected("(", ")")],
  ["[1", expected("[", "]")],
  ["1]", expected("[", "]")],
  ["\\{1", expected("{", "}")],
  ["1\\}", expected("{", "}")],
  [
    "1.2.3",
    "Sorry, I don't know what to do with adjacent numbers '1.2' and '.3'. Try using parentheses or a '*' symbol.",
  ],
  ["1..5", "Sorry, I don't understand this use of '.' after a constant number."],
  [".", both(".")],
  ["a.b", "Sorry, I don't understand the way that '.' is used here."],
  ["1...5", "Sorry, I don't understand the way that '...' is used here."],
  ["y\\sim mx\\sim b", "Sorry, I don't understand the way that '~' is used here."],
  ["(1,2,3)", "This calculator cannot plot a 3d point."],
  ["(1,2,3,4)", "Points may only have 2 coordinates."],
  // built-ins this calculator reads but does not evaluate, and commands Desmos reads as names
  [
    "\\operatorname{factorial}(1,2)",
    "Function 'factorial' requires only 1 argument. For example, try typing: factorial(x).",
  ],
  ["\\operatorname{polygon}\\left(1\\right)", "Function 'polygon' requires several points."],
  ["\\operatorname{dt}", "You can't use 'dt' in this context."],
  ["\\operatorname{cumsum}()", "Function 'cumsum' is not defined."],
  ["-\\operatorname{rgb}\\left(1,2,3\\right)", "Cannot negate a color."],
  ["x\\ne1", "Too many variables. Try defining 'ne'."],
  [
    "\\operatorname{hsv}\\left(1\\right)",
    "'hsv' should be called with 3 arguments. For example, try typing: hsv(180, 0.5, 0.5).",
  ],
  [
    "\\operatorname{shuffle}\\left(\\right)",
    "Function 'shuffle' requires an argument. For example, try typing: shuffle([1,2,3]).",
  ],
  ["\\operatorname{real}(3)", "The 'real' function is only available in complex mode."],
  ["x\\approx3", "Sorry, I don't understand the '≈' symbol."],
  ["\\operatorname{common_log}(100)", "Sorry, I don't understand the 'common_log' symbol."],
  [
    "\\operatorname{segment}\\left((0,0),(4,0),(0,3)\\right)",
    "Function 'segment' requires 2 arguments. ",
  ],
  ["\\operatorname{translate}(1,2)", "This calculator does not support the 'translate' function."],
];

describe("Desmos's row error texts (live Desmos, 2026-10-20)", () => {
  it.each(ROWS)("%s", async (latex, message) => {
    expect(await outcomes([latex])).toEqual([message]);
  });
});

const dup = (n: string) =>
  `You've defined '${n}' in more than one place. Try deleting some of the definitions of '${n}'.`;
const IMPLICIT = "We only support implicit equations of x and y.";
const Y_EQUALS = "Try adding 'y=' to the beginning of this equation.";
const recursive = (f: string) =>
  `The definition of function '${f}' depends on itself. If '${f}' is meant to be a recursive function, try adding a valid base case.`;

// Each case is a list of rows and what live Desmos showed on each (captured 2026-10-20).
const LISTS: [string[], string[]][] = [
  // a name defined twice: only the rows that use it, directly or through a definition, are marked
  [
    ["a=1", "a=2"],
    ["VALUE", "VALUE"],
  ],
  [
    ["a=1", "a=2", "a+1"],
    ["VALUE", "VALUE", dup("a")],
  ],
  [
    ["a=1", "a=2", "b=a", "b+1"],
    ["VALUE", "VALUE", dup("a"), dup("a")],
  ],
  [
    ["a=1", "a=2", "y=ax"],
    ["VALUE", "VALUE", dup("a")],
  ],
  [
    ["f(x)=x", "f(x)=2x", "f(1)"],
    ["GRAPH", "GRAPH", dup("f")],
  ],
  [
    ["a=1", "a=2", "f(x)=ax", "f(2)"],
    ["VALUE", "VALUE", dup("a"), dup("a")],
  ],
  // cycles
  [["a=a+1"], [IMPLICIT]],
  [["a=2a"], [IMPLICIT]],
  [
    ["a=1", "a=a+1"],
    ["VALUE", IMPLICIT],
  ],
  [["a=b", "b=a"], Array(2).fill("'a' and 'b' can't be defined in terms of each other.")],
  [
    ["c=b", "b=a", "a=c"],
    Array(3).fill("'a', 'b' and 'c' can't be defined in terms of each other."),
  ],
  [["a=b+1", "b=a", "a+1"], Array(3).fill("'a' and 'b' can't be defined in terms of each other.")],
  [["a=b", "b=c", "c=b"], Array(3).fill("'b' and 'c' can't be defined in terms of each other.")],
  [["f(x)=a", "a=f(1)"], Array(2).fill("'a' and 'f' can't be defined in terms of each other.")],
  [
    ["f(x)=f(x-1)", "f(2)"],
    [recursive("f"), recursive("f")],
  ],
  [["f(x,y)=f(y,x)"], [recursive("f")]],
  [["f(x)=1+f(x)"], ["The definition of function 'f' depends on itself."]],
  [
    ["f(x)=g(x)", "g(x)=f(x)", "f(1)"],
    Array(3).fill("The definitions of functions 'g' and 'f' depend on each other."),
  ],
  [
    ["g(x)=f(x)", "f(x)=g(x)"],
    Array(2).fill("The definitions of functions 'f' and 'g' depend on each other."),
  ],
  [
    ["f(x)=g(x)", "g(x)=h(x)", "h(x)=f(x)"],
    Array(3).fill("The definitions of functions 'g', 'h' and 'f' depend on each other."),
  ],
  [
    ["f(x)=g(x)", "g(x)=h(x)", "h(x)=g(x)"],
    Array(3).fill("The definitions of functions 'h' and 'g' depend on each other."),
  ],
  [
    ["f(x)=g(x-1)", "g(x)=f(x)"],
    Array(2).fill(
      "The definitions of functions 'g' and 'f' depend on each other. If they are meant to be mutually recursive functions, try adding a valid base case."
    ),
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
  [["ab"], ["Too many variables. Try defining 'a' or 'b'."]],
  [["a+x"], ["Too many variables. Try defining 'a'."]],
  [["y=mx+b"], ["Too many variables. Try defining 'm' or 'b'."]],
  [["x+y"], ["Try adding an equals sign to turn this into an equation."]],
  [["y(x)"], ["Try adding an equals sign to turn this into an equation."]],
  [["\\theta"], ["Try adding 'r=' to the beginning of this equation."]],
  // calls
  [["a()"], ["Function 'a' is not defined."]],
  [["2()"], ["Parentheses cannot be empty."]],
  [["g'(2)"], ["Function 'g' is not defined."]],
  [["x'"], ["Sorry, I don't understand this use of prime notation."]],
  // a product of a point and x is not a curve: Desmos neither graphs nor marks it
  [["y=(1,2)x"], ["ok"]],
  [["y=[(1,2),(3,4)]x"], ["ok"]],
];

describe("Desmos's errors between rows (live Desmos, 2026-10-20)", () => {
  it.each(LISTS)("%j", async (rows, shown) => {
    expect(await outcomes(rows)).toEqual(shown);
  });
});
