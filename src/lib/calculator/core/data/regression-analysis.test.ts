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
  expect(a.byId.get("p")!.error?.message).toBe("x can't be a regression parameter.");
  // the first of x and y the model reads is named, as on the reference
  expect(analyse(row("s", "y_{1}\\sim ny+mx")).byId.get("s")!.error?.message).toBe(
    "y can't be a regression parameter."
  );
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
  expect(a.byId.get("u")!.error?.message).toBe("m is defined more than once.");
  expect(a.byId.get("v")!.error).toBeNull();
});

it("RT-25 a typed row's e_k follows its subscripts, left side first, then the lowest free k", () => {
  const a = analyse(
    row("r", "y_{7}\\sim mx_{4}+b"),
    row("s", "y_{1}\\sim ax_{5}"),
    row("u", "y_{1}\\sim cx_{1}")
  );
  expect(a.byId.get("r")!.regression!.residual).toBe("e_{7}");
  expect(a.byId.get("s")!.regression!.residual).toBe("e_{1}");
  // e_1 is held by s, so u (whose only subscript is 1) takes the lowest free k.
  expect(a.byId.get("u")!.regression!.residual).toBe("e_{2}");
});

it("RT-25, RT-32 a table regression's stored e_1 is held: the exported m_0, b_0 row takes e_0", () => {
  const withRegression = {
    ...table,
    regression: {
      type: "linear",
      y: 1,
      color: "c3",
      hidden: false,
      logMode: false,
      residual: "e_{1}",
    },
  } as RowSource;
  const a = analyzeRows(
    [withRegression, row("r", "y_{1}\\sim m_{0}x_{1}+b_{0}"), row("k", "m=2")],
    SETTINGS
  );
  expect(a.byId.get("r")!.regression!.residual).toBe("e_{0}");
});
