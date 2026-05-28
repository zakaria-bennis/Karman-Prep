#!/usr/bin/env -S npx tsx
/* eslint-disable @typescript-eslint/no-explicit-any */

// ============================================================
// import-json-direct — v2 Phase 8.1 orchestrator import stage.
//
// Reads the JSON output produced by extract-with-gemini.mjs (already
// merged with extract-figures.mjs's image_url additions) and inserts
// each row directly into Supabase via the shared import-core module.
//
// REPLACES the orchestrator's previous Stage 3 (json-to-import-csv)
// + Stage 4 (import-csv-direct) combo. The CSV intermediate is no
// longer the transport — JSON goes straight to DB.
//
// json-to-import-csv.mjs remains as a debug-only CLI tool for
// operators who want a CSV snapshot of an extraction.
// import-csv-direct.mjs remains as a deprecated fallback CLI for
// operators who still want to import a hand-edited CSV.
//
// USAGE
//   tsx --env-file=.env.local \
//     scripts/pdf-pipeline/import-json-direct.ts \
//     /tmp/<stem>-gemini-extracted.json
//
// Or from the orchestrator (which adds --env-file automatically):
//   runStage("Stage 3 — import JSON", "importing",
//            "scripts/pdf-pipeline/import-json-direct.ts",
//            [jsonOut], { runner: "tsx" });
// ============================================================

import { readFileSync } from "node:fs";
import { basename, resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { rowToImportInput, importQuestion } from "./import-json-direct-row";
import type { Database } from "@/types/supabase";

const jsonArg = process.argv[2];
const pdfArg = process.argv[3];
if (!jsonArg || !pdfArg) {
  // pdfArg is REQUIRED — without it, source_pdf would be NULL on every
  // inserted row, which silently breaks Stages 4-14 (they all filter by
  // source_pdf to scope work to the current PDF). Mirrors the v1 path's
  // requirement in json-to-import-csv.mjs.
  console.error(
    "usage: tsx scripts/pdf-pipeline/import-json-direct.ts <json-path> <source-pdf-path>"
  );
  process.exit(1);
}

// Mirrors v1 json-to-import-csv.mjs:
//   source_pdf = basename(pdfArg)
// e.g. "/tmp/pdf-job-xyz/202406asiav2.pdf" → "202406asiav2.pdf"
const sourcePdfName = basename(pdfArg);

const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPA_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPA_URL || !SUPA_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const supabase = createClient<Database>(SUPA_URL, SUPA_KEY, {
  auth: { persistSession: false },
});

// ── Read JSON ─────────────────────────────────────────────────

const jsonPath = resolve(jsonArg);
const raw = readFileSync(jsonPath, "utf-8");
let parsed: unknown;
try {
  parsed = JSON.parse(raw);
} catch (err) {
  console.error(`Failed to parse JSON at ${jsonPath}: ${(err as Error).message}`);
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
    const row = rows[i];
    const normalized = rowToImportInput(row, sourcePdfName);
    if ("error" in normalized) {
      summary.errored++;
      summary.errors.push({ row: i + 1, message: normalized.error });
      continue;
    }
    try {
      const result = await importQuestion(supabase, normalized);
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
