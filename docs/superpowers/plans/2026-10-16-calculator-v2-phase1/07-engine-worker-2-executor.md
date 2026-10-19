# 07 engine-worker, part 2 of 7: golden graph cases, slice clock, deadlines, passes and the executor (Tasks 4 to 6)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

Part 2 of package `07-engine-worker.md`, which holds the package header (IDs, contributions,
open items, Commands), the Decisions and the Notes for the lead; they apply to every task here,
and "Decision N" and "Notes for the lead" below refer to that file. Tasks run in number order
across the seven parts; each part starts where the previous one ends. Contracts:
`01-interfaces.md` sections 0 to 5, `01-interfaces-runtime.md` sections 7 and 8 and
`01-interfaces-integration.md` section 16; every name below is theirs.

---

### Task 4: Golden graph cases through the real pipeline (AR-44)

**Files:** Modify `src/lib/calculator-v2/core/corpus/cases/graph.ts` (02's stub); Create
`src/lib/calculator-v2/plot/golden.test.ts`.

**Interfaces:** Consumes `CorpusCase` (02); Task 3's `plotInputFor`, `buildCompileScope`;
`EXPLICIT_BUDGET`, `IMPLICIT_BUDGET`, `plotRow` (06). `graph.ts` default-exports cases with
`input: { latex }`, optional `rows` and `rules`, and no expected fields (section 2.2).

- [ ] **Step 1: Write the cases and the failing test.**
  - The case row has id `case`; context rows are `ctx-1…`, in order before it.
  - Pixel checks use the default 800×600 view: 40 px per unit, and `py(y) = (7.5 − y)·40`.

| id       | rules     | rows     | latex                   | Check                                                                                |
| -------- | --------- | -------- | ----------------------- | ------------------------------------------------------------------------------------ |
| graph-1  | G-9       |          | `y=\tan x`              | no segment joins different intervals `floor((x + π/2)/π)`                            |
| graph-2  | G-9       |          | `y=\frac{1}{x}`         | no segment has x0 < 0 < x1                                                           |
| graph-3  | G-9       |          | `y=\frac{x^{2}-1}{x-2}` | no segment has x0 < 2 < x1                                                           |
| graph-4  | G-10      |          | `y=\sqrt{1-x^{2}}`      | vertices within 0.5 px of (−1, 0) and (1, 0)                                         |
| graph-5  | G-10      |          | `y=\sqrt{x}`            | a vertex within 0.5 px of (0, 0)                                                     |
| graph-6  | G-10      |          | `y=\sqrt{x-3}+2`        | a vertex within 0.5 px of (3, 2)                                                     |
| graph-7  | G-10      |          | `y=\ln x`               | lowest vertex y ≤ −7.5 + 0.0125                                                      |
| graph-8  | G-11      |          | `y=x^{2}`               | each vertex and segment midpoint: \|y − x²\|·40 / √(1 + (2x)²) ≤ 0.5                 |
| graph-9  | G-11      |          | `y=\sin x`              | the same with sin x and slope cos x                                                  |
| graph-10 | G-12      |          | `y=\sin(100x)`          | `bands.length > 0`                                                                   |
| graph-11 | G-13      |          | `y=\frac{x^{2}-1}{x-1}` | a segment spans x = 1, or the runs either side end ≤ 1 px apart                      |
| graph-12 | G-16      |          | `x^{2}+y^{2}=25`        | every vertex: \|hypot(x, y) − 5\|·40 ≤ 0.5                                           |
| graph-13 | G-16      |          | `xy=6`                  | vertices in quadrants 1 and 3; no segment joins two quadrants                        |
| graph-14 | G-16      | `y=5`    | `x^{2}+y^{2}=25`        | (0, 5) within 0.5 px of the circle and of `ctx-1`'s line                             |
| graph-15 | G-8       |          | `x=3`                   | vertical lines, positions within 0.0125 of [3]                                       |
| graph-16 | G-7       |          | `(2,3)`                 | coords within 0.0125 of [2, 3]                                                       |
| graph-17 | G-1, G-17 |          | `1<y<3`                 | spans with x0 ≤ 400 < x1 cover [py(3)+1, py(1)−1] and stay inside [py(3)−1, py(1)+1] |
| graph-18 | G-1       |          | `y<2x+1`                | region; every boundary `dashed`                                                      |
| graph-19 | G-1       |          | `y\le2x+1`              | region; no boundary `dashed`                                                         |
| graph-20 | G-6       | `y=f(x)` | `f(x)=x^{2}+1`          | `ctx-1` within 0.5 px of (0, 1) and (1, 2)                                           |
| graph-21 | G-1       |          | `x=y^{2}`               | within 0.5 px of (4, 2), (4, −2) and (0, 0)                                          |

```ts
const CHECKS: Record<string, (r: GoldenRun) => void> = {
  /* one entry per row of the table */
};
it("AR-44 every graph.ts case has exactly one golden check", () =>
  expect(Object.keys(CHECKS).sort()).toEqual(cases.map((c) => c.id).sort()));
it.each(cases.map((c) => [c.id, c] as const))(
  "AR-44 golden %s runs through analyzeRows, evaluateRows, plotInputFor and plotRow",
  (id, c) => {
    const run = runGolden(c); // { view, geometry: Map<rowId, Geometry>, kinds: Map<rowId, PlotInput["kind"]> }
    for (const [rowId, g] of run.geometry) expectFiniteWithinBudget(g, run.kinds.get(rowId)!); // NaN only as x,y pairs; explicit/lines ≤ EXPLICIT_BUDGET, implicit/region ≤ IMPLICIT_BUDGET evaluations
    CHECKS[id](run);
  }
);
```

- [ ] **Step 2: Run it and see it fail.** `n exec 22 npx vitest run src/lib/calculator-v2/plot/golden.test.ts`.
      Expected: FAIL on the first test, because `graph.ts` still exports `[]` while `CHECKS`
      has 21 keys.
- [ ] **Step 3: Fill `graph.ts`** with the 21 cases of the table (ids, rules, rows, latex).
- [ ] **Step 4: Run it and see it pass.** Expected: PASS. A failing geometry check is a bug in
      06 or 04: report it to the lead with the case id. Do not weaken the check.
- [ ] **Step 5: Commit.** `git commit -m "Add graph golden cases through the real pipeline (AR-44)"`

### Task 5: Slice clock, work deadlines and generation passes (AR-47, AR-48, AR-54, API-10)

**Files:** Create `src/lib/calculator-v2/worker/slice.ts`, `src/lib/calculator-v2/worker/pass.ts`,
`src/lib/calculator-v2/worker/__fixtures__/messages.ts` (test helpers); Test
`src/lib/calculator-v2/worker/slice.test.ts`, `src/lib/calculator-v2/worker/pass.test.ts`.

**Interfaces:**

- Consumes: `ROW_VALUE_DEADLINE_MS`, `Deadline`, `DeadlineExceeded` from
  `@/lib/calculator-v2/core/deadline` (02, `01-interfaces.md` section 1.1); `parseLatex`,
  `ParseResult`, `toSExpr` from `@/lib/calculator-v2/core/latex` (02); `analyzeRows`, `userFunctionNames`,
  `AnalysisResult` (04, `core/analysis/index.ts`, `01-interfaces.md` section 3 as amended by
  04); `evaluateRows`, `compileExpression`, `UNDEFINED` (04); Tasks 2 and 3; `plotRow`,
  `geometryTransferables` (06).
- Produces (package-internal):

```ts
// slice.ts
export class SliceClock {
  constructor(
    timing: Pick<ExecutorTiming, "now" | "sliceMs" | "heartbeatMs">,
    postHeartbeat: () => void
  );
  startSlice(): void;
  shouldYield(): boolean; // now() - sliceStart >= sliceMs
  notePost(): void; // records now() as the last post
  pulse(): void; // postHeartbeat() and notePost() when now() - lastPost >= heartbeatMs - sliceMs
}
export function createWorkDeadline(o: {
  clock: SliceClock;
  now: () => number;
  limitMs: number | null;
  rowId: string | null;
  onExpire?: (rowId: string | null) => void;
}): Deadline;
// check(): clock.pulse(); then, when limitMs !== null, one now() read; at or past start + limitMs it calls onExpire once and throws new DeadlineExceeded(rowId) on this and every later check
// pass.ts
export interface PassContext {
  generation: number;
  clock: SliceClock;
  now: () => number;
  post(message: WorkerToMain, transfer?: ArrayBuffer[]): void;
}
export interface ComputeFns {
  analyzeRows: typeof analyzeRows;
  evaluateRows: typeof evaluateRows;
  plotInputFor: typeof plotInputFor;
  plotRow: typeof plotRow;
}
export const DEFAULT_COMPUTE: ComputeFns;
export interface ValuesOutcome {
  analysis: AnalysisResult;
  values: ReadonlyMap<string, Value>;
  scope: CompileScope;
  overrun: ReadonlySet<string>;
}
export function runValuesPass(
  rows: readonly WireRow[],
  settings: WireSettings,
  ctx: PassContext,
  fns?: ComputeFns
): ValuesOutcome;
export function runPlot(
  row: RowAnalysis,
  outcome: ValuesOutcome,
  view: ViewSpec,
  ctx: PassContext,
  fns?: ComputeFns
): void;
export function parseHelper(latex: string, analysis: AnalysisResult): ParseResult; // parseLatex(latex, { userFunctions: userFunctionNames(analysis.functions) })
export function runHelper(
  job: { jobId: number; latex: string },
  outcome: ValuesOutcome,
  ctx: PassContext
): void; // parses with parseHelper(job.latex, outcome.analysis); deadline: createWorkDeadline({ clock: ctx.clock, now: ctx.now, limitMs: ROW_VALUE_DEADLINE_MS, rowId: null })
```

- [ ] **Step 1: Write the failing tests.**
  - `fake(step)` is a clock: `now()` adds `step`, `set(t)` sets the time, `t` reads it.
  - `makeCtx(step)` gives `{ ctx, posts, transfers, clock }` with generation 1, where `clock`
    is `fake(step)` and `ctx.post(m, t = [])` pushes `m` to `posts: WorkerToMain[]` and `t` to
    `transfers: ArrayBuffer[][]`.
  - `src/lib/calculator-v2/worker/__fixtures__/messages.ts` exports `rows(...latex): WireRow[]`
    (ids `r0…`), `RAD: WireSettings = { angleMode: "radians", complex: false }` and
    `VIEW: ViewSpec` (the default 800×600 view, `dpr` 1).

```ts
it("AR-47 SliceClock asks to yield once 8 ms of continuous work have elapsed", () => {
  const c = fake(0),
    s = new SliceClock({ now: c.now, sliceMs: 8, heartbeatMs: 200 }, vi.fn());
  s.startSlice();
  c.set(7.9);
  expect(s.shouldYield()).toBe(false);
  c.set(8);
  expect(s.shouldYield()).toBe(true);
  s.startSlice();
  expect(s.shouldYield()).toBe(false);
});
it("AR-47 a long unit's deadline checks post a heartbeat at least every 200 ms", () => {
  const c = fake(5),
    at: number[] = [];
  const s = new SliceClock({ now: c.now, sliceMs: 8, heartbeatMs: 200 }, () => at.push(c.t));
  s.notePost();
  const d = createWorkDeadline({ clock: s, now: c.now, limitMs: null, rowId: "r" });
  for (let i = 0; i < 400; i++) d.check();
  expect(at.length).toBeGreaterThanOrEqual(9);
  expect(Math.max(...at.map((t, i) => t - (i ? at[i - 1] : 0)))).toBeLessThanOrEqual(200);
});
it("AR-48 a row value deadline throws DeadlineExceeded naming the row at 250 ms; plot deadlines never expire", () => {
  const c = fake(0),
    onExpire = vi.fn();
  const s = new SliceClock({ now: c.now, sliceMs: 8, heartbeatMs: 200 }, vi.fn());
  const d = createWorkDeadline({
    clock: s,
    now: c.now,
    limitMs: ROW_VALUE_DEADLINE_MS,
    rowId: "slow",
    onExpire,
  });
  c.set(249.9);
  expect(() => d.check()).not.toThrow();
  c.set(250);
  expect(() => d.check()).toThrow(DeadlineExceeded);
  expect(() => d.check()).toThrow(expect.objectContaining({ rowId: "slow" }));
  expect(onExpire.mock.calls).toEqual([["slow"]]);
  const p = createWorkDeadline({ clock: s, now: c.now, limitMs: null, rowId: "r" });
  c.set(1e9);
  expect(() => p.check()).not.toThrow();
});
it("AR-48 an expired row posts overrun and the other rows keep their values", () => {
  for (const mode of ["propagate", "swallow"] as const) {
    const { ctx, posts, clock } = makeCtx(0);
    const evaluateRows: ComputeFns["evaluateRows"] = (analysis, _s, deadlineFor) => {
      const out = new Map<string, Value>();
      for (const row of analysis.rows) {
        const d = deadlineFor(row.id);
        if (row.id === "r1") {
          clock.set(clock.t + 300);
          try {
            d.check();
          } catch (e) {
            if (mode === "propagate") throw e;
            out.set(row.id, UNDEFINED);
            continue;
          }
        }
        out.set(row.id, { type: "number", value: 1 });
      }
      return out;
    };
    const outcome = runValuesPass(rows("1", "2", "3"), RAD, ctx, {
      ...DEFAULT_COMPUTE,
      evaluateRows,
    });
    expect(
      posts.flatMap((m) =>
        m.type === "analysis" || m.type === "value" || m.type === "overrun"
          ? [`${m.type}:${m.rowId}`]
          : []
      )
    ).toEqual(["analysis:r0", "value:r0", "analysis:r1", "overrun:r1", "analysis:r2", "value:r2"]);
    expect(posts).toContainEqual({ v: 1, type: "begin", generation: 1, rowId: "r1" });
    expect([...outcome.overrun]).toEqual(["r1"]);
  }
});
it("AR-48 repeated deadlineFor calls for one row share one 250 ms deadline and one begin", () => {
  const { ctx, posts, clock } = makeCtx(0);
  const seen: Deadline[] = [];
  const evaluateRows: ComputeFns["evaluateRows"] = (analysis, _s, deadlineFor) => {
    const out = new Map<string, Value>();
    for (const row of analysis.rows) {
      const calls = row.id === "r0" ? 3 : 1; // r0: one check per row plus two user-function calls
      for (let i = 0; i < calls; i++) {
        const d = deadlineFor(row.id);
        if (row.id === "r0") {
          seen.push(d);
          clock.set(clock.t + 100);
        }
        d.check(); // r0: 100, 200, then 300 ms after its first call, which throws
      }
      out.set(row.id, { type: "number", value: 1 });
    }
    return out;
  };
  const outcome = runValuesPass(rows("1", "2"), RAD, ctx, { ...DEFAULT_COMPUTE, evaluateRows });
  expect(seen).toHaveLength(3);
  expect(new Set(seen).size).toBe(1);
  expect(posts.filter((m) => m.type === "begin" && m.rowId === "r0")).toHaveLength(1);
  expect([...outcome.overrun]).toEqual(["r0"]);
});
it("AR-48 a row over the 2,000-node cap gets its error before evaluation and never an overrun", () => {
  const { ctx, posts } = makeCtx(300); // every clock read advances 300 ms
  runValuesPass(rows("1+".repeat(1000) + "1"), RAD, ctx);
  expect(posts.find((m) => m.type === "analysis")).toMatchObject({
    analysis: { kind: "error", error: { code: "too-many-nodes" } },
  });
  expect(posts.find((m) => m.type === "value")).toMatchObject({ value: { type: "undefined" } });
  expect(posts.some((m) => m.type === "overrun")).toBe(false);
});
it("AR-48 a plot unit has no total limit and posts its geometry with transferables", () => {
  const { ctx, posts, transfers } = makeCtx(100); // every clock read advances 100 ms
  const outcome = runValuesPass(rows("x^{2}+y^{2}=25"), RAD, ctx);
  runPlot(outcome.analysis.rows[0], outcome, VIEW, ctx);
  expect(
    posts.flatMap((m) => (m.type === "begin" || m.type === "plot" ? [`${m.type}:${m.rowId}`] : []))
  ).toEqual(["begin:r0", "plot:r0"]);
  const i = posts.findIndex((m) => m.type === "plot");
  const plot = posts[i] as Extract<WorkerToMain, { type: "plot" }>;
  expect(transfers[i]).toEqual(geometryTransferables(plot.geometry));
  expect(posts.some((m) => m.type === "overrun")).toBe(false);
});
it("AR-54 a throwing plot posts a fault naming only the error type and the next row still plots", () => {
  const plotRow: ComputeFns["plotRow"] = (input, view, d) => {
    if (input.rowId === "r0") throw new TypeError("x^{2} broke");
    return DEFAULT_COMPUTE.plotRow(input, view, d);
  };
  const fns = { ...DEFAULT_COMPUTE, plotRow };
  const { ctx, posts } = makeCtx(0);
  const outcome = runValuesPass(rows("y=x^{2}", "y=x"), RAD, ctx, fns);
  for (const row of outcome.analysis.rows) runPlot(row, outcome, VIEW, ctx, fns);
  expect(posts).toContainEqual({ v: 1, type: "fault", generation: 1, message: "TypeError" });
  expect(posts.flatMap((m) => (m.type === "plot" ? [m.rowId] : []))).toEqual(["r1"]);
  expect(posts.flatMap((m) => (m.type === "fault" ? [m.message] : []))).toEqual(["TypeError"]);
});
it("AR-54 a throwing evaluateRows posts a fault and undefined values for every row", () => {
  const { ctx, posts } = makeCtx(0);
  const evaluateRows: ComputeFns["evaluateRows"] = () => {
    throw new RangeError("2+3 broke");
  };
  runValuesPass(rows("2+3", "4"), RAD, ctx, { ...DEFAULT_COMPUTE, evaluateRows });
  expect(posts.flatMap((m) => (m.type === "fault" ? [m.message] : []))).toEqual(["RangeError"]);
  expect(
    posts.flatMap((m) =>
      m.type === "analysis" || m.type === "value" ? [`${m.type}:${m.rowId}`] : []
    )
  ).toEqual(["analysis:r0", "value:r0", "analysis:r1", "value:r1"]);
  expect(posts.flatMap((m) => (m.type === "value" ? [m.value] : []))).toEqual([
    { type: "undefined" },
    { type: "undefined" },
  ]);
});
it("API-10 helper jobs evaluate against the row scope", () => {
  const { ctx, posts } = makeCtx(0);
  const outcome = runValuesPass(rows("a=4"), RAD, ctx);
  runHelper({ jobId: 7, latex: "a^{2}" }, outcome, ctx);
  runHelper({ jobId: 8, latex: "\\frac{" }, outcome, ctx);
  runHelper({ jobId: 9, latex: "y=x" }, outcome, ctx);
  expect(posts.filter((m) => m.type === "value" && m.jobId !== null)).toEqual([
    {
      v: 1,
      type: "value",
      generation: 1,
      rowId: null,
      jobId: 7,
      value: { type: "number", value: 16 },
    },
    { v: 1, type: "value", generation: 1, rowId: null, jobId: 8, value: { type: "undefined" } },
    { v: 1, type: "value", generation: 1, rowId: null, jobId: 9, value: { type: "undefined" } },
  ]);
});
it("API-10 after a=2x the helper a(x+1) is a product, as the row is, and f(2) still calls f (RC-6)", () => {
  const { ctx, posts } = makeCtx(0);
  const outcome = runValuesPass(rows("a=2x", "f(x)=x+1"), RAD, ctx);
  const tree = (latex: string) => {
    const r = parseHelper(latex, outcome.analysis);
    return r.ok && toSExpr(r.tree);
  };
  // the keys of analysis.functions hold "a" (a zero-parameter entry, 04 decision 2); userFunctionNames does not
  expect(tree("a(x+1)")).toBe("(mul (id a) (add (id x) (num 1)))");
  expect(tree("f(2)")).toBe("(call f (num 2))");
  runHelper({ jobId: 1, latex: "a(x+1)" }, outcome, ctx);
  runHelper({ jobId: 2, latex: "a\\cdot\\left(x+1\\right)" }, outcome, ctx);
  runHelper({ jobId: 3, latex: "f(2)" }, outcome, ctx);
  const helperValue = (jobId: number) =>
    posts.find((m) => m.type === "value" && m.jobId === jobId) as Extract<
      WorkerToMain,
      { type: "value" }
    >;
  expect(helperValue(1).value).toEqual(helperValue(2).value);
  expect(helperValue(3).value).toEqual({ type: "number", value: 3 });
});
```

- [ ] **Step 2: Run them and see them fail.**
      `n exec 22 npx vitest run src/lib/calculator-v2/worker/slice.test.ts src/lib/calculator-v2/worker/pass.test.ts`.
      Expected: FAIL, `Failed to resolve import "./slice"`.
- [ ] **Step 3: Implement `slice.ts` and `pass.ts`.** `runValuesPass` works like this:
  - It analyses the full row list and calls `evaluateRows` with a `deadlineFor` that is
    idempotent per row id within one evaluation round. On the first call for a row id it
    creates `createWorkDeadline({ clock, now, limitMs: ROW_VALUE_DEADLINE_MS, rowId, onExpire: add to overrun })`
    (the clock starts here), then posts `begin` for that row, caches the deadline and returns
    it. Every later call for that row id in the same round returns the cached deadline and
    posts nothing. Each round starts with an empty cache.
  - When `DeadlineExceeded` propagates, it adds `rowId` to the overrun set, removes the
    overrun rows, analyses and evaluates again, and repeats. Every round removes at least one
    row, so the loop ends. A `rowId` of `null`, or any other error, posts
    `fault { message: error.name }` and leaves every value `UNDEFINED`.
  - `analysis` messages always come from the full-list analysis, so the engine sees no false
    kind mismatch.
  - It returns the outcome of the final round, with `buildCompileScope`.
  - `runPlot` skips rows in `overrun` and posts nothing when `plotInputFor` returns `null`.
  - `runHelper` parses with `{ userFunctions: userFunctionNames(analysis.functions) }` (04,
    section 3), through `parseHelper`, never with the keys of `analysis.functions`: those keys
    include zero-parameter dependent definitions (04 decision 2), which would make the helper
    `a(x+1)` a call while the row `a(x+1)` is a product. It evaluates under the deadline in its
    signature comment. A failed parse, a `rel` tree or `DeadlineExceeded` gives `UNDEFINED`.
- [ ] **Step 4: Run them and see them pass.** Expected: PASS.
- [ ] **Step 5: Commit.** `git commit -m "Add executor slicing, deadlines and generation passes (AR-47, AR-48, AR-54, API-10)"`

### Task 6: Executor (AR-45, AR-46, AR-47)

**Files:** Create `src/lib/calculator-v2/worker/executor.ts`, `src/lib/calculator-v2/worker/yield.ts`;
Modify `src/lib/calculator-v2/worker/__fixtures__/messages.ts`; Test
`src/lib/calculator-v2/worker/executor.test.ts`.

**Interfaces:** Produces `ExecutorPort`, `ExecutorTiming`, `Executor` (section 7). The defaults
are `now: () => performance.now()`, `sliceMs: 8`, `heartbeatMs: 200` and `yieldToEventLoop`
from `messageChannelYield()` in
`yield.ts: export function messageChannelYield(): { yieldToEventLoop(): Promise<void>; close(): void }`.
Each `messageChannelYield()` call owns its own channel: it creates one `MessageChannel` on its
first `yieldToEventLoop()` call (never at module load) and calls `unref()` on both ports when
`unref` exists; `close()` closes both ports, and a yield still pending on them never resolves.
The `Executor` constructor calls `messageChannelYield()` only when `timing.yieldToEventLoop` is
not supplied, and receiving a `dispose` message calls its `close()`. The contract's `Executor`
has no `dispose()` method: `{ v: 1, type: "dispose" }` through `receive` is the only way to stop
it (Task 7's backends send it). Consumes Task 5 and `WORKER_MARKER`.

The fixture additions to `messages.ts` (Tasks 6, 7, 8 and 9 import them from there):

```ts
export function HELLO(seed: number): Extract<MainToWorker, { type: "hello" }>;
export function STATE(
  generation: number,
  ...latex: string[]
): Extract<MainToWorker, { type: "state" }>; // rows(...latex), RAD, sliders {}
export function VIEW_MSG(generation: number): Extract<MainToWorker, { type: "view" }>; // VIEW's viewport and size, dpr 1
export function macrotask(): Promise<void>; // resolves from a fresh MessageChannel's onmessage, then closes it; real even under vi.useFakeTimers
export function untilDone(
  messages: () => readonly WorkerToMain[],
  generation: number,
  options?: { advance?: (ms: number) => Promise<unknown> }
): Promise<void>;
// checks messages() for { type: "done", generation }; between checks it awaits options.advance(1)
// when given (for example vi.advanceTimersByTimeAsync), else macrotask(); rejects with
// Error("untilDone: no done for generation <g>") after 10,000 ms of performance.now() time
```

Which form each task uses: Task 6 records posts as `{ m, t }` and calls
`untilDone(() => posts.map((p) => p.m), g)`; Task 7 collects `got: WorkerToMain[]` from
`onMessage` and calls `untilDone(() => got, g)` with no `advance`, because after a fallback
nothing waits on a timer and `macrotask()` is not faked; Task 8 collects plain messages and
calls `untilDone(() => posts, g)`. Task 9's `settled()` polls with `macrotask()` the same way.

- [ ] **Step 1: Write the failing tests.**
  - Add the fixture functions above to `messages.ts`.
  - `beforeEach` resets `posts: { m: WorkerToMain; t: ArrayBuffer[] }[]`,
    `port = { post: (m, t) => posts.push({ m, t }) }` and `ex = new Executor(port)` (default
    timing); `msgs = () => posts.map((p) => p.m)`.
  - `manual()` returns timing with `now: () => 0` and `sliceMs: 0`, a `yieldToEventLoop` that
    parks resolvers, and `step()`, which releases one resolver and flushes microtasks (a no-op
    when nothing is parked).
  - `typedArraysOf(g)` lists every typed-array field of `g` and of its region boundaries.

```ts
it("AR-45 hello is answered by ready carrying the karman-compute-v1 marker (OI-29)", async () => {
  ex.receive(HELLO(3));
  ex.receive(STATE(1, "2+3"));
  await untilDone(msgs, 1);
  expect(posts[0].m).toEqual({ v: 1, type: "ready", worker: "karman-compute-v1" });
});
it("AR-45 every message is a versioned plain object that survives structuredClone", async () => {
  ex.receive(HELLO(3));
  ex.receive(
    STATE(1, "2+3", "y=x^{2}", "x^{2}+y^{2}=25", "1<y<3", "(2,3)", "x=3", "\\frac{", "a=2", "y=ax")
  );
  ex.receive(VIEW_MSG(2));
  ex.receive({ v: 1, type: "evaluate", jobId: 1, generation: 2, latex: "a+1" });
  await untilDone(msgs, 2);
  const types = new Set(posts.map((p) => p.m.type));
  types.delete("heartbeat");
  expect(types).toEqual(new Set(["ready", "begin", "analysis", "value", "plot", "done"]));
  for (const { m } of posts) {
    expect(m.v).toBe(1);
    expect(isWorkerMessage(m)).toBe(true);
    expect(structuredClone(m)).toEqual(m);
  }
});
it("AR-45 plot geometry travels in transferable Float64Array or Float32Array buffers", async () => {
  ex.receive(STATE(1, "y=x^{2}", "x=3", "(2,3)", "1<y<3"));
  ex.receive(VIEW_MSG(2));
  await untilDone(msgs, 2);
  const plots = posts.filter((p) => p.m.type === "plot");
  expect(plots).toHaveLength(4);
  for (const { m, t } of plots) {
    const g = (m as Extract<WorkerToMain, { type: "plot" }>).geometry;
    for (const a of typedArraysOf(g)) {
      expect(a instanceof Float64Array || a instanceof Float32Array).toBe(true);
      expect(a.buffer).toBeInstanceOf(ArrayBuffer); // a SharedArrayBuffer fails this
      expect(t).toContain(a.buffer);
    }
    expect(t).toEqual(geometryTransferables(g));
  }
});
it("AR-46 superseded work stops at the next yield and its generation never gets done", async () => {
  const t = manual();
  const ex = new Executor(port, t.timing);
  ex.receive(STATE(1, "x^{2}+y^{2}=25", "x^{2}+y^{2}=16", "x^{2}+y^{2}=9"));
  ex.receive(VIEW_MSG(2));
  while (!posts.some((p) => p.m.type === "plot")) await t.step();
  const mark = posts.length;
  ex.receive(STATE(3, "y=x"));
  while (!posts.some((p) => p.m.type === "done" && p.m.generation === 3)) await t.step();
  expect(posts.slice(mark).some((p) => "generation" in p.m && p.m.generation === 2)).toBe(false);
  expect(posts.some((p) => p.m.type === "done" && p.m.generation === 2)).toBe(false);
});
it("AR-46 a view-only generation reuses the values, posts only begin, plot and done, and runs each helper job once", async () => {
  ex.receive(STATE(1, "y=x", "a=2"));
  ex.receive({ v: 1, type: "evaluate", jobId: 1, generation: 1, latex: "a+1" });
  ex.receive(VIEW_MSG(2));
  await untilDone(msgs, 2);
  expect(msgs().filter((m) => m.type === "value" && m.jobId === 1)).toHaveLength(1);
  const mark = posts.length;
  ex.receive(VIEW_MSG(3));
  await untilDone(msgs, 3);
  const later = msgs()
    .slice(mark)
    .filter((m) => m.type !== "heartbeat");
  expect(new Set(later.map((m) => m.type))).toEqual(new Set(["begin", "plot", "done"]));
  expect(later.every((m) => "generation" in m && m.generation === 3)).toBe(true);
  expect(later.some((m) => m.type === "value")).toBe(false); // the helper job is not re-run
});
it("AR-47 the executor yields after a unit once the slice is spent", async () => {
  const countYields = async (sliceMs: number) => {
    let yields = 0;
    const local: WorkerToMain[] = [];
    const e = new Executor(
      { post: (m) => local.push(m) },
      {
        sliceMs,
        yieldToEventLoop: async () => {
          yields++;
          await macrotask();
        },
      }
    );
    e.receive(STATE(1, "y=x", "y=x^{2}", "x^{2}+y^{2}=25"));
    e.receive(VIEW_MSG(2));
    await untilDone(() => local, 2);
    return yields;
  };
  expect(await countYields(0)).toBe(5); // the loop's first yield, then one after each unit: 1 values pass + 3 plots; idle after done
  expect(await countYields(Infinity)).toBe(1);
});
it("AR-45 a dispose message during a run stops the executor: nothing more is posted and its yield channel is closed", async () => {
  const t = manual();
  const ex = new Executor(port, t.timing);
  ex.receive(STATE(1, "x^{2}+y^{2}=25", "x^{2}+y^{2}=16"));
  ex.receive(VIEW_MSG(2));
  while (!posts.some((p) => p.m.type === "plot")) await t.step(); // parked at the yield after the first plot
  const mark = posts.length;
  ex.receive({ v: 1, type: "dispose" });
  ex.receive(STATE(3, "y=x")); // ignored after dispose
  for (let i = 0; i < 10; i++) await t.step();
  expect(posts).toHaveLength(mark);
  // default timing: the executor owns its MessageChannel and dispose closes both ports
  const Real = globalThis.MessageChannel;
  const made: MessageChannel[] = [];
  vi.stubGlobal(
    "MessageChannel",
    class extends Real {
      constructor() {
        super();
        made.push(this);
      }
    }
  );
  const d = new Executor(port);
  d.receive(STATE(4, "2+3")); // the loop's first yieldToEventLoop() creates the channel synchronously
  vi.unstubAllGlobals();
  const closes = [vi.spyOn(made[0].port1, "close"), vi.spyOn(made[0].port2, "close")];
  d.receive({ v: 1, type: "dispose" });
  expect(closes.map((c) => c.mock.calls.length)).toEqual([1, 1]);
  await macrotask();
  expect(posts).toHaveLength(mark);
});
it("AR-47 posted messages are never more than 200 ms apart during a long job", async () => {
  let clock = 0;
  const at: number[] = [],
    local: WorkerToMain[] = [];
  const e = new Executor(
    {
      post: (m) => {
        local.push(m);
        at.push(clock); // records the time without reading now()
      },
    },
    { now: () => (clock += 1) } // every clock read advances 1 ms
  );
  e.receive(
    STATE(1, "x^{2}+y^{2}=25", "x^{2}+y^{2}=16", "x^{2}+y^{2}=9", "xy=6", "xy=-6", "x^{2}-y^{2}=4")
  );
  e.receive(VIEW_MSG(2));
  await untilDone(() => local, 2);
  expect(Math.max(...at.slice(1).map((t, i) => t - at[i]))).toBeLessThanOrEqual(200);
});
it("AR-47 the default yield is a MessageChannel macrotask", async () => {
  const Real = globalThis.MessageChannel;
  let made = 0;
  vi.stubGlobal(
    "MessageChannel",
    class extends Real {
      constructor() {
        super();
        made++;
      }
    }
  );
  const e = new Executor(port); // default timing
  e.receive(STATE(1, "2+3")); // the loop's first yieldToEventLoop() runs synchronously and creates the channel
  vi.unstubAllGlobals();
  expect(made).toBe(1);
  await untilDone(msgs, 1);
  expect(msgs().at(-1)).toEqual({ v: 1, type: "done", generation: 1 });
});
```

- [ ] **Step 2: Run them and see them fail.** `n exec 22 npx vitest run src/lib/calculator-v2/worker/executor.test.ts`.
      Expected: FAIL, `Failed to resolve import "./executor"`.
- [ ] **Step 3: Implement the run loop in `executor.ts`.** `receive` never posts and never runs
      work synchronously: it records `hello`, the latest `state` and `view`, evaluate jobs and
      the latest generation, then starts the loop if it is idle (the loop's first statement,
      `yieldToEventLoop()`, is called synchronously). Job lifecycle: an `evaluate` whose
      generation is lower than the latest `state`'s is dropped on receipt; a `state` drops
      every queued job with a lower generation; each job runs once and is removed from the
      queue after its value is posted. Each loop iteration:

```text
await yieldToEventLoop(); if disposed: return; startSlice(); gen = latestGeneration
if pending ready: post ready
if valuesFor !== latestState: outcome = runValuesPass(...); valuesFor = latestState     -- unit
while jobs is not empty: job = jobs.shift(); runHelper(job, outcome)                   -- unit each
if latestView and plottedFor !== gen:
  for each outcome row (list order) with isGraphable: runPlot                          -- unit each
  plottedFor = gen
if a state has been received and doneFor !== gen: post done(gen); doneFor = gen
if gen === latestGeneration and jobs is empty: become idle and return                  -- no further yield
after every unit: if gen !== latestGeneration -> restart; if shouldYield(): pulse(); await yield; if disposed: return; startSlice(); if gen !== latestGeneration -> restart
```

- **Idle.** After posting `done(gen)`, when `gen` is still the latest generation and no job is
  queued, the loop returns and makes no further `yieldToEventLoop()` call; the next `receive`
  starts it again with its first yield. The yield counts of the AR-47 test above (5 and 1) and
  of Task 7's AR-50 slice test (5 and 3) count exactly these yields. An iteration that only
  runs helper jobs queued after `done` (same generation) posts just their values: no second
  `plot` pass and no second `done` for that generation.
- **Dispose.** `receive({ v: 1, type: "dispose" })` sets `disposed`, empties the job queue,
  forgets the pending `ready` and calls the owned channel's `close()`. The loop checks
  `disposed` after every `await` and returns without posting; every later `receive` is ignored.
- Every post goes through one function that also calls `clock.notePost()`.

- [ ] **Step 4: Run them and see them pass.** Expected: PASS.
- [ ] **Step 5: Commit.** `git commit -m "Add the calculator v2 executor (AR-45, AR-46, AR-47)"`
