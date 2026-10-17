import { beforeEach, expect, it } from "vitest";
import { createTestEngine, type TestEngine } from "./__fixtures__/test-engine";

let t: TestEngine;
let e: TestEngine["engine"];
beforeEach(() => {
  t = createTestEngine();
  e = t.engine;
});

it("NM-42 setExpression and setExpressions over the row or character limit throw invalid-argument and change nothing", () => {
  expect(() => e.setExpression({ id: "a", latex: "1".repeat(2049) })).toThrow(
    expect.objectContaining({ code: "invalid-argument" })
  );
  expect(() =>
    e.setExpressions(Array.from({ length: 100 }, (_, i) => ({ id: `n${i}`, latex: "1" })))
  ).toThrow(expect.objectContaining({ code: "invalid-argument" })); // 101 rows
  expect(e.getExpressions()).toHaveLength(1);
  expect(e.canUndo()).toBe(false);
});
it("NM-42 typing, keypad and paste edits over 2,048 characters are refused and leave the list unchanged", () => {
  const before = e.getSnapshot();
  for (const s of ["typing", "keypad", "paste"] as const)
    expect(e.editRow("1", "1".repeat(2049), s)).toBe("char-limit");
  expect(e.getSnapshot()).toBe(before);
  expect(e.editRow("1", "1".repeat(2048), "typing")).toBeNull();
});
it("NM-42 a 101st row is refused with row-limit", () => {
  e.setExpressions(Array.from({ length: 99 }, (_, i) => ({ id: `n${i}`, latex: "1" })));
  expect(e.getExpressions()).toHaveLength(100);
  expect(e.insertRowAfter(null)).toBe("row-limit");
  expect(e.insertRowAfter("n3")).toBe("row-limit");
  expect(e.getExpressions()).toHaveLength(100);
});
it("NM-42, API-13 at 100 rows setExpression throws invalid-argument for a new id and changes nothing, and still updates an existing row", () => {
  e.setExpressions(Array.from({ length: 99 }, (_, i) => ({ id: `n${i}`, latex: "1" })));
  expect(e.getExpressions()).toHaveLength(100);
  const before = e.getSnapshot(),
    canUndo = e.canUndo();
  expect(() => e.setExpression({ id: "x101", latex: "1" })).toThrow(
    expect.objectContaining({ code: "invalid-argument" })
  );
  expect(e.getExpressions()).toHaveLength(100);
  expect(e.getSnapshot()).toBe(before);
  expect(e.canUndo()).toBe(canUndo);
  e.setExpression({ id: "n0", latex: "2" });
  expect(e.getExpressions()).toHaveLength(100);
  expect(e.getExpressions().find((r) => r.id === "n0")?.latex).toBe("2");
  e.undo(); // undoes the n0 update
  e.undo(); // undoes setExpressions: the refused call added no step in between
  expect(e.getExpressions().map((r) => r.id)).toEqual(["1"]);
});
it("NM-42 tree-node, nesting-depth and parameter limits give row errors", () => {
  e.setExpressions([
    { id: "n", latex: "1+".repeat(1000) + "1" },
    { id: "d", latex: "\\sqrt{".repeat(65) + "x" + "}".repeat(65) },
    { id: "p", latex: "f(a,b,c,d,g,h,k,m,n)=1" },
  ]);
  expect(
    e
      .getSnapshot()
      .rows.slice(1)
      .map((r) => r.error?.code)
  ).toEqual(["too-many-nodes", "too-deep", "too-many-params"]);
});
it("NM-42 setState over the row or character limit throws invalid-argument and changes nothing", () => {
  const s = e.getState();
  for (const expressions of [
    Array.from({ length: 101 }, (_, i) => ({ id: `n${i}`, latex: "1" })),
    [{ id: "a", latex: "1".repeat(2049) }],
  ]) {
    expect(() => e.setState({ ...s, expressions })).toThrow(
      expect.objectContaining({ code: "invalid-argument" })
    );
    expect(e.getState()).toEqual(s);
  }
});
