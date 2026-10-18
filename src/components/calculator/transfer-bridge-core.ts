// Lazy (D4, AR-33): the v2 bridge's transfer pipeline behind use-transfer-bridge.ts's eager hook,
// loaded through its import() (and together with the Transfer control's chunk): the question-key
// check (TR-70), the docking write (AR-21), the held queue while the calculator loads (AR-17), the drain into the guarded
// handle, holds across a mount failure and discards after a load failure (TR-69, OI-28), the
// tap-selection clears (TR-57), the focus of a window a transfer opened (TR-66, AR-55) and the
// quiz-side TR-67 announcement. Never imported by eager code.

import {
  MAX_QUEUED_TRANSFERS,
  TRANSFER_MESSAGES,
  type TransferPayload,
  type TransferResult,
  type TransferTrigger,
} from "@/lib/calculator-transfer/payload";
import { FULL_SCREEN_QUERY } from "./breakpoints";
import { calculatorWindowStore } from "./calculator-window-store";
import { reportCalculatorError } from "./report-error";
import { markCoreRejection } from "./transfer-report";
import { transferSelection } from "./transfer-selection";
import type { TransferState } from "./use-transfer-bridge"; // type-only

/** A scope left before its held payloads applied: nothing failed, so nothing is announced. */
const DISCARDED: TransferResult = { status: "unavailable", message: "", focusRowId: null };
const rejected = (): TransferResult => ({
  status: "rejected",
  message: TRANSFER_MESSAGES.rejected,
  focusRowId: null,
});
const unavailableReload = (): TransferResult => ({
  status: "unavailable",
  message: TRANSFER_MESSAGES.unavailableReload,
  focusRowId: null,
});

/** The announced text; a repeat of the current text is cleared and written again after 50 ms. */
function announce(s: TransferState, message: string): void {
  if (s.timer !== null) clearTimeout(s.timer);
  s.timer = null;
  if (message !== s.spoken) {
    s.spoken = message;
    s.say(message);
    return;
  }
  s.spoken = "";
  s.say("");
  s.timer = setTimeout(() => {
    s.timer = null;
    s.spoken = message;
    s.say(message);
  }, 50);
}

/** Opens a closed window and remembers that this transfer opened it, so V2Scope skips its
 * once-per-open focusOnOpen and the transfer places focus (TR-66, TR-68). */
function openWindow(s: TransferState, trigger: TransferTrigger): void {
  if (s.options.open) return;
  s.opened = { trigger, focusDue: true };
  s.options.onOpenChange(true);
}

/** TR-66, OI-7: a touch transfer activates its row without focusing it, so focus moves into the
 * window, never staying on a control inside the inert full-screen workspace. */
function focusFrame(s: TransferState): void {
  const frame = s.options.frameRef.current;
  if (frame !== null && !frame.contains(document.activeElement))
    frame.focus({ preventScroll: true });
}

/** transfer() on the v2 bridge, acting on the scope's current options. */
export function transfer(
  s: TransferState,
  payload: TransferPayload,
  trigger: TransferTrigger
): Promise<TransferResult> {
  const now = s.options;
  // 0. A transfer that waited for this chunk while its scope unmounted: discarded (TR-69, TR-70).
  if (!s.live) return Promise.resolve(DISCARDED);
  // 1. TR-70: never applied to another question; said, but never marked as a core rejection.
  if (payload.questionKey !== now.questionKey) {
    announce(s, TRANSFER_MESSAGES.rejected);
    return Promise.resolve(rejected());
  }
  transferSelection.clear(); // 2. TR-57
  // 3. AR-17
  if (s.held.length >= MAX_QUEUED_TRANSFERS) {
    announce(s, TRANSFER_MESSAGES.tooManyWaiting);
    return Promise.resolve({
      status: "queue-full",
      message: TRANSFER_MESSAGES.tooManyWaiting,
      focusRowId: null,
    });
  }
  // AR-21, TR-64, TR-65: dock on a wide viewport, whatever the trigger and whatever mode was open
  // (the same rule as the first toolbar open of a page session, L-4); a full-screen viewport keeps
  // the stored mode. Refusals above never write the store; a load-failure panel opens docked.
  if (!matchMedia(FULL_SCREEN_QUERY).matches) {
    calculatorWindowStore.set({ mode: "docked", restoreMode: "docked" });
  }
  // 4. OI-28: a failed import stays failed for the page.
  if (now.status === "failed" && now.failure === "load") {
    openWindow(s, trigger);
    announce(s, TRANSFER_MESSAGES.unavailableReload);
    return Promise.resolve(unavailableReload());
  }
  openWindow(s, trigger); // 5.
  // 6. TR-69: a mount failure holds the payload until Retry succeeds.
  if (now.status === "failed" && now.failure === "mount") {
    announce(s, TRANSFER_MESSAGES.unavailableRetry);
  }
  return new Promise<TransferResult>((resolve) => {
    s.held.push({ payload, trigger, resolve }); // 7.
    s.bump();
  });
}

/** The drain: every held payload, in order, once the window is open and the calculator ready.
 * A guarded apply that threw returns undefined and drops the handle (AR-53); the rest then wait.
 * The first batch after a transfer opened the window places its focus (TR-66, AR-55): the
 * transferred row's own focus, else, when every result was rejected, focusOnOpen. */
export function drain(s: TransferState): void {
  const handle = s.handle;
  if (!s.options.open) {
    if (s.wasOpen) s.opened = null; // closed: the next open is a new one
    s.wasOpen = false;
    return;
  }
  s.wasOpen = true;
  if (handle === null || s.options.status !== "ready") return;
  let count = 0;
  let landed = false;
  while (s.held.length > 0 && s.handle === handle) {
    const entry = s.held.shift();
    if (entry === undefined) break;
    let result: TransferResult;
    try {
      const applied: TransferResult | undefined = handle.applyTransfer(
        entry.payload,
        entry.trigger
      );
      if (applied === undefined || applied === null) result = rejected();
      else result = applied.status === "rejected" ? markCoreRejection(applied) : applied;
    } catch (error) {
      reportCalculatorError(error, null);
      result = rejected();
    }
    count++;
    if (result.focusRowId !== null) landed = true;
    if (entry.trigger === "touch") focusFrame(s);
    announce(s, result.message);
    entry.resolve(result);
  }
  const opened = s.opened;
  if (count > 0 && opened?.focusDue) {
    opened.focusDue = false;
    if (!landed && s.handle === handle) handle.focusOnOpen(opened.trigger);
  }
}

/** TR-69: a load failure discards held payloads with one announcement; a mount failure keeps
 * them for Retry and says so once. AR-55: a window a transfer opened on a failure panel focuses
 * its "Reload page" or "Retry" button (else the frame); after a mount failure the focus stays due,
 * so the drain after a successful Retry still places it. */
export function settleFailure(s: TransferState): void {
  const { open, status, failure, frameRef } = s.options;
  const seen = `${status}:${failure}`;
  if (s.failureSeen !== seen && status === "failed" && s.held.length > 0) {
    if (failure === "load") {
      announce(s, TRANSFER_MESSAGES.unavailableReload);
      for (const entry of s.held.splice(0)) entry.resolve(unavailableReload());
    } else if (failure === "mount") {
      announce(s, TRANSFER_MESSAGES.unavailableRetry);
    }
  }
  s.failureSeen = seen;
  if (!open || status !== "failed" || !s.opened?.focusDue) return;
  const frame = frameRef.current;
  const label = failure === "load" ? "Reload page" : "Retry";
  const buttons = frame === null ? [] : [...frame.querySelectorAll("button")];
  (buttons.find((b) => b.textContent?.trim() === label) ?? frame)?.focus({ preventScroll: true });
  if (failure === "load") s.opened.focusDue = false;
}

/** TR-57: opening the calculator ends a tap selection. */
export function clearSelection(): void {
  transferSelection.clear();
}

/** TR-69, TR-70: leaving the question discards held payloads silently and ends a selection. */
export function dispose(s: TransferState): void {
  if (s.timer !== null) clearTimeout(s.timer);
  s.timer = null;
  for (const entry of s.held.splice(0)) entry.resolve(DISCARDED);
  transferSelection.clear();
}
