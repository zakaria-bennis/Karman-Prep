// AR-57: the Sentry send for calculator errors. report-error.ts loads this module on its first
// report, so Sentry stays off the quiz routes' eager graph (AR-33). A static named import keeps
// Sentry tree-shakable for every other importer.
import { captureException } from "@sentry/nextjs";

/** Sends an already sanitised error with the calculator tags. */
export function sendCalculatorError(error: Error, tags: { calculator: "v2"; build: string }): void {
  captureException(error, { tags });
}
