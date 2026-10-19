import { expect, it } from "vitest";
import { nextTableNames, residualName } from "./naming";

it("D-4 a new table takes the lowest n whose x_n and y_n are unused by rows, headers and references", () => {
  expect(nextTableNames(new Set(), 1)).toEqual({ x: "x_{1}", ys: ["y_{1}"] });
  expect(nextTableNames(new Set(["x_{1}"]), 1)).toEqual({ x: "x_{2}", ys: ["y_{2}"] });
  expect(nextTableNames(new Set(["y_{2}", "x_{1}"]), 1)).toEqual({ x: "x_{3}", ys: ["y_{3}"] });
  expect(nextTableNames(new Set(["y_{2}"]), 2)).toEqual({ x: "x_{3}", ys: ["y_{3}", "y_{4}"] });
  expect(nextTableNames(new Set(["x_{1}", "y_{1}"]), 0)).toEqual({ x: "x_{2}", ys: [] });
});

it("D-33 residual lists take the lowest free e_k", () => {
  expect(residualName(new Set())).toBe("e_{1}");
  expect(residualName(new Set(["e_{1}", "e_{3}"]))).toBe("e_{2}");
});
