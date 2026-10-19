// TR-73: the Sentry send for rejected transfers, loaded by transfer-report.ts on its first report
// so Sentry stays off the quiz routes' eager graph (AR-33).
import { captureException } from "@sentry/nextjs";

export function sendTransferRejection(questionId: string, ruleId: string): void {
  captureException(new Error("calculator-transfer-rejected"), { tags: { questionId, ruleId } });
}
