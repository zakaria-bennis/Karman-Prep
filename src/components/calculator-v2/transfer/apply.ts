// The lazy transfer apply step (01-interfaces-integration.md section 14; c-transfer TR-71 to
// TR-73, AR-16): validates a payload with Zod, plans it against the current rows (plan.ts) and
// commits it with one setExpressions call, through public API members only. No API method
// transfers (TR-71); the quiz host calls applyTransfer with its calculator's engine.

import { z } from "zod";
import type { CalculatorEngine } from "@/lib/calculator-v2/core/api/engine";
import { MAX_ROWS } from "@/lib/calculator-v2/core/latex/index";
import { plainMath } from "@/lib/calculator-transfer/describe";
import {
  TRANSFER_MESSAGES,
  type TransferPayload,
  type TransferResult,
  type TransferTrigger,
} from "@/lib/calculator-transfer/payload";
import { planTransfer } from "./plan";

export type TransferTarget = Pick<
  CalculatorEngine,
  | "getExpressions"
  | "setExpressions"
  | "updateSettings"
  | "focusExpression"
  | "activateExpression"
  | "settings"
>;

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

/**
 * TR-71 to TR-73: nothing changes unless the payload is valid and the prospective list passes
 * the core check; then one setExpressions (one undo step, TR-38), the list expanded (TR-32) and
 * the focus row focused ("mouse", "keyboard") or activated ("touch", TR-66).
 */
export function applyTransfer(
  target: TransferTarget,
  payload: unknown,
  trigger: TransferTrigger
): ApplyResult {
  const parsed = transferPayloadSchema.safeParse(payload);
  if (!parsed.success) return REJECTED;
  const valid = parsed.data;
  let plan;
  try {
    const { angleMode, complex } = target.settings;
    plan = planTransfer({
      existing: target.getExpressions(),
      payload: valid,
      settings: { angleMode, complex },
    });
  } catch {
    return REJECTED;
  }
  if (plan.status === "rejected") return REJECTED;
  try {
    if (plan.status !== "already-present") target.setExpressions(plan.writes);
    if (target.settings.expressionsCollapsed)
      target.updateSettings({ expressionsCollapsed: false });
  } catch {
    return REJECTED;
  }
  try {
    if (trigger === "touch") target.activateExpression(plan.focusRowId);
    else target.focusExpression(plan.focusRowId);
  } catch {
    // The rows are committed; a focus failure (the row left the list meanwhile) changes nothing.
  }
  if (plan.status === "already-present") {
    return {
      status: plan.status,
      message: TRANSFER_MESSAGES.alreadyPresent(plan.row),
      focusRowId: plan.focusRowId,
    };
  }
  const message =
    plan.status === "renamed" && plan.rename !== null
      ? TRANSFER_MESSAGES.renamed(plainMath(plan.rename.to), plainMath(plan.rename.from))
      : TRANSFER_MESSAGES.added(valid.description);
  return { status: plan.status, message, focusRowId: plan.focusRowId };
}
