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
import { arityError } from "../analysis/classify";
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
  firstHeaderCoordinate: "First column may not be 'y', 'r', or 'θ'.", // TABLES-16
  comma: "Points are written like this: (1, 2).",
  // TABLES-13: what a cell may not hold
  point: "Table entry cannot be a point.",
  equation: "Table entries must be simple expressions. Equations are not allowed.",
  inequality: "Table entries must be simple expressions. Inequalities are not allowed.",
  list: "Table entries must be simple expressions. Lists are not allowed.",
  regression: "Table entries must be simple expressions. Regressions are not allowed.",
  functionDefinition:
    "Table entries must be simple expressions. Function definitions are not allowed.",
  // anything that cannot be read (2+, \sqrt{}, x_{1^{2}}, a=), live 2026-10-20
  unreadable: "Table entries must be simple expressions. This type of expression is not allowed.",
  undefinedName: (name: string) => `Too many variables. Try defining '${name}'.`,
} as const;
/** TABLES-13: the same rules for a later column's header, in the reference's header wording. */
export const HEADER_MESSAGES = {
  point: "Table header cannot be a point.",
  equation: "Table headers must be simple expressions. Equations are not allowed.",
  inequality: "Table headers must be simple expressions. Inequalities are not allowed.",
  list: "Table headers must be simple expressions. Lists are not allowed.",
  regression: "Table headers must be simple expressions. Regressions are not allowed.",
  functionDefinition:
    "Table headers must be simple expressions. Function definitions are not allowed.",
  unreadable: "Table headers must be simple expressions. This type of expression is not allowed.",
} as const;
type ShapeMessages = Record<
  "point" | "equation" | "inequality" | "list" | "regression" | "functionDefinition" | "unreadable",
  string
>;

const message = (code: RowErrorCode, text: string, names: string[] = []): RowError => ({
  code,
  message: text,
  names,
  span: null,
});

function parseCell(
  latex: string,
  userFunctions: ReadonlySet<string>,
  texts: ShapeMessages
): ParsedCell {
  if (normalizeLatex(latex).trim() === "") return { tree: null, error: null, blank: true };
  const parsed = parseLatex(latex, { userFunctions });
  if (parsed.ok) return { tree: parsed.tree, error: null, blank: false };
  const { code } = parsed.error;
  const comma = code === "point-arity" || /,/.test(latex);
  // TABLES-13: whatever cannot be read is "not allowed" in a table, live 2026-10-20.
  const error = message(comma ? "syntax" : code, comma ? TABLE_MESSAGES.comma : texts.unreadable);
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
    headers: columns.map((c) => parseCell(c.latex, userFunctions, HEADER_MESSAGES)),
    cells: columns.map((c) => c.values.map((v) => parseCell(v, userFunctions, TABLE_MESSAGES))),
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
    const items = cells.map((cell) =>
      usableCell(cell, own, declared, builtinArity) ? cell.tree! : NAN
    );
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

/** RC-20 for built-ins alone, before definitions resolve: user functions are checked later. */
const builtinArity: ArityCheck = (tree) => arityError(tree, { functionArity: () => null });

function usableCell(
  cell: ParsedCell,
  own: ReadonlySet<string>,
  declared: ReadonlySet<string>,
  arity: ArityCheck
): boolean {
  return cell.tree !== null && cellError(cell, own, declared, arity) === null;
}

/**
 * TABLES-13: a cell (or later header) that is a point, a list, a regression, an equation, an
 * inequality or a definition, in `texts`' wording.
 */
function shapeError(tree: Node, texts: ShapeMessages = TABLE_MESSAGES): string | null {
  if (tree.kind === "point") return texts.point;
  if (tree.kind === "list") return texts.list;
  if (tree.kind === "sim") return texts.regression;
  if (tree.kind !== "rel") return null;
  if (tree.ops.some((op) => op !== "=")) return texts.inequality;
  return tree.operands[0]?.kind === "call" ? texts.functionDefinition : texts.equation;
}

/** RC-20: a call's argument-count error in a cell or header tree, or null. */
export type ArityCheck = (tree: Node) => RowError | null;

function cellError(
  cell: ParsedCell,
  own: ReadonlySet<string>,
  declared: ReadonlySet<string>,
  arity: ArityCheck
): RowError | null {
  if (cell.error !== null || cell.tree === null) return cell.error;
  const shape = shapeError(cell.tree);
  if (shape !== null) return message("syntax", shape);
  // Desmos marks a cell whose call has the wrong argument count (`\sin()`, 2026-10-20)
  const count = arity(cell.tree);
  if (count !== null) return count;
  for (const { name } of collectNameUses(cell.tree)) {
    // TABLES-13: the reference reads its own table's column names in a cell as undefined names.
    if (own.has(name) || (!declared.has(name) && !COORDINATE_NAMES.includes(name))) {
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
  arity: ArityCheck
): TableAnalysis {
  const own = new Set(names.filter((n): n is string => n !== null));
  const columns = t.headers.map((h, j): ColumnAnalysis => {
    const cellErrors = t.cells[j].map((cell) => cellError(cell, own, declared, arity));
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
      if (["y", "r", "\\theta"].includes(h.tree.name)) {
        return {
          ...base,
          role: "error",
          name: null,
          error: message("syntax", TABLE_MESSAGES.firstHeaderCoordinate),
        };
      }
    } else if (h.blank) {
      return { ...base, role: "blank", name: null, error: null };
    }
    if (h.error !== null) return { ...base, role: "error", name: null, error: h.error };
    const shape = j > 0 && h.tree !== null ? shapeError(h.tree, HEADER_MESSAGES) : null;
    if (shape !== null)
      return { ...base, role: "error", name: null, error: message("syntax", shape) };
    const count = j > 0 && h.tree !== null ? arity(h.tree) : null;
    if (count !== null) return { ...base, role: "error", name: null, error: count };
    // a header naming another column of the same table is marked, as in Desmos; a column named
    // like another table's or row's is not: Desmos marks only the rows that use it (2026-10-20)
    const name = names[j];
    if (name !== null && names.indexOf(name) !== names.lastIndexOf(name)) {
      const shown = displayName(name);
      const text = rowErrorMessage("duplicate-definition", [shown]);
      return {
        ...base,
        role: "error",
        name,
        error: message("duplicate-definition", text, [shown]),
      };
    }
    if (name !== null) return { ...base, role: j === 0 ? "variable" : "data", name, error: null };
    return { ...base, role: "computed", name: null, error: null };
  });
  const rows = Math.max(0, ...t.cells.map((c) => c.length));
  return { columns, rows, regression: regressionOfSource(t.source) };
}
