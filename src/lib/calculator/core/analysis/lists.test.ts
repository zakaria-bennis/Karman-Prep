import { describe, expect, it } from "vitest";
import { analyzeRows, type RowSource } from "./index";
import { NO_DEADLINE } from "../deadline";
import { evaluateRows } from "../eval/compile";
import type { RegressionOutcome } from "../data/evaluate-regression";
import { buildCompileScope, plotInputFor } from "../../plot/from-analysis";

const REAL = { angleMode: "radians", complex: false } as const;
const rows = (...latex: string[]): RowSource[] =>
  latex.map((l, k) => ({ id: `r${k}`, latex: l, hidden: false }));
const last = (...latex: string[]) => {
  const a = analyzeRows(rows(...latex), REAL);
  return a.rows[a.rows.length - 1];
};
const table: RowSource = {
  id: "t",
  latex: "",
  hidden: false,
  columns: [
    { latex: "x_{1}", values: ["1", "2", "3"] },
    { latex: "y_{1}", values: ["3", "5", "7"] },
  ],
};

describe("list errors found by analysis", () => {
  it("NM-34 [x_1,x_1]~[y_1,y_1] with list columns is Cannot store a list of numbers in a list.", () => {
    for (const context of [rows("x_{1}=[1...10]", "y_{1}=[1...10]"), [table]]) {
      const a = analyzeRows(
        [...context, { id: "s", latex: "[x_{1},x_{1}]\\sim[y_{1},y_{1}]", hidden: false }],
        REAL
      );
      const s = a.byId.get("s")!;
      expect([s.kind, s.error?.code, s.error?.message]).toEqual([
        "error",
        "nested-list",
        "Cannot store a list of numbers in a list.",
      ]);
      expect(s.regression).toBeUndefined();
    }
  });

  it("NM-34 a list, range or list-valued expression inside list brackets or as a range bound is nested-list", () => {
    for (const latex of [
      "[[1,2],3]",
      "[L,1]",
      "[L+1]",
      "[1...L]",
      "[f(1)]",
      "[(L,1)]",
      "M=[[1]]",
    ]) {
      const r = last("L=[1,2]", "f(a,b)=[a,b]", latex.replace("f(1)", "f(1,2)"));
      expect([r.kind, r.error?.code], latex).toEqual(["error", "nested-list"]);
    }
    expect(last("[[1,2],3]").error?.span).toEqual({ start: 1, end: 6 });
    for (const latex of ["[1,2]", "[a,b]", "[(1,2),(3,4)]", "[L_{1}]"])
      expect(last("a=1", "b=2", "L_{1}=3", latex).error, latex).toBeNull();
  });

  it("NM-35, NM-36, NM-42 a literal range with a zero step or more than 10,000 elements is an analysis error", () => {
    expect(last("[1...10000]").error).toBeNull();
    expect(last("[1...10001]").error?.code).toBe("list-too-long");
    expect(last("L=[0,0.0001,...,10]").error?.code).toBe("list-too-long");
    expect(last("[1,1,...,5]").error?.code).toBe("range-step");
    expect(last("[-2,-2,...,5]").error?.message).toBe(
      "A range can't step by 0. Make its first two values different."
    );
  });
});

describe("lists in graphs", () => {
  it("G-22 a list-valued curve, line or region is a clear unsupported error, never a NaN curve", () => {
    for (const latex of [
      "y=[1,2]x",
      "[1,2]x",
      "y=Lx",
      "y=a",
      "x=[1,2]",
      "y<[1,2]",
      "f(x)=[1,2]x",
      "y=g(x)",
      "[1,2]<3",
    ]) {
      const r = last("L=[1,2]", "a=[1,2]x", "g(t)=t+L", latex);
      expect([r.kind, r.error?.code, r.error?.message, r.isGraphable], latex).toEqual([
        "error",
        "unsupported",
        "Graphing a list of curves isn't supported yet.",
        false,
      ]);
    }
    expect(last("L=[1,2]", "y=L_{1}x").error).toBeNull(); // L_1 is a different name
    expect(last("L=[1,2]", "h(a,b)=a+L").error).toBeNull(); // two parameters: not graphed
  });

  it("G-3 a point whose parts are lists is a point row that plots one dot per pair", () => {
    const run = (...latex: string[]) => {
      const a = analyzeRows(rows(...latex), REAL);
      const values = evaluateRows(a, REAL, () => NO_DEADLINE);
      const row = a.rows[a.rows.length - 1];
      return {
        row,
        input: plotInputFor(row, buildCompileScope(a, values, REAL), values.get(row.id) ?? null),
      };
    };
    const pairs = run("L_{1}=[1,2,3]", "L_{2}=[4,5]", "(L_{1},L_{2})");
    expect([pairs.row.kind, pairs.row.isGraphable]).toEqual(["point", true]);
    expect(pairs.input).toEqual({
      rowId: "r2",
      kind: "points",
      points: [
        [1, 4],
        [2, 5],
      ],
    });
    expect(run("L=[1,2]", "(L,5)").input).toMatchObject({
      points: [
        [1, 5],
        [2, 5],
      ],
    });
    expect(run("[(1,2),(3,4)]").input).toMatchObject({
      kind: "points",
      points: [
        [1, 2],
        [3, 4],
      ],
    });
    expect(run("L=[1,0]", "(L,1/L)").input).toMatchObject({ points: [[1, 1]] });
    expect(run("[(1,x)]").row.error?.code).toBe("point-coordinates");
  });
});

describe("lists as regression data", () => {
  it("D-22 list definition rows are observations and predictors and fit exactly like a table", () => {
    const fits = new Map<string, RegressionOutcome>();
    const sources = rows("x_{1}=[1,2,3]", "y_{1}=[3,5,7]", "y_{1}\\sim mx_{1}+b");
    const a = analyzeRows(sources, REAL);
    const r = a.rows[2];
    expect([r.kind, r.error, r.regression?.params, r.regression?.predictors]).toEqual([
      "regression",
      null,
      ["m", "b"],
      ["x_{1}"],
    ]);
    expect(r.graph?.kind).toBe("explicit");
    evaluateRows(a, REAL, () => NO_DEADLINE, {
      table: () => undefined,
      regression: (id, fit) => fits.set(id, fit),
    });
    const fit = fits.get("r2")!;
    expect(fit.ok).toBe(true);
    expect(fit.params.map((p) => p.name)).toEqual(["m", "b"]);
    expect(fit.params[0].value).toBeCloseTo(2, 12);
    expect(fit.params[1].value).toBeCloseTo(1, 12);
    expect(fit.r2).toBeCloseTo(1, 12);
  });

  it("D-22 a range definition and a list computed from another list are regression data too", () => {
    const fits = new Map<string, RegressionOutcome>();
    const a = analyzeRows(rows("x_{1}=[1...5]", "y_{1}=2x_{1}^{2}", "y_{1}\\sim ax_{1}^{2}"), REAL);
    expect(a.rows[2].regression?.predictors).toEqual(["x_{1}"]);
    evaluateRows(a, REAL, () => NO_DEADLINE, {
      table: () => undefined,
      regression: (id, fit) => fits.set(id, fit),
    });
    expect(fits.get("r2")!.params[0].value).toBeCloseTo(2, 12);
  });
});
