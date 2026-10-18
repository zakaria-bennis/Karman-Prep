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
import { fieldTextbox } from "./row-model";

/** What the keys of a cell do; table-keys builds these per cell (D-7, D-8). */
export interface CellKeys {
  onEnter(): void;
  onArrowOut(direction: "up" | "down"): void;
  onMoveOutOf(direction: "left" | "right"): void;
  onTab(backwards: boolean): void;
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
}

export const CELL_CHARACTER_MESSAGE = "Each cell can be up to 128 characters.";

export function TableCell(props: TableCellProps): JSX.Element {
  const { tableId, column, row } = props;
  const engine = useEngine();
  const focus = useContext(FocusContext)!;
  const announcer = useAnnouncer();
  const createField = useContext(MathFieldFactoryContext);
  const hostRef = useRef<HTMLDivElement>(null);
  const fieldRef = useRef<MathField | null>(null);
  const syncing = useRef(false);
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
        if (syncing.current) return;
        if (latest.current.onEdit(engine, latex) === "char-limit") {
          syncing.current = true;
          field.latex(latest.current.latex);
          syncing.current = false;
          announcer.announce(CELL_CHARACTER_MESSAGE);
        }
      },
      onEnter: () => latest.current.keys.onEnter(),
      onArrowOut: (direction) => latest.current.keys.onArrowOut(direction),
      onMoveOutOf: (direction) => latest.current.keys.onMoveOutOf(direction),
      onDeleteOutOf(direction) {
        if (direction === "left" && field.latex() === "") latest.current.keys.onDeleteOutOf();
      },
      onFocus() {
        engine.setFocusedRow(tableId);
        engine.activateExpression(tableId);
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
      e.preventDefault();
      latest.current.keys.onTab(e.shiftKey);
    };
    const host = hostRef.current!;
    host.addEventListener("keydown", onKeyDown);
    return () => {
      host.removeEventListener("keydown", onKeyDown);
      fieldRef.current = null;
      field.destroy();
    };
  }, [announcer, createField, engine, tableId]);

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
  }, [props.keypadOpen, announcer, createField, engine, tableId]);

  useLayoutEffect(() => {
    const field = fieldRef.current;
    if (field !== null) fieldTextbox(field).setAttribute("aria-label", props.name);
  });

  return <div className="kc-table-field" ref={hostRef} />;
}
