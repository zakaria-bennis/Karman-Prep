// TR-73: a transfer the calculator's core check rejected is reported with only the question id and
// the accepting rule ID. The Sentry send loads on the first report (transfer-report-send.ts), as
// report-error.ts's does, so Sentry stays off the quiz routes' eager graph (AR-33). Only results the
// bridge's drain marked are reportable; stale keys, thrown applies and bridge-only statuses are not.
import type { TransferResult } from "@/lib/calculator-transfer/payload";

const marked = new WeakSet<TransferResult>();

/** Marks `result` as a core-check rejection without adding a field; returns it. */
export function markCoreRejection(result: TransferResult): TransferResult {
  marked.add(result);
  return result;
}

/** True only for a result `markCoreRejection` marked. */
export function isCoreRejection(result: TransferResult): boolean {
  return marked.has(result);
}

/** Sends "calculator-transfer-rejected" tagged { questionId, ruleId }; nothing else. Never throws. */
export function reportTransferRejection(questionId: string, ruleId: string): void {
  void import("./transfer-report-send")
    .then((m) => m.sendTransferRejection(questionId, ruleId))
    .catch(() => {});
}
