#!/usr/bin/env -S npx tsx
// Test helper for the Python end-to-end figure test: the rows the app's reviewed
// importer would write for synthetic reviewed rows, through the same code as
// ts/stage-rows.ts minus its frozen-manifest and PDF-byte checks (synthetic rows
// have neither). Never touches a database.
//
// Usage: npx tsx scripts/import-tools/tests/ts/record-rows.ts <reviewed.json> <source_pdf> <source_version>
// Prints {"reviewed_json_sha256", "source_pdf_sha256", "rows": [...]} like stage-rows.ts.

import { readFileSync } from "node:fs";
import { recordReviewedRows } from "../../ts/stage-rows";
import { sha256Hex } from "../../../pdf-pipeline/frozen-reviewed-input";

async function main() {
  const [jsonArg, sourcePdf, sourceVersion] = process.argv.slice(2);
  if (!jsonArg || !sourcePdf || !/^[a-f0-9]{64}$/.test(sourceVersion ?? ""))
    throw new Error("usage: record-rows.ts <reviewed.json> <source_pdf> <source_version>");
  const bytes = readFileSync(jsonArg);
  const rows = (
    JSON.parse(bytes.toString("utf-8")) as { questions: Array<Record<string, unknown>> }
  ).questions;
  const out = await recordReviewedRows(rows, sourcePdf, sourceVersion);
  process.stdout.write(
    JSON.stringify({
      reviewed_json_sha256: sha256Hex(bytes),
      source_pdf_sha256: sourceVersion,
      rows: out,
    }) + "\n"
  );
}

main().catch((error) => {
  process.stderr.write(`record-rows: ${(error as Error).message}\n`);
  process.exit(2);
});
