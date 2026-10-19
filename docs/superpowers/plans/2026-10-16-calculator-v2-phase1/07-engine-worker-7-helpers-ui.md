# 07 engine-worker, part 7 of 7: helpers, focus and teardown, UI hooks, harness kit and worker browser checks (Tasks 12 to 14)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

Part 7 of package `07-engine-worker.md`, which holds the package header (IDs, contributions,
open items, Commands), the Decisions and the Notes for the lead; they apply to every task here,
and "Decision N" and "Notes for the lead" below refer to that file. Tasks run in number order
across the seven parts; each part starts where the previous one ends. Contracts:
`01-interfaces.md` sections 0 to 5, `01-interfaces-runtime.md` sections 7 and 8 and
`01-interfaces-integration.md` section 16; every name below is theirs.

---

### Task 12: Helpers, focus and teardown (API-10, API-6, API-8, API-13, API-1, OI-10)

**Files:** Create `src/lib/calculator-v2/core/api/helper-expression.ts`,
`src/lib/calculator-v2/core/api/default-deps.ts`; Modify
`src/lib/calculator-v2/core/api/engine.ts`; Test
`src/lib/calculator-v2/core/api/engine.helpers.test.ts`; Modify
`docs/superpowers/specs/calculator-v2/d-architecture-integration.md` (section 11).

**Interfaces:**

- Produces:
  - the `HelperExpression` interface (section 8), and in `helper-expression.ts` the
    package-internal registry:

```ts
export class HelperRegistry {
  constructor(deps: { post(message: MainToWorker): void; generation(): number });
  create(spec: { latex: string }): HelperExpression; // posts evaluate with a new jobId at generation()
  reissue(): void; // after every state send, setBlank included: each live helper gets a new jobId at generation(); older jobIds die (API-6, Decision 3)
  receive(jobId: number, value: Value): void; // ignored unless jobId is a live helper's current job; then updates the values and fires its numericValue and listValue observers synchronously, NaN included
  dispose(): void; // destroy: every helper stops; later values are ignored
}
```

- in `default-deps.ts` (package-internal):

```ts
export function defaultBackend(): ComputeBackend; // createWorkerBackend() when typeof window !== "undefined" && typeof Worker === "function", else createMainThreadBackend()
export function defaultScheduleFrame(callback: () => void): void; // requestAnimationFrame when it exists, else setTimeout(callback, 16)
export function defaultRandomSeed(): number; // crypto.getRandomValues(new Uint32Array(1))[0]
```

- the `CalculatorEngine` members `HelperExpression`, `focusExpression`,
  `focusFirstExpression`, `activateExpression`, `setFocusedRow`, the `focusedExpression`
  getter (the active row id) and `destroy`;
- `createEngine(options?, deps?)` in `engine.ts` (section 8's location), which calls
  `validateOptions(options)` before it creates anything, then
  `new CalculatorEngine(options, { backend: deps?.backend ?? defaultBackend(), scheduleFrame: deps?.scheduleFrame ?? defaultScheduleFrame, now: deps?.now ?? (() => performance.now()), randomSeed: deps?.randomSeed ?? defaultRandomSeed })`.
- `HelperExpression` posts
  `{ v: 1, type: "evaluate", jobId, generation: <current generation>, latex }` with a new
  `jobId` now and after every later `state`.
- `setFocusedRow(id)` sets `focusedRowId`. When `id` is not null, it also makes that row
  active. It always ends the typing group.
- After `destroy()`, the public members throw `destroyed`, `getSnapshot` returns the last
  snapshot, and the internal mutators are no-ops.

- [ ] **Step 1: Write the failing tests.** `beforeEach` creates
      `m = createTestEngine(undefined, { backend: "main-thread" })` and `t = createTestEngine()`
      with `e = t.engine`. The file imports `defaultBackend` from `"./default-deps"` and starts
      with a module mock that wraps the real default backend, so the API-1 test can see whether
      it was called:

```ts
vi.mock("./default-deps", async (importOriginal) => {
  const real = await importOriginal<typeof import("./default-deps")>();
  return { ...real, defaultBackend: vi.fn(real.defaultBackend) };
});
it("API-10 HelperExpression is evaluated in the worker, adds no row and starts as NaN", async () => {
  const h = m.engine.HelperExpression({ latex: "2+3" });
  expect(h.numericValue).toBeNaN();
  expect(m.posted.at(-1)).toMatchObject({ v: 1, type: "evaluate", latex: "2+3" });
  await m.settled();
  expect(h.numericValue).toBe(5);
  expect(h.listValue).toBeUndefined();
  expect(m.engine.getExpressions()).toHaveLength(1);
});
it("API-10 helpers use row definitions, re-evaluate after edits and fire observers for every result including NaN", async () => {
  m.engine.setExpression({ id: "a", latex: "a=4" });
  const h = m.engine.HelperExpression({ latex: "a^{2}" });
  const calls = vi.fn();
  h.observe("numericValue", calls);
  await m.settled();
  expect(h.numericValue).toBe(16);
  m.engine.editRow("a", "a=5", "api");
  await m.settled();
  expect(h.numericValue).toBe(25);
  expect(calls).toHaveBeenCalledTimes(2);
  const r = m.engine.HelperExpression({ latex: "\\sqrt{-1}" });
  const rootCalls = vi.fn();
  r.observe("numericValue", rootCalls);
  await m.settled();
  expect(r.numericValue).toBeNaN();
  expect(rootCalls).toHaveBeenCalledTimes(1);
  m.engine.updateSettings({ complex: true });
  await m.settled();
  expect(r.numericValue).toBeNaN(); // i is not real, so numericValue stays NaN
});
it("API-10 unobserve and the returned unsubscribe stop a helper's observers, listValue included", async () => {
  m.engine.setExpression({ id: "a", latex: "a=4" });
  const h = m.engine.HelperExpression({ latex: "a^{2}" });
  const [n1, n2, l1, l2] = [vi.fn(), vi.fn(), vi.fn(), vi.fn()];
  const offN1 = h.observe("numericValue", n1);
  h.observe("numericValue", n2);
  h.observe("listValue", l1);
  const offL2 = h.observe("listValue", l2);
  await m.settled();
  expect(h.numericValue).toBe(16);
  expect([n1, n2, l1, l2].map((f) => f.mock.calls.length)).toEqual([1, 1, 1, 1]);
  offN1(); // the returned unsubscribe
  h.unobserve("numericValue", n2); // one callback
  offL2();
  h.unobserve("listValue"); // every remaining listValue callback
  m.engine.editRow("a", "a=5", "api");
  await m.settled();
  expect(h.numericValue).toBe(25);
  expect([n1, n2, l1, l2].map((f) => f.mock.calls.length)).toEqual([1, 1, 1, 1]);
});
it("API-10 destroy stops a helper and invalid specs throw invalid-argument", async () => {
  m.engine.setExpression({ id: "a", latex: "a=4" });
  const h = m.engine.HelperExpression({ latex: "a" });
  await m.settled();
  expect(h.numericValue).toBe(4);
  h.destroy();
  m.engine.editRow("a", "a=9", "api");
  await m.settled();
  expect(h.numericValue).toBe(4);
  for (const spec of [{}, { latex: 3 }, { latex: "1".repeat(2049) }])
    expect(() => m.engine.HelperExpression(spec as { latex: string })).toThrow(
      expect.objectContaining({ code: "invalid-argument" })
    );
});
it("API-6 setBlank cancels pending jobs", () => {
  const h = e.HelperExpression({ latex: "2+3" });
  const calls = vi.fn();
  h.observe("numericValue", calls);
  const old = t.posted.at(-1) as Extract<MainToWorker, { type: "evaluate" }>;
  e.setBlank();
  t.emit({
    v: 1,
    type: "value",
    generation: old.generation,
    rowId: null,
    jobId: old.jobId,
    value: { type: "number", value: 5 },
  });
  t.flushFrames();
  expect(h.numericValue).toBeNaN();
  expect(calls).not.toHaveBeenCalled();
  const after = t.posted.slice(t.posted.map((msg) => msg.type).lastIndexOf("hello"));
  const state = after.findIndex((msg) => msg.type === "state");
  const job = after.findIndex((msg) => msg.type === "evaluate");
  expect(state).toBeGreaterThan(0);
  expect(job).toBeGreaterThan(state);
  const reissued = after[job] as Extract<MainToWorker, { type: "evaluate" }>;
  expect(reissued.jobId).not.toBe(old.jobId);
  expect(reissued.generation).toBe(t.latestGeneration());
  expect(reissued.generation).toBeGreaterThan(old.generation);
});
it("API-8 focusExpression, focusFirstExpression and activateExpression set the active row and fire focusedExpression (OI-10)", () => {
  e.setExpressions([{ id: "a" }, { id: "b" }]);
  const seen: (string | null)[] = [];
  e.observe("focusedExpression", () => seen.push(e.focusedExpression));
  e.activateExpression("b");
  t.flushFrames();
  expect(seen).toEqual(["b"]);
  e.focusFirstExpression();
  t.flushFrames();
  expect(seen).toEqual(["b", "1"]);
  e.focusExpression("a");
  e.focusExpression("a");
  t.flushFrames();
  expect(seen).toEqual(["b", "1", "a"]);
  expect(e.getSnapshot().activeRowId).toBe("a");
  expect(e.getSnapshot().focusedRowId).toBeNull();
  expect(() => e.focusExpression("zz")).toThrow(
    expect.objectContaining({ code: "invalid-argument" })
  );
});
it("API-8 setFocusedRow tracks DOM focus, makes the row active and ends the typing group", () => {
  const ids = () => [e.getSnapshot().focusedRowId, e.getSnapshot().activeRowId];
  e.setFocusedRow("1");
  expect(ids()).toEqual(["1", "1"]);
  e.setFocusedRow(null);
  expect(ids()).toEqual([null, "1"]);
  e.editRow("1", "1", "typing");
  e.setFocusedRow("1");
  e.editRow("1", "12", "typing");
  e.undo();
  expect(e.getExpressions()[0].latex).toBe("1"); // two undo steps, not one
});
it("API-13 after destroy every public method throws destroyed and destroy stays idempotent", () => {
  const state0 = e.getState();
  e.destroy();
  e.destroy();
  const calls: (() => unknown)[] = [
    () => e.setExpression({ id: "a" }),
    () => e.setExpressions([]),
    () => e.removeExpression({ id: "1" }),
    () => e.removeExpressions([]),
    () => e.getExpressions(),
    () => e.getState(),
    () => e.setState(state0),
    () => e.setBlank(),
    () => e.setMathBounds({ left: 0, right: 1, bottom: 0, top: 1 }),
    () => e.updateSettings({}),
    () => e.observe("settings", () => {}),
    () => e.unobserve("settings"),
    () => e.observeEvent("change", () => {}),
    () => e.unobserveEvent("change"),
    () => e.HelperExpression({ latex: "1" }),
    () => e.undo(),
    () => e.redo(),
    () => e.clearHistory(),
    () => e.canUndo(),
    () => e.canRedo(),
    () => e.focusExpression("1"),
    () => e.focusFirstExpression(),
    () => e.activateExpression("1"),
    () => e.expressionAnalysis,
    () => e.graphpaperBounds,
    () => e.settings,
    () => e.focusedExpression,
    () => e.mode,
  ];
  for (const c of calls) expect(c).toThrow(expect.objectContaining({ code: "destroyed" }));
  expect(e.getSnapshot().rows).toHaveLength(1);
  expect(e.editRow("1", "2", "typing")).toBeNull();
});
it("API-13 late worker results after destroy change nothing", () => {
  e.setExpression({ id: "a", latex: "2+3" });
  const g = t.latestGeneration();
  const listener = vi.fn(),
    observer = vi.fn();
  e.subscribe(listener);
  e.observe("expressionAnalysis", observer);
  t.flushFrames();
  observer.mockClear();
  e.destroy();
  expect(t.backend!.disposed).toBe(true);
  t.emit({
    v: 1,
    type: "value",
    generation: g,
    rowId: "a",
    jobId: null,
    value: { type: "number", value: 5 },
  });
  t.emit({
    v: 1,
    type: "plot",
    generation: g,
    rowId: "a",
    geometry: { kind: "points", rowId: "a", evaluations: 0, coords: new Float64Array([1, 2]) },
  });
  t.flushFrames();
  expect(listener).not.toHaveBeenCalled();
  expect(observer).not.toHaveBeenCalled();
});
it("API-1 createEngine validates options before creating a backend and uses the main-thread backend in node", () => {
  const made = createEngine();
  expect(made.getSnapshot().backendKind).toBe("main-thread");
  made.destroy();
  vi.mocked(defaultBackend).mockClear();
  expect(() => createEngine({ displaySize: "large" })).toThrow(
    expect.objectContaining({ code: "unsupported" })
  );
  expect(defaultBackend).not.toHaveBeenCalled();
});
```

- [ ] **Step 2: Run them and see them fail.** `n exec 22 npx vitest run src/lib/calculator-v2/core/api/engine.helpers.test.ts`.
      Expected: FAIL, `Failed to resolve import "./default-deps"` (the test file imports
      `defaultBackend` from it for `vi.mocked`).
- [ ] **Step 3: Implement.** The engine holds one `HelperRegistry`; every `state` send
      (`setBlank` included) calls `reissue()` after posting, and `ResultInbox`'s
      `onHelperValue` hook calls `receive`. In
      `docs/superpowers/specs/calculator-v2/d-architecture-integration.md` section 11, the sentence below
      is wrapped over three lines (from "`KarmanCalculator` adds the element," to "method to
      it."); replace those wrapped words, keeping the clause before it. Replace
      "`KarmanCalculator` adds the element, shadow root, React UI, `resize()`, the focus methods and `focusBoundary()` and forwards every other method to it."
      with
      "`KarmanCalculator` adds the element, shadow root, React UI, `resize()` and `focusBoundary()` and forwards every other method to it. `CalculatorEngine` implements `focusExpression(id)`, `focusFirstExpression()` and `activateExpression(id)` as active-row state changes that fire the `focusedExpression` observer. KarmanCalculator's versions also move DOM focus into the row's MathField (`focusExpression`, `focusFirstExpression`) or keep it out of the MathField (`activateExpression`). As a result, `transfer/apply.ts` runs unchanged on the headless engine in TR-79."
- [ ] **Step 4: Run them and see them pass.** Run the Step 2 command, then
      `n exec 22 npx vitest run src/lib/calculator-v2`. Expected: PASS. Then
      `wc -l src/lib/calculator-v2/core/api/*.ts`. Expected: `engine.ts` at most 450 lines,
      every other file at most 700.
- [ ] **Step 5: Commit.** `git commit -m "Add helper expressions, focus state and engine teardown (API-10, API-6, API-8, API-13, API-1, OI-10)"`

### Task 13: UI hooks and DOM stubs (AR-54)

**Files:** Create `src/components/calculator-v2/ui/hooks/use-engine.ts`,
`src/components/calculator-v2/ui/hooks/skin.ts`,
`src/components/calculator-v2/ui/hooks/dev-hooks.ts`,
`src/components/calculator-v2/__fixtures__/dom-stubs.ts`; Test
`src/components/calculator-v2/ui/hooks/use-engine.test.tsx`.

**Interfaces:**

- Produces section 8.1 exactly:
  - `useEngineSnapshot` never passes an unbound engine method to React, which calls
    `getSnapshot` without `this`:

```ts
const subscribe = useCallback((listener: () => void) => engine.subscribe(listener), [engine]);
const getSnapshot = useCallback(() => engine.getSnapshot(), [engine]);
return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
```

- `useEngine()` throws `Error("useEngine must be used inside EngineContext")` when no engine
  is provided.
- `SkinContext` defaults to `"ivory"`.
- `installDomStubs()`:
  - stubs `ResizeObserver`, keeping a module map from each target to its observers;
  - stubs `matchMedia`, whose results have `matches: false`, `media`, `onchange` and the
    add/remove listener methods;
  - makes `HTMLCanvasElement.prototype.getContext` return `null`;
  - returns a restore function.
- `triggerResize(target, { width, height })` calls each observer of `target` with one entry
  holding `contentRect`, `borderBoxSize` and `contentBoxSize` of that size.

- [ ] **Step 1: Write the failing test.**

```tsx
// @vitest-environment jsdom
it("AR-54 a syntax error reaches React as a row message through useEngineSnapshot and nothing throws", () => {
  const restore = installDomStubs();
  expect(document.createElement("canvas").getContext("2d")).toBeNull();
  const { engine } = createTestEngine();
  function Probe() {
    const s = useEngineSnapshot(useEngine());
    return (
      <output>
        {useSkin()}|{s.rows.map((r) => r.error?.message ?? r.latex).join(";")}
      </output>
    );
  }
  render(
    <EngineContext.Provider value={engine}>
      <SkinContext.Provider value="plum">
        <Probe />
      </SkinContext.Provider>
    </EngineContext.Provider>
  );
  expect(screen.getByRole("status")).toHaveTextContent("plum|");
  act(() => {
    engine.editRow("1", "\\frac{", "typing");
  });
  expect(screen.getByRole("status")).toHaveTextContent(
    "plum|This can't be read. Check for a missing bracket or operator."
  );
  restore();
});
```

- [ ] **Step 2: Run it and see it fail.** `n exec 22 npx vitest run src/components/calculator-v2/ui/hooks/use-engine.test.tsx`.
      Expected: FAIL, `Failed to resolve import "./use-engine"`.
- [ ] **Step 3: Implement the four files.** `exposeEngineForTests(engine)`:
  - sets `globalThis.__calculatorHarness = { engine }` only when
    `process.env.NODE_ENV !== "production"`;
  - returns a function that deletes it only while it still points at this engine.
- [ ] **Step 4: Run it and see it pass.** Expected: PASS.
- [ ] **Step 5: Commit.** `git commit -m "Add calculator v2 engine hooks, skin context and jsdom stubs (AR-54)"`

### Task 14: Harness kit, worker harness and browser checks (AR-43, AR-49, AR-50)

**Files:** Create `tests/calculator/fixture/v2/harness-kit.tsx`,
`tests/calculator/fixture/v2/worker.html`, `tests/calculator/fixture/v2/worker.tsx`; Test
`tests/calculator/v2/worker.spec.ts`.

**Interfaces:**

- Produces `mountHarness` and `HarnessOptions`, exactly as in `01-interfaces-integration.md`
  section 16:
  - It imports `katex/dist/katex.min.css`.
  - It uses `root.shadowRoot ?? root.attachShadow({ mode: "open" })`. One
    `CSSStyleSheet` holds `hostThemeCss(skin)` plus each `css` entry, falling back to a
    `<style>` element.
  - It renders `render(engine)` inside `EngineContext` and `SkinContext` with its own
    `createRoot`, and calls `exposeEngineForTests`.
  - `destroy` unmounts the root, destroys the engine, clears the global and empties the shadow
    root, so the same root can be mounted again.
- `worker.tsx` (package-internal):

```ts
export type WorkerScenario =
  | "default"
  | "constructor-throws"
  | "error-before-ready"
  | "never-ready"
  | "hang-once";
declare global {
  var __workerHarness:
    | {
        start(s: WorkerScenario): void;
        log(): { type: string; generation: number | null; rowId: string | null; t: number }[];
        stop(): void;
      }
    | undefined;
}
```

`start` stops any earlier run, builds the scenario's engine as below, and then calls
`engine.setView(800×600 default view, dpr 1)`. Each scenario:

- **`"default"`** appends a fresh host `div` to `#root` and calls `mountHarness` (its engine
  comes from `createEngine(options)`), rendering
  `<p data-testid="probe">{skin} {rows.length} {backendKind}</p>`. `stop()` calls the
  `destroy()` that `mountHarness` returned and removes the `div`.
- **The other four** skip the React UI, because `HarnessOptions` (section 16) has no deps
  input. Each builds its engine with
  `createEngine(undefined, { backend: tap(createWorkerBackend({ createWorker })) })`, then calls
  `exposeEngineForTests(engine)` directly and keeps the returned cleanup, so `snap()`,
  `fallsBack()` and the AR-49 test read the engine through `globalThis.__calculatorHarness`.
  `stop()` calls that cleanup, then `engine.destroy()`. `tap` logs every delivered message
  with `performance.now()` and passes `kind` through as a getter.
  - `"constructor-throws"` replaces `globalThis.Worker` with a class whose constructor throws
    `new DOMException("blocked", "SecurityError")`. `stop` restores it.
  - `"error-before-ready"` and `"never-ready"` use Blob classic workers. Their sources are
    `throw new Error("boom");` and `self.onmessage = () => {};`.
  - `"hang-once"` creates a Blob worker first, then `createComputeWorker()`. The Blob worker
    answers `hello` with a `ready` message carrying the marker, and answers `state` and
    `view` with `done`. Given a `state` containing row `slow`, it posts `begin` for `slow`
    and then runs `for (;;) {}`.

- [ ] **Step 1: Write the failing spec.** `harness(page)` opens `/v2/worker.html`. It records
      console errors and `pageerror` events, and `afterEach` expects both to be empty. Console
      errors whose `location().url` starts with `blob:` are ignored, because the AR-50 fixture
      workers throw on purpose. `snap(page)` evaluates `__calculatorHarness.engine.getSnapshot()`
      into plain data: `backendKind`, the rows (`id`, `overrun`, `error?.message`, `valueText`)
      and the geometry keys. `fallsBack(page, scenario)` starts the scenario, sets
      `p: y=x^{2}`, and polls for up to 6 s until `backendKind` is `"main-thread"` and the
      geometry keys are `["p"]`. It then expects the `workers` counter to be 0 (or absent).

```ts
test("AR-43 each calculator runs one module worker named karman-calculator that destroy terminates", async ({
  page,
}) => {
  await harness(page);
  const workerEvent = page.waitForEvent("worker");
  await page.evaluate(() => window.__workerHarness!.start("default"));
  const w = await workerEvent;
  expect(w.url()).toContain("compute.worker");
  expect(await w.evaluate(() => self.name)).toBe("karman-calculator");
  expect(
    await w.evaluate(() => {
      try {
        (self as unknown as { importScripts(): void }).importScripts();
        return "classic";
      } catch (e) {
        return e instanceof TypeError ? "module" : "classic";
      }
    })
  ).toBe("module");
  await expect(page.getByTestId("probe")).toHaveText("ivory 1 worker");
  await page.evaluate(() => {
    const e = globalThis.__calculatorHarness!.engine;
    e.setExpression({ id: "p", latex: "y=x^{2}" });
    e.setExpression({ id: "p", latex: "y=x^{3}" });
  });
  await expect.poll(async () => (await snap(page)).geometry).toContain("p");
  expect(await page.evaluate(() => globalThis.__karmanCalculatorCounters?.workers)).toBe(1);
  const closed = new Promise((r) => w.once("close", r));
  await page.evaluate(() => window.__workerHarness!.stop());
  await closed;
  expect(await page.evaluate(() => globalThis.__karmanCalculatorCounters?.workers)).toBe(0);
});
test("AR-49 a worker silent for 1,500 ms is replaced, the busy row shows the timeout message and the new worker answers within 300 ms", async ({
  page,
}) => {
  await harness(page);
  await warmUp(page); // start("default"), wait for a plot of y=x, stop()
  await page.evaluate(() => {
    window.__workerHarness!.start("hang-once");
    globalThis.__calculatorHarness!.engine.setExpressions([
      { id: "slow", latex: "x^{2}+y^{2}=25" },
      { id: "ok", latex: "y=x" },
    ]);
  });
  await expect
    .poll(async () => (await snap(page)).rows.find((r) => r.id === "slow")?.error, {
      timeout: 5000,
    })
    .toBe("This is taking too long. Try a smaller range or fewer terms.");
  const log = await page.evaluate(() => window.__workerHarness!.log());
  const o = log.findIndex((m) => m.type === "overrun" && m.rowId === "slow");
  const first = log.slice(o + 1).find((m) => ["analysis", "value", "plot"].includes(m.type))!;
  expect(first.t - log[o].t).toBeLessThanOrEqual(300);
  await expect.poll(async () => (await snap(page)).geometry).toEqual(["ok"]);
  expect(await page.evaluate(() => globalThis.__karmanCalculatorCounters?.workers)).toBe(1);
  await page.evaluate(() =>
    globalThis.__calculatorHarness!.engine.setExpression({ id: "slow", latex: "x^{2}+y^{2}=16" })
  );
  await expect.poll(async () => (await snap(page)).geometry.sort()).toEqual(["ok", "slow"]);
});
test("AR-50 a Worker constructor that throws falls back to the main thread and graphs still render", async ({
  page,
}) => {
  await harness(page);
  await fallsBack(page, "constructor-throws");
});
test("AR-50 a worker that errors before ready falls back to the main thread and graphs still render", async ({
  page,
}) => {
  await harness(page);
  await fallsBack(page, "error-before-ready");
});
test("AR-50 a worker whose ready takes longer than 3,000 ms falls back to the main thread", async ({
  page,
}) => {
  await harness(page);
  const fell = fallsBack(page, "never-ready");
  // the engine posts at once, but no watchdog runs before ready (Task 7 Step 3): only the 3,000 ms ready timer decides
  await page.waitForTimeout(2500);
  expect((await snap(page)).backendKind).toBe("worker");
  await fell;
});
```

- [ ] **Step 2: Run it and see it fail.**
      `n exec 22 npm run test:calculator -- --project=calculator-chrome tests/calculator/v2/worker.spec.ts`.
      Expected: FAIL. `window.__workerHarness` is undefined, because `/v2/worker.html` does not
      exist yet and Vite's SPA fallback serves the v1 fixture.
- [ ] **Step 3: Create the three harness files.**
  - `worker.html` copies `tests/calculator/fixture/index.html`, with the title
    `Calculator v2 worker harness` and `<script type="module" src="./worker.tsx">`.
  - Blob workers are created with
    `new Worker(URL.createObjectURL(new Blob([source], { type: "text/javascript" })), { name: "karman-calculator" })`.
- [ ] **Step 4: Run it and see it pass.** Run the Step 2 command, then all five projects:
      `n exec 22 npm run test:calculator -- tests/calculator/v2/worker.spec.ts`. Expected:
      PASS. Then run the package gate, where each command must exit 0:
      `n exec 22 npx vitest run src/lib/calculator-v2 src/components/calculator-v2`,
      `n exec 22 npx tsc --noEmit`, `n exec 22 npm run lint`,
      `n exec 22 npm run format:check`, `n exec 22 node scripts/check-file-sizes.mjs` and
      `n exec 22 npx tsx scripts/calculator-v2/check-spec-ids.mjs --packages 07`.
- [ ] **Step 5: Commit.** `git commit -m "Add the v2 harness kit and worker browser checks (AR-43, AR-49, AR-50)"`
