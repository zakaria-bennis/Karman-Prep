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

/**
 * R-7, SLIDERS-36: one new row per name right after `rowId`, as one undo step: `name=1` for a
 * name, an empty row for "". Colours go in that order (RT-2). Returns the last new row's id; past
 * the row limit nothing is added and NM-42 is announced.
 */
export function addRowsAfter(
  engine: CalculatorEngine,
  announcer: Announcer | null,
  rowId: string,
  names: readonly string[]
): string | null {
  let lastId: string | null = null;
  const refused = engine.editRows((rows, ctx) => {
    const at = rows.findIndex((r) => r.id === rowId);
    if (at < 0 || names.length === 0) return null;
    const added = names.map((name) => ({
      id: ctx.nextId(),
      latex: name === "" ? "" : `${name}=1`,
      color: ctx.nextColour(),
      hidden: false,
    }));
    lastId = added[added.length - 1]!.id;
    return [...rows.slice(0, at + 1), ...added, ...rows.slice(at + 1)];
  });
  if (refused === "row-limit") {
    announcer?.announce(EDITOR_MESSAGES.rowLimit);
    return null;
  }
  return lastId;
}

/** SLIDERS-4: Desmos auto-adds sliders on Enter for at most this many undefined names. */
export const MAX_AUTO_SLIDERS = 4;

/**
 * The names Enter defines as sliders (SLIDERS-36): an expression row whose only problem is 1 to 4
 * undefined names, in order of first appearance. A lone name (`a`, `x_1`), a slider row and a row
 * with five or more names get none, as on Desmos (observed live and in its shipped code,
 * 2026-10-22).
 */
export function autoSliderNames(engine: CalculatorEngine, rowId: string): readonly string[] {
  const row = engine.getSnapshot().rows.find((r) => r.id === rowId);
  if (row === undefined || row.type === "table" || row.slider != null) return [];
  if (row.error?.code !== "too-many-variables") return [];
  return row.chips.length <= MAX_AUTO_SLIDERS ? row.chips : [];
}

/**
 * R-3, SLIDERS-36: Enter in an expression row (typed or the keypad's key). With undefined names
 * (autoSliderNames) it adds `name=1` rows right after the row and then an empty row, focused, as
 * one undo step, as Desmos does; otherwise a plain new row below (insertRowBelow). Blur, Tab and
 * the arrow keys add nothing.
 */
export function enterFromRow(
  engine: CalculatorEngine,
  focus: FocusController,
  announcer: Announcer | null,
  rowId: string,
  mode: "focus" | "activate"
): string | null {
  const names = autoSliderNames(engine, rowId);
  if (names.length === 0) return insertRowBelow(engine, focus, announcer, rowId, mode);
  const emptyId = addRowsAfter(engine, announcer, rowId, [...names, ""]);
  if (emptyId === null) return null;
  if (mode === "focus") focus.focusRow(emptyId, "start");
  else focus.activateRow(emptyId);
  return emptyId;
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
