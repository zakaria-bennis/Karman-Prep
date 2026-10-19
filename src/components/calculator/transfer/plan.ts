// The transfer plan (12 Decisions 10 and 11; c-transfer TR-27, TR-32, TR-35 to TR-37, TR-72,
// TR-73): which rows a payload writes, under which ids and names, and whether the prospective list
// passes the core check. Pure: it reads the existing rows and analyses them with the calculator core, and
// changes nothing (apply.ts commits). Table columns, regression parameters and residual lists are
// definitions too: analyzeRows reports them as synthetic defining rows in `byId`.

import {
  analyzeRows,
  type AnalysisResult,
  type AnalysisSettings,
  type RowSource,
} from "@/lib/calculator/core/analysis/index";
import type { ExpressionState } from "@/lib/calculator/core/api/types";
import {
  functionDefinitionHead,
  MAX_ROW_CHARACTERS,
  MAX_ROWS,
  parseLatex,
  printLatex,
} from "@/lib/calculator/core/latex/index";
import type { TransferPayload } from "@/lib/calculator-transfer/payload";
import { nameBase, renameName } from "./rename";

export interface PlanInput {
  existing: readonly ExpressionState[];
  payload: TransferPayload;
  settings: AnalysisSettings;
}
export type TransferPlan =
  | { status: "rejected" }
  | { status: "already-present"; focusRowId: string; row: number } // row: 1-based position
  | {
      status: "added" | "renamed";
      writes: { id: string; latex: string }[];
      focusRowId: string;
      rename: { from: string; to: string } | null;
    };

const REJECTED: TransferPlan = { status: "rejected" };
const DECIMAL_ID = /^[1-9][0-9]*$/;
const NOT_DEFINED_BY_NAME: ReadonlySet<string> = new Set(["x", "y", "r", "\\theta"]);

/** `userFunctions` plus the function head `latex` itself declares, as RC-4's pre-scan reads it. */
function withOwnHead(latex: string, userFunctions: ReadonlySet<string>): ReadonlySet<string> {
  const head = functionDefinitionHead(latex);
  return head === null ? userFunctions : new Set([...userFunctions, head.name]);
}

/** TR-35: printLatex of the parse (PR-37), or null when the row does not parse. */
export function canonicalLatex(latex: string, userFunctions: ReadonlySet<string>): string | null {
  const parsed = parseLatex(latex, { userFunctions: withOwnHead(latex, userFunctions) });
  return parsed.ok ? printLatex(parsed.tree) : null;
}

/** The name a row defines: an RC-4 function head or an RC-6 name (never x, y, r or \theta). */
export function definedName(latex: string, userFunctions: ReadonlySet<string>): string | null {
  const head = functionDefinitionHead(latex);
  const parsed = parseLatex(latex, { userFunctions: withOwnHead(latex, userFunctions) });
  if (!parsed.ok) return null;
  const tree = parsed.tree;
  if (tree.kind !== "rel" || tree.ops.length !== 1 || tree.ops[0] !== "=") return null;
  const left = tree.operands[0];
  if (left.kind === "call" && head !== null && left.name === head.name) return head.name;
  return left.kind === "id" && !NOT_DEFINED_BY_NAME.has(left.name) ? left.name : null;
}

/** Decision 10's view of the calculator: used names, and each defined name's canonical rows. */
interface ExistingNames {
  used: Set<string>;
  definitions: Map<string, (string | null)[]>; // null: a table column or a regression's fit
  functions: Set<string>;
}

function existingNames(
  existing: readonly ExpressionState[],
  analysis: AnalysisResult,
  payloadFunctions: readonly string[]
): ExistingNames {
  const used = new Set<string>();
  const functions = new Set<string>(payloadFunctions);
  for (const row of analysis.byId.values()) {
    if (row.defines !== null) used.add(row.defines.name);
    if (row.defines?.type === "function") functions.add(row.defines.name);
    for (const name of row.uses) used.add(name);
  }
  for (const row of existing) for (const c of row.columns ?? []) used.add(c.latex);
  const latexById = new Map(existing.map((r) => [r.id, r.type === "table" ? null : r.latex]));
  const definitions = new Map<string, (string | null)[]>();
  for (const row of analysis.byId.values()) {
    if (row.defines === null) continue;
    const latex = latexById.get(row.id) ?? null;
    const canonical = latex === null ? null : canonicalLatex(latex, functions);
    definitions.set(row.defines.name, [...(definitions.get(row.defines.name) ?? []), canonical]);
  }
  return { used, definitions, functions };
}

function renameAll(latex: string, renames: ReadonlyMap<string, string>): string | null {
  let out: string | null = latex;
  for (const [from, to] of renames) if (out !== null) out = renameName(out, from, to);
  return out;
}

/**
 * TR-36: each row definition of a name the calculator defines with other canonical LaTeX is
 * renamed to the lowest unused `b_{n}` (n >= 2) this transfer does not write, unless an existing
 * `b_{n}` definition equals the renamed row (then the row is its duplicate). Null on a lex failure.
 */
function chooseRenames(
  rows: readonly string[],
  names: ExistingNames,
  taken: Set<string>
): Map<string, string> | null {
  const renames = new Map<string, string>();
  for (const row of rows) {
    const name = definedName(row, names.functions);
    const defs = name === null ? undefined : names.definitions.get(name);
    if (name === null || defs === undefined || renames.has(name)) continue;
    const current = renameAll(row, renames);
    if (current === null) return null;
    const canonical = canonicalLatex(current, names.functions);
    if (canonical !== null && defs.includes(canonical)) continue; // TR-35 handles the duplicate
    let chosen: string | null = null;
    for (let n = 2; chosen === null && n <= taken.size + 2; n++) {
      const to = `${nameBase(name)}_{${n}}`;
      const renamed = renameName(current, name, to);
      if (renamed === null) return null;
      const twin = canonicalLatex(renamed, names.functions);
      if (twin !== null && names.definitions.get(to)?.includes(twin)) chosen = to;
      else if (!taken.has(to)) chosen = to;
    }
    if (chosen === null) return null;
    renames.set(name, chosen);
    taken.add(chosen);
  }
  return renames;
}

type Match = { existing: string } | { write: number } | null;

export function planTransfer(input: PlanInput): TransferPlan {
  const { existing, payload, settings } = input;
  const rows = payload.rows ?? [];
  if (payload.format !== "rows" || rows.length === 0) return REJECTED; // TR-77: Phase 1 sends rows
  const heads = [...payload.dependencies, ...rows].flatMap((l) => functionDefinitionHead(l) ?? []);
  const names = existingNames(
    existing,
    analyse(existing, settings),
    heads.map((h) => h.name)
  );
  // TR-37: a dependency is written only when no existing row defines or uses its name.
  const dependencies = payload.dependencies.filter((latex) => {
    const name = definedName(latex, names.functions);
    return name === null || !names.used.has(name);
  });
  const taken = new Set(names.used);
  for (const latex of [...dependencies, ...rows]) {
    const name = definedName(latex, names.functions);
    if (name !== null) taken.add(name);
  }
  const renames = chooseRenames(rows, names, taken);
  if (renames === null) return REJECTED;
  const renamedRows: string[] = [];
  for (const row of rows) {
    const renamed = renameAll(row, renames);
    if (renamed === null) return REJECTED;
    renamedRows.push(renamed);
  }
  const functions = new Set(names.functions);
  for (const latex of renamedRows) {
    const head = functionDefinitionHead(latex);
    if (head !== null) functions.add(head.name);
  }
  // TR-35: a row equal to an existing row or an earlier written row is not written again.
  const existingCanonical = new Map<string, string>();
  for (const row of existing) {
    const canonical = row.type === "table" ? null : canonicalLatex(row.latex ?? "", functions);
    if (canonical !== null && !existingCanonical.has(canonical))
      existingCanonical.set(canonical, row.id);
  }
  const candidates = [...dependencies, ...renamedRows];
  const written: string[] = [];
  const writtenCanonical = new Map<string, number>();
  const matches: Match[] = candidates.map((latex) => {
    const canonical = canonicalLatex(latex, functions);
    const id = canonical === null ? undefined : existingCanonical.get(canonical);
    if (id !== undefined) return { existing: id };
    const earlier = canonical === null ? undefined : writtenCanonical.get(canonical);
    if (earlier !== undefined) return { write: earlier };
    if (canonical !== null) writtenCanonical.set(canonical, written.length);
    written.push(latex);
    return null;
  });
  const rowMatches = matches.slice(dependencies.length);
  const first = rowMatches[0];
  if (rowMatches.every((m) => m !== null && "existing" in m) && first && "existing" in first) {
    const row = existing.findIndex((r) => r.id === first.existing) + 1;
    return { status: "already-present", focusRowId: first.existing, row };
  }
  const writes = assignIds(existing, written);
  const focusRowId =
    first === null
      ? writes[matches.slice(0, dependencies.length).filter((m) => m === null).length]?.id
      : "existing" in first
        ? first.existing
        : writes[first.write]?.id;
  if (focusRowId === undefined) return REJECTED;
  if (!passesCoreCheck(existing, writes, settings)) return REJECTED;
  const [rename] = renames;
  return rename === undefined
    ? { status: "added", writes, focusRowId, rename: null }
    : { status: "renamed", writes, focusRowId, rename: { from: rename[0], to: rename[1] } };
}

/**
 * Decision 11 (OI-22): new ids continue the decimal sequence above the largest decimal id present;
 * the first write reuses the last row's id when that row is an expression row with blank latex.
 */
export function assignIds(
  existing: readonly ExpressionState[],
  latex: readonly string[]
): { id: string; latex: string }[] {
  let next = 1 + Math.max(0, ...existing.flatMap((r) => (DECIMAL_ID.test(r.id) ? [+r.id] : [])));
  const last = existing.at(-1);
  const reuse = last !== undefined && isBlankExpression(last) ? last.id : null;
  return latex.map((text, k) => ({
    id: k === 0 && reuse !== null ? reuse : String(next++),
    latex: text,
  }));
}

function isBlankExpression(row: ExpressionState): boolean {
  return row.type !== "table" && (row.latex ?? "").trim() === "";
}

/**
 * TR-73, NM-42: the prospective list stays within MAX_ROWS, every written row within
 * MAX_ROW_CHARACTERS and free of errors, and no existing row without an error gains one.
 */
export function passesCoreCheck(
  existing: readonly ExpressionState[],
  writes: readonly { id: string; latex: string }[],
  settings: AnalysisSettings
): boolean {
  if (writes.some((w) => w.latex.length > MAX_ROW_CHARACTERS)) return false;
  const written = new Map(writes.map((w) => [w.id, w.latex]));
  const prospective: ExpressionState[] = existing.map((row) => {
    const latex = written.get(row.id);
    return latex === undefined ? row : { ...row, latex };
  });
  const known = new Set(existing.map((row) => row.id));
  for (const w of writes) if (!known.has(w.id)) prospective.push({ id: w.id, latex: w.latex });
  if (prospective.length > MAX_ROWS) return false;
  const before = analyse(existing, settings);
  const after = analyse(prospective, settings);
  return after.rows.every((row) => {
    if (row.error === null) return true;
    if (written.has(row.id)) return false;
    return (before.byId.get(row.id)?.error ?? null) !== null; // an error it already had never blocks
  });
}

/** The engine's own analysis sources (engine.ts analyze()): tables carry their columns. */
export function analyse(
  rows: readonly ExpressionState[],
  settings: AnalysisSettings
): AnalysisResult {
  const sources: RowSource[] = rows.map((row) => {
    const base = { id: row.id, latex: row.latex ?? "", hidden: row.hidden ?? false };
    return row.type === "table" ? { ...base, latex: "", columns: row.columns ?? [] } : base;
  });
  return analyzeRows(sources, settings);
}
