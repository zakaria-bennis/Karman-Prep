// The calculator's row focus controller (01-interfaces-integration.md section 11). Rows register
// their MathFields here, so anything that must move focus into a row (Clear all, Add item, the
// keypad, 10's focusOnOpen, transfers) asks the controller instead of reaching into the DOM. A
// focus request for a row whose field has not mounted yet waits and runs when the field
// registers. lastFocusedRowId is the KB-4 reopen target: the last row the engine reported as
// DOM-focused, or null once that row has left the list (R-10: after setBlank()).

import { createContext } from "react";
import type { CalculatorEngine } from "@/lib/calculator/core/api/engine";
import type { MathField } from "../../math-field/MathField";

export interface FocusController {
  registerField(rowId: string, field: MathField): () => void;
  field(rowId: string): MathField | null;
  fields(): readonly MathField[]; // every mounted field, list order (AR-41 reflow)
  focusRow(rowId: string, caret: Caret): void; // DOM focus into the MathField; "all" selects it
  activateRow(rowId: string): void; // active row without DOM focus (API-12)
  activeRowId(): string | null;
  lastFocusedRowId(): string | null; // KB-4 reopen
  noteCell(tableId: string, key: string): void; // D-41: a table cell or header took focus
  lastCell(tableId: string): string | null; // D-41: the keypad's cell in that table
  subscribe(listener: () => void): () => void;
}

type Caret = "start" | "end" | "all"; // "all": the field's content selected (D-7, D-13)

/** D-5, D-19: the focus key of a table cell (a data row, or "h" for the header). */
export function cellKey(rowId: string, column: number, row: number | "h"): string {
  return `${rowId}:${column}:${row}`;
}

function scrollToField(field: MathField): void {
  field.element.scrollIntoView?.({ block: "nearest" });
}

function focusField(field: MathField, caret: Caret): void {
  field.focus();
  if (caret === "all") field.select();
  else field.keystroke(caret === "start" ? "Ctrl-Home" : "Ctrl-End");
  scrollToField(field);
}

export function createFocusController(engine: CalculatorEngine): FocusController {
  const registered = new Map<string, MathField>();
  const listeners = new Set<() => void>();
  let pending: { rowId: string; caret: Caret } | null = null;
  let lastFocused: string | null = null;
  const lastCells = new Map<string, string>();

  const notify = () => {
    for (const listener of [...listeners]) listener();
  };

  /** Keeps a non-null focused row; forgets the remembered row once it has left the list. */
  const track = () => {
    const { focusedRowId, rows } = engine.getSnapshot();
    if (focusedRowId !== null) lastFocused = focusedRowId;
    else if (lastFocused !== null && !rows.some((row) => row.id === lastFocused)) {
      lastFocused = null;
    }
  };
  track();
  // The controller lives as long as its engine; destroy() drops this listener with the rest.
  engine.subscribe(() => {
    track();
    notify();
  });

  return {
    registerField(rowId, field) {
      registered.set(rowId, field);
      if (pending?.rowId === rowId) {
        const { caret } = pending;
        pending = null;
        focusField(field, caret);
      }
      notify();
      return () => {
        if (registered.get(rowId) !== field) return;
        registered.delete(rowId);
        notify();
      };
    },
    field: (rowId) => registered.get(rowId) ?? null,
    fields() {
      const order = new Map(engine.getSnapshot().rows.map((row, i) => [row.id, i]));
      const position = (rowId: string) => order.get(rowId) ?? order.size;
      return [...registered]
        .sort(([a], [b]) => position(a) - position(b))
        .map(([, field]) => field);
    },
    focusRow(rowId, caret) {
      const field = registered.get(rowId);
      if (field === undefined) {
        pending = { rowId, caret };
        return;
      }
      pending = null;
      focusField(field, caret);
    },
    activateRow(rowId) {
      pending = null;
      engine.activateExpression(rowId);
      const field = registered.get(rowId);
      if (field !== undefined) scrollToField(field);
    },
    activeRowId: () => engine.getSnapshot().activeRowId,
    lastFocusedRowId: () => lastFocused,
    noteCell: (tableId, key) => void lastCells.set(tableId, key),
    lastCell: (tableId) => lastCells.get(tableId) ?? null,
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}

export const FocusContext = createContext<FocusController | null>(null);
