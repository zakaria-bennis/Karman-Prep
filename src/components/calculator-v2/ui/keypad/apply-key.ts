// What a keypad key does to the row (09 Task 9): which row the keypad edits, one adapter call per
// insert key through editThroughKeypad (K-10), the double-tap = that becomes ~ in one undo step
// (K-7, A11Y-2) and the Enter key's new row below. The letters, Shift, Functions and audio keys
// are the Keypad's own and never reach pressKey.

import type { CalculatorEngine, EngineSnapshot } from "@/lib/calculator-v2/core/api/engine";
import type { MathFieldAction } from "@/lib/calculator-v2/core/latex/operator-names";
import type { MathField } from "../../math-field/MathField";
import type { Announcer } from "../a11y/announcer";
import type { FocusController } from "../focus/focus-controller";
import { EDITOR_MESSAGES } from "../list/messages";
import { editThroughKeypad, insertRowBelow } from "../list/row-actions";
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

export function keypadTarget(
  focus: FocusController,
  snapshot: EngineSnapshot
): { rowId: string; field: MathField } | null {
  // focus.activeRowId(), else focus.lastFocusedRowId(), else snapshot.rows[0].id; null when that row has no registered field
  const rowId = focus.activeRowId() ?? focus.lastFocusedRowId() ?? snapshot.rows[0]?.id ?? null;
  if (rowId === null) return null;
  const field = focus.field(rowId);
  return field === null ? null : { rowId, field };
}

export function pressKey(ctx: KeyContext, key: KeyDef): void {
  // "insert" and "enter" keys; others are the Keypad's own
  const { engine, focus, announcer, doubleTap } = ctx;
  const { behaviour } = key;
  if (behaviour.type !== "insert" && behaviour.type !== "enter") return;
  const target = keypadTarget(focus, engine.getSnapshot());
  if (target === null) return;
  const { rowId, field } = target;

  if (behaviour.type === "enter") {
    doubleTap.clear();
    insertRowBelow(engine, focus, announcer, rowId, textboxFocused(field) ? "focus" : "activate");
    return;
  }

  if (key.id === "equals" && doubleTap.matches(rowId, field.latex())) {
    // One undo step for the conversion, whatever the keypad group around it (09 Decisions).
    engine.endEditGroup();
    editThroughKeypad(engine, announcer, rowId, field, (f) => f.run(EQUALS_TO_TILDE));
    engine.endEditGroup();
    doubleTap.clear();
    announcer?.announce(EDITOR_MESSAGES.tilde);
    return;
  }

  const { op, arg } = behaviour.action;
  const before = field.latex();
  const refusal = editThroughKeypad(engine, announcer, rowId, field, (f) => f[op](arg));
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
