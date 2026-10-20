// RT-2: one running colour counter (red, blue, green, purple, black; orange skipped) feeds every
// new row, table column, regression, exported row and residual column. Tests assert positions in
// the cycle, never one hard-coded colour on its own.
import { beforeEach, expect, it } from "vitest";
import { NEW_ROW_COLOURS } from "../../theme/desmos-palette";
import { createTestEngine, type TestEngine } from "./__fixtures__/test-engine";
import {
  addTableRegression,
  exportRegressionEquation,
  plotTableResiduals,
} from "./table-regression-commands";

let m: TestEngine;
let e: TestEngine["engine"];
beforeEach(() => {
  m = createTestEngine(undefined, { backend: "main-thread" });
  e = m.engine;
});

const cycle = (from: number, n: number) =>
  Array.from({ length: n }, (_, k) => NEW_ROW_COLOURS[(from + k) % NEW_ROW_COLOURS.length]);
const stateOf = (id: string) => e.getExpressions().find((s) => s.id === id)!;

it("RT-2 a table set without colours gives each column the next colour after the blank row's red", () => {
  e.removeExpression({ id: "1" });
  e.setExpression({
    id: "t",
    type: "table",
    columns: [
      { latex: "x_{1}", values: ["1", "2", "3"] },
      { latex: "y_{1}", values: ["2", "4", "7"] },
    ],
  });
  expect(stateOf("t").columns!.map((c) => c.color)).toEqual(cycle(1, 2));
});

it("RT-2 the blank header slot holds a colour, then the regression, residual column and exported equation take the following ones", async () => {
  e.setExpression({
    id: "t",
    type: "table",
    columns: [
      { latex: "x_{1}", values: ["1", "2", "3", "4", "5"] },
      { latex: "y_{1}", values: ["2.1", "3.9", "6.2", "7.8", "10.1"] },
    ],
  });
  await m.settled();
  expect(addTableRegression(e, "t")).toBe(true);
  await m.settled();
  expect(plotTableResiduals(e, "t")).toBe(true);
  await m.settled();
  const made = exportRegressionEquation(e, "t") as { id: string };
  const t = stateOf("t");
  expect([
    ...t.columns!.slice(0, 2).map((c) => c.color),
    t.regression!.color,
    t.columns![2].color,
    stateOf(made.id).color,
  ]).toEqual([...cycle(1, 2), ...cycle(4, 3)]); // cycle(3) went to the blank header slot
});

it("RT-2 the Add Item table takes a colour per column, and a deleted row does not rewind the counter", () => {
  const second = e.insertRowAfter("1") as { id: string };
  e.removeExpression({ id: second.id });
  const table = e.insertTableAfter("1") as { id: string };
  expect(stateOf(table.id).columns!.map((c) => c.color)).toEqual(cycle(2, 2));
  const next = e.insertRowAfter(table.id) as { id: string };
  expect(stateOf(next.id).color).toBe(cycle(5, 1)[0]); // cycle(4) is the blank header slot's
  e.editHeader(table.id, 2, "z_{1}", "typing");
  e.editHeader(table.id, 3, "w_{1}", "typing");
  expect(stateOf(table.id).columns!.map((c) => c.color)).toEqual(cycle(2, 3).concat(cycle(6, 1)));
});

it("RT-2 loading a state restarts the counter at red for rows without a colour", () => {
  e.insertRowAfter("1");
  const state = e.getState();
  e.setState({
    ...state,
    expressions: [
      { id: "a", latex: "y=x" },
      { id: "b", latex: "y=2x" },
    ],
  });
  expect(e.getExpressions().map((s) => s.color)).toEqual(cycle(0, 2));
  const next = e.insertRowAfter("b") as { id: string };
  expect(stateOf(next.id).color).toBe(cycle(2, 1)[0]);
});
