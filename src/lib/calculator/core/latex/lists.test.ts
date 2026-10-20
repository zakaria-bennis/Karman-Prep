import { describe, expect, it } from "vitest";
import { normalizeLatex, parseLatex, printLatex, toSExpr } from "./index";

const tree = (latex: string) => {
  const r = parseLatex(latex);
  return r.ok ? toSExpr(r.tree) : `${r.error.code}${r.error.feature ? `: ${r.error.feature}` : ""}`;
};

describe("list syntax", () => {
  it("PR-34 list literals and the empty list parse to list nodes", () => {
    expect(tree("[1,2,3]")).toBe("(list (num 1) (num 2) (num 3))");
    expect(tree("\\left[1,2,3\\right]")).toBe("(list (num 1) (num 2) (num 3))");
    expect(tree("[]")).toBe("(list)");
    expect(tree("\\left[\\right]")).toBe("(list)");
    expect(tree("[x+1,2a]")).toBe("(list (add (id x) (num 1)) (mul (num 2) (id a)))");
    expect(tree("[[1,2],3]")).toBe("(list (list (num 1) (num 2)) (num 3))");
    expect(tree("[(1,2),(3,4)]")).toBe("(list (point (num 1) (num 2)) (point (num 3) (num 4)))");
  });

  it("PR-34 ranges [a...b] and [a,b,...,c] accept ... and \\ldots as MathQuill writes them", () => {
    for (const latex of ["[1...10]", "\\left[1\\ldots10\\right]", "[1,...,10]", "[1\\ldots,10]"])
      expect(tree(latex), latex).toBe("(range (num 1) (num 10))");
    for (const latex of ["[1,3,...,10]", "\\left[1,3,\\ldots,10\\right]", "[1,3...10]"])
      expect(tree(latex), latex).toBe("(range (num 1) (num 3) (num 10))");
    expect(tree("[0.5...2.5]")).toBe("(range (num 0.5) (num 2.5))");
    expect(tree("[1...n]")).toBe("(range (num 1) (id n))");
    expect(tree("[1…5]")).toBe("(range (num 1) (num 5))");
    expect(tree("[1\\dots5]")).toBe("(range (num 1) (num 5))");
    expect(normalizeLatex("[1…5]")).toBe("[1\\ldots 5]");
  });

  it("PR-34 values on both sides of the ellipsis are a range's starts and ends", () => {
    expect(tree("[1,2,3,...,10]")).toBe("(range ((num 1) (num 2) (num 3)) ((num 10)))");
    expect(tree("[1...5,6]")).toBe("(range ((num 1)) ((num 5) (num 6)))");
    expect(tree("[1,2,...,9,10]")).toBe("(range ((num 1) (num 2)) ((num 9) (num 10)))");
  });

  it("PR-34 a malformed range or list is syntax, never a partial tree", () => {
    for (const latex of [
      "[1...5...9]",
      "[1,...,5,...]",
      "[1,2",
      "[1,]",
      "[,1]",
      "1...5",
      "x\\ldots",
    ])
      expect(tree(latex), latex).toBe("syntax");
  });

  it("PR-34 a range with nothing before or after its ellipsis is range-bound, as in Desmos", () => {
    for (const latex of ["[1...]", "[1,...]", "[...5]", "[1,2,...]"]) {
      expect(tree(latex), latex).toBe("range-bound");
    }
  });

  it("PR-34 lists print back to MathQuill LaTeX that parses to the same tree", () => {
    for (const [latex, printed] of [
      ["[1,2,3]", "\\left[1,2,3\\right]"],
      ["[]", "\\left[\\right]"],
      ["[1...10]", "\\left[1\\ldots10\\right]"],
      ["[1,3,...,n]", "\\left[1,3,\\ldots,n\\right]"],
      ["[a...b]", "\\left[a\\ldots b\\right]"],
      ["2[1,2]", "2\\left[1,2\\right]"],
      ["[1,2]^{2}", "\\left[1,2\\right]^{2}"],
    ]) {
      const r = parseLatex(latex);
      if (!r.ok) throw new Error(latex);
      expect(printLatex(r.tree), latex).toBe(printed);
      expect(tree(printed), printed).toBe(toSExpr(r.tree));
    }
  });

  it("PR-34 a number juxtaposed with a list multiplies it; a name, call or list before [ indexes", () => {
    expect(tree("2[1,2]")).toBe("(mul (num 2) (list (num 1) (num 2)))");
    expect(tree("L[2]")).toBe("unsupported: Indexing a list");
    expect(tree("[1,2,3][2]")).toBe("unsupported: Indexing a list");
    expect(tree("L_{1}[1...2]")).toBe("unsupported: Slicing a list");
    expect(tree("L[L>2]")).toBe("unsupported: Filtering a list");
    expect(tree("[n^{2}\\operatorname{for}n=[1...5]]")).toBe(
      "unsupported: Building a list with 'for'"
    );
    expect(tree("x\\operatorname{for}")).toBe("unsupported: Building a list with 'for'");
  });

  it("PR-30 a regression with an empty side is sim-side, not a generic syntax error", () => {
    for (const latex of ["\\sim", "y\\sim", "y_{1}\\sim", "\\sim x", "~", "y~ "])
      expect(tree(latex), latex).toBe("sim-side");
    expect(tree("y\\sim x\\sim2")).toBe("syntax");
    expect(tree("y=\\sim x")).toBe("syntax");
  });
});
