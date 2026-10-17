# 13 paste-standalone, part 3 of 5: help popover, title-bar controls, Math to paste and CalculatorChrome (Tasks 6 to 8)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

Part 3 of package `13-paste-standalone.md`, which holds the package header, the Consumes list,
the package-internal names, the DOM contract, the Decisions and the Notes for the lead; they apply
to every task here. Tasks run in number order across the five parts; each part starts where the
previous one ends.

---

### Task 6: Help content, the shortcuts popover and the title-bar controls (KB-1, L-12; A11Y-7 contribution)

**Files:**

- Create: `src/components/calculator-v2/chrome/help-content.ts`, `src/components/calculator-v2/chrome/chrome-styles.ts`, `src/components/calculator-v2/chrome/ShortcutsPopover.tsx`, `src/components/calculator-v2/chrome/ShortcutsPopover.test.tsx`, `src/components/calculator-v2/chrome/TitleBarControls.tsx`, `src/components/calculator-v2/chrome/TitleBarControls.test.tsx`

**Interfaces:**

- Consumes:
  - 02 (`src/lib/calculator-v2/core/latex/operator-names.ts`, relative import `../../../lib/calculator-v2/core/latex/operator-names` in `help-content.ts`, which Playwright specs import): `export const SHIPPED_PHASE: 1;`.
  - 09 (`src/components/calculator-v2/ui/focus/escape-stack.ts`): `interface EscapeLayer { id: string; close(): void }`, `interface EscapeStack { push(layer: EscapeLayer): () => void; handleEscape(): boolean }`, `function createEscapeStack(): EscapeStack`, `const EscapeContext: React.Context<EscapeStack | null>`.
  - 11 (`src/components/calculator/CalculatorWindow.tsx`, `src/components/calculator/calculator-window-store.ts`): `function CalculatorWindow(props: CalculatorWindowProps): JSX.Element` with `CalculatorWindowProps { mode: WindowMode; dockTop: number; dockWidth: number; floatingRect: WindowRect; onModeChange(mode: WindowMode): void; onFloatingRectChange(rect: WindowRect): void; onDockWidthChange(width: number): void; onClose(): void; onMinimize(): void; onFocusBoundary(edge: "first" | "last"): void; frameRef: React.RefObject<HTMLDivElement | null>; chromeSlotRef: React.RefObject<HTMLDivElement | null>; children: React.ReactNode }`; `type WindowMode = "floating" | "docked" | "maximized" | "fullscreen"`; `calculatorWindowStore.resetForTests(): void`.
- Produces: section 15 `TitleBarControlsProps { hostId: string; shortcutsOpen: boolean; onPaste(): void; onToggleShortcuts(): void }`, `TitleBarControls(props: TitleBarControlsProps): JSX.Element`, `ShortcutsPopover(props: { open: boolean; onClose(): void }): JSX.Element | null`; the package-internal help names and `CHROME_STYLES` (`13-paste-standalone.md`).

`help-content.ts` copy (exact):

- `SHORTCUT_ROWS`, in order, as `{ keys, where, action, phase }`:
  `Enter` / `expression row` / `new row below` / 1; `Alt+Enter` / `anywhere in the calculator` / `new expression row at the end, focused` / 1; `Up, Down` / `row, caret at top or bottom edge` / `previous or next row` / 1; `Ctrl/Cmd+Z` / `anywhere in the calculator` / `undo` / 1; `Ctrl/Cmd+Shift+Z, Ctrl+Y` / `anywhere in the calculator` / `redo` / 1; `Ctrl+K or Alt/Option+K` / `graphing calculator` / `show or hide the keypad` / 1; `Escape` / `anywhere in the calculator` / `close the top layer: an open menu or popover, the Functions panel, the ABC page, the keypad, then the calculator` / 1; `Arrow keys` / `graph focused` / `pan by 10% of the visible range` / 1; `+ or =, −` / `graph focused` / `zoom in (range x 0.8) or out (range x 1.25) about the centre` / 1; `Home` / `graph focused` / `default view` / 1; `Alt/Option+Shift+C` / `docked or floating calculator` / `move focus between calculator and question` / 2; `Alt/Option+T` / `row or graph focused` / `start or stop audio trace` / 4.
- `HELP_EXAMPLES`: `y=x^2` "graphs a parabola"; `f(x)=2x+1` "defines a function and graphs it"; `x=3` "draws a vertical line"; `(2,3)` "plots a point".
- `HELP_PASTE` (decision 1): "Paste math with the Paste button in the title bar, or with Ctrl+V (Cmd+V on a Mac) in a row. In a row, a single line is pasted at the caret; several lines, and anything pasted with the Paste button, become new rows. Figures, images and tables can't be pasted."
- `HELP_LIMITS`: "Curves that only touch zero, such as (y-x)^2=0, and single solution points, such as x^2+y^2=0, may not draw."; "Where an implicit curve crosses itself, as in a figure eight, the crossing may show a gap of up to 2 pixels."; "Parts of an implicit curve less than 1 pixel across may not draw."; "Whole numbers larger than 2^53 lose precision."

- [ ] **Step 1: Write the failing tests** (both files start `// @vitest-environment jsdom`)

```tsx
// ShortcutsPopover.test.tsx
import { fireEvent, render, screen, within } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { EscapeContext, createEscapeStack } from "../ui/focus/escape-stack";
import { CHROME_STYLES } from "./chrome-styles";
import {
  HELP_EXAMPLES,
  HELP_LIMITS,
  HELP_PASTE,
  SHORTCUT_ROWS,
  shippedShortcutRows,
} from "./help-content";
import { ShortcutsPopover } from "./ShortcutsPopover";
function renderPopover(open = true) {
  const escape = createEscapeStack();
  const onClose = vi.fn();
  render(
    <EscapeContext.Provider value={escape}>
      <ShortcutsPopover open={open} onClose={onClose} />
    </EscapeContext.Provider>
  );
  return { escape, onClose };
}
it("KB-1 the popover lists every Phase 1 shortcut in table order and none from later phases", () => {
  renderPopover();
  const dialog = screen.getByRole("dialog", { name: "Keyboard shortcuts and help" });
  const body = within(dialog)
    .getAllByRole("row")
    .slice(1)
    .map((r) =>
      within(r)
        .getAllByRole("cell")
        .map((c) => c.textContent)
    );
  expect(body).toEqual(shippedShortcutRows().map((r) => [r.keys, r.where, r.action]));
  // appendix E section 6, word for word except decision 9's Enter, Escape and Alt/Option+T text
  const E = "anywhere in the calculator";
  const G = "graph focused";
  expect(SHORTCUT_ROWS.map((r) => [r.keys, r.where, r.action, r.phase])).toEqual([
    ["Enter", "expression row", "new row below", 1],
    ["Alt+Enter", E, "new expression row at the end, focused", 1],
    ["Up, Down", "row, caret at top or bottom edge", "previous or next row", 1],
    ["Ctrl/Cmd+Z", E, "undo", 1],
    ["Ctrl/Cmd+Shift+Z, Ctrl+Y", E, "redo", 1],
    ["Ctrl+K or Alt/Option+K", "graphing calculator", "show or hide the keypad", 1],
    [
      "Escape",
      E,
      "close the top layer: an open menu or popover, the Functions panel, the ABC page, the keypad, then the calculator",
      1,
    ],
    ["Arrow keys", G, "pan by 10% of the visible range", 1],
    ["+ or =, −", G, "zoom in (range x 0.8) or out (range x 1.25) about the centre", 1],
    ["Home", G, "default view", 1],
    [
      "Alt/Option+Shift+C",
      "docked or floating calculator",
      "move focus between calculator and question",
      2,
    ],
    ["Alt/Option+T", "row or graph focused", "start or stop audio trace", 4],
  ]);
  expect(shippedShortcutRows()).toEqual(SHORTCUT_ROWS.slice(0, 10));
  expect(shippedShortcutRows(4)).toHaveLength(12);
  expect(dialog.textContent).not.toMatch(/Alt\/Option\+(?:Shift\+C|T)\b/);
});
it("KB-1 the popover shows the example rows, the Paste button and the documented limits", () => {
  renderPopover();
  const text = screen.getByRole("dialog").textContent!;
  expect(HELP_EXAMPLES).toEqual([
    { row: "y=x^2", meaning: "graphs a parabola" },
    { row: "f(x)=2x+1", meaning: "defines a function and graphs it" },
    { row: "x=3", meaning: "draws a vertical line" },
    { row: "(2,3)", meaning: "plots a point" },
  ]);
  expect(HELP_PASTE).toBe(
    "Paste math with the Paste button in the title bar, or with Ctrl+V (Cmd+V on a Mac) in a row. In a row, a single line is pasted at the caret; several lines, and anything pasted with the Paste button, become new rows. Figures, images and tables can't be pasted."
  );
  // a-math-semantics.md section 5.6: 2 pixels, 1 pixel and 2^53
  expect(HELP_LIMITS).toEqual([
    "Curves that only touch zero, such as (y-x)^2=0, and single solution points, such as x^2+y^2=0, may not draw.",
    "Where an implicit curve crosses itself, as in a figure eight, the crossing may show a gap of up to 2 pixels.",
    "Parts of an implicit curve less than 1 pixel across may not draw.",
    "Whole numbers larger than 2^53 lose precision.",
  ]);
  const examples = HELP_EXAMPLES.map((e) => `${e.row} ${e.meaning}`);
  for (const piece of [...examples, HELP_PASTE, ...HELP_LIMITS]) expect(text).toContain(piece);
  expect(JSON.stringify(CHROME_STYLES)).not.toMatch(/#[0-9a-f]{3,8}\b|rgba?\(|hsla?\(/i);
  // decision 10: the frame is the layers' containing block; only the layers take pointer input
  expect([
    CHROME_STYLES.frame.position,
    CHROME_STYLES.layers.position,
    CHROME_STYLES.layers.pointerEvents,
    CHROME_STYLES.layer.pointerEvents,
  ]).toEqual(["relative", "absolute", "none", "auto"]);
});
it("KB-1 Escape closes the popover as the top layer; the Close button closes it; closed renders nothing", () => {
  const { escape, onClose } = renderPopover();
  expect(screen.getByRole("dialog")).toHaveFocus();
  expect(escape.handleEscape()).toBe(true);
  fireEvent.click(screen.getByRole("button", { name: "Close" }));
  expect(onClose).toHaveBeenCalledTimes(2);
});
it("KB-1 a closed popover renders nothing and registers no Escape layer", () => {
  const { escape } = renderPopover(false);
  expect([screen.queryByRole("dialog"), escape.handleEscape()]).toEqual([null, false]);
});
```

```tsx
// TitleBarControls.test.tsx
import { createPortal } from "react-dom";
import { useLayoutEffect, useRef, useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { CalculatorWindow } from "@/components/calculator/CalculatorWindow";
import {
  calculatorWindowStore,
  type WindowMode,
} from "@/components/calculator/calculator-window-store";
import { TitleBarControls } from "./TitleBarControls";
const handlers = { onPaste: vi.fn(), onToggleShortcuts: vi.fn() };
function Harness({
  mode,
  shortcutsOpen = false,
  hostId = "karman-calculator-host-7",
}: {
  mode: WindowMode;
  shortcutsOpen?: boolean;
  hostId?: string;
}) {
  const frameRef = useRef<HTMLDivElement | null>(null);
  const chromeSlotRef = useRef<HTMLDivElement | null>(null);
  const [slot, setSlot] = useState<HTMLElement | null>(null);
  useLayoutEffect(() => setSlot(chromeSlotRef.current), []);
  const noop = () => {};
  return (
    <CalculatorWindow
      mode={mode}
      dockTop={12}
      dockWidth={576}
      floatingRect={{ x: 16, y: 64, width: 880, height: 600 }}
      onModeChange={noop}
      onFloatingRectChange={noop}
      onDockWidthChange={noop}
      onClose={noop}
      onMinimize={noop}
      onFocusBoundary={noop}
      frameRef={frameRef}
      chromeSlotRef={chromeSlotRef}
    >
      <div id="karman-calculator-host-7" />
      {slot &&
        createPortal(
          <TitleBarControls hostId={hostId} shortcutsOpen={shortcutsOpen} {...handlers} />,
          slot
        )}
    </CalculatorWindow>
  );
}
beforeEach(() => {
  vi.clearAllMocks();
  calculatorWindowStore.resetForTests();
  Object.assign(window, { innerWidth: 1280, innerHeight: 800 });
});
it.each([
  ["floating", ["Maximize calculator", "Minimize calculator"]],
  ["docked", ["Undock calculator", "Maximize calculator", "Minimize calculator"]],
  ["maximized", ["Restore calculator size", "Minimize calculator"]],
  ["fullscreen", []],
] as const)(
  "L-12 the %s title bar holds the label, Paste, Keyboard shortcuts, the mode's window controls and Close, with no mode control",
  (mode, controls) => {
    render(<Harness mode={mode} />);
    const bar = document.querySelector("[data-calculator-titlebar]")!;
    const slot = document.querySelector("[data-calculator-title-slot]")!;
    // 11's DOM contract: the label is the move handle, first in the bar and before the slot; it
    // has role="button" only while floating (plain text in the other modes, 11's A11Y-6 test)
    const label = bar.firstElementChild!;
    expect([
      label.textContent!.trim(),
      label.getAttribute("role"),
      Boolean(label.compareDocumentPosition(slot) & Node.DOCUMENT_POSITION_FOLLOWING),
    ]).toEqual(["Karman calculator", mode === "floating" ? "button" : null, true]);
    const names = [...bar.querySelectorAll("button")].map(
      (b) => b.getAttribute("aria-label") ?? b.textContent!.trim()
    );
    expect(names).toEqual([
      "Paste into calculator",
      "Keyboard shortcuts and help",
      ...controls,
      "Close calculator",
    ]);
    for (const b of slot.querySelectorAll("button"))
      expect([b.parentElement, b.getAttribute("class"), b.getAttribute("style")]).toEqual([
        slot,
        null,
        null,
      ]);
  }
);
it("L-12 Paste and Keyboard shortcuts call their handlers", () => {
  render(<Harness mode="floating" />);
  fireEvent.click(screen.getByRole("button", { name: "Paste into calculator" }));
  fireEvent.click(screen.getByRole("button", { name: "Keyboard shortcuts and help" }));
  expect([
    handlers.onPaste.mock.calls.length,
    handlers.onToggleShortcuts.mock.calls.length,
  ]).toEqual([1, 1]);
});
it("A11Y-7 the Keyboard shortcuts button uses aria-expanded and aria-controls naming the shadow host", () => {
  const { rerender } = render(<Harness mode="floating" />);
  const help = screen.getByRole("button", { name: "Keyboard shortcuts and help" });
  expect([
    help.getAttribute("aria-controls"),
    help.getAttribute("aria-expanded"),
    help.getAttribute("aria-haspopup"),
  ]).toEqual(["karman-calculator-host-7", "false", "dialog"]);
  expect(document.getElementById(help.getAttribute("aria-controls")!)).not.toBeNull();
  rerender(<Harness mode="floating" shortcutsOpen />);
  expect(help).toHaveAttribute("aria-expanded", "true");
  expect(screen.getByRole("button", { name: "Paste into calculator" })).not.toHaveAttribute(
    "aria-controls"
  );
  rerender(<Harness mode="floating" hostId="" />); // an unnamed host: no empty id reference
  expect(help).not.toHaveAttribute("aria-controls");
});
```

- [ ] **Step 2: Run them and see them fail** — `npx vitest run src/components/calculator-v2/chrome/ShortcutsPopover.test.tsx src/components/calculator-v2/chrome/TitleBarControls.test.tsx`; Expected: FAIL, `Failed to resolve import "./help-content"` and `"./TitleBarControls"`.
- [ ] **Step 3: Implement** per the DOM contract.
  - `ShortcutsPopover`: returns `null` when closed. When open, it focuses its dialog element in an effect and registers `escape.push({ id: "shortcuts", close: onClose })` through `useContext(EscapeContext)`; the effect's cleanup removes the layer. Headings "Keyboard shortcuts and help" (`h2`), then "Shortcuts", "Examples", "Pasting" and "Limits" (`h3`). Examples render each `row` in a `code` element followed by " " and its `meaning`. All copy comes from `help-content.ts` inside `{}` (`react/no-unescaped-entities`).
  - `CHROME_STYLES` (`src/components/calculator-v2/chrome/chrome-styles.ts`), using only `var(--kc-*)` (decision 10):
    - `frame`: `position: "relative"`, `inlineSize: "100%"`, `blockSize: "100%"`.
    - `layers`: `position: "absolute"`, `inset: 0`, `zIndex: 3`, `pointerEvents: "none"`.
    - `layer`: `position: "absolute"`, `insetBlockStart: 8`, `insetInlineEnd: 8`, `pointerEvents: "auto"`, `inlineSize: "min(360px, calc(100% - 16px))"`, `maxBlockSize: "calc(100% - 16px)"`, `overflowY: "auto"`, `overflowX: "hidden"`, `padding: 12`, `background: "var(--kc-list)"`, `color: "var(--kc-text)"`, `border: "1px solid var(--kc-boundary)"`, `borderRadius: 8`.
    - `table`: `inlineSize: "100%"`, `tableLayout: "fixed"`, `borderCollapse: "collapse"`, `overflowWrap: "anywhere"`.
    - `cell`: `padding: "4px 6px"`, `verticalAlign: "top"`, `borderBlockStart: "1px solid var(--kc-grid-major)"`.
    - `heading`: `margin: "8px 0 4px"`, `fontSize: "var(--kc-size-ui)"`.
    - `actions`: `display: "flex"`, `gap: 8`, `justifyContent: "flex-end"`, `marginBlockStart: 8`.
  - `TitleBarControls`: a fragment with the two buttons of the DOM contract (`onClick={onPaste}`, `onClick={onToggleShortcuts}`, `aria-controls={hostId || undefined}`, lucide icons `size={18}`).
- [ ] **Step 4: Run them and see them pass** — Step 2's command; Expected: PASS (10 tests: 4 popover, 4 L-12 modes, 1 handler, 1 A11Y-7).
- [ ] **Step 5: Commit** — `git add src/components/calculator-v2/chrome && git commit -m "Add the title-bar Paste and Keyboard shortcuts controls and the help popover (L-12, KB-1)"`

### Task 7: Math to paste box (L-13)

**Files:**

- Create: `src/components/calculator-v2/chrome/MathToPaste.tsx`, `src/components/calculator-v2/chrome/MathToPaste.test.tsx`

**Interfaces:**

- Consumes: 09 (`src/components/calculator-v2/ui/focus/escape-stack.ts`): `const EscapeContext: React.Context<EscapeStack | null>`, `function createEscapeStack(): EscapeStack`, `EscapeStack.push(layer: EscapeLayer): () => void`, `EscapeStack.handleEscape(): boolean`; task 6 (`src/components/calculator-v2/chrome/help-content.ts`, `chrome-styles.ts`): `MATH_TO_PASTE: { label: "Math to paste"; insert: "Insert"; cancel: "Cancel" }`, `CHROME_STYLES` (keys `layer` and `actions` here).
- Produces: `MathToPasteProps { open: boolean; onInsert(text: string): void; onCancel(): void }`, `MathToPaste(props: MathToPasteProps): JSX.Element | null`.

- [ ] **Step 1: Write the failing test** (first line `// @vitest-environment jsdom`)

```tsx
it("L-13 Math to paste is a labelled text box with Insert and Cancel; it is an Escape layer", () => {
  const escape = createEscapeStack();
  const onInsert = vi.fn();
  const onCancel = vi.fn();
  const { rerender } = render(
    <EscapeContext.Provider value={escape}>
      <MathToPaste open onInsert={onInsert} onCancel={onCancel} />
    </EscapeContext.Provider>
  );
  const box = screen.getByRole("textbox", { name: "Math to paste" });
  const insert = screen.getByRole("button", { name: "Insert" });
  expect([document.activeElement === box, insert.hasAttribute("disabled")]).toEqual([true, true]);
  fireEvent.change(box, { target: { value: "y=2x\n(1,2)" } });
  fireEvent.click(insert);
  expect(onInsert).toHaveBeenCalledWith("y=2x\n(1,2)");
  fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
  expect(escape.handleEscape()).toBe(true);
  expect(onCancel).toHaveBeenCalledTimes(2);
  rerender(
    <EscapeContext.Provider value={escape}>
      <MathToPaste open={false} onInsert={onInsert} onCancel={onCancel} />
    </EscapeContext.Provider>
  );
  expect([screen.queryByRole("textbox"), escape.handleEscape()]).toEqual([null, false]);
});
```

- [ ] **Step 2: Run it and see it fail** — `npx vitest run src/components/calculator-v2/chrome/MathToPaste.test.tsx`; Expected: FAIL, `Failed to resolve import "./MathToPaste"`.
- [ ] **Step 3: Implement** per the DOM contract: local `value` state reset to `""` on each open; the textarea (`rows={3}`, `spellCheck={false}`, `autoCapitalize="off"`) focused in an effect on open; Insert disabled while `value.trim()` is empty and calls `onInsert(value)`; Cancel calls `onCancel`; while open, `escape.push({ id: "paste-box", close: onCancel })`. Styles: `CHROME_STYLES.layer` and `CHROME_STYLES.actions`.
- [ ] **Step 4: Run it and see it pass** — Step 2's command; Expected: PASS (1 test).
- [ ] **Step 5: Commit** — `git add src/components/calculator-v2/chrome && git commit -m "Add the Math to paste fallback box (L-13)"`

### Task 8: CalculatorChrome and the App edit (T-5, L-13, KB-1, CB-1)

**Files:**

- Create: `src/components/calculator-v2/chrome/CalculatorChrome.tsx`, `src/components/calculator-v2/chrome/CalculatorChrome.test.tsx`, `src/components/calculator-v2/chrome/content-blocks.test.tsx`
- Modify: `src/components/calculator-v2/ui/App.tsx` (extension edit, index 5.2)

**Interfaces:**

- Consumes:
  - Tasks 1 to 7: `extractClipboardText`, `readSystemClipboard`, `PASTE_MESSAGES`, `planPaste`, `applyPastePlan`, `PasteEffects`, `trackFields`, `fieldFor`, `installClipboardBridge`, `TitleBarControls`, `ShortcutsPopover`, `MathToPaste`, `CHROME_STYLES` (signatures in `13-paste-standalone.md` and section 15).
  - 07: `function useEngine(): CalculatorEngine` (`src/components/calculator-v2/ui/hooks/use-engine.ts`); `CalculatorEngine.getExpressions(): ExpressionState[]`; `class KarmanCalculatorError extends Error { readonly code: "invalid-argument" | "unsupported" | "destroyed" }` (`src/lib/calculator-v2/core/api/errors.ts`); `ExpressionState` (`src/lib/calculator-v2/core/api/types.ts`); `function installDomStubs(): () => void` (`src/components/calculator-v2/__fixtures__/dom-stubs.ts`).
  - 09: `const FocusContext: React.Context<FocusController | null>` with `FocusController.focusRow(rowId: string, caret: "start" | "end"): void` and `activateRow(rowId: string): void` (`ui/focus/focus-controller.ts`); `const EscapeContext: React.Context<EscapeStack | null>`; `type MathFieldFactory = (host: HTMLElement, options: MathFieldOptions) => MathField` and `const MathFieldFactoryContext: React.Context<MathFieldFactory>` (`ui/list/math-field-factory.ts`); `function rowDomIds(rowId: string): RowDomIds` with `RowDomIds { label: string; speech: string; value: string; error: string; hint: string }` (`ui/list/row-model.ts`).
  - 05: `function useAnnouncer(): Announcer` with `Announcer.announce(text: string, options?: AnnounceOptions): void` (`ui/a11y/announcer.ts`).
  - 10: `function whenFieldReady(focus: Pick<FocusController, "field">, rowId: string, run: (field: MathField) => void, schedule?: (callback: () => void) => void): () => void` (`ui/controller/when-field-ready.ts`); `class KarmanCalculator { constructor(element: HTMLElement, options?: CalculatorOptions, hooks?: HostHooks) }` with `HostHooks { chromeSlot?: HTMLElement; announceResetOnMount?: boolean }` (`src/components/calculator-v2/KarmanCalculator.ts`); `AppProps { engine: CalculatorEngine; host: HTMLElement; store: ShellStore; focus: FocusController; escape: EscapeStack; announcer: Announcer; chromeSlot: HTMLElement | null }` and `ShellState.pointer: Pointer` (`ui/App.tsx`, `ui/controller/shell-store.ts`).
- Produces: `CalculatorChromeProps`, `CalculatorChrome(props: CalculatorChromeProps): JSX.Element`; App renders `<CalculatorChrome host={host} chromeSlot={chromeSlot} pointer={shell.pointer}>` around its `CalculatorLayout`, where `shell` is the `ShellState` App already reads with `useSyncExternalStore(store.subscribe, store.get)` (10, Task 4) and `host` and `chromeSlot` are its `AppProps`.

Paths in this list that start with `ui/` are under `src/components/calculator-v2/`.

- [ ] **Step 1: Write the failing tests** (both files start `// @vitest-environment jsdom` and copy
      the helpers below that they use; a helper a file does not use is left out, so
      `no-unused-vars` stays clean: `content-blocks.test.tsx` needs neither `R` nor `setClipboard`,
      `CalculatorChrome.test.tsx` does not need `status`)

```tsx
import { act, fireEvent, within } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { KarmanCalculator } from "../KarmanCalculator";
import { installDomStubs } from "../__fixtures__/dom-stubs";
import { fieldFor } from "./field-registry";
const R = String.raw;
let restore = () => {};
const mounted: KarmanCalculator[] = [];
beforeEach(() => {
  restore = installDomStubs();
});
afterEach(() => {
  mounted.splice(0).forEach((c) => c.destroy());
  restore();
  document.body.replaceChildren();
});
function mount(rows: string[], withSlot = false) {
  const el = document.body.appendChild(document.createElement("div"));
  el.id = "kc-host-test"; // A11Y-7: the Keyboard shortcuts button's aria-controls target
  const chromeSlot = withSlot
    ? document.body.appendChild(document.createElement("div"))
    : undefined;
  const calc = new KarmanCalculator(el, undefined, { chromeSlot });
  mounted.push(calc);
  calc.setExpressions(rows.map((latex, i) => ({ id: String(i + 1), latex })));
  return { el, calc, chromeSlot, shadow: el.shadowRoot as unknown as HTMLElement };
}
const textarea = (el: HTMLElement, id: string) =>
  el.shadowRoot!.querySelector<HTMLTextAreaElement>(`[data-row-id="${id}"] textarea`);
async function field(el: HTMLElement, id: string) {
  await vi.waitFor(() => expect(textarea(el, id)).not.toBeNull());
  return fieldFor(textarea(el, id))!;
}
// like a browser DataTransfer: a file is "Files" in types; its MIME type is on items and files
function transfer(initial: Record<string, string> = {}, fileTypes: string[] = []) {
  const map = new Map(Object.entries(initial));
  const files = fileTypes.map((type) => ({ type }));
  return {
    get types() {
      return [...map.keys(), ...(files.length ? ["Files"] : [])];
    },
    files,
    get items() {
      const strings = [...map.keys()].map((type) => ({ kind: "string", type }));
      return [...strings, ...files.map(({ type }) => ({ kind: "file", type }))];
    },
    getData: (t: string) => map.get(t) ?? "",
    setData: (t: string, v: string) => void map.set(t, v),
  };
}
function fire(target: Element, type: string, data: object, property = "clipboardData") {
  const event = new Event(type, { bubbles: true, cancelable: true, composed: true });
  Object.defineProperty(event, property, { value: data });
  act(() => {
    target.dispatchEvent(event);
  }); // the engine edit re-renders the React root
  return event;
}
const latexOf = (calc: KarmanCalculator) => calc.getExpressions().map((e) => e.latex ?? "");
const status = (el: HTMLElement) => el.shadowRoot!.querySelector('[role="status"]')!.textContent;
const setClipboard = (value: unknown) =>
  Object.defineProperty(navigator, "clipboard", { configurable: true, value });
```

```tsx
// CalculatorChrome.test.tsx
it("T-5 LaTeX copy and paste round-trip between rows and inside a row", async () => {
  const { el, calc } = mount([R`y=x^{2}+\frac{3}{4}`, ""]);
  const f1 = await field(el, "1");
  await field(el, "2");
  f1.select();
  const all = transfer();
  expect(fire(textarea(el, "1")!, "copy", all).defaultPrevented).toBe(true);
  fire(textarea(el, "2")!, "paste", all);
  expect(latexOf(calc)).toEqual([R`y=x^{2}+\frac{3}{4}`, R`y=x^{2}+\frac{3}{4}`]);
  f1.clearSelection();
  f1.keystroke("End");
  f1.keystroke("Shift-Left");
  const part = transfer();
  fire(textarea(el, "1")!, "copy", part);
  expect(part.getData("text/plain")).toBe(R`\frac{3}{4}`);
  f1.keystroke("End");
  fire(textarea(el, "1")!, "paste", part);
  expect(latexOf(calc)[0]).toBe(R`y=x^{2}+\frac{3}{4}\frac{3}{4}`);
});
it("T-5 cut moves a row's selection to the clipboard and copy without a selection does nothing", async () => {
  const { el, calc } = mount(["x+1", ""]);
  const f1 = await field(el, "1");
  const empty = transfer();
  fire(textarea(el, "1")!, "copy", empty);
  // decision 8: nothing is written and nothing changes (05 cancels the textarea's own copy, so
  // defaultPrevented is not asserted here; the bridge's own no-selection rule is task 5's T-5 test)
  expect([empty.types, latexOf(calc)]).toEqual([[], ["x+1", ""]]);
  f1.select();
  const cut = transfer();
  fire(textarea(el, "1")!, "cut", cut);
  expect([cut.getData("text/plain"), latexOf(calc)[0]]).toEqual(["x+1", ""]);
});
it("T-5 each row exposes MathSpeak-style speech text", async () => {
  const { el } = mount([R`y=x^{2}+\frac{3}{4}`, R`y=\sqrt{x}+\pi`]);
  await field(el, "2");
  const speech = (id: string) => el.shadowRoot!.getElementById(rowDomIds(id).speech)!.textContent;
  expect([speech("1"), speech("2")]).toEqual([
    "y equals x squared plus 3 fourths",
    "y equals Start Root, x, End Root plus pi",
  ]);
});
it("L-13 the Paste button inserts clipboard rows and falls back to Math to paste when reading fails", async () => {
  const { calc, chromeSlot, shadow } = mount([""], true);
  const paste = await vi.waitFor(() =>
    within(chromeSlot!).getByRole("button", { name: "Paste into calculator" })
  );
  setClipboard({
    read: async () => [
      {
        types: ["text/plain"],
        getType: async (t: string) => {
          // like ClipboardItem: an unlisted type rejects (decision 14)
          if (t !== "text/plain")
            throw new DOMException(`${t} is not on the clipboard`, "NotFoundError");
          return { text: async () => "y=2x\n(1,2)" };
        },
      },
    ],
  });
  fireEvent.click(paste);
  await vi.waitFor(() => expect(latexOf(calc)).toEqual(["y=2x", R`\left(1,2\right)`]));
  setClipboard({
    read: async () => {
      throw new DOMException("denied", "NotAllowedError");
    },
  });
  fireEvent.click(paste);
  const box = await vi.waitFor(() =>
    within(shadow).getByRole("textbox", { name: "Math to paste" })
  );
  fireEvent.change(box, { target: { value: "x=3" } });
  fireEvent.click(within(shadow).getByRole("button", { name: "Insert" }));
  expect(latexOf(calc)).toEqual(["y=2x", R`\left(1,2\right)`, "x=3"]);
  expect(within(shadow).queryByRole("textbox", { name: "Math to paste" })).toBeNull();
  setClipboard(undefined);
});
it("KB-1 the Keyboard shortcuts button opens the popover in the shadow root; Escape on the button closes it before the calculator", async () => {
  const { el, chromeSlot } = mount([""], true);
  const help = await vi.waitFor(() =>
    within(chromeSlot!).getByRole("button", { name: "Keyboard shortcuts and help" })
  );
  expect(help).toHaveAttribute("aria-controls", "kc-host-test");
  expect(document.getElementById(help.getAttribute("aria-controls")!)).toBe(el);
  fireEvent.click(help);
  expect(help).toHaveAttribute("aria-expanded", "true");
  expect(
    el.shadowRoot!.querySelector('[role="dialog"][aria-label="Keyboard shortcuts and help"]')
  ).not.toBeNull();
  // fireEvent returns false when the event was cancelled
  expect(fireEvent.keyDown(help, { key: "Escape" })).toBe(false);
  await vi.waitFor(() => expect(el.shadowRoot!.querySelector('[role="dialog"]')).toBeNull());
  expect(fireEvent.keyDown(help, { key: "Escape" })).toBe(true); // no layer left: 11's frame closes the calculator
});
```

`CalculatorChrome.test.tsx` also imports `rowDomIds` from `../ui/list/row-model`.

```tsx
// content-blocks.test.tsx (adds: import { KarmanCalculatorError } from "@/lib/calculator-v2/core/api/errors";
// import type { ExpressionState } from "@/lib/calculator-v2/core/api/types";
// import { PASTE_MESSAGES } from "@/lib/calculator-transfer/clipboard";)
it("CB-1 setExpression rejects note, folder, image and text rows", () => {
  const { calc } = mount(["y=x"]);
  for (const type of ["note", "folder", "image", "text"]) {
    let caught: unknown = null;
    try {
      calc.setExpression({ id: "n", type } as unknown as ExpressionState);
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(KarmanCalculatorError);
    expect((caught as KarmanCalculatorError).code).toBe("unsupported");
  }
  expect(latexOf(calc)).toEqual(["y=x"]);
});
it("CB-1 Add item adds an expression row and offers no note, folder or image", async () => {
  const { calc, shadow } = mount(["1"]);
  fireEvent.click(await vi.waitFor(() => within(shadow).getByRole("button", { name: "Add item" })));
  expect(calc.getExpressions().map((e) => e.type ?? "expression")).toEqual([
    "expression",
    "expression",
  ]);
  expect([
    within(shadow).queryAllByRole("menu"),
    within(shadow).queryAllByRole("menuitem"),
  ]).toEqual([[], []]);
  expect(within(shadow).queryAllByRole("button", { name: /note|folder|image/i })).toEqual([]);
});
it("CB-1 pasted and dropped images are refused with the status message and change nothing", async () => {
  const { el, calc } = mount(["y=x"]);
  await field(el, "1");
  expect(fire(textarea(el, "1")!, "paste", transfer({}, ["image/png"])).defaultPrevented).toBe(
    true
  );
  expect(
    fire(textarea(el, "1")!, "drop", transfer({}, ["image/png"]), "dataTransfer").defaultPrevented
  ).toBe(true);
  await vi.waitFor(() => expect(status(el)).toBe(PASTE_MESSAGES.refused));
  expect(latexOf(calc)).toEqual(["y=x"]);
});
```

- [ ] **Step 2: Run them and see them fail** — `npx vitest run src/components/calculator-v2/chrome/CalculatorChrome.test.tsx src/components/calculator-v2/chrome/content-blocks.test.tsx`; Expected: FAIL (neither file imports `./CalculatorChrome`; they mount the real `KarmanCalculator`, whose App does not render the chrome yet).
  - `CalculatorChrome.test.tsx`, 4 of 5 fail. The T-5 round-trip and cut tests throw `TypeError: Cannot read properties of null (reading 'select')`: without `trackFields` in App, `fieldFor` returns `null`, so `f1` is null (the cut test's no-selection copy assertion passes first). The L-13 and KB-1 tests fail when `vi.waitFor` times out with `Unable to find an accessible element with the role "button" and name "Paste into calculator"` (and `"Keyboard shortcuts and help"`), because nothing is portalled into the chrome slot. The T-5 speech test already passes (09 renders the speech text).
  - `content-blocks.test.tsx`, 1 of 3 fails. In the image test the paste line passes already (05's adapter cancels the textarea's paste), but the drop assertion fails with `defaultPrevented` false because no drop listener is installed (and, past it, the status never becomes `PASTE_MESSAGES.refused`). The CB-1 API and Add item tests already pass through 07 and 09.
- [ ] **Step 3: Implement `CalculatorChrome` and the App edit**
  - Reads `useEngine()`, `useContext(FocusContext)!`, `useContext(EscapeContext)!`, `useAnnouncer()` and `useContext(MathFieldFactoryContext)`; `factory = useMemo(() => trackFields(base), [base])`.
  - State: `shortcutsOpen` and `pasteBoxOpen` (`useState(false)` each); `onToggleShortcuts` flips `shortcutsOpen`.
  - Renders (DOM contract, decision 10): `<MathFieldFactoryContext.Provider value={factory}>` holding `<div data-kc-chrome style={CHROME_STYLES.frame}>`, which holds `{children}` and then `<div data-kc-chrome-layers style={CHROME_STYLES.layers} onKeyDown={onLayerKeyDown}>` with `<ShortcutsPopover open={shortcutsOpen} onClose={closeShortcuts} />` and `<MathToPaste open={pasteBoxOpen} onInsert={insertTyped} onCancel={cancelPasteBox} />`; after the provider, when `chromeSlot` is not null, `createPortal(<TitleBarControls hostId={host.id} shortcutsOpen={shortcutsOpen} onPaste={() => void pasteFromClipboard()} onToggleShortcuts={onToggleShortcuts} />, chromeSlot)` (TitleBarControls omits `aria-controls` when `host.id` is `""`).
  - `onLayerKeyDown`: Escape (not composing) with `escape.handleEscape()` true calls `event.preventDefault()`, so 11's frame does not close the calculator (KB-3).
  - `apply(content, field)` runs `applyPastePlan(planPaste(content, { field: field !== null }, engine.getExpressions()), effects)`. The effects are `{ engine, field, announce: (t) => announcer.announce(t), reveal }`, where `reveal(id)` calls `whenFieldReady(focus, id, () => (pointer === "coarse" ? focus.activateRow(id) : focus.focusRow(id, "end")))`.
  - `pasteFromClipboard()`: `const content = await readSystemClipboard()`. `unavailable` (L-13) or `empty` (decision 13) sets `pasteBoxOpen`; anything else calls `apply(content, null)`.
  - `insertTyped(text)`: `apply(extractClipboardText(text, null), null)`, then `pasteBoxOpen` false. `cancelPasteBox()`: `pasteBoxOpen` false, then focus `chromeSlot?.querySelector('[data-kc-title-button="paste"]')`.
  - `closeShortcuts()`: `shortcutsOpen` false, then focus `[data-kc-title-button="shortcuts"]` when `host.shadowRoot!.activeElement` is inside `[data-kc-shortcuts]` or `document.activeElement` is that button.
  - Effects (removed on unmount): `installClipboardBridge(host.shadowRoot!, { apply })`; when `chromeSlot` exists, a native `keydown` listener on it that calls `preventDefault()` when Escape (not composing) closes a layer through `escape.handleEscape()`.
  - `App.tsx`: import `CalculatorChrome` from `../chrome/CalculatorChrome` and wrap the existing `<CalculatorLayout … />` element as `<CalculatorChrome host={host} chromeSlot={chromeSlot} pointer={shell.pointer}>…</CalculatorChrome>` inside the five providers, where `host` and `chromeSlot` are App's props and `shell` is the value of App's existing `useSyncExternalStore(store.subscribe, store.get)` call (10, Task 4). Nothing else in App changes.
- [ ] **Step 4: Run them and see them pass** — Step 2's command, then `npx vitest run src/components/calculator-v2` (10's and 09's suites must stay green) and `npm run test:calculator -- --project=calculator-chrome tests/calculator/v2/shell tests/calculator/v2/quiz-window.spec.ts` (10's four shell specs, 10 note 3, and 11's window spec); Expected: PASS (5 + 3 new tests).
- [ ] **Step 5: Commit** — `git add src/components/calculator-v2/chrome src/components/calculator-v2/ui/App.tsx && git commit -m "Mount paste, copy and the title-bar controls in the v2 calculator (T-5, L-13, CB-1)"`
