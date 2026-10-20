// RT-25 to RT-33: table regressions through the engine and the real values pass.
import { beforeEach, expect, it } from "vitest";
import { createTestEngine, type TestEngine } from "./__fixtures__/test-engine";
import {
  addTableRegression,
  deleteTableRegression,
  exportBlock,
  exportCustomRegression,
  exportParameterNames,
  exportRegressionEquation,
  plotTableResiduals,
  regressionEligibility,
  setTableRegressionColumn,
  setTableRegressionLogMode,
  setTableRegressionType,
} from "./table-regression-commands";
import { colourAfter } from "../../theme/roles";

let m: TestEngine;
let e: TestEngine["engine"];
beforeEach(() => {
  m = createTestEngine(undefined, { backend: "main-thread" });
  e = m.engine;
});

const stateOf = (id: string) => e.getExpressions().find((s) => s.id === id)!;
const view = (id: string) => e.getSnapshot().rows.find((r) => r.id === id)!;
const owner = (extra: { latex: string; values: string[] }[] = []) =>
  e.setExpression({
    id: "t",
    type: "table",
    columns: [
      { latex: "x_{1}", values: ["12", "25", "325"] },
      { latex: "y_{1}", values: ["3", "5", "10"] },
      ...extra,
    ],
  });

it("RT-28 Add Regression adds Linear on the first qualifying column in the next colour and fits it", async () => {
  owner();
  await m.settled();
  expect(regressionEligibility(view("t"))).toEqual({ canAdd: true, candidates: [1] });
  expect(addTableRegression(e, "t")).toBe(true);
  const state = e.getExpressions().find((s) => s.id === "t")!;
  expect(state.regression).toEqual({
    type: "linear",
    columns: { x: 0, y: 1 },
    color: colourAfter(state.columns![1].color, 1),
    hidden: false,
    isLogMode: false,
    residualVariable: "e_{1}",
  });
  await m.settled();
  const fit = view("t").table!.result!.regression!.fit;
  expect(fit.ok && fit.equation).toBe("y=0.0197568x+3.61602");
  expect(regressionEligibility(view("t")).canAdd).toBe(false);
  e.undo();
  expect(stateOf("t").regression).toBeUndefined();
});

it("RT-29 picking Quadratic refits the owner's data to y=-0.000438273x^2+0.170062x+1.02236", async () => {
  owner();
  await m.settled();
  addTableRegression(e, "t");
  setTableRegressionType(e, "t", "quadratic");
  await m.settled();
  const fit = view("t").table!.result!.regression!.fit;
  expect(fit.ok && fit.equation).toBe("y=-0.000438273x^{2}+0.170062x+1.02236");
  expect(fit.ok && fit.statistics.kind).not.toBe("RMSE");
});

it("RT-28 a table with one row, a text cell or an undefined y cell offers no regression", async () => {
  for (const values of [["1"], ["1", "\\sqrt{-1}", "3"], ["1", "abc", "2"]]) {
    e.setExpression({
      id: "t",
      type: "table",
      columns: [
        { latex: "x_{1}", values: ["1", "2", "3"].slice(0, values.length) },
        { latex: "y_{1}", values },
      ],
    });
    await m.settled();
    expect(regressionEligibility(view("t")).canAdd).toBe(false);
  }
});

it("REG-MODELS-5 the for picker changes the y column and its residual name follows the subscript", async () => {
  e.setExpression({
    id: "t",
    type: "table",
    columns: [
      { latex: "x_{1}", values: ["1", "2", "3", "4"] },
      { latex: "y_{1}", values: ["2", "4", "6", "9"] },
      { latex: "y_{2}", values: ["1", "4", "9", "16"] },
    ],
  });
  await m.settled();
  expect(regressionEligibility(view("t")).candidates).toEqual([1, 2]);
  addTableRegression(e, "t");
  setTableRegressionColumn(e, "t", 2);
  await m.settled();
  const r = view("t").table!.result!.regression!;
  expect(r.fit.ok && r.fit.equation).toBe("y=5x-5");
  expect(r.residualName).toBe("e_{2}");
});

it("RT-26 plot appends the residual column e_1 whose cells are the residuals; delete removes both", async () => {
  owner();
  await m.settled();
  addTableRegression(e, "t");
  plotTableResiduals(e, "t");
  await m.settled();
  expect(view("t").columns!.map((c) => c.latex)).toEqual(["x_{1}", "y_{1}", "e_{1}"]);
  const residuals = view("t").table!.result!.columns[2].values;
  expect(residuals[0]).toBeCloseTo(-0.8530971946124654, 12);
  expect(view("t").table!.analysis.columns[2].role).toBe("computed");
  deleteTableRegression(e, "t");
  expect(view("t").columns!.map((c) => c.latex)).toEqual(["x_{1}", "y_{1}"]);
  expect(stateOf("t").regression).toBeUndefined();
});

it("RT-24 Log Mode refits an exponential as a line through ln y and survives a switch to Linear", async () => {
  e.setExpression({
    id: "t",
    type: "table",
    columns: [
      { latex: "x_{1}", values: ["1", "2", "3", "4", "5"] },
      { latex: "y_{1}", values: ["3.1", "6.2", "11.8", "24.5", "49"] },
    ],
  });
  await m.settled();
  addTableRegression(e, "t");
  setTableRegressionType(e, "t", "exponential");
  await m.settled();
  let fit = view("t").table!.result!.regression!.fit;
  expect(fit.ok && [fit.equation, fit.logMode]).toEqual([
    "y=1.48887\\cdot2.01138^{x}",
    { available: true, on: false },
  ]);
  setTableRegressionLogMode(e, "t", true);
  await m.settled();
  fit = view("t").table!.result!.regression!.fit;
  expect(fit.ok && fit.equation).toBe("y=1.54407\\cdot1.99271^{x}");
  setTableRegressionType(e, "t", "linear");
  expect(stateOf("t").regression!.isLogMode).toBe(true);
});

it("RT-32 export writes only the template below the table, renamed when a letter is defined", async () => {
  owner();
  e.setExpression({ id: "m", latex: "m=2" });
  await m.settled();
  addTableRegression(e, "t");
  const made = exportCustomRegression(e, "t") as { id: string };
  expect(e.getSnapshot().rows.map((r) => r.id)).toEqual(["1", "t", made.id, "m"]);
  expect(view(made.id).latex).toBe("y_{1}\\sim m_{0}x_{1}+b_{0}");
  expect(exportParameterNames(["m", "b"], new Set(["m", "m_{1}"]))).toEqual(["m_{2}", "b_{2}"]);
  expect(exportParameterNames(["a", "b", "c"], new Set(["a", "b_{3}"]))).toEqual([
    "a_{4}",
    "b_{4}",
    "c_{4}",
  ]);
  await m.settled();
  const eq = exportRegressionEquation(e, "t") as { id: string };
  expect(view(eq.id).latex).toBe("y=0.0197568x+3.61602");
});

it("RT-32 export is blocked for x/y headers and computed headers", () => {
  const block = (x: string, y: string) =>
    exportBlock({
      columns: [
        { latex: x, values: [], color: "c1", hidden: false },
        { latex: y, values: [], color: "c1", hidden: false },
      ],
      regression: { type: "linear", y: 1, color: "c1", hidden: false, logMode: false },
    });
  expect(block("x", "y")).toEqual({ kind: "coordinates" });
  expect(block("x", "x^{2}")).toEqual({ kind: "column", name: "x" });
  expect(block("x_{1}", "x_{1}^{2}")).toEqual({ kind: "computed", latex: "x_{1}^{2}" });
  expect(block("x_{1}", "y_{1}")).toBeNull();
});

it("RT-3, API-5 the regression round-trips through getState and setState", async () => {
  owner();
  await m.settled();
  addTableRegression(e, "t");
  const state = e.getState();
  e.setBlank();
  e.setState(state);
  expect(stateOf("t").regression?.type).toBe("linear");
});
