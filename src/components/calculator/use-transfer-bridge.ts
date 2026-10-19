"use client";

// The bridge's transfer entry, called only by CalculatorScope (14 decision "Bridge
// hook"). Eager and minimal (D4, AR-33): it keeps the per-scope state, the announced text and the
// effects that run the pipeline; the pipeline itself (key check, held queue, drain, failure
// handling, selection clears and announcements) is transfer-bridge-core.ts, loaded by import()
// with the Transfer control's chunk, so a transfer from a control never waits for it. Eager: lazy
// calculator code only as types (AR-1).

import { useEffect, useLayoutEffect, useReducer, useState, type RefObject } from "react";
import type { QuizCalculatorHandle } from "@/components/calculator-v2/host/quiz-host"; // type-only (AR-1)
import type {
  TransferPayload,
  TransferResult,
  TransferTrigger,
} from "@/lib/calculator-transfer/payload";
import type { CalculatorLoadFailure, CalculatorLoadStatus } from "./CalculatorScope"; // type-only
import { FULL_SCREEN_QUERY } from "./breakpoints";
import { calculatorWindowStore } from "./calculator-window-store";

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
  openedByTransfer(): boolean; // CalculatorScope's once-per-open focusOnOpen skips such an open (TR-66)
}

/** One scope's transfer state, owned here and acted on by transfer-bridge-core.ts. Fields only the
 * core uses start undefined, so the eager hook stays small (AR-33). */
export interface TransferState {
  options: TransferBridgeOptions; // the latest, so an older bridge object acts on now
  held: {
    payload: TransferPayload;
    trigger: TransferTrigger;
    resolve(result: TransferResult): void;
  }[];
  bridge: Omit<TransferBridge, "announcement">; // stable identities
  handle?: QuizCalculatorHandle | null;
  dead?: boolean; // true once the scope has unmounted
  spoken?: string;
  timer?: ReturnType<typeof setTimeout>;
  say(message: string): void;
  bump(): void; // runs the drain again
  dock(): void; // AR-21: here, so the lazy core shares no module with the eager scope (AR-33)
  // Set when a transfer opened the window, until it closes; focusDue until its focus is placed.
  opened?: { trigger: TransferTrigger; focusDue: boolean } | null;
  wasOpen?: boolean;
  selectionOpen?: boolean; // the open state settle() last saw (TR-57)
  failureSeen?: string; // the status and failure settle() last acted on
}

type Core = typeof import("./transfer-bridge-core");
let core: Core | null = null;
let pending: Promise<Core> | null = null;

/** The lazy pipeline, imported once per page while it succeeds. */
export const loadTransferCore = (): Promise<Core> =>
  (pending ??= import("./transfer-bridge-core").then(
    (m) => (core = m),
    (error: unknown) => {
      pending = null;
      throw error;
    }
  ));

export function useTransferBridge(options: TransferBridgeOptions): TransferBridge {
  const [announcement, say] = useState("");
  const [tick, bump] = useReducer((count: number) => count + 1, 0);
  const [s] = useState(() => {
    const state: TransferState = {
      options,
      held: [],
      say,
      bump,
      dock() {
        if (!matchMedia(FULL_SCREEN_QUERY).matches)
          calculatorWindowStore.set({ mode: "docked", restoreMode: "docked" });
      },
      bridge: {
        transfer: (payload, trigger) =>
          core?.transfer(state, payload, trigger) ??
          loadTransferCore().then(
            (m) => m.transfer(state, payload, trigger),
            (): TransferResult => ({ status: "unavailable", message: "", focusRowId: null })
          ),
        onHandle(handle) {
          state.handle = handle;
          if (handle) bump();
        },
        openedByTransfer: () => !!state.opened,
      },
    };
    return state;
  });
  s.options = options;
  const { open, status, failure } = options;
  // Held payloads exist only once the core has loaded, so these are no-ops before it.
  useLayoutEffect(() => core?.drain(s), [s, open, status, tick]);
  useEffect(() => core?.settle(s), [s, open, status, failure]);
  useEffect(() => {
    s.dead = false;
    return () => {
      s.dead = true;
      core?.dispose(s);
    };
  }, [s]);
  return { ...s.bridge, announcement };
}
