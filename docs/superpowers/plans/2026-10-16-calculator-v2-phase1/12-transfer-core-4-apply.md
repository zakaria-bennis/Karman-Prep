# 12 transfer-core, part 4 of 5: apply step and apply-time names (Tasks 9 and 10)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

Part 4 of 5 of package `12-transfer-core.md`, which holds the package header, Conventions
(test helpers `REAL`, `stem`, `N`, `verdicts`, `rowsOf`, `P`, `seeded`, `latexOf`, `analysed`),
Decisions, Deliberate deviations, Preconditions and the ID coverage; they apply to every task
here. Tasks run in number order across the five parts. `ct/` is `src/lib/calculator-transfer/`,
`tr/` is `src/components/calculator-v2/transfer/` and `cases/` is `src/lib/calculator-v2/core/corpus/cases/`.

---

### Task 9: Apply step: validation, core check and insertion (AR-16, TR-26, TR-27, TR-32, TR-38, TR-71, TR-73; OI-22)

**Files:** Create `tr/apply.ts`, `tr/plan.ts`; Test `tr/apply.test.ts`, `tr/apply.component.test.tsx`; Modify `docs/superpowers/specs/calculator-v2/c-transfer.md` (OI-22).

**Interfaces:**

- Precondition: P4 (freed row ids) confirmed by the lead with 07 and 09.
- Consumes:
  - Task 1: `TransferPayload`, `TransferTrigger`, `TransferResult`, `TRANSFER_MESSAGES` (section 14).
  - 07, `core/api/engine.ts` (`01-interfaces-runtime.md` section 8): `class CalculatorEngine` with
    `getExpressions(): ExpressionState[]`, `setExpressions(list: ExpressionState[]): void`,
    `updateSettings(partial: SettingsUpdate): void`, `focusExpression(id: string): void`,
    `activateExpression(id: string): void`, `readonly settings: CalculatorSettings`; tests also call
    `getState(): CalculatorStateV1`, `undo(): void`, `redo(): void`, `clearHistory(): void`,
    `canUndo(): boolean`, `removeExpression(ref: { id: string }): void`. `ExpressionState` (`{ id: string; type?: "expression" | "table"; latex?: string; color?: string; hidden?: boolean; … }`).
  - 04, `core/analysis/index.ts`: `analyzeRows(rows: readonly RowSource[], settings: AnalysisSettings): AnalysisResult`;
    `AnalysisSettings` (`{ angleMode: "radians" | "degrees"; complex: boolean }`); `RowAnalysis`
    (`kind: RowKind`, `error: RowError | null`, `chips: string[]`, `graph: RowGraph | null`, …); `RowKind` (01 section 2).
  - 02, `core/latex/index.ts`: `parseLatex(input: string, options?: ParseOptions): ParseResult`;
    `printLatex(tree: Node): string`; `functionDefinitionHead(input: string): { name: string; params: string[] } | null`;
    `MAX_ROWS = 100`; `MAX_ROW_CHARACTERS = 2048`.
  - Task 6: `plainMath(latex: string): string`; Tasks 6 and 7: `classifyStem(stem: StemInput): ReadonlyMap<number, TransferItem>` (tests).
  - Tests: 07's `createTestEngine(options?: CalculatorOptions, config?: { backend?: "fake" | "main-thread"; randomSeeds?: number[] }): TestEngine`
    (`core/api/__fixtures__/test-engine.ts`, `TestEngine.engine: CalculatorEngine`); 09's
    `renderEditor(ui: React.ReactNode, options?: { rows?: string[]; skin?: SkinId; durationMs?: number }): EditorKit`
    (`EditorKit.engine: CalculatorEngine`) and `panelProps(overrides?: Partial<ExpressionPanelProps>): ExpressionPanelProps`
    (`ui/list/__fixtures__/render-editor.tsx`); 09's `ExpressionPanel(props: ExpressionPanelProps): JSX.Element`.
- Produces: section 14's `TransferTarget`, `transferPayloadSchema: z.ZodType<TransferPayload>` and
  `applyTransfer(target: TransferTarget, payload: unknown, trigger: TransferTrigger): Extract<TransferResult, { status: "added" | "renamed" | "already-present" | "rejected" }>`
  exactly, and:

```ts
// tr/plan.ts
export interface PlanInput {
  existing: readonly ExpressionState[];
  payload: TransferPayload;
  settings: AnalysisSettings;
}
export type TransferPlan =
  | { status: "rejected" }
  | { status: "already-present"; focusRowId: string; row: number } // row: 1-based position
  | {
      status: "added" | "renamed";
      writes: { id: string; latex: string }[];
      focusRowId: string;
      rename: { from: string; to: string } | null;
    };
export function planTransfer(input: PlanInput): TransferPlan;
```

- [ ] **Step 1: Apply OI-22 to `c-transfer.md`.** In TR-32 replace `A transfer appends its rows at the end of the expression list` with `A transfer writes its first row into the last row of the expression list when that row is empty (as after a reset, R-10) and appends the rest after it`. Run `n exec 22 npx prettier --write docs/superpowers/specs/calculator-v2/c-transfer.md`; `grep -c "writes its first row into the last row" docs/superpowers/specs/calculator-v2/c-transfer.md` prints 1.
- [ ] **Step 2: Write the failing tests.** `apply.test.ts` (node):

```ts
const REJECTED = {
  status: "rejected",
  message: "This can't be added to the calculator.",
  focusRowId: null,
};
it("AR-16 transferPayloadSchema accepts the AR-16 shape and refuses anything else", () => {
  expect(transferPayloadSchema.safeParse(P(["y=x"])).success).toBe(true);
  expect(
    transferPayloadSchema.safeParse({
      ...P([]),
      format: "table",
      rows: undefined,
      table: { headers: ["x", null], columns: [["1"], ["2"]] },
    }).success
  ).toBe(true);
  const noDependencies = {
    version: 1,
    questionKey: "a1:q1",
    sourceId: "stem:1",
    description: "d",
    format: "rows",
    rows: ["y=x"],
  };
  for (const bad of [
    null,
    "y=x",
    noDependencies,
    { ...P(["y=x"]), version: 2 },
    { ...P(["y=x"]), extra: 1 },
    { ...P(["y=x"]), rows: [1] },
    { ...P(["y=x"]), format: "graph" },
    { ...P(["y=x"]), questionKey: 3 },
  ])
    expect(transferPayloadSchema.safeParse(bad).success, JSON.stringify(bad)).toBe(false);
  expect(readFileSync("src/components/calculator-v2/transfer/apply.ts", "utf8")).toMatch(
    /import \{ z \} from "zod";/
  );
});
it("AR-16 an invalid payload changes nothing and is rejected with the table 11.1 message", () => {
  const e = seeded(["y=x"]);
  e.updateSettings({ expressionsCollapsed: true });
  const before = [e.getExpressions(), e.settings, e.canUndo()];
  for (const bad of [{}, { ...P(["y=2x"]), version: 2 }, P(["y=2x"], { format: "point" })])
    expect(applyTransfer(e, bad, "mouse")).toEqual(REJECTED);
  expect([e.getExpressions(), e.settings, e.canUndo()]).toEqual(before);
});
it("TR-71 apply uses only the TransferTarget members of the public API and focuses by trigger", () => {
  const e = seeded();
  const touched = new Set<string>();
  const target = new Proxy(e, {
    get(obj, key) {
      touched.add(String(key));
      const v = Reflect.get(obj, key); // no receiver: getters run on the engine, so #private fields work
      return typeof v === "function" ? v.bind(obj) : v;
    },
  });
  const focus = vi.spyOn(e, "focusExpression");
  const activate = vi.spyOn(e, "activateExpression");
  expect(applyTransfer(target, P(["y=2x"]), "mouse")).toMatchObject({
    status: "added",
    focusRowId: "1",
  });
  expect(focus).toHaveBeenLastCalledWith("1");
  expect(applyTransfer(target, P(["y=3x"]), "keyboard")).toMatchObject({ focusRowId: "2" });
  expect(focus).toHaveBeenLastCalledWith("2");
  expect(applyTransfer(target, P(["y=4x"]), "touch")).toMatchObject({ focusRowId: "3" });
  expect([activate.mock.calls, focus.mock.calls.length]).toEqual([[["3"]], 2]);
  expect(
    [...touched].filter(
      (k) =>
        ![
          "getExpressions",
          "setExpressions",
          "updateSettings",
          "focusExpression",
          "activateExpression",
          "settings",
        ].includes(k)
    )
  ).toEqual([]);
});
it("TR-71 no public API method transfers", () => {
  expect(
    Object.getOwnPropertyNames(CalculatorEngine.prototype).filter((n) => /transfer/i.test(n))
  ).toEqual([]);
  expect(readFileSync("src/components/calculator-v2/KarmanCalculator.ts", "utf8")).not.toMatch(
    /^\s+(?:public\s+)?\w*[tT]ransfer\w*\s*\(/m
  );
});
it("TR-73 a payload whose rows would error, or that would make an existing row error, inserts nothing", () => {
  const e = seeded(["a=b"]);
  for (const rows of [["y=x+"], ["b=a"], ["x+y"], ["y=2x", "\\frac{"]]) {
    expect(applyTransfer(e, P(rows), "mouse")).toEqual(REJECTED);
    expect([latexOf(e), e.canUndo()]).toEqual([["a=b"], false]);
  }
});
it("TR-73 an existing row that already errors does not block a transfer; only an error the transfer causes does", () => {
  const e = seeded(["x+y"]); // mixed-variables before the transfer
  expect(applyTransfer(e, P(["y=2x"]), "mouse").status).toBe("added");
  expect(latexOf(e)).toEqual(["x+y", "y=2x"]);
  expect(analysed(e).rows.map((r) => r.error?.code ?? null)).toEqual(["mixed-variables", null]);
});
it("TR-73, NM-42 a transfer past the row or character limit inserts nothing", () => {
  const full = seeded(Array.from({ length: 100 }, () => "1"));
  expect(applyTransfer(full, P(["y=x"]), "mouse")).toEqual(REJECTED);
  expect(full.getExpressions()).toHaveLength(100);
  const lastEmpty = seeded([...Array.from({ length: 99 }, () => "1"), ""]);
  expect(applyTransfer(lastEmpty, P(["y=x"]), "mouse").status).toBe("added");
  expect(lastEmpty.getExpressions()).toHaveLength(100);
  const e = seeded();
  expect(applyTransfer(e, P(["1".repeat(2049)]), "mouse")).toEqual(REJECTED);
  expect(applyTransfer(e, P(["1".repeat(2048)]), "mouse").status).toBe("added");
});
it("TR-26 each expression, equation, inequality or function becomes one row of its normalised LaTeX with its RC- kind", () => {
  const cases: [string, string, RowKind, string[]][] = [
    ["Graph $y=2x+3$.", "y=2x+3", "curve-y", []],
    ["Find $\\sqrt{50}$.", "\\sqrt{50}", "value", []],
    ["If $P(t)=500(1.03)^{t}$", "P(t)=500(1.03)^{t}", "function-definition", []],
    ["Shade $y>2x+1$.", "y>2x+1", "region", []],
    ["Shade $-2<x\\le5$.", "-2<x\\le5", "region", []],
    ["Use $y\\geq 2x$.", "y\\ge2x", "region", []],
    ["Solve $3p+4>19$.", "3p+4>19", "unsolved-relation", ["p"]],
    ["Is $3>2$?", "3>2", "constant-relation", []],
  ];
  for (const [text, row, kind, chips] of cases) {
    const item = [...classifyStem(stem(text)).values()][0];
    const e = seeded();
    expect(applyTransfer(e, { ...item.payload, questionKey: "a1:q1" }, "mouse").status, text).toBe(
      "added"
    );
    expect(latexOf(e), text).toEqual([row]);
    expect([analysed(e).rows[0].kind, analysed(e).rows[0].chips], text).toEqual([kind, chips]);
  }
});
it("TR-27 a system becomes one row per line, consecutive and in source order", () => {
  const item = classifyStem(
    stem("Solve $\\begin{cases}y=2x\\\\y\\ge x^{2}\\\\x<3\\end{cases}$.")
  ).get(1);
  if (!item) throw new Error("no system item");
  const e = seeded(["y=5", ""]);
  expect(applyTransfer(e, { ...item.payload, questionKey: "a1:q1" }, "mouse")).toMatchObject({
    status: "added",
    focusRowId: "2",
  });
  expect(e.getExpressions().map((r) => [r.id, r.latex])).toEqual([
    ["1", "y=5"],
    ["2", "y=2x"],
    ["3", "y\\ge x^{2}"],
    ["4", "x<3"],
  ]);
});
it("TR-32 the first row fills an empty last row, the rest append, a collapsed list expands and nothing else changes", () => {
  const e = seeded(["y=x", "a=2"]);
  e.updateSettings({ expressionsCollapsed: true, angleMode: "degrees" });
  const before = e.getExpressions();
  const settings = e.settings;
  const viewport = e.getState().viewport;
  applyTransfer(e, P(["y=2x", "y=3x"]), "mouse");
  expect(e.getExpressions().slice(0, 2)).toEqual(before);
  expect(latexOf(e)).toEqual(["y=x", "a=2", "y=2x", "y=3x"]);
  expect(e.settings).toEqual({ ...settings, expressionsCollapsed: false });
  expect(e.getState().viewport).toEqual(viewport);
  const blank = seeded();
  applyTransfer(blank, P(["y=2x"]), "mouse");
  expect(blank.getExpressions().map((r) => [r.id, r.latex])).toEqual([["1", "y=2x"]]);
});
it("TR-38 one transfer is one undo step that removes everything it added and keeps the view", () => {
  const e = seeded(["y=x", ""]);
  const before = e.getExpressions();
  const viewport = e.getState().viewport;
  expect(applyTransfer(e, P(["y=2x", "y=3x"], { dependencies: ["k=3"] }), "mouse")).toMatchObject({
    focusRowId: "3",
  });
  expect(latexOf(e)).toEqual(["y=x", "k=3", "y=2x", "y=3x"]);
  e.undo();
  expect([e.getExpressions(), e.canUndo(), e.getState().viewport]).toEqual([
    before,
    false,
    viewport,
  ]);
  e.redo();
  expect(latexOf(e)).toEqual(["y=x", "k=3", "y=2x", "y=3x"]);
});
it("PR-44 transferred inequalities and system lines are shaded regions, 3p+4>19 is unsolved with a chip, circles are implicit", () => {
  const e = seeded();
  for (const text of [
    "$y>2x+1$",
    "$-2<x\\le5$",
    "$\\begin{cases}y\\ge x^{2}\\\\y<4\\end{cases}$",
    "$3p+4>19$",
    "$(x-2)^2+(y+1)^2=9$",
  ]) {
    const item = classifyStem(stem(text)).get(0);
    if (!item) throw new Error(text);
    applyTransfer(e, { ...item.payload, questionKey: "a1:q1" }, "mouse");
  }
  expect(analysed(e).rows.map((r) => [r.kind, r.graph?.kind ?? null, r.chips])).toEqual([
    ["region", "region", []],
    ["region", "region", []],
    ["region", "region", []],
    ["region", "region", []],
    ["unsolved-relation", null, ["p"]],
    ["implicit", "implicit", []],
  ]);
});
```

`apply.component.test.tsx` (`// @vitest-environment jsdom`; `afterEach(() => vi.useRealTimers())`; `rowIds()` = `[...document.querySelectorAll("li[data-row-id]")].map((li) => li.getAttribute("data-row-id"))`, exiting rows included):

```tsx
it("TR-32 a transfer into a collapsed list expands it and renders the new rows after the existing ones", () => {
  const kit = renderEditor(<ExpressionPanel {...panelProps()} />, { rows: ["y=x"] });
  act(() => kit.engine.updateSettings({ expressionsCollapsed: true }));
  expect(document.querySelector("section.kc-list-panel")).toHaveAttribute(
    "data-list-state",
    "collapsed"
  );
  act(() => void applyTransfer(kit.engine, P(["y=2x", "y=3x"]), "mouse"));
  expect(document.querySelector("section.kc-list-panel")).toHaveAttribute(
    "data-list-state",
    "expanded"
  );
  expect(screen.getAllByRole("listitem").map((li) => li.dataset.rowId)).toEqual(["1", "2", "3"]);
});
it("TR-38 undo after a transfer removes its rows from the rendered list and the panel stays mounted", () => {
  const kit = renderEditor(<ExpressionPanel {...panelProps()} />, { rows: ["y=x", ""] });
  act(() => void applyTransfer(kit.engine, P(["y=2x", "y=3x"]), "keyboard"));
  expect(screen.getAllByRole("listitem")).toHaveLength(3);
  act(() => kit.engine.undo());
  expect(screen.getAllByRole("listitem").map((li) => li.dataset.rowId)).toEqual(["1", "2"]);
  expect(screen.getByRole("list", { name: "Expressions" })).toBeInTheDocument();
});
it("TR-32 a transfer right after the last row is deleted writes the freed id once: one list item per id while the deleted row exits and after (P4)", () => {
  vi.useFakeTimers();
  const kit = renderEditor(<ExpressionPanel {...panelProps()} />, {
    rows: ["y=x", "y=2x"],
    durationMs: 100,
  });
  act(() => kit.engine.removeExpression({ id: "2" }));
  expect(document.querySelector('li[data-row-id="2"]')).toHaveAttribute("data-motion", "exit");
  act(() => void applyTransfer(kit.engine, P(["y=3x"]), "mouse"));
  expect(kit.engine.getExpressions().map((r) => [r.id, r.latex])).toEqual([
    ["1", "y=x"],
    ["2", "y=3x"],
  ]);
  expect(rowIds()).toEqual(["1", "2"]);
  expect(document.querySelector('li[data-row-id="2"]')).not.toHaveAttribute("data-motion", "exit");
  act(() => vi.advanceTimersByTime(100));
  expect(rowIds()).toEqual(["1", "2"]);
  expect(screen.getAllByRole("listitem").map((li) => li.dataset.rowId)).toEqual(["1", "2"]);
});
```

- [ ] **Step 3: Run** `n exec 22 npx vitest run src/components/calculator-v2/transfer`. Expected: FAIL, both `apply.test.ts` and `apply.component.test.tsx` with `Failed to resolve import "./apply"`.
- [ ] **Step 4: Implement.**
  - `transferPayloadSchema`: `z.object({ version: z.literal(1), questionKey: z.string().min(1), sourceId: z.string().min(1), description: z.string(), format: z.enum([...]), dependencies: z.array(z.string()).max(MAX_ROWS), rows: z.array(z.string()).max(MAX_ROWS).optional(), table: z.object({ headers: z.array(z.string().nullable()), columns: z.array(z.array(z.string())) }).strict().optional(), pairs: z.array(z.tuple([z.string(), z.string()])).optional(), pointTableKey: z.string().optional() }).strict()`, typed `z.ZodType<TransferPayload>`.
  - `planTransfer` (this task): a format other than `"rows"` or empty `rows` → rejected (TR-77); writes = dependencies then rows (Task 10 adds the name rules); ids and the empty-last-row fill by decision 11; then the limit and analysis checks of decision 11 (`analyzeRows` of the existing list and of the prospective list, settings from the input; an existing row rejects the transfer only when its error is `null` before and not `null` after, so an already-erroring `x+y` never does); focus = the first payload row's id.
  - `applyTransfer`: parse (fail → rejected); `planTransfer({ existing: target.getExpressions(), payload, settings: { angleMode: target.settings.angleMode, complex: target.settings.complex } })` inside `try`; rejected → `{ status: "rejected", message: TRANSFER_MESSAGES.rejected, focusRowId: null }`; otherwise `setExpressions(writes)` (skipped for `already-present`) and `updateSettings({ expressionsCollapsed: false })` when collapsed, inside `try` (a throw → rejected); then `activateExpression` for `"touch"`, else `focusExpression`, inside a `try` whose `catch` holds a comment; message `added(payload.description)`, `renamed(plainMath(to), plainMath(from))` or `alreadyPresent(row)`.
- [ ] **Step 5: Run** the Step 3 command. Expected: PASS (15 tests: 12 in `apply.test.ts`, 3 in `apply.component.test.tsx`). If only the freed-id test fails, with two `li[data-row-id="2"]` or the new row removed when the exit ends, stop and report it to the lead under precondition P4 (09's defect; decision 11's id rule stays).
- [ ] **Step 6: Commit** `git add src/components/calculator-v2/transfer docs/superpowers/specs/calculator-v2/c-transfer.md && git commit -m "Validate and apply transfer payloads as one checked undo step (AR-16, TR-26, TR-27, TR-32, TR-38, TR-71, TR-73, OI-22)"`.

### Task 10: Names at apply time: duplicates, renames and dependencies (TR-35, TR-36, TR-37, TR-38, TR-72)

**Files:** Create `tr/rename.ts`; Modify `tr/plan.ts`; Test `tr/rename.test.ts`, `tr/plan.test.ts`.

**Interfaces:**

- Consumes:
  - Task 9: `planTransfer(input: PlanInput): TransferPlan`, `PlanInput`, `TransferPlan`,
    `applyTransfer(target: TransferTarget, payload: unknown, trigger: TransferTrigger): Extract<TransferResult, { status: "added" | "renamed" | "already-present" | "rejected" }>`.
  - Task 4: `lexQuestionMath(latex: string): LexResult` and `QToken` (`kind`, `text`, `start`, `end`).
  - Tasks 6 and 7: `classifyStem(stem: StemInput): ReadonlyMap<number, TransferItem>`, `StemInput`.
  - 02: `parseLatex(input: string, options?: ParseOptions): ParseResult`, `printLatex(tree: Node): string`,
    `functionDefinitionHead(input: string): { name: string; params: string[] } | null`.
  - 04: `analyzeRows(rows: readonly RowSource[], settings: AnalysisSettings): AnalysisResult`
    (`RowAnalysis.defines: { name: string; type: "value" | "function"; params: string[] } | null`, `RowAnalysis.uses: string[]`).
  - Tests: Conventions' `seeded`, `latexOf`, `P`, `REAL`, `stem` (07's `createTestEngine` as in Task 9) and the engine's `undo(): void`, `redo(): void`, `canUndo(): boolean`, `clearHistory(): void` as in Task 9.
- Produces (package-internal):

```ts
// tr/rename.ts
export function renameName(latex: string, from: string, to: string): string | null; // null when latex does not lex
export function nameBase(name: string): string; // "a_{1}" → "a", "\\alpha_{2}" → "\\alpha"
// tr/plan.ts, added
export function definedName(latex: string, userFunctions: ReadonlySet<string>): string | null; // RC-4 head or RC-6 name (not x, y, r, \theta)
export function canonicalLatex(latex: string, userFunctions: ReadonlySet<string>): string | null; // printLatex of the parse, null on error
```

- [ ] **Step 1: Write the failing tests** (`plan(existing, rows, deps = [])` = `planTransfer({ existing: existing.map((latex, i) => ({ id: String(i + 1), latex })), payload: P(rows, { dependencies: deps }), settings: REAL })`):

```ts
// tr/rename.test.ts
it("TR-36 renameName replaces every identifier occurrence and nothing inside commands, environments or other names", () => {
  const rows: [string, string, string, string][] = [
    ["g(x)=f(x)+3", "f", "f_{2}", "g(x)=f_{2}(x)+3"],
    ["f(x)=x^{2}", "f", "f_{2}", "f_{2}(x)=x^{2}"],
    ["a=2", "a", "a_{2}", "a_{2}=2"],
    ["y=ax+\\frac{a}{2}", "a", "a_{3}", "y=a_{3}x+\\frac{a_{3}}{2}"],
    ["x_1=2", "x_{1}", "x_{2}", "x_{2}=2"],
    ["y=x_{a}+a", "a", "a_{2}", "y=x_{a}+a_{2}"],
    ["\\log_{a}x+\\sqrt[a]{8}", "a", "a_{2}", "\\log_{a_{2}}x+\\sqrt[a_{2}]{8}"],
    ["\\alpha+\\alpha_{1}", "\\alpha", "\\alpha_{2}", "\\alpha_{2}+\\alpha_{1}"],
    ["\\sin(s)+\\cos s", "s", "s_{2}", "\\sin(s_{2})+\\cos s_{2}"],
    ["\\left|c\\right|", "c", "c_{2}", "\\left|c_{2}\\right|"],
    [
      "\\begin{cases}a=2\\\\y=ax\\end{cases}",
      "a",
      "a_{2}",
      "\\begin{cases}a_{2}=2\\\\y=a_{2}x\\end{cases}",
    ],
  ];
  for (const [latex, from, to, out] of rows) expect(renameName(latex, from, to), latex).toBe(out);
  expect(renameName("x\\ne3", "x", "x_{2}")).toBeNull();
  expect([nameBase("a_{1}"), nameBase("v_{max}"), nameBase("\\alpha_{2}"), nameBase("f")]).toEqual([
    "a",
    "v",
    "\\alpha",
    "f",
  ]);
});
// tr/plan.test.ts
it("TR-35, TR-36 canonicalLatex prints the v2 parse and definedName reads RC-4 heads and RC-6 names", () => {
  const none = new Set<string>();
  expect(canonicalLatex("y = 2x + 3", none)).not.toBeNull();
  expect(canonicalLatex("y = 2x + 3", none)).toBe(canonicalLatex("y=2x+3", none));
  expect(canonicalLatex("y=2x+", none)).toBeNull();
  expect([
    definedName("f(x)=x^{2}", new Set(["f"])),
    definedName("a_{1}=2", none),
    definedName("C=8h+15", none),
    definedName("y=2x", none),
    definedName("x=5", none),
    definedName("r=5", none),
    definedName("3p+4=19", none),
  ]).toEqual(["f", "a_{1}", "C", null, null, null, null]);
});
it("TR-35 a row whose canonical LaTeX matches an existing or earlier row is not inserted again", () => {
  expect(plan(["y=x", "y=2x+3"], ["y = 2x + 3"])).toEqual({
    status: "already-present",
    focusRowId: "2",
    row: 2,
  });
  expect(plan(["y=x"], ["y=x", "y=2x"])).toEqual({
    status: "added",
    writes: [{ id: "2", latex: "y=2x" }],
    focusRowId: "1",
    rename: null,
  });
  expect(plan([""], ["y=x", "y=x"])).toEqual({
    status: "added",
    writes: [{ id: "1", latex: "y=x" }],
    focusRowId: "1",
    rename: null,
  });
});
it("TR-35 repeating a transfer reports the existing row, focuses it and adds no undo step", () => {
  const e = seeded();
  const p = P(["y=2x+3"], { description: "y = 2x + 3" });
  expect(applyTransfer(e, p, "mouse")).toEqual({
    status: "added",
    message: "Added to calculator: y = 2x + 3.",
    focusRowId: "1",
  });
  e.clearHistory();
  const focus = vi.spyOn(e, "focusExpression");
  expect(applyTransfer(e, p, "keyboard")).toEqual({
    status: "already-present",
    message: "Already in the calculator, row 1.",
    focusRowId: "1",
  });
  expect([latexOf(e), e.canUndo(), focus.mock.calls]).toEqual([["y=2x+3"], false, [["1"]]]);
});
it("TR-36 a definition that would redefine a name differently is renamed with every reference in the transfer", () => {
  expect(plan(["a=5"], ["a=2", "y=ax"])).toEqual({
    status: "renamed",
    writes: [
      { id: "2", latex: "a_{2}=2" },
      { id: "3", latex: "y=a_{2}x" },
    ],
    focusRowId: "2",
    rename: { from: "a", to: "a_{2}" },
  });
  expect(plan(["f(x)=3x"], ["f(x)=x^{2}"])).toMatchObject({
    status: "renamed",
    writes: [{ id: "2", latex: "f_{2}(x)=x^{2}" }],
  });
  expect(plan(["a=5", "a_{2}=7"], ["a=2"])).toMatchObject({
    writes: [{ id: "3", latex: "a_{3}=2" }],
  });
  expect(plan(["a=5", "y=a_{2}x"], ["a=2"])).toMatchObject({
    writes: [{ id: "3", latex: "a_{3}=2" }],
  });
  expect(plan(["x_{1}=4"], ["x_{1}=2"])).toMatchObject({
    writes: [{ id: "2", latex: "x_{2}=2" }],
    rename: { from: "x_{1}", to: "x_{2}" },
  });
  expect(plan(["a=2"], ["a=2"])).toMatchObject({ status: "already-present", row: 1 });
  expect(plan(["f(x)=3x", "f_{2}(x)=x^{2}"], ["f(x)=x^{2}"])).toMatchObject({
    status: "already-present",
    row: 2,
  });
});
it("TR-36 existing rows are never modified and the status names the rename", () => {
  const e = seeded(["f(x)=3x"]);
  const before = e.getExpressions();
  expect(applyTransfer(e, P(["f(x)=x^{2}"]), "mouse")).toEqual({
    status: "renamed",
    message: "Added as f₂ because f is already defined.",
    focusRowId: "2",
  });
  expect(e.getExpressions()[0]).toEqual(before[0]);
});
it("TR-38 one undo removes a renamed transfer, renamed definition included, and redo restores the renamed rows", () => {
  const e = seeded(["f(x)=3x"]);
  const before = e.getExpressions();
  expect(applyTransfer(e, P(["f(x)=x^{2}", "y=f(x)"]), "mouse").status).toBe("renamed");
  expect(latexOf(e)).toEqual(["f(x)=3x", "f_{2}(x)=x^{2}", "y=f_{2}(x)"]);
  e.undo();
  expect([e.getExpressions(), e.canUndo()]).toEqual([before, false]);
  e.redo();
  expect(latexOf(e)).toEqual(["f(x)=3x", "f_{2}(x)=x^{2}", "y=f_{2}(x)"]);
});
it("TR-37 a dependency is inserted first only when its name is unused, otherwise the calculator's own definition is used", () => {
  expect(plan([""], ["y=kx+1"], ["k=3"])).toEqual({
    status: "added",
    writes: [
      { id: "1", latex: "k=3" },
      { id: "2", latex: "y=kx+1" },
    ],
    focusRowId: "2",
    rename: null,
  });
  expect(plan(["k=5"], ["y=kx+1"], ["k=3"])).toMatchObject({
    writes: [{ id: "2", latex: "y=kx+1" }],
  });
  expect(plan(["y=kx"], ["y=kx+1"], ["k=3"])).toMatchObject({
    writes: [{ id: "2", latex: "y=kx+1" }],
  });
  expect(plan(["f(x)=3x"], ["g(x)=f(x)+3"], ["f(x)=x^{2}"])).toMatchObject({
    status: "added",
    writes: [{ id: "2", latex: "g(x)=f(x)+3" }],
  });
  expect(plan([""], ["g(x)=f(x)+3"], ["a=2", "f(x)=ax^{2}"])).toMatchObject({
    writes: [
      { id: "1", latex: "a=2" },
      { id: "2", latex: "f(x)=ax^{2}" },
      { id: "3", latex: "g(x)=f(x)+3" },
    ],
  });
});
it("TR-72 names, duplicates and dependencies are decided when the payload is applied, never by the classifier", () => {
  expectTypeOf(classifyStem).parameters.toEqualTypeOf<[StemInput]>();
  const item = classifyStem(stem("Let $f(x)=x^{2}$; graph $y=f(x)+1$.")).get(3);
  if (!item) throw new Error("no item");
  expect(item.payload).toMatchObject({ rows: ["y=f(x)+1"], dependencies: ["f(x)=x^{2}"] });
  const fresh = seeded();
  const busy = seeded(["f(x)=3x"]);
  applyTransfer(fresh, { ...item.payload, questionKey: "a1:q1" }, "mouse");
  applyTransfer(busy, { ...item.payload, questionKey: "a1:q1" }, "mouse");
  expect([latexOf(fresh), latexOf(busy)]).toEqual([
    ["f(x)=x^{2}", "y=f(x)+1"],
    ["f(x)=3x", "y=f(x)+1"],
  ]);
});
```

- [ ] **Step 2: Run** `n exec 22 npx vitest run src/components/calculator-v2/transfer/rename.test.ts src/components/calculator-v2/transfer/plan.test.ts`. Expected: FAIL in both files:
  - `rename.test.ts`: `Failed to resolve import "./rename"`.
  - `plan.test.ts` (it imports `planTransfer`, `canonicalLatex` and `definedName` from `./plan` and `applyTransfer` from `./apply`, which Task 9 created): the first test with a `TypeError` that `canonicalLatex` is not a function; the other seven on assertions, because Task 9's plan writes every dependency and row with no name rules. For example `plan(["y=x", "y=2x+3"], ["y = 2x + 3"])` returns `status: "added"` where `"already-present"` is expected, `plan(["a=5"], ["a=2", "y=ax"])` returns `{ status: "rejected" }` (the written `a=2` is a duplicate definition) where `"renamed"` is expected, the TR-38 test receives `"rejected"` where `"renamed"` is expected (the written `f(x)=x^{2}` is a second definition of `f`), and in TR-72 `latexOf(busy)` stays `["f(x)=3x"]`.
- [ ] **Step 3: Implement.** `renameName`: lex; replace, from the last token back, each `name` token whose `text` equals `from` (its source span, so `x_1` is matched as `x_{1}`) with `to`. `nameBase`: the name without its subscript. `definedName` and `canonicalLatex` use `functionDefinitionHead`, `parseLatex` and `printLatex` with the user functions of the existing rows, the dependencies and the rows. `planTransfer` gains decision 10 before Task 9's checks: used names from `analyzeRows(existing)`; dependencies by the unused rule; renames by the lowest free `b_{n}`, applied with `renameName` to every payload row before duplicate checks, an existing renamed twin making the row a duplicate; duplicates against existing and earlier written rows; then status, focus and `rename`.
- [ ] **Step 4: Run** the Step 2 command, then `n exec 22 npx vitest run src/components/calculator-v2/transfer`. Expected: PASS (`rename.test.ts` 1 test, `plan.test.ts` 8 tests, and Task 9's 15 still passing).
- [ ] **Step 5: Commit** `git add src/components/calculator-v2/transfer && git commit -m "Decide transfer duplicates, renames and dependencies at apply time (TR-35 to TR-38, TR-72)"`.
