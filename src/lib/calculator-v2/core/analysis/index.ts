// Row analysis API (01-interfaces.md section 3). Pure TypeScript: no DOM (AR-44).

import type { RowErrorCode, RowKind } from "../corpus/types";
import type { InequalityOp, Node, RelOp, SourceSpan } from "../latex/ast";
import {
  analyzeTable,
  columnNames,
  parseTable,
  syntheticRows,
  type TableAnalysis,
} from "../data/table-analysis";
import {
  planRegressions,
  regressionCurve,
  regressionSyntheticRows,
  type RegressionAnalysis,
  type RegressionPlan,
} from "../data/regression-analysis";
import { classifyRow } from "./classify";
import { declaredHead, parseRows, userFunctionSet } from "./definitions";
import { collectNameUses } from "./names";
import { resolveDefinitions } from "./resolve";

export { rowErrorMessage } from "./messages";

export interface AnalysisSettings {
  angleMode: "radians" | "degrees";
  complex: boolean;
}
export interface RowSource {
  id: string;
  latex: string; // "" for a table
  hidden: boolean;
  columns?: readonly { latex: string; values: readonly string[]; hidden?: boolean }[]; // D-1
  logMode?: boolean; // D-30: a regression row's Log mode checkbox
}
export interface RowError {
  code: RowErrorCode;
  message: string;
  names: string[];
  span: SourceSpan | null;
}
export interface FunctionDefinition {
  name: string;
  params: string[];
  body: Node;
  rowId: string;
}
export type RowGraph =
  | { kind: "explicit"; independent: "x" | "y"; expr: Node } // curve-y: y=expr(x) on either side; curve-x: x=expr(y)
  | { kind: "implicit"; expr: Node } // sub(lhs, rhs)
  | { kind: "lines"; orientation: "vertical" | "horizontal"; expr: Node } // roots in x (vertical) or y; x^2=4 gives sub(pow(x,2),4)
  | { kind: "region"; operands: Node[]; ops: InequalityOp[] } // the chain as written; 1<y<3 has three operands
  | { kind: "constant-region"; operands: Node[]; ops: InequalityOp[] } // constant-relation inequality; holds or not everywhere
  | { kind: "point" } // coordinates come from the row's value
  | { kind: "table" }; // D-11: the table's later columns against its first
export interface RowAnalysis {
  id: string;
  kind: RowKind;
  tree: Node | null;
  error: RowError | null;
  defines: { name: string; type: "value" | "function"; params: string[] } | null;
  uses: string[]; // referenced names, first-appearance order
  chips: string[]; // RC-10 undefined names, first-appearance order; UI adds "all" when length >= 2
  complexHint: boolean; // NM-17, FN-16: real mode and the only undefined name is i
  isGraphable: boolean; // false when error, chips, hidden, or a non-graphing kind
  relation: { ops: RelOp[] } | null; // relations only; strict = "<" | ">"
  graph: RowGraph | null; // non-null exactly when isGraphable
  table?: TableAnalysis; // D-10: a table row's columns
  regression?: RegressionAnalysis; // D-22: a regression row's fit
}
export interface AnalysisResult {
  rows: RowAnalysis[];
  byId: ReadonlyMap<string, RowAnalysis>;
  valueOrder: string[]; // defining row ids in dependency order
  functions: ReadonlyMap<string, FunctionDefinition>; // error-free function definitions; also holds each error-free dependent definition as a zero-parameter entry
}

const DEFINING_KINDS: ReadonlySet<RowKind> = new Set([
  "definition",
  "dependent-definition",
  "function-definition",
]);

/**
 * Analyses every row: one parse each after the PR-23 function pre-scan, definitions resolved
 * across all rows in any order (RC-9), then RC-2's classification of each row. `valueOrder` keeps
 * the resolution's dependency order for the defining rows that end up without an error.
 */
export function analyzeRows(
  rows: readonly RowSource[],
  settings: AnalysisSettings
): AnalysisResult {
  const parsed = parseRows(rows, settings);
  // D-10, D-11: tables define their column names through synthetic definition rows.
  const userFunctions = userFunctionSet(rows, settings);
  const tables = rows.flatMap((row, k) =>
    row.columns === undefined ? [] : [{ k, table: parseTable(row, userFunctions) }]
  );
  const heads = new Set(parsed.flatMap((row) => declaredHead(row)?.name ?? []));
  // D-22, D-33: regressions fit what no row or table data column defines; a computed column may
  // name a regression's residual list, so headers over blank columns do not count as defined.
  const tableNames = tables.map(({ table }) => columnNames(table, heads));
  const dataNames = tables.flatMap(({ table }, i) =>
    tableNames[i].filter((n, j): n is string => n !== null && (j === 0 || hasCells(table, j)))
  );
  const plans = planRegressions(
    parsed,
    new Set([...heads, ...dataNames]),
    new Set(dataNames),
    settings
  );
  const fitted = [...plans.values()].flatMap((p) =>
    p.analysis === null ? [] : [...p.analysis.params, p.analysis.residual]
  );
  const external = new Set([...heads, ...fitted]);
  const names = tables.map(({ table }) => columnNames(table, external));
  const declared = new Set([...external, ...names.flat().filter((n): n is string => n !== null)]);
  const synthetic = tables.flatMap(({ table }, i) => syntheticRows(table, names[i], declared));
  const regressionRows = [...plans.values()].flatMap((p) =>
    p.analysis === null ? [] : regressionSyntheticRows(p.analysis)
  );
  const all = [...parsed, ...synthetic, ...regressionRows];
  const resolution = resolveDefinitions(all);
  const analysed = all.map((row) => classifyRow(row, resolution, settings));
  parsed.forEach((row, k) => {
    const plan = plans.get(row.source.id);
    if (plan !== undefined) analysed[k] = regressionRow(analysed[k], plan, row.source.hidden);
  });
  tables.forEach(({ k, table }, i) => {
    analysed[k] = tableRow(
      rows[k],
      analyzeTable(table, names[i], declared, resolution.duplicates),
      table
    );
  });
  const defining = new Set<string>(),
    functions = new Map<string, FunctionDefinition>();
  all.forEach(({ head }, k) => {
    const { id, kind, error } = analysed[k];
    if (head === null || error !== null || !DEFINING_KINDS.has(kind)) return;
    defining.add(id);
    if (kind === "definition" || functions.has(head.name)) return;
    const params = kind === "function-definition" ? head.params : [];
    functions.set(head.name, { name: head.name, params, body: head.body, rowId: id });
  });
  return {
    rows: analysed.slice(0, parsed.length),
    byId: new Map(analysed.map((row) => [row.id, row])),
    valueOrder: resolution.valueOrder.filter((id) => defining.has(id)),
    functions,
  };
}

/** Whether table column `j` holds any non-blank cell. */
function hasCells(table: ReturnType<typeof parseTable>, j: number): boolean {
  return table.cells[j].some((cell) => !cell.blank);
}

/** D-22, D-36: a regression row's analysis; it graphs y = M(x) when visible with one predictor. */
function regressionRow(row: RowAnalysis, plan: RegressionPlan, hidden: boolean): RowAnalysis {
  if (plan.analysis === null) return { ...row, kind: "error", error: plan.error };
  const curve = regressionCurve(plan.analysis);
  const isGraphable = curve !== null && !hidden;
  return {
    ...row,
    kind: "regression",
    chips: [],
    isGraphable,
    graph: isGraphable ? { kind: "explicit", independent: "x", expr: curve } : null,
    regression: plan.analysis,
  };
}

/** D-11: a table row's analysis; it graphs when visible with a later column that can plot. */
function tableRow(
  source: RowSource,
  table: TableAnalysis,
  parsed: ReturnType<typeof parseTable>
): RowAnalysis {
  const uses = new Set<string>();
  for (const cell of [...parsed.headers, ...parsed.cells.flat()]) {
    if (cell.tree !== null) for (const { name } of collectNameUses(cell.tree)) uses.add(name);
  }
  const plots = table.columns.some((c, j) => j > 0 && (c.role === "data" || c.role === "computed"));
  const isGraphable = plots && table.columns[0].role === "variable" && !source.hidden;
  return {
    id: source.id,
    kind: "table",
    tree: null,
    error: null,
    defines: null,
    uses: [...uses],
    chips: [],
    complexHint: false,
    isGraphable,
    relation: null,
    graph: isGraphable ? { kind: "table" } : null,
    table,
  };
}

/** The names of `functions` with parameters: the `userFunctions` for parsing helper LaTeX (PR-23). */
export function userFunctionNames(
  functions: ReadonlyMap<string, FunctionDefinition>
): ReadonlySet<string> {
  return new Set([...functions].flatMap(([name, f]) => (f.params.length > 0 ? [name] : [])));
}

/** NM-17, FN-16: the hint a real-mode row whose only undefined name is `i` shows. */
export const COMPLEX_HINT = {
  text: "Turn on complex mode to use i.",
  action: "Turn on complex mode",
} as const;
