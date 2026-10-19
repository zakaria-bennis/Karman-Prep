// What a keypad key does to the row: which row the keypad edits, one adapter call per
// insert key through editThroughKeypad (K-10), the double-tap = that becomes ~ in one undo step
// (K-7, A11Y-2) and the Enter key's new row below. The letters, Shift, Functions and audio keys
// are the Keypad's own and never reach pressKey.

import type { CalculatorEngine, EngineSnapshot } from "@/lib/calculator/core/api/engine";
import type { MathFieldAction } from "@/lib/calculator/core/latex/operator-names";
import type { MathField } from "../../math-field/MathField";
import type { Announcer } from "../a11y/announcer";
import type { FocusController } from "../focus/focus-controller";
import { EDITOR_MESSAGES } from "../list/messages";
import { editThroughKeypad, insertRowBelow } from "../list/row-actions";
import { cellTarget, type CellTarget } from "../list/cell-target";
import { fieldTextbox } from "../list/row-model";
import type { DoubleTapTracker } from "./double-tap";
import type { KeyDef } from "./keys";

export interface KeyContext {
  engine: CalculatorEngine;
  focus: FocusController;
  announcer: Announcer | null;
  doubleTap: DoubleTapTracker;
}

/** K-7: the second = deletes the = just inserted and types ~, in one adapter call. */
const EQUALS_TO_TILDE: readonly MathFieldAction[] = [
  { op: "keystroke", arg: "Backspace" },
  { op: "typedText", arg: "~" },
];

/** One clearing listener per tracker, so repeated = presses add it to a field only once. */
const trackerClearers = new WeakMap<DoubleTapTracker, () => void>();

function clearerFor(doubleTap: DoubleTapTracker): () => void {
  let clearer = trackerClearers.get(doubleTap);
  if (clearer === undefined) {
    clearer = () => doubleTap.clear();
    trackerClearers.set(doubleTap, clearer);
  }
  return clearer;
}

/** Whether the field's textbox holds DOM focus in its own document or shadow root. */
function textboxFocused(field: MathField): boolean {
  const textbox = fieldTextbox(field);
  const root = textbox.getRootNode() as Document | ShadowRoot;
  return root.activeElement === textbox;
}

export interface KeypadTarget {
  rowId: string;
  field: MathField;
  cell?: CellTarget; // D-41: the row is a table and this is its cell
}

export function keypadTarget(
  focus: FocusController,
  snapshot: EngineSnapshot,
  engine: CalculatorEngine // reaches a table's cell (D-41)
): KeypadTarget | null {
  // focus.activeRowId(), else focus.lastFocusedRowId(), else snapshot.rows[0].id; null when that row has no registered field
  const rowId = focus.activeRowId() ?? focus.lastFocusedRowId() ?? snapshot.rows[0]?.id ?? null;
  if (rowId === null) return null;
  if (snapshot.rows.find((r) => r.id === rowId)?.type === "table") {
    const cell = cellTarget(engine, focus, null, rowId);
    return cell === null ? null : { rowId, field: cell.field, cell };
  }
  const field = focus.field(rowId);
  return field === null ? null : { rowId, field };
}

export function pressKey(ctx: KeyContext, key: KeyDef): void {
  // "insert" and "enter" keys; others are the Keypad's own
  const { engine, focus, announcer, doubleTap } = ctx;
  const { behaviour } = key;
  if (behaviour.type !== "insert" && behaviour.type !== "enter") return;
  const target = keypadTarget(focus, engine.getSnapshot(), engine);
  if (target === null) return;
  const { rowId, field, cell } = target;

  if (behaviour.type === "enter") {
    doubleTap.clear();
    if (cell !== undefined) return cell.keys.onEnter(); // D-41: down the column
    insertRowBelow(engine, focus, announcer, rowId, textboxFocused(field) ? "focus" : "activate");
    return;
  }

  if (key.id === "equals" && doubleTap.matches(rowId, field.latex())) {
    // One undo step for the conversion, whatever the keypad group around it.
    engine.endEditGroup();
    editThroughKeypad(engine, announcer, rowId, field, (f) => f.run(EQUALS_TO_TILDE), cell?.commit);
    engine.endEditGroup();
    doubleTap.clear();
    announcer?.announce(EDITOR_MESSAGES.tilde);
    return;
  }

  const { op, arg } = behaviour.action;
  const before = field.latex();
  const refusal = editThroughKeypad(
    engine,
    announcer,
    rowId,
    field,
    (f) => f[op](arg),
    cell?.commit
  );
  const after = field.latex();
  // Only an = that actually landed can be replaced; a refused one leaves nothing to convert.
  if (key.id === "equals" && refusal === null && after !== before) {
    doubleTap.record(rowId, after);
    // Hardware typing between taps clears the tracker, so hardware == never converts.
    field.element.addEventListener("keydown", clearerFor(doubleTap), { once: true });
  } else {
    doubleTap.clear();
  }
}
