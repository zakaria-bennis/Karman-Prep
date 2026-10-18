"use client";

// The v2 bridge's transfer pipeline, called only by CalculatorScope's V2Scope (14 decision "Bridge
// hook"): the question-key check (TR-70), the held queue while the calculator loads (AR-17), the
// drain into the guarded handle, holds across a mount failure and discards after a load failure
// (TR-69, OI-28), and the quiz-side TR-67 announcement. Eager: v2 code only as types (AR-1).

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type RefObject } from "react";
import type { QuizCalculatorHandle } from "@/components/calculator-v2/host/quiz-host"; // type-only (AR-1)
import {
  MAX_QUEUED_TRANSFERS,
  TRANSFER_MESSAGES,
  type TransferPayload,
  type TransferResult,
  type TransferTrigger,
} from "@/lib/calculator-transfer/payload";
import type { CalculatorLoadFailure, CalculatorLoadStatus } from "./CalculatorScope"; // type-only
import { reportCalculatorError } from "./report-error";
import { markCoreRejection } from "./transfer-report";
import { transferSelection } from "./transfer-selection";

export interface TransferBridgeOptions {
  questionKey: string;
  open: boolean;
  status: CalculatorLoadStatus;
  failure: CalculatorLoadFailure | null;
  onOpenChange(open: boolean): void;
  frameRef: RefObject<HTMLDivElement | null>; // CalculatorWindow's frame (task 12 focus targets)
}

export interface TransferBridge {
  transfer(payload: TransferPayload, trigger: TransferTrigger): Promise<TransferResult>;
  onHandle(handle: QuizCalculatorHandle | null): void;
  announcement: string; // the [data-transfer-status] text
}

interface HeldTransfer {
  payload: TransferPayload;
  trigger: TransferTrigger;
  resolve(result: TransferResult): void;
}

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
function useAnnouncer() {
  const [announcement, setAnnouncement] = useState("");
  const spoken = useRef("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const announce = useCallback((message: string) => {
    if (timer.current !== null) clearTimeout(timer.current);
    timer.current = null;
    if (message !== spoken.current) {
      spoken.current = message;
      setAnnouncement(message);
      return;
    }
    spoken.current = "";
    setAnnouncement("");
    timer.current = setTimeout(() => {
      timer.current = null;
      spoken.current = message;
      setAnnouncement(message);
    }, 50);
  }, []);
  useEffect(
    () => () => {
      if (timer.current !== null) clearTimeout(timer.current);
    },
    []
  );
  return { announcement, announce };
}

export function useTransferBridge(options: TransferBridgeOptions): TransferBridge {
  const latest = useRef(options);
  latest.current = options; // read by the stable transfer(), so an older bridge acts on now
  const { open, status, failure } = options;
  const held = useRef<HeldTransfer[]>([]);
  const handleRef = useRef<QuizCalculatorHandle | null>(null);
  const [tick, setTick] = useState(0);
  const { announcement, announce } = useAnnouncer();

  const transfer = useCallback(
    (payload: TransferPayload, trigger: TransferTrigger): Promise<TransferResult> => {
      const now = latest.current;
      // 1. TR-70: never applied to another question; said, but never marked as a core rejection.
      if (payload.questionKey !== now.questionKey) {
        announce(TRANSFER_MESSAGES.rejected);
        return Promise.resolve(rejected());
      }
      transferSelection.clear(); // 2. TR-57
      // 3. AR-17
      if (held.current.length >= MAX_QUEUED_TRANSFERS) {
        announce(TRANSFER_MESSAGES.tooManyWaiting);
        return Promise.resolve({
          status: "queue-full",
          message: TRANSFER_MESSAGES.tooManyWaiting,
          focusRowId: null,
        });
      }
      // 4. OI-28: a failed import stays failed for the page.
      if (now.status === "failed" && now.failure === "load") {
        if (!now.open) now.onOpenChange(true);
        announce(TRANSFER_MESSAGES.unavailableReload);
        return Promise.resolve(unavailableReload());
      }
      if (!now.open) now.onOpenChange(true); // 5.
      // 6. TR-69: a mount failure holds the payload until Retry succeeds.
      if (now.status === "failed" && now.failure === "mount") {
        announce(TRANSFER_MESSAGES.unavailableRetry);
      }
      return new Promise<TransferResult>((resolve) => {
        held.current.push({ payload, trigger, resolve }); // 7.
        setTick((count) => count + 1);
      });
    },
    [announce]
  );

  const onHandle = useCallback((handle: QuizCalculatorHandle | null) => {
    handleRef.current = handle;
    if (handle !== null) setTick((count) => count + 1);
  }, []);

  // The drain: every held payload, in order, once the window is open and the calculator ready.
  // A guarded apply that threw returns undefined and drops the handle (AR-53); the rest then wait.
  useLayoutEffect(() => {
    const handle = handleRef.current;
    if (!open || handle === null || status !== "ready") return;
    while (held.current.length > 0 && handleRef.current === handle) {
      const entry = held.current.shift();
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
      announce(result.message);
      entry.resolve(result);
    }
  }, [open, status, tick, announce]);

  // TR-69: a load failure discards held payloads with one announcement; a mount failure keeps
  // them for Retry and says so once.
  useEffect(() => {
    if (status !== "failed" || held.current.length === 0) return;
    if (failure === "load") {
      announce(TRANSFER_MESSAGES.unavailableReload);
      for (const entry of held.current.splice(0)) entry.resolve(unavailableReload());
    } else if (failure === "mount") {
      announce(TRANSFER_MESSAGES.unavailableRetry);
    }
  }, [status, failure, announce]);

  // TR-57: opening the calculator ends a tap selection.
  useEffect(() => {
    if (open) transferSelection.clear();
  }, [open]);

  // TR-69, TR-70: leaving the question discards held payloads silently.
  useEffect(() => {
    const queue = held.current;
    return () => {
      for (const entry of queue.splice(0)) entry.resolve(DISCARDED);
      transferSelection.clear();
    };
  }, []);

  return { transfer, onHandle, announcement };
}
