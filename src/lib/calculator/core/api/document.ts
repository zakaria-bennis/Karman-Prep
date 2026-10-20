// The engine's row list, id counter and undo history. Package-internal,
// except INITIAL_GRAPH_SIZE, which the nextViewportForSize reads. History entries hold the row list
// only: settings and the viewport are never undo steps (KB-5). No method mutates a row in place;
// every list and row the document holds is frozen.

import type { PixelSize } from "../../plot/viewport";
import { sameSlider, type SliderSettings } from "../../sliders/model";
import type { LineStyle, PointStyle } from "./types";

/** Undo steps kept; the oldest is dropped first (Decision 6's plan value; no spec ID sets a size). */
export const HISTORY_LIMIT = 100;
/** The graph size the engine assumes before the graph's first setView report (Decision 9). */
export const INITIAL_GRAPH_SIZE: PixelSize = Object.freeze({ width: 800, height: 600 });
/** KB-2: "typing" and "keypad" edits to one row coalesce while each follows the last within this. */
const GROUP_IDLE_MS = 1000;
/** Decimal ids longer than this are never produced by the counter, so they cannot collide. */
const DECIMAL_ID = /^[0-9]{1,15}$/;

export interface StoredRow {
  readonly id: string;
  readonly latex: string; // "" for a table
  readonly color: string; // "c1".."c6" or "#rrggbb"
  readonly hidden: boolean;
  readonly lineStyle?: LineStyle;
  readonly pointStyle?: PointStyle;
  readonly slider?: SliderSettings; // SLIDERS-11: absent for the default settings
  readonly type?: "table"; // D-1: absent for an expression row
  readonly columns?: readonly StoredColumn[]; // tables only
  readonly logMode?: boolean; // D-30: a regression row's Log mode checkbox
}
/** D-1: one table column; `values` holds each cell's LaTeX, "" for a blank cell. */
export interface StoredColumn {
  readonly latex: string; // the header
  readonly values: readonly string[];
  readonly color: string;
  readonly hidden: boolean; // D-12: points off
  readonly lines?: boolean; // D-12: points joined in row order
  readonly lineStyle?: LineStyle;
  readonly pointStyle?: PointStyle;
}
/** D-8, D-9: a table holds at most 1,000 data rows and 10 columns; D-6: a cell 128 characters. */
export const MAX_TABLE_ROWS = 1000;
export const MAX_TABLE_COLUMNS = 10;
export const MAX_CELL_CHARACTERS = 128;

export type HistoryStep =
  | { kind: "none" } // no undo entry (setState without allowUndo)
  | { kind: "step" } // one undo entry
  | { kind: "group"; rowId: string; at: number }; // "typing"/"keypad": joins the open group for rowId while at − last edit < 1,000 ms

type RowList = readonly StoredRow[];

function freezeRows(rows: RowList): RowList {
  return Object.freeze(
    rows.map((row) => {
      if (row.slider !== undefined) Object.freeze(row.slider);
      if (row.columns !== undefined) {
        for (const column of row.columns) Object.freeze(Object.freeze(column).values);
        Object.freeze(row.columns);
      }
      return Object.freeze(row);
    })
  );
}

/** True when both lists hold the same rows, field by field, in the same order. */
export function sameRows(a: RowList, b: RowList): boolean {
  return a.length === b.length && a.every((row, i) => sameRow(row, b[i]));
}

function sameColumns(a?: readonly StoredColumn[], b?: readonly StoredColumn[]): boolean {
  if (a === b) return true;
  if (a === undefined || b === undefined || a.length !== b.length) return false;
  return a.every((c, i) => {
    const d = b[i];
    return (
      c.latex === d.latex &&
      c.color === d.color &&
      c.hidden === d.hidden &&
      c.lines === d.lines &&
      c.lineStyle === d.lineStyle &&
      c.pointStyle === d.pointStyle &&
      c.values.length === d.values.length &&
      c.values.every((v, k) => v === d.values[k])
    );
  });
}

function sameRow(a: StoredRow, b: StoredRow): boolean {
  if (a === b) return true;
  if (a.type !== b.type || a.logMode !== b.logMode || !sameColumns(a.columns, b.columns)) {
    return false;
  }
  return (
    a.id === b.id &&
    a.latex === b.latex &&
    a.color === b.color &&
    a.hidden === b.hidden &&
    a.lineStyle === b.lineStyle &&
    a.pointStyle === b.pointStyle &&
    sameSlider(a.slider, b.slider)
  );
}

export class RowDocument {
  private list: RowList = [];
  private counter = 0;
  private past: RowList[] = [];
  private future: RowList[] = [];
  /** The open typing group: its row and the time of its last edit. */
  private group: { rowId: string; at: number } | null = null;

  constructor() {
    this.reset();
  }

  get rows(): readonly StoredRow[] {
    return this.list;
  }

  /** One empty row "1" in slot c1, the id counter at 1 and an empty history (R-10, Decision 7). */
  reset(): void {
    this.list = freezeRows([{ id: "1", latex: "", color: "c1", hidden: false }]);
    this.counter = 1;
    this.clearHistory();
  }

  /** One more than the larger of the counter and the largest decimal id present (Decision 7). */
  nextId(): string {
    let largest = this.counter;
    for (const { id } of this.list) {
      if (DECIMAL_ID.test(id)) largest = Math.max(largest, Number(id));
    }
    this.counter = largest + 1;
    return String(this.counter);
  }

  /**
   * Replaces the row list. An empty list becomes one empty row with `nextId()` in slot c1. A
   * "step" or a "group" edit that cannot join the open group adds one undo entry, dropping the
   * oldest past HISTORY_LIMIT, and clears redo; "none" adds no entry. A "group" edit opens or
   * extends the typing group for its row; "step" and "none" end it.
   */
  commit(rows: readonly StoredRow[], step: HistoryStep): void {
    const next =
      rows.length > 0 ? rows : [{ id: this.nextId(), latex: "", color: "c1", hidden: false }];
    if (step.kind === "group") {
      const open = this.group;
      const joins = open !== null && open.rowId === step.rowId && step.at - open.at < GROUP_IDLE_MS;
      if (!joins) this.record();
      this.group = { rowId: step.rowId, at: step.at };
    } else {
      if (step.kind === "step") this.record();
      this.group = null;
    }
    this.list = freezeRows(next);
  }

  endGroup(): void {
    this.group = null;
  }

  /** Restores the list before the last step; false when there is nothing to undo. Ends the group. */
  undo(): boolean {
    this.group = null;
    const previous = this.past.pop();
    if (previous === undefined) return false;
    this.future.push(this.list);
    this.list = previous;
    return true;
  }

  /** Re-applies the last undone step; false when there is nothing to redo. Ends the group. */
  redo(): boolean {
    this.group = null;
    const next = this.future.pop();
    if (next === undefined) return false;
    this.past.push(this.list);
    this.list = next;
    return true;
  }

  clearHistory(): void {
    this.past = [];
    this.future = [];
    this.group = null;
  }

  canUndo(): boolean {
    return this.past.length > 0;
  }

  canRedo(): boolean {
    return this.future.length > 0;
  }

  /** Pushes the current list as an undo entry and clears redo. */
  private record(): void {
    this.past.push(this.list);
    if (this.past.length > HISTORY_LIMIT) this.past.shift();
    this.future = [];
  }
}
