#!/usr/bin/env node

// ============================================================
// extract-figure-structure — Stage 6.5 (Phase 9A): figure-structure
// enrichment.
//
// Runs POST-IMPORT, after Stage 6 (visual relevance) and before Stage 7
// (math repair). For every figure-bearing question it:
//
//   1. CLASSIFIES the figure crop (image_url) — table / chart / graph /
//      geometric / 3d_shape / other (cheap Gemini Flash call).
//   2. For a TABLE: extracts { caption, header_row, rows, footer_note }
//      and STRUCTURALLY validates it (rectangular rows, header/width
//      match, non-empty cells).
//        · valid  → writes figure_table_data + figure_kind='table' so
//                   QuestionTable.tsx renders an accessible HTML table.
//        · broken → keeps the screenshot (figure_kind unchanged), records
//                   the schema errors in figure_quality, and writes a
//                   NOTICE figure_coherence finding. Failure is explicit.
//   3. For every OTHER kind: 9A only RENDERS tables, so the row keeps its
//      screenshot. We still record the classification in figure_quality
//      (cheap) so 9B-9E start with a head-start + the row is marked done.
//
// Why this is post-import enrichment, not a pre-import gate: a failed
// structured extraction must never block question existence — the row
// already has a screenshot fallback. (proposal Decision 5 + §"placement")
//
// Idempotent: only touches rows where figure_quality IS NULL (the
// migration's idx_quiz_questions_figure_pending_structure predicate).
//
// USAGE
//   node --env-file=.env.local scripts/pdf-pipeline/extract-figure-structure.mjs \
//     --source-pdf 202605asiav1.pdf [--limit N] [--dry-run] [--no-llm] \
//     [--question-id <uuid>] [--model gemini-2.5-flash]
//
// COST  ~1 classify + (tables only) 1 extract Gemini Flash call per
//       figure row. ~$0.26 / PDF (proposal §"Cost").
// ============================================================

import { createClient } from "@supabase/supabase-js";
import { callGemini } from "../lib/llm-providers.mjs";
import { upsertFinding, SEVERITY, AUDIT_MODULES } from "../lib/findings.mjs";
import {
  CLASSIFY_PROMPT,
  buildTableExtractPrompt,
  normalizeTableData,
  validateTableData,
  tableAltText,
  buildFigureQuality,
  VALIDATION_STATUS,
  FALLBACK_LEVEL,
} from "../lib/figure-extraction-logic.mjs";
import { fetchImageBuffer, FETCH_OUTCOME } from "../lib/fetch-image.mjs";

const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");
const NO_LLM = args.includes("--no-llm");
const flagVal = (name) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : null;
};
const SOURCE_PDF = flagVal("source-pdf");
const QUESTION_ID = flagVal("question-id");
const LIMIT = flagVal("limit") ? Number(flagVal("limit")) : null;
const MODEL = flagVal("model") ?? "gemini-2.5-flash";

if (!SOURCE_PDF && !QUESTION_ID) {
  console.error("Usage: extract-figure-structure.mjs --source-pdf <name> [--limit N] [--dry-run]");
  process.exit(1);
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

// ── helpers ──────────────────────────────────────────────────
// (image fetch is the shared resilient fetchImageBuffer — see
//  scripts/lib/fetch-image.mjs.)

// callGemini returns a parsed object in json mode, but be defensive in
// case a provider tweak ever returns the raw string.
function asObject(resp) {
  if (resp && typeof resp === "object") return resp;
  if (typeof resp === "string") {
    try {
      return JSON.parse(resp);
    } catch {
      return null;
    }
  }
  return null;
}

async function visionJson(prompt, image) {
  const resp = await callGemini({
    prompt,
    image,
    model: MODEL,
    json: true,
    maxOutputTokens: 4096,
    ...(MODEL.includes("flash") ? { thinkingBudget: 0 } : {}),
  });
  return asObject(resp);
}

const SELECT = "id, question_text, image_url, image_alt, figure_kind, source_pdf, source_page";

async function selectRows() {
  let q = supabase.from("quiz_questions").select(SELECT).not("image_url", "is", null);
  if (QUESTION_ID) q = q.eq("id", QUESTION_ID);
  else if (SOURCE_PDF) q = q.eq("source_pdf", SOURCE_PDF);
  // Idempotent: skip rows already structure-enriched.
  q = q.is("figure_quality", null);
  if (LIMIT) q = q.limit(LIMIT);
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

async function writeRow(id, patch) {
  if (DRY_RUN) return;
  const { error } = await supabase
    .from("quiz_questions")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(`write ${id}: ${error.message}`);
}

// ── per-row enrichment ───────────────────────────────────────

async function enrichTable(row, image, classification) {
  const extracted = asObject(await visionJson(buildTableExtractPrompt(row.question_text), image));
  if (!extracted) {
    // Got a response we couldn't parse — keep screenshot, mark done so we
    // don't loop, capture why.
    await writeRow(row.id, {
      figure_extraction_model: MODEL,
      figure_quality: buildFigureQuality({
        validationStatus: VALIDATION_STATUS.EXTRACTION_FAILED,
        usedFallbackLevel: FALLBACK_LEVEL.SCREENSHOT,
        schemaErrors: ["extract_unparseable: table extractor returned no usable JSON"],
        classifiedAs: "table",
        modelCalledItA: classification.model_called_it_a ?? null,
      }),
    });
    return "extract_failed";
  }

  const data = normalizeTableData(extracted);
  const result = validateTableData(data);
  const confidence =
    typeof extracted.confidence === "number" ? extracted.confidence : classification.confidence;

  if (!result.ok) {
    // Structurally broken → screenshot stays, record errors + finding.
    await writeRow(row.id, {
      figure_extraction_model: MODEL,
      figure_quality: buildFigureQuality({
        validationStatus: VALIDATION_STATUS.FALLBACK_USED,
        usedFallbackLevel: FALLBACK_LEVEL.SCREENSHOT,
        schemaErrors: result.errors,
        modelConfidence: confidence,
        classifiedAs: "table",
        modelCalledItA: classification.model_called_it_a ?? null,
      }),
    });
    await upsertFinding({
      supabase,
      questionId: row.id,
      category: AUDIT_MODULES.FIGURE_COHERENCE,
      code: "table_extraction_failed_validation",
      severity: SEVERITY.NOTICE,
      message: `Table extraction failed structural validation (${result.errors.length} error[s]); keeping screenshot.`,
      value: row.image_url,
      detail: { schema_errors: result.errors, warnings: result.warnings, model: MODEL },
      dryRun: DRY_RUN,
    });
    return "fallback";
  }

  // Valid (possibly with soft warnings) → publish the structured table.
  await writeRow(row.id, {
    figure_kind: "table",
    figure_table_data: data,
    figure_extraction_model: MODEL,
    figure_quality: buildFigureQuality({
      validationStatus:
        result.warnings.length > 0
          ? VALIDATION_STATUS.VALIDATED_WITH_WARNINGS
          : VALIDATION_STATUS.VALIDATED,
      usedFallbackLevel: FALLBACK_LEVEL.STRUCTURED,
      schemaErrors: [],
      modelConfidence: confidence,
      altText: tableAltText(data),
      classifiedAs: "table",
      modelCalledItA: classification.model_called_it_a ?? null,
    }),
  });
  return result.warnings.length > 0 ? "table_warn" : "table";
}

async function enrichDeferred(row, classification) {
  // 9A renders only tables. Record the classification so 9B-9E have a
  // head start and the row is marked processed; rendering stays screenshot.
  await writeRow(row.id, {
    figure_extraction_model: MODEL,
    figure_quality: buildFigureQuality({
      validationStatus: VALIDATION_STATUS.FALLBACK_USED,
      usedFallbackLevel: FALLBACK_LEVEL.SCREENSHOT,
      modelConfidence: classification.confidence,
      altText: row.image_alt ?? null,
      classifiedAs: classification.figure_kind,
      modelCalledItA: classification.model_called_it_a ?? null,
    }),
  });
  return "deferred";
}

async function main() {
  console.log(`Phase 9A — extract-figure-structure (model: ${MODEL}${DRY_RUN ? ", dry-run" : ""})`);
  const rows = await selectRows();
  console.log(`  ${rows.length} figure-bearing row(s) pending structure enrichment`);
  if (rows.length === 0 || NO_LLM) {
    if (NO_LLM) console.log("  --no-llm: not calling the model.");
    return;
  }

  const tally = {
    table: 0,
    table_warn: 0,
    fallback: 0,
    deferred: 0,
    extract_failed: 0,
    crop_missing: 0,
    skipped: 0,
  };

  for (const [i, row] of rows.entries()) {
    const tag = `[${i + 1}/${rows.length}] ${row.source_pdf ?? "?"} p${row.source_page ?? "?"}`;
    const fetched = await fetchImageBuffer(row.image_url);
    if (!fetched.ok) {
      if (fetched.outcome === FETCH_OUTCOME.PERMANENT) {
        // Crop is genuinely gone (404 / bad URL) — mark the row done so we
        // don't re-attempt forever; the screenshot stays as the fallback.
        await writeRow(row.id, {
          figure_extraction_model: MODEL,
          figure_quality: buildFigureQuality({
            validationStatus: VALIDATION_STATUS.EXTRACTION_FAILED,
            usedFallbackLevel: FALLBACK_LEVEL.SCREENSHOT,
            schemaErrors: [`crop_unfetchable: ${fetched.error}`],
          }),
        });
        console.log(
          `${tag}: crop permanently unfetchable (${fetched.error}) — marked, screenshot kept`
        );
        tally.crop_missing++;
        continue;
      }
      // Transient (network blip / 5xx / timeout survived retries) — leave
      // figure_quality NULL so the next run retries.
      console.log(
        `${tag}: transient fetch failure after ${fetched.attempts} attempt(s) (${fetched.error}) — skipping, will retry`
      );
      tally.skipped++;
      continue;
    }
    const image = { mime: fetched.mime, buf: fetched.buf };

    let classification;
    try {
      classification = asObject(await visionJson(CLASSIFY_PROMPT, image));
    } catch (err) {
      console.log(
        `${tag}: classify error (${String(err?.message ?? err).slice(0, 80)}) — skipping`
      );
      tally.skipped++;
      continue;
    }
    if (!classification?.figure_kind) {
      console.log(`${tag}: classify returned no kind — skipping`);
      tally.skipped++;
      continue;
    }

    let outcome;
    try {
      outcome =
        classification.figure_kind === "table"
          ? await enrichTable(row, image, classification)
          : await enrichDeferred(row, classification);
    } catch (err) {
      console.log(`${tag}: enrich error (${String(err?.message ?? err).slice(0, 80)}) — skipping`);
      tally.skipped++;
      continue;
    }
    tally[outcome] = (tally[outcome] ?? 0) + 1;
    const label =
      outcome === "table" || outcome === "table_warn"
        ? `TABLE → HTML${outcome === "table_warn" ? " (warnings)" : ""}`
        : outcome === "fallback"
          ? "table validation failed → screenshot"
          : outcome === "extract_failed"
            ? "table extract unparseable → screenshot"
            : `${classification.figure_kind} → screenshot (deferred to 9B+)`;
    console.log(`${tag}: ${label}`);
  }

  console.log("");
  console.log(
    `Done. tables: ${tally.table + tally.table_warn} (${tally.table_warn} w/ warnings), ` +
      `deferred non-tables: ${tally.deferred}, validation-fallbacks: ${tally.fallback}, ` +
      `extract-failed: ${tally.extract_failed}, crop-missing: ${tally.crop_missing}, ` +
      `skipped (transient, will retry): ${tally.skipped}.`
  );
  if (DRY_RUN) console.log("(dry-run — no writes)");
}

main().catch((err) => {
  console.error("FATAL:", err);
  process.exit(1);
});
