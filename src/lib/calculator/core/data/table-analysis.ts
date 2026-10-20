// Table rows in analysis (D-6, D-10, D-11): headers and cells parsed as rows are, each column's
// role, and every variable or data column as a synthetic definition `name=[cells]` that the
// existing resolution orders, checks for duplicates and cycles, and evaluates like any other
// definition. A cell that cannot evaluate (a parse error, its own table's columns, an undefined
// name, a comma) is an undefined element with a cell error, so the rest of its column still works.
// Pure TypeScript: no DOM.

import type { RowErrorCode } from "../corpus/types";
import type { Node, SourceSpan } from "../latex/ast";
import { normalizeLatex, parseLatex } from "../latex/index";
import type { ParsedRow } from "../analysis/definitions";
import type { RowError, RowSource } from "../analysis/index";
import { displayName, rowErrorMessage } from "../analysis/messages";
import { collectNameUses, COORDINATE_NAMES } from "../analysis/names";
import type { TableRegressionSpec } from "./table-regression";

export type ColumnRole = "variable" | "data" | "computed" | "blank" | "error";
export interface ColumnAnalysis {
  index: number;
  role: ColumnRole;
  name: string | null; // variable and data columns: the header name
  tree: Node | null; // the header's tree
  error: RowError | null; // the header's warning (D-10)
  cellErrors: (RowError | null)[]; // per cell (D-6)
  cells: (Node | null)[]; // each usable cell's tree; null when blank or in error
  hidden: boolean; // D-12: points off
}
export interface TableAnalysis {
  columns: ColumnAnalysis[];
  rows: number; // data rows
  regression: TableRegressionSpec | null; // RT-28
}

interface ParsedCell {
  tree: Node | null;
  error: RowError | null;
  blank: boolean;
}
export interface ParsedTable {
  source: RowSource;
  headers: ParsedCell[];
  cells: ParsedCell[][]; // by column
}

const ZERO_SPAN: SourceSpan = { start: 0, end: 0 };
const NAN: Node = { kind: "num", value: NaN, span: ZERO_SPAN };
export const TABLE_MESSAGES = {
  firstHeader: "The first column needs a name, such as x₁.",
  ownColumns: "A cell can't use its own table's columns.",
  comma: "Points are written like this: (1, 2).",
  undefinedName: (name: string) => `Too many variables. Try defining '${name}'.`,
} as const;

const message = (code: RowErrorCode, text: string, names: string[] = []): RowError => ({
  code,
  message: text,
  names,
  span: null,
});

function parseCell(latex: string, userFunctions: ReadonlySet<string>): ParsedCell {
  if (normalizeLatex(latex).trim() === "") return { tree: null, error: null, blank: true };
  const parsed = parseLatex(latex, { userFunctions });
  if (parsed.ok) return { tree: parsed.tree, error: null, blank: false };
  const comma = parsed.error.code === "point-arity" || /,/.test(latex);
  const error = comma
    ? message("syntax", TABLE_MESSAGES.comma)
    : message(parsed.error.code, rowErrorMessage(parsed.error.code, []));
  return { tree: null, error, blank: false };
}

/** RT-28: the regression a table's source carries, if any. */
export function regressionOfSource(source: RowSource): TableRegressionSpec | null {
  const spec = (source as RowSource & { regression?: TableRegressionSpec }).regression;
  return spec ?? null;
}

export function parseTable(source: RowSource, userFunctions: ReadonlySet<string>): ParsedTable {
  const columns = source.columns ?? [];
  return {
    source,
    headers: columns.map((c) => parseCell(c.latex, userFunctions)),
    cells: columns.map((c) => c.values.map((v) => parseCell(v, userFunctions))),
  };
}

const isName = (t: Node | null): t is Extract<Node, { kind: "id" }> =>
  t !== null && t.kind === "id";
/** A column name that can be defined: coordinates x and y name a column but define no list. */
const definable = (name: string) => !COORDINATE_NAMES.includes(name);

/**
 * The names each table's variable and data columns define. `external` holds the names expression
 * rows (and regressions) define: a later header naming one of those is a computed column (D-10).
 */
export function columnNames(t: ParsedTable, external: ReadonlySet<string>): (string | null)[] {
  // RT-26: the table's own residual column is computed from its regression.
  const residual = regressionOfSource(t.source)?.residual ?? null;
  return t.headers.map((h, j) => {
    if (!isName(h.tree)) return null;
    if (j > 0 && h.tree.name === residual) return null;
    if (j > 0 && external.has(h.tree.name)) return null;
    return h.tree.name;
  });
}

/** The synthetic definitions `name=[cells]` of one table; `declared` is every defined name. */
export function syntheticRows(
  t: ParsedTable,
  names: readonly (string | null)[],
  declared: ReadonlySet<string>
): ParsedRow[] {
  const own = new Set(names.filter((n): n is string => n !== null));
  const out: ParsedRow[] = [];
  names.forEach((name, j) => {
    if (name === null || !definable(name)) return;
    const cells = [...t.cells[j]];
    while (cells.length > 0 && cells[cells.length - 1].blank) cells.pop(); // D-11: trailing blanks
    const items = cells.map((cell) => (usableCell(cell, own, declared) ? cell.tree! : NAN));
    const span = ZERO_SPAN;
    const body: Node = { kind: "list", items, span };
    const tree: Node = {
      kind: "rel",
      ops: ["="],
      operands: [{ kind: "id", name, span }, body],
      span,
    };
    out.push({
      source: { id: `${t.source.id}#${j}`, latex: "", hidden: true },
      empty: false,
      tree,
      error: null,
      head: { name, type: "value", params: [], body, span },
    });
  });
  return out;
}

function usableCell(
  cell: ParsedCell,
  own: ReadonlySet<string>,
  declared: ReadonlySet<string>
): boolean {
  return cell.tree !== null && cellError(cell, own, declared) === null;
}

function cellError(
  cell: ParsedCell,
  own: ReadonlySet<string>,
  declared: ReadonlySet<string>
): RowError | null {
  if (cell.error !== null || cell.tree === null) return cell.error;
  for (const { name } of collectNameUses(cell.tree)) {
    if (own.has(name)) return message("dependency", TABLE_MESSAGES.ownColumns);
    if (!declared.has(name) && !COORDINATE_NAMES.includes(name)) {
      return message("dependency", TABLE_MESSAGES.undefinedName(displayName(name)), [
        displayName(name),
      ]);
    }
  }
  return null;
}

/** D-6, D-10: each column's role, header warning and cell errors. */
export function analyzeTable(
  t: ParsedTable,
  names: readonly (string | null)[],
  declared: ReadonlySet<string>,
  duplicates: ReadonlySet<string>
): TableAnalysis {
  const own = new Set(names.filter((n): n is string => n !== null));
  const columns = t.headers.map((h, j): ColumnAnalysis => {
    const cellErrors = t.cells[j].map((cell) => cellError(cell, own, declared));
    const cells = t.cells[j].map((cell, k) => (cellErrors[k] === null ? cell.tree : null));
    const hidden = t.source.columns?.[j]?.hidden === true;
    const base = { index: j, tree: h.tree, cellErrors, cells, hidden };
    if (j === 0) {
      if (!isName(h.tree)) {
        return {
          ...base,
          role: "error",
          name: null,
          error: message("syntax", TABLE_MESSAGES.firstHeader),
        };
      }
    } else if (h.blank) {
      return { ...base, role: "blank", name: null, error: null };
    }
    if (h.error !== null) return { ...base, role: "error", name: null, error: h.error };
    const name = names[j];
    if (name !== null && duplicates.has(name)) {
      const shown = displayName(name);
      return {
        ...base,
        role: "error",
        name,
        error: message("duplicate-definition", rowErrorMessage("duplicate-definition", [shown]), [
          shown,
        ]),
      };
    }
    if (name !== null) return { ...base, role: j === 0 ? "variable" : "data", name, error: null };
    return { ...base, role: "computed", name: null, error: null };
  });
  const rows = Math.max(0, ...t.cells.map((c) => c.length));
  return { columns, rows, regression: regressionOfSource(t.source) };
}
