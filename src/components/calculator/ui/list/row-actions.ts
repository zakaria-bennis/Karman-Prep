// The list's row and history actions (and
// consumer note 3). The toolbar, the rows, the keypad and the keyboard shortcuts all go through
// these, so every path inserts, deletes, moves focus and announces (A11Y-2, NM-42, T-13) in exactly
// the same way. Type-only imports, so node tests that load this module never load the engine or
// MathQuill.

import type { CalculatorEngine, EditRefusal } from "@/lib/calculator/core/api/engine";
import { insertTableFirst } from "@/lib/calculator/core/api/row-commands";
import type { MathField } from "../../math-field/MathField";
import type { Announcer } from "../a11y/announcer";
import { cellKey, type FocusController } from "../focus/focus-controller";
import { EDITOR_MESSAGES } from "./messages";
import { removeWithoutMotion } from "./row-presence";

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
 * Add item, Enter (R-3), the keypad's Enter key and the add-row shortcut: a new empty row below
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

/** S-12, S-13: Add expression; a new empty row after `anchor` (the end for null), focused, announced. */
export function insertExpressionItem(
  engine: CalculatorEngine,
  focus: FocusController,
  announcer: Announcer | null,
  anchor: string | null
): string | null {
  const id = insertRowBelow(engine, focus, announcer, anchor, "focus");
  if (id !== null)
    announcer?.announce(EDITOR_MESSAGES.added("Expression", indexOf(engine, id) + 1));
  return id;
}

/** D-5: an empty expression row that the user typed "table" into becomes a table in place. */
export function convertToTable(
  engine: CalculatorEngine,
  focus: FocusController,
  rowId: string
): void {
  const converted = engine.replaceWithTable(rowId);
  if (typeof converted !== "string") focus.focusRow(cellKey(converted.id, 0, 0), "start");
}

/**
 * S-12, S-13, D-5: Add table; an empty active row becomes the table, any other anchor gets one
 * after it, and with no anchor the table is row 1, taking the place of a lone blank row, as on
 * the reference; focus goes to the first x cell.
 */
export function insertTableItem(
  engine: CalculatorEngine,
  focus: FocusController,
  announcer: Announcer | null,
  anchor: string | null
): string | null {
  // A list holding only its blank row (a fresh calculator) turns that row into the table.
  const { rows } = engine.getSnapshot();
  const blank = rows.length === 1 && rows[0].type !== "table" && rows[0].latex === "";
  const target = anchor ?? (blank ? rows[0].id : null);
  const inserted = target === null ? insertTableFirst(engine) : engine.replaceWithTable(target);
  if (typeof inserted === "string") {
    announcer?.announce(EDITOR_MESSAGES.rowLimit);
    return null;
  }
  focus.focusRow(cellKey(inserted.id, 0, 0), "start");
  announcer?.announce(EDITOR_MESSAGES.added("Table", indexOf(engine, inserted.id) + 1));
  return inserted.id;
}

/**
 * R-3: up → previous row at "end", down → next row at "start", as on the reference: a table is
 * entered at its first header from above and at its last data row from below, and ArrowDown on
 * the last row adds a new empty row (NM-42's limit adds none); nothing above the first row.
 */
export function leaveRow(
  engine: CalculatorEngine,
  focus: FocusController,
  rowId: string,
  direction: "up" | "down"
): void {
  const { rows } = engine.getSnapshot();
  const i = indexOf(engine, rowId);
  if (i < 0) return;
  const target = direction === "up" ? rows[i - 1] : rows[i + 1];
  if (target === undefined) {
    if (direction === "down" && rows[i].type !== "table")
      insertRowBelow(engine, focus, null, rowId, "focus");
    return;
  }
  if (target.type === "table") {
    const blank = Math.max(0, ...(target.columns ?? []).map((c) => c.values.length));
    const row = direction === "down" ? "h" : Math.max(0, blank - 1);
    focus.focusRow(cellKey(target.id, 0, row), direction === "up" ? "end" : "start");
  } else focus.focusRow(target.id, direction === "up" ? "end" : "start");
}

/**
 * R-9, Backspace in an empty row: the only row stays (empty, focused); otherwise deleteRow, then
 * the previous row at "end" (a table above: its blank row), else the new first row at "start".
 */
export function deleteFromEmptyRow(
  engine: CalculatorEngine,
  focus: FocusController,
  rowId: string
): void {
  const { rows } = engine.getSnapshot();
  const i = indexOf(engine, rowId);
  if (i < 0) return;
  if (rows.length > 1) removeWithoutMotion(rowId); // VIS-30: a keyboard removal has no motion
  engine.deleteRow(rowId); // the last remaining row is only emptied
  if (rows.length === 1) {
    focus.focusRow(rowId, "start");
    return;
  }
  const previous = i > 0 ? rows[i - 1] : null;
  const next = i < rows.length - 1 ? rows[i + 1] : null;
  // D-8 (appendix F requirement 15): below a table, Backspace enters the table's blank row.
  if (previous?.type === "table") {
    const blank = Math.max(0, ...(previous.columns ?? []).map((c) => c.values.length));
    focus.focusRow(cellKey(previous.id, 0, blank), "start");
  } else if (previous !== null) focus.focusRow(previous.id, "end");
  else if (next !== null) focus.focusRow(next.id, "start");
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

/** EL-45: Duplicate, a copy of the row (latex, colour, visibility) right below it, one undo step. */
export function duplicateRow(
  engine: CalculatorEngine,
  announcer: Announcer | null,
  rowId: string
): void {
  const refused = engine.editRows((rows, ctx) => {
    const at = rows.findIndex((r) => r.id === rowId);
    const row = rows[at];
    if (row === undefined || row.type === "table") return null;
    const copy = { ...row, id: ctx.nextId() };
    return [...rows.slice(0, at + 1), copy, ...rows.slice(at + 1)];
  });
  if (refused === "row-limit") announcer?.announce(EDITOR_MESSAGES.rowLimit);
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
 * Keypad and Functions panel input (one undo step per K-7 conversion): `apply`
 * runs with the field marked as batching, so the row's onEdit ignores the adapter's edit events,
 * then one editRow(rowId, field.latex(), "keypad"), or `commit` for a table cell (D-41). On "char-limit" the field gets its previous
 * latex back and the T-13 limit is announced.
 */
export function editThroughKeypad(
  engine: CalculatorEngine,
  announcer: Announcer | null,
  rowId: string,
  field: MathField,
  apply: (field: MathField) => void,
  commit: (latex: string) => EditRefusal | null = (latex) => engine.editRow(rowId, latex, "keypad")
): EditRefusal | null {
  const before = field.latex();
  inKeypadBatch(field, () => apply(field));
  const refusal = commit(field.latex());
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
