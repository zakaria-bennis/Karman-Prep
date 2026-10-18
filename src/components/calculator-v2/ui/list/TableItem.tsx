// One table item in the expression list (D-5, D-19): the gutter number, a grid named "Table n,
// k columns, m rows" whose first row holds the column headers and whose data rows end in one blank
// row, each entered cell a TableCell named "header, row r" (", blank" while empty) and each
// computed cell a read-only gridcell named "header, row r, computed, value". While focus is in the
// grid a blank header slot right of the last column adds a column (D-5). The Delete control
// removes the table through row-actions (D-16).

import { Maximize, Plus, X } from "lucide-react";
import { useContext, useLayoutEffect, useRef, useState, type FocusEvent, type JSX } from "react";
import type { RowView } from "@/lib/calculator-v2/core/api/engine";
import { MAX_TABLE_COLUMNS, MAX_TABLE_ROWS } from "@/lib/calculator-v2/core/api/document";
import { fitPoints } from "@/lib/calculator-v2/core/data/fit-view";
import { useAnnouncer } from "../a11y/announcer";
import { cellKey, FocusContext } from "../focus/focus-controller";
import { useEngine, useEngineSnapshot } from "../hooks/use-engine";
import { ColumnStyleMenu } from "./ColumnStyleMenu";
import { deleteRowByControl } from "./row-actions";
import type { RowMotion } from "./row-presence";
import { addTableRow, cellKeys, deleteTableRowByControl, type TableKeyContext } from "./table-keys";
import { TableCell } from "./TableCell";
import {
  cellName,
  computedCellName,
  dataRowCount,
  gridName,
  headerName,
  NEW_COLUMN_HEADER,
} from "./table-model";

export interface TableItemProps {
  row: RowView;
  number: number;
  keypadOpen: boolean;
  motion: RowMotion;
  onExitDone(rowId: string): void;
}

export function TableItem(props: TableItemProps): JSX.Element {
  const { row, number, keypadOpen, motion } = props;
  const exiting = motion === "exit";
  const engine = useEngine();
  const { focusedRowId, activeRowId, geometry } = useEngineSnapshot(engine);
  const focus = useContext(FocusContext)!;
  const announcer = useAnnouncer();
  const keyContext: TableKeyContext = { engine, focus, announcer, tableId: row.id };
  const [inside, setInside] = useState(false);
  const gridRef = useRef<HTMLDivElement>(null);
  const latest = useRef(props.onExitDone);
  useLayoutEffect(() => {
    latest.current = props.onExitDone;
  });

  // AN-5: a table leaves at once; it has no exit transition of its own.
  useLayoutEffect(() => {
    if (exiting) latest.current(row.id);
  }, [exiting, row.id]);

  const columns = row.columns ?? [];
  const analysis = row.table?.analysis.columns ?? [];
  const result = row.table?.result?.columns ?? [];
  const rows = dataRowCount(row);
  const headers = columns.map((c, k) => headerName(c.latex, k));
  const computed = (k: number) => analysis[k]?.role === "computed";
  const slot = inside && columns.length < MAX_TABLE_COLUMNS;
  // D-16: the plotted points' fitted view, null while nothing is plotted.
  const plotted = geometry.get(row.id);
  const fit = plotted?.kind === "table" ? fitPoints(plotted.series.map((s) => s.coords)) : null;

  // D-5: the header slot shows while focus is anywhere in the grid.
  const onGridFocus = () => setInside(true);
  const onGridBlur = (e: FocusEvent<HTMLDivElement>) => {
    const next = e.relatedTarget;
    if (!(next instanceof Node) || !gridRef.current?.contains(next)) setInside(false);
  };

  const cell = (k: number, r: number) => {
    const latex = columns[k].values[r] ?? "";
    if (computed(k)) {
      const value = r < rows ? (result[k]?.display[r] ?? null) : null;
      return (
        <div
          key={k}
          role="gridcell"
          className="kc-table-cell"
          data-computed="true"
          aria-readonly="true"
          aria-label={computedCellName(headers[k], r, value)}
        >
          {value}
        </div>
      );
    }
    return (
      <div key={k} role="gridcell" className="kc-table-cell">
        <TableCell
          tableId={row.id}
          column={k}
          row={r}
          latex={latex}
          name={cellName(headers[k], r, latex)}
          keypadOpen={keypadOpen}
          keys={cellKeys(keyContext, k, r)}
          onEdit={(e, next) => e.editCell(row.id, k, r, next, "typing")}
        />
      </div>
    );
  };

  return (
    <li
      className="kc-row kc-table-item"
      data-row-id={row.id}
      data-focused={focusedRowId === row.id ? "true" : undefined}
      data-active={activeRowId === row.id ? "true" : undefined}
      data-motion={motion}
      aria-hidden={exiting ? "true" : undefined}
    >
      <div className="kc-row-inner">
        <div className="kc-row-gutter">
          <span className="kc-row-number">{exiting ? null : number}</span>
        </div>
        <div className="kc-row-main">
          <div
            ref={gridRef}
            role="grid"
            className="kc-table"
            aria-label={gridName(number, columns.length, rows)}
            onFocus={onGridFocus}
            onBlur={onGridBlur}
          >
            <div role="row" className="kc-table-row" data-header="true">
              {/* One keyed list, so the slot's field becomes the new column's header in place. */}
              {[...columns.map((c) => c.latex), ...(slot ? [null] : [])].map((latex, k) => (
                <div key={`h-${k}`} role="columnheader" className="kc-table-cell">
                  {latex !== null && k > 0 && (
                    <ColumnStyleMenu
                      tableId={row.id}
                      column={k}
                      stored={columns[k]}
                      header={headers[k]}
                      onDeleted={() => focus.focusRow(cellKey(row.id, k - 1, "h"), "end")}
                    />
                  )}
                  <TableCell
                    tableId={row.id}
                    column={k}
                    row="h"
                    latex={latex ?? ""}
                    name={latex === null ? NEW_COLUMN_HEADER : `Column ${k + 1} header`}
                    keypadOpen={keypadOpen}
                    keys={cellKeys(keyContext, k, "h")}
                    onEdit={(e, next) => e.editHeader(row.id, k, next, "typing")}
                  />
                </div>
              ))}
            </div>
            {Array.from({ length: rows + 1 }, (_, r) => (
              <div key={r} role="row" className="kc-table-row">
                {columns.map((_, k) => cell(k, r))}
                {r < rows && (
                  <div role="gridcell" className="kc-table-control">
                    <button
                      type="button"
                      className="kc-table-row-delete"
                      aria-label={`Delete table ${number} row ${r + 1}`}
                      onClick={() => deleteTableRowByControl(keyContext, r)}
                    >
                      <X aria-hidden="true" focusable="false" size={14} />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
          <button
            type="button"
            className="kc-table-add-row"
            aria-label={`Add row to table ${number}`}
            aria-disabled={rows >= MAX_TABLE_ROWS ? "true" : undefined}
            onClick={() => addTableRow(keyContext)}
          >
            <Plus aria-hidden="true" focusable="false" size={14} />
          </button>
          <button
            type="button"
            className="kc-table-add-row"
            aria-label={`Zoom to fit table ${number}`}
            aria-disabled={fit === null ? "true" : undefined}
            onClick={() => fit !== null && engine.setMathBounds(fit)}
          >
            <Maximize aria-hidden="true" focusable="false" size={14} />
          </button>
        </div>
        <button
          type="button"
          className="kc-row-delete"
          aria-label={`Delete table ${number}`}
          onClick={() => deleteRowByControl(engine, focus, row.id)}
        >
          <X aria-hidden="true" focusable="false" size={16} />
        </button>
      </div>
    </li>
  );
}
