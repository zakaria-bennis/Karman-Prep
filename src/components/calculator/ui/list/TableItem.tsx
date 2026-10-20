// One table item in the expression list (D-5, D-19): the gutter number, a grid named "Table n,
// k columns, m rows" whose first row holds the column headers and whose data rows end in one blank
// row, each entered cell a TableCell named "header, row r" (", blank" while empty) and each
// computed cell a read-only gridcell named "header, row r, computed, value". While focus is in the
// grid's blank header slot right of the last column adds a column (D-5, TABLES-2: always shown). The Delete control
// removes the table through row-actions (D-16). A cell or header that cannot evaluate shows the
// warning marker at its left, with the message in a tooltip, and its field is aria-invalid (D-6, D-10).

import {
  Fragment,
  useContext,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type JSX,
  type KeyboardEvent,
} from "react";
import type { RowView } from "@/lib/calculator/core/api/engine";
import { MAX_TABLE_COLUMNS, MAX_TABLE_ROWS } from "@/lib/calculator/core/api/document";
import { zoomFitSeries } from "@/lib/calculator/core/api/table-paste";
import {
  addTableRegression,
  regressionEligibility,
} from "@/lib/calculator/core/api/table-regression-commands";
import { AddGlyph, RemoveGlyph, ZoomFitGlyph } from "../../icons/list";
import { AddRegressionGlyph } from "./TableGlyphs";
import { useAnnouncer } from "../a11y/announcer";
import { cellKey, FocusContext } from "../focus/focus-controller";
import { useEngine, useEngineSnapshot } from "../hooks/use-engine";
import { ColumnStyleMenu } from "./ColumnStyleMenu";
import { ErrorMarker } from "./ErrorMarker";
import { deleteRowByControl } from "./row-actions";
import type { RowMotion } from "./row-presence";
import { addTableRow, cellKeys, deleteTableRowByControl, type TableKeyContext } from "./table-keys";
import { TableCell } from "./TableCell";
import { TableRegression } from "./TableRegression";
import {
  cellErrorId,
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
  onTouchFocus(rowId: string): void; // K-2
}

/** RT-6: the reference's widths for short values: 70 px first, 81 px later (room for the colour
 * icon), 60 px for the blank header slot. */
/**
 * RT-6: the grid's column tracks, sized to their content as the reference's auto table layout
 * does (table.css sets each cell's minimum), then the 60 px blank slot and the 28 px row-delete
 * control. A table wider than the list scrolls sideways (D-42) rather than squeezing columns.
 */
const gridTracks = (columns: number, slot: boolean): CSSProperties => ({
  gridTemplateColumns: `repeat(${columns}, max-content)${slot ? " 60px" : ""} 28px`,
});

/** RT-6: "1.234568×10^-4" drawn as the reference draws it, the exponent raised. */
function ComputedValue({ text }: { text: string }): JSX.Element {
  const m = /^(.*)×10\^(-?\d+)$/.exec(text);
  if (m === null) return <>{text.replace(/^-/, "−")}</>;
  return (
    <>
      {m[1]}×10<sup className="kc-table-exponent">{m[2].replace("-", "−")}</sup>
    </>
  );
}

/**
 * RT-6, TABLES-28: the data rows a long table hides, [from, to): with 29 or more data rows it
 * shows rows 1-7, "{n} more rows", then the last 4 and the blank row (n = rows - 11); else null.
 */
export function collapsedRange(rows: number): { from: number; to: number } | null {
  return rows >= 29 ? { from: 7, to: rows - 4 } : null;
}

/** Whether `target` is inside a table cell's math field (which reports its own focus). */
function inCell(target: EventTarget | null): boolean {
  return target instanceof Element && target.closest(".kc-table-field") !== null;
}

export function TableItem(props: TableItemProps): JSX.Element {
  const { row, number, keypadOpen, motion } = props;
  const exiting = motion === "exit";
  const engine = useEngine();
  const { focusedRowId, activeRowId, geometry } = useEngineSnapshot(engine);
  const focus = useContext(FocusContext)!;
  const announcer = useAnnouncer();
  const keyContext: TableKeyContext = { engine, focus, announcer, tableId: row.id };
  // RT-6, TABLES-28: 29 or more data rows collapse until "Show all" (or a move past the gap).
  const [expanded, setExpanded] = useState(false);
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
  const hidden = expanded ? null : collapsedRange(rows);
  const headers = columns.map((c, k) => headerName(c.latex, k));
  const computed = (k: number) => analysis[k]?.role === "computed";
  // TABLES-2: the blank header slot and its read-only column always show, as on the reference.
  const slot = columns.length < MAX_TABLE_COLUMNS;
  // RT-28: Add Regression adds a Linear table regression and focuses its model dropdown.
  const eligibility = regressionEligibility(row);
  const addRegression = (column?: number) => {
    if (!addTableRegression(engine, row.id, column)) return;
    requestAnimationFrame(() =>
      gridRef.current
        ?.closest(".kc-table-item")
        ?.querySelector<HTMLElement>(".kc-tr-model .kc-tr-select-button")
        ?.focus()
    );
  };
  const regression = row.table?.analysis.regression ?? undefined;
  // D-16: the plotted points' fitted view, null while nothing is plotted.
  const plotted = geometry.get(row.id);
  const fit = plotted?.kind === "table" ? zoomFitSeries(plotted.series.map((s) => s.coords)) : null;

  // A keyboard move off the last row above the gap, or the first below it, shows every row first,
  // so the cell it focuses mounts (the focus controller focuses it once it registers).
  const onGridKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (hidden === null) return;
    const r = Number(
      (e.target as Element).closest?.("[data-table-row]")?.getAttribute("data-table-row")
    );
    const down = e.key === "ArrowDown" || e.key === "Enter" || (e.key === "Tab" && !e.shiftKey);
    const up = e.key === "ArrowUp" || (e.key === "Tab" && e.shiftKey);
    if ((down && r === hidden.from - 1) || (up && r === hidden.to)) setExpanded(true);
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
          {value === null ? null : <ComputedValue text={value} />}
        </div>
      );
    }
    const error = analysis[k]?.cellErrors[r] ?? null;
    const errorId = error === null ? null : cellErrorId(row.id, k, r);
    return (
      <div key={k} role="gridcell" className="kc-table-cell">
        {error !== null && <ErrorMarker id={errorId!} message={error.message} variant="cell" />}
        <TableCell
          tableId={row.id}
          column={k}
          row={r}
          latex={latex}
          name={cellName(headers[k], r, latex)}
          errorId={errorId}
          keypadOpen={keypadOpen}
          onTouchFocus={props.onTouchFocus}
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
      onFocus={(e) => {
        // As on the reference, focus on any of the table's controls (the regression dropdown, a
        // Zoom Fit, "plot") selects the table; its cells report their own focus.
        if (!inCell(e.target)) engine.setFocusedRow(row.id);
      }}
      onBlur={(e) => {
        if (inCell(e.target) || e.currentTarget.contains(e.relatedTarget as Node | null)) return;
        engine.setFocusedRow(null);
      }}
    >
      <div className="kc-row-inner">
        <div className="kc-row-gutter">
          <span className="kc-row-number">{exiting ? null : number}</span>
          {/* RT-28: Add Regression sits at the head of the gutter, under the number. */}
          {eligibility.canAdd && (
            <button
              type="button"
              className="kc-table-add-row kc-table-add-regression"
              aria-label="Add Regression"
              title="Add Regression"
              onClick={() => addRegression()}
            >
              <AddRegressionGlyph />
            </button>
          )}
          {/* RT-8, RT-28: the table's actions sit at the foot of its gutter, as the reference's do. */}
          <div className="kc-table-actions">
            <button
              type="button"
              className="kc-table-add-row"
              aria-label={`Add row to table ${number}`}
              aria-disabled={rows >= MAX_TABLE_ROWS ? "true" : undefined}
              onClick={() => addTableRow(keyContext)}
            >
              <AddGlyph size={14} />
            </button>
            {/* TABLES-45, -48: shown whenever the table plots points, gone when nothing is. */}
            {fit !== null && (
              <button
                type="button"
                className="kc-table-add-row kc-table-zoom"
                aria-label={`Zoom to fit table ${number}`}
                title="Zoom Fit"
                onClick={() => engine.setMathBounds(fit)}
              >
                <ZoomFitGlyph size={14} />
              </button>
            )}
          </div>
        </div>
        <div className="kc-row-main">
          <div
            ref={gridRef}
            role="grid"
            className="kc-table"
            style={gridTracks(columns.length, slot)}
            aria-label={gridName(number, columns.length, rows)}
            onKeyDownCapture={onGridKeyDown}
          >
            <div role="row" className="kc-table-row" data-header="true">
              {/* One keyed list, so the slot's field becomes the new column's header in place. */}
              {[...columns.map((c) => c.latex), ...(slot ? [null] : [])].map((latex, k) => {
                const error = latex === null ? null : (analysis[k]?.error ?? null);
                const errorId = error === null ? null : cellErrorId(row.id, k, "h");
                return (
                  <div
                    key={`h-${k}`}
                    role="columnheader"
                    className="kc-table-cell"
                    data-slot={latex === null ? "true" : undefined}
                  >
                    {error !== null && (
                      <ErrorMarker id={errorId!} message={error.message} variant="cell" />
                    )}
                    {latex !== null && k > 0 && (
                      <ColumnStyleMenu
                        tableId={row.id}
                        column={k}
                        stored={columns[k]}
                        header={headers[k]}
                        onDeleted={() => focus.focusRow(cellKey(row.id, k - 1, "h"), "end")}
                        onAddRegression={() => addRegression(k)}
                        regression={
                          !eligibility.canAdd
                            ? null
                            : eligibility.candidates.includes(k)
                              ? "add"
                              : "disabled"
                        }
                      />
                    )}
                    <TableCell
                      tableId={row.id}
                      column={k}
                      row="h"
                      latex={latex ?? ""}
                      name={latex === null ? NEW_COLUMN_HEADER : `Column ${k + 1} header`}
                      errorId={errorId}
                      keypadOpen={keypadOpen}
                      onTouchFocus={props.onTouchFocus}
                      keys={cellKeys(keyContext, k, "h")}
                      onEdit={(e, next) => e.editHeader(row.id, k, next, "typing")}
                    />
                  </div>
                );
              })}
            </div>
            {Array.from({ length: rows + 1 }, (_, r) => r)
              .filter((r) => hidden === null || r < hidden.from || r >= hidden.to)
              .map((r) => (
                <Fragment key={r}>
                  {hidden !== null && r === hidden.to && (
                    <div role="row" className="kc-table-more">
                      <div
                        role="gridcell"
                        className="kc-table-more-cell"
                        style={{ gridColumn: `1 / span ${columns.length + (slot ? 1 : 0)}` }}
                      >
                        <span className="kc-table-more-count">
                          {hidden.to - hidden.from} more rows
                        </span>{" "}
                        <button
                          type="button"
                          className="kc-table-more-show"
                          onClick={() => {
                            setExpanded(true);
                            focus.focusRow(cellKey(row.id, 0, hidden.from), "all");
                          }}
                        >
                          Show all
                        </button>
                      </div>
                    </div>
                  )}
                  <div role="row" className="kc-table-row" data-table-row={r}>
                    {columns.map((_, k) => cell(k, r))}
                    {slot && (
                      <div
                        role="gridcell"
                        className="kc-table-cell kc-table-slot"
                        aria-hidden="true"
                      />
                    )}
                    {r < rows && (
                      <div role="gridcell" className="kc-table-control">
                        <button
                          type="button"
                          className="kc-table-row-delete"
                          aria-label={`Delete table ${number} row ${r + 1}`}
                          onClick={() => deleteTableRowByControl(keyContext, r)}
                        >
                          <RemoveGlyph size={12} />
                        </button>
                      </div>
                    )}
                  </div>
                </Fragment>
              ))}
          </div>
          {regression !== undefined && (
            <TableRegression row={row} stored={{ columns, regression }} />
          )}
        </div>
        <button
          type="button"
          className="kc-row-delete"
          aria-label={`Delete table ${number}`}
          onClick={() => deleteRowByControl(engine, focus, row.id)}
        >
          <RemoveGlyph />
        </button>
      </div>
    </li>
  );
}
