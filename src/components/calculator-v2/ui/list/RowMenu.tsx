// An expression row's menu (D-13; R-4's style picker joins it in Phase 2), opened from the row's
// gutter tab by long-press, right-click, Shift+F10 or the ContextMenu key. For a row y=E(x) or
// f(x)=E it offers Create table, which inserts the D-13 table below the row, selects its first x
// cell and shows the undoable "Table created." toast. A row with nothing to offer opens no menu.

import { useContext, useEffect, useRef, type JSX, type RefObject } from "react";
import type { CalculatorEngine } from "@/lib/calculator-v2/core/api/engine";
import { tableHeaderFor } from "@/lib/calculator-v2/core/data/table-from-row";
import { functionDefinitionHead } from "@/lib/calculator-v2/core/latex";
import { useAnnouncer } from "../a11y/announcer";
import { EscapeContext } from "../focus/escape-stack";
import { cellKey, FocusContext } from "../focus/focus-controller";
import { useEngine } from "../hooks/use-engine";
import { usePopupDismiss } from "./menu-trigger";
import { performUndo } from "./row-actions";
import { ToastContext } from "./Toast";

export const TABLE_CREATED = "Table created.";

/** D-13: whether row `rowId` holds a function Create table can tabulate. */
export function offersCreateTable(engine: CalculatorEngine, rowId: string): boolean {
  const rows = engine.getSnapshot().rows;
  const row = rows.find((r) => r.id === rowId);
  if (row === undefined || row.type === "table") return false;
  const functions = new Set(rows.flatMap((r) => functionDefinitionHead(r.latex)?.name ?? []));
  return tableHeaderFor(row.latex, functions) !== null;
}

export interface RowMenuProps {
  rowId: string;
  number: number;
  trigger: RefObject<HTMLButtonElement | null>;
  onClose(refocus: boolean): void;
}

export function RowMenu({ rowId, number, trigger, onClose }: RowMenuProps): JSX.Element {
  const engine = useEngine();
  const focus = useContext(FocusContext)!;
  const announcer = useAnnouncer();
  const escape = useContext(EscapeContext);
  const toaster = useContext(ToastContext);
  const menu = useRef<HTMLDivElement>(null);
  const item = useRef<HTMLButtonElement>(null);
  usePopupDismiss(true, "row-menu", { popup: menu, trigger }, escape, onClose);
  useEffect(() => item.current?.focus(), []);

  const createTable = () => {
    onClose(false);
    const made = engine.createTableFromRow(rowId);
    if (made === null || typeof made === "string") return;
    focus.focusRow(cellKey(made.id, 0, 0), "all");
    toaster?.show({
      text: TABLE_CREATED,
      action: { label: "Undo", run: () => performUndo(engine, announcer) },
    });
  };

  return (
    <div
      ref={menu}
      className="kc-row-menu"
      role="menu"
      aria-label={`Options for expression ${number}`}
    >
      <button
        type="button"
        ref={item}
        role="menuitem"
        className="kc-add-menu-item"
        onClick={createTable}
        onKeyDown={(e) => {
          if (e.key === "Tab") {
            e.preventDefault();
            onClose(true);
          }
        }}
      >
        Create table
      </button>
    </div>
  );
}
