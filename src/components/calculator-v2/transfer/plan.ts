// The transfer plan (12 Decision 11; c-transfer TR-27, TR-32, TR-73): which rows a payload writes,
// under which ids, and whether the prospective list passes the core check. Pure: it reads the
// existing rows and analyses them with the v2 core, and changes nothing (apply.ts commits).

import {
  analyzeRows,
  type AnalysisResult,
  type AnalysisSettings,
  type RowSource,
} from "@/lib/calculator-v2/core/analysis/index";
import type { ExpressionState } from "@/lib/calculator-v2/core/api/types";
import { MAX_ROW_CHARACTERS, MAX_ROWS } from "@/lib/calculator-v2/core/latex/index";
import type { TransferPayload } from "@/lib/calculator-transfer/payload";

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

export function planTransfer(input: PlanInput): TransferPlan {
  const { existing, payload, settings } = input;
  const rows = payload.rows ?? [];
  if (payload.format !== "rows" || rows.length === 0) return REJECTED; // TR-77: Phase 1 sends rows
  const latex = [...payload.dependencies, ...rows];
  const writes = assignIds(existing, latex);
  const focus = writes[payload.dependencies.length];
  if (focus === undefined) return REJECTED;
  if (!passesCoreCheck(existing, writes, settings)) return REJECTED;
  return { status: "added", writes, focusRowId: focus.id, rename: null };
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
