import { expect, it } from "vitest";
import { createTestEngine, TEST_VIEW } from "./__fixtures__/test-engine";

const selects = (posted: readonly { type: string }[]) =>
  posted.filter((m) => m.type === "select") as { type: "select"; rowId: string | null }[];

it("POI-17 focusing or activating a row selects it; setSelectedRow(null) clears it; deleting the row clears it", () => {
  const t = createTestEngine();
  const e = t.engine;
  e.setExpressions([
    { id: "a", latex: "y=x" },
    { id: "b", latex: "y=2" },
  ]);
  expect(e.getSnapshot().selectedRowId).toBeNull();
  e.setFocusedRow("a");
  expect(e.getSnapshot().selectedRowId).toBe("a");
  e.setFocusedRow(null); // focus leaving the list keeps the selection
  expect(e.getSnapshot().selectedRowId).toBe("a");
  e.activateExpression("b");
  expect(e.getSnapshot().selectedRowId).toBe("b");
  e.setSelectedRow("a");
  expect(e.getSnapshot().selectedRowId).toBe("a");
  expect(selects(t.posted).map((m) => m.rowId)).toEqual(["a", "b", "a"]);
  e.setSelectedRow(null);
  expect(e.getSnapshot().selectedRowId).toBeNull();
  e.setSelectedRow("b");
  e.removeExpression({ id: "b" });
  expect(e.getSnapshot().selectedRowId).toBeNull();
  expect(selects(t.posted).at(-1)?.rowId).toBeNull();
});

it("POI-1 the snapshot holds the selected row's points from the latest generation only", () => {
  const t = createTestEngine();
  const e = t.engine;
  e.setExpressions([{ id: "a", latex: "y=x^{2}-2" }]);
  e.setView(TEST_VIEW);
  e.setSelectedRow("a");
  const gen = t.latestGeneration();
  const point = { x: 0, y: -2, kinds: ["intercept" as const], withRowId: null };
  t.emit({ v: 1, type: "poi", generation: gen - 1, rowId: "a", points: [point] });
  t.flushFrames();
  expect(e.getSnapshot().poi).toBeNull();
  t.emit({ v: 1, type: "poi", generation: gen, rowId: "a", points: [point] });
  t.flushFrames();
  expect(e.getSnapshot().poi).toEqual({ rowId: "a", points: [point] });
  e.setSelectedRow(null);
  expect(e.getSnapshot().poi).toBeNull();
});

it("POI-1 the main-thread backend finds the selected row's points of interest end to end", async () => {
  const m = createTestEngine(undefined, { backend: "main-thread" });
  m.engine.setExpressions([{ id: "a", latex: "y=x^{2}-2" }]);
  m.engine.setView(TEST_VIEW);
  m.engine.setSelectedRow("a");
  await m.settled();
  for (let k = 0; k < 20 && m.engine.getSnapshot().poi === null; k++) {
    await new Promise((r) => setTimeout(r, 5));
    m.flushFrames();
  }
  expect(m.engine.getSnapshot().poi?.points.map((p) => p.kinds)).toEqual([
    ["zero"],
    ["intercept", "extremum"],
    ["zero"],
  ]);
});
