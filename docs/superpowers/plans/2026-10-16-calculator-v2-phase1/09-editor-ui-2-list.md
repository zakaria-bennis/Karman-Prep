# 09 editor-ui, part 2 of 5: list toolbar, announcements and list motion state (Tasks 4 to 6)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

Part 2 of package `09-editor-ui.md`, which holds the package header, Working rules, Decisions,
Notes for consumers, the Row DOM and the ID coverage; they apply to every task here. Tasks run
in number order across the five parts. Paths that start with `ui/`, `styles/` or `icons/` are
under `src/components/calculator-v2/`.

---

### Task 4: List toolbar, history, Edit list and row actions

**Files:**

- Create: `ui/list/row-actions.ts`
- Modify: `ui/list/ExpressionPanel.tsx`, `ui/list/ExpressionRow.tsx`, `styles/list.css`
- Test: `ui/list/ExpressionPanel.test.tsx`

**Interfaces:**

- Consumes: Tasks 1 to 3; (07) `undo()`, `redo()`, `canUndo(): boolean`, `canRedo(): boolean`,
  `clearAll(): void`, `insertRowAfter(afterId: string | null): { id: string } | EditRefusal`,
  `deleteRow(id: string): void`, `editRow`, `endEditGroup`; (05) `useAnnouncer(): Announcer`;
  (02) `MAX_ROWS`, `MAX_ROW_CHARACTERS`.
- Produces:

```ts
// ui/list/row-actions.ts (type-only imports)
export function insertRowBelow(
  engine: CalculatorEngine,
  focus: FocusController,
  announcer: Announcer | null,
  afterId: string | null, // null: at the end
  mode: "focus" | "activate"
): string | null; // the new row id, or null after announcing EDITOR_MESSAGES.rowLimit
export function leaveRow(
  engine: CalculatorEngine,
  focus: FocusController,
  rowId: string,
  direction: "up" | "down"
): void;
// R-3: up → previous row at "end", down → next row at "start"; nothing at either end of the list
export function deleteFromEmptyRow(
  engine: CalculatorEngine,
  focus: FocusController,
  rowId: string,
  direction: "left" | "right"
): void;
// R-9: the only row stays (empty, focused); otherwise deleteRow, then "left" → previous row at
// "end" (the new first row at "start" when there is none), "right" → next row at "start"
// (the previous row at "end" when there is none)
export function deleteRowByControl(
  engine: CalculatorEngine,
  focus: FocusController,
  rowId: string
): void;
// deleteRow, then focus the row now at that index, else the previous one, at "end"
export function clearAllRows(
  engine: CalculatorEngine,
  focus: FocusController,
  announcer: Announcer | null
): void;
// KB-5: clearAll(), announce clearAll, focusRow(rows[0].id, "start")
export function performUndo(engine: CalculatorEngine, announcer: Announcer | null): void; // no-op unless canUndo(); announces undone
export function performRedo(engine: CalculatorEngine, announcer: Announcer | null): void; // no-op unless canRedo(); announces redone
export function editThroughKeypad(
  engine: CalculatorEngine,
  announcer: Announcer | null,
  rowId: string,
  field: MathField,
  apply: (field: MathField) => void
): EditRefusal | null;
// marks field as batching (isKeypadBatch true) while apply runs, then editRow(rowId, field.latex(), "keypad");
// on "char-limit" restores the previous latex and announces charLimit
export function isKeypadBatch(field: MathField): boolean;
```

- [ ] **Step 1: Write the failing tests** in `ExpressionPanel.test.tsx`:

```tsx
const toolbarNames = () =>
  within(screen.getByRole("toolbar", { name: "List tools" }))
    .getAllByRole("button")
    .map((b) => b.getAttribute("aria-label"));
const latexes = (kit: EditorKit) => kit.engine.getSnapshot().rows.map((r) => r.latex);

it("KB-2 Undo and Redo follow Add item in each toolbar and are aria-disabled at the ends of the stack", () => {
  renderEditor(<ExpressionPanel {...panelProps()} />, { rows: [""] });
  expect(toolbarNames()).toEqual(["Add item", "Undo", "Redo", "Edit list", "Collapse list"]);
  cleanup();
  renderEditor(<ExpressionPanel {...panelProps({ layout: "stacked" })} />, { rows: [""] });
  expect(toolbarNames()).toEqual([
    "Add item",
    "Keypad",
    "Undo",
    "Redo",
    "Edit list",
    "Collapse list",
  ]);
  expect(screen.getByRole("button", { name: "Undo" })).toHaveAttribute("aria-disabled", "true");
  expect(screen.getByRole("button", { name: "Redo" })).toHaveAttribute("aria-disabled", "true");
});

it("KB-2 typing in one row is one undo step until 1,000 ms without edits or a focus change", async () => {
  const kit = renderEditor(<ExpressionPanel {...panelProps()} />, { rows: ["", ""] });
  const [f1, f2] = [kit.fields.forRow("1"), kit.fields.forRow("2")];
  expect(kit.clock.now).toBe(0);
  act(() => {
    kit.focus.focusRow("1", "end");
    f1.emitEdit("a"); // t = 0
    kit.clock.now = 999;
    f1.emitEdit("ab"); // 999 ms after the last edit: the same step
    kit.clock.now = 1998;
    f1.emitEdit("abc"); // 999 ms after "ab" (1,998 after the step began): still the same step
    kit.clock.now = 2998;
    f1.emitEdit("abcd"); // exactly 1,000 ms after "abc": a new step
    kit.focus.focusRow("2", "end");
    kit.clock.now = 3000;
    f2.emitEdit("z"); // after a focus change: a new step
    kit.focus.focusRow("1", "end");
    kit.clock.now = 3100;
    f1.emitEdit("abcde"); // after another focus change, 102 ms after "abcd": a new step
  });
  const user = userEvent.setup();
  const undo = screen.getByRole("button", { name: "Undo" });
  for (const expected of [
    ["abcd", "z"],
    ["abcd", ""],
    ["abc", ""],
    ["", ""],
  ]) {
    await user.click(undo);
    expect(latexes(kit)).toEqual(expected);
  }
  expect(f1.latex()).toBe("");
  expect(undo).toHaveAttribute("aria-disabled", "true");
  await user.click(screen.getByRole("button", { name: "Redo" }));
  expect(latexes(kit)).toEqual(["abc", ""]);
});

it("R-10 Clear all and setBlank leave exactly one empty row numbered 1, and Clear all focuses it", async () => {
  const kit = renderEditor(<ExpressionPanel {...panelProps()} />, { rows: ["y=x", "a=2", "y=a"] });
  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: "Edit list" }));
  expect(screen.getByRole("button", { name: "Edit list" })).toHaveAttribute("aria-pressed", "true");
  await user.click(screen.getByRole("button", { name: "Clear all expressions" }));
  expect(screen.getAllByRole("listitem")).toHaveLength(1);
  expect(latexes(kit)).toEqual([""]);
  expect(textbox(1)).toHaveFocus();
  await user.click(screen.getByRole("button", { name: "Done" }));
  expect(screen.getByRole("button", { name: "Edit list" })).toHaveFocus();
  expect(screen.queryByRole("button", { name: "Clear all expressions" })).toBeNull();
  act(() => {
    kit.engine.setExpressions([
      { id: "1", latex: "y=x" },
      { id: "2", latex: "y=2" },
    ]);
    kit.engine.setBlank();
  });
  expect(screen.getAllByRole("listitem")).toHaveLength(1);
  expect(document.querySelector(".kc-row-number")!.textContent).toBe("1");
});

it("T-13, NM-42 a typed edit past 2,048 characters is refused with a status message and leaves the row unchanged", () => {
  const long = "1".repeat(MAX_ROW_CHARACTERS);
  const kit = renderEditor(<ExpressionPanel {...panelProps()} />, { rows: [long] });
  const field = kit.fields.forRow("1");
  act(() => field.emitEdit(`${long}2`));
  expect(latexes(kit)).toEqual([long]);
  expect(field.latex()).toBe(long);
  act(() => field.options.onRefused("char-limit"));
  expect(kit.announcer.texts).toEqual([EDITOR_MESSAGES.charLimit, EDITOR_MESSAGES.charLimit]);
});

it("A11Y-2 the row limit, Clear all, Undo and Redo are announced through the status region, never role=alert", async () => {
  const rows = Array.from({ length: MAX_ROWS }, (_, i) => `a_{${i}}=${i}`);
  const kit = renderEditor(<ExpressionPanel {...panelProps()} />, { rows });
  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: "Add item" }));
  expect(kit.engine.getSnapshot().rows).toHaveLength(MAX_ROWS);
  await user.click(screen.getByRole("button", { name: "Edit list" }));
  await user.click(screen.getByRole("button", { name: "Clear all expressions" }));
  await user.click(screen.getByRole("button", { name: "Undo" }));
  await user.click(screen.getByRole("button", { name: "Redo" }));
  expect(kit.announcer.texts.filter((t) => !t.startsWith("Expression "))).toEqual([
    EDITOR_MESSAGES.rowLimit,
    EDITOR_MESSAGES.clearAll,
    EDITOR_MESSAGES.undone,
    EDITOR_MESSAGES.redone,
  ]);
  expect(document.querySelector('[role="alert"]')).toBeNull();
});
```

- [ ] **Step 2: Run them and see them fail.**
      `npx vitest run src/components/calculator-v2/ui/list/ExpressionPanel.test.tsx`. Expected:
      FAIL, 5 of 5:
  - KB-2 (toolbar order): `Unable to find an accessible element with the role "toolbar" and name "List tools"`.
  - KB-2 (coalescing): the edits run through Task 2's `onEdit`, then
    `Unable to find an accessible element with the role "button" and name "Undo"`.
  - R-10: `Unable to find an accessible element with the role "button" and name "Edit list"`.
  - T-13: `expect(latexes(kit)).toEqual([long])` passes (07 refuses the edit), then
    `expect(field.latex()).toBe(long)` fails: it receives `` `${long}2` `` (2,049 characters;
    Vitest shortens both strings in the message), because Task 2 does not restore the field
    after a refusal.
  - A11Y-2: `Unable to find an accessible element with the role "button" and name "Add item"`.
- [ ] **Step 3: Implement `row-actions.ts`, the toolbar and Edit list mode, and the row
      callbacks.**
  - Toolbar `div[role=toolbar][aria-label="List tools"]` first in the list body, every button with
    an `aria-label` and a lucide icon: desktop `Add item` (`Plus`), `Undo` (`Undo2`), `Redo`
    (`Redo2`), `Edit list` (`Pencil`, `aria-pressed`), `Collapse list` (`ChevronsLeft`, Task 6
    gives it its action); stacked inserts `Keypad` (`Keyboard`, `aria-pressed={keypadOpen}`,
    calls `onToggleKeypad`) after `Add item` (L-1, L-2). Undo and Redo carry
    `aria-disabled={!snapshot.canUndo}` / `{!snapshot.canRedo}` and ignore activation then
    (they stay in the Tab order, KB-13); they call `performUndo` / `performRedo`. `Add item` →
    `insertRowBelow(engine, focus, announcer, null, "focus")`.
  - Edit list mode (local state) renders `div.kc-edit-bar` after the toolbar and before the list
    (the Row DOM order, so the Tab order stays Add item, Undo, Redo, Edit list, Collapse list,
    then Clear all expressions and Done, as KB-13 reads it) with `Clear all expressions`
    (`clearAllRows`) and `Done` (leaves the mode, focuses `Edit list`).
  - Row callbacks: `onEnter` → `insertRowBelow(…, row.id, "focus")`; `onArrowOut` → `leaveRow`;
    `onDeleteOutOf(direction)` → `deleteFromEmptyRow` when `field.latex() === ""`, else nothing;
    Delete button → `deleteRowByControl`; `onEdit` returns early while `isKeypadBatch(field)`,
    and on an `editRow` refusal of `"char-limit"` restores `field.latex(row.latex)` and announces
    `charLimit`; `onRefused("char-limit")` announces `charLimit`.
- [ ] **Step 4: Run them and see them pass.** Same command. Expected: PASS, 5 tests. Then
      `npx vitest run src/lib/calculator-v2/theme/no-raw-colours.test.ts`. Expected: PASS,
      4 tests.
- [ ] **Step 5: Commit.**

```bash
git add src/components/calculator-v2/ui/list src/components/calculator-v2/styles/list.css
git commit -m "Add the v2 list toolbar, undo history buttons, Edit list and row actions (09 editor-ui)"
```

### Task 5: Live-region announcements for rows

**Files:**

- Create: `ui/list/announcements.ts`
- Modify: `ui/list/ExpressionPanel.tsx`
- Test: `ui/list/announcements.test.ts` (node), `ui/list/announcements.live-region.test.ts`
  (jsdom, with 05's real `createAnnouncer`)

**Interfaces:**

- Consumes: (07) `observeEvent(name: "change", callback: (event: ChangeEvent) => void): () => void`
  with `ChangeEvent { revision: number; isUserInitiated: boolean }`, `getSnapshot()`,
  `subscribe()`, `editRow`, `setFocusedRow`, `activateExpression`, `setExpressions`,
  `destroy()`; the test fixture
  `createTestEngine(options?: CalculatorOptions, config?: { backend?: "fake" | "main-thread"; randomSeeds?: number[] }): TestEngine`
  from `src/lib/calculator-v2/core/api/__fixtures__/test-engine.ts`, whose `TestEngine` has
  `engine: CalculatorEngine`, `emit(message: WorkerToMain): void` (fake backend only),
  `flushFrames(): void`, `settled(): Promise<void>` and `latestGeneration(): number`; (05)
  `Announcer`, `AnnounceOptions { delayMs?: number; key?: string }` and, in the jsdom test only,
  `createAnnouncer(region: HTMLElement): Announcer` from `ui/a11y/announcer.ts`; Task 1
  `EDITOR_MESSAGES`, `createManualTimers`, `ManualTimers`. 05's public contract ("Announcer
  contract for consumers"): `announce(text, { delayMs, key })` writes `text` exactly `delayMs`
  after the call when `delayMs >= 50` (50 ms after it when below 50 or absent), and a same-key
  `announce` or `cancel(key)` drops a write that has not run.
- Produces:

```ts
// ui/list/announcements.ts (type-only imports)
export const VALUE_ANNOUNCE_DELAY_MS = 750;
export interface AnnouncementTimers {
  setTimeout(callback: () => void, ms: number): unknown;
  clearTimeout(handle: unknown): void;
}
export interface RowAnnouncements {
  destroy(): void;
}
export function createRowAnnouncements(
  engine: CalculatorEngine,
  announcer: Announcer,
  options?: { delayMs?: number; timers?: AnnouncementTimers }
  // delayMs: when the text is spoken after the last edit, default 750, at least 50;
  // timers: default the global setTimeout and clearTimeout
): RowAnnouncements;
```

**Timing (resolves 05 Notes for the lead, item 6).** A11Y-2's 750 ms is when the text is spoken,
and 05's announcer writes no sooner than 50 ms after a call. A module-private
`const ANNOUNCE_WRITE_MS = 50` sets both halves: the idle timer runs
`Math.max(0, delayMs - ANNOUNCE_WRITE_MS)` ms (700 by default), and every call is
`announcer.announce(text, { delayMs: ANNOUNCE_WRITE_MS, key })`, which by the contract above is
written exactly 50 ms later, at 750 ms. An idle timer of 750 ms followed by a call with no
`delayMs` would be spoken at about 800 ms. The other option, one `{ delayMs: 750, key }` call per
edit, does not fit: the text (which errors are new, and the worker value) is only known at the
idle point. Each call's `key` lets a later rows change cancel a write that is still pending, so a
value is never spoken after a newer edit. The package Decisions' "750 ms idle timer" is this
spoken point: 700 ms of timer plus the announcer's 50 ms.

- [ ] **Step 1: Write the failing tests** in `announcements.test.ts` (node) and
      `announcements.live-region.test.ts` (jsdom). API-8 fires `change` at most once per frame
      through `deps.scheduleFrame`, and `createTestEngine` queues frames until `t.flushFrames()`.
      So every engine call below is followed by `t.flushFrames()`, or by `await t.settled()` when
      a worker value is needed, before any timer advances. Test 2 uses the fake backend and
      `t.emit` so its value certainly arrives after the idle point. The node tests' announcer
      follows 05's public contract on the same manual timers (a write `max(delayMs, 50)` ms after
      the call, dropped by a same-key call or `cancel`), so they assert when the text is
      written, not when `announce` is called; the jsdom test pins the same 750 ms against 05's
      real `createAnnouncer` and its status region.

```ts
function contractAnnouncer(timers: ManualTimers, texts: string[]): Announcer {
  const pending = new Map<string, unknown>();
  const cancel = (key: string) => {
    if (pending.has(key)) timers.clearTimeout(pending.get(key));
    pending.delete(key);
  };
  return {
    announce(text, options) {
      const key = options?.key;
      if (key !== undefined) cancel(key);
      const handle = timers.setTimeout(
        () => {
          if (key !== undefined) pending.delete(key);
          texts.push(text);
        },
        Math.max(options?.delayMs ?? 0, 50)
      );
      if (key !== undefined) pending.set(key, handle);
    },
    cancel,
    destroy() {},
  };
}
function setup(rows: string[], backend: "fake" | "main-thread") {
  const t = createTestEngine(undefined, { backend });
  t.engine.setExpressions(rows.map((latex, i) => ({ id: String(i + 1), latex })));
  t.flushFrames(); // this API change event fires before the announcements exist
  const texts: string[] = [];
  const timers = createManualTimers();
  const announcer = contractAnnouncer(timers, texts);
  createRowAnnouncements(t.engine, announcer, { timers });
  onTestFinished(() => t.engine.destroy());
  return { t, engine: t.engine, texts, timers };
}
const valueOf = (engine: CalculatorEngine, i: number) => engine.getSnapshot().rows[i].valueText;

it("A11Y-2 the focused row's value is announced once, 750 ms after the last edit", async () => {
  const { t, engine, texts, timers } = setup(["", ""], "main-thread");
  engine.setFocusedRow("2");
  engine.editRow("2", "4+5", "typing");
  t.flushFrames(); // the change event starts the idle timer
  await t.settled(); // the main-thread backend reports 9
  expect(valueOf(engine, 1)).toBe("9");
  timers.advance(749); // the idle point at 700 calls announce; the write is due at 750
  expect(texts).toEqual([]);
  timers.advance(1);
  expect(texts).toEqual(["Expression 2 equals 9"]);
  engine.editRow("2", "4+6", "typing");
  t.flushFrames(); // the timer restarts: written 750 ms from here
  timers.advance(500);
  engine.editRow("2", "4+7", "typing");
  t.flushFrames(); // it restarts again; without the restart it would be written 250 ms from here
  await t.settled();
  expect(valueOf(engine, 1)).toBe("11");
  timers.advance(749);
  expect(texts).toHaveLength(1);
  timers.advance(1);
  expect(texts.at(-1)).toBe("Expression 2 equals 11");
});

it("A11Y-2 a value that arrives after the idle point is announced when it arrives, for the active row when no row has DOM focus", () => {
  const { t, engine, texts, timers } = setup([""], "fake");
  engine.activateExpression("1"); // touch activation: no focused row (Decisions, announced row)
  engine.editRow("1", "1+2", "typing");
  t.flushFrames(); // the change event starts the idle timer; the fake backend sends no value
  timers.advance(750); // the idle point at 700 finds no value yet
  expect(texts).toEqual([]);
  t.emit({
    v: 1,
    type: "value",
    generation: t.latestGeneration(),
    rowId: "1",
    jobId: null,
    value: { type: "number", value: 3 },
  });
  t.flushFrames(); // the value reaches subscribers in the next frame and is announced at once
  expect(texts).toEqual([]);
  timers.advance(50); // the announcer's 50 ms write delay
  expect(texts).toEqual(["Expression 1 equals 3"]);
});

it("A11Y-2 a row's error is announced once when it appears or changes, and API changes stay silent", () => {
  const { t, engine, texts, timers } = setup(["", ""], "fake");
  const typeAndIdle = (latex: string) => {
    engine.editRow("1", latex, "typing");
    t.flushFrames(); // the change event starts the idle timer
    timers.advance(700); // the idle point calls announce
    timers.advance(50); // 750: the write lands
  };
  engine.setFocusedRow("1");
  typeAndIdle("y=2+");
  expect(texts).toEqual([
    "Expression 1: This can't be read. Check for a missing bracket or operator.",
  ]);
  typeAndIdle("y=2+(");
  expect(texts).toHaveLength(1);
  typeAndIdle("y=2");
  typeAndIdle("y=2+");
  expect(texts).toHaveLength(2);
  engine.setExpressions([
    { id: "1", latex: "y=2" },
    { id: "2", latex: "y=3+" },
  ]);
  t.flushFrames(); // a non-user change event: recorded silently (A11Y-11)
  timers.advance(5000);
  expect(texts).toHaveLength(2);
});
```

`announcements.live-region.test.ts` uses Vitest's fake timers, so `createRowAnnouncements` runs on
its default (global) timers and 05's announcer writes the status region itself:

```ts
// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { createTestEngine } from "@/lib/calculator-v2/core/api/__fixtures__/test-engine";
import { createAnnouncer } from "../a11y/announcer";
import { createRowAnnouncements } from "./announcements";

afterEach(() => vi.useRealTimers());

it("A11Y-2 through the real announcer the focused row's value reaches the status region 750 ms after the last edit, and a newer edit drops a pending value", () => {
  vi.useFakeTimers(); // before the engine and announcer exist, so every timer they set is fake
  const t = createTestEngine(undefined, { backend: "fake" });
  t.engine.setExpressions([
    { id: "1", latex: "" },
    { id: "2", latex: "" },
  ]);
  t.flushFrames(); // this API change event fires before the announcements exist
  const region = document.createElement("div");
  const announcer = createAnnouncer(region);
  const rows = createRowAnnouncements(t.engine, announcer); // defaults: 750 ms, global timers
  const typeWithValue = (latex: string, value: number) => {
    t.engine.editRow("2", latex, "typing");
    t.flushFrames(); // the change event starts the idle timer
    t.emit({
      v: 1,
      type: "value",
      generation: t.latestGeneration(),
      rowId: "2",
      jobId: null,
      value: { type: "number", value },
    });
    t.flushFrames(); // the value is in the snapshot before the idle point
  };
  t.engine.setFocusedRow("2");
  typeWithValue("4+5", 9); // t = 0
  vi.advanceTimersByTime(749);
  expect(region.textContent).toBe("");
  vi.advanceTimersByTime(1); // t = 750, not 800
  expect(region.textContent).toBe("Expression 2 equals 9");
  typeWithValue("4+6", 10); // t = 750: idle point at 1450, write due at 1500
  vi.advanceTimersByTime(720); // t = 1470: the announcer emptied the region at 1450
  expect(region.textContent).toBe("");
  typeWithValue("4+7", 11); // t = 1470: cancels the write due at 1500
  vi.advanceTimersByTime(30); // t = 1500
  expect(region.textContent).toBe(""); // "Expression 2 equals 10" is never written
  vi.advanceTimersByTime(719); // t = 2219
  expect(region.textContent).toBe("");
  vi.advanceTimersByTime(1); // t = 2220 = 1470 + 750
  expect(region.textContent).toBe("Expression 2 equals 11");
  rows.destroy();
  announcer.destroy();
  t.engine.destroy();
});
```

- [ ] **Step 2: Run them and see them fail.**
      `npx vitest run src/components/calculator-v2/ui/list/announcements.test.ts src/components/calculator-v2/ui/list/announcements.live-region.test.ts`.
      Expected: FAIL, both files with `Failed to resolve import "./announcements"`.
- [ ] **Step 3: Implement `createRowAnnouncements` and create it in `ExpressionPanel`** (an
      effect with `useAnnouncer()`, destroyed on unmount). The algorithm, with
      `n` = the row's 1-based index, an error key `${code}|${message}`, and every announcement
      made as `announcer.announce(text, { delayMs: ANNOUNCE_WRITE_MS, key })` with `key`
      `error:${rowId}` or `value:${rowId}` (Timing, above):
  1. State: `announced: Map<rowId, errorKey | null>`, `userTurn`, one idle timer,
     `pendingValueRow: string | null`, `sentKeys: Set<string>` (the keys passed to `announce`
     since the last rows change), and the rows signature (ids and latex in list order) at the
     last `change` event. At creation the signature and every row's key are read from the
     current snapshot, so nothing that exists then is announced.
  2. A `change` event that leaves the rows signature unchanged (pan, zoom, settings, worker
     results) is ignored. Any other calls `announcer.cancel(key)` for every key in `sentKeys`
     and empties it (a cancel after the write ran changes nothing), clears `pendingValueRow` and
     sets `userTurn = isUserInitiated`; a user event restarts the idle timer at
     `Math.max(0, delayMs - ANNOUNCE_WRITE_MS)` ms (700 by default, so the write lands at
     `delayMs`, 750); a non-user event cancels it and records every row's current key in
     `announced` without announcing (A11Y-11).
  3. When the timer fires: announce `error(n, message)` for each row, in list order, whose key
     is non-null and differs from `announced`; record every row's key. Then take the row
     `snapshot.focusedRowId ?? snapshot.activeRowId` (Decisions, announced row); when it exists
     and has no error, announce `value(n, valueText)` if `valueText` is non-null, else set
     `pendingValueRow` to it. Add each key used to `sentKeys`.
  4. On every engine notification: when `pendingValueRow`'s `valueText` is non-null, announce it
     once (written 50 ms later, the announcer's minimum) and clear; while `userTurn`, a `timeout`
     error whose key differs from `announced` is announced and recorded (AR-48 errors arrive
     after the idle point). Add each key used to `sentKeys`.
  5. `destroy()` removes the `change` observer and the subscription, clears the timer and
     cancels every key in `sentKeys`.
- [ ] **Step 4: Run them and see them pass.** Same command. Expected: PASS, 4 tests (3 node, 1
      jsdom).
- [ ] **Step 5: Commit.**

```bash
git add src/components/calculator-v2/ui/list
git commit -m "Announce v2 row values and errors after 750 ms idle, user changes only (09 editor-ui)"
```

### Task 6: Row presence and Collapse list state

**Files:**

- Create: `ui/list/row-presence.ts`
- Modify: `ui/list/ExpressionPanel.tsx`, `ui/list/ExpressionRow.tsx`
- Test: `ui/list/motion.test.tsx`

**Interfaces:**

- Consumes: Tasks 1 to 4; (07) `updateSettings({ expressionsCollapsed })`,
  `snapshot.settings.expressionsCollapsed`, `insertRowAfter`.
- Produces:

```ts
// ui/list/row-presence.ts
export type RowMotion = "enter" | "idle" | "exit";
export interface PresentRow {
  row: RowView;
  motion: RowMotion;
}
export function useRowPresence(rows: readonly RowView[]): {
  items: readonly PresentRow[];
  exitDone(rowId: string): void;
};
// ExpressionRowProps gains: motion: RowMotion; onExitDone(rowId: string): void
// section.kc-list-panel gains data-list-state: "expanded" | "collapsing" | "collapsed" | "expanding"
```

- [ ] **Step 1: Write the failing tests** in `motion.test.tsx`:

```tsx
afterEach(() => vi.useRealTimers());
const view = (id: string) => ({ id }) as RowView;

it("AN-5 new rows render enter for one commit and removed rows stay as exit until exitDone", () => {
  const seen: string[] = [];
  const { result, rerender } = renderHook(
    ({ rows }) => {
      const presence = useRowPresence(rows);
      seen.push(presence.items.map((i) => `${i.row.id}:${i.motion}`).join(" "));
      return presence;
    },
    { initialProps: { rows: [view("1"), view("2"), view("3")] } }
  );
  expect(seen[0]).toBe("1:idle 2:idle 3:idle");
  rerender({ rows: [view("1"), view("3"), view("4")] });
  expect(seen).toContain("1:idle 2:exit 3:idle 4:enter");
  expect(seen.at(-1)).toBe("1:idle 2:exit 3:idle 4:idle");
  act(() => result.current.exitDone("2"));
  expect(seen.at(-1)).toBe("1:idle 3:idle 4:idle");
});

it("AN-5 an exiting row is inert, unnumbered and removed after its exit duration", () => {
  vi.useFakeTimers();
  const kit = renderEditor(<ExpressionPanel {...panelProps()} />, {
    rows: ["y=x", "y=2x", "y=3x"],
    durationMs: 100,
  });
  act(() => kit.engine.removeExpression({ id: "2" }));
  expect(rowItem("2")).toHaveAttribute("data-motion", "exit");
  expect(rowItem("2")).toHaveAttribute("aria-hidden", "true");
  expect(
    [...document.querySelectorAll("li:not([data-motion=exit]) .kc-row-number")].map(
      (n) => n.textContent
    )
  ).toEqual(["1", "2"]);
  act(() => vi.advanceTimersByTime(99));
  expect(document.querySelector('li[data-row-id="2"]')).not.toBeNull();
  act(() => vi.advanceTimersByTime(1));
  expect(document.querySelector('li[data-row-id="2"]')).toBeNull();
});

it("AN-3 Collapse list and Expand list flip expressionsCollapsed only when their transition ends", () => {
  vi.useFakeTimers();
  const kit = renderEditor(<ExpressionPanel {...panelProps()} />, {
    rows: ["y=x"],
    durationMs: 200,
  });
  const panel = document.querySelector(".kc-list-panel")!;
  fireEvent.click(screen.getByRole("button", { name: "Collapse list" }));
  expect(panel).toHaveAttribute("data-list-state", "collapsing");
  act(() => vi.advanceTimersByTime(199));
  expect(kit.engine.settings.expressionsCollapsed).toBe(false);
  act(() => vi.advanceTimersByTime(1));
  expect(kit.engine.settings.expressionsCollapsed).toBe(true);
  expect(panel).toHaveAttribute("data-list-state", "collapsed");
  expect(screen.queryByRole("list", { name: "Expressions" })).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Expand list" }));
  expect(panel).toHaveAttribute("data-list-state", "expanding");
  act(() => vi.advanceTimersByTime(199));
  expect(kit.engine.settings.expressionsCollapsed).toBe(true);
  act(() => vi.advanceTimersByTime(1));
  expect(kit.engine.settings.expressionsCollapsed).toBe(false);
  expect(screen.getByRole("button", { name: "Collapse list" })).toHaveFocus();
});
```

- [ ] **Step 2: Run them and see them fail.**
      `npx vitest run src/components/calculator-v2/ui/list/motion.test.tsx`. Expected: FAIL with
      `Failed to resolve import "./row-presence"`.
- [ ] **Step 3: Implement presence and the collapse states.**
  - `useRowPresence`: the first render marks every row `idle`; a new id is `enter` for one
    commit, then a `useEffect` marks it `idle`; a removed id stays at its last index as `exit`
    until `exitDone(id)`.
  - `ExpressionRow` renders `data-motion={motion}`; a layout effect forces a style flush
    (`void li.offsetHeight`) while `enter`, so the change to `idle` transitions. On `exit` the
    row unregisters its field, renders `aria-hidden="true"` and `inert` with no number, and calls
    `onExitDone(row.id)` after `useContext(MotionContext)(li)` ms, read in a layout effect once
    `data-motion="exit"` is committed (in that layout effect for 0, else one timeout). The panel
    numbers only rows that are not exiting.
  - Collapse list: `collapsing` for `MotionContext(listBody)` ms (read in a layout effect once
    `collapsing` is committed; 0 goes straight on in that layout effect, any other value sets one
    timeout), then `updateSettings({ expressionsCollapsed: true })` and `collapsed`, which
    renders only an `Expand list` button (lucide `ChevronsRight`) and gives it focus when focus
    was in the panel. During `collapsing` the list body stays in flow, so the column keeps its width.
  - Expand list: `expanding` keeps the `Expand list` button rendered in flow, unchanged, and
    mounts the list body beside it as an overlay (`position: absolute`, at the width or height
    measured at the last collapse) with `data-enter="true"`. The column, sized `auto` while
    collapsed, therefore keeps the button's width for the whole transition, and the graph
    resizes once, when `expressionsCollapsed` flips at the end (AN-3's `base + 1` and
    `base + 2`). A layout effect forces a style flush and removes `data-enter`, so Task 15's
    transform transition runs. After `MotionContext(listBody)` ms (read in that layout effect; 0:
    at once, in it) it calls `updateSettings({ expressionsCollapsed: false })`, sets `expanded` (the button
    unmounts and the overlay becomes the in-flow list body) and focuses `Collapse list`.
  - A change of `settings.expressionsCollapsed` from elsewhere (API, `setBlank`) sets `collapsed`
    or `expanded` at once.
- [ ] **Step 4: Run them and see them pass.** Same command. Expected: PASS, 3 tests.
- [ ] **Step 5: Commit.**

```bash
git add src/components/calculator-v2/ui/list
git commit -m "Add v2 row enter and exit states and the Collapse list lifecycle (09 editor-ui)"
```
