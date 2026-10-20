// RT-10: Convert to Table on point-list rows, through the engine and the real values pass.
import { beforeEach, expect, it } from "vitest";
import { createTestEngine, type TestEngine } from "./__fixtures__/test-engine";
import { convertPointsToTable, pointListCells } from "./row-commands";

let m: TestEngine;
let e: TestEngine["engine"];
beforeEach(() => {
  m = createTestEngine(undefined, { backend: "main-thread" });
  e = m.engine;
});

const columnsOf = (id: string) =>
  e
    .getExpressions()
    .find((s) => s.id === id)!
    .columns!.map((c) => [c.latex, ...c.values]);

it("RT-10 [(1,2),(3,4)] is replaced in place by a data table of its coordinates; Undo restores it", async () => {
  // The bare `(1,2),(3,4)` list does not parse in this calculator yet; the bracketed list does.
  e.setExpression({ id: "p", latex: "[(1,2),(3,4)]" });
  await m.settled();
  expect(convertPointsToTable(e, "p")).toEqual({ id: "p" });
  expect(e.getExpressions().map((s) => s.type)).toEqual(["expression", "table"]); // the blank row "1", then p
  expect(columnsOf("p")).toEqual([
    ["x_{1}", "1", "3"],
    ["y_{1}", "2", "4"],
  ]);
  e.undo();
  expect(e.getExpressions().find((s) => s.id === "p")!.latex).toBe("[(1,2),(3,4)]");
});

it("RT-10 coordinates keep full precision, list points spread and undefined is blank", async () => {
  e.setExpressions([
    { id: "a", latex: "(\\frac{1}{3},\\pi)" },
    { id: "b", latex: "([1,2,3],[4,5,6])" },
    { id: "c", latex: "[(1,\\sqrt{-1}),(2,3)]" },
  ]);
  await m.settled();
  expect(pointListCells(e, "a")).toEqual({ xs: ["0.3333333333333333"], ys: ["3.141592653589793"] });
  expect(pointListCells(e, "b")).toEqual({ xs: ["1", "2", "3"], ys: ["4", "5", "6"] });
  expect(pointListCells(e, "c")).toEqual({ xs: ["1", "2"], ys: ["", "3"] });
});

it("RT-10 a named point list, an equation and a single named point are not converted in place", async () => {
  e.setExpressions([
    { id: "a", latex: "P=(1,2),(3,4)" },
    { id: "b", latex: "y=x^2" },
    { id: "c", latex: "Q=(5,6)" },
  ]);
  await m.settled();
  for (const id of ["a", "b", "c"]) expect(pointListCells(e, id)).toBeNull();
});
