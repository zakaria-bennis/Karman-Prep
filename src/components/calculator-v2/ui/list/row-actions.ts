// The list's row and history actions (01-interfaces-integration.md section 11; 09 Task 4 and
// consumer note 3). The toolbar, the rows, the keypad and 10's keyboard shortcuts all go through
// these, so every path inserts, deletes, moves focus and announces (A11Y-2, NM-42, T-13) in exactly
// the same way. Type-only imports, so node tests that load this module never load the engine or
// MathQuill.

import type { CalculatorEngine, EditRefusal } from "@/lib/calculator-v2/core/api/engine";
import type { MathField } from "../../math-field/MathField";
import type { Announcer } from "../a11y/announcer";
import type { FocusController } from "../focus/focus-controller";
import { EDITOR_MESSAGES } from "./messages";

/** How many editThroughKeypad calls are running on each field (nested calls stay batched). */
const keypadBatches = new WeakMap<MathField, number>();

/** Runs `apply` with `field` marked as a keypad batch, so the row's onEdit stays quiet. */
function inKeypadBatch(field: MathField, apply: () => void): void {
  keypadBatches.set(field, (keypadBatches.get(field) ?? 0) + 1);
  try {
    apply();
  } finally {
    const depth = (keypadBatches.get(field) ?? 1) - 1;
    if (depth > 0) keypadBatches.set(field, depth);
    else keypadBatches.delete(field);
  }
}

/** The row's index in the current snapshot, or -1 when no row has that id. */
function indexOf(engine: CalculatorEngine, rowId: string): number {
  return engine.getSnapshot().rows.findIndex((row) => row.id === rowId);
}

/**
 * Add item, Enter (R-3), the keypad's Enter key and 10's add-row shortcut: a new empty row below
 * `afterId` (at the end for null), focused or only made active. At MAX_ROWS nothing is inserted
 * and the NM-42 limit is announced instead.
 */
export function insertRowBelow(
  engine: CalculatorEngine,
  focus: FocusController,
  announcer: Announcer | null,
  afterId: string | null, // null: at the end
  mode: "focus" | "activate"
): string | null {
  const inserted = engine.insertRowAfter(afterId);
  if (typeof inserted === "string") {
    announcer?.announce(EDITOR_MESSAGES.rowLimit);
    return null;
  }
  if (mode === "focus") focus.focusRow(inserted.id, "start");
  else focus.activateRow(inserted.id);
  return inserted.id;
}

/** R-3: up → previous row at "end", down → next row at "start"; nothing at either end of the list. */
export function leaveRow(
  engine: CalculatorEngine,
  focus: FocusController,
  rowId: string,
  direction: "up" | "down"
): void {
  const { rows } = engine.getSnapshot();
  const i = indexOf(engine, rowId);
  if (i < 0) return;
  if (direction === "up") {
    if (i > 0) focus.focusRow(rows[i - 1].id, "end");
  } else if (i < rows.length - 1) {
    focus.focusRow(rows[i + 1].id, "start");
  }
}

/**
 * R-9, Backspace or Delete in an empty row: the only row stays (empty, focused); otherwise
 * deleteRow, then "left" → previous row at "end" (the new first row at "start" when there is
 * none), "right" → next row at "start" (the previous row at "end" when there is none).
 */
export function deleteFromEmptyRow(
  engine: CalculatorEngine,
  focus: FocusController,
  rowId: string,
  direction: "left" | "right"
): void {
  const { rows } = engine.getSnapshot();
  const i = indexOf(engine, rowId);
  if (i < 0) return;
  engine.deleteRow(rowId); // the last remaining row is only emptied
  if (rows.length === 1) {
    focus.focusRow(rowId, "start");
    return;
  }
  const previous = i > 0 ? rows[i - 1] : null;
  const next = i < rows.length - 1 ? rows[i + 1] : null;
  if (direction === "left") {
    if (previous !== null) focus.focusRow(previous.id, "end");
    else if (next !== null) focus.focusRow(next.id, "start");
  } else if (next !== null) {
    focus.focusRow(next.id, "start");
  } else if (previous !== null) {
    focus.focusRow(previous.id, "end");
  }
}

/** The row's Delete control (R-3): deleteRow, then the row now at that index, else the previous one, at "end". */
export function deleteRowByControl(
  engine: CalculatorEngine,
  focus: FocusController,
  rowId: string
): void {
  const i = indexOf(engine, rowId);
  if (i < 0) return;
  engine.deleteRow(rowId);
  const { rows } = engine.getSnapshot();
  const target = rows[Math.min(i, rows.length - 1)];
  if (target !== undefined) focus.focusRow(target.id, "end");
}

/** KB-5, R-10: one undoable step to one empty row, announced, with that row focused. */
export function clearAllRows(
  engine: CalculatorEngine,
  focus: FocusController,
  announcer: Announcer | null
): void {
  engine.clearAll();
  announcer?.announce(EDITOR_MESSAGES.clearAll);
  focus.focusRow(engine.getSnapshot().rows[0].id, "start");
}

/** KB-2, A11Y-2: no-op unless canUndo(); announces "Undone." */
export function performUndo(engine: CalculatorEngine, announcer: Announcer | null): void {
  if (!engine.canUndo()) return;
  engine.undo();
  announcer?.announce(EDITOR_MESSAGES.undone);
}

/** KB-2, A11Y-2: no-op unless canRedo(); announces "Redone." */
export function performRedo(engine: CalculatorEngine, announcer: Announcer | null): void {
  if (!engine.canRedo()) return;
  engine.redo();
  announcer?.announce(EDITOR_MESSAGES.redone);
}

/**
 * Keypad and Functions panel input (09 Decisions, "One undo step per K-7 conversion"): `apply`
 * runs with the field marked as batching, so the row's onEdit ignores the adapter's edit events,
 * then one editRow(rowId, field.latex(), "keypad"). On "char-limit" the field gets its previous
 * latex back and the T-13 limit is announced.
 */
export function editThroughKeypad(
  engine: CalculatorEngine,
  announcer: Announcer | null,
  rowId: string,
  field: MathField,
  apply: (field: MathField) => void
): EditRefusal | null {
  const before = field.latex();
  inKeypadBatch(field, () => apply(field));
  const refusal = engine.editRow(rowId, field.latex(), "keypad");
  if (refusal === "char-limit") {
    inKeypadBatch(field, () => field.latex(before));
    announcer?.announce(EDITOR_MESSAGES.charLimit);
  }
  return refusal;
}

/** True while editThroughKeypad is applying an edit to `field`. */
export function isKeypadBatch(field: MathField): boolean {
  return keypadBatches.has(field);
}
