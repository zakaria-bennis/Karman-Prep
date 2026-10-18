# 09 editor-ui, part 4 of 5: Functions panel and settings (Tasks 10 to 12)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

Part 4 of package `09-editor-ui.md`, which holds the package header, Working rules, Decisions,
Notes for consumers, the Row DOM and the ID coverage; they apply to every task here. Tasks run
in number order across the five parts. Paths that start with `ui/`, `styles/` or `icons/` are
under `src/components/calculator-v2/`.

---

### Task 10: Functions panel

**Files:**

- Create: `ui/keypad/FunctionsPanel.tsx`
- Modify: `ui/keypad/Keypad.tsx`, `styles/keypad.css`
- Test: `ui/keypad/FunctionsPanel.test.tsx`

**Interfaces:**

- Consumes: (02) `panelCategories(): readonly PanelCategory[]`, `CATEGORY_HEADINGS`,
  `PanelCategory { id; heading; entries }`, `PanelEntry { name; label; spoken; actions }`; Tasks
  1, 4, 8 and 9 (`editThroughKeypad`, `keypadTarget`, `EscapeContext`, `MotionContext`,
  `KeypadProps`, the `editor()` and `key()` helpers).
- Produces:

```ts
// ui/keypad/FunctionsPanel.tsx
export const FUNCTIONS_COVER_BELOW = 560; // L-1/L-2 threshold (10's LAYOUT_DESKTOP_MIN_WIDTH)
export function functionsPlacement(containerWidth: number): "above" | "cover"; // "cover" below 560
export interface FunctionsPanelProps {
  id: string; // aria-controls target of the Functions key
  placement: "above" | "cover"; // functionsPlacement(containerWidth) (Decisions)
  state: "open" | "closing";
  onInsert(entry: PanelEntry): void;
}
export function FunctionsPanel(props: FunctionsPanelProps): JSX.Element;
// div.kc-functions-panel[role=group][aria-label="Functions"][data-state][data-placement]; per
// category an h3 and a div[role=group][aria-labelledby=<h3 id>] of buttons (visible entry.label,
// aria-label entry.spoken)
```

- [ ] **Step 1: Write the failing tests** in `FunctionsPanel.test.tsx` (same `editor()` and
      `key()` helpers as Task 9; `panelButton` finds a button inside the open panel):

```tsx
afterEach(() => vi.useRealTimers());
const panelButton = (name: string) =>
  within(screen.getByRole("group", { name: "Functions" })).getByRole("button", {
    name,
    exact: true,
  });

it("K-4 Functions panel shows the shipped categories 1, 2 and 8 in K-4 order under CATEGORY_HEADINGS, category 8 holding exp, ln, log, logₐ only", async () => {
  expect(panelCategories().map((c) => c.id)).toEqual([1, 2, 8]);
  expect([CATEGORY_HEADINGS[0], CATEGORY_HEADINGS[1], CATEGORY_HEADINGS[7]]).toEqual([
    "Trig",
    "Inverse trig",
    "Calculus",
  ]);
  renderEditor(editor(), { rows: [""] });
  await userEvent.setup().click(key("Functions"));
  const panel = screen.getByRole("group", { name: "Functions" });
  expect(
    within(panel)
      .getAllByRole("heading")
      .map((h) => h.textContent)
  ).toEqual(["Trig", "Inverse trig", "Calculus"]);
  const labels = (heading: string) =>
    within(within(panel).getByRole("group", { name: heading }))
      .getAllByRole("button")
      .map((b) => b.textContent);
  expect(labels("Trig")).toEqual(["sin", "cos", "tan", "csc", "sec", "cot"]);
  expect(labels("Inverse trig")).toEqual(["sin⁻¹", "cos⁻¹", "tan⁻¹", "csc⁻¹", "sec⁻¹", "cot⁻¹"]);
  expect(labels("Calculus")).toEqual(["exp", "ln", "log", "logₐ"]);
});

it("K-4 the Functions panel covers the keypad area in containers under 560 px (stacked layout) and sits above the keypad from 560 px", async () => {
  expect(FUNCTIONS_COVER_BELOW).toBe(560);
  expect([0, 559, 560, 599, 900].map(functionsPlacement)).toEqual([
    "cover",
    "cover",
    "above",
    "above",
    "above",
  ]);
  for (const [width, placement] of [
    [559, "cover"],
    [560, "above"],
  ] as const) {
    renderEditor(<Keypad containerWidth={width} pointer="coarse" open onOpenChange={vi.fn()} />, {
      rows: [""],
    });
    await userEvent.setup().click(key("Functions"));
    expect(screen.getByRole("group", { name: "Functions" })).toHaveAttribute(
      "data-placement",
      placement
    );
    cleanup();
  }
});

it("A11Y-5 the Functions panel is a group named Functions, one heading per category, buttons named by their spoken text", async () => {
  renderEditor(editor(), { rows: [""] });
  await userEvent.setup().click(key("Functions"));
  const panel = screen.getByRole("group", { name: "Functions" });
  expect(key("Functions")).toHaveAttribute("aria-expanded", "true");
  expect(key("Functions")).toHaveAttribute("aria-controls", panel.id);
  for (const category of panelCategories()) {
    const group = within(panel).getByRole("group", { name: category.heading });
    expect(
      within(group)
        .getAllByRole("button")
        .map((b) => b.getAttribute("aria-label"))
    ).toEqual(category.entries.map((e) => e.spoken));
  }
});

it("K-5 a panel button inserts its template in one run call, closes the panel and returns focus to the row; Escape returns to the Functions key", async () => {
  const kit = renderEditor(editor(), { rows: [""] });
  const field = kit.fields.forRow("1");
  const user = userEvent.setup();
  act(() => kit.focus.focusRow("1", "end"));
  const [trig, , calculus] = panelCategories();
  await user.click(key("Functions"));
  field.calls = [];
  await user.click(key(trig.entries[0].spoken));
  expect(field.calls).toEqual([
    {
      method: "run",
      arg: [
        { op: "write", arg: "\\sin\\left(\\right)" },
        { op: "keystroke", arg: "Left" },
      ],
    },
    { method: "focus", arg: undefined },
  ]);
  expect(key("Functions")).toHaveAttribute("aria-expanded", "false");
  expect(fieldTextbox(field)).toHaveFocus();
  await user.click(key("Functions"));
  field.calls = [];
  await user.click(key(calculus.entries[3].spoken));
  expect(field.calls[0]).toEqual({
    method: "run",
    arg: [
      { op: "cmd", arg: "\\log" },
      { op: "cmd", arg: "_" },
    ],
  });
  await user.click(key("ABC"));
  await user.click(key("Functions"));
  within(screen.getByRole("group", { name: "Functions" }))
    .getAllByRole("button")[0]
    .focus();
  act(() => kit.pressEscape()); // one press closes only the panel, above the ABC page and keypad
  expect(screen.queryByRole("group", { name: "Functions" })).toBeNull();
  expect(key("Functions")).toHaveFocus();
  expect(key("ABC")).toHaveAttribute("aria-pressed", "true");
  expect(screen.getByRole("region", { name: "Keypad" })).toBeInTheDocument();
});

it("K-5 every shipped entry of categories 1, 2 and 8 inserts its own template in one run call and closes the panel", async () => {
  const kit = renderEditor(editor(), { rows: [""] });
  const field = kit.fields.forRow("1");
  const user = userEvent.setup();
  act(() => kit.focus.focusRow("1", "end"));
  const entries = panelCategories().flatMap((c) => c.entries);
  expect(entries).toHaveLength(16);
  for (const entry of entries) {
    await user.click(key("Functions"));
    field.calls = [];
    await user.click(panelButton(entry.spoken));
    expect(field.calls[0]).toEqual({ method: "run", arg: entry.actions });
    expect(screen.queryByRole("group", { name: "Functions" })).toBeNull();
    expect(fieldTextbox(field)).toHaveFocus();
  }
});

// 05 Task 11's T-9 browser test runs these actions in a real MathField, types x and gets \sin\left(x\right).
it("T-9 the functions panel's sin button inserts \\sin\\left(\\right) with the caret inside, so typing x gives \\sin\\left(x\\right)", async () => {
  const kit = renderEditor(editor(), { rows: [""] });
  const field = kit.fields.forRow("1");
  const user = userEvent.setup();
  act(() => kit.focus.focusRow("1", "end"));
  const sin = panelCategories()[0].entries[0];
  expect(sin.actions).toEqual([
    { op: "write", arg: "\\sin\\left(\\right)" },
    { op: "keystroke", arg: "Left" },
  ]);
  await user.click(key("Functions"));
  field.calls = [];
  await user.click(panelButton(sin.spoken));
  expect(field.calls.filter((c) => c.method === "run")).toEqual([
    { method: "run", arg: sin.actions },
  ]);
});

// No spec ID: AN-2's owning test is Task 14's browser test (package ID coverage note).
it("Functions panel lifecycle: a closing panel is inert at once and unmounts after its closing duration", () => {
  vi.useFakeTimers();
  renderEditor(editor(), { rows: [""], durationMs: 100 });
  fireEvent.click(key("Functions"));
  const panel = screen.getByRole("group", { name: "Functions" });
  expect(panel).toHaveAttribute("data-state", "open");
  expect(panel).not.toHaveAttribute("inert");
  fireEvent.click(key("Functions"));
  expect(panel).toHaveAttribute("data-state", "closing");
  expect(panel).toHaveAttribute("inert");
  expect(key("Functions")).toHaveAttribute("aria-expanded", "false");
  act(() => vi.advanceTimersByTime(99));
  expect(panel).toBeInTheDocument();
  act(() => vi.advanceTimersByTime(1));
  expect(panel).not.toBeInTheDocument();
});
```

- [ ] **Step 2: Run them and see them fail.**
      `npx vitest run src/components/calculator-v2/ui/keypad/FunctionsPanel.test.tsx`. Expected:
      FAIL with `Failed to resolve import "./FunctionsPanel"` (the file imports
      `FUNCTIONS_COVER_BELOW` and `functionsPlacement`).
- [ ] **Step 3: Implement `FunctionsPanel` and its place in `Keypad`.** The Functions key
      toggles `functionsState`: `closed` → `open` (pushes the `functions` escape layer) →
      `closing` → `closed`; a press while `closing` clears the timeout and goes back to `open`.
      A close (the key, an insert or Escape) first sets `closing`, which renders the panel with
      `data-state="closing"` and `inert` (so its buttons take no click, tap or focus while it
      fades) and removes the escape layer. A layout effect that runs once `closing` is committed
      reads `MotionContext(panel)`, so it gets the closing rule's duration (AN-2's 100 ms, Task
      14), not the open state's 200 ms: 0 goes straight to `closed` (the panel unmounts) in that
      layout effect; any other value sets one timeout of that many ms. The Functions key's
      `aria-expanded` is true only while `open`. The panel mounts with `data-state="enter"` and
      a layout effect forces a style flush and sets `open`, so AN-2's opening transition runs.
      `Keypad` passes `placement={functionsPlacement(containerWidth)}`, rendered as
      `data-placement`. `onInsert(entry)`: `editThroughKeypad(engine, announcer, rowId, field, (f) => f.run(entry.actions))`,
      close the panel, then `field.focus()` (the caret stays where the template put it, K-5). The
      escape layer's `close` also focuses the Functions key when focus was inside the panel,
      checked before `closing` makes the panel inert (a browser drops focus from an inert
      element). Panel buttons prevent `mousedown`. CSS: `.kc-keypad { position: relative }`;
      `.kc-functions-panel { position: absolute; overflow-y: auto; background: var(--kc-chrome) }`;
      `[data-placement="above"] { inset-inline: 0; bottom: 100%; max-height: 240px }` (directly
      above the keypad, scrolling when the categories are taller);
      `[data-placement="cover"] { inset: 0 }` (the keypad area); headings in
      `--kc-text-secondary` at `var(--kc-size-ui)`. Task 14's K-4 browser test measures both.
- [ ] **Step 4: Run them and see them pass.** Same command. Expected: PASS, 7 tests. Then
      `npx vitest run src/lib/calculator-v2/theme/no-raw-colours.test.ts`. Expected: PASS,
      4 tests.
- [ ] **Step 5: Commit.**

```bash
git add src/components/calculator-v2/ui/keypad src/components/calculator-v2/styles/keypad.css
git commit -m "Add the v2 Functions panel with the Phase 1 categories (09 editor-ui)"
```

### Task 11: Settings popover

**Files:**

- Create: `ui/settings/SettingsPopover.tsx`, `ui/settings/AxisSection.tsx`, `styles/settings.css`
- Test: `ui/settings/SettingsPopover.test.tsx`

**Interfaces:**

- Consumes: Tasks 1 and 3; (07) `updateSettings(partial: SettingsUpdate): void`, `settings`,
  `DEFAULT_SETTINGS`, `getSnapshot().viewport`; (04) `formatValueLatex(v: Value): string`;
  `MathFieldFactoryContext` for the four bound fields.
- Produces: `SettingsPopoverProps` and `SettingsPopover` exactly as 01 section 11, and
  `AxisSection(props: { axis: "x" | "y" }): JSX.Element` (`AxisSection.tsx`).

- [ ] **Step 1: Write the failing tests** in `SettingsPopover.test.tsx`:

```tsx
const ORDER = [
  ["checkbox", "Grid"],
  ["radio", "Cartesian"],
  ["radio", "Polar"],
  ["checkbox", "Arrows"],
  ["checkbox", "Axis numbers"],
  ["checkbox", "Minor gridlines"],
  ["checkbox", "Show x-axis"],
  ["textbox", "x-axis label"],
  ["textbox", "x minimum"],
  ["textbox", "x maximum"],
  ["textbox", "x-axis step"],
  ["checkbox", "Show y-axis"],
  ["textbox", "y-axis label"],
  ["textbox", "y minimum"],
  ["textbox", "y maximum"],
  ["textbox", "y-axis step"],
  ["checkbox", "Complex mode"],
  ["radio", "Radians"],
  ["radio", "Degrees"],
] as const;
const popover = (onClose: () => void = vi.fn()) => (
  <SettingsPopover
    anchor={document.body.appendChild(document.createElement("button"))}
    open
    onClose={onClose}
  />
);

it("S-1 the settings popover lists the Phase 1 controls in S-1 order", () => {
  renderEditor(popover(), { rows: [""] });
  const dialog = screen.getByRole("dialog", { name: "Graph settings" });
  const controls = ORDER.map(([role, name]) =>
    within(dialog).getByRole(role, { name, exact: true })
  );
  controls
    .slice(1)
    .forEach((el, i) =>
      expect(
        controls[i].compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING
      ).toBeTruthy()
    );
  const count = (role: string) => within(dialog).queryAllByRole(role).length;
  expect(count("checkbox") + count("radio") + count("textbox")).toBe(ORDER.length);
});

it("S-1 each display control writes its setting and Escape closes the popover", async () => {
  const onClose = vi.fn();
  const kit = renderEditor(popover(onClose), { rows: [""] });
  const user = userEvent.setup();
  const toggles = [
    ["Grid", "showGrid"],
    ["Arrows", "arrows"],
    ["Axis numbers", "axisNumbers"],
    ["Minor gridlines", "minorGridlines"],
  ] as const;
  for (const [name, setting] of toggles) {
    await user.click(screen.getByRole("checkbox", { name }));
    expect(kit.engine.settings[setting]).toBe(!DEFAULT_SETTINGS[setting]);
  }
  await user.click(screen.getByRole("radio", { name: "Polar" }));
  expect(kit.engine.settings.polarGrid).toBe(true);
  await user.click(screen.getByRole("checkbox", { name: "Show x-axis" }));
  expect(kit.engine.settings.xAxis.show).toBe(false);
  await user.type(screen.getByRole("textbox", { name: "x-axis label" }), "t{Enter}");
  expect(kit.engine.settings.xAxis.label).toBe("t");
  act(() => kit.pressEscape());
  expect(onClose).toHaveBeenCalledOnce();
});

it("S-5 Complex mode is off by default and switches complex evaluation", async () => {
  const kit = renderEditor(
    <>
      <ExpressionPanel {...panelProps()} />
      {popover()}
    </>,
    { rows: ["\\sqrt{-4}"] }
  );
  const box = screen.getByRole("checkbox", { name: "Complex mode" });
  expect(box).not.toBeChecked();
  expect(await screen.findByText("= undefined")).toBeInTheDocument();
  await userEvent.setup().click(box);
  expect(kit.engine.settings.complex).toBe(true);
  expect(await screen.findByText("= 2i")).toBeInTheDocument();
});

it("A11Y-15 no Braille setting is offered", () => {
  renderEditor(popover(), { rows: [""] });
  expect(screen.queryByText(/braille/i)).toBeNull();
  expect(screen.queryByRole("checkbox", { name: /braille/i })).toBeNull();
});

it("A11Y-2 changing Angle announces it once", async () => {
  const kit = renderEditor(popover(), { rows: [""] });
  expect(screen.getByRole("radio", { name: "Radians" })).toBeChecked();
  await userEvent.setup().click(screen.getByRole("radio", { name: "Degrees" }));
  expect(kit.engine.settings.angleMode).toBe("degrees");
  expect(kit.announcer.texts).toEqual(["Angle set to degrees."]);
});
```

- [ ] **Step 2: Run them and see them fail.**
      `npx vitest run src/components/calculator-v2/ui/settings/SettingsPopover.test.tsx`.
      Expected: FAIL with `Failed to resolve import "./SettingsPopover"`.
- [ ] **Step 3: Implement the popover, `AxisSection` and `settings.css`.**
  - `SettingsPopover` returns `null` while closed. It mounts `div.kc-settings` with
    `role="dialog"`, `aria-label="Graph settings"` and `data-state="enter"`, and a layout effect
    forces a style flush and sets `open`. When `open` turns false it renders
    `data-state="closing"` with `inert`; a layout effect that runs once `closing` is committed
    reads `MotionContext(el)` (the closing rule's duration, Task 15): 0 goes straight to closed
    (returns `null`, unmounting the dialog) in that layout effect, never through a timer; any
    other value sets one timeout of that many ms. While open it pushes the escape layer
    `popover` (close: `onClose()`, then `anchor.focus()`), and a `pointerdown` outside the
    popover and the anchor (checked with `composedPath()`) calls `onClose`.
  - Placement (S-1, "anchored to it"; Task 15's S-1 browser test measures it):
    `position: absolute`, `width: 320px; max-width: 100%`, in `--kc-key` with a `--kc-boundary`
    border. A layout effect measures `anchor.getBoundingClientRect()` and the popover's
    `offsetParent.getBoundingClientRect()` and sets `top` to the anchor's bottom edge and
    `right` to the parent's right edge minus the anchor's right edge, both relative to the offset
    parent, so the popover sits directly below the anchor with right edges aligned. When that
    would put its left edge left of the offset parent, `left: 0` replaces `right`. It is never
    moved up: `max-height` is the offset parent's height minus `top`, with `overflow-y: auto`.
    When `anchor` or `offsetParent` is null (jsdom has no layout, so the component tests take
    this path), the effect sets no position.
  - Controls in `ORDER`: Grid → `showGrid`; radio group `Grid type` (Cartesian, Polar) →
    `polarGrid`; Arrows → `arrows`; Axis numbers → `axisNumbers`; Minor gridlines →
    `minorGridlines`; then `AxisSection` for x and for y; Complex mode → `complex`; radio group
    `Angle` (Radians, Degrees) → `angleMode` plus `announce(EDITOR_MESSAGES.angle(mode))`. No
    Display size, Reverse contrast or More options (S-3, S-4 and S-8 are later phases) and no
    Braille control (A11Y-15).
  - `AxisSection`: checkbox `Show x-axis` → `xAxis.show`; text input `x-axis label` committed on
    blur or Enter → `xAxis.label`; the bounds line `[x minimum] ≤ x ≤ [x maximum]` as two
    MathFields from `MathFieldFactoryContext` (`ariaLabel` `x minimum` and `x maximum`,
    `maxLength: MAX_ROW_CHARACTERS`) showing `formatValueLatex({ type: "number", value })` of the
    viewport bound while not focused; text input `x-axis step` showing the step or blank. Task 12
    adds bound and step commits. Labels use `<label>` elements.
- [ ] **Step 4: Run them and see them pass.** Same command. Expected: PASS, 5 tests. Then
      `npx vitest run src/lib/calculator-v2/theme/no-raw-colours.test.ts`. Expected: PASS,
      4 tests.
- [ ] **Step 5: Commit.**

```bash
git add src/components/calculator-v2/ui/settings src/components/calculator-v2/styles/settings.css
git commit -m "Add the v2 settings popover with Phase 1 controls and complex mode (09 editor-ui)"
```

### Task 12: Axis bounds and step fields

**Files:**

- Create: `ui/settings/bounds.ts`
- Modify: `ui/settings/AxisSection.tsx`, `styles/settings.css`
- Test: `ui/settings/bounds.test.ts` (node), `ui/settings/AxisSection.test.tsx`

**Interfaces:**

- Consumes: (07) `HelperExpression(spec: { latex: string }): HelperExpression` with, exactly as
  01-interfaces-runtime section 8, `readonly numericValue: number`,
  `readonly listValue: number[] | undefined`,
  `observe(name: "numericValue" | "listValue", callback: () => void): () => void`,
  `unobserve(name: "numericValue" | "listValue", callback?: () => void): void` and
  `destroy(): void` (this task observes only `"numericValue"`); `setMathBounds(bounds: Viewport): void`;
  `updateSettings({ xAxis: AxisSettings })`; (06) `Viewport`.
- Produces: `evaluateBoundLatex(engine: Pick<CalculatorEngine, "HelperExpression">, latex: string, timeoutMs?: number): Promise<number | null>`
  exactly as 01 section 11 (default 1000 ms; first result, finite number or `null`; `null` on
  timeout; destroys the helper either way).

- [ ] **Step 1: Write the failing tests.** `bounds.test.ts`:

```ts
afterEach(() => vi.useRealTimers());

it("S-7 evaluateBoundLatex returns finite values and null for undefined or non-numeric input", async () => {
  const engine = createEngine(undefined, { backend: createMainThreadBackend() });
  expect(await evaluateBoundLatex(engine, "2\\pi")).toBeCloseTo(6.283185307179586, 12);
  expect(await evaluateBoundLatex(engine, "-\\frac{15}{2}")).toBe(-7.5);
  expect(await evaluateBoundLatex(engine, "\\frac{1}{0}")).toBeNull();
  expect(await evaluateBoundLatex(engine, "x")).toBeNull();
});

it("S-7 evaluateBoundLatex gives null after the timeout and destroys the helper", async () => {
  vi.useFakeTimers();
  const destroy = vi.fn();
  const helper = {
    numericValue: NaN,
    listValue: undefined,
    observe: () => () => undefined,
    unobserve() {},
    destroy,
  };
  const pending = evaluateBoundLatex({ HelperExpression: () => helper }, "1", 1000);
  vi.advanceTimersByTime(1000);
  expect(await pending).toBeNull();
  expect(destroy).toHaveBeenCalledOnce();
});
```

`AxisSection.test.tsx` (same `popover()` helper as Task 11):

```tsx
it("S-7 bounds apply on Enter or blur and keep min below max; the step takes a positive number or blank", async () => {
  const kit = renderEditor(popover(), { rows: [""] });
  const user = userEvent.setup();
  const [min, max] = [kit.fields.byLabel("x minimum"), kit.fields.byLabel("x maximum")];
  expect(min.latex()).toBe("-10");
  act(() => {
    max.emitEdit("2\\pi");
    max.options.onEnter();
  });
  await waitFor(() =>
    expect(kit.engine.getSnapshot().viewport.right).toBeCloseTo(6.283185307179586, 12)
  );
  expect(kit.engine.getSnapshot().viewport.left).toBe(-10);
  act(() => {
    min.emitEdit("7");
    min.options.onBlur();
  });
  expect(await screen.findByText(EDITOR_MESSAGES.boundOrder)).toBeInTheDocument();
  expect(fieldTextbox(min)).toHaveAttribute("aria-invalid", "true");
  expect(kit.engine.getSnapshot().viewport.left).toBe(-10);
  act(() => {
    min.emitEdit("\\frac{1}{0}");
    min.options.onEnter();
  });
  expect(await screen.findByText(EDITOR_MESSAGES.boundNotNumber)).toBeInTheDocument();
  const step = screen.getByRole("textbox", { name: "x-axis step" });
  await user.type(step, "0{Enter}");
  expect(screen.getByText(EDITOR_MESSAGES.stepInvalid)).toBeInTheDocument();
  expect(kit.engine.settings.xAxis.step).toBeNull();
  await user.clear(step);
  await user.type(step, "2{Enter}");
  expect(kit.engine.settings.xAxis.step).toBe(2);
  await user.clear(step);
  await user.type(step, "{Enter}");
  expect(kit.engine.settings.xAxis.step).toBeNull();
});
```

- [ ] **Step 2: Run them and see them fail.** `npx vitest run src/components/calculator-v2/ui/settings`.
      Expected: FAIL. `bounds.test.ts` fails with `Failed to resolve import "./bounds"`. The S-7
      component test fails first at its `waitFor`: Task 11's bound fields do not commit, so
      after the 1,000 ms default timeout `viewport.right` is still 10 and `toBeCloseTo` reports
      `expected 10 to be close to 6.283185307179586`.
- [ ] **Step 3: Implement `evaluateBoundLatex` and the commits in `AxisSection`.**
  - `evaluateBoundLatex`: create the helper, resolve on the first `numericValue` callback
    (`Number.isFinite(v) ? v : null`) or `null` after `timeoutMs` (global `setTimeout`),
    unobserve and `destroy()` once. It never evaluates on the main thread (AR-51).
  - A bound field commits on its `onEnter` or `onBlur` when its latex differs from the displayed
    value: `evaluateBoundLatex` → `null` shows `boundNotNumber`; otherwise the current viewport
    with that bound replaced goes to `setMathBounds` when `left < right` and `bottom < top`, else
    `boundOrder` shows and the view is unchanged. The message element (an id inside the popover)
    is linked from that field's textbox by `aria-describedby`, which also gets
    `aria-invalid="true"`; a successful commit clears both.
  - The step input commits on blur or Enter. Its text is parsed as
    `const text = input.value.trim(); const v = Number(text);`: `text === ""` → `step: null`
    (automatic); `Number.isFinite(v) && v > 0` → `step: v` (so `2`, `0.5` and `1e3` are accepted);
    anything else (`0`, `-1`, `abc`, `Infinity`) shows `stepInvalid` linked the same way and
    changes nothing. The commit writes
    `updateSettings({ xAxis: { ...settings.xAxis, step } })` (y likewise).
- [ ] **Step 4: Run them and see them pass.** Same command. Expected: PASS, 3 tests. Then
      `npx vitest run src/lib/calculator-v2/theme/no-raw-colours.test.ts`. Expected: PASS,
      4 tests.
- [ ] **Step 5: Commit.**

```bash
git add src/components/calculator-v2/ui/settings src/components/calculator-v2/styles/settings.css
git commit -m "Add v2 axis bound and step fields evaluated in the worker (09 editor-ui)"
```
