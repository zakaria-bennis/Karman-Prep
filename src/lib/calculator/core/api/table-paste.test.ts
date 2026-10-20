import { expect, it } from "vitest";
import { createTestEngine } from "./__fixtures__/test-engine";
import { pasteTable, zoomFitBounds } from "./table-paste";

it("TABLES-48 zoom fit pulls in the origin, widens a flat axis and pads by half the span", () => {
  expect(
    zoomFitBounds([
      [1, 1],
      [3, 9],
    ])
  ).toEqual({ left: -1.5, right: 4.5, bottom: -4.5, top: 13.5 });
  expect(
    zoomFitBounds([
      [10, 100],
      [20, 300],
    ])
  ).toEqual({ left: -10, right: 30, bottom: -150, top: 450 });
  expect(
    zoomFitBounds([
      [-5, 2],
      [5, 2],
    ])
  ).toEqual({ left: -10, right: 10, bottom: 1, top: 3 });
  expect(
    zoomFitBounds([
      [1990, 30000],
      [2020, 48000],
    ])
  ).toEqual({
    left: 1975,
    right: 2035,
    bottom: 21000,
    top: 57000,
  });
  expect(zoomFitBounds([[3, 4]])).toEqual({ left: 2, right: 4, bottom: 3, top: 5 });
  expect(
    zoomFitBounds([
      [-10, -3],
      [-8, -1],
    ])
  ).toEqual({ left: -11, right: -7, bottom: -4.5, top: 1.5 });
});

it("TABLES-49, -51 a pasted grid replaces the empty row as x_1, y_1 and zooms when points are outside", () => {
  const e = createTestEngine().engine;
  const made = pasteTable(e, "1", [
    ["1", "3", "5"],
    ["2", "4", "60"],
  ])!;
  expect(made).toEqual({ id: "1", zoomed: true });
  const state = e.getExpressions();
  expect(state).toHaveLength(1);
  expect(state[0].columns!.map((c) => [c.latex, ...c.values])).toEqual([
    ["x_{1}", "1", "3", "5"],
    ["y_{1}", "2", "4", "60"],
  ]);
  expect(e.getSnapshot().viewport.top).toBe(90);
  const second = pasteTable(e, "1", [
    ["1", "2"],
    ["1", "2"],
    ["3", "4"],
  ])!;
  expect(second.zoomed).toBe(false);
  expect(e.getExpressions()[1].columns!.map((c) => c.latex)).toEqual(["x_{2}", "y_{2}", "z_{2}"]);
  e.undo();
  expect(e.getExpressions()).toHaveLength(1);
});
