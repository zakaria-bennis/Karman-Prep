// ============================================================
// run-extraction — single-command wrapper for the new Gemini-based
// PDF ingestion pipeline. Replaces the manual ChatGPT clicking
// workflow with one shell invocation.
//
// PIPELINE (orchestrated in order)
//   1. extract-with-gemini.mjs   — PDF → structured JSON (questions,
//                                    taxonomy, difficulty, passages,
//                                    figure flags). Cost ~$0.03/PDF.
//   2. extract-figures.mjs       — JSON + PDF → R2-hosted figure URLs.
//                                    Vision-driven bbox detection,
//                                    sharp crop + polish, R2 upload.
//                                    Cost ~$0.001 per figure.
//   3. json-to-import-csv.mjs    — JSON → 32-column CSV ready for the
//                                    bulk-importer at /admin/questions/import.
//
// AFTER THIS SCRIPT
//   · You upload the produced CSV at /admin/questions/import. The
//     bulk-importer writes rows to the question bank.
//   · Then run the post-fill scripts to populate explanations:
//       npm run pdf:fill-explanations    (Sonnet — per-choice + explanation_text)
//       npm run pdf:fill-desmos          (Haiku — Desmos tips, math only)
//
// USAGE
//   node --env-file=.env.local \
//     scripts/pdf-pipeline/run-extraction.mjs \
//     question-imports/incoming/202511usv1.pdf
//
//   Optional flags (after the PDF path):
//     --skip-figures   Skip step 2 (figure extraction). Useful for
//                      quick text-only iteration on a new PDF.
//     --output-dir D   Write the JSON + CSV outputs to directory D
//                      instead of /tmp.
//
// COST (per PDF)
//   ~$0.04 for the full pipeline. For 100 PDFs: ~$4.
// ============================================================

import { spawnSync } from "node:child_process";
import { basename, resolve, join } from "node:path";
import { existsSync } from "node:fs";

const args = process.argv.slice(2);
const pdfArg = args.find((a) => !a.startsWith("--"));
if (!pdfArg) {
  console.error(
    "Usage: node scripts/pdf-pipeline/run-extraction.mjs <pdf-path> [--skip-figures] [--output-dir D]"
  );
  process.exit(1);
}
const SKIP_FIGURES = args.includes("--skip-figures");
const outIdx = args.indexOf("--output-dir");
const OUTPUT_DIR = outIdx >= 0 ? args[outIdx + 1] : "/tmp";

const pdfPath = resolve(pdfArg);
if (!existsSync(pdfPath)) {
  console.error(`PDF not found: ${pdfPath}`);
  process.exit(1);
}
const pdfStem = basename(pdfPath).replace(/\.pdf$/i, "");
const jsonOut = join(OUTPUT_DIR, `${pdfStem}-gemini-extracted.json`);
const csvOut = join(OUTPUT_DIR, `${pdfStem}-import.csv`);

function run(label, cmd, scriptArgs) {
  console.log("");
  console.log("─".repeat(72));
  console.log(`▶ ${label}`);
  console.log("─".repeat(72));
  const result = spawnSync("node", ["--env-file=.env.local", cmd, ...scriptArgs], {
    stdio: "inherit",
  });
  if (result.status !== 0) {
    console.error(`\n✗ ${label} failed (exit ${result.status}). Stopping.`);
    process.exit(result.status ?? 1);
  }
}

const t0 = Date.now();

// Step 1: Extract structure
run(
  "Step 1/3 — extract structure (Gemini 3.5 Flash)",
  "scripts/pdf-pipeline/extract-with-gemini.mjs",
  [pdfPath]
);

// Step 2: Extract figures (skippable)
if (SKIP_FIGURES) {
  console.log("\n(--skip-figures — Step 2 skipped)");
} else {
  run(
    "Step 2/3 — extract figures (page render + vision crop + R2 upload)",
    "scripts/pdf-pipeline/extract-figures.mjs",
    [pdfPath, jsonOut]
  );
}

// Step 3: Build the import CSV
run("Step 3/3 — generate import CSV", "scripts/pdf-pipeline/json-to-import-csv.mjs", [
  jsonOut,
  pdfPath,
  csvOut,
]);

const elapsed = ((Date.now() - t0) / 1000).toFixed(1);

console.log("");
console.log("═".repeat(72));
console.log(`✓ Pipeline complete in ${elapsed}s`);
console.log("═".repeat(72));
console.log("");
console.log("OUTPUTS");
console.log(`  Structured JSON: ${jsonOut}`);
console.log(`  Import CSV:      ${csvOut}`);
console.log("");
console.log("NEXT STEPS");
console.log(`  1. Go to /admin/questions/import and upload ${csvOut}`);
console.log("  2. Once questions land in the DB, run the explanation generators:");
console.log(
  "       node --env-file=.env.local scripts/content-generation/generate-per-choice-explanations.mjs"
);
console.log(
  "       node --env-file=.env.local scripts/content-generation/generate-desmos-tips.mjs"
);
