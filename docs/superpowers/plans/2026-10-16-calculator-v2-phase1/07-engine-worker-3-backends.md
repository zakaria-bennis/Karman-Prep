# 07 engine-worker, part 3 of 7: worker and main-thread backends, import-graph, DOM and code-generation scans (Tasks 7 and 8)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

Part 3 of package `07-engine-worker.md`, which holds the package header (IDs, contributions,
open items, Commands), the Decisions and the Notes for the lead; they apply to every task here,
and "Decision N" and "Notes for the lead" below refer to that file. Tasks run in number order
across the seven parts; each part starts where the previous one ends. Contracts:
`01-interfaces.md` sections 0 to 5, `01-interfaces-runtime.md` sections 7 and 8 and
`01-interfaces-integration.md` section 16; every name below is theirs.

---

### Task 7: Backends and the worker entry (AR-43, AR-45, AR-49, AR-50; AR-47 and AR-50 text through OI-35)

**Gate: the owner's OI-35 decision.** OI-35 ("Notes for the lead" in `07-engine-worker.md`) is
recorded in `00-index.md` section 6.2 with fix (b) as its proposed text, and the owner decides it
before wave 2 starts. That row, its `open-items.md` entry and the recorded decision are lead
edits; this task only reads them (Step 0).

- **Fix (b) accepted:** Task 7 runs as written. Step 0 applies the AR-47 and AR-50 text to the
  spec and deletes the `it.fails` gap test "AR-47, AR-50 the main-thread backend never runs more
  than 8 ms between yields (OI-35 gap)" from this task. Under the reworded text AR-47's bound is
  a yield after each unit that ends 8 ms or more after its slice began, and AR-50's slices are
  the AR-47 slices. Task 6's "AR-47 the executor yields after a unit once the slice is spent" and
  Step 1's "AR-50 the main-thread backend runs in the AR-47 slices …" assert exactly that with
  the spec's 8 ms, so neither ID is claimed while a shipped case fails (overview section 7.3).
- **Fix (b) rejected:** Task 7 does not start. The lead first re-plans 04 (`evaluateRows`), 06
  (`plotRow`) and 07 Tasks 5 to 7 for resumable units (fix (a): both functions resumable at
  their deadline checks, a contract change to `01-interfaces.md` sections 4 and 5, so the
  executor can yield inside a unit). In that re-plan the gap test is an `it`, not an `it.fails`:
  it runs `createMainThreadBackend()` (default timing, real `performance.now()`) on
  `x^{2}+y^{2}=25` at 800×600 while a real `MessageChannel` ticker re-posts itself, and asserts
  that the longest gap between two ticks is at most 8 ms. Nothing below applies until that
  re-plan lands.

**Files:** Create `src/lib/calculator-v2/worker/compute.worker.ts`,
`src/lib/calculator-v2/worker/create.ts`, `src/lib/calculator-v2/worker/backend.ts`; Modify
`docs/superpowers/specs/calculator-v2/d-architecture-integration.md` (AR-47 and AR-50, OI-35
fix (b), Step 0); Test `src/lib/calculator-v2/worker/create.test.ts`,
`src/lib/calculator-v2/worker/backend.test.ts`.

**Interfaces:**

- Produces section 7's `ComputeBackend`, `WorkerBackendOptions`, `createWorkerBackend`,
  `createMainThreadBackend` and `createComputeWorker`. `kind` is a getter; it changes once, on
  fallback.
- Produces the package-internal
  `createMainThreadBackendWith(timing: Partial<ExecutorTiming>): ComputeBackend`.
  `createMainThreadBackend()` returns `createMainThreadBackendWith({})`, so the main-thread
  executor runs with the executor's own defaults (`sliceMs` 8 and `heartbeatMs` 200: the AR-47
  slices and heartbeats) and the AR-48 deadlines of `runValuesPass`. The main-thread backend
  delivers each executor post to its listeners synchronously, in post order.
- The backend uses the `onmessage` and `onerror` properties of the worker, so tests can pass a
  plain fake.
- Consumes `bumpDevCounter` (02), Task 6 and `isWorkerMessage`.
- `compute.worker.ts` has no exports. It types its scope as
  `globalThis as unknown as { onmessage: ((e: MessageEvent<unknown>) => void) | null; postMessage(m: unknown, t: Transferable[]): void }`,
  passes `isMainMessage` data to `new Executor({ post: (m, t) => scope.postMessage(m, t) })`,
  and uses no `import.meta` and no top-level `await` (OI-29: Turbopack loads it as a classic
  worker).

- [ ] **Step 0: Confirm the OI-35 decision and apply fix (b) to the spec.**
  - Read the OI-35 row of `00-index.md` section 6.2 and its `open-items.md` entry. If neither
    records that the owner accepted fix (b), stop and report to the lead; the task follows the
    gate above.
  - In `docs/superpowers/specs/calculator-v2/d-architecture-integration.md`, AR-47: replace
    "after at most 8 ms of continuous work" with "after each unit of work (one values pass, one
    helper evaluation or one row's plot) that ends 8 ms or more after its slice began".
  - In the same file, AR-50: replace "in 8 ms slices" with "in the AR-47 slices".
  - Delete the `it.fails` test "AR-47, AR-50 the main-thread backend never runs more than 8 ms
    between yields (OI-35 gap)": Step 1 does not write it, and no `it.fails`, `it.skip` or
    `it.todo` enters `create.test.ts` or `backend.test.ts` (Step 4 checks).
  - Check the spec text, from the repository root:

    ```sh
    grep -cE 'after at most 8 ms of continuous work|in 8 ms slices' docs/superpowers/specs/calculator-v2/d-architecture-integration.md
    grep -c 'that ends 8 ms or more after its slice began and posts a `heartbeat`' docs/superpowers/specs/calculator-v2/d-architecture-integration.md
    grep -c 'on the main thread in the AR-47 slices with the AR-48 deadlines' docs/superpowers/specs/calculator-v2/d-architecture-integration.md
    ```

    Expected: `0`, then `1`, then `1`.

- [ ] **Step 1: Write the failing tests.**
  - `FakeWorker` records `posted: MainToWorker[]`, has `terminated`, `onmessage`, `onerror`
    and `send(data)` (which calls `onmessage?.({ data })`), and pushes itself to
    `FakeWorker.made`. `stateIds(w)` returns the row ids of the last `state` that `w` received.
  - `beforeEach` empties `FakeWorker.made`, sets `globalThis.__karmanCalculatorCounters` to
    `undefined` and calls `vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] })`, so
    the main-thread executor's `MessageChannel` and `macrotask()` stay real; `afterEach` calls
    `vi.useRealTimers()` and `vi.unstubAllGlobals()`.
  - Rows `r0…` come from `STATE(g, ...latex)`. Waiting uses `untilDone(() => got, g)` (Task 6).

```ts
it("AR-43 createComputeWorker builds a module worker named karman-calculator from compute.worker.ts", () => {
  const calls: [URL, WorkerOptions][] = [];
  vi.stubGlobal(
    "Worker",
    class {
      constructor(u: URL, o: WorkerOptions) {
        calls.push([u, o]);
      }
    }
  );
  createComputeWorker();
  expect(calls[0][0].pathname).toMatch(/\/worker\/compute\.worker\.ts$/);
  expect(calls[0][1]).toEqual({ type: "module", name: "karman-calculator" });
});
it("AR-43 each backend owns one worker: construction counts +1, dispose sends dispose, terminates and counts −1 once", () => {
  const b = createWorkerBackend({ createWorker: () => new FakeWorker() as unknown as Worker });
  expect(FakeWorker.made).toHaveLength(1);
  expect(globalThis.__karmanCalculatorCounters?.workers).toBe(1);
  b.dispose();
  b.dispose();
  expect(FakeWorker.made[0].posted.filter((m) => m.type === "dispose")).toEqual([
    { v: 1, type: "dispose" },
  ]);
  expect(FakeWorker.made[0].terminated).toBe(true);
  expect(globalThis.__karmanCalculatorCounters?.workers).toBe(0);
});
it("AR-45 the main-thread backend's dispose sends dispose to its executor, which then posts nothing", async () => {
  const parked: (() => void)[] = [];
  const got: WorkerToMain[] = [];
  const b = createMainThreadBackendWith({
    now: () => 0,
    sliceMs: 0,
    yieldToEventLoop: () => new Promise<void>((resolve) => parked.push(resolve)),
  });
  b.onMessage((m) => got.push(m));
  b.post(STATE(1, "y=x", "y=x^{2}"));
  b.post(VIEW_MSG(2));
  parked.shift()!();
  await macrotask(); // runs the values pass, then parks at the next yield
  expect(got.some((m) => m.type === "value")).toBe(true);
  const n = got.length;
  b.dispose();
  while (parked.length) {
    parked.shift()!();
    await macrotask();
  }
  expect(got).toHaveLength(n);
});
it("AR-49 after 1,500 ms without a message during a job the worker is replaced and the last begin row is quarantined", () => {
  const b = createWorkerBackend({ createWorker: () => new FakeWorker() as unknown as Worker });
  const got: WorkerToMain[] = [];
  b.onMessage((m) => got.push(m));
  const [w1] = FakeWorker.made;
  w1.send({ v: 1, type: "ready", worker: WORKER_MARKER });
  b.post(HELLO(5));
  b.post(STATE(1, "x^{2}+y^{2}=25", "y=x"));
  b.post(VIEW_MSG(2));
  w1.send({ v: 1, type: "begin", generation: 2, rowId: "r0" });
  vi.advanceTimersByTime(1499);
  expect(FakeWorker.made).toHaveLength(1);
  vi.advanceTimersByTime(1);
  expect(w1.terminated).toBe(true);
  expect(got.at(-1)).toEqual({ v: 1, type: "overrun", generation: 2, rowId: "r0" });
  const w2 = FakeWorker.made[1];
  expect(w2.posted.map((m) => m.type)).toEqual(["hello", "state", "view"]);
  expect(stateIds(w2)).toEqual(["r1"]);
  expect(globalThis.__karmanCalculatorCounters?.workers).toBe(1);
  b.post(STATE(3, "x^{2}+y^{2}=25", "y=2x"));
  expect(stateIds(w2)).toEqual(["r1"]);
  b.post(STATE(4, "x^{2}+y^{2}=16", "y=2x"));
  expect(stateIds(w2)).toEqual(["r0", "r1"]);
});
it("AR-49 posts do not hold off the watchdog: a worker silent for 1,500 ms is replaced while the main thread keeps posting", () => {
  const b = createWorkerBackend({ createWorker: () => new FakeWorker() as unknown as Worker });
  const got: WorkerToMain[] = [];
  b.onMessage((m) => got.push(m));
  const [w1] = FakeWorker.made;
  w1.send({ v: 1, type: "ready", worker: WORKER_MARKER });
  b.post(HELLO(5));
  b.post(STATE(1, "x^{2}+y^{2}=25", "y=x"));
  b.post(VIEW_MSG(2));
  w1.send({ v: 1, type: "begin", generation: 2, rowId: "r0" }); // the last worker message
  vi.advanceTimersByTime(1000);
  b.post(STATE(3, "x^{2}+y^{2}=25", "y=2x")); // typing
  vi.advanceTimersByTime(400);
  b.post(VIEW_MSG(4)); // dragging
  vi.advanceTimersByTime(99);
  expect(FakeWorker.made).toHaveLength(1);
  vi.advanceTimersByTime(1); // 1,500 ms after the begin
  expect(w1.terminated).toBe(true);
  expect(got.at(-1)).toEqual({ v: 1, type: "overrun", generation: 4, rowId: "r0" });
  expect(stateIds(FakeWorker.made[1])).toEqual(["r1"]);
});
it("AR-49 heartbeats keep a long job alive, an idle worker is never replaced, and a job with no begin is replaced without quarantine", () => {
  const b = createWorkerBackend({ createWorker: () => new FakeWorker() as unknown as Worker });
  const got: WorkerToMain[] = [];
  b.onMessage((m) => got.push(m));
  const [w1] = FakeWorker.made;
  w1.send({ v: 1, type: "ready", worker: WORKER_MARKER });
  b.post(HELLO(5));
  b.post(STATE(1, "x^{2}+y^{2}=25", "y=x"));
  b.post(VIEW_MSG(2));
  w1.send({ v: 1, type: "begin", generation: 2, rowId: "r0" });
  for (let i = 0; i < 5; i++) {
    vi.advanceTimersByTime(1000);
    w1.send({ v: 1, type: "heartbeat", generation: 2 });
  }
  expect(FakeWorker.made).toHaveLength(1);
  w1.send({ v: 1, type: "done", generation: 2 }); // idle: clears lastBegin and the watchdog
  vi.advanceTimersByTime(10_000);
  expect(FakeWorker.made).toHaveLength(1);
  b.post(STATE(3, "x^{2}+y^{2}=25", "y=2x")); // active again; the worker never answers
  vi.advanceTimersByTime(1500);
  expect(w1.terminated).toBe(true);
  expect(got.some((m) => m.type === "overrun")).toBe(false);
  const w2 = FakeWorker.made[1];
  expect(w2.posted.map((m) => m.type)).toEqual(["hello", "state", "view"]);
  expect(stateIds(w2)).toEqual(["r0", "r1"]);
});
it("AR-50 a Worker constructor that throws falls back to the main thread and still plots", async () => {
  const b = createWorkerBackend({
    createWorker: () => {
      throw new DOMException("blocked", "SecurityError");
    },
  });
  expect(b.kind).toBe("main-thread");
  const got: WorkerToMain[] = [];
  b.onMessage((m) => got.push(m));
  b.post(HELLO(1));
  b.post(STATE(1, "y=x^{2}"));
  b.post(VIEW_MSG(2));
  await untilDone(() => got, 2);
  expect(got).toContainEqual(expect.objectContaining({ type: "plot", generation: 2, rowId: "r0" }));
  expect(globalThis.__karmanCalculatorCounters?.workers ?? 0).toBe(0);
});
it("AR-50 an error before ready falls back, suppresses the default report and replays posted messages", async () => {
  const b = createWorkerBackend({ createWorker: () => new FakeWorker() as unknown as Worker });
  const got: WorkerToMain[] = [];
  b.onMessage((m) => got.push(m));
  b.post(HELLO(1));
  b.post(STATE(1, "y=x^{2}"));
  b.post(VIEW_MSG(2));
  const [w1] = FakeWorker.made;
  const preventDefault = vi.fn();
  w1.onerror!({ preventDefault } as unknown as ErrorEvent);
  expect(preventDefault).toHaveBeenCalledTimes(1);
  expect(w1.terminated).toBe(true);
  expect(b.kind).toBe("main-thread");
  await untilDone(() => got, 2);
  expect(got).toContainEqual(expect.objectContaining({ type: "plot", generation: 2, rowId: "r0" }));
  expect(globalThis.__karmanCalculatorCounters?.workers).toBe(0);
});
it("AR-50 posts before a late ready do not trigger the AR-49 watchdog", async () => {
  const b = createWorkerBackend({ createWorker: () => new FakeWorker() as unknown as Worker });
  const got: WorkerToMain[] = [];
  b.onMessage((m) => got.push(m));
  b.post(HELLO(1));
  b.post(STATE(1, "y=x^{2}"));
  b.post(VIEW_MSG(2));
  const [w1] = FakeWorker.made;
  vi.advanceTimersByTime(2999); // well past 1,500 ms: no watchdog before ready
  expect(FakeWorker.made).toHaveLength(1);
  expect(b.kind).toBe("worker");
  vi.advanceTimersByTime(1);
  expect(b.kind).toBe("main-thread");
  expect(w1.terminated).toBe(true);
  expect(globalThis.__karmanCalculatorCounters?.workers).toBe(0);
  await untilDone(() => got, 2);
  expect(got).toContainEqual(expect.objectContaining({ type: "plot", generation: 2, rowId: "r0" }));
});
it("AR-49, AR-50 a replacement worker gets a fresh 3,000 ms ready timer and no watchdog before its ready", async () => {
  const b = createWorkerBackend({ createWorker: () => new FakeWorker() as unknown as Worker });
  const got: WorkerToMain[] = [];
  b.onMessage((m) => got.push(m));
  const [w1] = FakeWorker.made;
  w1.send({ v: 1, type: "ready", worker: WORKER_MARKER });
  b.post(HELLO(5));
  b.post(STATE(1, "y=x^{2}"));
  b.post(VIEW_MSG(2));
  vi.advanceTimersByTime(1500); // w1 silent while active: replaced
  expect(w1.terminated).toBe(true);
  const w2 = FakeWorker.made[1];
  vi.advanceTimersByTime(2999); // w2 never answers: no second respawn
  expect(FakeWorker.made).toHaveLength(2);
  expect(b.kind).toBe("worker");
  vi.advanceTimersByTime(1);
  expect(b.kind).toBe("main-thread");
  expect(w2.terminated).toBe(true);
  expect(globalThis.__karmanCalculatorCounters?.workers).toBe(0);
  await untilDone(() => got, 2);
  expect(got).toContainEqual(expect.objectContaining({ type: "plot", generation: 2, rowId: "r0" }));
});
it("AR-50 a ready later than 3,000 ms falls back and the late ready is ignored", () => {
  const b = createWorkerBackend({ createWorker: () => new FakeWorker() as unknown as Worker });
  const got: WorkerToMain[] = [];
  b.onMessage((m) => got.push(m));
  const [w1] = FakeWorker.made;
  vi.advanceTimersByTime(2999);
  expect(b.kind).toBe("worker");
  vi.advanceTimersByTime(1);
  expect(b.kind).toBe("main-thread");
  expect(w1.terminated).toBe(true);
  w1.send({ v: 1, type: "ready", worker: WORKER_MARKER });
  expect(b.kind).toBe("main-thread");
  expect(got).toEqual([]);
});
it("AR-50 the main-thread backend runs in the AR-47 slices: a yield after each unit that ends 8 ms or more after its slice began", async () => {
  // AR-47 and AR-50 as reworded by OI-35 fix (b), Step 0. Time advances only when a message is delivered, so each plot unit (begin + plot) spends 2 × msPerMessage
  const yieldsFor = async (msPerMessage: number) => {
    let t = 0,
      yields = 0;
    const got: WorkerToMain[] = [];
    const b = createMainThreadBackendWith({
      now: () => t,
      yieldToEventLoop: async () => {
        yields++;
        await macrotask();
      },
    });
    b.onMessage((m) => {
      got.push(m);
      t += msPerMessage;
    });
    b.post(STATE(1, "y=x", "y=x^{2}", "x^{2}+y^{2}=25"));
    b.post(VIEW_MSG(2));
    await untilDone(() => got, 2);
    b.dispose();
    return yields;
  };
  expect(await yieldsFor(4)).toBe(5); // 8 ms per plot unit: start, after the values pass, after each of 3 plots
  expect(await yieldsFor(3.9)).toBe(3); // 7.8 ms per plot unit: start, after the values pass, after the second plot
});
it("AR-50 the main-thread backend applies the 250 ms row deadline and posts overrun", async () => {
  const overrunsFor = async (beginMs: number) => {
    let t = 0;
    const got: WorkerToMain[] = [];
    const b = createMainThreadBackendWith({ now: () => t });
    b.onMessage((m) => {
      got.push(m);
      if (m.type === "begin" && m.rowId === "r0") t += beginMs; // the deadline started just before this begin
    });
    b.post(STATE(1, "2+3", "4"));
    await untilDone(() => got, 1);
    b.dispose();
    return got.flatMap((m) => (m.type === "overrun" ? [m.rowId] : []));
  };
  expect(await overrunsFor(250)).toEqual(["r0"]);
  expect(await overrunsFor(249.9)).toEqual([]);
});
```

- [ ] **Step 2: Run them and see them fail.**
      `n exec 22 npx vitest run src/lib/calculator-v2/worker/create.test.ts src/lib/calculator-v2/worker/backend.test.ts`.
      Expected: FAIL, `Failed to resolve import "./create"`.
- [ ] **Step 3: Implement the backends.** `createWorkerBackend` keeps:
  - the last `hello`, `state` and `view`, and the pending `evaluate` jobs (each dropped when
    its value arrives);
  - `lastBegin`, cleared by a `value`, `plot` or `overrun` for that row and by any `done`;
  - the quarantine map from row id to the latex that row had in the latest `state`;
  - `active`, which is true while the latest posted state or view generation has no `done`, or
    a job is pending.

  Timers (each worker is in one of two phases, before its `ready` and after it):
  - **Before `ready`, only the ready timer runs.** The ready timer (`readyTimeoutMs`, 3,000 ms)
    starts once, when the backend constructs its first worker. Posts and replays never start
    or restart it, and `ready` clears it. Posts before `ready` are still forwarded to the
    worker and recorded for replay, but the watchdog is never armed before `ready`, whatever
    is posted. So the `hello` and `state` that the engine constructor posts at t = 0, which
    make the backend active, cannot respawn a slow or never-ready worker at 1,500 ms: a slow
    first load (worker chunks up to 250 KB) waits the full AR-50 3,000 ms and then falls back.
  - **After `ready`, only the watchdog runs.** The watchdog (`watchdogMs`, 1,500 ms) measures
    worker silence only (AR-49: "no message arrives"). It is armed on `ready` when the backend
    is already active, and afterwards when a post moves the backend from idle to active. It is
    re-armed on every message from the worker while `active` and cleared when the backend
    becomes idle. Posts never re-arm it, so typing or dragging cannot hold off the replacement
    of a hung worker.
  - **A respawn starts a fresh ready timer.** A watchdog respawn can only happen after `ready`.
    It puts the new worker back in the before-`ready` phase: a fresh 3,000 ms ready timer for
    that worker and no watchdog until its own `ready`. A replacement that never becomes ready
    therefore falls back to the main thread after 3,000 ms instead of respawning again.

  On watchdog expiry it terminates the worker, quarantines `lastBegin` (if any) and emits the
  synthetic `overrun` for that row, carrying the latest generation posted to the backend, so
  the engine accepts it (Decision 3). It then creates the next worker and replays the hello,
  the quarantined state, the view and the jobs.

  Fallback happens when the constructor throws, `onerror` fires before `ready` (call
  `preventDefault()`) or the ready timer fires. It clears both timers, detaches and terminates
  the worker, then replays the same messages into `createMainThreadBackend()`. A `ready` that
  arrives after the fallback is ignored.

  Dispose (AR-45's `dispose` message):
  - The worker backend's `dispose()` posts `{ v: 1, type: "dispose" }` to its current worker,
    then terminates it, clears both timers and drops its listeners. Only the first call does
    anything. After a fallback it disposes the main-thread backend it delegates to.
  - `createMainThreadBackendWith`'s `dispose()` passes `{ v: 1, type: "dispose" }` to its
    executor's `receive` (Task 6 stops the loop and closes the channel), then drops its
    listeners.
  - Watchdog respawns and fallbacks terminate without posting `dispose`, because the worker is
    hung or never started.

  The `workers` counter changes only where a worker is constructed or terminated.
  `createComputeWorker` is the exact call of section 7.

- [ ] **Step 4: Run them and see them pass.** Run the Step 2 command. Expected: PASS, with no
      skipped, todo or expected-fail test in the report. Then, from the repository root,
      `grep -nE "(it|test)\.(fails|skip|todo)" src/lib/calculator-v2/worker/create.test.ts src/lib/calculator-v2/worker/backend.test.ts`.
      Expected: no output.
- [ ] **Step 5: Commit.** Stage the files of this task's Files list, the spec file included,
      then `git commit -m "Add worker and main-thread compute backends and reword AR-47 and AR-50 to unit slices (AR-43, AR-45, AR-47, AR-49, AR-50, OI-35)"`

### Task 8: Import-graph, DOM and code-generation scans (AR-4, AR-44)

**Files:** Create `src/lib/calculator-v2/worker/__fixtures__/source-scan.ts`,
`src/lib/calculator-v2/worker/__fixtures__/codegen-guards.ts`; Test
`src/lib/calculator-v2/worker/import-graph.test.ts`, `src/lib/calculator-v2/worker/no-codegen.test.ts`.

**Interfaces:** Produces (test fixtures, exempt from AR-1):

```ts
export interface SourceHost {
  read(file: string): string | null;
} // repo-relative paths
export function nodeSourceHost(root: string): SourceHost;
export function memoryHost(files: Readonly<Record<string, string>>): SourceHost; // read(f) = files[f] ?? null
export function listSourceFiles(
  root: string,
  dirs: readonly string[],
  options?: { includeTests?: boolean }
): string[]; // .ts .tsx .js .mjs, sorted; *.test.* and __fixtures__/ skipped unless includeTests
export function moduleSpecifiers(file: string, source: string): string[]; // value imports, value re-exports, import(); type-only skipped; "?query" stripped (TypeScript AST)
export function resolveSpecifier(
  host: SourceHost,
  importer: string,
  specifier: string
): { file: string } | { package: string }; // "./", "../", "@/" -> src/; tries "", .ts, .tsx, .js, .mjs, /index.ts, /index.tsx; a package is its first segment, or "@scope/name"
export function importGraph(
  host: SourceHost,
  entry: string
): { files: string[]; packages: string[] }; // both sorted; a resolved file not ending in .ts/.tsx/.js/.mjs (CSS) is listed but not parsed
export function usesImportMeta(file: string, source: string): boolean; // a MetaProperty node (import.meta) in the TypeScript AST; comments and strings never count
export function mathquillRuntimeImporters(host: SourceHost, files: readonly string[]): string[];
// the files with a value import that resolves to any file under vendor/mathquill/; the one exception is a
// CSS target imported by a file under tests/calculator/fixture/ (the 05 and 09 harness pages import
// vendor/mathquill/mathquill.css?inline), so a src/ file importing the CSS is still listed
export function codegenFindings(file: string, source: string): string[]; // "eval call at 3:5", "Function constructor at …", "string timer at …"
export const DOM_GLOBALS: readonly string[]; // ["window", "document", "navigator", "HTMLElement", "requestAnimationFrame"]
export function domGlobalReferences(file: string, source: string): string[];
// "window at 3:5": each identifier named in DOM_GLOBALS, in value or type position, typeof guards included, and
// globalThis.X or self.X; object-literal keys and other member names (a.window) never count
export function installCodegenGuards(): { calls: string[]; restore(): void }; // eval, Function, Function.prototype.constructor, async and generator constructors, string setTimeout/setInterval
```

- [ ] **Step 1: Write the failing tests.**
  - Both files start with `const ROOT = process.cwd();` (Vitest runs from the repository root)
    and import `readFileSync` from `"node:fs"`, `join` from `"node:path"` and the fixture
    functions from `"./__fixtures__/source-scan"`.
  - `import-graph.test.ts` holds the AR-4 tests below. `no-codegen.test.ts` holds the AR-44
    tests and, before anything else, imports statically: `CORPUS` from `"../core/corpus"`,
    `graphCases` from `"../core/corpus/cases/graph"` (that file's default export, Task 4),
    `analyzeRows` from `"../core/analysis"`, `evaluateRows` from `"../core/eval/compile"`,
    `NO_DEADLINE` from `"../core/deadline"`, `Executor` from `"./executor"`,
    `installCodegenGuards` from `"./__fixtures__/codegen-guards"`, and `STATE`, `VIEW_MSG`
    and `untilDone` from `"./__fixtures__/messages"`.

```ts
it("AR-4 the walker follows relative, @/ and dynamic imports, skips type-only ones and reports packages", () => {
  const host = memoryHost({
    "src/a.ts":
      'import "./b"; import type { X } from "react-dom"; export * from "@/c"; void import("./d");',
    "src/b.ts": 'import React from "react";',
    "src/c.ts": "",
    "src/d/index.ts": 'import "katex/dist/katex.min.css";',
  });
  expect(importGraph(host, "src/a.ts")).toEqual({
    files: ["src/a.ts", "src/b.ts", "src/c.ts", "src/d/index.ts"],
    packages: ["katex", "react"],
  });
});
it("AR-4 the compute worker's import graph has no React, MathQuill, src/components, engine, backend or import.meta", () => {
  const g = importGraph(nodeSourceHost(ROOT), "src/lib/calculator-v2/worker/compute.worker.ts");
  expect(
    g.packages.filter((p) =>
      ["react", "react-dom", "scheduler", "lucide-react", "katex"].includes(p)
    )
  ).toEqual([]);
  expect(
    g.files.filter((f) =>
      /^(vendor\/mathquill\/|src\/components\/|src\/lib\/calculator-v2\/(core\/api|render)\/|src\/lib\/calculator-v2\/worker\/(create|create\.standalone|backend)\.ts$)/.test(
        f
      )
    )
  ).toEqual([]);
  const host = nodeSourceHost(ROOT);
  expect(g.files.filter((f) => usesImportMeta(f, host.read(f)!))).toEqual([]);
});
it("AR-4 import.meta is found through the syntax tree, never in comments or strings", () => {
  expect(usesImportMeta("x.ts", "const u = new URL('./a.ts', import.meta.url);")).toBe(true);
  expect(usesImportMeta("x.ts", "// no import.meta (OI-29)\nconst s = 'import.meta';")).toBe(false);
});
it("AR-4 only math-field/MathField.ts imports vendor/mathquill at run time", () => {
  const files = listSourceFiles(ROOT, ["src", "tests"], { includeTests: true });
  expect(mathquillRuntimeImporters(nodeSourceHost(ROOT), files)).toEqual([
    "src/components/calculator-v2/math-field/MathField.ts",
  ]);
});
it("AR-4 the MathQuill check allows .css?inline only from a harness page and flags any other import", () => {
  const host = memoryHost({
    "src/components/calculator-v2/math-field/MathField.ts":
      'import MathQuill from "../../../../vendor/mathquill/mathquill.js";',
    "tests/calculator/fixture/v2/math-field.tsx":
      'import css from "../../../../vendor/mathquill/mathquill.css?inline";',
    "src/other.ts": 'import "../vendor/mathquill/mathquill.js";',
    "src/styles.ts": 'import css from "../vendor/mathquill/mathquill.css?inline";',
    "vendor/mathquill/mathquill.js": "",
    "vendor/mathquill/mathquill.css": "",
  });
  expect(
    mathquillRuntimeImporters(host, [
      "src/components/calculator-v2/math-field/MathField.ts",
      "src/other.ts",
      "src/styles.ts",
      "tests/calculator/fixture/v2/math-field.tsx",
    ])
  ).toEqual([
    "src/components/calculator-v2/math-field/MathField.ts",
    "src/other.ts",
    "src/styles.ts",
  ]);
});
it("AR-44 the scan flags eval, Function and string timers and passes ordinary code", () => {
  for (const s of [
    "eval(x)",
    "window.eval(s)",
    "new Function('a')",
    "Function('return 1')()",
    "setTimeout('f()', 1)",
    "self.setInterval(`g()`, 5)",
    "(function () {}).constructor('x')",
  ])
    expect(codegenFindings("x.ts", s)).toHaveLength(1);
  for (const s of [
    "evaluate(x)",
    "setTimeout(() => f(), 1)",
    "newFunction()",
    "// new Function('a')",
    "const s = 'eval(x)';",
  ])
    expect(codegenFindings("x.ts", s)).toEqual([]);
});
it("AR-44 the DOM scan flags window, document, navigator, HTMLElement and requestAnimationFrame, guarded or not", () => {
  for (const s of [
    "window.x = 1",
    "if (typeof window !== 'undefined') f()",
    "document.body",
    "navigator.userAgent",
    "let el: HTMLElement | null = null",
    "requestAnimationFrame(f)",
    "globalThis.document",
  ])
    expect(domGlobalReferences("x.ts", s)).toHaveLength(1);
  for (const s of [
    "const o = { window: 1 }",
    "o.document",
    "// window",
    "const s = 'navigator'",
    "windowSize(1)",
  ])
    expect(domGlobalReferences("x.ts", s)).toEqual([]);
});
it("AR-44 core/latex, core/analysis, core/eval, core/lib, core/regression and plot/ reference no DOM global", () => {
  // non-test files only; a folder that does not exist yet (core/lib, core/regression) contributes no files
  const files = listSourceFiles(
    ROOT,
    ["core/latex", "core/analysis", "core/eval", "core/lib", "core/regression", "plot"].map(
      (d) => `src/lib/calculator-v2/${d}`
    )
  );
  expect(files.length).toBeGreaterThan(0);
  expect(
    files.flatMap((f) =>
      domGlobalReferences(f, readFileSync(join(ROOT, f), "utf8")).map((m) => `${f}: ${m}`)
    )
  ).toEqual([]);
});
it("AR-44 no calculator-v2 or vendored MathQuill module calls eval, new Function or a string timer", () => {
  // tests and __fixtures__/ included: AR-44 says "no module"; the guard fixtures wrap the globals and never call them
  const files = listSourceFiles(
    ROOT,
    ["src/lib/calculator-v2", "src/components/calculator-v2", "vendor/mathquill"],
    { includeTests: true }
  );
  expect(
    files.flatMap((f) =>
      codegenFindings(f, readFileSync(join(ROOT, f), "utf8")).map((m) => `${f}: ${m}`)
    )
  ).toEqual([]);
});
it("AR-44 the corpus, analysis, evaluation, plotting and the executor run with code generation disabled", async () => {
  const guards = installCodegenGuards();
  try {
    for (const c of CORPUS)
      if ("latex" in c.input) {
        const a = analyzeRows(
          [...(c.rows ?? []), c.input.latex].map((latex, i) => ({
            id: String(i),
            latex,
            hidden: false,
          })),
          { angleMode: c.settings?.angleMode ?? "radians", complex: c.settings?.complex ?? false }
        );
        evaluateRows(
          a,
          { angleMode: c.settings?.angleMode ?? "radians", complex: c.settings?.complex ?? false },
          () => NO_DEADLINE
        );
      }
    const posts: WorkerToMain[] = [];
    const ex = new Executor({ post: (m) => posts.push(m) });
    ex.receive(STATE(1, ...graphCases.flatMap((c) => ("latex" in c.input ? [c.input.latex] : []))));
    ex.receive(VIEW_MSG(2));
    await untilDone(() => posts, 2);
    expect(posts.filter((m) => m.type === "plot").length).toBeGreaterThan(0);
  } finally {
    guards.restore();
  }
  expect(guards.calls).toEqual([]);
}, 120_000);
```

- [ ] **Step 2: Run them and see them fail.**
      `n exec 22 npx vitest run src/lib/calculator-v2/worker/import-graph.test.ts src/lib/calculator-v2/worker/no-codegen.test.ts`.
      Expected: FAIL, `Failed to resolve import "./__fixtures__/source-scan"`.
- [ ] **Step 3: Implement both fixtures.**
  - Parse with `ts.createSourceFile` (`ScriptKind.JS` for `.js` and `.mjs`). `usesImportMeta`
    walks the tree for a node where `ts.isMetaProperty(node)` and
    `node.keywordToken === ts.SyntaxKind.ImportKeyword`. `codegenFindings` flags:
    - calls to `eval` or `.eval`;
    - `new` or calls on `Function` or `.Function`;
    - `.constructor(` with a string or template first argument;
    - `setTimeout` or `setInterval` with a string literal, template or string concatenation
      first argument.
  - `mathquillRuntimeImporters` runs `moduleSpecifiers` and `resolveSpecifier` on each file and
    keeps the file when a resolved `{ file }` starts with `vendor/mathquill/`, except when that
    target ends in `.css` and the importer starts with `tests/calculator/fixture/`.
  - `domGlobalReferences` walks the same tree. For every `Identifier` whose text is in
    `DOM_GLOBALS`, it skips the identifier when it is the `name` of a `PropertyAssignment`, of
    a `PropertyDeclaration` or `MethodDeclaration`, or of a `PropertyAccessExpression` whose
    `expression` is not the identifier `globalThis` or `self`. Every other occurrence is
    reported as `"<name> at <line>:<column>"` (1-based, from
    `getLineAndCharacterOfPosition`). `listSourceFiles` returns nothing for a folder that does
    not exist.
  - The guards wrap the globals in `Proxy`s that record a call and then throw. Each
    prototype's `constructor` is replaced with `Object.defineProperty` and restored the same
    way.
  - Every module the runtime test uses is imported statically, before the guards are
    installed, because Vitest's module runner uses `AsyncFunction`.
- [ ] **Step 4: Run them and see them pass.** Expected: PASS. A finding in another package's
      file goes to the lead as an AR-4 or AR-44 failure for its owner.
- [ ] **Step 5: Commit.** `git commit -m "Scan the worker import graph, DOM globals and calculator code for code generation (AR-4, AR-44)"`
