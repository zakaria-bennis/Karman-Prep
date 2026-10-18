import { beforeEach, expect, it } from "vitest";
import { createTestEngine, type TestEngine } from "./__fixtures__/test-engine";
import type { StoredColumn } from "./document";

let t: TestEngine;
let e: TestEngine["engine"];
beforeEach(() => {
  t = createTestEngine();
  e = t.engine;
});

const table = (id: string) => e.getSnapshot().rows.find((r) => r.id === id)!;
const headers = (id: string) => table(id).columns!.map((c) => c.latex);
const cells = (id: string) => table(id).columns!.map((c) => [...c.values]);

it("D-4 a new table takes the lowest n whose x_n and y_n are unused by rows, headers and references", () => {
  const first = e.insertTableAfter(null);
  if (typeof first === "string") throw new Error(first);
  expect(headers(first.id)).toEqual(["x_{1}", "y_{1}"]);
  e.setExpression({ id: "a", latex: "x_{2}=3" });
  const second = e.insertTableAfter("a");
  if (typeof second === "string") throw new Error(second);
  expect(headers(second.id)).toEqual(["x_{3}", "y_{3}"]);
  e.setExpression({ id: "b", latex: "y_{4}+1" });
  const third = e.insertTableAfter(null) as { id: string };
  expect(headers(third.id)).toEqual(["x_{5}", "y_{5}"]); // y_{4} is referenced
});

it("D-5 replaceWithTable turns an empty expression row into a table in place and inserts after any other row", () => {
  const { id } = e.replaceWithTable("1") as { id: string };
  expect(id).toBe("1");
  expect(table("1").type).toBe("table");
  e.setExpression({ id: "z", latex: "y=x" });
  const after = e.replaceWithTable("z") as { id: string };
  expect(after.id).not.toBe("z");
  expect(e.getSnapshot().rows.map((r) => r.id)).toEqual(["1", "z", after.id]);
});

it("API-3 setExpression accepts a table with columns and getExpressions returns it", () => {
  const columns = [
    { latex: "x_{1}", values: ["1", "2"] },
    { latex: "y_{1}", values: ["3", ""], color: "c2", hidden: false },
  ];
  e.setExpression({ id: "t", type: "table", columns });
  const state = e.getExpressions().find((r) => r.id === "t")!;
  expect(state.type).toBe("table");
  expect(state.columns).toEqual([
    { latex: "x_{1}", values: ["1", "2"], color: "c2", hidden: false },
    { latex: "y_{1}", values: ["3", ""], color: "c2", hidden: false },
  ]);
  expect(() => e.setExpression({ id: "u", columns } as never)).toThrow(
    /columns needs type "table"/
  );
  expect(() =>
    e.setExpression({
      id: "v",
      type: "table",
      columns: Array.from({ length: 11 }, () => ({ latex: "", values: [] })),
    })
  ).toThrow(/at most 10 columns/);
});

it("D-20 table creation, a cell edit and a header edit are one undo step each, typing coalesces per table", () => {
  const { id } = e.insertTableAfter("1") as { id: string };
  expect(e.editCell(id, 0, 0, "1", "api")).toBeNull();
  expect(e.editCell(id, 1, 0, "2", "typing")).toBeNull();
  t.advance(100);
  expect(e.editCell(id, 1, 0, "25", "typing")).toBeNull();
  expect(cells(id)).toEqual([["1"], ["25"]]);
  e.editHeader(id, 1, "y_{9}", "api");
  e.undo();
  expect(headers(id)).toEqual(["x_{1}", "y_{1}"]);
  e.undo();
  expect(cells(id)).toEqual([["1"], [""]]);
  e.undo();
  e.undo();
  expect(e.getSnapshot().rows.map((r) => r.id)).toEqual(["1"]);
});

it("D-8 trailing empty rows are trimmed, interior empty rows stay, rows delete, and limits refuse edits", () => {
  const { id } = e.insertTableAfter(null) as { id: string };
  e.editCell(id, 0, 2, "3", "api");
  expect(cells(id)).toEqual([
    ["", "", "3"],
    ["", "", ""],
  ]);
  e.editCell(id, 0, 2, "", "api");
  expect(cells(id)).toEqual([[], []]);
  e.editCell(id, 0, 0, "1", "api");
  e.editCell(id, 0, 1, "2", "api");
  e.deleteTableRow(id, 0);
  expect(cells(id)).toEqual([["2"], [""]]);
  expect(e.editCell(id, 0, 1000, "1", "api")).toBe("row-limit");
  expect(e.editCell(id, 0, 0, "1".repeat(129), "api")).toBe("char-limit");
});

it("D-9 a header typed in the slot after the last column adds a column in the next colour, at most 10", () => {
  const { id } = e.insertTableAfter(null) as { id: string };
  e.editHeader(id, 2, "y_{2}", "api");
  const cols: readonly StoredColumn[] = table(id).columns!;
  expect(cols.map((c) => c.latex)).toEqual(["x_{1}", "y_{1}", "y_{2}"]);
  expect(cols[2].color).not.toBe(cols[1].color);
  for (let k = 3; k < 10; k++) e.editHeader(id, k, `y_{${k}}`, "api");
  expect(e.editHeader(id, 10, "z", "api")).toBe("row-limit");
  expect(table(id).columns).toHaveLength(10);
});

it("D-12 setColumnStyle changes one column's style and deleting a table leaves an empty expression row", () => {
  const { id } = e.insertTableAfter(null) as { id: string };
  e.setColumnStyle(id, 1, { hidden: true, lines: true, pointStyle: "open" });
  expect(table(id).columns![1]).toMatchObject({ hidden: true, lines: true, pointStyle: "open" });
  e.deleteRow(id);
  expect(table(id)).toMatchObject({ type: "expression", latex: "", columns: null });
  e.undo();
  expect(table(id).type).toBe("table");
});

it("D-11 the worker posts a table result the snapshot exposes on the row view", async () => {
  const m = createTestEngine(undefined, { backend: "main-thread" });
  m.engine.setExpression({
    id: "t",
    type: "table",
    columns: [
      { latex: "x_{1}", values: ["1", "2"] },
      { latex: "x_{1}^{2}", values: [] },
    ],
  });
  await m.settled();
  const view = m.engine.getSnapshot().rows.find((r) => r.id === "t")!;
  expect(view.table?.analysis.columns.map((c) => c.role)).toEqual(["variable", "computed"]);
  expect(view.table?.result?.columns[1].display).toEqual(["1", "4"]);
  m.engine.editCell("t", 0, 1, "3", "api");
  await m.settled();
  const after = m.engine.getSnapshot().rows.find((r) => r.id === "t")!;
  expect(after.table?.result?.columns[1].values).toEqual([1, 9]);
  expect(m.received.some((msg) => msg.type === "table")).toBe(true);
});
