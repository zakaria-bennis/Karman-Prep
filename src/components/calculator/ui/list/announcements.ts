// A11Y-2's row announcements (engine-driven and user-only, for the announced row)
// and "Announced row"): the focused row's value VALUE_ANNOUNCE_DELAY_MS after the last edit, and a
// row's error once when it appears or changes. Only user-initiated `change` events that change the
// rows (ids and latex in list order) start the idle timer; API and transfer changes are recorded
// silently (A11Y-11), and pans, zooms, settings and worker results never re-announce anything.
//
// Timing: the announcer writes a call's text ANNOUNCE_WRITE_MS after it at the soonest, so the idle
// timer runs delayMs - ANNOUNCE_WRITE_MS (700 ms by default) and every call asks for exactly
// ANNOUNCE_WRITE_MS, which puts the write at delayMs (750 ms). Each call carries a per-row key, so
// a later rows change cancels a write still pending and no value is spoken after a newer edit.
//
// Type-only imports of the engine and the announcer, so node tests never load React or MathQuill.

import type { CalculatorEngine, RowView } from "@/lib/calculator/core/api/engine";
import type { ChangeEvent } from "@/lib/calculator/core/api/types";
import type { Announcer } from "../a11y/announcer";
import { EDITOR_MESSAGES } from "./messages";
import { regressionSummary } from "./regression-text";

/** What a row says once its result is in: its value (A11Y-2), or a regression's summary (A11Y-10). */
function spoken(row: RowView, number: number): string | null {
  if (row.kind === "regression") return regressionSummary(row);
  return row.valueText === null ? null : EDITOR_MESSAGES.value(number, row.valueText);
}

export const VALUE_ANNOUNCE_DELAY_MS = 750;
/** the announcer writes this long after a call (its minimum); the idle timer runs the rest. */
const ANNOUNCE_WRITE_MS = 50;

export interface AnnouncementTimers {
  setTimeout(callback: () => void, ms: number): unknown;
  clearTimeout(handle: unknown): void;
}

export interface RowAnnouncements {
  destroy(): void;
}

/** The global timers, looked up at each call so a test's fake timers apply (AR-44: functions only). */
const GLOBAL_TIMERS: AnnouncementTimers = {
  setTimeout: (callback, ms) => setTimeout(callback, ms),
  clearTimeout: (handle) => clearTimeout(handle as ReturnType<typeof setTimeout>),
};

/** A row's error as `${code}|${message}`, or null when it has none. */
function errorKey(row: RowView): string | null {
  return row.error === null ? null : `${row.error.code}|${row.error.message}`;
}

/** The rows signature: ids and latex in list order. */
type Signature = readonly { id: string; latex: string }[];

function signatureOf(rows: readonly RowView[]): Signature {
  return rows.map(({ id, latex }) => ({ id, latex }));
}

function sameSignature(signature: Signature, rows: readonly RowView[]): boolean {
  return (
    signature.length === rows.length &&
    signature.every((entry, i) => entry.id === rows[i].id && entry.latex === rows[i].latex)
  );
}

/**
 * Announces row values and errors on `announcer` as A11Y-2 orders them. `delayMs` is when the text
 * is spoken after the last edit (default 750; below 50 it is spoken at 50, the announcer's
 * minimum); `timers` default to the global setTimeout and clearTimeout. Nothing that exists when it
 * is created is announced.
 */
export function createRowAnnouncements(
  engine: CalculatorEngine,
  announcer: Announcer,
  options: { delayMs?: number; timers?: AnnouncementTimers } = {}
): RowAnnouncements {
  const delayMs = options.delayMs ?? VALUE_ANNOUNCE_DELAY_MS;
  const timers = options.timers ?? GLOBAL_TIMERS;
  /** Each row's error key as last announced or recorded. */
  const announced = new Map<string, string | null>();
  /** The keys passed to announce since the last rows change. */
  const sentKeys = new Set<string>();
  let userTurn = false;
  let idleTimer: { handle: unknown } | null = null;
  let pendingValueRow: string | null = null;
  let signature = signatureOf(engine.getSnapshot().rows);

  const say = (key: string, text: string): void => {
    announcer.announce(text, { delayMs: ANNOUNCE_WRITE_MS, key });
    sentKeys.add(key);
  };
  const recordAll = (rows: readonly RowView[]): void => {
    announced.clear();
    for (const row of rows) announced.set(row.id, errorKey(row));
  };
  const stopIdleTimer = (): void => {
    if (idleTimer !== null) timers.clearTimeout(idleTimer.handle);
    idleTimer = null;
  };
  recordAll(engine.getSnapshot().rows);

  /** The idle point: new errors in list order, then the focused (else active) row's value. */
  const onIdle = (): void => {
    idleTimer = null;
    const { rows, focusedRowId, activeRowId } = engine.getSnapshot();
    rows.forEach((row, i) => {
      const key = errorKey(row);
      if (row.error === null || key === announced.get(row.id)) return;
      say(`error:${row.id}`, EDITOR_MESSAGES.error(i + 1, row.error.message));
    });
    recordAll(rows);
    const rowId = focusedRowId ?? activeRowId;
    const index = rows.findIndex((row) => row.id === rowId);
    if (index < 0 || rows[index].error !== null) return;
    const { id } = rows[index];
    const text = spoken(rows[index], index + 1);
    if (text !== null) say(`value:${id}`, text);
    else pendingValueRow = id;
  };

  /** API-8's change event: only a rows change counts; a user one restarts the idle timer. */
  const onChange = (event: ChangeEvent): void => {
    const { rows } = engine.getSnapshot();
    if (sameSignature(signature, rows)) return;
    signature = signatureOf(rows);
    for (const key of sentKeys) announcer.cancel(key);
    sentKeys.clear();
    pendingValueRow = null;
    userTurn = event.isUserInitiated;
    stopIdleTimer();
    if (userTurn) {
      idleTimer = {
        handle: timers.setTimeout(onIdle, Math.max(0, delayMs - ANNOUNCE_WRITE_MS)),
      };
    } else {
      recordAll(rows); // A11Y-11: recorded without announcing
    }
  };

  /**
   * Every engine notification: a value that arrives after the idle point is announced at once,
   * and an AR-48 timeout error that arrives later is announced in a user turn (recorded silently
   * otherwise, as the rest of a non-user change is).
   */
  const onNotify = (): void => {
    const { rows } = engine.getSnapshot();
    if (pendingValueRow !== null) {
      const index = rows.findIndex((row) => row.id === pendingValueRow);
      const text = index < 0 ? null : spoken(rows[index], index + 1);
      if (text !== null) {
        say(`value:${pendingValueRow}`, text);
        pendingValueRow = null;
      }
    }
    rows.forEach((row, i) => {
      const key = errorKey(row);
      if (row.error?.code !== "timeout" || key === announced.get(row.id)) return;
      if (userTurn) say(`error:${row.id}`, EDITOR_MESSAGES.error(i + 1, row.error.message));
      announced.set(row.id, key);
    });
  };

  const stopObserving = engine.observeEvent("change", onChange);
  const unsubscribe = engine.subscribe(onNotify);

  return {
    destroy() {
      stopObserving();
      unsubscribe();
      stopIdleTimer();
      for (const key of sentKeys) announcer.cancel(key);
      sentKeys.clear();
    },
  };
}
