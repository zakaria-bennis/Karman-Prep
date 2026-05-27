// ============================================================
// json-to-import-csv — debug-only CSV export from Gemini JSON.
//
// ⚠ DEMOTED to debug-only as of v2 phase 8.1.
//   The orchestrator no longer calls this. Stages 3+4 (emit CSV +
//   import CSV) merged into one Stage 3 (import JSON directly) via
//   scripts/pdf-pipeline/import-json-direct.ts.
//
//   Keep this script for the rare case an operator wants a CSV
//   snapshot of an extraction — e.g. to spot-check the gemini
//   output offline, or to hand-edit a row and re-import via the
//   admin /admin/questions/import UI.
//
// Takes a Gemini-extracted JSON (with figure URLs already populated
// by extract-figures.mjs) and writes the 32-column CSV that the
// bulk-importer at /admin/questions/import expects.
//
// Field mapping
//   · Direct copies: question_text, choice_a..d, correct_answer,
//     topic_cluster, passage*, question_format, numeric_tolerance,
//     domain, concept_slug, answer_source, source_page, import_*,
//     image_url, image_alt.
//   · Computed: content_hash = sha1(lowercase(strip_whitespace(
//       question_text + "|" + choice_a + "|" + ... + "|" + choice_d
//     ))). For numeric_entry rows, hash question_text alone.
//   · From argv: source_pdf = original PDF filename (e.g. 202603asiav1.pdf).
//   · Stringified: difficulty (integer 1-7 → string).
//   · Left EMPTY for downstream fill:
//       - explanation_text   (Sonnet later)
//       - explanation_a..d   (Sonnet later, R&W only)
//       - hint               (Sonnet later)
//       - desmos_strategy    (Haiku later, math only)
//
// The "empty downstream" fields are intentionally blank. After
// bulk-import places rows in the DB, the existing scripts run:
//   · generate-per-choice-explanations.mjs (Sonnet)  → explanation_a..d
//   · generate-desmos-tips.mjs              (Haiku)  → desmos_strategy
//   · A future script                       (Sonnet) → explanation_text
//
// USAGE
//   node scripts/pdf-pipeline/json-to-import-csv.mjs \
//     /tmp/202603asiav1-gemini-extracted.json \
//     question-imports/done/202603asiav1.pdf \
//     /tmp/202603asiav1-import.csv
//
// The bulk-importer is content-hash-deduplicated, so re-running
// this on the same PDF is idempotent — rows with matching hashes
// are skipped on re-import.
// ============================================================

import { readFileSync, writeFileSync } from "node:fs";
import { basename, resolve } from "node:path";
import { createHash } from "node:crypto";

const [, , jsonArg, pdfArg, outArg] = process.argv;
if (!jsonArg || !pdfArg || !outArg) {
  console.error(
    "Usage: node scripts/pdf-pipeline/json-to-import-csv.mjs <gemini-json> <source-pdf-path> <out-csv>"
  );
  process.exit(1);
}
const jsonPath = resolve(jsonArg);
const pdfPath = resolve(pdfArg);
const outPath = resolve(outArg);
const sourcePdf = basename(pdfPath);

// 32 columns in exact spec order — matches CSV_HEADERS in
// src/components/admin/BulkImportPanel.tsx + KarmanGPT.txt §5.
const CSV_HEADERS = [
  "question_text",
  "choice_a",
  "choice_b",
  "choice_c",
  "choice_d",
  "correct_answer",
  "difficulty",
  "topic_cluster",
  "hint",
  "explanation_text",
  "explanation_a",
  "explanation_b",
  "explanation_c",
  "explanation_d",
  "desmos_strategy",
  "passage_intro",
  "passage",
  "passage_a",
  "passage_b",
  "question_format",
  "numeric_tolerance",
  "domain",
  "concept_slug",
  "answer_source",
  "source_pdf",
  "source_page",
  "content_hash",
  "import_status",
  "import_flag_type",
  "import_flag_reason",
  "image_url",
  "image_alt",
];

function csvEscape(v) {
  const s = String(v ?? "");
  // RFC 4180: quote when the field contains , " \n \r — and double
  // any embedded quotes inside the quoted field.
  if (/[,"\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function computeContentHash(row) {
  // sha1(lowercase(strip_whitespace(
  //   question_text + "|" + choice_a + "|" + ... + "|" + choice_d
  // )))
  // For numeric_entry rows where choices are blank, hash question_text
  // alone (per KarmanGPT §5).
  const parts =
    row.question_format === "numeric_entry"
      ? [row.question_text || ""]
      : [
          row.question_text || "",
          row.choice_a || "",
          row.choice_b || "",
          row.choice_c || "",
          row.choice_d || "",
        ];
  const joined = parts.map((s) => String(s).trim().toLowerCase().replace(/\s+/g, "")).join("|");
  return createHash("sha1").update(joined).digest("hex");
}

const rows = JSON.parse(readFileSync(jsonPath, "utf-8"));
console.log(`Loaded ${rows.length} rows from ${jsonArg}`);

const lines = [CSV_HEADERS.join(",")];
let mathRows = 0;
let rwRows = 0;
let flaggedRows = 0;
let withImage = 0;
const mathDomains = new Set(["algebra", "advanced_math", "geometry", "data_analysis"]);

for (const r of rows) {
  const isMath = mathDomains.has(r.domain);
  if (isMath) mathRows++;
  else rwRows++;
  if (r.import_status === "needs_review") flaggedRows++;
  if (r.image_url) withImage++;

  const mapped = {
    question_text: r.question_text || "",
    choice_a: r.choice_a || "",
    choice_b: r.choice_b || "",
    choice_c: r.choice_c || "",
    choice_d: r.choice_d || "",
    correct_answer: r.correct_answer || "",
    difficulty: r.difficulty != null ? String(r.difficulty) : "",
    topic_cluster: r.topic_cluster || "",
    // Downstream-filled fields stay blank — Sonnet/Haiku fill them
    // after bulk-import places the rows in the database.
    hint: "",
    explanation_text: "",
    explanation_a: "",
    explanation_b: "",
    explanation_c: "",
    explanation_d: "",
    desmos_strategy: "",
    passage_intro: r.passage_intro || "",
    passage: r.passage || "",
    passage_a: r.passage_a || "",
    passage_b: r.passage_b || "",
    question_format: r.question_format || "multiple_choice",
    numeric_tolerance: r.numeric_tolerance || "",
    domain: r.domain || "",
    concept_slug: r.concept_slug || "",
    answer_source: r.answer_source || "extracted",
    source_pdf: sourcePdf,
    source_page: r.source_page != null ? String(r.source_page) : "",
    content_hash: computeContentHash(r),
    import_status: r.import_status || "ok",
    import_flag_type:
      r.import_flag_type || (r.import_status === "needs_review" ? "partial_emit" : ""),
    import_flag_reason: r.import_flag_reason || "",
    image_url: r.image_url || "",
    image_alt: r.image_alt || "",
  };
  lines.push(CSV_HEADERS.map((h) => csvEscape(mapped[h])).join(","));
}

writeFileSync(outPath, lines.join("\n") + "\n");
const csvSizeKB = (Buffer.byteLength(lines.join("\n")) / 1024).toFixed(1);

console.log("");
console.log("═".repeat(72));
console.log(`Wrote ${rows.length} rows to ${outPath} (${csvSizeKB} KB)`);
console.log(`  Subject split: ${mathRows} math / ${rwRows} R&W`);
console.log(`  With image_url: ${withImage}`);
console.log(`  Flagged for review: ${flaggedRows}`);
console.log("");
console.log("NEXT STEPS:");
console.log(`  1. Upload ${outPath} at /admin/questions/import`);
console.log(`     (or paste the contents into the JSON/CSV textarea there)`);
console.log("  2. After import, run the post-fill scripts to populate explanations:");
console.log(
  "       node --env-file=.env.local scripts/content-generation/generate-per-choice-explanations.mjs"
);
console.log(
  "       node --env-file=.env.local scripts/content-generation/generate-desmos-tips.mjs"
);
