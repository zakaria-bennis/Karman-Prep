// Row parsing for analysis: the PR-23 function pre-scan, one parse per row and the definition
// heads of RC-4 and RC-6 with their head errors. Pure TypeScript: no DOM (AR-44).

import type { RowErrorCode } from "../corpus/types";
import type { Node, SourceSpan } from "../latex/ast";
import {
  functionDefinitionHead,
  MAX_FUNCTION_PARAMS,
  normalizeLatex,
  parseLatex,
} from "../latex/index";
import type { AnalysisSettings, RowAnalysis, RowError, RowSource } from "./index";
import { displayName, rowErrorMessage } from "./messages";
import { isReservedName } from "./names";

export interface DefinitionHead {
  name: string;
  type: "value" | "function";
  params: string[];
  body: Node;
  span: SourceSpan; // the defined side: the head call, or the name
}
export interface ParsedRow {
  source: RowSource;
  empty: boolean;
  tree: Node | null;
  error: RowError | null; // a parse error or a head error
  head: DefinitionHead | null;
}

type PreScan = { name: string; params: string[] } | null;

/**
 * Parses every row once. The function heads of all rows are pre-scanned first (PR-23), so a call
 * to a function defined in any row parses as a call; a reserved head name stays out of that set
 * and its row reads as a product (RC-3, RC-4).
 */
export function parseRows(rows: readonly RowSource[], settings: AnalysisSettings): ParsedRow[] {
  const scanned = rows.map((row) => functionDefinitionHead(row.latex));
  const userFunctions = userFunctionSet(rows, settings);
  return rows.map((source, k) => parseRow(source, scanned[k], userFunctions, settings));
}

/** PR-23: the names every row's function head defines, reserved names excepted. */
export function userFunctionSet(
  rows: readonly RowSource[],
  settings: AnalysisSettings
): Set<string> {
  return new Set(
    rows.flatMap((row) => {
      const head = functionDefinitionHead(row.latex);
      return head !== null && !isReservedName(head.name, settings) ? [head.name] : [];
    })
  );
}

/**
 * What a row defines, with or without an error: its head, else, for a row whose
 * error left no head (too many parameters, a parse error, a reserved function name), the head the
 * PR-23 pre-scan reads from its source.
 */
export function declaredHead(row: ParsedRow): RowAnalysis["defines"] {
  if (row.head !== null) {
    return { name: row.head.name, type: row.head.type, params: [...row.head.params] };
  }
  const scanned = row.error === null ? null : functionDefinitionHead(row.source.latex);
  return scanned === null ? null : { name: scanned.name, type: "function", params: scanned.params };
}

function parseRow(
  source: RowSource,
  scanned: PreScan,
  userFunctions: ReadonlySet<string>,
  settings: AnalysisSettings
): ParsedRow {
  const row: ParsedRow = { source, empty: false, tree: null, error: null, head: null };
  if (normalizeLatex(source.latex).trim() === "") return { ...row, empty: true };
  if (scanned !== null && scanned.params.length > MAX_FUNCTION_PARAMS) {
    return { ...row, error: rowError("too-many-params", [], null) };
  }
  const parsed = parseLatex(source.latex, { userFunctions });
  if (!parsed.ok) {
    const { code, feature, names, span } = parsed.error;
    const shown = names ?? (feature === undefined ? [] : [feature]);
    return { ...row, error: rowError(code, shown, span) };
  }
  const tree = parsed.tree;
  if (scanned !== null && isReservedName(scanned.name, settings)) {
    return { ...row, tree, error: rowError("reserved-name", [displayName(scanned.name)], null) };
  }
  return { ...row, tree, ...readHead(tree, scanned, settings) };
}

/** RC-2's definition rules: a function head (RC-4), then a name head (RC-6, RC-19). */
function readHead(
  tree: Node,
  scanned: PreScan,
  settings: AnalysisSettings
): Pick<ParsedRow, "head" | "error"> {
  if (tree.kind !== "rel" || tree.ops.length !== 1 || tree.ops[0] !== "=") {
    return { head: null, error: null };
  }
  const [left, body] = tree.operands;
  if (left.kind === "call" && scanned !== null && left.name === scanned.name) {
    const params = scanned.params,
      repeated = params.find((p, k) => params.indexOf(p) !== k);
    const head: DefinitionHead = {
      name: left.name,
      type: "function",
      params,
      body,
      span: left.span,
    };
    const names = repeated === undefined ? null : [displayName(repeated)];
    return { head, error: names === null ? null : rowError("duplicate-definition", names, null) };
  }
  if (left.kind === "const") {
    const head = valueHead(left.name, body, left.span);
    return { head, error: rowError("reserved-name", [displayName(left.name)], null) };
  }
  if (left.kind !== "id" || left.name === "x" || left.name === "y")
    return { head: null, error: null };
  if (left.name === "r" || left.name === "\\theta") {
    return { head: null, error: rowError("unsupported", [displayName(left.name)], left.span) };
  }
  const head = valueHead(left.name, body, left.span);
  if (!isReservedName(left.name, settings)) return { head, error: null };
  return { head, error: rowError("reserved-name", [displayName(left.name)], null) };
}

function valueHead(name: string, body: Node, span: SourceSpan): DefinitionHead {
  return { name, type: "value", params: [], body, span };
}

function rowError(code: RowErrorCode, names: string[], span: SourceSpan | null): RowError {
  return { code, message: rowErrorMessage(code, names), names, span };
}
