import { beforeEach, expect, it } from "vitest";
import { createFakeBackend, createTestEngine, type TestEngine } from "./__fixtures__/test-engine";
import { HISTORY_LIMIT } from "./document";
import { CalculatorEngine } from "./engine";
import type { ExpressionState } from "./types";

let t: TestEngine;
let e: CalculatorEngine;
beforeEach(() => {
  t = createTestEngine();
  e = t.engine;
});

it("API-1 the constructor rejects invalid options before posting anything", () => {
  const backend = createFakeBackend();
  expect(
    () =>
      new CalculatorEngine(
        { mode: "scientific" },
        { backend, scheduleFrame: () => {}, now: () => 0, randomSeed: () => 1 }
      )
  ).toThrow(expect.objectContaining({ code: "unsupported" }));
  expect(backend.posted).toEqual([]);
});
it("API-2 setExpression upserts one row by id and omitted fields keep their values", () => {
  e.setExpression({ id: "a", latex: "y=x", color: "#112233", hidden: true });
  e.setExpression({ id: "a", latex: "y=2x" });
  expect(e.getExpressions()).toEqual([
    { id: "1", type: "expression", latex: "", color: "c1", hidden: false },
    { id: "a", type: "expression", latex: "y=2x", color: "#112233", hidden: true },
  ]);
});
it("API-2 setExpressions upserts several rows as one undo step", () => {
  e.setExpressions([
    { id: "a", latex: "1" },
    { id: "b", latex: "2" },
  ]);
  expect(e.getExpressions().map((r) => r.id)).toEqual(["1", "a", "b"]);
  e.undo();
  expect(e.getExpressions().map((r) => r.id)).toEqual(["1"]);
  e.redo();
  expect(e.getExpressions().map((r) => [r.id, r.latex])).toEqual([
    ["1", ""],
    ["a", "1"],
    ["b", "2"],
  ]);
});
it("API-2, F-A1 a new row takes the next Desmos colour, skipping orange", () => {
  e.setExpressions(["a", "b", "c", "d", "e", "f"].map((id) => ({ id, latex: "x" })));
  expect(e.getExpressions().map((r) => r.color)).toEqual([
    "c1",
    "c2",
    "#388c46",
    "c4",
    "c6",
    "c1",
    "c2",
  ]);
});
it("API-2 note, folder, image and text throw unsupported and change nothing (OI-23)", () => {
  for (const type of ["note", "folder", "image", "text"]) {
    expect(() =>
      e.setExpressions([{ id: "ok", latex: "1" }, { id: "n", type } as unknown as ExpressionState])
    ).toThrow(expect.objectContaining({ code: "unsupported" }));
    expect(e.getExpressions().map((r) => r.id)).toEqual(["1"]);
  }
});
it("API-4 removeExpression and removeExpressions delete rows as one undo step and never leave the list empty", () => {
  const ids = () => e.getExpressions().map((r) => r.id);
  e.setExpressions([{ id: "a" }, { id: "b" }, { id: "c" }]);
  e.removeExpressions([{ id: "a" }, { id: "b" }]);
  expect(ids()).toEqual(["1", "c"]);
  e.undo();
  expect(ids()).toEqual(["1", "a", "b", "c"]);
  e.redo();
  e.removeExpression({ id: "zz" }); // no-op: adds no step
  e.undo();
  expect(ids()).toEqual(["1", "a", "b", "c"]);
  e.removeExpressions(ids().map((id) => ({ id })));
  expect(e.getExpressions()).toEqual([
    { id: "2", type: "expression", latex: "", color: "c1", hidden: false },
  ]);
  e.editRow("2", "y=x", "api");
  e.deleteRow("2"); // R-9: the only row is emptied and keeps its id
  expect(e.getExpressions()).toEqual([
    { id: "2", type: "expression", latex: "", color: "c1", hidden: false },
  ]);
});
it("API-4 getExpressions returns deep copies in list order", () => {
  e.setExpression({ id: "a", latex: "1", sliderBounds: { min: "0", max: "1", step: "0.1" } });
  const got = e.getExpressions();
  got[1].latex = "changed";
  got[1].sliderBounds!.min = "-5";
  got.reverse();
  expect(e.getExpressions()).toEqual([
    { id: "1", type: "expression", latex: "", color: "c1", hidden: false },
    {
      id: "a",
      type: "expression",
      latex: "1",
      color: "c2",
      hidden: false,
      sliderBounds: { min: "0", max: "1", step: "0.1" },
    },
  ]);
});
it("API-11 undo and redo share one history stack across API calls and row edits", () => {
  const rowsNow = () => e.getExpressions().map((r) => [r.id, r.latex]);
  e.setExpression({ id: "a", latex: "y=x" });
  e.editRow("1", "2", "typing");
  e.endEditGroup();
  e.clearAll();
  e.undo();
  expect(rowsNow()).toEqual([
    ["1", "2"],
    ["a", "y=x"],
  ]);
  e.undo();
  expect(rowsNow()).toEqual([
    ["1", ""],
    ["a", "y=x"],
  ]);
  e.undo();
  expect(rowsNow()).toEqual([["1", ""]]);
  expect(e.canUndo()).toBe(false);
  e.redo();
  expect(e.canRedo()).toBe(true);
  e.editRow("1", "3", "typing"); // a new edit clears redo
  expect(e.canRedo()).toBe(false);
});
it("API-11 typing and keypad edits to one row coalesce until 1,000 ms idle, endEditGroup or another step", () => {
  // KB-2 names typing only; coalescing "keypad" edits too is Decision 6's plan value (Notes for the lead)
  e.editRow("1", "1", "typing");
  t.advance(999);
  e.editRow("1", "12", "keypad");
  t.advance(999);
  e.editRow("1", "123", "typing");
  e.undo();
  expect(e.getExpressions()[0].latex).toBe("");
  e.redo();
  t.advance(1000); // 1,000 ms idle ends the group
  e.editRow("1", "1234", "typing");
  e.undo();
  expect(e.getExpressions()[0].latex).toBe("123");
  e.editRow("1", "12a", "typing");
  e.endEditGroup();
  e.editRow("1", "12ab", "typing");
  e.undo();
  expect(e.getExpressions()[0].latex).toBe("12a");
  e.editRow("1", "p", "paste");
  e.editRow("1", "pq", "paste"); // paste is one step per edit
  e.undo();
  expect(e.getExpressions()[0].latex).toBe("p");
  e.editRow("1", "pqa", "api");
  e.editRow("1", "pqab", "api"); // api is one step per edit
  e.undo();
  expect(e.getExpressions()[0].latex).toBe("pqa");
});
it("API-11 clearAll and deleteRow are single steps; clearAll keeps settings and the viewport and leaves one empty row", () => {
  expect([e.canUndo(), e.canRedo()]).toEqual([false, false]);
  e.setExpressions([
    { id: "a", latex: "y=x" },
    { id: "b", latex: "2" },
  ]);
  const before = e.getSnapshot();
  e.clearAll();
  expect(e.getExpressions()).toEqual([
    { id: expect.any(String), type: "expression", latex: "", color: "c1", hidden: false },
  ]);
  expect(e.getSnapshot().settings).toEqual(before.settings);
  expect(e.getSnapshot().viewport).toEqual(before.viewport);
  e.undo();
  expect(e.getExpressions().map((r) => r.id)).toEqual(["1", "a", "b"]);
  e.deleteRow("a");
  expect(e.getExpressions().map((r) => r.id)).toEqual(["1", "b"]);
  e.undo();
  expect(e.getExpressions().map((r) => r.id)).toEqual(["1", "a", "b"]);
  while (e.canUndo()) e.undo();
  expect([e.canUndo(), e.canRedo()]).toEqual([false, true]);
  while (e.canRedo()) e.redo();
  expect([e.canUndo(), e.canRedo()]).toEqual([true, false]);
  e.clearHistory();
  expect([e.canUndo(), e.canRedo()]).toEqual([false, false]);
});
it("API-11 the history keeps the last 100 steps", () => {
  // HISTORY_LIMIT = 100 comes from Decision 6, not from the spec: no ID sets a history size (Notes for the lead)
  for (let i = 1; i <= 105; i++) e.setExpression({ id: "a", latex: String(i) });
  let undos = 0;
  while (e.canUndo()) {
    e.undo();
    undos++;
  }
  expect(undos).toBe(HISTORY_LIMIT);
  expect(e.getExpressions().find((r) => r.id === "a")?.latex).toBe("5"); // steps 1 to 5 were dropped
});
it("AR-45 the engine posts versioned plain hello and state messages with wire rows", () => {
  expect(t.posted.slice(0, 2)).toEqual([
    { v: 1, type: "hello", seed: 1 },
    {
      v: 1,
      type: "state",
      generation: 1,
      rows: [
        {
          id: "1",
          type: "expression",
          latex: "",
          columns: null,
          hidden: false,
          sliderBounds: null,
          logMode: false,
        },
      ],
      settings: { angleMode: "radians", complex: false },
      sliders: {},
    },
  ]);
  for (const m of t.posted) expect(structuredClone(m)).toEqual(m);
});
it("AR-46 every state send increments the generation by one", () => {
  e.setExpression({ id: "a", latex: "y=x" });
  e.editRow("a", "y=2x", "typing");
  e.undo();
  e.setRowHidden("a", true);
  expect(t.posted.flatMap((m) => (m.type === "state" ? [m.generation] : []))).toEqual([
    1, 2, 3, 4, 5,
  ]);
});
