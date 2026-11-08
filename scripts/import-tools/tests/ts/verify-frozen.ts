#!/usr/bin/env -S npx tsx
// Test helper for the Python frozen-manifest round trip: runs the stage check's own
// verifyFrozenReviewedInput (the one ts/stage-rows.ts calls) on a reviewed file, its
// source PDF bytes and a frozen manifest written by the Python builders. Never touches a
// database.
//
// Usage: npx tsx scripts/import-tools/tests/ts/verify-frozen.ts <reviewed.json> <source.pdf> <manifest.json> <manifest-sha256>
// Prints the verifier's result as JSON.

import { readFileSync } from "node:fs";
import { verifyFrozenReviewedInput } from "../../../pdf-pipeline/frozen-reviewed-input";

const [jsonArg, pdfArg, manifestArg, manifestSha] = process.argv.slice(2);
if (!jsonArg || !pdfArg || !manifestArg || !manifestSha) {
  process.stderr.write(
    "usage: verify-frozen.ts <reviewed.json> <source.pdf> <manifest.json> <sha256>\n"
  );
  process.exit(2);
}
const jsonBytes = readFileSync(jsonArg);
const rows = (JSON.parse(jsonBytes.toString("utf-8")) as { questions: unknown[] }).questions;
const result = verifyFrozenReviewedInput({
  manifestBytes: readFileSync(manifestArg),
  expectedManifestSha256: manifestSha,
  jsonBytes,
  pdfBytes: readFileSync(pdfArg),
  rows,
});
process.stdout.write(JSON.stringify(result) + "\n");
