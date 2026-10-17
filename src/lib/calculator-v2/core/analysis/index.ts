// Row analysis API (01-interfaces.md section 3). Pure TypeScript: no DOM (AR-44).

import type { RowErrorCode, RowKind } from "../corpus/types";
import type { InequalityOp, Node, RelOp, SourceSpan } from "../latex/ast";
import { classifyRow } from "./classify";
import { parseRows } from "./definitions";
import { resolveDefinitions } from "./resolve";

export { rowErrorMessage } from "./messages";

export interface AnalysisSettings {
  angleMode: "radians" | "degrees";
  complex: boolean;
}
export interface RowSource {
  id: string;
  latex: string;
  hidden: boolean;
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
  | { kind: "point" }; // coordinates come from the row's value
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
 * across all rows in any order (RC-9), then RC-2's classification of each row.
 */
export function analyzeRows(
  rows: readonly RowSource[],
  settings: AnalysisSettings
): AnalysisResult {
  const parsed = parseRows(rows, settings),
    resolution = resolveDefinitions(parsed);
  const analysed = parsed.map((row) => classifyRow(row, resolution, settings));
  const valueOrder: string[] = [],
    functions = new Map<string, FunctionDefinition>();
  parsed.forEach(({ head }, k) => {
    const { id, kind, error } = analysed[k];
    if (head === null || error !== null || !DEFINING_KINDS.has(kind)) return;
    valueOrder.push(id);
    if (kind === "definition" || functions.has(head.name)) return;
    const params = kind === "function-definition" ? head.params : [];
    functions.set(head.name, { name: head.name, params, body: head.body, rowId: id });
  });
  return {
    rows: analysed,
    byId: new Map(analysed.map((row) => [row.id, row])),
    valueOrder,
    functions,
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
