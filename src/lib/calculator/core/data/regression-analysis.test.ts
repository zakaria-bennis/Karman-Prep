import { expect, it } from "vitest";
import { analyzeRows, type RowSource } from "../analysis/index";

const SETTINGS = { angleMode: "radians" as const, complex: false };
const table: RowSource = {
  id: "t",
  latex: "",
  hidden: false,
  columns: [
    { latex: "x_{1}", values: ["1", "2", "3"] },
    { latex: "y_{1}", values: ["2", "4", "7"] },
  ],
};
const row = (id: string, latex: string): RowSource => ({ id, latex, hidden: false });
const analyse = (...rows: RowSource[]) => analyzeRows([table, ...rows], SETTINGS);

it("D-22 free names no row defines become parameters in order of appearance and become defined", () => {
  const a = analyse(row("r", "y_{1}\\sim mx_{1}+b"), row("u", "m+b+e_{1}"));
  const r = a.byId.get("r")!;
  expect(r).toMatchObject({ kind: "regression", error: null, chips: [] });
  expect(r.regression).toMatchObject({
    params: ["m", "b"],
    predictors: ["x_{1}"],
    residual: "e_{1}",
  });
  expect(r.graph).toMatchObject({ kind: "explicit", independent: "x" });
  expect(a.byId.get("u")).toMatchObject({ kind: "value", chips: [], error: null });
  // The fitted names come after the lists they read in the values pass.
  const order = a.valueOrder;
  expect(order.indexOf("t#1")).toBeLessThan(order.indexOf("r#~m"));
  expect(order).toEqual(expect.arrayContaining(["r#~m", "r#~b", "r#~e_{1}"]));
});

it("D-22 a name another row defines is a constant and the rest still fit", () => {
  const a = analyse(row("k", "b=3"), row("r", "y_{1}\\sim mx_{1}+b"));
  expect(a.byId.get("r")!.regression!.params).toEqual(["m"]);
  expect(a.byId.get("k")!.error).toBeNull();
});

it("D-22 no parameter is allowed, a scalar left side and x or y as predictor are errors", () => {
  const a = analyse(
    row("r", "y_{1}\\sim 2x_{1}"),
    row("p", "y_{1}\\sim mx+b"),
    row("q", "y\\sim m")
  );
  expect(a.byId.get("r")).toMatchObject({ kind: "regression", error: null });
  expect(a.byId.get("r")!.regression!.params).toEqual([]);
  expect(a.byId.get("p")!.error?.message).toBe("Use the table column, such as x₁, not x.");
  // A scalar left side is found when the values pass reads it (evaluate.regression.test.ts).
  expect(a.byId.get("q")).toMatchObject({ kind: "regression", error: null, graph: null });
});

it("D-33 each regression takes the lowest free e_k in row order and a computed column may read it", () => {
  const withColumn: RowSource = {
    ...table,
    columns: [...table.columns!, { latex: "e_{1}", values: [] }],
  };
  const a = analyzeRows(
    [withColumn, row("r", "y_{1}\\sim mx_{1}+b"), row("s", "y_{1}\\sim ax_{1}^{2}")],
    SETTINGS
  );
  expect(a.byId.get("r")!.regression!.residual).toBe("e_{1}");
  expect(a.byId.get("s")!.regression!.residual).toBe("e_{2}");
  expect(a.byId.get("t")!.table!.columns[2].role).toBe("computed");
});

it("D-44 a shared parameter name errors only in rows that reference it", () => {
  const a = analyse(
    row("r", "y_{1}\\sim mx_{1}+b"),
    row("s", "y_{1}\\sim mx_{1}"),
    row("u", "2m"),
    row("v", "b+1")
  );
  expect(a.byId.get("r")!.error).toBeNull();
  expect(a.byId.get("s")!.error).toBeNull();
  expect(a.byId.get("u")!.error?.message).toBe("m has more than one definition.");
  expect(a.byId.get("v")!.error).toBeNull();
});
