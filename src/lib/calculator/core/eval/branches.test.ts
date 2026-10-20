// G-22, NM-33: branchTrees against live Desmos branch counts (captured 2026-10-20), and each
// branch's values against the list the whole tree evaluates to.
import { describe, expect, it } from "vitest";
import { analyzeRows } from "../analysis/index";
import { NO_DEADLINE } from "../deadline";
import { buildCompileScope } from "../../plot/from-analysis";
import { branchTrees, chainBranches, MAX_PLOT_BRANCHES } from "./branches";
import {
  compileExpression,
  compileRealFunction1,
  evaluateRows,
  type EvalSettings,
} from "./compile";
import { numberValue } from "./values";

const REAL: EvalSettings = { angleMode: "radians", complex: false };

/** The last row's graph tree and the scope of `rows`. */
function graphOf(rows: readonly string[], settings = REAL) {
  const analysis = analyzeRows(
    rows.map((latex, k) => ({ id: `r${k}`, latex, hidden: false })),
    settings
  );
  const row = analysis.rows[rows.length - 1];
  const scope = buildCompileScope(
    analysis,
    evaluateRows(analysis, settings, () => NO_DEADLINE),
    settings
  );
  return { row, scope };
}

/** The values each branch of the last row's explicit graph takes at `t`. */
function branchValues(rows: readonly string[], t: number, settings = REAL): number[] {
  const { row, scope } = graphOf(rows, settings);
  if (row.graph?.kind !== "explicit") throw new Error(`${rows.at(-1)} is not explicit`);
  const { expr, independent } = row.graph;
  return branchTrees(expr, scope).map((tree) => compileRealFunction1(tree, independent, scope)(t));
}

describe("G-22 one branch per element, as many as Desmos draws", () => {
  it.each([
    [["y=[1,2,3]x"], 2, [2, 4, 6]],
    [["[1,2]x"], 2, [2, 4]],
    [["y=[1,2]x+[1,2,3]"], 1, [2, 4]], // NM-33: the shorter list
    [["y=\\sin([1,2]x)"], Math.PI / 2, [1, Math.sin(Math.PI)]],
    [["y=[x,x^{2}]"], 3, [3, 9]],
    [["L=[1,2]", "y=Lx"], 3, [3, 6]],
    [["a=1", "y=[a,2a]x"], 3, [3, 6]],
    [["f(x)=[1,2]x"], 3, [3, 6]],
    [["f(a)=[1,2]a", "y=f(x)"], 3, [3, 6]],
    [["L=[1,2]", "g(t)=t+L", "y=g(x)"], 3, [4, 5]],
    [["L=[1,2]", "a=[1,2]x", "y=a"], 3, [3, 6]],
    [["f(x,a)=ax", "y=f(x,[1,2,3])"], 2, [2, 4, 6]],
    [["y=x^{[1,2]}"], 3, [3, 9]],
    [["y=[1...5]^x"], 2, [1, 4, 9, 16, 25]],
    [["y=\\max([1,2],x)"], 1.5, [1.5, 2]],
    [["y=\\operatorname{mean}(x,[1,2])"], 3, [2, 2.5]], // FN-23 broadcast
    [["y=\\operatorname{sort}([3,-1,2]x)"], 1, [-1, 2, 3]],
    [["y=\\operatorname{join}(x,1)"], 5, [5, 1]],
    [["y=\\operatorname{repeat}(x,2)"], 5, [5, 5]],
    [["y=\\operatorname{normaldist}([0,1],1).\\operatorname{pdf}(x)"], 0, [0.39894228, 0.24197072]],
    [["y=x\\{x>[0,1]\\}"], 0.5, [0.5, NaN]],
    [["y=\\left\\{x>[0,1]:x,-x\\right\\}"], 0.5, [0.5, -0.5]],
    [["y=[1,0/0,3]x"], 2, [2, NaN, 6]],
    [["x=[1,2]y^{2}"], 2, [4, 8]],
  ])("%j at %d", (rows, t, expected) => {
    const got = branchValues(rows, t);
    expect(got).toHaveLength(expected.length);
    got.forEach((v, k) =>
      Number.isNaN(expected[k]) ? expect(v).toBeNaN() : expect(v).toBeCloseTo(expected[k], 8)
    );
  });

  it("a tree that gives one value is its own only branch, and an empty list has none", () => {
    for (const latex of ["y=x+\\operatorname{mean}([1,2,3])", "y=[1,2,3][2]x", "y=x^{2}"]) {
      const { row, scope } = graphOf([latex]);
      const expr = row.graph?.kind === "explicit" ? row.graph.expr : null;
      expect(branchTrees(expr!, scope), latex).toEqual([expr]);
    }
    const { row, scope } = graphOf(["y=[]x"]);
    expect(row.graph?.kind === "explicit" && branchTrees(row.graph.expr, scope)).toEqual([]);
  });

  it("y=[1...10000]x draws every one of Desmos's 10,000 branches", () => {
    const { row, scope } = graphOf(["y=[1...10000]x"]);
    const trees = row.graph?.kind === "explicit" ? branchTrees(row.graph.expr, scope) : [];
    expect([trees.length, MAX_PLOT_BRANCHES]).toEqual([10_000, 10_000]);
    expect(compileRealFunction1(trees[9_999], "x", scope)(2)).toBe(20_000);
  });

  it("each branch is the element of the whole tree's list value", () => {
    const rows = ["L=[1,-2,3]", "y=L\\sin(x)+[4,5,6]^{2}x"];
    const { row, scope } = graphOf(rows);
    if (row.graph?.kind !== "explicit") throw new Error("not explicit");
    const whole = compileExpression(row.graph.expr, scope)({ x: numberValue(0.7) }, NO_DEADLINE);
    const parts = branchTrees(row.graph.expr, scope).map((tree) =>
      compileRealFunction1(tree, "x", scope)(0.7)
    );
    expect(
      whole.type === "list" && whole.value.map((v) => (v.type === "number" ? v.value : NaN))
    ).toEqual(parts);
  });

  it("chains broadcast together: y>[0,1]x is two regions and 1<y<[2,3] two bands", () => {
    for (const [latex, count] of [
      ["y>[0,1]x", 2],
      ["1<y<[2,3]", 2],
      ["[1,2]x^{2}+y^{2}<[1,4,9]", 2],
    ] as const) {
      const { row, scope } = graphOf([latex]);
      if (row.graph?.kind !== "region") throw new Error(`${latex} is not a region`);
      const branches = chainBranches(row.graph.operands, row.graph.ops, scope);
      expect(
        branches.map((b) => b.length),
        latex
      ).toEqual(Array(count).fill(latex[0] === "1" ? 3 : 2));
    }
  });

  it("the complex-mode path picks each element too", () => {
    const complex = { angleMode: "radians", complex: true } as const;
    // 2·1+i−i is real; 2·2+1−i is not, so undefined on the plot (NM-21)
    expect(branchValues(["y=[1,2]x+[i,1]-i"], 2, complex)).toEqual([2, NaN]);
  });
});
