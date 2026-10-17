# 07 engine-worker, part 5 of 7: settings, viewport and whole state (Task 10)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

Part 5 of package `07-engine-worker.md`, which holds the package header (IDs, contributions,
open items, Commands), the Decisions and the Notes for the lead; they apply to every task here,
and "Decision N" and "Notes for the lead" below refer to that file. Tasks run in number order
across the seven parts; each part starts where the previous one ends. Contracts:
`01-interfaces.md` sections 0 to 5, `01-interfaces-runtime.md` sections 7 and 8 and
`01-interfaces-integration.md` section 16; every name below is theirs.

---

### Task 10: Settings, viewport and whole state (API-1, API-5, API-6, API-7, AR-46, NM-42)

**Files:** Modify `src/lib/calculator-v2/core/api/engine.ts`,
`src/lib/calculator-v2/core/api/state.ts`, `src/lib/calculator-v2/core/api/validate.ts` (adds
`validateState(state: unknown): CalculatorStateV1`); Test
`src/lib/calculator-v2/core/api/engine.state.test.ts`; Modify
`src/lib/calculator-v2/core/api/engine.limits.test.ts`.

**Interfaces:**

- Produces the `CalculatorEngine` members `getState`, `setState`, `setBlank`, `setMathBounds`,
  `updateSettings`, `setView`, and the getters `settings` and `mode`, with section 8's
  signatures.
- `setBlank` follows Decision 8, `setView` follows Decision 9, and `setState` follows API-5. A
  `setState` validates everything first. Without `allowUndo` it clears history; with it, the
  row change is one step. `setMathBounds` and `setState` store `clampViewport(bounds)`
  (Decision 11).
- Adds to `state.ts` (package-internal), so `engine.ts` keeps only thin wrappers:

```ts
export function settingsFromOptions(options: CalculatorOptions): CalculatorSettings; // DEFAULT_SETTINGS with angleMode, keypad, expressionsCollapsed, reducedMotion, displaySize, reverseContrast and mode from the options
export function blankSettings(current: CalculatorSettings): CalculatorSettings; // DEFAULT_SETTINGS with current.displaySize and current.reverseContrast (API-6, Decision 8)
export function mergeSettings(
  current: CalculatorSettings,
  update: SettingsUpdate
): { settings: CalculatorSettings; wireChanged: boolean }; // wireChanged when angleMode or complex changed
export function buildState(
  rows: readonly StoredRow[],
  settings: CalculatorSettings,
  viewport: Viewport
): CalculatorStateV1; // keys in API-5 order; expressions via toExpressionState
export function rowsFromState(expressions: readonly ExpressionState[]): StoredRow[]; // missing color -> nextSlot(index), latex -> "", hidden -> false
```

- Consumes `defaultViewport` and `clampViewport` (06) and Task 9's `INITIAL_GRAPH_SIZE`.

- [ ] **Step 1: Write the failing tests.**
  - `engine.state.test.ts` imports `createTestEngine` and `TEST_VIEW` from
    `"./__fixtures__/test-engine"`, `DEFAULT_SETTINGS` from `"./types"`, the types
    `CalculatorStateV1` and `SettingsUpdate` from `"./types"`, and `clampViewport` from
    `"../../plot/viewport"`. Its `beforeEach` sets `t = createTestEngine()` and `e = t.engine`.
  - `engine.limits.test.ts` keeps Task 9's `beforeEach` (`t = createTestEngine()`,
    `e = t.engine`); the NM-42 test below is appended to it.
  - The constructor's own option check ("API-1 the constructor rejects invalid options before
    posting anything") is Task 9's, where the constructor is built.

```ts
it("API-1 options apply after the blank reset", () => {
  const { engine } = createTestEngine({
    angleMode: "degrees",
    keypad: true,
    expressionsCollapsed: true,
    reducedMotion: true,
  });
  expect(engine.settings).toEqual({
    ...DEFAULT_SETTINGS,
    angleMode: "degrees",
    keypad: true,
    expressionsCollapsed: true,
    reducedMotion: true,
  });
});
it("API-1 seed replaces the per-mount and per-reset random seed", () => {
  const a = createTestEngine({ seed: 42 }, { randomSeeds: [7, 9] });
  a.engine.setBlank();
  expect(a.posted.filter((m) => m.type === "hello")).toEqual([
    { v: 1, type: "hello", seed: 42 },
    { v: 1, type: "hello", seed: 42 },
  ]);
  const b = createTestEngine(undefined, { randomSeeds: [7, 9] });
  b.engine.setBlank();
  expect(b.posted.flatMap((m) => (m.type === "hello" ? [m.seed] : []))).toEqual([7, 9]);
});
it("API-5 getState returns versioned JSON with exactly version, mode, settings, viewport, expressions and scientific", () => {
  expect(Object.keys(e.getState())).toEqual([
    "version",
    "mode",
    "settings",
    "viewport",
    "expressions",
    "scientific",
  ]);
  expect(e.getState()).toMatchObject({
    version: 1,
    mode: "graphing",
    viewport: { left: -10, right: 10, bottom: -7.5, top: 7.5 },
    scientific: {},
  });
});
it("API-5 setState(getState()) round-trips to an identical state", () => {
  e.setExpressions([
    { id: "a", latex: "y=x", color: "#112233" },
    { id: "b", latex: "2", hidden: true },
  ]);
  e.updateSettings({ angleMode: "degrees", complex: true, showGrid: false });
  e.setMathBounds({ left: -3, right: 5, bottom: -2, top: 4 });
  const json = JSON.stringify(e.getState());
  e.setState(e.getState());
  expect(JSON.stringify(e.getState())).toBe(json);
});
it("API-5 an invalid setState throws and changes nothing", () => {
  const s = e.getState(),
    bad: [unknown, string][] = [
      [{ ...s, version: 2 }, "invalid-argument"],
      [{ ...s, scientific: { rows: [] } }, "invalid-argument"],
      [{ ...s, mode: "scientific" }, "unsupported"],
      [{ ...s, settings: { ...s.settings, lockViewport: true } }, "unsupported"],
      [{ ...s, settings: { angleMode: "radians" } }, "invalid-argument"],
      [{ ...s, viewport: { left: 1, right: 0, bottom: 0, top: 1 } }, "invalid-argument"],
      [{ ...s, expressions: [{ id: "a" }, { id: "a" }] }, "invalid-argument"],
      [{ ...s, expressions: [{ id: "a", type: "note" }] }, "unsupported"],
    ];
  for (const [state, code] of bad) {
    expect(() => e.setState(state as CalculatorStateV1)).toThrow(expect.objectContaining({ code }));
    expect(e.getState()).toEqual(s);
  }
});
it("API-5 setState clears history unless allowUndo is true", () => {
  e.setExpression({ id: "a", latex: "1" });
  const x = e.getState();
  e.setState(x);
  expect(e.canUndo()).toBe(false);
  e.setState({ ...x, expressions: [{ id: "z", latex: "2" }] }, { allowUndo: true });
  expect(e.getExpressions().map((r) => r.id)).toEqual(["z"]);
  expect(e.canUndo()).toBe(true);
  e.undo();
  expect(e.getExpressions().map((r) => r.id)).toEqual(["1", "a"]);
});
it("API-6 setBlank restores one empty row 1, the S-9 settings, the default viewport and keypad, and clears history", () => {
  e.setExpression({ id: "a", latex: "y=x" });
  e.updateSettings({ angleMode: "degrees", complex: true, showGrid: false, keypad: true });
  e.setView({
    ...TEST_VIEW,
    size: { width: 1000, height: 500 },
    viewport: { left: -10, right: 10, bottom: -5, top: 5 },
  });
  e.setMathBounds({ left: 0, right: 4, bottom: 0, top: 2 });
  e.setBlank();
  expect(e.getExpressions()).toEqual([
    { id: "1", type: "expression", latex: "", color: "c1", hidden: false },
  ]);
  expect(e.settings).toEqual({
    angleMode: "radians",
    complex: false,
    showGrid: true,
    polarGrid: false,
    minorGridlines: true,
    arrows: false,
    axisNumbers: true,
    xAxis: { show: true, label: "", step: null },
    yAxis: { show: true, label: "", step: null },
    lockViewport: false,
    piAxisLabels: false,
    displaySize: "default",
    reverseContrast: false,
    keypad: false,
    expressionsCollapsed: false,
    mode: "graphing",
    reducedMotion: false,
  });
  expect(e.getState().viewport).toEqual({ left: -10, right: 10, bottom: -5, top: 5 });
  expect(e.canUndo()).toBe(false);
});
it("API-6 setBlank keeps displaySize and reverseContrast, resets reducedMotion with the other settings, and re-seeds", () => {
  const r = createTestEngine({ reducedMotion: true });
  expect(r.engine.settings.reducedMotion).toBe(true);
  r.engine.setBlank();
  // API-6 keeps only displaySize and reverseContrast; hosts re-apply AN-13 with updateSettings (Decision 8)
  expect(r.engine.settings).toMatchObject({
    displaySize: "default",
    reverseContrast: false,
    reducedMotion: false,
  });
  expect(r.posted.filter((m) => m.type === "hello")).toHaveLength(2);
});
it("API-6 setBlank({ allowUndo: true }) is one undo step", () => {
  e.setExpression({ id: "a", latex: "y=x" });
  e.setBlank({ allowUndo: true });
  expect(e.getExpressions().map((r) => r.id)).toEqual(["1"]);
  expect(e.canUndo()).toBe(true);
  e.undo();
  expect(e.getExpressions().map((r) => [r.id, r.latex])).toEqual([
    ["1", ""],
    ["a", "y=x"],
  ]);
});
it("API-7 updateSettings rejects anything outside the list without changing state", () => {
  const settings = e.settings,
    n = t.posted.length;
  expect(() => e.updateSettings({ zoom: 2 } as unknown as SettingsUpdate)).toThrow(
    expect.objectContaining({ code: "invalid-argument" })
  );
  expect(() => e.updateSettings({ angleMode: "degrees", lockViewport: true })).toThrow(
    expect.objectContaining({ code: "unsupported" })
  );
  expect(e.settings).toEqual(settings);
  expect(t.posted).toHaveLength(n);
});
it("API-7 angleMode and complex post a new state in the same call; other settings post nothing", () => {
  const n = t.posted.length;
  e.updateSettings({ angleMode: "degrees" });
  expect(t.posted.slice(n)).toEqual([
    expect.objectContaining({ type: "state", settings: { angleMode: "degrees", complex: false } }),
  ]);
  e.updateSettings({ showGrid: false, xAxis: { show: true, label: "t", step: 2 } });
  expect(t.posted).toHaveLength(n + 1);
});
it("API-7 setMathBounds stores valid bounds and rejects invalid ones without changing state", () => {
  e.setMathBounds({ left: -1, right: 3, bottom: -2, top: 2 });
  expect(e.getState().viewport).toEqual({ left: -1, right: 3, bottom: -2, top: 2 });
  for (const b of [
    { left: 1, right: 1, bottom: 0, top: 1 },
    { left: 0, right: 1, bottom: Number.NaN, top: 1 },
  ])
    expect(() => e.setMathBounds(b)).toThrow(expect.objectContaining({ code: "invalid-argument" }));
  expect(e.getState().viewport).toEqual({ left: -1, right: 3, bottom: -2, top: 2 });
});
it("API-7 setMathBounds clamps finite, ordered bounds to the G-23 limits instead of rejecting them", () => {
  e.setMathBounds({ left: -1e16, right: 0, bottom: 0, top: 1 });
  expect(e.getState().viewport).toEqual({ left: -1e15, right: 0, bottom: 0, top: 1 });
  const tiny = { left: 0, right: 1e-10, bottom: 0, top: 1 };
  e.setMathBounds(tiny);
  expect(e.getState().viewport).toEqual(clampViewport(tiny));
  const v = e.getState().viewport;
  expect(v.right - v.left).toBeGreaterThanOrEqual(1e-9 * (1 - 1e-12));
});
it("AR-46 state and view sends share one generation counter that increases by one per send", () => {
  e.setView(TEST_VIEW);
  e.setExpression({ id: "a", latex: "y=x" });
  e.setMathBounds({ left: -1, right: 1, bottom: -1, top: 1 });
  e.updateSettings({ complex: true });
  expect(
    t.posted.flatMap((m) =>
      m.type === "state" || m.type === "view" ? [[m.type, m.generation]] : []
    )
  ).toEqual([
    ["state", 1],
    ["view", 2],
    ["state", 3],
    ["view", 4],
    ["state", 5],
  ]);
  const n = t.posted.length,
    snapshot = e.getSnapshot();
  e.setView({ ...TEST_VIEW, size: { width: 0, height: 0 } });
  e.setView({ ...TEST_VIEW, viewport: { ...TEST_VIEW.viewport, left: Number.NaN } });
  expect(t.posted).toHaveLength(n);
  expect(e.getSnapshot()).toBe(snapshot);
});
// engine.limits.test.ts
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
```

- [ ] **Step 2: Run them and see them fail.** `n exec 22 npx vitest run src/lib/calculator-v2/core/api/engine.state.test.ts src/lib/calculator-v2/core/api/engine.limits.test.ts`.
      Expected: FAIL for every test of this task; Task 9's tests in `engine.limits.test.ts`
      still pass.
  - Most fail with `TypeError: … is not a function` at their first call to a member this task
    adds (`setBlank`, `getState`, `setState`, `updateSettings`, `setMathBounds`, `setView`),
    for example `TypeError: e.getState is not a function`.
  - Three fail differently, because the `settings` getter does not exist yet or the thrown
    `TypeError` has no `code`:
    - "API-1 options apply after the blank reset":
      `AssertionError: expected undefined to deeply equal { angleMode: 'degrees', … }`.
    - "API-6 setBlank keeps displaySize and reverseContrast …":
      `TypeError: Cannot read properties of undefined (reading 'reducedMotion')`.
    - "API-7 updateSettings rejects anything outside the list …": its
      `toThrow(expect.objectContaining({ code: "invalid-argument" }))` assertion fails on the
      `TypeError`.
- [ ] **Step 3: Implement.**
  - The constructor and `setBlank` share a private `resetDocument(settings)`. The constructor
    passes `settingsFromOptions(options)`; `setBlank` passes `blankSettings(current)`.
  - `updateSettings` validates first, then applies `mergeSettings` and posts `state` only when
    `wireChanged`.
  - `setMathBounds` and `setState` store `clampViewport(bounds)`. `setMathBounds` and `setView`
    post `view` only once a size is known.
  - `getState` returns `buildState(rows, settings, viewport)`.
- [ ] **Step 4: Run them and see them pass.** Run the Step 2 command. Expected: PASS. Then
      `wc -l src/lib/calculator-v2/core/api/*.ts`. Expected: `engine.ts` at most 450 lines,
      every other file at most 700.
- [ ] **Step 5: Commit.** `git commit -m "Add engine settings, viewport and whole-state API (API-1, API-5, API-6, API-7, AR-46, NM-42)"`
