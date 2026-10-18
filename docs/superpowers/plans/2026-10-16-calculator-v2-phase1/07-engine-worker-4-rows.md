# 07 engine-worker, part 4 of 7: engine rows, history and state posting (Task 9)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

Part 4 of package `07-engine-worker.md`, which holds the package header (IDs, contributions,
open items, Commands), the Decisions and the Notes for the lead; they apply to every task here,
and "Decision N" and "Notes for the lead" below refer to that file. Tasks run in number order
across the seven parts; each part starts where the previous one ends. Contracts:
`01-interfaces.md` sections 0 to 5, `01-interfaces-runtime.md` sections 7 and 8 and
`01-interfaces-integration.md` section 16; every name below is theirs.

---

### Task 9: Engine rows, history and state posting (API-1, API-2, API-4, API-11, NM-42, AR-45, AR-46, OI-23; TH-10 contribution)

The colour-slot test is also 07's index 5.3 contribution to TH-10 (owner 03): it is the only
test of TH-10's "rows store slot ids in the API" and "new rows take slots in order c1 to c6 and
repeat" through the engine, so its title leads with both IDs (03 coordination note 6).

**Files:**

- Create `src/lib/calculator-v2/core/api/engine.ts`, `src/lib/calculator-v2/core/api/document.ts`,
  `src/lib/calculator-v2/core/api/state.ts`,
  `src/lib/calculator-v2/core/api/__fixtures__/test-engine.ts`.
- Test `src/lib/calculator-v2/core/api/engine.rows.test.ts`,
  `src/lib/calculator-v2/core/api/engine.limits.test.ts`.
- Modify `docs/superpowers/specs/calculator-v2/d-architecture-integration.md` (API-2).

**Interfaces:**

- Consumes:
  - Tasks 1, 2 and 7.
  - `analyzeRows`, `RowAnalysis`, `RowKind` (04) and `nextSlot` (03).
  - `MAX_ROWS`, `MAX_ROW_CHARACTERS` (02) and `defaultViewport` (06).
  - `macrotask` (Task 6) for `settled()`.
- Produces:
  - `EngineDeps`, `RowView`, `EngineSnapshot`, `EditSource` and `EditRefusal` (section 8).
  - The first members of `CalculatorEngine`, with section 8's signatures: the constructor,
    `setExpression`, `setExpressions`, `removeExpression`, `removeExpressions`,
    `getExpressions`, `undo`, `redo`, `clearHistory`, `canUndo`, `canRedo`, `subscribe`,
    `getSnapshot`, `editRow`, `endEditGroup`, `insertRowAfter`, `deleteRow`, `clearAll` and
    `setRowHidden`.
  - `document.ts` (package-internal; Decisions 6 and 7):

```ts
export const HISTORY_LIMIT = 100;
export const INITIAL_GRAPH_SIZE: PixelSize; // { width: 800, height: 600 }
export interface StoredRow {
  readonly id: string;
  readonly latex: string;
  readonly color: string; // "c1".."c6" or "#rrggbb"
  readonly hidden: boolean;
  readonly lineStyle?: LineStyle;
  readonly pointStyle?: PointStyle;
  readonly sliderBounds?: { readonly min: string; readonly max: string; readonly step: string };
}
export type HistoryStep =
  | { kind: "none" } // no undo entry (setState without allowUndo)
  | { kind: "step" } // one undo entry
  | { kind: "group"; rowId: string; at: number }; // "typing"/"keypad": joins the open group for rowId while at − last edit < 1,000 ms
export class RowDocument {
  get rows(): readonly StoredRow[];
  reset(): void; // [{ id: "1", latex: "", color: "c1", hidden: false }], id counter 1, history empty
  nextId(): string; // one more than the larger of the counter and the largest decimal id present
  commit(rows: readonly StoredRow[], step: HistoryStep): void; // an empty list becomes one empty row with nextId() and colour "c1"
  endGroup(): void;
  undo(): boolean; // false when there is nothing to undo; ends the group
  redo(): boolean;
  clearHistory(): void;
  canUndo(): boolean;
  canRedo(): boolean;
}
```

- `state.ts` (package-internal; Task 10 extends it):

```ts
export function toWireRows(rows: readonly StoredRow[]): WireRow[]; // type "expression", columns null, sliderBounds ?? null
export function toWireSettings(settings: CalculatorSettings): WireSettings; // { angleMode, complex }
export function upsertRows(
  rows: readonly StoredRow[],
  list: readonly ExpressionState[]
): StoredRow[];
// existing ids merge (omitted fields keep their values); new ids append with color ?? nextSlot(index), latex ?? "", hidden ?? false
export function toExpressionState(row: StoredRow): ExpressionState; // deep copy; keys id, type, latex, color, hidden, then lineStyle, pointStyle, sliderBounds where set
```

- The test fixture, which 12's TR-79 tests may reuse:

```ts
export interface FakeBackend extends ComputeBackend {
  readonly posted: MainToWorker[];
  readonly disposed: boolean;
  emit(message: WorkerToMain): void;
}
export function createFakeBackend(): FakeBackend; // kind "worker"; emit delivers synchronously
export interface TestEngine {
  engine: CalculatorEngine;
  backend: FakeBackend | null; // null with the main-thread backend
  posted: MainToWorker[];
  received: WorkerToMain[];
  emit(message: WorkerToMain): void; // fake backend only
  flushFrames(): void; // runs queued scheduleFrame callbacks, including ones they queue
  advance(ms: number): void; // advances deps.now
  settled(): Promise<void>; // main-thread: polls with macrotask() until done for the latest state/view generation and a value for every live job, then flushFrames(); rejects after 10,000 ms of performance.now() time
  latestGeneration(): number;
}
export function createTestEngine(
  options?: CalculatorOptions,
  config?: { backend?: "fake" | "main-thread"; randomSeeds?: number[] }
): TestEngine;
// defaults: backend "fake"; deps.randomSeed returns randomSeeds in order (default 1, 2, 3, …); deps.now starts at 0
export const TEST_VIEW: ViewSpec; // defaultViewport 800×600, dpr 1
```

- [ ] **Step 1: Write the failing tests and the test-engine fixture.** Write
      `src/lib/calculator-v2/core/api/__fixtures__/test-engine.ts` in this step, together with
      the tests; it imports `CalculatorEngine` from `"../engine"`. In both test files,
      `beforeEach` sets `t = createTestEngine()` and `e = t.engine`; `engine.rows.test.ts` also
      imports `CalculatorEngine` from `"./engine"` and `createFakeBackend` from the fixture.

```ts
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
it("API-2, TH-10 a new row takes the next skin colour slot", () => {
  e.setExpressions(["a", "b", "c", "d", "e", "f"].map((id) => ({ id, latex: "x" })));
  expect(e.getExpressions().map((r) => r.color)).toEqual([
    "c1",
    "c2",
    "c3",
    "c4",
    "c5",
    "c6",
    "c1",
  ]);
});
it("API-2 note, folder, image and text throw unsupported and change nothing (OI-23)", () => {
  for (const type of ["note", "folder", "image", "text", "table"]) {
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
// engine.limits.test.ts
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
```

- [ ] **Step 2: Run them and see them fail.**
      `n exec 22 npx vitest run src/lib/calculator-v2/core/api/engine.rows.test.ts src/lib/calculator-v2/core/api/engine.limits.test.ts`.
      Expected: FAIL in both files with `Failed to resolve import` for the engine module that
      does not exist yet: `"./engine"` from `engine.rows.test.ts`, or `"../engine"` from the
      fixture written in Step 1.
- [ ] **Step 3: Implement.**
  - `document.ts` holds the row list, the id counter (Decision 7) and the history (Decision 6).
    No method mutates a row in place.
  - The `CalculatorEngine` constructor validates the options, builds the blank document and
    posts `hello` and `state` (generation 1).
  - Every row commit:
    1. runs `analyzeRows` on the main thread;
    2. bumps `revision`;
    3. posts `state` with the next generation (`toWireRows`, `toWireSettings`);
    4. clears per-row results whose latex or hidden flag changed (Decision 5; no results exist
       until Task 11, which routes this step through `inbox.noteState`);
    5. notifies subscribers synchronously.
  - `RowView`s are built by a private method in this task: `kind`, `error`, `chips` and
    `complexHint` come from the main-thread analysis, and `value` and `valueText` are `null`
    and `overrun` is `false`, because no worker result is read before Task 11. Task 11
    replaces the method with `buildRowView` from `results.ts`.
  - `editRow` with unchanged latex, or with an unknown id, returns `null` and changes nothing.
  - In `docs/superpowers/specs/calculator-v2/d-architecture-integration.md`, API-2, replace
    "types `note`, `folder`, `image` and `text` are rejected (CB-1)." with
    "types `note`, `folder`, `image` and `text` throw KarmanCalculatorError with code `unsupported` and change nothing (CB-1, API-13)."
- [ ] **Step 4: Run them and see them pass.** Run the Step 2 command. Expected: PASS. Then
      `wc -l src/lib/calculator-v2/core/api/*.ts`. Expected: `engine.ts` at most 450 lines,
      every other file at most 700.
- [ ] **Step 5: Commit.** `git commit -m "Add the headless engine's rows, history and state posting (API-1, API-2, API-4, API-11, NM-42, AR-45, AR-46, OI-23, TH-10 contribution)"`
      (stage the engine files, the tests and the spec file).
