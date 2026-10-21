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
import { collectNameUses, isReservedName } from "./names";

export interface DefinitionHead {
  name: string;
  type: "value" | "function";
  params: string[];
  body: Node;
  span: SourceSpan; // the defined side: the head call, or the name
  // a reserved name written as a function head, `y(x)=x`: Desmos graphs the body as a function
  // but the name stays what it was, so the head defines nothing other rows can use
  anonymous?: boolean;
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
 * The name a function-definition row's own function is compiled under when other rows cannot
 * reach it by its name (defined twice, or anonymous): no typed name holds its `#`.
 */
export function rowFunctionName(rowId: string): string {
  return `#row:${rowId}`;
}

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
  if (row.head?.anonymous === true) return null;
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
    const { feature, names, span } = parsed.error;
    // complex-number built-ins are Desmos's complex-mode error only in real mode; in complex mode
    // they have not shipped
    const code =
      parsed.error.code === "complex-only" && settings.complex ? "unsupported" : parsed.error.code;
    const named = names ?? (feature === undefined ? [] : [feature]);
    const shown = code === "function-undefined" ? named.map(displayName) : named;
    return { ...row, error: rowError(code, shown, span) };
  }
  const tree = parsed.tree;
  if (scanned !== null && isReservedName(scanned.name, settings)) {
    return { ...row, tree, ...anonymousHead(tree, scanned) };
  }
  return { ...row, tree, ...readHead(tree, scanned, settings) };
}

/**
 * A reserved name written as a function head, `y(x)=x` or `x(t)=t^{2}`: Desmos graphs the right
 * side as a function of its parameter, as it does `f(x)=x`, while the name keeps its meaning
 * (captured 2026-10-20), so the head is anonymous.
 */
function anonymousHead(tree: Node, scanned: { name: string; params: string[] }) {
  if (tree.kind !== "rel" || tree.ops.length !== 1 || tree.ops[0] !== "=") {
    return { head: null, error: null };
  }
  const [left, body] = tree.operands;
  const head: DefinitionHead = {
    name: scanned.name,
    type: "function",
    params: scanned.params,
    body,
    span: left.span,
    anonymous: true,
  };
  const repeated = scanned.params.find((p, k) => scanned.params.indexOf(p) !== k);
  const error =
    repeated === undefined ? null : rowError("repeated-parameter", [displayName(repeated)], null);
  return { head, error };
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
    // Desmos: "You can't use 'e' as a parameter of this function because 'e' is already
    // defined.", for e, π and τ, before "Cannot use 'x' for multiple parameters of this
    // function." (captured 2026-10-20)
    const constant = params.find((p) => p === "e" || p === "pi" || p === "tau");
    if (constant !== undefined) {
      return { head, error: rowError("parameter-defined", [displayName(constant)], null) };
    }
    const names = repeated === undefined ? null : [displayName(repeated)];
    if (names !== null) return { head, error: rowError("repeated-parameter", names, null) };
    // Desmos: `f(x)=y` is "Try including 'y' as an argument by defining the function as
    // 'f(x,y)'." (captured 2026-10-20)
    const used = new Set(collectNameUses(body).map(({ name }) => name));
    const free = ["x", "y"].find((c) => used.has(c) && !params.includes(c));
    if (free === undefined) return { head, error: null };
    const signature = `${displayName(left.name)}(${[...params, free].map(displayName).join(",")})`;
    return { head, error: rowError("function-coordinate", [free, signature], null) };
  }
  // Desmos reads `e=1`, `\pi=3` and `\infty=1` as equations of constants, with no error and
  // nothing drawn (captured 2026-10-20)
  if (left.kind === "const") return { head: null, error: null };
  if (left.kind !== "id" || left.name === "x" || left.name === "y")
    return { head: null, error: null };
  if (left.name === "r" || left.name === "\\theta") {
    return { head: null, error: rowError("unsupported", [displayName(left.name)], left.span) };
  }
  // Desmos reads `a=a+1` as an equation, not a definition: "We only support implicit equations
  // of x and y." (captured 2026-10-20)
  if (collectNameUses(body).some(({ name }) => name === left.name)) {
    return { head: null, error: rowError("implicit-variables", [], null) };
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
