# 14 transfer-ui, part 4 of 4: docking on transfer, focus and announcements, held payloads, contrast and theme (Tasks 11 to 14)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

Part 4 of 4 of package `14-transfer-ui.md`, which holds the package header (commands, type
checks, preconditions), the package-internal names (including `useTransferBridge`), the DOM
contract, the Decisions, the Notes for the lead and the package gate; they apply to every task
here. Tasks run in number order across the four parts; each part starts where the previous one
ends (part 3 ends with task 10). The package gate in `14-transfer-ui.md` follows task 14.

---

### Task 11: Docking on transfer (bridge hook)

**Files:**

- Create: `tests/calculator/v2/transfer-docking.spec.ts`
- Modify: `src/components/calculator/use-transfer-bridge.ts`, `src/components/calculator/CalculatorScope.transfer.test.tsx` (append), `tests/calculator/v2/transfer-helpers.ts`

**Interfaces:**

- Consumes: `calculatorWindowStore.get(): WindowStoreState`, `calculatorWindowStore.set(patch: Partial<WindowStoreState>): void`, `WindowMode` (11); `FULL_SCREEN_QUERY` (03). 11's `defaultDockWidth` and `clampDockWidth` rules are read only by the browser assertions.
- Produces: in `transfer()` of `use-transfer-bridge.ts`, between step 3 (queue-full refusal) and step 4 (load failure):
  `if (!matchMedia(FULL_SCREEN_QUERY).matches) calculatorWindowStore.set({ mode: "docked", restoreMode: "docked" })` (AR-21, TR-64, TR-65), whatever the trigger. Steps 1 and 3 return before it, so a stale key or a queue-full refusal never writes the store; a load failure opens its panel docked.

- [ ] **Step 1: Write the failing tests**

Component (append to `CalculatorScope.transfer.test.tsx`):

```
it("AR-21, TR-64 a mouse or touch transfer docks a closed, floating or maximized window when the viewport is wide, opens a load-failure panel docked, leaves the stored mode alone in full screen and never writes it for a refused transfer", async () => {
  const s = await scope(); const first = send(s, payload(1), "mouse"); await waitFor(() => expect(first.result?.status).toBe("added"));
  expect(s.store.get().mode).toBe("docked"); expect(document.querySelector("[data-calculator-window]")).toHaveAttribute("data-mode", "docked");
  for (const [n, mode, trigger] of [[2, "floating", "touch"], [3, "maximized", "mouse"]] as const) { act(() => s.store.set({ mode })); const o = send(s, payload(n), trigger); await waitFor(() => expect(o.result).toBeDefined()); expect(s.store.get().mode, trigger).toBe("docked"); }
  s.unmount(); const t = await scope(); const byTouch = send(t, payload(1), "touch"); await waitFor(() => expect(byTouch.result?.status).toBe("added"));
  expect(t.store.get().mode).toBe("docked"); expect(document.querySelector("[data-calculator-window]")).toHaveAttribute("data-mode", "docked"); t.unmount();
  const f = await scope({ fullScreen: true }); const o = send(f, payload(4), "mouse"); await waitFor(() => expect(o.result?.status).toBe("added"));
  expect(f.store.get().mode).toBeNull(); expect(document.querySelector("[data-calculator-window]")).toHaveAttribute("data-mode", "fullscreen"); f.unmount();
  const k = await scope(); const stale = send(k, payload(1, "attempt:q0"), "mouse"); await waitFor(() => expect(stale.result?.status).toBe("rejected")); expect(k.store.get().mode).toBeNull(); k.unmount();
  let release = () => {}; const q = await scope({ gate: new Promise<void>((r) => (release = r)) }); for (let n = 0; n < 20; n++) send(q, payload(n), "mouse");
  act(() => q.store.set({ mode: "floating" })); const full = send(q, payload(20), "mouse"); await waitFor(() => expect(full.result?.status).toBe("queue-full"));
  expect(q.store.get().mode).toBe("floating"); await act(async () => release()); q.unmount();
  const l = await scope({ loadFails: true }); const lost = send(l, payload(1), "mouse"); await waitFor(() => expect(lost.result?.status).toBe("unavailable"));
  expect(l.store.get().mode).toBe("docked"); expect(document.querySelector("[data-calculator-window]")).toHaveAttribute("data-mode", "docked"); expect(screen.getByRole("button", { name: "Reload page" })).toBeInTheDocument();
});
```

Browser. Append to `transfer-helpers.ts`:

```
export const row = (page: Page, n = 1) => page.getByRole("textbox", { name: `Expression ${n}`, exact: true });
export async function transferByMouse(page: Page, latex: string, n = 0) { await item(page, latex, n).hover(); await control(page, latex, n).click(); }
export const clickControl = (page: Page, latex: string, n = 0) => control(page, latex, n).evaluate((el: HTMLElement) => el.click()); // a click with no pointerdown that no window can cover
export const windowStore = (page: Page) => page.evaluate(() => (globalThis as unknown as { __calculatorWindowStore: { get(): { mode: string | null; displaySize: string | null; reverseContrast: boolean | null } } }).__calculatorWindowStore.get());
```

`tests/calculator/v2/transfer-docking.spec.ts`:

```
import { expect, test } from "@playwright/test";
import { box, chromeOnly, clickControl, frame, open, press, row, rows, transferByMouse, windowStore } from "./transfer-helpers";
test("AR-21, TR-64, L-7 a transfer docks at 1024 px and wider over 500 px tall as a left column of clamp(400px, 45vw, 720px) resizable by 16 px arrow steps, Home, End and pointer drag between 400 px and min(900px, 100vw - 480px) with a single-column question, and opens full screen otherwise", async ({ page }, info) => {
  chromeOnly(info.project.name);
  for (const [width, height, mode] of [[1023, 800, "fullscreen"], [1024, 800, "docked"], [1280, 800, "docked"], [1440, 900, "docked"], [390, 844, "fullscreen"], [1280, 480, "fullscreen"], [1024, 500, "fullscreen"], [1024, 501, "docked"]] as const) {
    await open(page, { width, height }); await transferByMouse(page, "y>2x+1");
    await expect(frame(page), `${width}x${height}`).toHaveAttribute("data-mode", mode); await expect(row(page, 1)).toBeFocused(); expect(await rows(page)).toEqual(["y>2x+1"]);
    if (mode !== "docked") continue;
    const dock = Math.round(Math.min(720, Math.max(400, 0.45 * width))); expect(await box(frame(page))).toEqual({ x: 12, y: 12, width: dock, height: height - 24 });
    const max = Math.max(400, Math.min(900, width - 480)); const sep = page.getByRole("separator", { name: "Resize calculator dock" });
    await expect(sep).toHaveAttribute("aria-valuemin", "400"); await expect(sep).toHaveAttribute("aria-valuemax", String(max));
    expect(await page.locator("[data-question-layout]").first().evaluate((el) => getComputedStyle(el).display)).toBe("block");
    expect(await page.locator("[data-calculator-workspace]").evaluate((el) => getComputedStyle(el).marginLeft)).toBe(`${dock + 24}px`);
    if (width !== 1280) continue;
    const w = async () => (await box(frame(page))).width;
    await sep.focus(); await page.keyboard.press("ArrowRight"); expect(await w()).toBe(dock + 16); await page.keyboard.press("ArrowLeft"); expect(await w()).toBe(dock);
    await page.keyboard.press("Home"); expect(await w()).toBe(400); await page.keyboard.press("End"); expect(await w()).toBe(max);
    for (const [toX, expected] of [[20, 400], [width - 20, max]] as const) { // drags past each bound land exactly on it
      const s = await box(sep); await page.mouse.move(s.x + s.width / 2, s.y + s.height / 2); await page.mouse.down();
      await page.mouse.move(toX, s.y + s.height / 2, { steps: 4 }); await page.mouse.up(); expect(await w(), `drag to ${toX}`).toBe(expected);
      await expect(sep).toHaveAttribute("aria-valuenow", String(expected));
    }
  }
});
test("TR-65, L-9 an open floating or maximized window docks on transfer and keeps its rows, the dock persists across Next and Previous with fresh content, and a docked calculator stays docked", async ({ page }, info) => {
  chromeOnly(info.project.name); await open(page); await page.getByRole("button", { name: "Toggle Karman calculator", exact: true }).click();
  await expect(frame(page)).toHaveAttribute("data-mode", "floating"); await row(page).click(); await page.keyboard.type("1+1");
  await clickControl(page, "y>2x+1"); await expect(frame(page)).toHaveAttribute("data-mode", "docked"); expect(await rows(page)).toEqual(["1+1", "y>2x+1"]);
  await transferByMouse(page, "y=2x+3"); await expect(frame(page)).toHaveAttribute("data-mode", "docked"); expect(await rows(page)).toEqual(["1+1", "y>2x+1", "y=2x+3"]);
  await press(page, "Skip this question"); await expect(row(page)).toBeVisible(); await expect(frame(page)).toHaveAttribute("data-mode", "docked"); expect(await rows(page)).toEqual([""]);
  await press(page, "Previous"); await expect(row(page)).toBeVisible(); await expect(frame(page)).toHaveAttribute("data-mode", "docked"); expect(await rows(page)).toEqual([""]);
  await page.getByRole("button", { name: "Maximize calculator" }).click(); await expect(frame(page)).toHaveAttribute("data-mode", "maximized");
  await clickControl(page, "y>2x+1"); await expect(frame(page)).toHaveAttribute("data-mode", "docked"); expect(await rows(page)).toEqual(["y>2x+1"]);
});
test("TR-65 an open full-screen calculator at 390×844 stays full screen on transfer, keeps its rows and leaves the stored mode alone", async ({ page }, info) => {
  chromeOnly(info.project.name); await open(page, { width: 390, height: 844 }); await press(page, "Open Karman calculator");
  await expect(frame(page)).toHaveAttribute("data-mode", "fullscreen"); await row(page).click(); await page.keyboard.type("1+1");
  const stored = (await windowStore(page)).mode; await clickControl(page, "y>2x+1");
  await expect.poll(() => rows(page)).toEqual(["1+1", "y>2x+1"]); await expect(frame(page)).toHaveAttribute("data-mode", "fullscreen");
  expect((await windowStore(page)).mode).toBe(stored);
});
```

- [ ] **Step 2: Run them and see them fail** — `npx vitest run src/components/calculator/CalculatorScope.transfer.test.tsx -t "AR-21"` and `npm run test:calculator -- --project=calculator-chrome tests/calculator/v2/transfer-docking.spec.ts -g "AR-21|TR-65"`; Expected: FAIL, a transfer opens the stored or floating mode instead of docking (the full-screen TR-65 test passes already; step 6 shows it can fail).
- [ ] **Step 3: Implement** the produced store write in `transfer()` of `use-transfer-bridge.ts` at the named position (import `calculatorWindowStore` from `./calculator-window-store` and `FULL_SCREEN_QUERY` from `./breakpoints`). `CalculatorScope.tsx` does not change in this task.
- [ ] **Step 4: Run them and see them pass** — both step 2 commands, then `npx tsc --noEmit`; Expected: PASS, tsc exit 0. Then run all of 11's specs, `npm run test:calculator -- tests/calculator/v2/quiz-` (`quiz-window`, `quiz-reset`, `quiz-loading`, `quiz-dock` and `quiz-chrome-theme`); Expected: PASS (toolbar opens still follow AR-20, and 11's AR-23 and AR-26 docking, loading and failure panels and chrome theme are unchanged).
- [ ] **Step 5: Commit** — `git add src/components/calculator tests/calculator && git commit -m "Dock the v2 calculator on transfer at 1024 px and wider"`
- [ ] **Step 6: Mutation checks** (after each, `git checkout -- src/components/calculator/use-transfer-bridge.ts` and rerun to PASS):
  - Drop the `!matchMedia(FULL_SCREEN_QUERY).matches` guard; run `npm run test:calculator -- --project=calculator-chrome tests/calculator/v2/transfer-docking.spec.ts -g "TR-65 an open full-screen"`; Expected: FAIL at the last assertion, received `"docked"`.
  - Move the store write above step 3; run `npx vitest run src/components/calculator/CalculatorScope.transfer.test.tsx -t "AR-21"`; Expected: FAIL at `expect(q.store.get().mode).toBe("floating")`, received `"docked"`.

### Task 12: Focus after a transfer, focus return and announcements

**Files:**

- Modify: `src/components/calculator/use-transfer-bridge.ts`, `src/components/calculator/CalculatorScope.tsx` (the `openedByTransfer()` guard only), `src/components/calculator/TransferControl.tsx`, `src/components/calculator/CalculatorScope.transfer.test.tsx` (append), `src/components/calculator/TransferControl.test.tsx` (append), `tests/calculator/v2/transfer-helpers.ts`, `tests/calculator/v2/transfer-docking.spec.ts`

**Interfaces:**

- Consumes: `QuizCalculatorHandle.focusOnOpen(trigger: OpenTrigger): void` (10), called by 11's once-per-open effect; 11's opener memory (`document.activeElement` at open); `TransferBridgeOptions.frameRef` (the frame of `CalculatorWindow`); 11's loader copy "Reload page" and "Retry".
- Produces:
  1. In `use-transfer-bridge.ts`, a `transferOpen` ref, `{ trigger: TransferTrigger; focusDue: boolean } | null`. `transfer()` sets it to `{ trigger, focusDue: true }` whenever it opens the window (step 4 and step 5, from closed); it becomes `null` when `open` becomes false. `openedByTransfer()` returns `transferOpen.current !== null`; in `CalculatorScope.tsx`, 11's once-per-open `focusOnOpen` effect returns early while it is true, so that call is skipped for a transfer-opened open. While it is set:
     - The drain, after applying a batch while `transferOpen.current?.focusDue`, sets `focusDue = false` and, when no result of the batch has a non-null `focusRowId` (all rejected), calls `handleRef.current.focusOnOpen(transferOpen.current.trigger)`. A result with a row has already focused or activated it (`apply.ts`).
     - An effect on `[open, status, failure]`, when `open`, status is `"failed"` and `transferOpen.current?.focusDue`, focuses with `{ preventScroll: true }` the button inside `frameRef.current` whose text is "Reload page" (failure `"load"`) or "Retry" (failure `"mount"`), else the frame. A load failure then sets `focusDue = false`; a mount failure keeps it `true`, so the drain after a successful Retry still applies the fallback.
  2. After the drain applies a `"touch"` payload, `frameRef.current.focus({ preventScroll: true })` runs when `document.activeElement` is outside the frame (TR-66, OI-7's touch rule).
  3. `TransferControl`'s `onClick`, in this order: computes `trigger`; sets a `focusingForTransfer` ref to `true`; calls `button.focus({ preventScroll: true })` while `lastPointerDown` still holds the pointer; sets the ref to `false`; then resets `lastPointerDown`, clears the selection and awaits `bridge.transfer`. `onFocus` shows no tooltip while `focusingForTransfer` is `true` or `lastPointerDown` is set, so Safari (where a click does not focus the button) never shows it for this focus. The scope therefore records the control as the opener on every engine (TR-68).

- [ ] **Step 1: Write the failing tests**

Component (append to `CalculatorScope.transfer.test.tsx`):

```
it("TR-66, AR-55 a window a transfer opened takes its focus from the transfer: the row's own focus, else focusOnOpen when every result was rejected, else the failure panel's button, never the inert workspace", async () => {
  const a = await scope(); const added = send(a, payload(1), "mouse"); await waitFor(() => expect(added.result?.status).toBe("added"));
  expect(a.handles[0].focusOnOpen).not.toHaveBeenCalled(); a.unmount();
  const s = await scope({ fullScreen: true, mount: rejecting }); screen.getByRole("button", { name: "Stand-in control" }).focus();
  const out = send(s, payload(1), "touch"); await waitFor(() => expect(out.result?.status).toBe("rejected"));
  await waitFor(() => expect(document.activeElement?.closest("[data-calculator-window]")).not.toBeNull()); expect(s.handles[0].focusOnOpen.mock.calls).toEqual([["touch"]]); s.unmount();
  const f = await scope({ fullScreen: true, loadFails: true }); screen.getByRole("button", { name: "Stand-in control" }).focus();
  const lost = send(f, payload(1), "mouse"); await waitFor(() => expect(lost.result?.status).toBe("unavailable"));
  await waitFor(() => expect(screen.getByRole("button", { name: "Reload page" })).toHaveFocus());
});
```

Component (append to `TransferControl.test.tsx`; no new imports):

```
it("TR-68 a pointer click focuses the control before the transfer starts, and that focus never shows the tooltip", async () => {
  const bridge = stubbed(v2Bridge()); render(<Control />); const button = screen.getByRole("button", { name: "Transfer to Calculator: y=2x+3" });
  let focusedAtTransfer: Element | null = null;
  bridge.transfer.mockImplementation(async () => { focusedAtTransfer = document.activeElement; return { status: "added", message: "Added to calculator: y=2x+3.", focusRowId: "1" }; });
  fireEvent.pointerDown(button, { pointerType: "mouse", buttons: 1 }); fireEvent.click(button);
  await waitFor(() => expect(bridge.transfer).toHaveBeenCalledTimes(1)); expect(focusedAtTransfer).toBe(button);
  expect(document.querySelector("[data-transfer-tooltip]")).toHaveAttribute("hidden");
});
```

Browser. Append to `transfer-helpers.ts`:

```
export const statusRegion = (page: Page) => page.locator("[data-transfer-status]");
export const snapshot = (page: Page) => page.evaluate(() => { const s = globalThis.__calculatorHarness!.engine.getSnapshot();
  return { activeRowId: s.activeRowId, focusedLatex: s.rows.find((r) => r.id === s.focusedRowId)?.latex ?? null, keypad: s.settings.keypad, displaySize: s.settings.displaySize, reverseContrast: s.settings.reverseContrast, regions: [...s.geometry.values()].filter((g) => g.kind === "region").length }; });
```

Append to `transfer-docking.spec.ts`, adding `import { BLOCK_SYSTEM } from "../fixture/v2/transfer-questions";` and the helpers `anchor, control, snapshot, statusRegion, tapItem, url`:

```
test("TR-66, KB-4 a mouse or keyboard transfer focuses the new row with the caret at the end; a touch transfer activates it in view with focus in the window, no keyboard, and keypad input going to it", async ({ page }, info) => {
  const touch = /ios|android/.test(info.project.name); test.skip(!touch && info.project.name !== "calculator-chrome", "mouse, keyboard and touch projects");
  if (!touch) {
    await open(page); await transferByMouse(page, "y>2x+1"); await expect(row(page, 1)).toBeFocused(); await page.keyboard.type("5"); expect(await rows(page)).toEqual(["y>2x+15"]);
    await control(page, "y=2x+3").focus(); await page.keyboard.press("Enter"); await expect(row(page, 2)).toBeFocused(); await page.keyboard.type("1");
    expect(await rows(page)).toEqual(["y>2x+15", "y=2x+31"]); expect((await snapshot(page)).focusedLatex).toBe("y=2x+31"); return;
  }
  await page.goto(url()); await press(page, "Open Karman calculator"); await expect(row(page)).toBeVisible();
  await page.evaluate(() => globalThis.__calculatorHarness!.engine.setExpressions(Array.from({ length: 30 }, (_, i) => ({ id: String(i + 1), latex: String(i) }))));
  const keypad = (await snapshot(page)).keypad; await page.getByRole("button", { name: "Close calculator", exact: true }).tap();
  await tapItem(page, "y>2x+1"); await control(page, "y>2x+1").tap(); await expect.poll(async () => (await rows(page))?.at(-1)).toBe("y>2x+1");
  const s = await page.evaluate(() => { const e = globalThis.__calculatorHarness!.engine.getSnapshot(); const target = e.rows.find((r) => r.latex === "y>2x+1")!;
    const root = document.querySelector("[data-calculator-host]")!.shadowRoot!; const li = root.querySelector(`[data-row-id="${target.id}"]`)!; const r = li.getBoundingClientRect();
    return { active: e.activeRowId === target.id, focused: e.focusedRowId, inView: r.top >= 0 && r.bottom <= innerHeight && li.contains(root.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)),
      shadowFocus: root.activeElement?.tagName ?? null, inWindow: !!document.activeElement?.closest("[data-calculator-window]") }; });
  expect(s).toEqual({ active: true, focused: null, inView: true, shadowFocus: null, inWindow: true }); expect((await snapshot(page)).keypad).toBe(keypad);
  if (!(await snapshot(page)).keypad) await page.getByRole("button", { name: "Show keypad", exact: true }).tap(); // KB-4: the active row is the target of keypad input
  await page.getByRole("region", { name: "Keypad", exact: true }).getByRole("button", { name: "7", exact: true }).tap();
  await expect.poll(async () => (await rows(page))?.at(-1)).not.toBe("y>2x+1"); const after = (await rows(page))!; const last = after.at(-1)!;
  expect([last.includes("7"), last.replace("7", "")]).toEqual([true, "y>2x+1"]); expect(after.slice(0, 30)).toEqual(Array.from({ length: 30 }, (_, i) => String(i)));
});
test("TR-68 closing returns focus to the Transfer control that opened the calculator, and a later transfer into the open calculator does not change that target", async ({ page }, info) => {
  test.skip(!["calculator-chrome", "calculator-safari"].includes(info.project.name), "desktop engines");
  await open(page); await control(page, "y>2x+1").focus(); await page.keyboard.press("Enter"); await expect(row(page, 1)).toBeFocused();
  await page.keyboard.press("Escape"); await expect(frame(page)).toBeHidden(); await expect(control(page, "y>2x+1")).toBeFocused(); await expect(anchor(page, "y>2x+1")).toHaveAttribute("data-visible", "true");
  await transferByMouse(page, "y=2x+3"); await page.getByRole("button", { name: "Close calculator", exact: true }).click(); await expect(control(page, "y=2x+3")).toBeFocused();
  const trigger = page.getByRole("button", { name: "Toggle Karman calculator", exact: true }); await trigger.focus(); await page.keyboard.press("Enter"); await expect(frame(page)).toBeVisible();
  await clickControl(page, "y>2x+1"); await page.getByRole("button", { name: "Close calculator", exact: true }).click(); await expect(trigger).toBeFocused();
});
test("TR-67, A11Y-11 the quiz-side status region announces each transfer result once while the calculator's live region stays silent, including inequalities, systems and a renamed definition", async ({ page }, info) => {
  chromeOnly(info.project.name); await open(page);
  await page.evaluate(() => { const w = window as unknown as { said: string[]; watch(el: Element, tag: string): void }; w.said = [];
    w.watch = (el, tag) => new MutationObserver(() => { const t = el.textContent!.trim(); if (t) w.said.push(`${tag}:${t}`); }).observe(el, { childList: true, characterData: true, subtree: true });
    w.watch(document.querySelector("[data-transfer-status]")!, "quiz"); });
  const said = () => page.evaluate(() => (window as unknown as { said: string[] }).said);
  const calcRegion = () => page.locator("[data-calculator-host]").getByRole("status");
  const watchCalc = (tag: string) => calcRegion().evaluate((el, t) => (window as unknown as { watch(el: Element, tag: string): void }).watch(el, t), tag);
  await transferByMouse(page, "y>2x+1"); await expect(row(page, 1)).toBeFocused(); await expect(calcRegion()).toHaveText(""); await watchCalc("calc");
  await transferByMouse(page, "y=2x+3"); await transferByMouse(page, "y=2x+3", 1); await transferByMouse(page, BLOCK_SYSTEM); await page.waitForTimeout(1200);
  expect(await said()).toEqual([expect.stringMatching(/^quiz:Added to calculator: .+\.$/), expect.stringMatching(/^quiz:Added to calculator: .+\.$/),
    "quiz:Already in the calculator, row 2.", "quiz:Added to calculator: system of 2 inequalities."]);
  await expect.poll(async () => (await snapshot(page)).regions).toBe(3);
  await press(page, "Skip this question"); await expect.poll(() => rows(page)).toEqual([""]); // the new question's calculator, region and harness engine
  await page.evaluate(() => globalThis.__calculatorHarness!.engine.setExpressions([{ id: "1", latex: "f(x)=5x" }])); // defined without typing, so no row-error announcements
  await watchCalc("next"); await transferByMouse(page, "f(x)=x^{2}-3");
  await expect(statusRegion(page)).toHaveText(/^Added as .+ because f is already defined\.$/); await page.waitForTimeout(1000);
  expect((await said()).filter((s) => s.startsWith("calc:") || (s.startsWith("next:") && s !== "next:Calculator cleared for this question."))).toEqual([]); // A11Y-2's reset message is the only allowed one
});
test("NM-42 an over-limit transfer inserts nothing and is reported only through the TR-67 region", async ({ page }, info) => {
  chromeOnly(info.project.name); await open(page); await transferByMouse(page, "y>2x+1"); await expect(row(page, 1)).toBeFocused();
  await page.evaluate(() => globalThis.__calculatorHarness!.engine.setExpressions(Array.from({ length: 100 }, (_, i) => ({ id: String(i + 1), latex: String(i) })))); // 100 rows, the NM-42 limit
  await expect.poll(async () => (await rows(page))?.length).toBe(100);
  const calcRegion = page.locator("[data-calculator-host]").getByRole("status");
  await transferByMouse(page, "y=2x+3"); await expect(statusRegion(page)).toHaveText("This can't be added to the calculator.");
  await page.waitForTimeout(1000); await expect(calcRegion).toHaveText(""); expect((await rows(page))?.length).toBe(100);
});
```

The spec's helper import is then exactly `anchor, box, chromeOnly, clickControl, control, frame, open, press, row, rows, snapshot, statusRegion, tapItem, transferByMouse, url, windowStore`.

- [ ] **Step 2: Run them and see them fail** — `npx vitest run src/components/calculator/CalculatorScope.transfer.test.tsx src/components/calculator/TransferControl.test.tsx -t "TR-66|TR-68"` and `npm run test:calculator -- --project=calculator-chrome --project=calculator-safari --project=calculator-ios --project=calculator-android tests/calculator/v2/transfer-docking.spec.ts -g "TR-66|TR-68|TR-67|NM-42"`; Expected: FAIL:
  - Component: 11's effect still calls `focusOnOpen` after an added transfer, its trigger is not `"touch"` after the rejected one, the load-failure open leaves focus on the stand-in control, and the click leaves `document.activeElement` on `body`.
  - On iOS and Android, `focusOnOpen` focuses a MathField (`shadowFocus` is `"TEXTAREA"`), and focus is not inside the window.
  - On Safari the clicked control never receives focus, so Close returns focus to the toolbar button.
  - TR-67 passes already (task 3); step 6 shows it can fail.
  - NM-42 passes on its first run (12's apply step refuses the transfer and task 3 announces the result); step 6 shows it can fail.
- [ ] **Step 3: Implement** the three produced changes: items 1 and 2 in `use-transfer-bridge.ts` plus the one-line `if (transferBridge.openedByTransfer()) return;` at the top of 11's once-per-open `focusOnOpen` effect in `CalculatorScope.tsx`; item 3 in `TransferControl.tsx`.
- [ ] **Step 4: Run them and see them pass** — the step 2 commands, then `npx tsc --noEmit`; Expected: PASS, tsc exit 0. Then all of 11's specs, `npm run test:calculator -- tests/calculator/v2/quiz-`; Expected: PASS (11's open-time focus, focus return, docking, loading and failure panels, chrome theme and reset are unchanged).
- [ ] **Step 5: Commit** — `git add src/components/calculator tests/calculator && git commit -m "Focus or activate the transferred row and return focus to the Transfer control"`
- [ ] **Step 6: Mutation checks (TR-67, NM-42).** After each, `git checkout -- src/components/calculator/use-transfer-bridge.ts` and rerun; Expected: PASS.
  - TR-67: in `src/components/calculator/use-transfer-bridge.ts` make the drain skip `announce` when `result.status === "already-present"`; run `npm run test:calculator -- --project=calculator-chrome tests/calculator/v2/transfer-docking.spec.ts -g "TR-67"`; Expected: FAIL at the `said` list, missing `"quiz:Already in the calculator, row 2."`.
  - NM-42: in the same file make the drain skip `announce` when `result.status === "rejected"`; run the same command with `-g "NM-42"`; Expected: FAIL at the status region text (`"This can't be added to the calculator."`).

### Task 13: Held payloads, failures and question keys in the browser

**Files:**

- Create: `tests/calculator/v2/transfer-failures.spec.ts`
- Modify: `tests/calculator/v2/transfer-helpers.ts`; and, only to fix a failure step 2 finds, `src/components/calculator/use-transfer-bridge.ts` and `src/components/calculator/CalculatorScope.tsx` (conditional)

**Interfaces:**

- Consumes: task 3's queue and failure handling; 11's loader copy ("Loading calculator…", "The calculator could not load.", "The calculator could not load. Reload the page to try again.", "Retry", "Reload page"); `globalThis.__calculatorWindowStore` (11).

- [ ] **Step 1: Write the tests.** Append to `transfer-helpers.ts`:

```
export const HOST = /\/calculator-v2\/host\/quiz-host\.ts/;
export const failMountOnce = () => { let failed = false; const attach = Element.prototype.attachShadow;
  Element.prototype.attachShadow = function (init) { if (!failed && this.hasAttribute("data-calculator-host")) { failed = true; throw new Error("fixture mount failure"); } return attach.call(this, init); }; };
```

`tests/calculator/v2/transfer-failures.spec.ts`:

```
import { expect, test } from "@playwright/test";
import { HOST, chromeOnly, clickControl, failMountOnce, frame, open, press, row, rows, snapshot, statusRegion, transferByMouse, windowStore } from "./transfer-helpers";
test("TR-69 pressing Transfer starts the load and the held payload applies once when ready; after a mount failure it applies once after Retry; a load failure is announced", async ({ page, context }, info) => {
  chromeOnly(info.project.name); let requested = 0; page.on("request", (r) => { if (HOST.test(r.url())) requested++; });
  await page.route(HOST, async (route) => { await new Promise((r) => setTimeout(r, 800)); await route.continue(); });
  await open(page); expect(requested).toBe(0); await clickControl(page, "y>2x+1");
  await expect.poll(() => requested).toBe(1); await expect(page.getByText("Loading calculator…")).toBeVisible();
  await expect.poll(() => rows(page)).toEqual(["y>2x+1"]); await page.waitForTimeout(500); expect(await rows(page)).toEqual(["y>2x+1"]);
  const second = await context.newPage(); await second.addInitScript(failMountOnce); await open(second); await transferByMouse(second, "y>2x+1");
  await expect(second.getByText("The calculator could not load.", { exact: true })).toBeVisible(); await expect(statusRegion(second)).toHaveText("Calculator unavailable. Use Retry in the calculator panel.");
  await second.getByRole("button", { name: "Retry" }).click(); await expect.poll(() => rows(second)).toEqual(["y>2x+1"]); await second.waitForTimeout(500); expect(await rows(second)).toEqual(["y>2x+1"]);
  await expect(statusRegion(second)).toHaveText(/^Added to calculator: .+\.$/);
  const third = await context.newPage(); await third.route(HOST, (route) => route.abort()); await open(third); await transferByMouse(third, "y>2x+1");
  await expect(statusRegion(third)).toHaveText("Calculator unavailable. Reload the page to use it.");
});
test("AR-55 after a failed load a transfer opens the window on the failure panel with focus on its button and announces the table 11.1 message instead of failing silently", async ({ page, context }, info) => {
  chromeOnly(info.project.name); await page.route(HOST, (route) => route.abort()); await open(page);
  await page.getByRole("button", { name: "Toggle Karman calculator", exact: true }).click(); await expect(page.getByText("The calculator could not load. Reload the page to try again.")).toBeVisible();
  await page.getByRole("button", { name: "Close calculator", exact: true }).click(); await transferByMouse(page, "y>2x+1");
  await expect(frame(page)).toBeVisible(); await expect(page.getByRole("button", { name: "Reload page" })).toBeFocused(); await expect(statusRegion(page)).toHaveText("Calculator unavailable. Reload the page to use it.");
  const mount = await context.newPage(); await mount.addInitScript(failMountOnce); await open(mount);
  await mount.getByRole("button", { name: "Toggle Karman calculator", exact: true }).click(); await expect(mount.getByRole("button", { name: "Retry" })).toBeVisible();
  await mount.getByRole("button", { name: "Close calculator", exact: true }).click(); await transferByMouse(mount, "y>2x+1");
  await expect(frame(mount)).toBeVisible(); await expect(mount.getByRole("button", { name: "Retry" })).toBeFocused(); await expect(statusRegion(mount)).toHaveText("Calculator unavailable. Use Retry in the calculator panel.");
});
test("TR-70 a question change discards held payloads, and transfers never change display size or reverse contrast", async ({ page }, info) => {
  chromeOnly(info.project.name); await page.route(HOST, async (route) => { await new Promise((r) => setTimeout(r, 1500)); await route.continue(); });
  await open(page); await clickControl(page, "y>2x+1"); await press(page, "Skip this question");
  await expect(row(page)).toBeVisible(); expect(await rows(page)).toEqual([""]); await page.waitForTimeout(500); expect(await rows(page)).toEqual([""]);
  await transferByMouse(page, "f(x)=x^{2}-3"); await expect.poll(() => rows(page)).toEqual(["f(x)=x^{2}-3"]); // the transfer itself has landed
  const s = await snapshot(page); expect([s.displaySize, s.reverseContrast]).toEqual(["default", false]);
  expect(await windowStore(page)).toMatchObject({ displaySize: null, reverseContrast: null });
});
```

- [ ] **Step 2: Run them** — `npm run test:calculator -- --project=calculator-chrome tests/calculator/v2/transfer-failures.spec.ts -g "TR-69|AR-55|TR-70"`, then `npx tsc --noEmit`; Expected: PASS on first run (tasks 3 and 12 built the behaviour), tsc exit 0. A failure is fixed in `use-transfer-bridge.ts` (or, for the hook call or the region, `CalculatorScope.tsx`), never by loosening an assertion.
- [ ] **Step 3: Commit** — `git add tests/calculator src/components/calculator && git commit -m "Verify held transfers across loading, failures and question changes"`
- [ ] **Step 4: Mutation checks** (command: the step 2 Playwright command with `-g "<ID>"`; after each, `git checkout -- src/components/calculator/use-transfer-bridge.ts` and rerun to PASS):
  - TR-69: remove `status` from the drain's dependency list and drop the `tick` bump from `onHandle`, so nothing wakes the drain when the payload held during loading becomes applicable. (Removing `status` alone breaks nothing: 11's loader calls `onStatus("ready")` and then `onHandle(…)` in one callback, React renders both updates together, and the `tick` bump re-runs the drain.) Expected: FAIL at the first `expect.poll(() => rows(page)).toEqual(["y>2x+1"])` (rows stay `[""]`: the payload held while loading is never applied).
  - AR-55: delete the `onOpenChange(true)` call of step 4 (load failed); Expected: FAIL at the first `expect(frame(page)).toBeVisible()`.
  - TR-70: replace the `held` ref with a module-level array shared by every scope and delete the unmount cleanup's `DISCARDED` resolve; Expected: FAIL at `expect(await rows(page)).toEqual([""])`, received `["y>2x+1"]`.

### Task 14: Contrast and theme (TR-53, TH-2, AR-37; TH-1 and TH-14 contributions)

**Files:**

- Modify: `tests/calculator/v2/transfer-helpers.ts`, `tests/calculator/v2/transfer.spec.ts`; and, only for the decision's border fallback, `src/components/calculator/TransferControl.module.css` (conditional)

**Interfaces:**

- Consumes: `SKIN_IDS`, `SkinId`, `SKIN_COLORS` (`SKIN_COLORS[skin].normal.dark` and `.roles`), `contrastRatio(foreground: string, background: string): number`, `compositeShading(paper: string, fills: { color: string; alpha: number }[]): string` and `resolveRowColor(color: string, skin: SkinId): { hex: string; fillAlpha: number; adjusted: boolean }` (03, for TH-8); the `--kcc-*` sheet (03); 10's theme watcher, `[data-kc-layout]` and the shadow host's `--kc-*` properties (TH-15); 10's `installStyles`, which adopts constructed sheets when `CSSStyleSheet.prototype.replaceSync` exists and `"adoptedStyleSheets" in shadow` (true in Chromium) and otherwise appends `<style>` elements.
- Produces: the helpers below, including `applySkin(page, skin)` (decision "Theme switching in browser tests").

- [ ] **Step 1: Write the tests.** Append to `transfer-helpers.ts`, adding `import { SKIN_COLORS } from "../../../src/lib/calculator-v2/theme/skin-colors.generated";` and `import type { SkinId } from "../../../src/lib/calculator-v2/theme/skins";`:

```
export const applySkin = (page: Page, skin: SkinId) => page.evaluate(([s, dark]) => { const r = document.documentElement; r.classList.toggle("dark", dark); r.dataset.theme = s; }, [skin, SKIN_COLORS[skin].normal.dark] as const); // as applyTheme does
export const hex = (css: string) => `#${css.match(/[\d.]+/g)!.slice(0, 3).map((n) => Math.round(Number(n)).toString(16).padStart(2, "0")).join("")}`;
export const paint = (a: Locator) => a.evaluate((el: HTMLElement) => {
  const rgba = (v: string) => { const n = (v.match(/[\d.]+/g) ?? []).map(Number); return n.length < 3 ? [0, 0, 0, 0] : [n[0], n[1], n[2], n.length > 3 ? n[3] : 1]; };
  const under = (x: number, y: number) => { // the colour actually under (x, y): the anchor's own subtree skipped, translucent layers composited over the first opaque one
    const layers = document.elementsFromPoint(x, y).filter((e) => !el.contains(e)).map((e) => rgba(getComputedStyle(e).backgroundColor)).filter((c) => c[3] > 0);
    const base = layers.findIndex((c) => c[3] === 1); let rgb = base < 0 ? [255, 255, 255] : layers[base].slice(0, 3);
    for (const c of layers.slice(0, base < 0 ? layers.length : base).reverse()) rgb = rgb.map((v, i) => c[3] * c[i] + (1 - c[3]) * v);
    return `rgb(${rgb.map(Math.round).join(", ")})`; };
  const around = (r: DOMRect, d: number) => [under(r.left + r.width / 2, r.top - d), under(r.left + r.width / 2, r.bottom + d), under(r.left - d, r.top + r.height / 2), under(r.right + d, r.top + r.height / 2)];
  const b = el.querySelector("button")!; const s = getComputedStyle(b); const t = getComputedStyle(el.querySelector("[data-transfer-tooltip]")!); const r = b.getBoundingClientRect();
  const item = el.dataset.placement === "cluster" ? null : el.previousElementSibling;
  const ir = item?.getBoundingClientRect(); // the selected outline sits 2 px outside the item box and is 2 px wide
  return { glyph: getComputedStyle(b.querySelector("svg")!).color, button: s.backgroundColor, border: s.borderTopColor, ring: s.outlineColor, ringStyle: [s.outlineStyle, s.outlineWidth, s.outlineOffset],
    outline: item ? getComputedStyle(item).outlineColor : s.outlineColor, tipText: t.color, tipBg: t.backgroundColor,
    pages: around(r, 2), // beside the button: what its border and focus ring sit on
    outlinePages: ir ? [...around(ir, 1), ...around(ir, 5)] : around(r, 2) }; // beside the item's outline: its 2 px offset gap and just outside the line
});
export const recordStrokes = () => { const w = window as unknown as { __transferStrokes: string[] }; w.__transferStrokes = []; const stroke = CanvasRenderingContext2D.prototype.stroke;
  CanvasRenderingContext2D.prototype.stroke = function (this: CanvasRenderingContext2D, ...args: unknown[]) { w.__transferStrokes.push(String(this.strokeStyle)); return (stroke as (...a: unknown[]) => void).apply(this, args); }; };
export const strokes = (page: Page) => page.evaluate(() => (window as unknown as { __transferStrokes: string[] }).__transferStrokes);
export const nextFrame = () => new Promise<void>((r) => requestAnimationFrame(() => setTimeout(r, 0)));
export const markLayout = () => { (document.querySelector("[data-calculator-host]")!.shadowRoot!.querySelector("[data-kc-layout]") as unknown as { kcMark?: number }).kcMark = 1; };
export const layoutMarked = () => (document.querySelector("[data-calculator-host]")!.shadowRoot!.querySelector("[data-kc-layout]") as unknown as { kcMark?: number }).kcMark === 1;
export const kcPaper = (page: Page) => page.evaluate(() => getComputedStyle(document.querySelector("[data-calculator-host]")!).getPropertyValue("--kc-paper").trim().toLowerCase());
export const shadingLayer = (page: Page) => page.evaluate(() => { // 08's graph-pixels.ts layerColors(page, "shading"), read in the calculator host's shadow root (graph-pixels.ts reads #root's, the graph harness)
  const c = document.querySelector("[data-calculator-host]")!.shadowRoot!.querySelector<HTMLCanvasElement>('canvas[data-layer="shading"]')!; const d = c.getContext("2d")!.getImageData(0, 0, c.width, c.height).data;
  const opaque = new Set<string>(); let partial = 0;
  for (let i = 0; i < d.length; i += 4) { if (d[i + 3] === 255) opaque.add(`#${[d[i], d[i + 1], d[i + 2]].map((v) => v.toString(16).padStart(2, "0")).join("")}`); else if (d[i + 3] > 0) partial++; }
  return { opaque: [...opaque], partial }; });
```

Add to `transfer.spec.ts` the imports `import { SKIN_IDS, type SkinId } from "../../../src/lib/calculator-v2/theme/skins";`, `import { SKIN_COLORS } from "../../../src/lib/calculator-v2/theme/skin-colors.generated";` and `import { compositeShading, contrastRatio } from "../../../src/lib/calculator-v2/theme/contrast";` and `import { resolveRowColor } from "../../../src/lib/calculator-v2/theme/roles";`, and the helpers `applySkin, hex, kcPaper, layoutMarked, markLayout, nextFrame, paint, recordStrokes, row, rows, shadingLayer, snapshot, strokes, transferByMouse`, then append:

```
test("TR-53, TH-1, TH-14 in all 12 skins the glyph is 4.5:1 on the button, the boundary and focus ring 3:1 on the colour beside the control, the selected outline 3:1 on the colour beside the item, the ring 2 px solid offset 2 px and the tooltip text 7:1", async ({ page }, info) => {
  chromeOnly(info.project.name); await open(page);
  for (const skin of SKIN_IDS) {
    await applySkin(page, skin); await page.mouse.move(5, 790);
    for (const [label, a, focus] of [["stem", anchor(page, "y>2x+1"), control(page, "y>2x+1")], ["choice", choiceAnchor(page, "A"), choiceControl(page, "A")]] as const) {
      await page.keyboard.press("Shift"); await focus.focus(); const c = await paint(a);
      expect(contrastRatio(hex(c.glyph), hex(c.button)), `${skin} ${label} glyph`).toBeGreaterThanOrEqual(4.5);
      for (const k of ["border", "ring"] as const) for (const [side, bg] of c.pages.entries()) expect(contrastRatio(hex(c[k]), hex(bg)), `${skin} ${label} ${k} side ${side}`).toBeGreaterThanOrEqual(3);
      for (const [side, bg] of c.outlinePages.entries()) expect(contrastRatio(hex(c.outline), hex(bg)), `${skin} ${label} outline side ${side}`).toBeGreaterThanOrEqual(3);
      expect(c.ringStyle, `${skin} ${label}`).toEqual(["solid", "2px", "2px"]);
      if (label === "stem") expect(contrastRatio(hex(c.tipText), hex(c.tipBg)), `${skin} tooltip`).toBeGreaterThanOrEqual(7);
    }
  }
});
test("TH-2, AR-37 the control, tooltip and selected outline take their colours from --kcc-* and repaint on a theme change", async ({ page }, info) => {
  chromeOnly(info.project.name); await open(page); await page.keyboard.press("Shift"); await control(page, "y>2x+1").focus(); const seen: string[] = [];
  const v = (name: string) => page.evaluate((n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim().toLowerCase(), name);
  for (const skin of ["ivory", "observatory"] as const) {
    await applySkin(page, skin); const c = await paint(anchor(page, "y>2x+1"));
    expect([hex(c.button), hex(c.glyph), hex(c.border), hex(c.ring), hex(c.outline), hex(c.tipText), hex(c.tipBg)], skin)
      .toEqual([await v("--kcc-chrome"), await v("--kcc-text"), await v("--kcc-boundary"), await v("--kcc-focus"), await v("--kcc-focus"), await v("--kcc-text"), await v("--kcc-chrome")]);
    seen.push(c.button);
  }
  expect(seen[0]).not.toBe(seen[1]);
});
test("AR-37 the open calculator's shadow CSS reads only inherited or locally declared custom properties and repaints within one frame on a theme switch, contrast, reduced-motion and colour-scheme changes, with no remount", async ({ page }, info) => {
  chromeOnly(info.project.name); await page.addInitScript(recordStrokes); await page.emulateMedia({ colorScheme: "light", contrast: "no-preference", reducedMotion: "no-preference" });
  await open(page); await applySkin(page, "ivory");
  await press(page, "Toggle Karman calculator"); await expect(row(page)).toBeVisible();
  await page.evaluate(() => globalThis.__calculatorHarness!.engine.setExpressions([{ id: "1", latex: "y=x" }])); await expect.poll(async () => (await strokes(page)).length).toBeGreaterThan(0);
  const vars = await page.evaluate(() => {
    const host = document.querySelector<HTMLElement>("[data-calculator-host]")!; const root = host.shadowRoot!;
    const sheets = [...root.adoptedStyleSheets, ...root.styleSheets]; // 10's installStyles adopts constructed sheets in Chromium and falls back to <style> elsewhere
    const css = sheets.flatMap((s) => [...s.cssRules].map((r) => r.cssText)).join("\n"); // CSSOM text holds no comments
    const declared = new Set([...css.matchAll(/(--[\w-]+)\s*:/g), ...[...root.querySelectorAll<HTMLElement>("[style]")].flatMap((e) => [...e.getAttribute("style")!.matchAll(/(--[\w-]+)\s*:/g)])].map((m) => m[1]));
    const read = [...new Set([...css.matchAll(/var\(\s*(--[\w-]+)\s*\)/g)].map((m) => m[1]))]; const cs = getComputedStyle(host);
    return { sheets: sheets.length, read: read.length, missing: read.filter((n) => !declared.has(n) && cs.getPropertyValue(n).trim() === "") };
  });
  expect(vars.sheets).toBeGreaterThan(0); expect(vars.read).toBeGreaterThan(0); expect(vars.missing).toEqual([]); await page.evaluate(markLayout);
  const changes: [string, () => Promise<unknown>, SkinId | null][] = [
    ["theme switch (class and data-theme, as applyTheme does)", () => applySkin(page, "observatory"), "observatory"],
    ["prefers-contrast", () => page.emulateMedia({ contrast: "more" }), null],
    ["prefers-reduced-motion", () => page.emulateMedia({ reducedMotion: "reduce" }), null],
    ["data-theme removed", () => page.evaluate(() => { const r = document.documentElement; r.classList.toggle("dark", false); delete r.dataset.theme; }), "ivory"],
    ["prefers-color-scheme", () => page.emulateMedia({ colorScheme: "dark" }), "observatory"],
  ];
  for (const [name, change, skin] of changes) {
    const before = (await strokes(page)).length; await change(); await page.evaluate(nextFrame);
    expect((await strokes(page)).length, name).toBeGreaterThan(before);
    if (skin) expect(await kcPaper(page), name).toBe(SKIN_COLORS[skin].normal.roles.paper.toLowerCase());
  }
  expect([await page.evaluate(layoutMarked), await rows(page)]).toEqual([true, ["y=x"]]);
});
test("TH-8 a transferred inequality and system shade within 1.3:1 and keep curves at 4.5:1", async ({ page }, info) => {
  chromeOnly(info.project.name); await open(page); await transferByMouse(page, "y>2x+1"); await transferByMouse(page, BLOCK_SYSTEM);
  await expect.poll(async () => (await snapshot(page)).regions).toBe(3); // the inequality and the system's 2 inequalities
  const colors = await page.evaluate(() => globalThis.__calculatorHarness!.engine.getSnapshot().rows.map((r) => r.color));
  for (const skin of SKIN_IDS) {
    const paper = SKIN_COLORS[skin].normal.roles.paper; await applySkin(page, skin); await expect.poll(() => kcPaper(page)).toBe(paper.toLowerCase()); await page.evaluate(nextFrame);
    const fills = colors.map((c) => resolveRowColor(c, skin)); // each row's curve colour and fill alpha, in row order
    const allowed = Array.from({ length: 2 ** fills.length - 1 }, (_, m) => compositeShading(paper, fills.filter((_, i) => ((m + 1) >> i) & 1).map((f) => ({ color: f.hex, alpha: f.fillAlpha }))).toLowerCase());
    const { opaque, partial } = await shadingLayer(page);
    expect(partial, `${skin} partial shading pixels`).toBe(0); expect(opaque.length, `${skin} shading painted`).toBeGreaterThan(0);
    for (const c of opaque) {
      expect(contrastRatio(c, paper), `${skin} ${c} on the paper`).toBeLessThanOrEqual(1.3 + 1e-9);
      expect(allowed, `${skin} ${c} is a compositeShading result`).toContain(c);
      for (const f of fills) expect(contrastRatio(f.hex, c), `${skin} curve ${f.hex} on ${c}`).toBeGreaterThanOrEqual(4.5);
    }
  }
});
```

If the decision's border fallback is applied, the TH-2 mapping's `--kcc-boundary` entry becomes `--kcc-text-secondary` in the same commit.

- [ ] **Step 2: Run them** — `npm run test:calculator -- --project=calculator-chrome tests/calculator/v2/transfer.spec.ts -g "TR-53|TH-2|AR-37|TH-8"`, then `npx tsc --noEmit`; Expected: PASS on first run, since tasks 4, 8 and 9 use only `--kcc-*`, 10's watcher repaints the canvas and 08 paints shading through `compositeShading`; tsc exit 0.
  - A skin whose border fails 3:1 against an adjacent colour applies the decision's `--kcc-text-secondary` fallback in `TransferControl.module.css`, and updates this test's mapping, in one commit.
  - A failing focus ring or selected outline stops the task and goes to the lead (03 owns `--kcc-focus`).
  - A failing AR-37 case (a missing variable, no sheet found, or no repaint after one frame, for example on `prefers-reduced-motion`) is reported to the lead with the failing name, because 10 owns the watcher and `installStyles`; this package never edits `src/components/calculator-v2/`.
- [ ] **Step 3: Commit** — `git add tests/calculator src/components/calculator && git commit -m "Check Transfer control contrast, theme repaint and shadow custom properties in all 12 skins"`
- [ ] **Step 4: Mutation checks** (command: the step 2 Playwright command with `-g "<ID>"`; after each, `git checkout -- <file>` and rerun to PASS):
  - TR-53: in `src/components/calculator/TransferControl.module.css` set `.button`'s `color` to `var(--kcc-chrome)`; Expected: FAIL at `observatory stem glyph` (ratio 1).
  - TH-2: in the same file set `.tooltip`'s `background` to `var(--kcc-text-secondary)`; Expected: FAIL at the `ivory` mapping (the seventh value, the tooltip background, differs).
  - AR-37: in `src/components/calculator-v2/KarmanCalculator.ts` (temporary only) remove the `watchTheme(…)` registration; Expected: FAIL at `theme switch (class and data-theme, as applyTheme does)`.
  - TH-8: in `src/lib/calculator-v2/render/shading.ts` (temporary only) colour each run with its last region's `color` in place of the `compositeShading` result; Expected: FAIL at the 1.3:1 bound (`<skin> <colour> on the paper`).

### Adaptations made while executing tasks 11 to 14

Task 11:

- The docking write sits in `transfer-bridge-core.ts` (D4), between the queue-full refusal and the
  load-failure step, as the plan places it in `transfer()`. Since the AR-33 size work below it calls
  `s.dock()`, a closure the eager hook puts on the scope state, so the lazy core imports neither
  `breakpoints.ts` nor `calculator-window-store.ts`.
- Consistency with the parity work: the first toolbar open of a page session already docks on wide
  viewports (`toggle` in `CalculatorScope.tsx`), and a transfer docks on every wide-viewport press,
  so the TR-65 test first undocks the toolbar-opened window to reach floating. `quiz-helpers.ts`
  `openV2` and 11's quiz specs are unchanged and pass. `CalculatorScope.tsx` did not grow.
- `transferByMouse` moves the mouse to the centre of the item's last line box (and waits for the
  page's finite animations): at 1023 px the inline item wraps, so its bounding-box centre lies
  between its lines, and a new question's card moves while it enters. Rows are clicked and checked
  for visibility through their list item (`rowItem`), as 11's helpers do: MathQuill keeps the
  textarea at 0 x 0. `windowStore` reads `__calculatorWindowStore?.get() ?? null`.
- Found while writing task 12's TR-67 test: docked, the question layout is a scroll box
  (`calculator.module.css`, 11), so an inline control above a stem's first line was clipped (the
  t2 stem's `f(x)=x^{2}-3` control could not be clicked). `transfer-control.css` (lazy, v2 only)
  gives the docked workspace's `[data-question-layout]` 24 px of top padding. Lead: confirm, or move
  the rule to 11's sheet.

Task 12:

- `transferOpen` is the scope state's `opened` field (with `wasOpen` and `failureSeen`), and the
  close reset happens in the drain, which runs on every `open` change, so no new eager effect was
  needed. The failure-panel focus runs in `settle` (formerly `settleFailure`), whose effect gained
  `open`; announcements there fire only when the status or failure changes.
- `openedByTransfer()` is on the bridge. In `CalculatorScope.tsx` 11's once-per-open `focusOnOpen`
  effect moved below the `useTransferBridge` call (so it can read `openedByTransfer` without a
  forward reference) with the guard in its condition; 11's opener-memory layout effect still runs
  before the drain. Net line change 0 (664).
- TR-68 component test also checks a click with no `pointerdown` (the DOM click the browser specs
  use): it focuses the control and shows no tooltip. Task 4's TR-59 test asserted no
  `[data-transfer-selected]` after such a click; the control now has focus, which shows the
  outline by the DOM contract, so the test checks instead that no tap selection was made.
- TR-66 touch: the activated row is revealed after it grows in (L-14), so the touch state is
  polled. NM-42: replacing the focused row 1 with 100 rows makes the calculator read "Expression 1
  equals 0" (its own row announcement), so the test starts watching the calculator's live region
  after that and asserts the transfer adds nothing to it.
- TR-66 and TR-68 passed on calculator-chrome before the change (Chromium focuses a clicked
  button and 11's effect only runs for toolbar opens); calculator-android TR-66 failed as planned
  (focus not in the window). Safari and iOS cannot run here.

Task 13: passed on first run; all three mutation checks failed as stated.

Task 14:

- TR-53 found `--kcc-boundary` at 2.70:1 beside ivory's choice cluster, so the button border uses
  `--kcc-text-secondary` in every skin (decision "Light-DOM colours"), the TH-2 mapping says so, and
  the four calculator-chrome `-linux` baselines were re-recorded and reviewed (darker 1 px border;
  glyph, overlap and corner unchanged). The tooltip keeps its `--kcc-boundary` border (no 3:1 rule
  applies to it). The test waits for the page's transitions after each skin switch: the diagnostic
  choice has `transition-all`, and a mid-transition background read 2.81:1 for plum.
- TH-8 was amended in the parity work (a per-skin `shadingCap`, `--kc-shading-cap`, not 1.3), so
  the test bounds each skin by `SKIN_COLORS[skin].normal.shadingCap` and passes that cap to
  `compositeShading`; observatory's legitimate colour `#1f3437` is 1.33:1.
- Finding for 10: the open calculator does not repaint on a `prefers-reduced-motion` change
  (`watchTheme` follows colour scheme, contrast and forced colours only). That case is a separate
  `test.fixme` in `transfer.spec.ts`; the main AR-37 test covers the theme switch, contrast,
  `data-theme` removal and colour scheme.

AR-33 (package gate): the real build (`npm run cf:build`, `check-calculator-v2-bundle.mjs`) failed
the 10240-byte eager budget on `/learn/daily` at 11,514 bytes. The same build of `18ac662`'s
sources measures 9,007 there, so this package's real eager addition was 2,507 bytes, not the
1,240 the esbuild estimate gives. Turbopack had merged `TransferControl.module.css` into a CSS
chunk the route loads eagerly (406 bytes), and every `import()` adds a loader stub. Reductions:
the module sheet's rules moved into the plain global `transfer-control.css` keyed on the DOM
contract's attributes (Turbopack keeps a global sheet imported only by lazy code in its own lazy
chunk; `TransferControl.module.css` is gone and Next's pure-mode rule no longer applies); the
classifier, item lookup and control load through one entry, `transfer-lazy.ts`, and one
`import()` in `transfer-classifier.ts` (the hook keeps its own `import("./transfer-bridge-core")`:
under Vitest a dynamic import made from a module first loaded through the mocked
`CalculatorScope`'s `importOriginal` chain gets the unmocked `CalculatorScope`); the eager hook and
loader were slimmed; the control computes the question id itself. Daily is now 10,689 (this
package +1,682; room 1,233), still 449 over. Lead decision needed.
