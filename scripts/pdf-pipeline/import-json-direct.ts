#!/usr/bin/env -S npx tsx
/* eslint-disable @typescript-eslint/no-explicit-any */

// Import reviewed JSON through the shared importer. The legacy adapter
// remains compatible; new released-exam batches must use the reviewed
// wrapper, which requires numeric difficulty and stable source identity.
// Usage: npm run questions:import-reviewed -- <reviewed.json> <source.pdf> [--dry-run]
// Dry runs validate the full batch without database credentials or writes.

import { readFileSync } from "node:fs";
import { basename, resolve } from "node:path";
import { createHash } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import {
  preflightImportRows,
  rowToReviewedImportInput,
  importQuestion,
} from "./import-json-direct-row";
import type { Database } from "@/types/supabase";
import { REVIEWED_DIFFICULTY_IMPORT_POLICY } from "@/lib/question-bank/reviewed-difficulty";
import { sha256Hex, verifyFrozenReviewedInput } from "./frozen-reviewed-input";

const jsonArg = process.argv[2];
const pdfArg = process.argv[3];
const flags = process.argv.slice(4);
let reviewedDifficulty = false;
let dryRun = false;
let requireSourceIdentity = false;
let frozenInputsPath: string | undefined;
let frozenInputsSha256: string | undefined;
const seen = new Set<string>();
for (let i = 0; i < flags.length; i++) {
  const flag = flags[i];
  if (seen.has(flag)) {
    console.error(`Repeated flag ${flag}. Aborting.`);
    process.exit(1);
  }
  seen.add(flag);
  if (flag === "--reviewed-difficulty") reviewedDifficulty = true;
  else if (flag === "--dry-run") dryRun = true;
  else if (flag === "--require-source-identity") requireSourceIdentity = true;
  else if (flag === "--frozen-inputs" || flag === "--frozen-inputs-sha256") {
    const value = flags[++i];
    if (!value || value.startsWith("--")) {
      console.error(`Missing value for ${flag}. Aborting.`);
      process.exit(1);
    }
    if (flag === "--frozen-inputs") frozenInputsPath = value;
    else frozenInputsSha256 = value;
  } else {
    console.error(`Unknown flag ${flag}. Aborting.`);
    process.exit(1);
  }
}
if (!jsonArg || !pdfArg) {
  // pdfArg is REQUIRED — without it, source_pdf would be NULL on every
  // inserted row, which silently breaks Stages 4-14 (they all filter by
  // source_pdf to scope work to the current PDF). Mirrors the v1 path's
  // requirement in json-to-import-csv.mjs.
  console.error(
    "usage: tsx scripts/pdf-pipeline/import-json-direct.ts <json-path> <source-pdf-path> [--reviewed-difficulty [--dry-run]]"
  );
  process.exit(1);
}

// Mirrors v1 json-to-import-csv.mjs:
//   source_pdf = basename(pdfArg)
// e.g. "/tmp/pdf-job-xyz/202406asiav2.pdf" → "202406asiav2.pdf"
const sourcePdfName = basename(pdfArg);
const pdfBytes = readFileSync(pdfArg);
const sourceVersion = createHash("sha256").update(pdfBytes).digest("hex");

// ── Read JSON ─────────────────────────────────────────────────

const jsonPath = resolve(jsonArg);
const jsonBytes = readFileSync(jsonPath);
const raw = jsonBytes.toString("utf-8");
let parsed: unknown;
try {
  parsed = JSON.parse(raw);
} catch (err) {
  console.error(`Failed to parse JSON at ${jsonPath}: ${(err as Error).message}`);
  process.exit(1);
}
// A reviewed export cannot silently fall back to the legacy importer if a flag is omitted.
if (
  (parsed as { import_policy?: unknown } | null)?.import_policy ===
  REVIEWED_DIFFICULTY_IMPORT_POLICY
) {
  reviewedDifficulty = true;
}
if (
  (parsed as { import_policy?: unknown } | null)?.import_policy != null &&
  (parsed as { import_policy?: unknown }).import_policy !== REVIEWED_DIFFICULTY_IMPORT_POLICY
) {
  console.error("Unknown import policy marker. No questions were written.");
  process.exit(2);
}
if (dryRun && !reviewedDifficulty) {
  console.error("--dry-run requires reviewed mode or a reviewed export marker.");
  process.exit(1);
}
const rows: Array<Record<string, any>> = Array.isArray(parsed)
  ? parsed
  : Array.isArray((parsed as any)?.questions)
    ? (parsed as any).questions
    : [];

if (rows.length === 0) {
  console.error(`No questions found in ${jsonPath}. Aborting.`);
  process.exit(1);
}

console.log(`Loaded ${rows.length} questions from ${jsonPath}`);
const preflight = preflightImportRows(rows, sourcePdfName, sourceVersion, requireSourceIdentity);
if (preflight.errors.length > 0) {
  console.error(`Import preflight failed before database writes:\n${preflight.errors.join("\n")}`);
  process.exit(2);
}

// Validate every reviewed row before any insert. Keep the source JSON immutable:
// it is the durable assessment/provenance artifact, not a student history rewrite.
const reviewedRows = reviewedDifficulty
  ? rows.map((row) =>
      rowToReviewedImportInput(row, sourcePdfName, { allowPreview: dryRun, sourceVersion })
    )
  : null;
if (reviewedRows?.some((row) => "error" in row)) {
  reviewedRows.forEach((row, index) => {
    if ("error" in row) console.error(`row ${index + 1}: ${row.error}`);
  });
  console.error("Reviewed batch requires review. No questions were written.");
  process.exit(2);
}
if (frozenInputsPath || frozenInputsSha256 || (reviewedDifficulty && !dryRun)) {
  if (!reviewedDifficulty || !frozenInputsPath || !frozenInputsSha256) {
    console.error(
      "Reviewed writes require a frozen input manifest and its separately supplied SHA-256. No questions were written."
    );
    process.exit(2);
  }
  let manifestBytes: Buffer;
  try {
    manifestBytes = readFileSync(resolve(frozenInputsPath));
  } catch {
    console.error("Frozen input manifest could not be read. No questions were written.");
    process.exit(2);
  }
  const frozen = verifyFrozenReviewedInput({
    manifestBytes,
    expectedManifestSha256: frozenInputsSha256,
    jsonBytes,
    pdfBytes,
    rows,
  });
  if (!frozen.ok) {
    console.error(`${frozen.error}. No questions were written.`);
    process.exit(2);
  }
}
if (dryRun) {
  console.log(
    JSON.stringify(
      {
        mode: "reviewed-difficulty-dry-run",
        validated_rows: reviewedRows?.length,
        reviewed_json_sha256: sha256Hex(jsonBytes),
        source_pdf_sha256: sourceVersion,
        frozen_input_verified: Boolean(frozenInputsPath),
        assessments: reviewedRows?.map((row, index) => ({
          row: index + 1,
          ...("assessment" in row ? row.assessment : {}),
        })),
        database_accessed: false,
      },
      null,
      2
    )
  );
  process.exit(0);
}

// Construction happens only after reviewed preflight; dry runs need no DB credentials.
const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPA_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPA_URL || !SUPA_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}
const supabase = createClient<Database>(SUPA_URL, SUPA_KEY, {
  auth: { persistSession: false },
});

// Note: rowToImportInput is exported from ./import-json-direct-row
// so vitest can exercise it without pulling in the CLI side-effects
// of this file (env-var checks, process.exit, Supabase client).

// ── Drive the import ──────────────────────────────────────────

async function main() {
  const summary = {
    inserted: 0,
    skipped_duplicates: 0,
    flagged_for_review: 0,
    errored: 0,
    errors: [] as Array<{ row: number; message: string }>,
  };

  for (let i = 0; i < rows.length; i++) {
    const reviewedRow = reviewedRows?.[i];
    const normalized =
      reviewedRow && "input" in reviewedRow ? reviewedRow.input : preflight.inputs[i];
    try {
      const result = await importQuestion(supabase, normalized, {
        difficultyPolicy: reviewedDifficulty ? "reviewed" : "legacy",
      });
      if (result.duplicate_skipped) {
        summary.skipped_duplicates++;
      } else if (!result.inserted) {
        summary.errored++;
        summary.errors.push({
          row: i + 1,
          message: result.errors.join("; ") || "unknown error",
        });
      } else if (result.flagged_for_review) {
        summary.flagged_for_review++;
      } else {
        summary.inserted++;
      }
      // Non-fatal warnings (answer_key_entries / source_assets) still
      // get logged but don't bump the error count.
      if (result.errors.length > 0 && result.inserted) {
        for (const e of result.errors) {
          console.log(`  row ${i + 1} non-fatal: ${e}`);
        }
      }
    } catch (err) {
      summary.errored++;
      summary.errors.push({
        row: i + 1,
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }

  console.log();
  console.log("─".repeat(56));
  console.log(`inserted (ok):       ${summary.inserted}`);
  console.log(`flagged (review):    ${summary.flagged_for_review}`);
  console.log(`skipped (duplicate): ${summary.skipped_duplicates}`);
  console.log(`errored:             ${summary.errored}`);
  if (summary.errors.length) {
    console.log("\nerrors:");
    for (const e of summary.errors.slice(0, 10)) console.log(`  row ${e.row}: ${e.message}`);
    if (summary.errors.length > 10) console.log(`  …and ${summary.errors.length - 10} more`);
  }

  // Final bank totals — same format as import-csv-direct.mjs.
  const { count: qCount } = await supabase
    .from("quiz_questions")
    .select("id", { count: "exact", head: true });
  const { count: cCount } = await supabase
    .from("answer_choices")
    .select("id", { count: "exact", head: true });
  console.log(`\nbank now: ${qCount} questions, ${cCount} choices`);

  // Exit non-zero if any row errored so the orchestrator can fail
  // the stage with a clear reason. Duplicates and flagged-for-review
  // are NOT errors (they're handled downstream by publish-gate).
  if (summary.errored > 0) {
    process.exit(2);
  }
}

main().catch((err) => {
  console.error("FATAL:", err);
  process.exit(1);
});
