"use client";

// The v2 bridge's transfer entry, called only by CalculatorScope's V2Scope (14 decision "Bridge
// hook"). Eager and minimal (D4, AR-33): it keeps the per-scope state, the announced text and the
// effects that run the pipeline; the pipeline itself (key check, held queue, drain, failure
// handling, selection clears and announcements) is transfer-bridge-core.ts, loaded by import()
// with the Transfer control's chunk, so a transfer from a control never waits for it. Eager: v2
// code only as types (AR-1).

import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from "react";
import type { QuizCalculatorHandle } from "@/components/calculator-v2/host/quiz-host"; // type-only (AR-1)
import type {
  TransferPayload,
  TransferResult,
  TransferTrigger,
} from "@/lib/calculator-transfer/payload";
import type { CalculatorLoadFailure, CalculatorLoadStatus } from "./CalculatorScope"; // type-only

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

/** One scope's transfer state, owned here and acted on by transfer-bridge-core.ts. */
export interface TransferState {
  options: TransferBridgeOptions; // the latest, so an older bridge object acts on now
  held: {
    payload: TransferPayload;
    trigger: TransferTrigger;
    resolve(result: TransferResult): void;
  }[];
  handle: QuizCalculatorHandle | null;
  live: boolean; // false once the scope has unmounted
  spoken: string;
  timer: ReturnType<typeof setTimeout> | null;
  say(message: string): void;
  bump(): void; // runs the drain again
}

type Core = typeof import("./transfer-bridge-core");
let core: Core | null = null;
let pending: Promise<Core> | null = null;

/** The lazy pipeline, imported once per page while it succeeds. */
export function loadTransferCore(): Promise<Core> {
  if (pending === null) {
    const attempt = import("./transfer-bridge-core").then((m) => (core = m));
    attempt.catch(() => {
      if (pending === attempt) pending = null;
    });
    pending = attempt;
  }
  return pending;
}

export function useTransferBridge(options: TransferBridgeOptions): TransferBridge {
  const [announcement, say] = useState("");
  const [tick, setTick] = useState(0);
  const ref = useRef<{ s: TransferState; bridge: TransferBridge } | null>(null);
  if (ref.current === null) {
    const s: TransferState = {
      options,
      held: [],
      handle: null,
      live: true,
      spoken: "",
      timer: null,
      say,
      bump: () => setTick((count) => count + 1),
    };
    const bridge: TransferBridge = {
      transfer: (payload, trigger) =>
        core !== null
          ? core.transfer(s, payload, trigger)
          : loadTransferCore().then(
              (m) => m.transfer(s, payload, trigger),
              (): TransferResult => ({ status: "unavailable", message: "", focusRowId: null })
            ),
      onHandle(handle) {
        s.handle = handle;
        if (handle !== null) s.bump();
      },
      announcement: "",
    };
    ref.current = { s, bridge };
  }
  const { s, bridge } = ref.current;
  s.options = options;
  const { open, status, failure } = options;
  // Held payloads exist only once the core has loaded, so these are no-ops before it.
  useLayoutEffect(() => core?.drain(s), [s, open, status, tick]);
  useEffect(() => core?.settleFailure(s), [s, status, failure]);
  useEffect(() => {
    if (open) core?.clearSelection();
  }, [open]);
  useEffect(() => {
    s.live = true;
    return () => {
      s.live = false;
      core?.dispose(s);
    };
  }, [s]);
  return { ...bridge, announcement };
}
