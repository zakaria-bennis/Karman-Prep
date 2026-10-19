# 14 transfer-ui, part 1 of 4: rejection reporter, tap rules, the bridge hook and the Transfer control (Tasks 1 to 4)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

Part 1 of 4 of package `14-transfer-ui.md`, which holds the package header (commands, type
checks, preconditions), the package-internal names, the DOM contract, the Decisions, the Notes for
the lead and the package gate; they apply to every task here. Check the preconditions before task

1. Tasks run in number order across the four parts; each part starts where the previous one ends.

---

### Task 1: Rejection reporter (TR-73 contribution)

**Files:**

- Create: `src/components/calculator/transfer-report.ts`, `src/components/calculator/transfer-report.test.ts`

**Interfaces:**

- Consumes: `captureException` from `@sentry/nextjs` (as `report-error.ts`, 03, does);
  `TransferResult` (12, `payload.ts`, type only).
- Produces: section 14 `reportTransferRejection(questionId: string, ruleId: string): void`; the
  package-internal `markCoreRejection(result: TransferResult): TransferResult` and
  `isCoreRejection(result: TransferResult): boolean`.

- [ ] **Step 1: Write the failing tests** (`transfer-report.test.ts`; `.ts`, so it never holds JSX)

```
// @vitest-environment jsdom
import { beforeEach, expect, it, vi } from "vitest";
import type { TransferResult } from "@/lib/calculator-transfer/payload";
import { isCoreRejection, markCoreRejection, reportTransferRejection } from "./transfer-report";
const h = vi.hoisted(() => ({ capture: vi.fn(), bridge: null as unknown }));
vi.mock("@sentry/nextjs", () => ({ captureException: h.capture }));
const REJECTED: TransferResult = { status: "rejected", message: "This can't be added to the calculator.", focusRowId: null };
beforeEach(() => h.capture.mockClear());
it("TR-73 the reporter receives only the question id and the rule ID", () => {
  reportTransferRejection("q7", "TR-11");
  expect(h.capture).toHaveBeenCalledTimes(1);
  const [error, context] = h.capture.mock.calls[0];
  expect(error).toBeInstanceOf(Error); expect((error as Error).message).toBe("calculator-transfer-rejected");
  expect(context).toEqual({ tags: { questionId: "q7", ruleId: "TR-11" } });
});
it("TR-73 only a result the drain marks as a core-check rejection is reportable, and the mark adds no field", () => {
  const core = { ...REJECTED }; const stale = { ...REJECTED };
  expect(markCoreRejection(core)).toBe(core);
  expect([isCoreRejection(core), isCoreRejection(stale)]).toEqual([true, false]); expect(core).toEqual(stale);
});
```

- [ ] **Step 2: Run them and see them fail** — `npx vitest run src/components/calculator/transfer-report.test.ts`; Expected: FAIL, `Failed to resolve import "./transfer-report"`.
- [ ] **Step 3: Implement** — `reportTransferRejection`'s body is exactly `captureException(new Error("calculator-transfer-rejected"), { tags: { questionId, ruleId } });`. A module-level `const marked = new WeakSet<TransferResult>()`; `markCoreRejection` adds the result and returns it; `isCoreRejection` is `marked.has(result)`. No React, no `"use client"`.
- [ ] **Step 4: Run them and see them pass** — same command, then `npx tsc --noEmit`; Expected: PASS (2 tests), tsc exit 0.
- [ ] **Step 5: Commit** — `git add src/components/calculator/transfer-report* && git commit -m "Report rejected transfers with only the question id and rule ID"`

### Task 2: Selection store and tap rules

**Files:**

- Create: `src/components/calculator/transfer-selection.ts`, `src/components/calculator/transfer-selection.test.ts`

**Interfaces:**

- Consumes: `TransferTrigger` (12, `src/lib/calculator-transfer/payload.ts`, type only).
- Produces: every `transfer-selection.ts` name in the package-internal block of `14-transfer-ui.md`.

- [ ] **Step 1: Write the failing tests** (`transfer-selection.test.ts`, node environment)

```
import { beforeEach, expect, it, vi } from "vitest";
import { TAP_MAX_MOVE_PX, TAP_MAX_MS, isHoverPointer, isTap, transferSelection, triggerFor } from "./transfer-selection";
const at = (x: number, y: number, t: number, pointerType = "touch") => ({ pointerType, x, y, t });
beforeEach(() => transferSelection.resetForTests());
it("TR-54, AR-10 only a mouse or a hovering pen reveals by hover, and the trigger follows the activating pointer: a pen tap is touch, a click from a hovering pen is mouse", () => {
  expect(typeof globalThis.matchMedia).toBe("undefined");
  expect([{ pointerType: "mouse", buttons: 0 }, { pointerType: "pen", buttons: 0 }, { pointerType: "pen", buttons: 1 }, { pointerType: "touch", buttons: 0 }].map(isHoverPointer)).toEqual([true, true, false, false]);
  const touch = { pointerType: "touch" }; const pen = { pointerType: "pen" }; const mouse = { pointerType: "mouse" };
  expect([triggerFor(touch, false), triggerFor(touch, true), triggerFor(pen, false), triggerFor(pen, true), triggerFor(mouse, false), triggerFor(null, false), triggerFor(null, true)])
    .toEqual(["touch", "touch", "touch", "mouse", "mouse", "keyboard", "keyboard"]);
});
it("TR-55 a tap is a touch or pen contact that moves at most 10 px and lifts within 500 ms", () => {
  expect([TAP_MAX_MOVE_PX, TAP_MAX_MS]).toEqual([10, 500]);
  expect(isTap(at(0, 0, 0), at(6, 8, 499), 10, true)).toBe(true);
  expect(isTap(at(0, 0, 0, "pen"), at(0, 10, 100, "pen"), 10, true)).toBe(true);
  expect(isTap(at(0, 0, 0, "mouse"), at(0, 0, 50, "mouse"), 0, true)).toBe(false);
});
it("TR-58 a long press, a drag (even one that returns to its start) or a gesture that ends with selected text is never a tap", () => {
  expect(isTap(at(0, 0, 0), at(0, 0, 500), 0, true)).toBe(false);
  expect(isTap(at(0, 0, 0), at(6, 8.1, 100), 0, true)).toBe(false);
  expect(isTap(at(0, 0, 0), at(0, 0, 200), 30, true)).toBe(false);
  expect(isTap(at(0, 0, 0), at(1, 1, 100), 10.01, true)).toBe(false);
  expect(isTap(at(0, 0, 0), at(1, 1, 100), 1.5, false)).toBe(false);
});
it("TR-55, TR-56 one item is selected at a time and toggling the selected item deselects it", () => {
  const heard = vi.fn(); transferSelection.subscribe(heard);
  const a = { questionKey: "k:q1", sourceId: "stem:1" }; const b = { questionKey: "k:q1", sourceId: "stem:3" };
  transferSelection.toggle(a); expect(transferSelection.get()).toEqual(a);
  transferSelection.toggle(b); expect(transferSelection.get()).toEqual(b);
  transferSelection.toggle({ ...b }); expect(transferSelection.get()).toBeNull();
  transferSelection.clear(); expect(heard).toHaveBeenCalledTimes(3);
});
it("TR-57 a selection never times out and ends only on clear()", () => {
  vi.useFakeTimers(); transferSelection.toggle({ questionKey: "k:q1", sourceId: "stem:1" });
  vi.advanceTimersByTime(600_000); expect(transferSelection.get()).not.toBeNull();
  transferSelection.clear(); expect(transferSelection.get()).toBeNull(); vi.useRealTimers();
});
```

- [ ] **Step 2: Run them and see them fail** — `npx vitest run src/components/calculator/transfer-selection.test.ts`; Expected: FAIL, `Failed to resolve import "./transfer-selection"`.
- [ ] **Step 3: Implement** the block's signatures. `isTap` returns false unless both samples are `"touch"` or `"pen"`; its movement is `Math.max(maxMovePx, Math.hypot(up.x - down.x, up.y - down.y))`. `triggerFor` follows the block comment. The store keeps one `TransferSelection | null`, compares by `questionKey` and `sourceId`, and holds no timers.
- [ ] **Step 4: Run them and see them pass** — same command, then `npx tsc --noEmit`; Expected: PASS (5 tests), tsc exit 0.
- [ ] **Step 5: Commit** — `git add src/components/calculator/transfer-selection* && git commit -m "Add the transfer tap rules and the one-item selection store"`

### Task 3: Bridge hook, queue and status region (`use-transfer-bridge.ts`; CalculatorScope extension edit)

**Files:**

- Create: `src/components/calculator/use-transfer-bridge.ts`, `src/components/calculator/CalculatorScope.transfer.test.tsx` (tasks 11 and 12 append)
- Modify: `src/components/calculator/CalculatorScope.tsx` (extension edit of `00-index.md` section 5.2, limited to the hook call, the bridge member, the handle forward and the region; decision "Bridge hook")

**Interfaces:**

- Consumes: `TransferPayload`, `TransferTrigger`, `TransferResult`, `MAX_QUEUED_TRANSFERS`, `TRANSFER_MESSAGES` (12, `payload.ts`); `QuizCalculatorHandle.applyTransfer(payload: unknown, trigger: TransferTrigger): TransferResult` (12); `QuizCalculatorHandle`, `QuizMountOptions` (10, type only); `V2Bridge`, `CalculatorLoadStatus`, `CalculatorLoadFailure` (11, types); `reportCalculatorError(error: unknown, build: string | null): void` and `FULL_SCREEN_QUERY` (03); `transferSelection` (task 2); `markCoreRejection` (task 1); `installDomStubs(): () => void` (07).
- Produces: section 13.2 `V2Bridge.transfer(payload: TransferPayload, trigger: TransferTrigger): Promise<TransferResult>` (the member marked "added by 14-transfer-ui"); the package-internal `useTransferBridge(options: TransferBridgeOptions): TransferBridge` with `transfer`, `onHandle` and `announcement` (task 12 adds `openedByTransfer`); the `[data-transfer-status]` region of the DOM contract.

- [ ] **Step 1: Write the failing tests** (`CalculatorScope.transfer.test.tsx`; the header and helpers below are shared by tasks 3, 11 and 12)

```
// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { useState } from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { TransferPayload, TransferResult, TransferTrigger } from "@/lib/calculator-transfer/payload";
import type { QuizMountOptions } from "@/components/calculator-v2/host/quiz-host";
import { installDomStubs } from "@/components/calculator-v2/__fixtures__/dom-stubs";
import { FULL_SCREEN_QUERY } from "./breakpoints";
import type { V2Bridge } from "./CalculatorScope";
vi.mock("@/components/calculator-v2/host/quiz-host", () => ({ mountQuizCalculator: vi.fn() }));
const REJECTED: TransferResult = { status: "rejected", message: "This can't be added to the calculator.", focusRowId: null };
const fakeHandle = (options?: QuizMountOptions) => ({ calculator: { subscribe: vi.fn() }, focusOnOpen: vi.fn(() => options?.frame.focus()), focusBoundary: vi.fn(), setReducedMotion: vi.fn(), reflow: vi.fn(), destroy: vi.fn(),
  applyTransfer: vi.fn((p: TransferPayload, _trigger: TransferTrigger): TransferResult => ({ status: "added", message: `Added to calculator: ${p.description}.`, focusRowId: "1" })) });
const rejecting = (options: QuizMountOptions) => { const hd = fakeHandle(options); hd.applyTransfer.mockReturnValue(REJECTED); return hd; };
const payload = (n: number, questionKey = "attempt:q1"): TransferPayload => ({ version: 1, questionKey, sourceId: `stem:${n}`, description: `y=${n}x`, format: "rows", dependencies: [], rows: [`y=${n}x`] });
const media = (matching: string[]) => ((q: string) => ({ matches: matching.includes(q), media: q, addEventListener() {}, removeEventListener() {} })) as unknown as typeof window.matchMedia;
async function scope(o: { gate?: Promise<unknown>; mount?: (options: QuizMountOptions) => ReturnType<typeof fakeHandle>; fullScreen?: boolean; loadFails?: boolean } = {}) {
  vi.resetModules();
  const handles: ReturnType<typeof fakeHandle>[] = [];
  const mountQuizCalculator = vi.fn((options: QuizMountOptions) => { const hd = (o.mount ?? fakeHandle)(options); handles.push(hd); return hd; });
  vi.doMock("@/components/calculator-v2/host/quiz-host", async () => { await o.gate; if (o.loadFails) throw new Error("chunk failed"); return { mountQuizCalculator }; });
  const S = await import("./CalculatorScope"); const { CalculatorVersionProvider } = await import("./CalculatorVersion");
  const { calculatorWindowStore: store } = await import("./calculator-window-store"); const { isCoreRejection } = await import("./transfer-report"); // the instance the reset scope uses
  store.resetForTests(); window.matchMedia = media(o.fullScreen ? [FULL_SCREEN_QUERY] : []);
  const seen = { bridge: null as V2Bridge | null };
  function Probe() { seen.bridge = S.useCalculator() as V2Bridge; return null; }
  function Host({ questionKey }: { questionKey: string }) {
    const [open, setOpen] = useState(false);
    return <CalculatorVersionProvider version="v2"><S.CalculatorScope key={questionKey} enabled open={open} onOpenChange={setOpen} questionKey={questionKey}><p>Question body</p><button type="button">Stand-in control</button><S.CalculatorTrigger /><Probe /></S.CalculatorScope></CalculatorVersionProvider>;
  }
  const view = render(<Host questionKey="attempt:q1" />);
  return { store, handles, mountQuizCalculator, isCore: isCoreRejection, bridge: () => seen.bridge!, remount: (key: string) => view.rerender(<Host questionKey={key} />), unmount: view.unmount, status: () => document.querySelector<HTMLElement>("[data-transfer-status]")! };
}
function send(s: Awaited<ReturnType<typeof scope>>, p: TransferPayload, trigger: TransferTrigger) {
  const out: { result?: TransferResult } = {}; act(() => { void s.bridge().transfer(p, trigger).then((r) => (out.result = r)); }); return out;
}
let restore = () => {};
beforeEach(() => { restore = installDomStubs(); vi.clearAllMocks(); });
afterEach(() => { restore(); vi.useRealTimers(); });
it("AR-10 the v2 bridge exposes status, transfer and prefetch, hands each payload to the calculator with its trigger, and the host never calls subscribe", async () => {
  const s = await scope();
  expect(s.bridge()).toMatchObject({ version: "v2", open: false, status: "idle", failure: null, questionKey: "attempt:q1" });
  expect([typeof s.bridge().transfer, typeof s.bridge().prefetch]).toEqual(["function", "function"]);
  for (const [n, trigger] of [[1, "mouse"], [2, "keyboard"], [3, "touch"]] as const) { const out = send(s, payload(n), trigger); await waitFor(() => expect(out.result?.status).toBe("added")); }
  expect(s.handles[0].applyTransfer.mock.calls).toEqual([[payload(1), "mouse"], [payload(2), "keyboard"], [payload(3), "touch"]]);
  expect(s.handles[0].calculator.subscribe).not.toHaveBeenCalled();
  for (const file of ["src/components/calculator-v2/host/quiz-host.ts", "src/components/calculator/CalculatorScope.tsx", "src/components/calculator/use-transfer-bridge.ts"]) expect(readFileSync(file, "utf8"), file).not.toMatch(/\.subscribe\(/);
});
it("AR-17 transfers made while loading wait in order with their triggers, the 21st is refused and a question change discards the queue silently", async () => {
  let release = () => {}; const s = await scope({ gate: new Promise<void>((r) => (release = r)) });
  const outs = Array.from({ length: 21 }, (_, i) => send(s, payload(i), i % 2 ? "touch" : "mouse"));
  await waitFor(() => expect(outs[20].result).toEqual({ status: "queue-full", message: "Too many transfers are waiting. Try again when the calculator has opened.", focusRowId: null }));
  expect(s.status()).toHaveTextContent("Too many transfers are waiting. Try again when the calculator has opened.");
  await act(async () => release()); await waitFor(() => expect(outs[19].result?.status).toBe("added"));
  expect(s.handles[0].applyTransfer.mock.calls.map(([p, t]) => [p.sourceId, t])).toEqual(Array.from({ length: 20 }, (_, i) => [`stem:${i}`, i % 2 ? "touch" : "mouse"]));
  s.unmount(); let hold = () => {}; const q = await scope({ gate: new Promise<void>((r) => (hold = r)) });
  const held = send(q, payload(1), "mouse"); q.remount("attempt:q2"); await act(async () => hold());
  await waitFor(() => expect(held.result).toEqual({ status: "unavailable", message: "", focusRowId: null }));
  await waitFor(() => expect(q.handles).toHaveLength(1)); expect(q.handles[0].applyTransfer).not.toHaveBeenCalled(); expect(q.status().textContent).toBe("");
});
it("TR-67 one polite status region beside the workspace and the window announces each result in plain text, outside inert and aria-hidden content in full screen", async () => {
  const s = await scope({ fullScreen: true }); const said: string[] = [];
  new MutationObserver(() => { const t = s.status().textContent ?? ""; if (t) said.push(t); }).observe(s.status(), { childList: true, characterData: true, subtree: true });
  const expected = ["Added to calculator: y=1x.", "Already in the calculator, row 1.", "Already in the calculator, row 1.", "This can't be added to the calculator."];
  send(s, payload(1), "mouse"); await waitFor(() => expect(said).toEqual(expected.slice(0, 1)));
  const present: TransferResult = { status: "already-present", message: "Already in the calculator, row 1.", focusRowId: "1" };
  s.handles[0].applyTransfer.mockReturnValueOnce(present).mockReturnValueOnce(present).mockReturnValueOnce({ ...REJECTED });
  for (const [i, n] of [1, 1, 2].entries()) { send(s, payload(n), "mouse"); await waitFor(() => expect(said).toEqual(expected.slice(0, i + 2))); }
  const region = s.status(); const workspace = document.querySelector("[data-calculator-workspace]")!;
  expect(document.querySelectorAll("[data-transfer-status]")).toHaveLength(1);
  expect([region.getAttribute("role"), region.getAttribute("aria-live")]).toEqual(["status", "polite"]);
  expect(region.parentElement).toBe(workspace.parentElement); expect(workspace).toHaveAttribute("aria-hidden", "true");
  expect(region.closest("[inert], [aria-hidden='true'], [data-calculator-v2], [data-calculator-window], [data-calculator-host]")).toBeNull();
});
it("TR-70 the bridge drops a payload whose question key is not the current question's, says so and never marks it as a core-check rejection", async () => {
  const s = await scope({ mount: rejecting }); const out = send(s, payload(1, "attempt:q0"), "mouse");
  await waitFor(() => expect(out.result).toEqual(REJECTED)); expect(s.isCore(out.result!)).toBe(false);
  expect(s.mountQuizCalculator).not.toHaveBeenCalled(); expect(document.querySelector("[data-calculator-window]")).toBeNull();
  expect(s.status()).toHaveTextContent("This can't be added to the calculator.");
  const core = send(s, payload(2), "mouse"); await waitFor(() => expect(core.result?.status).toBe("rejected")); expect(s.isCore(core.result!)).toBe(true);
});
it("TR-69 after a mount failure the held payload waits for Retry and applies once; after a load failure it is discarded and announced", async () => {
  let calls = 0; const s = await scope({ mount: (options) => { if (calls++ === 0) throw new Error("mount"); return fakeHandle(options); } });
  const out = send(s, payload(1), "keyboard");
  await waitFor(() => expect(s.status()).toHaveTextContent("Calculator unavailable. Use Retry in the calculator panel.")); expect(out.result).toBeUndefined();
  fireEvent.click(screen.getByRole("button", { name: "Retry" }));
  await waitFor(() => expect(out.result?.status).toBe("added")); expect(s.handles.flatMap((x) => x.applyTransfer.mock.calls)).toEqual([[payload(1), "keyboard"]]);
  s.unmount(); const f = await scope({ loadFails: true }); const lost = send(f, payload(2), "mouse");
  await waitFor(() => expect(lost.result).toEqual({ status: "unavailable", message: "Calculator unavailable. Reload the page to use it.", focusRowId: null }));
  expect(f.status()).toHaveTextContent("Calculator unavailable. Reload the page to use it.");
  const again = send(f, payload(3), "mouse"); await waitFor(() => expect(again.result?.status).toBe("unavailable"));
});
```

- [ ] **Step 2: Run them and see them fail** — `npx vitest run src/components/calculator/CalculatorScope.transfer.test.tsx`; Expected: FAIL, `TypeError: s.bridge(...).transfer is not a function` and `[data-transfer-status]` is missing.
- [ ] **Step 3: Implement `use-transfer-bridge.ts`** (`"use client"`; imports `TRANSFER_MESSAGES`, `MAX_QUEUED_TRANSFERS` and the types from `@/lib/calculator-transfer/payload`; `transferSelection` from `./transfer-selection`; `markCoreRejection` from `./transfer-report`; `reportCalculatorError` from `./report-error`; the `QuizCalculatorHandle` type from `@/components/calculator-v2/host/quiz-host` and the load types from `./CalculatorScope`, all type-only where they are types)
  - `useTransferBridge(options: TransferBridgeOptions): TransferBridge` keeps the latest `options` in a ref written during render, so `transfer` reads the current `questionKey`, `open`, `status`, `failure` and `onOpenChange`.
  - Package-internal state: `interface HeldTransfer { payload: TransferPayload; trigger: TransferTrigger; resolve(result: TransferResult): void }`, a `held` ref (array), a `handleRef`, and a `tick` state that wakes the drain. `onHandle(handle)` stores `handle` in `handleRef` and, when it is non-null, bumps `tick`; every push to `held` also bumps it. `const DISCARDED: TransferResult = { status: "unavailable", message: "", focusRowId: null }` at module scope. `announce(message)` writes the text into the `announcement` state. When the text equals the current text, it empties it and writes the message after `setTimeout(…, 50)`. Any later `announce` cancels a pending timer.
  - `transfer(payload, trigger)` (stable identity, `useCallback` with no dependencies), in this order:
    1. `payload.questionKey !== questionKey`: `announce(TRANSFER_MESSAGES.rejected)` and resolve `{ status: "rejected", message: TRANSFER_MESSAGES.rejected, focusRowId: null }` (unmarked), opening nothing.
    2. `transferSelection.clear()`.
    3. `held.length >= MAX_QUEUED_TRANSFERS`: announce and resolve `{ status: "queue-full", message: TRANSFER_MESSAGES.tooManyWaiting, focusRowId: null }`. (After a load failure `held` is always empty, so this check never hides step 4.)
    4. Status `"failed"` with failure `"load"`: open the window (`onOpenChange(true)` when closed), announce, and resolve `{ status: "unavailable", message: TRANSFER_MESSAGES.unavailableReload, focusRowId: null }`.
    5. Call `onOpenChange(true)` when closed.
    6. Status `"failed"` with failure `"mount"`: `announce(TRANSFER_MESSAGES.unavailableRetry)`.
    7. Push to `held`, bump `tick` and return the pending promise.
  - Drain: a `useLayoutEffect` on `[open, status, tick]` runs only when `open`, `handleRef.current` and status `"ready"` all hold. It takes every held entry in order and calls `handleRef.current.applyTransfer(entry.payload, entry.trigger)` inside `try`. A returned `"rejected"` result goes through `markCoreRejection(result)`. A throw reports with `reportCalculatorError(error, null)` and gives an unmarked `{ status: "rejected", message: TRANSFER_MESSAGES.rejected, focusRowId: null }`. It announces `result.message`, then resolves.
  - An effect on `[status, failure]`: `"failed"`/`"load"` with held entries announces `unavailableReload` once and resolves each with the unavailable result above; `"failed"`/`"mount"` with held entries announces `unavailableRetry` once and keeps them. Unmount resolves every held entry with `DISCARDED` without announcing and calls `transferSelection.clear()`. An effect clears the selection whenever `open` becomes true (TR-57).
  - Returns `{ transfer, onHandle, announcement }`; nothing in the file calls `.subscribe(` on anything (AR-10).
- [ ] **Step 4: Wire it into `V2Scope`** (`CalculatorScope.tsx`): `const transferBridge = useTransferBridge({ questionKey, open, status, failure, onOpenChange, frameRef });` where `frameRef` is the ref the scope already passes to `CalculatorWindow`. The bridge object gains `transfer: transferBridge.transfer`. The loader's `onHandle` callback also calls `transferBridge.onHandle(handle)`. JSX: `<div data-transfer-status role="status" aria-live="polite" aria-atomic="true" className="sr-only">{transferBridge.announcement}</div>` between the workspace div and the `data-calculator-v2` container, rendered for v2 from the first render, never inside the workspace or the window. No code in `CalculatorScope.tsx` calls `.subscribe(` on anything (AR-10). This edit adds about 12 lines to the file.
- [ ] **Step 5: Run them and see them pass** — the step 2 command, then `npx vitest run src/components/calculator` and `npx tsc --noEmit`; Expected: PASS, tsc exit 0.
- [ ] **Step 6: Commit** — `git add src/components/calculator && git commit -m "Add transfer() to the v2 bridge through a bridge hook with a held queue and a quiz-side status region"`

### Task 4: TransferControl behaviour (resolves OI-21)

**Files:**

- Create: `src/components/calculator/TransferControl.tsx`, `src/components/calculator/TransferControl.module.css`, `src/components/calculator/transfer-control.css`, `src/components/calculator/TransferControl.test.tsx`
- Modify: `src/components/calculator/transfer-report.test.ts` (append), `docs/superpowers/specs/calculator-v2/c-transfer.md` (TR-4, OI-21)

**Interfaces:**

- Consumes: `useCalculator(): CalculatorBridge | null`, `V2Bridge` (11, with task 3's `transfer`); `TransferItem` (12); `questionIdFromKey(questionKey: string): string` (11); `reportTransferRejection`, `isCoreRejection` (task 1); `isHoverPointer`, `isTap`, `triggerFor`, `transferSelection` (task 2); `Calculator`, `ArrowUpRight` from `lucide-react`; `CALCULATOR_V2_CSS` (10); `hostThemeCss`, `ROLE_VARS`, `CURVE_VARS` (03).
- Produces: section 14 `TRANSFER_TOOLTIP`, `TransferControlProps`, `TransferControl(props: TransferControlProps): JSX.Element | null`; the package-internal constants; the DOM contract's anchor, button, glyph, tooltip, `data-visible`, `data-reveal`, `data-transfer-item` and `data-transfer-selected`; the global sheet `transfer-control.css`.

- [ ] **Step 1: Apply OI-21 to the spec.** In `c-transfer.md` TR-4 replace `under AR- availability rules` with `under CalculatorScope's existing eligibility, the condition under which AR-10's useCalculator() returns a bridge`. Run `npx prettier --write docs/superpowers/specs/calculator-v2/c-transfer.md`; `grep -c "the condition under which AR-10's useCalculator() returns a bridge" docs/superpowers/specs/calculator-v2/c-transfer.md` prints 1.
- [ ] **Step 2: Write the failing tests.** `TransferControl.test.tsx` (the header is reused by task 12's append):

```
// @vitest-environment jsdom
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { TransferPayload, TransferResult, TransferTrigger } from "@/lib/calculator-transfer/payload";
import type { TransferItem } from "@/lib/calculator-transfer/classify";
import { installDomStubs } from "@/components/calculator-v2/__fixtures__/dom-stubs";
import { CALCULATOR_V2_CSS } from "@/components/calculator-v2/styles/generated";
import { CURVE_VARS, ROLE_VARS, hostThemeCss } from "@/lib/calculator-v2/theme/roles";
import { FULL_SCREEN_QUERY } from "./breakpoints";
import { TRANSFER_TOOLTIP, TransferControl } from "./TransferControl";
import { transferSelection } from "./transfer-selection";
const h = vi.hoisted(() => ({ stub: false, bridge: null as unknown }));
vi.mock("./CalculatorScope", async (original) => {
  const real = await original<typeof import("./CalculatorScope")>();
  return { ...real, useCalculator: () => (h.stub ? (h.bridge as ReturnType<typeof real.useCalculator>) : real.useCalculator()) };
});
const ITEM: TransferItem = { sourceId: "stem:1", kind: "equation", ruleId: "TR-11", description: "y=2x+3",
  payload: { version: 1, sourceId: "stem:1", description: "y=2x+3", format: "rows", dependencies: [], rows: ["y=2x+3"] } };
const v2Bridge = () => ({ version: "v2", open: false, status: "idle", failure: null, questionKey: "attempt:q1", toggle: vi.fn(), prefetch: vi.fn(),
  transfer: vi.fn(async (_payload: TransferPayload, _trigger: TransferTrigger): Promise<TransferResult> => ({ status: "added", message: "Added to calculator: y=2x+3.", focusRowId: "1" })) });
const v1Bridge = () => ({ version: "v1", open: false, toggle: vi.fn(), paste: vi.fn() });
const stubbed = (bridge: unknown) => { h.stub = true; h.bridge = bridge; return bridge as ReturnType<typeof v2Bridge>; };
const media = (matching: string[]) => ((q: string) => ({ matches: matching.includes(q), media: q, addEventListener() {}, removeEventListener() {} })) as unknown as typeof window.matchMedia;
function Control({ placement = "inline" }: { placement?: "inline" | "block" | "cluster" }) {
  return <p><span data-testid="math">y=2x+3</span><TransferControl item={ITEM} accessibleName="Transfer to Calculator: y=2x+3" placement={placement} /></p>;
}
const anchorEl = () => document.querySelector<HTMLElement>("[data-transfer-control]")!;
const tap = (el: Element, pointerType: string) => { fireEvent.pointerDown(el, { pointerType, clientX: 10, clientY: 10, isPrimary: true }); fireEvent.pointerUp(el, { pointerType, clientX: 12, clientY: 10, isPrimary: true }); };
let restore = () => {};
beforeEach(() => { restore = installDomStubs(); h.stub = false; h.bridge = null; transferSelection.resetForTests(); vi.clearAllMocks(); });
afterEach(() => { restore(); vi.useRealTimers(); });
it("TR-4 the control renders only when useCalculator() returns a v2 bridge (OI-21)", () => {
  for (const bridge of [null, v1Bridge()]) { stubbed(bridge); const v = render(<Control />); expect(v.container.querySelector("[data-transfer-control]")).toBeNull(); v.unmount(); }
  stubbed(v2Bridge()); render(<Control />); expect(screen.getByRole("button", { name: "Transfer to Calculator: y=2x+3" })).toBeInTheDocument();
});
it("AR-12 the v2 control is icon-only with a Transfer to Calculator tooltip after 300 ms of hover or at once on keyboard focus, and a name that starts with it", () => {
  const bridge = stubbed(v2Bridge()); render(<Control />); vi.useFakeTimers();
  const button = screen.getByRole("button", { name: "Transfer to Calculator: y=2x+3" }); const tip = document.querySelector("[data-transfer-tooltip]")!;
  expect(TRANSFER_TOOLTIP).toBe("Transfer to Calculator"); expect(button.textContent).toBe("");
  expect([button.querySelectorAll("svg.lucide-calculator").length, button.querySelectorAll("svg.lucide-arrow-up-right").length]).toEqual([1, 1]);
  expect(tip).toHaveTextContent("Transfer to Calculator"); expect(tip).toHaveAttribute("hidden"); expect(tip).toHaveAttribute("aria-hidden", "true");
  fireEvent.pointerEnter(button, { pointerType: "mouse" }); expect(bridge.prefetch).toHaveBeenCalledTimes(1);
  act(() => vi.advanceTimersByTime(299)); expect(tip).toHaveAttribute("hidden"); act(() => vi.advanceTimersByTime(1)); expect(tip).not.toHaveAttribute("hidden");
  fireEvent.pointerLeave(button, { pointerType: "mouse" }); expect(tip).toHaveAttribute("hidden");
  fireEvent.focus(button); expect(tip).not.toHaveAttribute("hidden"); expect(bridge.prefetch).toHaveBeenCalledTimes(2);
  expect(screen.queryByText(/Export to Karman|Copy for Desmos/)).toBeNull(); expect(screen.queryByRole("button", { name: "Export options" })).toBeNull();
});
it("TR-59 a hidden control stays in the accessibility tree, and a click with no pointerdown transfers at once with trigger keyboard and no selection step", async () => {
  const bridge = stubbed(v2Bridge()); render(<Control />);
  expect(anchorEl()).toHaveAttribute("data-visible", "false");
  const button = screen.getByRole("button", { name: "Transfer to Calculator: y=2x+3" });
  expect(button).not.toHaveAttribute("aria-hidden"); expect(anchorEl().closest("[aria-hidden]")).toBeNull(); expect(button.tabIndex).toBe(0);
  fireEvent.click(button); await waitFor(() => expect(bridge.transfer).toHaveBeenCalledTimes(1));
  expect(bridge.transfer).toHaveBeenCalledWith({ ...ITEM.payload, questionKey: "attempt:q1" }, "keyboard");
  expect(document.querySelector("[data-transfer-selected]")).toBeNull();
});
it("AR-10 the control passes touch for a touch or pen tap, mouse for a mouse click or a click from a hovering pen, and keyboard for a click with no pointerdown", async () => {
  const bridge = stubbed(v2Bridge()); render(<Control />); const button = screen.getByRole("button");
  const runs = [["touch", false, "touch"], ["pen", false, "touch"], ["pen", true, "mouse"], ["mouse", false, "mouse"], [null, false, "keyboard"]] as const;
  for (const [i, [pointerType, hovering, trigger]] of runs.entries()) {
    if (hovering) fireEvent.pointerEnter(anchorEl(), { pointerType: "pen", buttons: 0 });
    if (pointerType) fireEvent.pointerDown(button, { pointerType, buttons: 1 }); fireEvent.click(button);
    if (hovering) fireEvent.pointerLeave(anchorEl(), { pointerType: "pen", buttons: 0 });
    await waitFor(() => expect(bridge.transfer).toHaveBeenCalledTimes(i + 1)); expect(bridge.transfer.mock.lastCall![1], `${pointerType} hovering=${hovering}`).toBe(trigger);
  }
});
it("TR-59, AR-10 a pointer contact that never becomes a click leaves no record: after a pointercancel, a pressed pointer leaving the button, a key or a blur, the next click with no pointerdown is keyboard, while a touch tap whose pointerleave fires before its click stays touch", async () => {
  const bridge = stubbed(v2Bridge()); render(<Control />); const button = screen.getByRole("button");
  const aborted: [string, () => void][] = [
    ["pointercancel", () => { fireEvent.pointerDown(button, { pointerType: "touch", buttons: 1 }); fireEvent.pointerCancel(button, { pointerType: "touch", buttons: 0 }); }],
    ["pressed pointerleave", () => { fireEvent.pointerDown(button, { pointerType: "mouse", buttons: 1 }); fireEvent.pointerLeave(button, { pointerType: "mouse", buttons: 1 }); }],
    ["keydown", () => { fireEvent.pointerDown(button, { pointerType: "touch", buttons: 1 }); fireEvent.keyDown(button, { key: "Enter" }); }],
    ["blur", () => { fireEvent.pointerDown(button, { pointerType: "mouse", buttons: 1 }); fireEvent.blur(button); }],
  ];
  for (const [i, [name, abort]] of aborted.entries()) {
    abort(); fireEvent.click(button);
    await waitFor(() => expect(bridge.transfer).toHaveBeenCalledTimes(i + 1)); expect(bridge.transfer.mock.lastCall![1], name).toBe("keyboard");
  }
  fireEvent.pointerDown(button, { pointerType: "touch", buttons: 1 }); fireEvent.pointerUp(button, { pointerType: "touch", buttons: 0 });
  fireEvent.pointerLeave(button, { pointerType: "touch", buttons: 0 }); fireEvent.click(button);
  await waitFor(() => expect(bridge.transfer).toHaveBeenCalledTimes(5)); expect(bridge.transfer.mock.lastCall![1], "touch tap").toBe("touch");
});
it("TR-54 the triggering pointer type sets the mode whatever the device class or width: mouse and hovering pen reveal, touch and pen taps select", () => {
  const bridge = stubbed(v2Bridge()); window.matchMedia = media(["(any-pointer: coarse)", "(max-width: 767px), (max-height: 500px)", FULL_SCREEN_QUERY]);
  render(<Control />); const item = screen.getByTestId("math"); const anchor = anchorEl();
  expect(item).toHaveAttribute("data-transfer-item");
  fireEvent.pointerEnter(item, { pointerType: "touch" }); expect(anchor.dataset.visible).toBe("false");
  fireEvent.pointerEnter(item, { pointerType: "mouse" }); expect([anchor.dataset.visible, anchor.dataset.reveal]).toEqual(["true", "fine"]);
  fireEvent.pointerLeave(item, { pointerType: "mouse" }); expect(anchor.dataset.visible).toBe("false");
  fireEvent.pointerEnter(item, { pointerType: "pen", buttons: 0 }); expect(anchor.dataset.visible).toBe("true"); fireEvent.pointerLeave(item, { pointerType: "pen" });
  act(() => tap(item, "touch")); expect([anchor.dataset.visible, anchor.dataset.reveal]).toEqual(["true", "coarse"]);
  expect(item).toHaveAttribute("data-transfer-selected", "true"); expect(bridge.prefetch).toHaveBeenCalled();
  act(() => tap(item, "touch")); expect(item).not.toHaveAttribute("data-transfer-selected");
  window.matchMedia = media([]); act(() => tap(item, "pen")); expect(item).toHaveAttribute("data-transfer-selected", "true");
  act(() => tap(item, "mouse")); expect(item).toHaveAttribute("data-transfer-selected", "true");
});
it("TH-2 the control, tooltip and outline take colours only from --kcc-*, the injected shadow sheet holds no literal colour outside the vendored MathQuill section, and every module selector keeps a local class", () => {
  const literal = /#[0-9a-fA-F]{3,8}\b|\b(rgba?|hsla?|oklch|oklab|lab|lch|hwb|color)\(/;
  const strip = (css: string) => css.replace(/\/\*[\s\S]*?\*\//g, "");
  for (const file of ["TransferControl.module.css", "transfer-control.css"]) {
    const css = strip(readFileSync(`src/components/calculator/${file}`, "utf8"));
    expect(css, file).not.toMatch(literal); expect(css, file).not.toMatch(/color-mix\(|\b(white|black)\b/);
    expect([...css.matchAll(/var\((--[\w-]+)/g)].map((m) => m[1]).filter((v) => !v.startsWith("--kcc-")), file).toEqual([]);
  }
  const moduleCss = strip(readFileSync("src/components/calculator/TransferControl.module.css", "utf8"));
  const selectors = [...moduleCss.matchAll(/(?:^|[{};])\s*([^\s{}@;][^{};]*)\{/g)].flatMap((m) => m[1].split(",").map((s) => s.trim()));
  expect(selectors.length).toBeGreaterThan(0); expect(selectors.filter((s) => !/\.(anchor|button|glyph|tooltip)\b/.test(s))).toEqual([]); // Next's pure mode
  expect(readFileSync("src/components/calculator/CalculatorScope.tsx", "utf8")).toMatch(/^import "\.\/calculator-chrome\.generated\.css";$/m);
  expect(readFileSync("src/components/calculator/TransferControl.tsx", "utf8")).toMatch(/^import "\.\/transfer-control\.css";$/m);
  const parts = CALCULATOR_V2_CSS.split(/^\/\* ([\w./-]+\.css) \*\/$/m);
  const sections = Array.from({ length: (parts.length - 1) / 2 }, (_, i) => ({ path: parts[2 * i + 1], css: parts[2 * i + 2] }));
  expect(sections.map((s) => s.path)).toEqual(expect.arrayContaining(["vendor/mathquill/mathquill.css", "src/components/calculator-v2/styles/tokens.css"]));
  for (const { path, css } of sections) if (path !== "vendor/mathquill/mathquill.css") expect(strip(css), path).not.toMatch(literal);
  const host = hostThemeCss("ivory"); expect(host.startsWith(":host{")).toBe(true);
  for (const name of [...Object.values(ROLE_VARS), ...Object.values(CURVE_VARS)]) expect(host).toContain(`${name}:`);
});
const hasCutPoint = (() => { try { execFileSync("git", ["cat-file", "-e", "08c8c76^{commit}"], { stdio: "ignore" }); return true; } catch { return false; } })();
it.skipIf(!hasCutPoint)("TH-2 palettes.ts and the site tokens in globals.css are unchanged since the cut point 08c8c76", () => {
  expect(() => execFileSync("git", ["diff", "--quiet", "08c8c76", "--", "src/lib/themes/palettes.ts", "src/app/globals.css"])).not.toThrow();
});
```

Append to `transfer-report.test.ts`, adding the imports `import { createElement } from "react";`, `import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";`, `import type { TransferItem } from "@/lib/calculator-transfer/classify";` and `import { TransferControl } from "./TransferControl";`, plus `vi.mock("./CalculatorScope", () => ({ useCalculator: () => h.bridge }));`. The file stays `.ts`: elements come from `createElement`, never JSX:

```
const ITEM: TransferItem = { sourceId: "stem:1", kind: "equation", ruleId: "TR-11", description: "y=2x+3",
  payload: { version: 1, sourceId: "stem:1", description: "y=2x+3", format: "rows", dependencies: [], rows: ["y=2x+3"] } };
const bridgeReturning = (result: TransferResult) => ({ version: "v2", open: false, status: "ready", failure: null, questionKey: "attempt-9:q7", toggle: vi.fn(), prefetch: vi.fn(), transfer: vi.fn(async () => result) });
const renderControl = () => render(createElement("p", null, createElement("span", null, "m"), createElement(TransferControl, { item: ITEM, accessibleName: "Transfer to Calculator: y=2x+3", placement: "inline" })));
it("TR-73 a core-check rejection from the control reports only the question id and the rule ID, and an unmarked rejection reports nothing", async () => {
  h.bridge = bridgeReturning(markCoreRejection({ ...REJECTED })); const first = renderControl();
  fireEvent.click(screen.getByRole("button")); await waitFor(() => expect(h.capture).toHaveBeenCalledTimes(1));
  expect(h.capture.mock.calls[0][1]).toEqual({ tags: { questionId: "q7", ruleId: "TR-11" } });
  expect((h.capture.mock.calls[0][0] as Error).message).toBe("calculator-transfer-rejected"); first.unmount();
  const stale = bridgeReturning({ ...REJECTED }); h.bridge = stale; renderControl();
  fireEvent.click(screen.getByRole("button")); await waitFor(() => expect(stale.transfer).toHaveBeenCalledTimes(1));
  await act(async () => {}); expect(h.capture).toHaveBeenCalledTimes(1);
});
```

- [ ] **Step 3: Run them and see them fail** — `npx vitest run src/components/calculator/TransferControl.test.tsx src/components/calculator/transfer-report.test.ts`; Expected: FAIL, `Failed to resolve import "./TransferControl"` in both files.
- [ ] **Step 4: Implement `TransferControl.tsx`** (`"use client"`; imports `styles from "./TransferControl.module.css"` and, on its own line, `import "./transfer-control.css";`)
  - `TransferControl` calls `useCalculator()`; unless `bridge?.version === "v2"` it returns `null`; otherwise it renders an inner `V2TransferControl` holding every hook.
  - Markup per the DOM contract. The anchor is `<span ref={anchor} data-transfer-control data-source-id={item.sourceId} data-placement={placement} className={styles.anchor}>`, with `data-visible` and `data-reveal` written only for inline and block. Inside it: `<button type="button" aria-label={accessibleName} className={styles.button}>` holding `<span data-transfer-glyph aria-hidden="true" className={styles.glyph}><Calculator size={16} /><ArrowUpRight size={16} /></span>`, then `<span data-transfer-tooltip aria-hidden="true" hidden={!tooltip} className={styles.tooltip}>{TRANSFER_TOOLTIP}</span>`.
  - Item element: inline and block use `anchor.previousElementSibling`; cluster uses `anchor.closest('[data-calculator="v2"]')?.parentElement`. An effect sets `data-transfer-item` on it and removes it (and `data-transfer-selected`) on unmount.
  - Hover (inline and block): native `pointerenter` and `pointerleave` listeners on the item and on the anchor accept only `isHoverPointer(e)` events. They keep `overItem` and `overControl` refs and `hoverPointerType` (the `pointerType` of the last accepted `pointerenter`). They write `anchor.dataset.visible` synchronously from `focused || selected || (!escaped && (overItem || overControl))`, mirroring the result into state for the tooltip and `data-reveal`. `revealedByHoverPen` is `hoverPointerType === "pen" && (overItem || overControl)`; for a cluster it is `hoverPointerType === "pen"` while the choice container is hovered (task 8 adds the container listeners).
  - Tap (inline and block): a native `pointerdown` on the item records a `PointerSample` (`e.timeStamp`) and `maxMove = 0` for `"touch"` or `"pen"`. Each `pointermove` on the item sets `maxMove = Math.max(maxMove, Math.hypot(e.clientX - down.x, e.clientY - down.y))`; `pointercancel` drops the sample. A `pointerup` with `isTap(down, up, maxMove, getSelection()?.isCollapsed ?? true)` calls `transferSelection.toggle({ questionKey: bridge.questionKey, sourceId: item.sourceId })` and `bridge.prefetch()`. `selected` comes from `useSyncExternalStore(transferSelection.subscribe, transferSelection.get, () => null)`, matched on both keys. While selected, or while the button has focus, the item has `data-transfer-selected="true"`; `data-reveal` is `"coarse"` while selected.
  - Tooltip: the button's native `pointerenter` (hover pointers only) calls `bridge.prefetch()` and starts a `TOOLTIP_DELAY_MS` timer that shows the tooltip. Leaving both button and tooltip hides it at once and clears the timer. `onFocus` calls `bridge.prefetch()` and shows it at once when `lastPointerDown` is `null` (keyboard focus); `onBlur` hides it. Touch never starts the timer.
  - Activation (decision "Pointer record"): `onPointerDown` records `{ pointerType }` in the `lastPointerDown` ref and stops propagation. The record is cleared (set to `null`) by the button's `onKeyDown` for every key, by its native `pointercancel` listener, by `onBlur`, and by its native `pointerleave` listener only when `e.buttons !== 0`; a `pointerleave` with `buttons === 0` (the one a touch tap fires after `pointerup`, before `click`) leaves it. `onKeyDown` also stops propagation for Enter and Space. `onClick` stops propagation, computes `trigger = triggerFor(lastPointerDown, revealedByHoverPen)`, resets `lastPointerDown` and calls `transferSelection.clear()`. It then awaits `bridge.transfer({ ...item.payload, questionKey: bridge.questionKey }, trigger)`; when the result has `status === "rejected"` and `isCoreRejection(result)`, it calls `reportTransferRejection(questionIdFromKey(bridge.questionKey), item.ruleId)`.
  - `TransferControl.module.css` (this task's rules; every selector has a local class):
    - `.anchor { position: relative }`; inline `display: inline`; block `display: block; height: 0`; cluster `display: inline-flex; opacity: 0`.
    - `.button` is absolute for inline and block and static in clusters, with `background: var(--kcc-chrome); color: var(--kcc-text); border: 1px solid var(--kcc-boundary)`.
    - `.anchor[data-visible="false"] .button:not(:focus-visible) { clip-path: inset(50%); width: 1px; height: 1px; min-width: 0; min-height: 0; overflow: hidden; padding: 0; border: 0 }`.
    - `.tooltip { position: absolute; white-space: nowrap; font: 12px/1.4 Arial, sans-serif; color: var(--kcc-text); background: var(--kcc-chrome); border: 1px solid var(--kcc-boundary) }`.
    - Never `display: none` or `visibility: hidden`.
  - `transfer-control.css` (plain global sheet; a header comment says why: Next's CSS Modules pure mode): `[data-transfer-selected="true"] { outline: 2px solid var(--kcc-focus); outline-offset: 2px; }`.
- [ ] **Step 5: Run them and see them pass** — the step 3 command, then `npx tsc --noEmit`; Expected: PASS, tsc exit 0.
  - If the TH-2 test fails on a `CALCULATOR_V2_CSS` section other than `vendor/mathquill/mathquill.css` (CSS from 05, 08, 09 or 10; the failure message names the path), stop. Report the path and the literal colours it prints to the lead as a TH-2 finding for the package that owns that CSS file (00-index section 2). Never loosen the assertion or exempt the path; this package edits nothing under `src/components/calculator-v2/` (decision "TH-2 scope").
  - Then list the vendored section's literal colours: `node -e 'const m=require("fs").readFileSync("vendor/mathquill/mathquill.css","utf8").replace(/\/\*[\s\S]*?\*\//g,"").match(/#[0-9a-fA-F]{3,8}\b|\b(?:rgba?|hsla?)\(/g);console.log(m?[...new Set(m)].join(" "):"none")'`. If it prints anything but `none`, send the list to the lead as a TH-2 finding for 05; this task changes nothing in `vendor/`.
- [ ] **Step 6: Commit** — `git add src/components/calculator docs/superpowers/specs && git commit -m "Add the icon-only Transfer control with hover, focus and tap reveal (OI-21)"`
