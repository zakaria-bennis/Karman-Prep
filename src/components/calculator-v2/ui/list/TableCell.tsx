// One editable table cell or header (D-5, D-6, D-19): a MathField named by its column and row,
// registered with the focus controller under its cell key and kept in step with the stored LaTeX.
// Key handling comes through `keys`; the field's inputmode follows the keypad (T-11).

import { useContext, useLayoutEffect, useRef, type JSX } from "react";
import type { CalculatorEngine, EditRefusal } from "@/lib/calculator-v2/core/api/engine";
import { MAX_CELL_CHARACTERS } from "@/lib/calculator-v2/core/api/document";
import type { MathField } from "../../math-field/MathField";
import { useAnnouncer } from "../a11y/announcer";
import { cellKey, FocusContext } from "../focus/focus-controller";
import { useEngine } from "../hooks/use-engine";
import { MathFieldFactoryContext } from "./math-field-factory";
import { isKeypadBatch } from "./row-actions";
import { fieldTextbox } from "./row-model";

/** What the keys of a cell do; table-keys builds these per cell (D-7, D-8). */
export interface CellKeys {
  onEnter(): void;
  onArrowOut(direction: "up" | "down"): void;
  onMoveOutOf(direction: "left" | "right"): void;
  onTab(backwards: boolean): boolean; // false past either end: Tab then leaves the table
  onDeleteOutOf(): void; // Backspace in an empty cell
}

export interface TableCellProps {
  tableId: string;
  column: number;
  row: number | "h";
  latex: string;
  name: string; // the textbox's accessible name
  keypadOpen: boolean;
  keys: CellKeys;
  onEdit(engine: CalculatorEngine, latex: string): EditRefusal | null;
  onTouchFocus(rowId: string): void; // K-2: a touch focus lets the shell open the keypad
}

export const CELL_CHARACTER_MESSAGE = "Each cell can be up to 128 characters.";
export const TABLE_ROW_MESSAGE = "Tables hold up to 1,000 rows."; // D-8

export function TableCell(props: TableCellProps): JSX.Element {
  const { tableId, column, row } = props;
  const engine = useEngine();
  const focus = useContext(FocusContext)!;
  const announcer = useAnnouncer();
  const createField = useContext(MathFieldFactoryContext);
  const hostRef = useRef<HTMLDivElement>(null);
  const fieldRef = useRef<MathField | null>(null);
  const syncing = useRef(false);
  const touch = useRef(false); // the last pointerdown on the field was a touch (K-2)
  const latest = useRef(props);
  useLayoutEffect(() => {
    latest.current = props;
  });
  const key = cellKey(tableId, column, row);

  useLayoutEffect(() => {
    const field = createField(hostRef.current!, {
      ariaLabel: latest.current.name,
      maxLength: MAX_CELL_CHARACTERS,
      onEdit(latex) {
        if (syncing.current || isKeypadBatch(field)) return; // the keypad commits its own edit
        const refusal = latest.current.onEdit(engine, latex);
        if (refusal !== null) {
          syncing.current = true;
          field.latex(latest.current.latex);
          syncing.current = false;
          announcer.announce(refusal === "char-limit" ? CELL_CHARACTER_MESSAGE : TABLE_ROW_MESSAGE);
        }
      },
      onEnter: () => latest.current.keys.onEnter(),
      onArrowOut: (direction) => latest.current.keys.onArrowOut(direction),
      onMoveOutOf: (direction) => latest.current.keys.onMoveOutOf(direction),
      onDeleteOutOf(direction) {
        if (direction === "left" && field.latex() === "") latest.current.keys.onDeleteOutOf();
      },
      onFocus() {
        focus.noteCell(tableId, cellKey(tableId, latest.current.column, latest.current.row));
        engine.setFocusedRow(tableId);
        engine.activateExpression(tableId);
        if (touch.current) latest.current.onTouchFocus(tableId);
        touch.current = false;
      },
      onBlur() {
        engine.setFocusedRow(null);
        engine.endEditGroup();
      },
      onRefused: () => announcer.announce(CELL_CHARACTER_MESSAGE),
    });
    fieldRef.current = field;
    syncing.current = true;
    field.latex(latest.current.latex);
    syncing.current = false;
    // D-7: Tab and Shift+Tab move between cells once MathQuill left them alone (the caret at the
    // root: MathQuill prevents the default only when it moves out of a structure).
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Tab" || e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return;
      if (latest.current.keys.onTab(e.shiftKey)) e.preventDefault();
    };
    const host = hostRef.current!;
    host.addEventListener("keydown", onKeyDown);
    return () => {
      host.removeEventListener("keydown", onKeyDown);
      fieldRef.current = null;
      field.destroy();
    };
  }, [announcer, createField, engine, focus, tableId]);

  useLayoutEffect(() => {
    const field = fieldRef.current;
    if (field === null) return;
    return focus.registerField(key, field);
  }, [focus, key, announcer, createField, engine, tableId]);

  useLayoutEffect(() => {
    const field = fieldRef.current;
    if (field === null || field.latex() === props.latex) return;
    syncing.current = true;
    field.latex(props.latex);
    syncing.current = false;
  }, [props.latex]);

  useLayoutEffect(() => {
    fieldRef.current?.setInputMode(props.keypadOpen ? "none" : "text");
  }, [props.keypadOpen, announcer, createField, engine, focus, tableId]);

  useLayoutEffect(() => {
    const field = fieldRef.current;
    if (field !== null) fieldTextbox(field).setAttribute("aria-label", props.name);
  });

  return (
    <div
      className="kc-table-field"
      ref={hostRef}
      onPointerDown={(e) => {
        touch.current = e.pointerType === "touch";
      }}
    />
  );
}
