import { beforeEach, expect, it } from "vitest";
import { createTestEngine, type TestEngine } from "./__fixtures__/test-engine";
import { insertRegressionBelow } from "./row-commands";

let e: TestEngine["engine"];
beforeEach(() => {
  e = createTestEngine().engine;
  e.setExpression({
    id: "t",
    type: "table",
    columns: [
      { latex: "x_{1}", values: ["1", "2"] },
      { latex: "y_{1}", values: ["3", "5"] },
    ],
  });
});
const latex = () => e.getSnapshot().rows.map((r) => r.latex);

it("D-3 Add regression inserts y1~mx1+b below the table as one undo step", () => {
  e.setExpression({ id: "z", latex: "y=x" });
  const made = insertRegressionBelow(e, "t") as { id: string };
  expect(e.getSnapshot().rows.map((r) => r.id)).toEqual(["1", "t", made.id, "z"]);
  expect(latex()[2]).toBe("y_{1}\\sim mx_{1}+b");
  e.undo();
  expect(e.getSnapshot().rows).toHaveLength(3);
});

it("D-23 the parameters take the lowest free subscript when m or b is in use", () => {
  e.setExpression({ id: "a", latex: "b=4" });
  insertRegressionBelow(e, "t");
  expect(latex()).toContain("y_{1}\\sim m_{1}x_{1}+b_{1}");
  expect(insertRegressionBelow(e, "t", 5)).toBeNull();
});
