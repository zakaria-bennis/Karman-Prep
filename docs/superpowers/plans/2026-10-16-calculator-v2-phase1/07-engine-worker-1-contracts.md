# 07 engine-worker, part 1 of 7: API types and validators, worker protocol and plot inputs (Tasks 1 to 3)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

Part 1 of package `07-engine-worker.md`, which holds the package header (IDs, contributions,
open items, Commands), the Decisions and the Notes for the lead; they apply to every task here,
and "Decision N" and "Notes for the lead" below refer to that file. Tasks run in number order
across the seven parts; each part starts where the previous one ends. Contracts:
`01-interfaces.md` sections 0 to 5, `01-interfaces-runtime.md` sections 7 and 8 and
`01-interfaces-integration.md` section 16; every name below is theirs.

---

### Task 1: API types, errors and validators (API-1, API-7, API-13)

**Files:** Create `src/lib/calculator-v2/core/api/types.ts`,
`src/lib/calculator-v2/core/api/errors.ts`, `src/lib/calculator-v2/core/api/validate.ts`; Test
`src/lib/calculator-v2/core/api/validate.test.ts`.

**Interfaces:**

- Consumes: `Viewport` (06, `plot/viewport.ts`); `MAX_ROW_CHARACTERS` (02, `core/latex`).
- Produces: `types.ts` and `errors.ts` exactly as in `01-interfaces-runtime.md` section 8
  (`DEFAULT_SETTINGS` deep-frozen). The package-internal `validate.ts`:

```ts
export const SETTINGS_KEYS: readonly (keyof CalculatorSettings)[]; // the 17 API-7 keys, in API-7 order
export function validateOptions(options: unknown): CalculatorOptions; // undefined -> {}
export function validateExpressionState(state: unknown): ExpressionState; // colours lower-cased
export function validateSettingsUpdate(partial: unknown): SettingsUpdate;
export function validateSettings(settings: unknown): CalculatorSettings; // all 17 keys required
export function validateBounds(bounds: unknown): Viewport; // finite, left < right, bottom < top; G-23 is clamped later (Decision 11)
export function validateRowRefs(list: unknown): { id: string }[];
```

- [ ] **Step 1: Write the failing tests.**

```ts
const code = (f: () => unknown) => {
  try {
    f();
    return "none";
  } catch (e) {
    return e instanceof KarmanCalculatorError ? e.code : "other";
  }
};
it("API-1 options validate with their defaults and the Phase 1 rules", () => {
  expect(v.validateOptions(undefined)).toEqual({});
  expect(v.validateOptions({ angleMode: "degrees", seed: 7, keypad: true })).toEqual({
    angleMode: "degrees",
    seed: 7,
    keypad: true,
  });
  for (const o of [{ mode: "scientific" }, { displaySize: "large" }, { reverseContrast: true }])
    expect(code(() => v.validateOptions(o))).toBe("unsupported");
  for (const o of [
    null,
    3,
    { angleMode: "gradians" },
    { keypad: "yes" },
    { seed: Number.NaN },
    { onError: 1 },
    { transferTarget: "x" },
    { mode: "3d" },
  ])
    expect(code(() => v.validateOptions(o))).toBe("invalid-argument");
});
it("API-7 updateSettings accepts only the listed keys and the Phase 1 values", () => {
  expect(v.SETTINGS_KEYS).toEqual([
    "angleMode",
    "complex",
    "showGrid",
    "polarGrid",
    "minorGridlines",
    "arrows",
    "axisNumbers",
    "xAxis",
    "yAxis",
    "lockViewport",
    "piAxisLabels",
    "displaySize",
    "reverseContrast",
    "keypad",
    "expressionsCollapsed",
    "mode",
    "reducedMotion",
  ]);
  expect(Object.keys(DEFAULT_SETTINGS).sort()).toEqual([...v.SETTINGS_KEYS].sort());
  expect(
    v.validateSettingsUpdate({ angleMode: "degrees", xAxis: { show: false, label: "t", step: 2 } })
  ).toEqual({ angleMode: "degrees", xAxis: { show: false, label: "t", step: 2 } });
  for (const [k, val] of [
    ["lockViewport", true],
    ["piAxisLabels", true],
    ["displaySize", "large"],
    ["reverseContrast", true],
    ["mode", "scientific"],
  ] as const)
    expect(code(() => v.validateSettingsUpdate({ [k]: val }))).toBe("unsupported");
  for (const bad of [
    { zoom: 2 },
    { showGrid: 1 },
    { xAxis: { show: true } },
    { yAxis: { show: true, label: "", step: 0 } },
    { mode: "polar" },
    null,
  ])
    expect(code(() => v.validateSettingsUpdate(bad))).toBe("invalid-argument");
});
it("API-7 bounds need finite left < right and bottom < top", () => {
  expect(v.validateBounds({ left: -1, right: 1, bottom: -2, top: 2 })).toEqual({
    left: -1,
    right: 1,
    bottom: -2,
    top: 2,
  });
  // finite and ordered but outside G-23: valid here; Task 10's setMathBounds clamps it
  expect(v.validateBounds({ left: -1e16, right: 0, bottom: 0, top: 1 })).toEqual({
    left: -1e16,
    right: 0,
    bottom: 0,
    top: 1,
  });
  for (const b of [
    { left: 1, right: 1, bottom: 0, top: 1 },
    { left: 0, right: 1, bottom: 2, top: 1 },
    { left: Number.NaN, right: 1, bottom: 0, top: 1 },
    { left: 0, right: Number.POSITIVE_INFINITY, bottom: 0, top: 1 },
    { left: 0, right: 1, bottom: 0 },
    { left: 0, right: 1, bottom: 0, top: 1, extra: 1 },
    null,
  ])
    expect(code(() => v.validateBounds(b))).toBe("invalid-argument");
});
it("API-13 malformed expression states throw invalid-argument", () => {
  expect(v.validateExpressionState({ id: "a", color: "#A0b1C2" })).toEqual({
    id: "a",
    color: "#a0b1c2",
  });
  for (const s of [
    { id: "" },
    { id: 3 },
    { id: "a", latex: 5 },
    { id: "a", color: "red" },
    { id: "a", color: "c7" },
    { id: "a", hidden: "no" },
    { id: "a", lineStyle: "wavy" },
    { id: "a", columns: [] },
    { id: "a", extra: 1 },
    { id: "a", latex: "1".repeat(2049) },
  ])
    expect(code(() => v.validateExpressionState(s))).toBe("invalid-argument");
  expect(new KarmanCalculatorError("destroyed", "x")).toMatchObject({
    name: "KarmanCalculatorError",
    code: "destroyed",
    message: "x",
  });
});
```

- [ ] **Step 2: Run them and see them fail.**
      `n exec 22 npx vitest run src/lib/calculator-v2/core/api/validate.test.ts`. Expected: FAIL,
      `Failed to resolve import "./errors"`.
- [ ] **Step 3: Implement the three files.**
  - Messages name the method and the field, for example
    `"setExpression: latex is longer than 2048 characters"`.
  - `type` `"table"`, `"note"`, `"folder"`, `"image"` and `"text"` throw `unsupported`; any other
    type except `"expression"` throws `invalid-argument`.
  - An axis `step` is `null` or a finite number greater than 0.
  - `validateBounds` checks only the object shape (exactly `left`, `right`, `bottom`, `top`),
    finiteness and order (Decision 11).
- [ ] **Step 4: Run them and see them pass.** Same command. Expected: PASS.
- [ ] **Step 5: Commit.** `git add src/lib/calculator-v2/core/api && git commit -m "Add calculator v2 API types, errors and validators (API-1, API-7, API-13)"`

### Task 2: Worker protocol (AR-45)

**Files:** Create `src/lib/calculator-v2/worker/protocol.ts`; Test
`src/lib/calculator-v2/worker/protocol.test.ts`.

**Interfaces:** Produces section 7's `protocol.ts` exactly, plus the package-internal
`isMainMessage(data: unknown): data is MainToWorker`. Consumes `RowKind` (02), `RowError` (04),
`Value` (04), `Geometry`, `Viewport`, `PixelSize` (06).

- [ ] **Step 1: Write the failing tests.**

```ts
it("AR-45 the protocol is version 1 and ready carries the karman-compute-v1 marker (OI-29)", () => {
  expect(PROTOCOL_VERSION).toBe(1);
  expect(WORKER_MARKER).toBe("karman-compute-v1");
});
it("AR-45 isWorkerMessage accepts every versioned WorkerToMain shape and rejects others", () => {
  const ok: WorkerToMain[] = [
    { v: 1, type: "ready", worker: WORKER_MARKER },
    { v: 1, type: "begin", generation: 1, rowId: "1" },
    {
      v: 1,
      type: "analysis",
      generation: 1,
      rowId: "1",
      analysis: { kind: "value", error: null, isGraphable: false },
    },
    { v: 1, type: "value", generation: 1, rowId: null, jobId: 4, value: { type: "undefined" } },
    {
      v: 1,
      type: "plot",
      generation: 2,
      rowId: "1",
      geometry: { kind: "points", rowId: "1", evaluations: 0, coords: new Float64Array([2, 3]) },
    },
    { v: 1, type: "regression", generation: 2, rowId: "1" },
    { v: 1, type: "poi", generation: 2, rowId: "1" },
    { v: 1, type: "overrun", generation: 2, rowId: "1" },
    { v: 1, type: "heartbeat", generation: 2 },
    { v: 1, type: "done", generation: 2 },
    { v: 1, type: "fault", generation: null, message: "TypeError" },
  ];
  for (const m of ok) expect(isWorkerMessage(m)).toBe(true);
  for (const bad of [
    null,
    "ready",
    { type: "ready", worker: WORKER_MARKER },
    { v: 2, type: "done", generation: 1 },
    { v: 1, type: "ready", worker: "other" },
    { v: 1, type: "plot", generation: 1, rowId: "1" },
    {
      v: 1,
      type: "value",
      generation: "1",
      rowId: "1",
      jobId: null,
      value: { type: "number", value: 1 },
    },
    { v: 1, type: "explode" },
  ])
    expect(isWorkerMessage(bad)).toBe(false);
});
it("AR-45 isMainMessage accepts hello, state, view, evaluate and dispose only", () => {
  const state: Extract<MainToWorker, { type: "state" }> = {
    v: 1,
    type: "state",
    generation: 1,
    rows: [
      {
        id: "1",
        type: "expression",
        latex: "y=x",
        columns: null,
        hidden: false,
        sliderBounds: null,
      },
    ],
    settings: { angleMode: "radians", complex: false },
    sliders: {},
  };
  const view: Extract<MainToWorker, { type: "view" }> = {
    v: 1,
    type: "view",
    generation: 2,
    viewport: { left: -10, right: 10, bottom: -7.5, top: 7.5 },
    size: { width: 800, height: 600 },
    dpr: 1,
  };
  const ok: MainToWorker[] = [
    { v: 1, type: "hello", seed: 3 },
    state,
    view,
    { v: 1, type: "evaluate", jobId: 1, generation: 2, latex: "a+1" },
    { v: 1, type: "dispose" },
  ];
  for (const m of ok) expect(isMainMessage(m)).toBe(true);
  const omit = (o: object, key: string) =>
    Object.fromEntries(Object.entries(o).filter(([k]) => k !== key));
  for (const bad of [
    null,
    { ...state, v: 2 },
    omit(state, "generation"),
    omit(view, "generation"),
    { v: 1, type: "evaluate", jobId: 1, latex: "a+1" },
    { ...state, rows: "y=x" },
    { v: 1, type: "plot", generation: 1, rowId: "1" },
  ])
    expect(isMainMessage(bad)).toBe(false);
});
```

- [ ] **Step 2: Run them and see them fail.** `n exec 22 npx vitest run src/lib/calculator-v2/worker/protocol.test.ts`.
      Expected: FAIL, `Failed to resolve import "./protocol"`.
- [ ] **Step 3: Implement `protocol.ts`.** The guards check `v === 1`, a known `type`, and each
      field's `typeof` for that type: `generation` must be a number (or `null` on `fault`), and
      `geometry` and `value` must be objects with a string `kind` or `type`.
- [ ] **Step 4: Run them and see them pass.** Expected: PASS.
- [ ] **Step 5: Commit.** `git commit -m "Add the calculator v2 worker protocol (AR-45, OI-29 marker)"` (stage both files).

### Task 3: Plot inputs from analysis (NM-16, AR-44)

**Files:** Create `src/lib/calculator-v2/plot/from-analysis.ts`; Test
`src/lib/calculator-v2/plot/from-analysis.test.ts`.

**Interfaces:**

- Consumes: `Node` (02, `core/latex/ast.ts`); `analyzeRows`, `RowAnalysis`, `AnalysisResult`
  (04); `compileExpression`, `compileRealFunction1`, `compileRealFunction2`, `evaluateRows`,
  `CompileScope`, `EvalSettings`, `Value` (04); `PlotInput`, `plotRow`, `defaultViewport`,
  `ViewSpec`, `CurveGeometry`, `LineSetGeometry` (06); `NO_DEADLINE` (02).
- Produces both `01-interfaces.md` section 5 signatures of `plot/from-analysis.ts`:
  `plotInputFor(row: RowAnalysis, scope: CompileScope, value: Value | null): PlotInput | null`
  and
  `buildCompileScope(analysis: AnalysisResult, values: ReadonlyMap<string, Value>, settings: EvalSettings): CompileScope`.
  `values` (the argument) is `evaluateRows`' map keyed by row id. The scope's `functions` is
  `analysis.functions` (which holds dependent definitions as zero-parameter entries, 04
  decision 2), and the scope's `values` maps `row.defines.name` to `values.get(row.id)` for
  exactly the rows with
  `row.kind === "definition" && row.defines?.type === "value" && values.has(row.id)`. A
  dependent definition (`a=2x`, kind `"dependent-definition"`) never gets a `values` entry, so
  it cannot shadow its function entry (RC-6).

- [ ] **Step 1: Write the failing tests.**
  - `run(rows, settings = RAD, options?: { hidden?: boolean })` analyses rows `r0…` (the last
    one hidden when `options.hidden`), evaluates them with `() => NO_DEADLINE` and returns
    `input(i = last)` and `plot(i = last)`, which calls `plotRow(input, VIEW, NO_DEADLINE)`.
    `RAD` is `{ angleMode: "radians", complex: false }`.
  - `VIEW` is `defaultViewport({ width: 800, height: 600 })` at 800×600 with `dpr` 1, so 40 px
    per unit on both axes.
  - `distPx(g, x, y)` is the smallest pixel distance from (x, y) to any segment of `g.polylines`;
    `NaN` pairs end a run. `vertices(g)` lists the finite (x, y) pairs of `g.polylines`.

```ts
it("NM-16 y=x^{1/3} and y=x^{2/3} are sampled through x = -4", () => {
  for (const [latex, f] of [
    ["y=x^{1/3}", Math.cbrt],
    ["y=x^{2/3}", (x: number) => Math.cbrt(x * x)],
  ] as const)
    expect(distPx(run([latex]).plot() as CurveGeometry, -4, f(-4))).toBeLessThanOrEqual(0.5);
});
it("NM-16 y=x^{2/3} matches y=\\sqrt[3]{x^{2}} within 0.5 px for x < 0", () => {
  const a = run(["y=x^{2/3}"]).plot() as CurveGeometry,
    b = run(["y=\\sqrt[3]{x^{2}}"]).plot() as CurveGeometry;
  for (const [p, q] of [
    [a, b],
    [b, a],
  ])
    for (const [x, y] of vertices(p)) if (x < 0) expect(distPx(q, x, y)).toBeLessThanOrEqual(0.5);
});
it.each([
  [
    "y=2x+3",
    "explicit",
    [
      [0, 3],
      [1, 5],
    ],
  ],
  [
    "y-1=2(x+3)",
    null,
    [
      [0, 7],
      [-3, 1],
    ],
  ],
  [
    "2x+3y=6",
    null,
    [
      [0, 2],
      [3, 0],
    ],
  ],
  [
    "x=y^{2}",
    "explicit",
    [
      [4, 2],
      [4, -2],
      [0, 0],
    ],
  ],
  [
    "x^{2}+y^{2}=25",
    "implicit",
    [
      [3, 4],
      [-5, 0],
    ],
  ],
] as const)("AR-44 plotInputFor graphs %s through compiled closures", (latex, kind, points) => {
  const p = run([latex]);
  if (kind) expect(p.input()!.kind).toBe(kind);
  for (const [x, y] of points)
    expect(distPx(p.plot() as CurveGeometry, x, y)).toBeLessThanOrEqual(0.5);
});
it("AR-44 plotInputFor maps x^{2}=4 and y^{2}=9 to lines at their roots", () => {
  for (const [latex, orientation, roots] of [
    ["x^{2}=4", "vertical", [-2, 2]],
    ["y^{2}=9", "horizontal", [-3, 3]],
  ] as const) {
    expect(run([latex]).input()).toMatchObject({ kind: "lines", orientation });
    const g = run([latex]).plot() as LineSetGeometry;
    expect(g.orientation).toBe(orientation);
    const positions = [...g.positions].sort((a, b) => a - b);
    expect(positions).toHaveLength(2);
    positions.forEach((p, i) => expect(Math.abs(p - roots[i])).toBeLessThanOrEqual(0.0125));
  }
});
it("AR-44 plotInputFor graphs y=a after the dependent definition a=2x (RC-6)", () => {
  const p = run(["a=2x", "y=a"]);
  expect(p.input()!.kind).toBe("explicit");
  expect(distPx(p.plot() as CurveGeometry, 1, 2)).toBeLessThanOrEqual(0.5);
});
it("AR-44 plotInputFor graphs the function-definition row f(x)=x^{2} itself (RC-5)", () => {
  const p = run(["f(x)=x^{2}"]);
  expect(p.input()!.kind).toBe("explicit");
  expect(distPx(p.plot() as CurveGeometry, 2, 4)).toBeLessThanOrEqual(0.5);
});
it("AR-44 buildCompileScope puts constant definitions in values and dependent definitions only in functions", () => {
  const analysis = analyzeRows(
    [
      { id: "r0", latex: "a=2x", hidden: false },
      { id: "r1", latex: "b=3", hidden: false },
    ],
    RAD
  );
  const scope = buildCompileScope(
    analysis,
    evaluateRows(analysis, RAD, () => NO_DEADLINE),
    RAD
  );
  expect([...scope.values.entries()]).toEqual([["b", { type: "number", value: 3 }]]);
  expect(scope.functions.has("a")).toBe(true);
});
it("AR-44 plotInputFor maps inequalities to regions and evaluates 3>2 once", () => {
  const a = run(["1<y<3"]).input()!;
  expect(a.kind === "region" && [a.ops, a.terms.map((t) => t(0, 2))]).toEqual([
    ["<", "<"],
    [1, 2, 3],
  ]);
  const b = run(["y\\le2x+1"]).input()!;
  expect(b.kind === "region" && [b.ops, b.terms.map((t) => t(1, 0))]).toEqual([["<="], [0, 3]]);
  expect(run(["3>2"]).input()).toMatchObject({ kind: "constant-region", holds: true });
  expect(run(["3<2"]).input()).toMatchObject({ kind: "constant-region", holds: false });
});
it("AR-44 plotInputFor plots (2,3) and returns null for undefined points, hidden, error and non-graphing rows", () => {
  expect(run(["(2,3)"]).input()).toEqual({ rowId: "r0", kind: "points", points: [[2, 3]] });
  for (const latex of ["(\\frac{1}{0},2)", "\\frac{", "2+3", "a=2"])
    expect(run([latex]).input()).toBeNull();
  expect(run(["y=x"], RAD, { hidden: true }).input()).toBeNull();
});
```

- [ ] **Step 2: Run them and see them fail.** `n exec 22 npx vitest run src/lib/calculator-v2/plot/from-analysis.test.ts`.
      Expected: FAIL, `Failed to resolve import "./from-analysis"`.
- [ ] **Step 3: Implement `from-analysis.ts`** with the per-kind mapping of section 5.
      `constant-region` follows `01-interfaces.md` section 4 (04 decision 6) and re-implements
      neither the chain comparison nor the NM-22 non-real rule. It builds one relation node from
      the row's graph,
      `const rel: Node = { kind: "rel", ops: row.graph.ops, operands: row.graph.operands, span: row.tree?.span ?? { start: 0, end: 0 } }`,
      compiles it once with `compileExpression(rel, scope)` and evaluates it once with
      `({}, NO_DEADLINE)`. `holds` is true exactly when the result equals
      `{ type: "number", value: 1 }`; `compileExpression` gives that `n(1)` only when every link
      holds between real operands, and `UNDEFINED` otherwise, so a non-real or undefined operand
      gives `holds: false` (NM-22).
- [ ] **Step 4: Run them and see them pass.** Expected: PASS.
- [ ] **Step 5: Commit.** `git commit -m "Map row analyses to plot inputs (NM-16, AR-44)"`
