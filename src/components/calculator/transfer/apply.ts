// The lazy transfer apply step (01-interfaces-integration.md section 14; c-transfer TR-71 to
// TR-73, AR-16): validates a payload with Zod, plans it against the current rows (plan.ts, and
// plan-table.ts and plan-points.ts for tables and point tables) and commits it as one undo step,
// then fits the view to added points none of which is visible (fit.ts, TR-39). No API method
// transfers (TR-71); the quiz host calls applyTransfer with its calculator.

import { z } from "zod";
import type { CalculatorEngine } from "@/lib/calculator/core/api/engine";
import { MAX_ROWS } from "@/lib/calculator/core/latex/index";
import { plainMath } from "@/lib/calculator-transfer/describe";
import {
  TRANSFER_MESSAGES,
  type TransferPayload,
  type TransferResult,
  type TransferTrigger,
} from "@/lib/calculator-transfer/payload";
import { planTransfer } from "./plan";
import { constantValue, fitAddedPoints, pointValue, tablePoints } from "./fit";
import { planTable } from "./plan-table";
import { planPointRows, pointTables, sourceTables } from "./plan-points";

type RowsEditor = Pick<CalculatorEngine, "editRows">;

/**
 * The public API members apply uses, plus one internal channel: a point-table append goes through
 * `editRows` (the quiz host's KarmanCalculator reaches it as `engine`; a bare engine is its own),
 * because setExpressions' column shape (API-2) would drop the table's D-12 column styles.
 */
export type TransferTarget = Pick<
  CalculatorEngine,
  | "getExpressions"
  | "setExpressions"
  | "updateSettings"
  | "focusExpression"
  | "activateExpression"
  | "settings"
  | "graphpaperBounds"
  | "setMathBounds"
> &
  ({ readonly engine: RowsEditor } | RowsEditor);

const editorOf = (target: TransferTarget): RowsEditor =>
  "engine" in target ? target.engine : target;

/** AR-16: the payload shape, verbatim; unknown keys are refused. */
export const transferPayloadSchema: z.ZodType<TransferPayload> = z
  .object({
    version: z.literal(1),
    questionKey: z.string().min(1),
    sourceId: z.string().min(1),
    description: z.string(),
    format: z.enum(["rows", "point", "tableRow", "evaluate", "table"]),
    dependencies: z.array(z.string()).max(MAX_ROWS),
    rows: z.array(z.string()).max(MAX_ROWS).optional(),
    table: z
      .object({ headers: z.array(z.string().nullable()), columns: z.array(z.array(z.string())) })
      .strict()
      .optional(),
    pairs: z.array(z.tuple([z.string(), z.string()])).optional(),
    pointTableKey: z.string().optional(),
  })
  .strict();

type ApplyResult = Extract<
  TransferResult,
  { status: "added" | "renamed" | "already-present" | "rejected" }
>;

const REJECTED: ApplyResult = {
  status: "rejected",
  message: TRANSFER_MESSAGES.rejected,
  focusRowId: null,
};

/** What apply.ts commits: one undo step (`write`), then the focus and the TR-39 view fit. */
type Commit =
  | { status: "rejected" }
  | { status: "already-present"; focusRowId: string; message: string }
  | {
      status: "added" | "renamed";
      write(): void;
      focusRowId: string;
      message: string;
      points: [number, number][]; // the points it adds (TR-39, D-17)
    };

const settingsOf = (target: TransferTarget) => {
  const { angleMode, complex } = target.settings;
  return { angleMode, complex };
};

/** The rows payload's plan (TR-26 to TR-37); "point" rows must each be a point `(a,b)` (TR-29). */
function rowsCommit(target: TransferTarget, payload: TransferPayload): Commit {
  const points = payload.format === "point" ? (payload.rows ?? []).map(pointValue) : [];
  if (points.some((p) => p === null)) return { status: "rejected" };
  const plan = planTransfer({
    existing: target.getExpressions(),
    payload: payload.format === "point" ? { ...payload, format: "rows" } : payload,
    settings: settingsOf(target),
  });
  if (plan.status === "rejected") return plan;
  if (plan.status === "already-present")
    return { ...plan, message: TRANSFER_MESSAGES.alreadyPresent(plan.row) };
  const message =
    plan.status === "renamed" && plan.rename !== null
      ? TRANSFER_MESSAGES.renamed(plainMath(plan.rename.to), plainMath(plan.rename.from))
      : TRANSFER_MESSAGES.added(payload.description);
  const written = new Set(plan.writes.map((w) => w.latex));
  return {
    status: plan.status,
    write: () => target.setExpressions(plan.writes),
    focusRowId: plan.focusRowId,
    message,
    points: (payload.rows ?? []).flatMap((row, k) => {
      const p = points[k];
      return p && written.has(row) ? [p] : [];
    }),
  };
}

/** The table payload's plan (TR-25), or the table this source already added (TR-35). */
function tableCommit(target: TransferTarget, payload: TransferPayload): Commit {
  const table = payload.table;
  if (table === undefined) return { status: "rejected" };
  const existing = target.getExpressions();
  const sources = sourceTables(target);
  const earlier = existing.find((r) => r.id === sources.get(payload.sourceId));
  const columns = earlier?.type === "table" ? (earlier.columns ?? []) : [];
  if (
    columns.length === table.columns.length &&
    columns.every((c, k) => c.values.join("\u0000") === table.columns[k].join("\u0000"))
  ) {
    const row = existing.findIndex((r) => r.id === earlier?.id) + 1;
    return {
      status: "already-present",
      focusRowId: existing[row - 1].id,
      message: TRANSFER_MESSAGES.alreadyPresent(row),
    };
  }
  const plan = planTable(existing, table, settingsOf(target));
  if (plan.status === "rejected") return plan;
  return {
    ...plan,
    write: () => {
      target.setExpressions([plan.write]);
      sources.set(payload.sourceId, plan.focusRowId);
    },
    points: tablePoints(table.columns),
  };
}

/** TR-34: Table row pairs to their source's point table, appended as one undo step. */
function pointRowsCommit(target: TransferTarget, payload: TransferPayload): Commit {
  const { pairs, pointTableKey } = payload;
  if (pairs === undefined || pointTableKey === undefined) return { status: "rejected" };
  const values = pairs.map(([x, y]) => [constantValue(x), constantValue(y)]);
  if (values.some(([x, y]) => x === null || y === null)) return { status: "rejected" };
  const tables = pointTables(target);
  const plan = planPointRows(
    target.getExpressions(),
    tables,
    pointTableKey,
    pairs,
    settingsOf(target)
  );
  if (plan.status !== "added") return plan;
  return {
    status: "added",
    focusRowId: plan.focusRowId,
    message: plan.message,
    points: plan.added.flatMap(([x, y]) => {
      const p = [constantValue(x), constantValue(y)];
      return p[0] === null || p[1] === null ? [] : [[p[0], p[1]] as [number, number]];
    }),
    write: () => {
      if (plan.kind === "create") target.setExpressions([plan.write]);
      else appendRows(editorOf(target), plan.table.id, plan.added);
      tables.set(pointTableKey, plan.table);
    },
  };
}

/** Appends pairs to a two-column table in one editRows step, so its column styles stay. */
function appendRows(editor: RowsEditor, id: string, added: readonly [string, string][]): void {
  editor.editRows((rows) =>
    rows.map((row) =>
      row.id !== id || row.columns === undefined
        ? row
        : {
            ...row,
            columns: row.columns.map((c, k) => ({
              ...c,
              values: [...c.values, ...added.map((p) => p[k])],
            })),
          }
    )
  );
}

/**
 * An id freed by undo or delete is handed out again (TR-32, D-4), so a registered table whose row
 * is gone is forgotten before a transfer can mistake its successor for it (TR-34, TR-35).
 */
function forgetMissingTables(target: TransferTarget): void {
  const ids = new Set(target.getExpressions().map((r) => r.id));
  const tables = pointTables(target);
  for (const [key, t] of tables) if (!ids.has(t.id)) tables.delete(key);
  const sources = sourceTables(target);
  for (const [key, id] of sources) if (!ids.has(id)) sources.delete(key);
}

function plan(target: TransferTarget, payload: TransferPayload): Commit {
  forgetMissingTables(target);
  switch (payload.format) {
    case "table":
      return tableCommit(target, payload);
    case "tableRow":
      return pointRowsCommit(target, payload);
    case "rows":
    case "point":
      return rowsCommit(target, payload);
    default:
      return { status: "rejected" }; // "evaluate" waits for TR-31
  }
}

/**
 * TR-71 to TR-73: nothing changes unless the payload is valid and the prospective list passes
 * the core check; then one undo step (TR-38), the list expanded (TR-32), the focus row focused
 * ("mouse", "keyboard") or activated ("touch", TR-66), and the view fitted to added points that
 * are all outside it (TR-39, D-17).
 */
export function applyTransfer(
  target: TransferTarget,
  payload: unknown,
  trigger: TransferTrigger
): ApplyResult {
  const parsed = transferPayloadSchema.safeParse(payload);
  if (!parsed.success) return REJECTED;
  let commit: Commit;
  try {
    commit = plan(target, parsed.data);
  } catch {
    return REJECTED;
  }
  if (commit.status === "rejected") return REJECTED;
  try {
    if (commit.status !== "already-present") commit.write();
    if (target.settings.expressionsCollapsed)
      target.updateSettings({ expressionsCollapsed: false });
  } catch {
    return REJECTED;
  }
  try {
    if (commit.status !== "already-present") fitAddedPoints(target, commit.points);
  } catch {
    // The rows are committed; the view stays where it was.
  }
  try {
    if (trigger === "touch") target.activateExpression(commit.focusRowId);
    else target.focusExpression(commit.focusRowId);
  } catch {
    // The rows are committed; a focus failure (the row left the list meanwhile) changes nothing.
  }
  return { status: commit.status, message: commit.message, focusRowId: commit.focusRowId };
}
