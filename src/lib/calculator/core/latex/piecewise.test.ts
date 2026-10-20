import { describe, expect, it } from "vitest";
import { parseLatex, printLatex, toSExpr, treesEqual } from "./index";

const spanOf = (s: string) => {
  const r = parseLatex(s);
  return r.ok ? null : [r.error.code, r.error.span.start, r.error.span.end];
};
const tree = (s: string) => {
  const r = parseLatex(s);
  if (!r.ok) throw new Error(`${s}: ${r.error.code}`);
  return r.tree;
};

describe("PR-31 piecewise braces", () => {
  it("reads \\left\\{ … \\right\\} and the bare \\{ … \\} alike", () => {
    expect(treesEqual(tree("\\left\\{x>0:1,2\\right\\}"), tree("\\{x>0:1,2\\}"))).toBe(true);
  });

  it("reports Desmos's errors at the offending text", () => {
    expect(
      [
        "\\{1<0:5,\\}",
        "\\{,1>0\\}",
        "\\{1>0:\\}",
        "\\{:5\\}",
        "\\{3:4\\}",
        "\\{5,6\\}",
        "\\{1>0:5,6,7\\}",
        "\\{x>0:1",
      ].map(spanOf)
    ).toEqual([
      ["comma-side", 7, 8],
      ["comma-side", 2, 3],
      ["colon-side", 5, 6],
      ["colon-side", 2, 3],
      ["colon-condition", 2, 3],
      ["piecewise-condition", 0, 7],
      ["piecewise-part", 8, 9],
      ["syntax", 7, 7],
    ]);
  });

  it("a closing brace with no opener is a syntax error, not a factor", () => {
    expect(spanOf("x\\}")).toEqual(["syntax", 1, 3]);
  });

  it("PR-32 braces after a power, a call or a group restrict it as a product", () => {
    expect(toSExpr(tree("\\sin(x)\\{x>0\\}"))).toBe(
      "(mul (call sin (id x)) (piecewise (if (rel > (id x) (num 0)))))"
    );
    expect(toSExpr(tree("(x+1)\\{x>0\\}^{2}"))).toBe(
      "(mul (add (id x) (num 1)) (pow (piecewise (if (rel > (id x) (num 0)))) (num 2)))"
    );
  });

  it("PR-37 printed piecewise LaTeX reads back to the same tree", () => {
    for (const latex of [
      "\\{x>0:x,-x\\}",
      "y=2x\\{0\\le x<1\\}\\{y>0\\}",
      "\\{\\}",
      "\\{1>0,[1,2]>1:[5,6],0\\}",
      "L[\\{L>3\\}]",
    ]) {
      const printed = printLatex(tree(latex));
      expect(treesEqual(tree(printed), tree(latex)), printed).toBe(true);
    }
  });
});
