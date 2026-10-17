# 09 editor-ui, part 1 of 5: focus, test kit and rows (Tasks 1 to 3)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

Part 1 of package `09-editor-ui.md`, which holds the package header, Working rules, Decisions,
Notes for consumers, the Row DOM and the ID coverage; they apply to every task here. Tasks run
in number order across the five parts. Paths that start with `ui/`, `styles/` or `icons/` are
under `src/components/calculator-v2/`.

---

### Task 1: Focus controller, escape stack and the editor test kit

**Files:**

- Create: `ui/focus/focus-controller.ts`, `ui/focus/escape-stack.ts`,
  `ui/list/math-field-factory.ts`, `ui/list/motion.ts`, `ui/list/messages.ts`
- Create (test-only): `ui/list/__fixtures__/fake-math-field.ts`,
  `ui/list/__fixtures__/manual-timers.ts`, `ui/list/__fixtures__/render-editor.tsx`
- Test: `ui/focus/focus-controller.test.ts`, `ui/focus/escape-stack.test.ts`

**Interfaces:**

- Consumes (07): `createEngine(options?: CalculatorOptions, deps?: Partial<EngineDeps>): CalculatorEngine`
  and its members `getSnapshot(): EngineSnapshot`, `subscribe(listener: () => void): () => void`,
  `activateExpression(id: string): void`, `setFocusedRow(id: string | null): void`,
  `setExpressions(list: ExpressionState[]): void`,
  `setBlank(options?: { allowUndo?: boolean }): void`, `clearHistory(): void`,
  `destroy(): void`; `createMainThreadBackend(): ComputeBackend`; `EngineContext`;
  `SkinContext`; `installDomStubs(): () => void`. (05) `createMathField(host: HTMLElement, options: MathFieldOptions): MathField`,
  `Announcer`, `AnnouncerContext`. (02) `MAX_ROW_CHARACTERS`. (03) `SkinId`.
- Produces: `FocusController`, `createFocusController`, `FocusContext`, `EscapeLayer`,
  `EscapeStack`, `createEscapeStack`, `EscapeContext` exactly as 01 section 11, and:

```ts
// ui/focus/escape-stack.ts
export const ESCAPE_RANK: Readonly<Record<string, number>>; // { keypad: 1, letters: 2, functions: 3 }; any other id: 4
// ui/list/math-field-factory.ts
export type MathFieldFactory = (host: HTMLElement, options: MathFieldOptions) => MathField;
export const MathFieldFactoryContext: React.Context<MathFieldFactory>; // default createMathField
// ui/list/motion.ts
export function readDurationMs(el: Element): number; // longest computed transition-duration entry in ms; 0 if none
export const MotionContext: React.Context<(el: Element) => number>; // default readDurationMs
// ui/list/messages.ts
export const EDITOR_MESSAGES; // exact copy in Step 3
// ui/list/__fixtures__/fake-math-field.ts
export interface FakeCall {
  // the only recorded methods (Step 3): latex is latex(value), never a read; select,
  // clearSelection, reflow, destroy, speechText and selectedLatex run unrecorded
  method:
    | "focus"
    | "blur"
    | "latex"
    | "write"
    | "cmd"
    | "keystroke"
    | "typedText"
    | "run"
    | "setInputMode";
  arg: unknown;
}
export interface FakeMathField extends MathField {
  readonly options: MathFieldOptions;
  calls: FakeCall[]; // reassignable; the fake pushes to the current array
  emitEdit(latex: string): void; // sets the latex, then options.onEdit(latex)
}
export interface FakeFieldFactory {
  factory: MathFieldFactory;
  forRow(rowId: string): FakeMathField; // newest field whose host was inside [data-row-id] at creation
  byLabel(ariaLabel: string): FakeMathField; // newest field created with that ariaLabel
}
export function createFakeFieldFactory(): FakeFieldFactory;
export function fakeOptions(
  ariaLabel: string,
  overrides?: Partial<MathFieldOptions>
): MathFieldOptions;
// ui/list/__fixtures__/manual-timers.ts
export interface ManualTimers {
  setTimeout(callback: () => void, ms: number): unknown;
  clearTimeout(handle: unknown): void;
  advance(ms: number): void; // runs due callbacks in time order
}
export function createManualTimers(): ManualTimers;
// ui/list/__fixtures__/render-editor.tsx
export interface RecordingAnnouncer extends Announcer {
  readonly texts: string[];
}
export interface EditorKit {
  engine: CalculatorEngine;
  focus: FocusController;
  escape: EscapeStack;
  announcer: RecordingAnnouncer;
  fields: FakeFieldFactory;
  clock: { now: number }; // the engine's deps.now; starts at 0
  pressEscape(): void;
}
export function renderEditor(
  ui: React.ReactNode,
  options?: { rows?: string[]; skin?: SkinId; durationMs?: number }
): EditorKit;
export function textbox(n: number): HTMLElement; // getByRole("textbox", { name: `Expression ${n}`, exact: true })
export function rowItem(rowId: string): HTMLElement; // li[data-row-id="<id>"]; throws when absent
```

- [ ] **Step 1: Write the failing tests.** `focus-controller.test.ts` (jsdom) and
      `escape-stack.test.ts` (node). The focus-controller and escape-stack tests carry no spec
      ID: they test plumbing that R-3 (Task 13), K-5 (Task 10) and 10's KB-3 rely on, and an ID
      here would make this task the owner of those IDs (00-index section 4, "Owning task"):

```ts
function setup(rows: string[]) {
  const engine = createEngine(undefined, { backend: createMainThreadBackend() });
  engine.setExpressions(rows.map((latex, i) => ({ id: String(i + 1), latex })));
  return { engine, focus: createFocusController(engine), fake: createFakeFieldFactory() };
}
function mountField(fake: FakeFieldFactory, rowId: string) {
  const li = document.body.appendChild(document.createElement("li"));
  li.dataset.rowId = rowId;
  return fake.factory(
    li.appendChild(document.createElement("div")),
    fakeOptions(`Expression ${rowId}`)
  );
}

it("focus controller: focusRow waits for a field that registers later, then focuses it at the requested edge", () => {
  const { focus, fake } = setup(["a", ""]);
  focus.focusRow("2", "start");
  const f2 = mountField(fake, "2");
  focus.registerField("2", f2);
  expect(f2.calls).toEqual([
    { method: "focus", arg: undefined },
    { method: "keystroke", arg: "Ctrl-Home" },
  ]);
  const f1 = mountField(fake, "1");
  const unregister = focus.registerField("1", f1);
  focus.focusRow("1", "end");
  expect(f1.calls.at(-1)).toEqual({ method: "keystroke", arg: "Ctrl-End" });
  expect(focus.fields()).toEqual([f1, f2]);
  unregister();
  expect(focus.field("1")).toBeNull();
});

it("R-10 lastFocusedRowId follows the engine's focused row; after setBlank() it is null and row 1 is the only row, the reopen target", () => {
  const { engine, focus } = setup(["y=x", "a=2", "y=a"]);
  engine.setFocusedRow("3");
  expect(focus.lastFocusedRowId()).toBe("3");
  engine.setFocusedRow(null);
  expect(focus.lastFocusedRowId()).toBe("3");
  engine.activateExpression("2");
  expect(focus.activeRowId()).toBe("2");
  engine.setBlank();
  expect(focus.lastFocusedRowId()).toBeNull();
  expect(engine.getSnapshot().rows.map((r) => [r.id, r.latex])).toEqual([["1", ""]]);
});

it("escape stack: closes one layer per press by ESCAPE_RANK, any popover before the Functions panel, the panel before the ABC page and the keypad, whatever the push order", () => {
  const stack = createEscapeStack();
  const closed: string[] = [];
  const layer = (id: string) => ({ id, close: () => closed.push(id) });
  const removePopover = stack.push(layer("popover"));
  stack.push(layer("keypad"));
  stack.push(layer("functions"));
  stack.push(layer("letters"));
  expect([1, 2, 3, 4, 5].map(() => stack.handleEscape())).toEqual([true, true, true, true, false]);
  expect(closed).toEqual(["popover", "functions", "letters", "keypad"]);
  removePopover();
  stack.push(layer("menu-a"));
  stack.push(layer("menu-b"));
  stack.handleEscape();
  expect(closed.at(-1)).toBe("menu-b");
});
```

- [ ] **Step 2: Run them and see them fail.** `npx vitest run src/components/calculator-v2/ui/focus`.
      Expected: FAIL with `Failed to resolve import "./focus-controller"` and
      `Failed to resolve import "./escape-stack"`.
- [ ] **Step 3: Implement the modules and the kit.**
  - `createFocusController(engine)`: a `Map` of fields and one pending `{ rowId, caret }`.
    `focusRow` on a registered field calls `field.focus()`, then
    `field.keystroke(caret === "start" ? "Ctrl-Home" : "Ctrl-End")`, then
    `field.element.scrollIntoView?.({ block: "nearest" })`; otherwise it stores the request,
    which `registerField` applies and clears. `activateRow` calls
    `engine.activateExpression(rowId)` and scrolls without focusing. `activeRowId()` reads
    `getSnapshot().activeRowId`. On every engine notification `lastFocusedRowId` takes a non-null
    `focusedRowId` and resets to null when its row has left `rows`. `fields()` follows `rows`
    order. `subscribe` fires on registration changes and engine notifications.
  - `createEscapeStack()`: `handleEscape` takes the layer with the highest
    `ESCAPE_RANK[id] ?? 4`, the latest push winning ties, removes it, then calls `close()`; a
    remover for a layer already closed is a no-op.
  - `readDurationMs`: split `getComputedStyle(el).transitionDuration` on commas, parse `s` and
    `ms`, return the maximum; an empty or unparsable value gives 0.
  - The fake field appends `<span class="kc-fake-field"><textarea aria-label={ariaLabel}>` to
    its host. Textarea `focus` and `blur` events call `onFocus` and `onBlur`; `focus()` focuses
    the textarea. `latex(v)` sets without `onEdit`. `write`, `cmd` and `typedText` append their
    argument and call `onEdit`, except that a result longer than `maxLength` keeps the latex and
    calls `onRefused("char-limit")`. `keystroke("Backspace")` drops the last character and calls
    `onEdit`; other keystrokes only record. `run(actions)` records one `run` call and applies
    the actions unrecorded. Recorded, in call order, are exactly the `FakeCall.method` names:
    `focus()` and `blur()` (with `arg: undefined`), `latex(value)` (a `latex()` read is not
    recorded), `write`, `cmd`, `keystroke`, `typedText`, `run` (with the action array) and
    `setInputMode`, each with its argument as `arg`. The other `MathField` methods run without
    being recorded: `select()` and `clearSelection()` do nothing, `reflow()` does nothing,
    `destroy()` removes the fake's span, `speechText()` returns `""` and `selectedLatex()`
    returns `null`.
  - `renderEditor`: `installDomStubs()`; `kit.clock` starts as `{ now: 0 }` and changes only when
    a test assigns `clock.now`; an engine from
    `createEngine(undefined, { backend: createMainThreadBackend(), now: () => kit.clock.now })`
    whose rows, when `rows` is given, are set with ids `"1"…"n"`, then `clearHistory()`;
    providers `EngineContext`, `SkinContext` (`skin ?? "ivory"`), `FocusContext`,
    `EscapeContext`, `AnnouncerContext` (recording), `MathFieldFactoryContext` (fake) and
    `MotionContext` (`() => durationMs ?? 0`), inside a `div` whose Escape `keydown` calls
    `escape.handleEscape()` and `preventDefault()` when it returns true. `pressEscape` dispatches
    that keydown on `document.activeElement` (or the wrapper). `onTestFinished` restores the
    stubs and destroys the engine.
  - `messages.ts`, exact copy:

```ts
export const EDITOR_MESSAGES = {
  value: (n: number, valueText: string) => `Expression ${n} equals ${valueText}`, // A11Y-2
  error: (n: number, message: string) => `Expression ${n}: ${message}`, // A11Y-2
  clearAll: "All expressions cleared. Undo is available.", // KB-5
  undone: "Undone.",
  redone: "Redone.",
  rowLimit: "The calculator holds at most 100 expressions.", // MAX_ROWS (NM-42); 10's ROW_LIMIT_MESSAGE text
  charLimit: "Each expression can be up to 2,048 characters.", // MAX_ROW_CHARACTERS (T-13)
  tilde: "tilde", // K-7
  angle: (mode: "radians" | "degrees") => `Angle set to ${mode}.`, // S-6, A11Y-2
  boundNotNumber: "Enter an expression with a finite value.", // S-7
  boundOrder: "The minimum must be less than the maximum.", // S-7
  stepInvalid: "Enter a positive number, or leave blank for automatic.", // S-7
} as const;
```

- [ ] **Step 4: Run them and see them pass.** Same command. Expected: PASS, 3 tests.
- [ ] **Step 5: Commit.**

```bash
git add src/components/calculator-v2/ui/focus src/components/calculator-v2/ui/list
git commit -m "Add the v2 focus controller, escape stack and editor test kit (09 editor-ui)"
```

### Task 2: Rows: numbering, naming, speech, gutter tab and focus cue

**Files:**

- Create: `ui/list/ExpressionPanel.tsx`, `ui/list/ExpressionRow.tsx`, `ui/list/row-model.ts`,
  `icons/index.tsx`, `styles/list.css`
- Modify: `ui/list/__fixtures__/render-editor.tsx` (add `panelProps`)
- Test: `ui/list/ExpressionRow.test.tsx`

**Interfaces:**

- Consumes: Task 1; (07) `useEngine(): CalculatorEngine`,
  `useEngineSnapshot(engine: CalculatorEngine): EngineSnapshot`, `RowView`,
  `editRow(id: string, latex: string, source: EditSource): EditRefusal | null`,
  `endEditGroup(): void`, `setRowHidden(id: string, hidden: boolean): void`,
  `setFocusedRow`, `activateExpression`, `removeExpression(ref: { id: string }): void`,
  `setExpression(state: ExpressionState): void`, `expressionAnalysis`; `useSkin(): SkinId`;
  (05) `latexToSpeech(latex: string): string`; (03)
  `resolveRowColor(color: string, skin: SkinId): { hex: string; fillAlpha: number; adjusted: boolean }`,
  `EXPLICIT_COLOUR_NOTE`; (02) `MAX_ROW_CHARACTERS`.
- Produces: `ExpressionPanelProps` and `ExpressionPanel` exactly as 01 section 11, and:

```ts
// ui/list/row-model.ts
export type RowTab = "line" | "point" | null;
export function rowTab(row: RowView): RowTab;
// point → "point"; curve-y, curve-x, implicit, vertical-lines, horizontal-lines, region,
// constant-relation → "line"; error → "line" only while row.hidden; every other kind (value,
// definition, empty, …) → null and no tab (Decisions: gutter tab only on rows with something to hide)
export interface RowDomIds {
  label: string;
  speech: string;
  value: string;
  error: string;
  hint: string;
}
export function rowDomIds(rowId: string): RowDomIds; // "kc-row-<id>-label", "-speech", "-value", "-error", "-hint"
export function fieldTextbox(field: MathField): HTMLElement; // field.element's textarea, else field.element
// ui/list/ExpressionRow.tsx
export interface ExpressionRowProps {
  row: RowView;
  number: number; // 1-based
  keypadOpen: boolean;
  onTouchFocus(rowId: string): void;
}
export function ExpressionRow(props: ExpressionRowProps): JSX.Element;
// icons/index.tsx (Karman-drawn inline SVG, aria-hidden, currentColor)
export function LineStyleGlyph(props: { style: "solid" }): JSX.Element;
export function PointStyleGlyph(props: { style: "filled" }): JSX.Element;
// ui/list/__fixtures__/render-editor.tsx
export function panelProps(overrides?: Partial<ExpressionPanelProps>): ExpressionPanelProps;
// layout "desktop", pointer "fine", keypadOpen false, vi.fn() handlers
```

- [ ] **Step 1: Write the failing tests** in `ExpressionRow.test.tsx` (the T-11 test imports
      `useState` from `"react"`):

```tsx
it("A11Y-3 rows are list items with an Expression n textbox and Delete and Hide controls, renumbered on removal", () => {
  const kit = renderEditor(<ExpressionPanel {...panelProps()} />, { rows: ["y=x", "y=2x"] });
  const list = screen.getByRole("list", { name: "Expressions" });
  expect(within(list).getAllByRole("listitem")).toHaveLength(2);
  expect(textbox(2)).toBe(fieldTextbox(kit.fields.forRow("2")));
  expect(
    screen.getByRole("button", { name: "Delete expression 2", exact: true })
  ).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Hide expression 2", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true"
  );
  act(() => kit.engine.removeExpression({ id: "1" }));
  expect(textbox(1)).toBe(fieldTextbox(kit.fields.forRow("2")));
  expect(
    screen.getByRole("button", { name: "Delete expression 1", exact: true })
  ).toBeInTheDocument();
});

it("A11Y-4 each textbox's accessible description is the T-5 speech text", () => {
  renderEditor(<ExpressionPanel {...panelProps()} />, {
    rows: ["y=x^{2}+\\frac{3}{4}", "y=\\sqrt{x}+\\pi"],
  });
  expect(textbox(1)).toHaveAccessibleDescription("y equals x squared plus 3 fourths");
  expect(textbox(2)).toHaveAccessibleDescription("y equals Start Root, x, End Root plus pi");
});

it("L-3 the gutter numbers rows from 1 and marks the focused row and the active row", () => {
  const props = panelProps();
  const kit = renderEditor(<ExpressionPanel {...props} />, { rows: ["y=x", "a=2", ""] });
  expect([...document.querySelectorAll(".kc-row-number")].map((n) => n.textContent)).toEqual([
    "1",
    "2",
    "3",
  ]);
  fireEvent.pointerDown(rowItem("2").querySelector(".kc-row-field")!, { pointerType: "touch" });
  act(() => kit.focus.focusRow("2", "end"));
  expect(rowItem("2")).toHaveAttribute("data-focused", "true");
  expect(rowItem("2")).toHaveAttribute("data-active", "true");
  expect(props.onTouchFocusRow).toHaveBeenCalledWith("2");
  act(() => kit.focus.activateRow("3"));
  expect(rowItem("3")).toHaveAttribute("data-active", "true");
  expect(rowItem("2")).not.toHaveAttribute("data-active");
  expect(fieldTextbox(kit.fields.forRow("3"))).not.toHaveFocus();
});

it("R-1 the gutter tab shows the row colour and line or point style and toggles the graph with aria-pressed", async () => {
  const kit = renderEditor(<ExpressionPanel {...panelProps()} />, {
    rows: ["y=x", "(2,3)", "2+3"],
  });
  const tab = screen.getByRole("button", { name: "Hide expression 1", exact: true });
  expect(tab).toHaveAttribute("data-style", "solid");
  const { hex } = resolveRowColor(kit.engine.getSnapshot().rows[0].color, "ivory");
  expect(tab.style.getPropertyValue("--kc-row-color")).toBe(hex);
  expect(screen.getByRole("button", { name: "Hide expression 2", exact: true })).toHaveAttribute(
    "data-style",
    "filled"
  );
  expect(screen.queryByRole("button", { name: "Hide expression 3" })).toBeNull();
  await userEvent.setup().click(tab);
  expect(kit.engine.getSnapshot().rows[0].hidden).toBe(true);
  expect(screen.getByRole("button", { name: "Show expression 1", exact: true })).toHaveAttribute(
    "aria-pressed",
    "false"
  );
  expect(kit.engine.expressionAnalysis["1"].isGraphable).toBe(false);
});

it("R-1, TH-11 an explicit colour that the skin adjusts shows the TH-11 note", () => {
  expect(resolveRowColor("#ffff00", "ivory").adjusted).toBe(true);
  const kit = renderEditor(<ExpressionPanel {...panelProps()} />, { rows: ["y=x"] });
  act(() => kit.engine.setExpression({ id: "2", latex: "y=2x", color: "#ffff00" }));
  expect(within(rowItem("2")).getByText(EXPLICIT_COLOUR_NOTE)).toBeInTheDocument();
  expect(within(rowItem("1")).queryByText(EXPLICIT_COLOUR_NOTE)).toBeNull();
});

it("T-11 a row calls setInputMode none while keypadOpen and text after the keypad closes", () => {
  function Panel() {
    const [keypadOpen, setKeypadOpen] = useState(true);
    return (
      <>
        <button type="button" onClick={() => setKeypadOpen(false)}>
          Test close keypad
        </button>
        <ExpressionPanel {...panelProps({ keypadOpen })} />
      </>
    );
  }
  const kit = renderEditor(<Panel />, { rows: ["y=x"] });
  const field = kit.fields.forRow("1");
  const modes = () => field.calls.filter((c) => c.method === "setInputMode");
  expect(modes()).toContainEqual({ method: "setInputMode", arg: "none" });
  expect(modes()).not.toContainEqual({ method: "setInputMode", arg: "text" });
  fireEvent.click(screen.getByRole("button", { name: "Test close keypad" })); // rerender with keypadOpen false
  expect(modes().at(-1)).toEqual({ method: "setInputMode", arg: "text" });
});
```

- [ ] **Step 2: Run them and see them fail.**
      `npx vitest run src/components/calculator-v2/ui/list/ExpressionRow.test.tsx`. Expected:
      FAIL with `Failed to resolve import "./ExpressionPanel"`.
- [ ] **Step 3: Implement the panel skeleton, the row, `row-model.ts`, the glyphs and `list.css`.**
  - `ExpressionPanel` renders `section.kc-list-panel` (`aria-label="Expression list"`,
    `data-layout`, `data-pointer`) holding `div.kc-list-body > ol.kc-list`
    (`aria-label="Expressions"`) with one `ExpressionRow` per `snapshot.rows` (key `row.id`,
    `number` = index + 1). The toolbar and edit bar come in Task 4 (in the list body: the
    toolbar first, then the edit bar, then the list), motion in Task 6.
  - `ExpressionRow` renders the row DOM above: `span.kc-row-number`; the tab when `rowTab(row)`
    is non-null (`aria-label` `Hide expression n` while shown and `Show expression n` while
    hidden, `aria-pressed={!row.hidden}`, `data-style` `solid` or `filled`, inline
    `--kc-row-color: resolveRowColor(row.color, useSkin()).hex`, the matching glyph; activation
    calls `setRowHidden(row.id, !row.hidden)`); hidden spans `#label` (`Expression n`) and
    `#speech` (`latexToSpeech(row.latex)`); `p.kc-row-note` with `EXPLICIT_COLOUR_NOTE` when
    `adjusted`; `button.kc-row-delete` named `Delete expression n` with lucide `X` (Task 4 wires
    it). `data-focused="true"` when `snapshot.focusedRowId === row.id`, `data-active="true"`
    when `snapshot.activeRowId === row.id`; each attribute is omitted (React `undefined`, never
    `"false"`) on every other row, as the L-3 test's `not.toHaveAttribute("data-active")` needs.
  - The field is created once in a layout effect through `MathFieldFactoryContext` with
    `ariaLabel: "Expression n"` and `maxLength: MAX_ROW_CHARACTERS`, registered with
    `focus.registerField` and destroyed on unmount. `field.latex(row.latex)` runs at creation and
    whenever the snapshot's latex differs from `field.latex()`; a sync flag makes `onEdit` ignore
    those writes. `onEdit(latex)` → `editRow(row.id, latex, "typing")`. `onFocus` →
    `setFocusedRow(row.id)`, `activateExpression(row.id)`, and `onTouchFocus(row.id)` when the
    last `pointerdown` on `.kc-row-field` had `pointerType === "touch"`. `onBlur` →
    `setFocusedRow(null)` and `endEditGroup()` (KB-2's focus change). The field gets
    `setInputMode("none")` while `keypadOpen` and `setInputMode("text")` otherwise, at creation
    and on change (T-11). After each render the row sets
    `aria-labelledby` (label id) and `aria-describedby` (speech id; Task 3 appends value, error
    and hint) on `fieldTextbox(field)`. Other callbacks are no-ops until Task 4.
  - The row content sits in `div.kc-row-inner` (the `li`'s only child, Task 6 animates the
    `li`), whose grid holds gutter, main and delete with `padding: 4px`.
  - `list.css`: the `.kc-row-inner` grid; numbers in `--kc-text-secondary`; L-3:
    `.kc-row:is([data-focused="true"], [data-active="true"])` gets
    `outline: 2px solid var(--kc-focus-ring); outline-offset: -2px` and its `.kc-row-number`
    `background: var(--kc-focus-bar); color: var(--kc-focus-bar-label)`; before the swatch rule,
    the default declaration `.kc-row-tab { --kc-row-color: var(--kc-curve-1); }` (03 Task 6's
    TH-3 `varFindings` accepts only a role, curve, fill-alpha or chrome var or a `--kc-…:`
    declared in a scanned stylesheet, and the row's inline `--kc-row-color` alone is not a
    stylesheet declaration; the inline value still overrides this default, so the R-1
    `style.getPropertyValue("--kc-row-color")` assertion is unchanged); then the tab swatch
    paints `var(--kc-row-color)`; `.kc-visually-hidden` (clip pattern); controls 32 px, 44 px
    under `[data-pointer="coarse"]`. Every `var(--kc…)` `list.css` reads (here and in Task 3) is
    a `ROLE_VARS`/`CURVE_VARS` value or the declared `--kc-row-color`.
- [ ] **Step 4: Run them and see them pass.** Same command. Expected: PASS, 6 tests. Then
      `npx vitest run src/lib/calculator-v2/theme/no-raw-colours.test.ts`. Expected: PASS,
      7 tests (TH-3 `varFindings` over `scannedFiles(ROOT)`, now including `styles/list.css`, is
      `[]`).
- [ ] **Step 5: Commit.**

```bash
git add src/components/calculator-v2/ui/list src/components/calculator-v2/icons src/components/calculator-v2/styles/list.css
git commit -m "Add v2 expression rows with numbering, speech descriptions and the gutter tab (09 editor-ui)"
```

### Task 3: Row values, errors and the complex-mode hint (OI-4)

**Files:**

- Modify: `ui/list/ExpressionRow.tsx`, `styles/list.css`,
  `docs/superpowers/specs/2026-10-16-karman-calculator-v2-design.md` (section 7.3, one row)
- Test: `ui/list/row-results.test.tsx`

**Interfaces:**

- Consumes: Task 2; `RowView.valueText`, `RowView.error: RowError | null`,
  `RowView.complexHint`, `RowView.chips`; (04)
  `COMPLEX_HINT: { text: "Turn on complex mode to use i."; action: "Turn on complex mode" }`;
  (05) `groupIntegerDigits(text: string): string`; (07)
  `updateSettings(partial: SettingsUpdate): void`, `readonly settings: CalculatorSettings`.
- Produces: `div.kc-row-value#…-value`, `div.kc-row-error#…-error`, `span.kc-row-warning` and
  `div.kc-row-hint` (text in `span#…-hint`) in the row DOM; `aria-describedby` lists the ids of
  the parts that are rendered, in the order speech, value, error, hint; `aria-invalid="true"` on
  error rows and no `aria-invalid` attribute on other rows.

- [ ] **Step 1: Write the failing tests** in `row-results.test.tsx` (`getDefaultNormalizer` comes
      from `@testing-library/react`):

```tsx
// Testing Library's default normalizer collapses \s+, U+2009 included, so T-10 text is matched
// with whitespace collapsing off.
const keepSpaces = { normalizer: getDefaultNormalizer({ collapseWhitespace: false }) };

it("R-5 a numeric row shows its value below the math with NM-1, NM-2 and T-10 display and no fraction toggle", async () => {
  renderEditor(<ExpressionPanel {...panelProps()} />, {
    rows: ["\\frac{1}{3}", "12340+5", "2^{40}"],
  });
  expect(await screen.findByText("= 0.333333333333")).toBeInTheDocument();
  expect(await screen.findByText("= 12\u2009345", keepSpaces)).toBeInTheDocument(); // U+2009 (T-10)
  expect(await screen.findByText("= 1.09951162778×10^12")).toBeInTheDocument();
  expect(textbox(2)).toHaveAccessibleDescription(/ equals 12345$/);
  expect(screen.queryByRole("button", { name: /fraction|decimal/i })).toBeNull();
});

it("R-2 an error row shows the gutter marker, the message below the math, aria-invalid and no graph", () => {
  const kit = renderEditor(<ExpressionPanel {...panelProps()} />, { rows: ["y=2+"] });
  expect(rowItem("1").querySelector(".kc-row-gutter .kc-row-warning")).not.toBeNull();
  const message = within(rowItem("1")).getByText(
    "This can't be read. Check for a missing bracket or operator."
  );
  expect(textbox(1)).toHaveAttribute("aria-invalid", "true");
  expect(textbox(1).getAttribute("aria-describedby")!.split(" ")).toContain(message.id);
  expect(kit.engine.expressionAnalysis["1"]).toMatchObject({ isGraphable: false, isError: true });
});

it("A11Y-3 the value element and the error element are linked from the textbox by aria-describedby; only the error row is aria-invalid", async () => {
  renderEditor(<ExpressionPanel {...panelProps()} />, { rows: ["2+3", "y=2+"] });
  const [one, two] = [rowDomIds("1"), rowDomIds("2")];
  await screen.findByText("= 5");
  expect(textbox(1).getAttribute("aria-describedby")!.split(" ")).toEqual([one.speech, one.value]);
  expect(document.getElementById(one.value)).toHaveTextContent("equals 5");
  expect(textbox(1)).not.toHaveAttribute("aria-invalid");
  expect(textbox(2).getAttribute("aria-describedby")!.split(" ")).toEqual([two.speech, two.error]);
  expect(document.getElementById(two.error)).toHaveTextContent(
    "This can't be read. Check for a missing bracket or operator."
  );
  expect(textbox(2)).toHaveAttribute("aria-invalid", "true");
});

it("FN-16 a row whose only undefined name is i shows the complex-mode hint, whose action turns on complex mode (OI-4)", async () => {
  const kit = renderEditor(<ExpressionPanel {...panelProps()} />, { rows: ["2i", "a+i"] });
  expect(kit.engine.getSnapshot().rows.map((r) => r.chips)).toEqual([["i"], ["a", "i"]]);
  expect(within(rowItem("1")).getByText("Turn on complex mode to use i.")).toBeInTheDocument();
  expect(within(rowItem("2")).queryByText("Turn on complex mode to use i.")).toBeNull();
  expect(textbox(1)).not.toHaveAttribute("aria-invalid");
  await userEvent
    .setup()
    .click(within(rowItem("1")).getByRole("button", { name: "Turn on complex mode" }));
  expect(kit.engine.settings.complex).toBe(true);
  expect(await within(rowItem("1")).findByText("= 2i")).toBeInTheDocument();
  expect(fieldTextbox(kit.fields.forRow("1"))).toHaveFocus();
});
```

- [ ] **Step 2: Run them and see them fail.**
      `npx vitest run src/components/calculator-v2/ui/list/row-results.test.tsx`. Expected: FAIL,
      `Unable to find an element with the text: = 0.333333333333`, the same for A11Y-3's `= 5`,
      and the R-2 and FN-16 lookups.
- [ ] **Step 3: Implement the value, error and hint parts of `ExpressionRow` and their CSS.**
  - Value, when `row.valueText !== null` and `row.error === null`: `div.kc-row-value#value`
    holding `<span aria-hidden="true">= {groupIntegerDigits(row.valueText)}</span>` and
    `<span class="kc-visually-hidden">equals {row.valueText}</span>`, placed after the field and
    right-aligned (`text-align: end`).
  - Error, when `row.error !== null`: `div.kc-row-error#error` with `row.error.message` in
    `--kc-error`, `span.kc-row-warning` (lucide `TriangleAlert`, `aria-hidden`) in the gutter, and
    `aria-invalid="true"` on the textbox.
  - Hint, when `row.complexHint`: `div.kc-row-hint` with `span#hint` holding `COMPLEX_HINT.text`
    and a button `COMPLEX_HINT.action` that calls `updateSettings({ complex: true })`, then
    `focus.focusRow(row.id, "end")` (the hint unmounts with its button).
  - OI-4: in overview section 7.3, in the table row whose first cell is
    `RC-10, RC-13, NM-17, FN-16`, replace the third cell (the first line below) with the second
    line, then run
    `npx prettier --write docs/superpowers/specs/2026-10-16-karman-calculator-v2-design.md`:

```text
Phase 1 tests check the chip list, its order and the complex-mode hint on analysis output; chips, sliders and the hint's action render in Phase 2
Phase 1 tests check the chip list and its order on analysis output, and render the NM-17/FN-16 complex-mode hint with its "Turn on complex mode" action, which sets the S-5 checkbox (Phase 1, section 10.3 item 12); the chip buttons and sliders render in Phase 2
```

- [ ] **Step 4: Run them and see them pass.** Same command. Expected: PASS, 4 tests. Then
      `npx vitest run src/lib/calculator-v2/theme/no-raw-colours.test.ts`. Expected: PASS,
      7 tests (`list.css` now also reads `--kc-error`, a `ROLE_VARS` value).
- [ ] **Step 5: Commit.**

```bash
git add src/components/calculator-v2/ui/list src/components/calculator-v2/styles/list.css docs/superpowers/specs/2026-10-16-karman-calculator-v2-design.md
git commit -m "Show v2 row values, errors and the complex-mode hint action; resolve OI-4 (09 editor-ui)"
```
