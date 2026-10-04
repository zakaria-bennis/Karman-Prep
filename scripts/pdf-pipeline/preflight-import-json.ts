#!/usr/bin/env -S npx tsx
// No network, credentials, database, uploads, or writes. Use this before
// the versioned importer on a reviewed source batch.
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { basename } from "node:path";
import { preflightImportRows } from "./import-json-direct-row";
import { validateImportRow } from "@/lib/question-bank/import-core";

const [jsonPath, sourcePath] = process.argv.slice(2);
if (!jsonPath || !sourcePath) {
  console.error("usage: tsx preflight-import-json.ts <questions.json> <source-file>");
  process.exit(2);
}
const parsed = JSON.parse(readFileSync(jsonPath, "utf8"));
const rows = Array.isArray(parsed) ? parsed : parsed.questions;
if (!Array.isArray(rows) || rows.length === 0) {
  console.error("No question rows found.");
  process.exit(2);
}
const version = createHash("sha256").update(readFileSync(sourcePath)).digest("hex");
const result = preflightImportRows(rows, basename(sourcePath), version, true);
const errors = [...result.errors];
result.inputs.forEach((input, index) => {
  const validation = validateImportRow(input);
  errors.push(...validation.errors.map((error) => `row ${index + 1}: ${error}`));
});
console.log(`Source version SHA-256: ${version}`);
console.log(`Rows checked: ${rows.length}; errors: ${errors.length}`);
if (errors.length) {
  for (const error of errors) console.error(error);
  process.exit(2);
}
console.log("Preflight passed. No external side effects were performed.");
