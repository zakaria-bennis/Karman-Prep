# 07 engine-worker, part 6 of 7: worker results, analyses and observers (Task 11)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

Part 6 of package `07-engine-worker.md`, which holds the package header (IDs, contributions,
open items, Commands), the Decisions and the Notes for the lead; they apply to every task here,
and "Decision N" and "Notes for the lead" below refer to that file. Tasks run in number order
across the seven parts; each part starts where the previous one ends. Contracts:
`01-interfaces.md` sections 0 to 5, `01-interfaces-runtime.md` sections 7 and 8 and
`01-interfaces-integration.md` section 16; every name below is theirs.

---

### Task 11: Worker results, analyses and observers (API-8, API-9, AR-45, AR-46, AR-48, AR-54, NM-42, OI-24)

**Files:**

- Create `src/lib/calculator-v2/core/api/inbox.ts`, `src/lib/calculator-v2/core/api/results.ts`
  and `src/lib/calculator-v2/core/api/observers.ts`. Modify
  `src/lib/calculator-v2/core/api/engine.ts`.
- Test `src/lib/calculator-v2/core/api/engine.results.test.ts` and
  `src/lib/calculator-v2/core/api/engine.observe.test.ts`. Modify
  `src/lib/calculator-v2/core/api/engine.limits.test.ts`.
- Modify `docs/superpowers/specs/calculator-v2/d-architecture-integration.md` (API-9, and AR-46
  for OI-32). `01-interfaces-runtime.md` is only read: its sections 7 and 8 already carry
  Decisions 2 to 4 (Step 3 checks them).

**Interfaces:**

- Produces:
  - the `CalculatorEngine` members `observe`, `unobserve`, `observeEvent`, `unobserveEvent`,
    and the getters `expressionAnalysis` and `graphpaperBounds` (section 8);
  - snapshot `value`, `valueText`, `overrun` and `geometry`, following Decisions 3 to 5;
  - from `results.ts` (package-internal):

```ts
export function toApiEvaluation(value: Value, display: string | null): ApiEvaluation;
export function rowShowsValue(row: RowAnalysis, value: Value | null, overrun: boolean): boolean;
export function buildRowView(row: StoredRow, analysis: RowAnalysis, result: RowResult): RowView; // overrun -> error { code: "timeout", message: rowErrorMessage("timeout", []), names: [], span: null }
export function buildExpressionAnalysis(
  views: readonly RowView[],
  analysis: AnalysisResult
): Record<string, ExpressionAnalysis>; // isGraphable from analysis.byId; isError when view.error is set; evaluation only when rowShowsValue
```

- from `inbox.ts` (package-internal; Decisions 3 to 5 and 12):

```ts
export interface SentRow {
  id: string;
  latex: string;
  hidden: boolean;
  kind: RowKind; // the main thread's kind, for the AR-45 development check
  isGraphable: boolean;
}
export interface RowResult {
  value: Value | null;
  overrun: boolean;
}
export interface InboxHooks {
  onFault(message: string): void;
  onHelperValue(jobId: number, value: Value): void; // HelperRegistry (Task 12) checks liveness
}
export class ResultInbox {
  constructor(hooks: InboxHooks);
  noteState(generation: number, rows: readonly SentRow[]): void; // clears value, overrun and geometry of rows deleted or whose latex or hidden changed; drops geometry of rows no longer graphable
  noteView(generation: number): void; // drops region geometry
  receive(message: WorkerToMain): boolean; // the Decision 3 filter; true when a row result, the geometry or backendKind (ready) changed
  result(rowId: string): RowResult; // { value: null, overrun: false } for an unknown row
  get geometry(): ReadonlyMap<string, Geometry>;
  reset(): void; // setBlank: forgets every result, geometry and generation mark
}
```

- from `observers.ts`:
  `class ObserverRegistry<N extends string> { constructor(scheduleFrame: (cb: () => void) => void); add(name: N, cb: () => void): () => void; remove(name: N, cb?: () => void): void; markDirty(name: N): void; dispose(): void }`.
- Consumes `formatValue` (04), `rowErrorMessage` (04).

- [ ] **Step 1: Write the failing tests.** `m = createTestEngine(undefined, { backend: "main-thread" })`
      for real values; `t = createTestEngine()` and `e = t.engine` for emitted messages.
  - `engine.results.test.ts`'s `beforeEach` creates `m`, `t` and `e`. It imports
    `toApiEvaluation` from `"./results"`, `rowErrorMessage` from `"../analysis"` and
    `KarmanCalculatorError` from `"./errors"`.
  - In `engine.limits.test.ts`, this task adds
    `m = createTestEngine(undefined, { backend: "main-thread" })` to the existing `beforeEach`
    (which keeps `t` and `e`) and imports `formatValue` from `"../eval/format"`.
  - `row(id)` is `e.getSnapshot().rows.find((r) => r.id === id)!`.
  - `points(id)`, `curve(id)` and `region(id)` build a minimal `PointGeometry` (coords
    `[1, 2]`), `CurveGeometry` and `RegionGeometry` (empty typed arrays) for row `id`.
  - In `engine.observe.test.ts`, `beforeEach` creates `t` and `e`, sets `modeCalls = 0` and
    registers `e.observe("mode", () => modeCalls++)`; `afterEach` runs `t.flushFrames()` and
    expects `modeCalls` to be 0, so every operation in that file checks that `mode` never
    fires in Phase 1.

```ts
it("API-9 expressionAnalysis reports graphable, error and displayed number, point and undefined evaluations", async () => {
  m.engine.setExpressions([
    { id: "a", latex: "2+3" },
    { id: "b", latex: "y=x" },
    { id: "c", latex: "\\frac{" },
    { id: "d", latex: "1/0" },
    { id: "e", latex: "P=(1,2)" },
  ]);
  await m.settled();
  expect(m.engine.expressionAnalysis).toMatchObject({
    a: {
      isGraphable: false,
      isError: false,
      evaluationDisplayed: true,
      evaluation: { type: "number", value: 5 },
    },
    b: { isGraphable: true, isError: false, evaluationDisplayed: false },
    c: {
      isGraphable: false,
      isError: true,
      errorMessage: "This can't be read. Check for a missing bracket or operator.",
      evaluationDisplayed: false,
    },
    d: { evaluationDisplayed: true, evaluation: { type: "undefined" } },
    e: {
      isGraphable: false,
      evaluationDisplayed: true,
      evaluation: { type: "point", value: [1, 2] },
    },
  });
  expect(m.engine.expressionAnalysis.b).not.toHaveProperty("evaluation");
  expect(m.engine.getSnapshot().rows.find((r) => r.id === "a")!.valueText).toBe("5");
});
it("API-9 complex mode reports complex evaluations", async () => {
  m.engine.updateSettings({ complex: true });
  m.engine.setExpression({ id: "a", latex: "\\sqrt{-4}" });
  await m.settled();
  const ev = m.engine.expressionAnalysis.a.evaluation;
  if (ev?.type !== "complex") throw new Error(`expected complex, got ${ev?.type}`);
  expect(ev.value.re).toBeCloseTo(0, 12);
  expect(ev.value.im).toBeCloseTo(2, 12);
});
it("API-9 evaluations fill asynchronously from the worker", async () => {
  m.engine.setExpression({ id: "a", latex: "2+3" });
  expect(m.engine.expressionAnalysis.a).toMatchObject({ evaluationDisplayed: false });
  expect(m.engine.expressionAnalysis.a).not.toHaveProperty("evaluation");
  await m.settled();
  expect(m.engine.expressionAnalysis.a).toMatchObject({
    evaluationDisplayed: true,
    evaluation: { type: "number", value: 5 },
  });
});
it("API-9 later-phase values report type other with the row's R-5 text as display (OI-24)", () => {
  expect(toApiEvaluation({ type: "tone" } as unknown as Value, "tone(440, 1)")).toEqual({
    type: "other",
    display: "tone(440, 1)",
  });
  expect(
    toApiEvaluation(
      {
        type: "list",
        value: [
          { type: "number", value: 1 },
          { type: "number", value: 2 },
        ],
      },
      "[1, 2]"
    )
  ).toEqual({ type: "list", value: [1, 2] });
  expect(toApiEvaluation({ type: "number", value: Number.POSITIVE_INFINITY }, null)).toEqual({
    type: "undefined",
  });
});
it("AR-46 plots and done must match the latest generation; values must not predate the latest state", () => {
  e.setView(TEST_VIEW); // view, generation 2
  e.setExpression({ id: "a", latex: "2+3" }); // state, generation 3
  const g = t.latestGeneration();
  t.emit({
    v: 1,
    type: "value",
    generation: g - 1,
    rowId: "a",
    jobId: null,
    value: { type: "number", value: 4 },
  });
  t.flushFrames();
  expect(row("a").value).toBeNull(); // older than the latest state
  e.setView({ ...TEST_VIEW, viewport: { left: -5, right: 5, bottom: -3.75, top: 3.75 } }); // view, generation 4
  t.emit({
    v: 1,
    type: "value",
    generation: g,
    rowId: "a",
    jobId: null,
    value: { type: "number", value: 5 },
  });
  t.flushFrames();
  expect(row("a").value).toEqual({ type: "number", value: 5 }); // a later view does not stale a value
  e.setExpression({ id: "p", latex: "(1,2)" });
  const gp = t.latestGeneration();
  t.emit({ v: 1, type: "plot", generation: gp - 1, rowId: "p", geometry: points("p") });
  t.flushFrames();
  expect(e.getSnapshot().geometry.has("p")).toBe(false);
  t.emit({ v: 1, type: "plot", generation: gp, rowId: "p", geometry: points("p") });
  t.emit({ v: 1, type: "done", generation: gp - 1 }); // an old done prunes nothing
  t.flushFrames();
  expect(e.getSnapshot().geometry.has("p")).toBe(true);
});
it("AR-46 geometry is kept until replaced, dropped for edited rows and for regions on a view send, and pruned at done", () => {
  const keys = () => [...e.getSnapshot().geometry.keys()].sort();
  e.setExpressions([
    { id: "p", latex: "(1,2)" },
    { id: "q", latex: "y\\le x" },
    { id: "c", latex: "y=x" },
  ]);
  e.setView(TEST_VIEW);
  const g = t.latestGeneration();
  t.emit({ v: 1, type: "plot", generation: g, rowId: "p", geometry: points("p") });
  t.emit({ v: 1, type: "plot", generation: g, rowId: "q", geometry: region("q") });
  t.emit({ v: 1, type: "plot", generation: g, rowId: "c", geometry: curve("c") });
  t.emit({ v: 1, type: "done", generation: g });
  t.flushFrames();
  expect(keys()).toEqual(["c", "p", "q"]);
  e.setView({ ...TEST_VIEW, viewport: { left: -9, right: 11, bottom: -7.5, top: 7.5 } }); // pan
  expect(keys()).toEqual(["c", "p"]); // region spans were in the old pixel frame
  const g2 = t.latestGeneration();
  t.emit({ v: 1, type: "plot", generation: g2, rowId: "c", geometry: curve("c") });
  t.emit({ v: 1, type: "done", generation: g2 });
  t.flushFrames();
  expect(keys()).toEqual(["c"]); // only rows plotted in generation g2 survive its done
  e.editRow("c", "y=2x", "typing");
  expect(keys()).toEqual([]);
});
it("AR-48 an overrun row shows the timeout message until it is edited or a later value arrives", () => {
  const timeout = {
    code: "timeout",
    message: "This is taking too long. Try a smaller range or fewer terms.",
    names: [],
    span: null,
  };
  e.setExpression({ id: "a", latex: "2+3" });
  t.emit({ v: 1, type: "overrun", generation: t.latestGeneration(), rowId: "a" });
  t.flushFrames();
  expect(row("a")).toMatchObject({ overrun: true, value: null, error: timeout });
  expect(e.expressionAnalysis.a).toMatchObject({ isError: true, errorMessage: timeout.message });
  e.updateSettings({ angleMode: "degrees" });
  expect(row("a").overrun).toBe(true);
  t.emit({
    v: 1,
    type: "value",
    generation: t.latestGeneration(),
    rowId: "a",
    jobId: null,
    value: { type: "number", value: 5 },
  });
  t.flushFrames();
  expect(row("a")).toMatchObject({ overrun: false, error: null, valueText: "5" });
  t.emit({ v: 1, type: "overrun", generation: t.latestGeneration(), rowId: "a" });
  t.flushFrames();
  expect(row("a").overrun).toBe(true);
  e.editRow("a", "2+4", "typing");
  expect(row("a")).toMatchObject({ overrun: false, error: null });
});
it("AR-45 an analysis kind that differs from the main thread's logs console.error in development", () => {
  const spy = vi.spyOn(console, "error").mockImplementation(() => {});
  e.setExpression({ id: "a", latex: "2+3" });
  const g = t.latestGeneration();
  t.emit({
    v: 1,
    type: "analysis",
    generation: g,
    rowId: "a",
    analysis: { kind: "value", error: null, isGraphable: false },
  });
  expect(spy).not.toHaveBeenCalled();
  t.emit({
    v: 1,
    type: "analysis",
    generation: g,
    rowId: "a",
    analysis: { kind: "implicit", error: null, isGraphable: true },
  });
  expect(spy.mock.calls).toEqual([
    ["Karman calculator: worker analysis kind mismatch for row a (main value, worker implicit)"],
  ]);
  spy.mockRestore();
});
it("AR-54 parse, analysis and evaluation errors are row values and never throw", async () => {
  const bad = [
    "\\frac{}{}",
    "x^{}",
    "\\sqrt{}",
    "2+",
    "\\left(",
    "\\operatorname{}",
    "=",
    "1/0",
    "\\sum",
    "\\begin{matrix}1\\end{matrix}",
    "x+y",
    "\\sim",
  ];
  expect(() =>
    m.engine.setExpressions(bad.map((latex, i) => ({ id: `b${i}`, latex })))
  ).not.toThrow();
  expect(() => m.engine.editRow("b0", "\\frac{1}", "typing")).not.toThrow();
  await m.settled();
  const rows = m.engine.getSnapshot().rows.slice(1); // row "1" comes first; then b0…b11 in input order
  // codes from 02's parse-errors corpus (PR-38 cases 35 to 41 and 45; PR-9 cases 8, 9 and 20: matrix, \sim
  // and \sum are unsupported commands) and 04's RC-17 list (x+y is mixed-variables); "1/0" has no error
  // and its value is undefined
  expect(rows.map((r) => r.error?.code ?? null)).toEqual([
    "syntax", // b0, edited to \frac{1} (PR-38 case 45)
    "syntax", // x^{}
    "syntax", // \sqrt{}
    "syntax", // 2+
    "syntax", // \left(
    "syntax", // \operatorname{}
    "syntax", // =
    null, // 1/0
    "unsupported", // \sum
    "unsupported", // \begin{matrix}1\end{matrix}
    "mixed-variables", // x+y
    "unsupported", // \sim
  ]);
  expect(rows[7].value).toEqual({ type: "undefined" });
  for (const r of rows.filter((r) => r.error))
    expect(r.error!.message).toBe(rowErrorMessage(r.error!.code, r.error!.names));
  expect(() => m.engine.setExpression({ id: 5 } as unknown as ExpressionState)).toThrow(
    KarmanCalculatorError
  );
});
it("AR-54 a worker fault reaches onError without row content", () => {
  const onError = vi.fn();
  const f = createTestEngine({ onError });
  f.engine.setExpression({ id: "a", latex: "x^{2}" });
  f.emit({ v: 1, type: "fault", generation: f.latestGeneration(), message: "TypeError" });
  expect(onError).toHaveBeenCalledTimes(1);
  const error = onError.mock.calls[0][0] as Error;
  expect(error).toBeInstanceOf(Error);
  expect(error.message).toBe("Calculator worker fault: TypeError");
});
// engine.observe.test.ts (beforeEach and afterEach as in Step 1)
it("API-8 observers run after the commit, at most once per animation frame per name", () => {
  const seen: string[] = [];
  e.observe("settings", () => seen.push(e.settings.angleMode + e.settings.showGrid));
  e.updateSettings({ angleMode: "degrees" });
  e.updateSettings({ showGrid: false });
  expect(seen).toEqual([]);
  t.flushFrames();
  expect(seen).toEqual(["degreesfalse"]);
  t.flushFrames();
  expect(seen).toEqual(["degreesfalse"]);
});
it("API-8 observe returns an unsubscribe and unobserve without a callback removes every callback", () => {
  const a = vi.fn(),
    b = vi.fn();
  const off = e.observe("settings", a);
  e.observe("settings", b);
  off();
  e.updateSettings({ showGrid: false });
  t.flushFrames();
  expect([a.mock.calls.length, b.mock.calls.length]).toEqual([0, 1]);
  e.unobserve("settings");
  e.updateSettings({ showGrid: true });
  t.flushFrames();
  expect(b).toHaveBeenCalledTimes(1);
  expect(() => e.observe("zoom" as ObservableName, a)).toThrow(
    expect.objectContaining({ code: "invalid-argument" })
  );
  expect(() => e.observe("settings", 3 as unknown as () => void)).toThrow(
    expect.objectContaining({ code: "invalid-argument" })
  );
});
it("API-8 change events carry the revision and isUserInitiated", () => {
  const events: ChangeEvent[] = [];
  e.observeEvent("change", (ev) => events.push(ev));
  e.editRow("1", "2", "typing");
  e.editRow("1", "23", "typing");
  t.flushFrames();
  expect(events).toEqual([{ revision: e.getSnapshot().revision, isUserInitiated: true }]);
  e.setExpression({ id: "a", latex: "1" });
  t.flushFrames();
  expect(events).toHaveLength(2);
  expect(events[1]).toEqual({ revision: e.getSnapshot().revision, isUserInitiated: false });
});
it("API-8 unobserveEvent removes one change callback, and without a callback removes every one", () => {
  const a = vi.fn(),
    b = vi.fn(),
    c = vi.fn();
  e.observeEvent("change", a);
  e.observeEvent("change", b);
  e.observeEvent("change", c);
  e.unobserveEvent("change", a);
  e.editRow("1", "2", "typing");
  t.flushFrames();
  expect([a, b, c].map((f) => f.mock.calls.length)).toEqual([0, 1, 1]);
  e.unobserveEvent("change");
  e.editRow("1", "23", "typing");
  t.flushFrames();
  expect([a, b, c].map((f) => f.mock.calls.length)).toEqual([0, 1, 1]);
});
it("API-8 graphpaperBounds follows setMathBounds and setView and ignores 0×0 sizes", () => {
  expect(e.graphpaperBounds).toEqual({
    mathCoordinates: { left: -10, right: 10, bottom: -7.5, top: 7.5 },
    pixelCoordinates: { width: 800, height: 600 },
  });
  const calls = vi.fn();
  e.observe("graphpaperBounds", calls);
  e.setView({
    viewport: { left: -10, right: 10, bottom: -5, top: 5 },
    size: { width: 1000, height: 500 },
    dpr: 2,
  });
  t.flushFrames();
  expect(calls).toHaveBeenCalledTimes(1);
  expect(e.graphpaperBounds).toEqual({
    mathCoordinates: { left: -10, right: 10, bottom: -5, top: 5 },
    pixelCoordinates: { width: 1000, height: 500 },
  });
  const n = t.posted.length;
  e.setView({
    viewport: { left: -1, right: 1, bottom: -1, top: 1 },
    size: { width: 0, height: 0 },
    dpr: 2,
  });
  t.flushFrames();
  expect(calls).toHaveBeenCalledTimes(1);
  expect(t.posted).toHaveLength(n);
  expect(e.graphpaperBounds.pixelCoordinates).toEqual({ width: 1000, height: 500 });
  e.setMathBounds({ left: 0, right: 4, bottom: 0, top: 2 });
  t.flushFrames();
  expect(calls).toHaveBeenCalledTimes(2);
  expect(e.graphpaperBounds.mathCoordinates).toEqual({ left: 0, right: 4, bottom: 0, top: 2 });
});
it("API-8 expressionAnalysis fires once per frame after worker results; mode never fires in Phase 1", async () => {
  const m = createTestEngine(undefined, { backend: "main-thread" });
  const calls = vi.fn(),
    mode = vi.fn();
  m.engine.observe("mode", mode);
  m.engine.setExpressions([
    { id: "a", latex: "2+3" },
    { id: "b", latex: "y=x" },
    { id: "c", latex: "4" },
  ]);
  m.flushFrames(); // consumes the commit's own frame
  m.engine.observe("expressionAnalysis", calls);
  await m.settled(); // results arrive over several macrotasks; settled() flushes one frame
  expect(calls).toHaveBeenCalledTimes(1);
  expect(mode).not.toHaveBeenCalled();
});
// engine.limits.test.ts (the row-error limits test is Task 9's)
it("NM-42 100 rows of up to 2,048 characters analyse and settle without freezing or crashing", async () => {
  // odd rows: 2,048 characters, 2,047 nodes (over the 2,000-node cap); even rows: 1,815 characters, 227 sin(1) terms
  m.engine.setExpressions(
    Array.from({ length: 99 }, (_, i) => ({
      id: `r${i}`,
      latex: i % 2 ? "1+".repeat(1023) + "11" : "\\sin(1)+".repeat(226) + "\\sin(1)",
    }))
  );
  await m.settled();
  const rows = m.engine.getSnapshot().rows.slice(1); // row "1" comes first
  expect(rows).toHaveLength(99);
  expect(rows.filter((_, i) => i % 2 === 1).map((r) => r.error?.code)).toEqual(
    Array(49).fill("too-many-nodes")
  );
  expect(rows.filter((_, i) => i % 2 === 0).map((r) => r.valueText)).toEqual(
    Array(50).fill(formatValue({ type: "number", value: 227 * Math.sin(1) }))
  );
}, 30_000);
```

- [ ] **Step 2: Run them and see them fail.** `n exec 22 npx vitest run src/lib/calculator-v2/core/api/engine.results.test.ts src/lib/calculator-v2/core/api/engine.observe.test.ts src/lib/calculator-v2/core/api/engine.limits.test.ts`.
      Expected: FAIL in all three files; Task 9's and 10's tests in `engine.limits.test.ts`
      still pass.
  - `engine.results.test.ts` does not load: `Failed to resolve import "./results"`. Once
    `results.ts` exists, its AR-54 test still fails on `rows[7].value` (`null`, because no
    worker value reaches a `RowView` before this task) until Step 3 is done.
  - Every `engine.observe.test.ts` test fails in its `beforeEach` with
    `TypeError: e.observe is not a function`.
  - `engine.limits.test.ts`'s 100-row test fails on its `valueText` assertion: every
    `valueText` is still `null`.
- [ ] **Step 3: Implement.**
  - **Messages** from the backend go through `ResultInbox.receive`, which applies Decision 3.
    A `ready` message only marks the snapshot dirty, so `backendKind` updates. Every `state`
    send calls `inbox.noteState`, every `view` send `inbox.noteView`, and `setBlank` calls
    `inbox.reset()` before its new `state`.
  - **`fault`** calls `options.onError` (when set) with
    `new Error("Calculator worker fault: " + message)`.
  - **Development check:** when `process.env.NODE_ENV !== "production"`, the engine compares
    each accepted `analysis` kind with its own, skipping overrun rows.
  - **Snapshots:** worker-driven changes reach subscribers through one `scheduleFrame`.
  - **API-8 dirty marks:** `settings` on a settings change; `graphpaperBounds` on a viewport or
    size change; `expressionAnalysis` on a commit or an accepted value or overrun; `change`
    with the frame's latest revision and `isUserInitiated` true if any change in the frame
    was user-initiated.
  - **`expressionAnalysis`** is built per snapshot with `buildExpressionAnalysis`:
    `errorMessage` comes from `error.message` or the timeout text, and `evaluation` comes from
    `toApiEvaluation(value, valueText)` when `rowShowsValue`.
  - **API-9 spec text:** in `docs/superpowers/specs/calculator-v2/d-architecture-integration.md`, replace
    "analyses are filled asynchronously from the worker. (Phase 1; verified by unit test)" with
    "analyses are filled asynchronously from the worker; a row whose value is a distribution, inference test, matrix, colour or tone has evaluationDisplayed: true and evaluation: { type: "other", display } where display is the row's R-5 text. (Phase 1; verified by unit test)".
  - **AR-46 spec text (OI-32):** once the owner has accepted OI-32, apply its fix text from
    `07-engine-worker.md`, "Notes for the lead", to AR-46 in the same file.
  - **Contract check (no edit):** the lead has already landed Decisions 2 to 4 in
    `01-interfaces-runtime.md`. Confirm the text is there with the two commands below, run
    from the repository root. The first joins lines, because section 7's paragraph wraps; it
    checks section 7, and the second checks section 8's `geometry` comment.

    ```sh
    tr '\n' ' ' < docs/superpowers/plans/2026-10-16-calculator-v2-phase1/01-interfaces-runtime.md | grep -c 'accepts `analysis`, `value` and `overrun` when their generation is at least that of the latest `state`'
    grep -c "region geometry dropped on every view send" docs/superpowers/plans/2026-10-16-calculator-v2-phase1/01-interfaces-runtime.md
    ```

    Expected: `1`, then `1`. If either prints `0`, stop and report it to the lead; do not edit
    the contract file.

- [ ] **Step 4: Run them and see them pass.** Run the Step 2 command. Expected: PASS. Then
      `wc -l src/lib/calculator-v2/core/api/*.ts`. Expected: `engine.ts` at most 450 lines,
      every other file at most 700.
- [ ] **Step 5: Commit.** Stage the files of this task's Files list, then
      `git commit -m "Apply worker results to engine snapshots, analyses and observers (API-8, API-9, AR-45, AR-46, AR-48, AR-54, NM-42, OI-24, OI-32)"`
