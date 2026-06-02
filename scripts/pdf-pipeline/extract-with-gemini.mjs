// ============================================================
// extract-with-gemini — Phase 1 question extractor.
// (Filename is historical — the model under the hood is now Kimi
// K2.5 via Moonshot's direct API. Kept the filename to avoid breaking
// orchestrator references; the runner is model-agnostic underneath.)
//
// Takes an SAT PDF, uploads it to Moonshot's Files API, fetches the
// parsed text, then streams a Kimi K2.5 completion with the dedicated
// Stage 1 extraction system prompt (extraction-prompt.mjs →
// loadStage1SystemPrompt: extraction-only role + canonical taxonomy) and
// a JSON-object response_format, and writes the result to /tmp for the
// import stage to pick up.
//
// MODEL HISTORY
//   · Gemini 1.5 Flash (2024) → tripped Google's RECITATION filter
//     on educational SAT content (finishReason:RECITATION,
//     text_chars:0, observed on run #26322250769).
//   · Claude Sonnet 4.6 (2025) → worked reliably but cost ~$0.79/PDF.
//   · Gemini 3.5 Flash (May 2026) → re-tried after 2 years thinking
//     Google fixed RECITATION. Verified empirically that it
//     DIDN'T — same filter, with 8 citation URLs pointing at
//     Scribd / Chinese SAT forum copies of the source PDF. 100%
//     block rate on real SAT content. NOT VIABLE.
//   · Kimi K2.5 via OpenRouter (May 2026) → no RECITATION block, but
//     OpenRouter's opaque PDF-to-text layer stripped math notation
//     and figure context. Result: math questions hallucinated as
//     generic SAT-style filler ("In the figure above, what is x?")
//     instead of the real PDF content. NOT VIABLE.
//   · Kimi K2.5 via Moonshot direct API (current) → ~$0.14/PDF.
//     Same model, different transport: Moonshot exposes the parser
//     as a separate step (uploadMoonshotFile → fetchMoonshotFileContent),
//     which preserves enough structure that Kimi extracts faithful
//     content. Verified on 202406asiav2.pdf: extraction_order=57
//     returned the real p.57 polynomial question matching what
//     Sonnet produced. Streaming required (~15 min wall-clock).
//
// SCOPE
//   · Extracts STRUCTURE ONLY (question_text, choices, correct
//     answer, taxonomy, difficulty, passages, source metadata).
//   · SKIPS explanations entirely — those are generated downstream
//     by fill-explanations-v2 (Stage 10) and qa-explanations
//     (Stage 11).
//   · SKIPS figure rendering — Stage 2 (extract-figures.mjs)
//     handles visual extraction.
//   · Writes JSON to /tmp; import-json-direct (Stage 3) picks it up.
//
// USAGE
//   node --env-file=.env.local \
//     scripts/pdf-pipeline/extract-with-gemini.mjs \
//     question-imports/done/202603asiav1.pdf
//
// COST
//   ~$0.14 per PDF on Moonshot direct kimi-k2.5 ($0.40/M input,
//   $1.90/M output; typical request is ~30K input — schema prompt +
//   parsed PDF text — and ~50K output for the questions array).
//   For 100 PDFs: ~$14 total vs ~$79 on Sonnet 4.6.
// ============================================================

import { readFileSync, writeFileSync } from "node:fs";
import { basename, resolve } from "node:path";
import {
  callMoonshot,
  uploadMoonshotFile,
  fetchMoonshotFileContent,
  QuotaExhaustedError,
  ParseError,
} from "../lib/llm-providers.mjs";
// Phase 8.2: canonical taxonomy comes from the generated constants
// file. Edit src/data/curriculum/*.ts to add/rename slugs, then run
// `npm run sync:taxonomy`. CI verifies the generated file is fresh.
// CONCEPT_SLUG_VALUES is the bare-string array Gemini's response
// schema needs.
import {
  DOMAINS,
  TOPIC_CLUSTERS,
  CONCEPT_SLUG_VALUES as CONCEPT_SLUGS,
} from "../lib/taxonomy.generated.mjs";
import { analyzeCoverage, MATH_DOMAINS } from "../lib/extraction-coverage.mjs";
import { buildUserPrompt, loadStage1SystemPrompt } from "../lib/extraction-prompt.mjs";
import {
  validateExtraction,
  flagRowsNeedingReview,
  formatValidationReport,
  deriveTopicClusters,
} from "../lib/extraction-validation.mjs";

const pdfArg = process.argv[2];
if (!pdfArg) {
  console.error("Usage: node scripts/pdf-pipeline/extract-with-gemini.mjs <path-to-pdf>");
  process.exit(1);
}
const pdfPath = resolve(pdfArg);
const pdfName = basename(pdfPath);

// Active Stage 1 system prompt = the dedicated extraction-only prompt +
// canonical taxonomy fragment (see extraction-prompt.mjs). The old
// all-in-one question-imports/chatgpt/KarmanGPT.txt is kept on disk as a
// legacy/manual reference but is no longer sent to the model.
const systemPrompt = loadStage1SystemPrompt();

console.log(`Reading PDF: ${pdfPath}`);
const pdfBuf = readFileSync(pdfPath);
const pdfSizeMB = (pdfBuf.length / 1024 / 1024).toFixed(2);
console.log(`PDF size: ${pdfSizeMB} MB`);

// Hard cap aligned with the upload pipeline + Anthropic Files API
// max (500 MB per file). Earlier we had a 18 MB cap from the inline-
// upload era; switched to Files API in the large-PDF support PR
// (callClaude({ pdf }) now always uploads via /v1/files).
const MAX_PDF_BYTES = 250 * 1024 * 1024;
if (pdfBuf.length > MAX_PDF_BYTES) {
  console.error(
    `PDF size ${pdfSizeMB} MB exceeds ${MAX_PDF_BYTES / 1024 / 1024} MB cap. ` +
      `Split with pdftk or contact admin to raise the cap.`
  );
  process.exit(1);
}

if (CONCEPT_SLUGS.length !== 89) {
  throw new Error(`Expected 89 concept slugs, got ${CONCEPT_SLUGS.length}`);
}

// Structural schema — covers extraction fields only. Explanation
// fields (explanation_text, explanation_a..d, hint, desmos_strategy)
// are filled by downstream Sonnet/Haiku scripts, not Gemini.
const responseSchema = {
  type: "OBJECT",
  properties: {
    questions: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          question_text: { type: "STRING" },
          choice_a: { type: "STRING" },
          choice_b: { type: "STRING" },
          choice_c: { type: "STRING" },
          choice_d: { type: "STRING" },
          correct_answer: { type: "STRING" },
          difficulty: { type: "INTEGER" },
          topic_cluster: { type: "STRING", enum: TOPIC_CLUSTERS },
          passage_intro: { type: "STRING" },
          passage: { type: "STRING" },
          passage_a: { type: "STRING" },
          passage_b: { type: "STRING" },
          question_format: {
            type: "STRING",
            enum: ["multiple_choice", "numeric_entry"],
          },
          numeric_tolerance: { type: "STRING" },
          domain: { type: "STRING", enum: DOMAINS },
          // Gemini 3.5 Flash rejects responseSchema enums larger than
          // ~50 items (probed empirically). Our taxonomy has 89 slugs,
          // so we cannot enforce at the schema layer. Instead we lean
          // on the system prompt to list them and post-validate after
          // extraction — any invalid slug flips import_status to
          // needs_review.
          concept_slug: { type: "STRING" },
          answer_source: {
            type: "STRING",
            enum: ["extracted", "inferred", "hand_corrected"],
          },
          source_page: { type: "INTEGER" },
          import_status: { type: "STRING", enum: ["ok", "needs_review"] },
          import_flag_reason: { type: "STRING" },
          // Figure detection — Gemini flags questions whose meaning
          // depends on a visual (chart, graph, geometry diagram, table).
          // A separate downstream pass (extract-figures.mjs) renders +
          // crops + uploads the actual image bytes. We only need a
          // boolean + alt-text seed here.
          has_figure: { type: "BOOLEAN" },
          figure_alt: { type: "STRING" },
        },
        required: [
          "question_text",
          "correct_answer",
          "difficulty",
          "topic_cluster",
          "question_format",
          "domain",
          "concept_slug",
          "source_page",
          "import_status",
          "has_figure",
        ],
      },
    },
  },
  required: ["questions"],
};

const USER_PROMPT = buildUserPrompt(pdfName);

// Model + caps:
//   · kimi-k2.5 (Moonshot direct API, NOT via OpenRouter — see MODEL
//     HISTORY comment above for why OpenRouter route was abandoned).
//   · 65536 output tokens — Kimi K2.5's full output budget. The smoke
//     PDF needs ~50K to fit 98 questions; the skip-metadata suffix
//     below saves another ~10K by telling the model NOT to emit
//     extraction_summary / page_coverage (we don't consume them).
//   · Overridable via EXTRACTION_MODEL env var (e.g. kimi-k2.6).
//     For rollback to Sonnet, set EXTRACTION_MODEL=claude-sonnet-4-6
//     AND swap callMoonshot for callClaude (manual revert — no
//     auto-fallback in this code path since the request shapes differ).
const MODEL = process.env.EXTRACTION_MODEL ?? "kimi-k2.5";
const MAX_OUTPUT_TOKENS = 65_536;

// responseSchema (Gemini-style OpenAPI types) is kept above for any
// future model that supports schema enforcement, but Moonshot's chat
// completions only support response_format: { type: "json_object" }
// — looser. Post-extraction validation (concept_slug whitelist, R&W
// passage dedup, under-extraction guard) catches violations and flips
// import_status to needs_review, same safety net as before.

// Final-guard suffix appended to the user prompt. Moonshot's
// response_format is just "json_object" (any JSON), not a strict schema,
// so this reinforces the single { "questions": [...] } output contract
// the base prompt already specifies — belt-and-suspenders against stray
// top-level keys (extraction_summary, page_coverage, etc.).
const STAGE1_JSON_OBJECT_SUFFIX =
  "\n\nFINAL OUTPUT REQUIREMENT FOR THIS CALL:\n" +
  'Emit exactly one top-level JSON object:\n{ "questions": [ ... ] }\n' +
  "Do not emit extraction_summary, page_coverage, metadata, markdown, comments, " +
  "prose, or any other top-level keys.";

const t0 = Date.now();
console.log(`Uploading PDF to Moonshot Files API…`);
let uploaded;
try {
  uploaded = await uploadMoonshotFile(pdfBuf, {
    mimeType: "application/pdf",
    filename: pdfName,
  });
  console.log(`  uploaded as ${uploaded.fileId} (${uploaded.bytes} bytes)`);
} catch (err) {
  if (err instanceof QuotaExhaustedError) {
    console.error(`\nMoonshot quota exhausted on upload: ${err.message}`);
    process.exit(2);
  }
  throw err;
}

console.log(`Fetching parsed file content…`);
const fileText = await fetchMoonshotFileContent(uploaded.fileId);
console.log(`  parsed text: ${(fileText.length / 1024).toFixed(1)} KB`);

console.log(`Calling ${MODEL} via Moonshot direct + Stage 1 extraction prompt (streaming)…`);
console.log(
  `(System prompt: ${(systemPrompt.length / 1024).toFixed(1)} KB / ~${Math.round(systemPrompt.length / 4)} tokens)`
);
console.log(`(Expected wall-clock: 10-20 min for streaming a ~50K-token response)`);

let result;
try {
  result = await callMoonshot({
    prompt: USER_PROMPT + STAGE1_JSON_OBJECT_SUFFIX,
    model: MODEL,
    systemPrompt,
    fileText,
    maxOutputTokens: MAX_OUTPUT_TOKENS,
    // temperature: 1 (default — K2.5 rejects other values).
  });
} catch (err) {
  if (err instanceof QuotaExhaustedError) {
    console.error(`\nMoonshot quota exhausted: ${err.message}`);
    process.exit(2);
  }
  if (err instanceof ParseError) {
    const raw = err.raw ?? "(no raw available)";
    console.error(`\nMoonshot returned unparseable response.`);
    console.error(`Raw response length: ${raw.length} chars`);
    console.error("─── First 1500 chars ───");
    console.error(raw.slice(0, 1500));
    console.error("─── Last 500 chars ───");
    console.error(raw.length > 1500 ? raw.slice(-500) : "(already shown above)");
    console.error("─── end ───");
    try {
      writeFileSync("./moonshot-raw-error.txt", raw);
      console.error("Full raw response saved to ./moonshot-raw-error.txt");
    } catch {}
    process.exit(3);
  }
  throw err;
}

const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
console.log(`\n${MODEL} returned in ${elapsed}s`);

// Persist + summarize.
//
// Shape handling: we ASK for { questions: [...] } via responseSchema,
// but Gemini occasionally returns the bare array [...] directly (the
// schema's outer object wrapper gets dropped, observed on the
// 202405us.pdf run #26321947286 — 100 KB of valid extraction data
// silently discarded because `result?.questions` was undefined).
// Accept both shapes so the pipeline doesn't throw away good output.
const rows = Array.isArray(result)
  ? result
  : Array.isArray(result?.questions)
    ? result.questions
    : [];
const stem = pdfName.replace(/\.pdf$/i, "");
const outPath = `/tmp/${stem}-gemini-extracted.json`;

// Fast-fail: if extraction returned nothing, the pipeline should NOT
// silently continue to write an empty CSV and import zero rows. Throw
// here so the orchestrator marks the job failed with a clear stage
// name and we know to debug the extraction step specifically.
if (rows.length === 0) {
  console.error(
    `Extraction returned 0 questions. Raw response was ${
      typeof result === "object"
        ? `an object with keys [${Object.keys(result ?? {}).join(", ") || "none"}]`
        : typeof result
    }. Aborting before downstream stages.`
  );
  process.exit(4);
}

// Normalize topic_cluster from domain first. It is 1:1 with domain, so
// it is fully derivable — Kimi occasionally emits granular skill names
// ("Vocabulary in Context") instead of one of the 8 canonical clusters,
// and there is no reason to trust the model for a derivable field.
const topicClustersFixed = deriveTopicClusters(rows);
if (topicClustersFixed > 0) {
  console.log(`Normalized topic_cluster from domain on ${topicClustersFixed} row(s).`);
}

// Post-extraction validation. Kimi JSON-object mode does NOT enforce
// enums / schema / taxonomy, so we validate every row in code. Issues
// that map obviously to a single row (invalid enum or concept_slug,
// malformed choices, missing answer, R&W/Math passage rules, passage
// duplicated into question_text) flip that row to needs_review;
// aggregate problems (low counts, missing question numbers, non-
// sequential extraction_order) surface as warnings for a human. Never
// fabricates or deletes rows. Logic + tests live in
// scripts/lib/extraction-validation.mjs.
const validation = validateExtraction(rows);
const newlyFlagged = flagRowsNeedingReview(rows, validation);

writeFileSync(outPath, JSON.stringify(rows, null, 2));
console.log(`Wrote ${rows.length} questions to ${outPath}`);
console.log("");
console.log("VALIDATION".padEnd(72, "─"));
console.log(formatValidationReport(validation));
if (newlyFlagged > 0) {
  console.log(`  → flagged ${newlyFlagged} additional row(s) needs_review from validation`);
}

// Sanity-check distribution. MATH_DOMAINS comes from
// extraction-coverage.mjs so the math/RW split here uses the same
// classification as the under-extraction guard below.
const byDomain = {};
const byCluster = {};
const byDifficulty = {};
const byFormat = {};
const flagged = [];
let math = 0;
let rw = 0;
for (const r of rows) {
  byDomain[r.domain] = (byDomain[r.domain] ?? 0) + 1;
  byCluster[r.topic_cluster] = (byCluster[r.topic_cluster] ?? 0) + 1;
  byDifficulty[r.difficulty] = (byDifficulty[r.difficulty] ?? 0) + 1;
  byFormat[r.question_format] = (byFormat[r.question_format] ?? 0) + 1;
  if (MATH_DOMAINS.has(r.domain)) math++;
  else rw++;
  if (r.import_status === "needs_review") {
    flagged.push({ page: r.source_page, reason: r.import_flag_reason ?? "(no reason given)" });
  }
}

console.log("");
console.log("═".repeat(72));
console.log(`SUMMARY — ${pdfName}`);
console.log("═".repeat(72));
console.log(`Total questions: ${rows.length}`);
console.log(`Math vs R&W: ${math} math / ${rw} R&W`);
console.log("");
console.log("By domain:");
for (const [d, n] of Object.entries(byDomain).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${d.padEnd(20)} ${n}`);
}
console.log("");
console.log("By difficulty:");
for (const d of [1, 2, 3, 4, 5, 6, 7]) {
  if (byDifficulty[d]) console.log(`  ${d}: ${byDifficulty[d]}`);
}
console.log("");
console.log("By format:");
for (const [f, n] of Object.entries(byFormat)) {
  console.log(`  ${f}: ${n}`);
}
console.log("");
console.log(`Flagged for review: ${flagged.length}`);
for (const f of flagged.slice(0, 10)) {
  console.log(`  p${f.page}: ${f.reason}`);
}
if (flagged.length > 10) console.log(`  … and ${flagged.length - 10} more`);

// Under-extraction guard — catches the continuation-page bug that
// shipped on 202406asiav2.pdf (page 79 was a duplicate-graph
// continuation with 3 new questions below; the LLM skipped the entire
// page, losing 3 math questions). The prompt now warns about this
// pattern, but we also enforce it here so it can't slip past silently
// if the LLM ignores the guidance. Logic lives in
// scripts/lib/extraction-coverage.mjs so it's unit-tested.
const coverage = analyzeCoverage(rows);
if (coverage.reasons.length || coverage.gaps.length) {
  console.log("");
  console.log("⚠ UNDER-EXTRACTION GUARD".padEnd(72, "─"));
  for (const r of coverage.reasons) console.log(`  · ${r}`);
  if (coverage.gaps.length) {
    console.log(
      `  · ${coverage.gaps.length} page${coverage.gaps.length === 1 ? "" : "s"} skipped inside the extracted range — likely missed continuations:`
    );
    for (const g of coverage.gaps.slice(0, 10)) {
      console.log(
        `      ${g.subject} p.${g.page} (between p.${g.between[0]} and p.${g.between[1]})`
      );
    }
    if (coverage.gaps.length > 10) console.log(`      … and ${coverage.gaps.length - 10} more`);
  }
  console.log(
    "  Re-extract or manually inspect the missing pages — these would be silently lost otherwise."
  );
}

console.log("");
console.log(`Inspect: cat ${outPath} | jq '.[0]'`);
