// ============================================================
// extract-question-crops — v2 phase 3.
//
// For a given PDF that's already imported into quiz_questions,
// walk every page that has a row on it:
//
//   1. Render the page via pdftoppm @ 200 DPI
//   2. Upload page PNG → R2 → source_assets:page_image
//   3. Call Gemini Flash on the page PNG → detected questions
//      with bboxes + completeness flags + passage/choice snippets
//   4. Match each detection to a quiz_questions row via the
//      7-step hierarchy (scripts/lib/question-matcher.mjs)
//   5. Crop tight + expanded versions, upload both → source_assets
//      with match_method + match_confidence metadata
//   6. Cache question_bbox + confidence + source_asset_id on
//      quiz_questions; flip source_assets_processed_at + _status
//   7. Write summary block to stdout + pdf_processing_jobs.progress
//
// SAFETY:
//   · --force preserves source_assets rows where
//     validation_status='admin_verified'
//   · --force --include-admin-verified deletes everything
//   · Pre-Phase-3 v1 rows are unaffected unless the operator
//     explicitly runs the backfill on their PDF
//
// COST (~80-page PDF):
//   · Page renders                          free
//   · Gemini Flash bbox per page (~80)      ~$0.05
//   · R2 uploads (~80 + 196 crops)          free (storage ~63 MB)
//
// Total: ~$0.05/PDF.
//
// Spec: docs/ingestion/pipeline-v2-redesign-plan.md §1492+
// Plan: docs/ingestion/pipeline-v2-phase3-implementation-plan.md
//
// USAGE
//   node --env-file=.env.local \
//     scripts/pdf-pipeline/extract-question-crops.mjs <pdf-path> \
//     --source-pdf <filename> [--job-id <uuid>] [--no-db] \
//     [--force] [--include-admin-verified]
// ============================================================

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { basename, join } from "node:path";
import { tmpdir } from "node:os";
import { randomUUID, createHash } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { callGemini, QuotaExhaustedError } from "../lib/llm-providers.mjs";
import { renderPdfPage } from "../lib/page-render.mjs";
import { matchPageDetections, processedStatusFromMatch } from "../lib/question-matcher.mjs";

// ── CLI parsing ──────────────────────────────────────────────
const args = process.argv.slice(2);
const pdfArg = args.find((a) => !a.startsWith("--") && a.endsWith(".pdf"));
if (!pdfArg) {
  console.error(
    "Usage: extract-question-crops.mjs <pdf-path> --source-pdf <name> [--job-id <uuid>]"
  );
  process.exit(1);
}
function getFlag(name) {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : null;
}
const SOURCE_PDF = getFlag("--source-pdf") ?? basename(pdfArg);
const JOB_ID = getFlag("--job-id");
const OUT = getFlag("--out") ?? join(tmpdir(), `${basename(pdfArg, ".pdf")}-crops.json`);
const NO_DB = args.includes("--no-db");
const FORCE = args.includes("--force");
const INCLUDE_ADMIN_VERIFIED = args.includes("--include-admin-verified");

if (INCLUDE_ADMIN_VERIFIED && !FORCE) {
  console.error("--include-admin-verified requires --force.");
  process.exit(1);
}

// ── Env + clients ────────────────────────────────────────────
const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPA_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!NO_DB && (!SUPA_URL || !SUPA_KEY)) {
  console.error("Set NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (or pass --no-db).");
  process.exit(1);
}
if (!process.env.GEMINI_API_KEY) {
  console.error("Set GEMINI_API_KEY.");
  process.exit(1);
}

const supabase = NO_DB
  ? null
  : createClient(SUPA_URL, SUPA_KEY, { auth: { persistSession: false } });

// Run metadata stamped on every source_assets row this script writes.
const RUN_ID = randomUUID();
const RUN_METADATA = {
  phase: "phase3_question_crops",
  run_id: RUN_ID,
  model: "gemini-2.5-flash",
};
const RUN_STARTED_AT = new Date().toISOString();

// ── R2 upload helper ─────────────────────────────────────────
async function uploadPngToR2(buf, key) {
  if (NO_DB) return { publicUrl: `file://${key}`, key };
  const { S3Client, PutObjectCommand } = await import("@aws-sdk/client-s3");
  const r2 = new S3Client({
    region: "auto",
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
  });
  await r2.send(
    new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: key,
      Body: buf,
      ContentType: "image/png",
      CacheControl: "public, max-age=31536000, immutable",
    })
  );
  const base = (process.env.R2_PUBLIC_URL ?? "").replace(/\/$/, "");
  return { publicUrl: `${base}/${key}`, key };
}

// ── Gemini Flash bbox detection prompt + schema ──────────────
const DETECT_PROMPT = `You are looking at one page of an SAT practice test.

For every QUESTION visible on this page, return its bounding box AND
report whether the crop is COMPLETE.

A question is:
- A stem text (with or without a question mark)
- Optionally followed by answer choices A-D (multiple choice)
- Optionally with an associated figure or passage

INCLUDE in each bbox:
- The question number (e.g. "17.")
- The full stem text
- All four answer choices (if MC)
- Inline figures that are part of the question
- The passage if the question's answer depends on it AND the passage is on this page

EXCLUDE:
- Page headers and footers
- Module / section title text ("Module 1: Reading and Writing")
- Calculator / Desmos sidebars on math pages
- Other questions on the same page

For each detected question return:
- source_question_number: the question number printed on the page, or null
- stem_snippet: the first 80 characters of the stem text
- passage_snippet: the first 80 characters of the relevant passage, or null
- choice_snippets: { A, B, C, D } first 40 chars each, or null for non-MC
- bbox: [y_min, x_min, y_max, x_max] in Gemini's 0-1000 normalized space (Y BEFORE X)
- confidence: 0.0-1.0
- contains_full_question_stem: boolean
- contains_passage_if_present: boolean (true if no passage required)
- contains_answer_choices_if_mcq: boolean (true if not MCQ)
- contains_embedded_visual_if_present: boolean (true if no visual required)
- notes: short caveat, e.g. "passage continues onto next page"

Return strictly { "detected_questions": [...] }.`;

const DETECT_SCHEMA = {
  type: "OBJECT",
  properties: {
    detected_questions: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          source_question_number: { type: "INTEGER", nullable: true },
          stem_snippet: { type: "STRING" },
          passage_snippet: { type: "STRING", nullable: true },
          choice_snippets: {
            type: "OBJECT",
            nullable: true,
            properties: {
              A: { type: "STRING" },
              B: { type: "STRING" },
              C: { type: "STRING" },
              D: { type: "STRING" },
            },
          },
          bbox: { type: "ARRAY", items: { type: "NUMBER" } },
          confidence: { type: "NUMBER" },
          contains_full_question_stem: { type: "BOOLEAN" },
          contains_passage_if_present: { type: "BOOLEAN" },
          contains_answer_choices_if_mcq: { type: "BOOLEAN" },
          contains_embedded_visual_if_present: { type: "BOOLEAN" },
          notes: { type: "STRING", nullable: true },
        },
        required: [
          "bbox",
          "stem_snippet",
          "confidence",
          "contains_full_question_stem",
          "contains_passage_if_present",
          "contains_answer_choices_if_mcq",
          "contains_embedded_visual_if_present",
        ],
      },
    },
  },
  required: ["detected_questions"],
};

async function detectQuestionsOnPage(pagePngBuf) {
  const result = await callGemini({
    model: "gemini-2.5-flash",
    image: { mime: "image/png", buf: pagePngBuf },
    prompt: DETECT_PROMPT,
    responseSchema: DETECT_SCHEMA,
    maxOutputTokens: 8192,
    thinkingBudget: 1024,
  });
  return result.detected_questions ?? [];
}

// ── Crop math ────────────────────────────────────────────────
function bboxToPixelRect(bbox, pageWidth, pageHeight) {
  const [y_min, x_min, y_max, x_max] = bbox.map((v) => Math.max(0, Math.min(1000, v)));
  return {
    top: Math.floor((y_min / 1000) * pageHeight),
    left: Math.floor((x_min / 1000) * pageWidth),
    width: Math.max(20, Math.floor(((x_max - x_min) / 1000) * pageWidth)),
    height: Math.max(20, Math.floor(((y_max - y_min) / 1000) * pageHeight)),
  };
}

function expandRect(rect, pageWidth, pageHeight) {
  // Per spec §3.3: max(20% of bbox dim, 80 px), clamped to page.
  const MIN_PAD = 80;
  const pad_x = Math.max(rect.width * 0.2, MIN_PAD);
  const pad_y = Math.max(rect.height * 0.2, MIN_PAD);
  const top = Math.max(0, Math.floor(rect.top - pad_y));
  const left = Math.max(0, Math.floor(rect.left - pad_x));
  const right = Math.min(pageWidth, Math.floor(rect.left + rect.width + pad_x));
  const bottom = Math.min(pageHeight, Math.floor(rect.top + rect.height + pad_y));
  return { top, left, width: right - left, height: bottom - top };
}

async function cropPng(pagePngPath, rect) {
  const sharp = (await import("sharp")).default;
  return await sharp(pagePngPath)
    .extract({ top: rect.top, left: rect.left, width: rect.width, height: rect.height })
    .png({ compressionLevel: 9 })
    .toBuffer();
}

// ── Crop_complete computation ────────────────────────────────
function cropComplete(detection) {
  return (
    detection.contains_full_question_stem &&
    detection.contains_passage_if_present &&
    detection.contains_answer_choices_if_mcq &&
    detection.contains_embedded_visual_if_present
  );
}

// ── --force cleanup ──────────────────────────────────────────
async function cleanupExistingAssetsForceMode() {
  if (!supabase) return;
  const types = ["page_image", "question_crop", "expanded_question_crop"];
  let query = supabase
    .from("source_assets")
    .delete({ count: "exact" })
    .eq("source_pdf", SOURCE_PDF)
    .in("asset_type", types);
  if (!INCLUDE_ADMIN_VERIFIED) {
    // Preserve admin-verified rows
    query = query.or("validation_status.is.null,validation_status.neq.admin_verified");
  }
  const { count, error } = await query;
  if (error) {
    throw new Error(`--force cleanup failed: ${error.message}`);
  }
  console.log(
    `  --force: deleted ${count ?? 0} source_assets rows${INCLUDE_ADMIN_VERIFIED ? " (incl. admin-verified)" : " (preserved admin-verified)"}`
  );

  // Reset the processing markers on quiz_questions
  await supabase
    .from("quiz_questions")
    .update({
      source_assets_processed_at: null,
      source_assets_processed_status: null,
    })
    .eq("source_pdf", SOURCE_PDF);
}

// ── Main ─────────────────────────────────────────────────────
async function main() {
  console.log(`extract-question-crops on ${pdfArg}`);
  console.log(`  source_pdf=${SOURCE_PDF}${JOB_ID ? ` job_id=${JOB_ID}` : ""}`);
  console.log(`  run_id=${RUN_ID}`);
  if (NO_DB) console.log("  --no-db: skipping every DB write");
  if (FORCE) {
    console.log(
      `  --force${INCLUDE_ADMIN_VERIFIED ? " --include-admin-verified" : ""}: cleaning up existing assets…`
    );
    await cleanupExistingAssetsForceMode();
  }

  // Fetch all quiz_questions rows for this source_pdf, grouped by page.
  const rowsByPage = await loadQuizRowsByPage();
  const pageNumbers = Array.from(rowsByPage.keys()).sort((a, b) => a - b);
  console.log(
    `  found ${pageNumbers.length} pages with quiz_questions rows (total ${Array.from(rowsByPage.values()).flat().length} rows)`
  );

  // Per-PDF summary counters
  const summary = {
    source_pdf: SOURCE_PDF,
    run_id: RUN_ID,
    pages_rendered: 0,
    detected_questions: 0,
    question_crops_created: 0,
    expanded_crops_created: 0,
    matched_crops: 0,
    orphan_crops: 0,
    db_rows_without_crops: 0,
    low_confidence_crops: 0,
    incomplete_crops: 0,
    match_method_distribution: {
      page_question_number: 0,
      page_passage_snippet: 0,
      page_choice_snippets: 0,
      page_stem_snippet: 0,
      ordered_fallback: 0,
      orphan: 0,
    },
    page_failures: [],
  };

  // Per-row outcome map (rowId → { matched, method, confidence, status })
  // Used at the end to flip source_assets_processed_at + _status.
  const rowOutcomes = new Map();

  const workdir = join(tmpdir(), `crops-${RUN_ID}`);
  mkdirSync(workdir, { recursive: true });
  const pdfStem = basename(pdfArg, ".pdf");
  const r2Prefix = `question-crops/${JOB_ID ?? pdfStem}`;

  // Walk each page
  for (const page of pageNumbers) {
    const rowsOnPage = rowsByPage.get(page) ?? [];
    if (rowsOnPage.length === 0) continue;
    console.log(`\n— page ${page}: ${rowsOnPage.length} row(s)`);

    // 1. Render
    let pageRender;
    try {
      pageRender = await renderPdfPage(pdfArg, page, { outDir: workdir });
    } catch (err) {
      summary.page_failures.push({ page, step: "render", error: err.message });
      console.log(`  ✗ render failed: ${err.message}`);
      for (const r of rowsOnPage)
        rowOutcomes.set(r.id, { method: "page_render_failed", status: "failed" });
      continue;
    }
    summary.pages_rendered++;

    // 2. Upload page PNG
    const pageBuf = readFileSync(pageRender.pngPath);
    const pageKey = `${r2Prefix}/page-${page}.png`;
    const { publicUrl: pagePublicUrl } = await uploadPngToR2(pageBuf, pageKey);

    let pageAssetId = null;
    if (!NO_DB) {
      const { data: pageRow, error: pageErr } = await supabase
        .from("source_assets")
        .insert({
          question_id: null,
          source_pdf: SOURCE_PDF,
          page_number: page,
          pdf_job_id: JOB_ID ?? null,
          asset_type: "page_image",
          asset_path: pageKey,
          public_url: pagePublicUrl,
          validation_status: "rendered_at_200dpi",
          relevance: "required",
          use_in_solving: true,
          raw_metadata: {
            ...RUN_METADATA,
            dpi: 200,
            page_width: pageRender.width,
            page_height: pageRender.height,
          },
        })
        .select("id")
        .single();
      if (pageErr) {
        console.log(`  ✗ page_image insert: ${pageErr.message}`);
        summary.page_failures.push({ page, step: "page_image_insert", error: pageErr.message });
      } else {
        pageAssetId = pageRow.id;
      }
    }

    // 3. Detect questions on this page
    let detections = [];
    try {
      detections = await detectQuestionsOnPage(pageBuf);
    } catch (err) {
      if (err instanceof QuotaExhaustedError) {
        console.log("  QUOTA EXHAUSTED — stopping early; summary will reflect partial.");
        break;
      }
      summary.page_failures.push({ page, step: "detect", error: err.message });
      for (const r of rowsOnPage)
        rowOutcomes.set(r.id, { method: "detection_failed", status: "failed" });
      continue;
    }
    console.log(`  → ${detections.length} detection(s)`);
    summary.detected_questions += detections.length;

    if (detections.length === 0) {
      for (const r of rowsOnPage)
        rowOutcomes.set(r.id, { method: "detection_failed", status: "failed" });
      continue;
    }

    // 4. Run the matching hierarchy across the page's detections
    const matchResults = matchPageDetections(detections, rowsOnPage);

    // 5 + 6. Per-detection: crop, upload, write source_assets rows,
    //         update quiz_questions for matched rows.
    for (let i = 0; i < matchResults.length; i++) {
      const { detected, matched, method, confidence } = matchResults[i];
      summary.match_method_distribution[method] =
        (summary.match_method_distribution[method] ?? 0) + 1;
      if (matched) summary.matched_crops++;
      else summary.orphan_crops++;
      if (confidence < 0.75) summary.low_confidence_crops++;
      const isComplete = cropComplete(detected);
      if (!isComplete) summary.incomplete_crops++;

      const tight = bboxToPixelRect(detected.bbox, pageRender.width, pageRender.height);
      const expanded = expandRect(tight, pageRender.width, pageRender.height);

      // Crop the two PNGs from the page render
      let tightBuf, expandedBuf;
      try {
        tightBuf = await cropPng(pageRender.pngPath, tight);
        expandedBuf = await cropPng(pageRender.pngPath, expanded);
      } catch (err) {
        console.log(`  ✗ crop ${i + 1}/${matchResults.length} failed: ${err.message}`);
        continue;
      }

      // R2 keys — orphan uses an index suffix; matched uses q-number-or-id
      const qSlug = matched ? matched.id.slice(0, 8) : `orphan-${i + 1}`;
      const tightKey = `${r2Prefix}/p${page}-q${qSlug}.png`;
      const expandedKey = `${r2Prefix}/p${page}-q${qSlug}-expanded.png`;
      const { publicUrl: tightUrl } = await uploadPngToR2(tightBuf, tightKey);
      const { publicUrl: expandedUrl } = await uploadPngToR2(expandedBuf, expandedKey);

      // Build the source_assets row payloads
      const commonFields = {
        source_pdf: SOURCE_PDF,
        page_number: page,
        pdf_job_id: JOB_ID ?? null,
        parent_asset_id: pageAssetId,
        bbox: {
          y_min: detected.bbox[0],
          x_min: detected.bbox[1],
          y_max: detected.bbox[2],
          x_max: detected.bbox[3],
        },
        crop_complete: isComplete,
        match_method: method,
        match_confidence: confidence,
        matched_source_question_number: detected.source_question_number ?? null,
        validation_status: matched ? "matched" : "orphan_unmatched_question_crop",
        relevance: matched ? "required" : "uncertain",
        notes: detected.notes ?? null,
      };

      let tightAssetId = null;
      if (!NO_DB) {
        const tightPayload = {
          ...commonFields,
          question_id: matched?.id ?? null,
          asset_type: "question_crop",
          asset_path: tightKey,
          public_url: tightUrl,
          raw_metadata: {
            ...RUN_METADATA,
            detection: detected,
            crop_kind: "tight",
          },
        };
        const { data: tightRow, error: tErr } = await supabase
          .from("source_assets")
          .insert(tightPayload)
          .select("id")
          .single();
        if (tErr) {
          console.log(`  ✗ question_crop insert: ${tErr.message}`);
        } else {
          tightAssetId = tightRow.id;
          summary.question_crops_created++;
        }

        const expandedPayload = {
          ...commonFields,
          question_id: matched?.id ?? null,
          asset_type: "expanded_question_crop",
          asset_path: expandedKey,
          public_url: expandedUrl,
          raw_metadata: {
            ...RUN_METADATA,
            detection: detected,
            crop_kind: "expanded",
            padding_rule: "max(20%,80px)",
          },
        };
        const { error: eErr } = await supabase.from("source_assets").insert(expandedPayload);
        if (eErr) {
          console.log(`  ✗ expanded_question_crop insert: ${eErr.message}`);
        } else {
          summary.expanded_crops_created++;
        }
      } else {
        summary.question_crops_created++;
        summary.expanded_crops_created++;
      }

      // 6. Cache bbox on quiz_questions for the MATCHED row.
      if (matched && tightAssetId && !NO_DB) {
        await supabase
          .from("quiz_questions")
          .update({
            question_bbox: {
              y_min: detected.bbox[0],
              x_min: detected.bbox[1],
              y_max: detected.bbox[2],
              x_max: detected.bbox[3],
              page_width: pageRender.width,
              page_height: pageRender.height,
              confidence: detected.confidence,
            },
            question_bbox_confidence: detected.confidence,
            question_bbox_source_asset_id: tightAssetId,
          })
          .eq("id", matched.id);
      }

      // Record outcome for status flipping at the end
      if (matched) {
        rowOutcomes.set(matched.id, {
          method,
          status: processedStatusFromMatch({ method, confidence }, detected),
        });
      }
    }

    // Identify DB rows on this page that never got a crop
    const matchedRowIds = new Set(matchResults.filter((r) => r.matched).map((r) => r.matched.id));
    for (const r of rowsOnPage) {
      if (!matchedRowIds.has(r.id)) {
        summary.db_rows_without_crops++;
        rowOutcomes.set(r.id, { method: "no_match_orphan_crops_only", status: "partial" });
      }
    }
  }

  // 6 (final pass). Mark every row in this PDF as processed.
  if (!NO_DB) {
    console.log("\nMarking quiz_questions.source_assets_processed_at…");
    const now = new Date().toISOString();
    // Group rows by their derived status so we can do fewer UPDATEs.
    const byStatus = new Map();
    for (const r of Array.from(rowsByPage.values()).flat()) {
      const outcome = rowOutcomes.get(r.id) ?? { status: "skipped" };
      if (!byStatus.has(outcome.status)) byStatus.set(outcome.status, []);
      byStatus.get(outcome.status).push(r.id);
    }
    for (const [status, ids] of byStatus.entries()) {
      const { error } = await supabase
        .from("quiz_questions")
        .update({ source_assets_processed_at: now, source_assets_processed_status: status })
        .in("id", ids);
      if (error) console.log(`  ✗ mark ${status}: ${error.message}`);
      else console.log(`  → ${ids.length} rows marked ${status}`);
    }
  }

  // 7. Write summary sidecar + push to pdf_processing_jobs.progress
  writeFileSync(OUT, JSON.stringify({ ...summary, run_started_at: RUN_STARTED_AT }, null, 2));
  console.log(`\nSummary sidecar: ${OUT}`);

  if (JOB_ID && !NO_DB) {
    await pushSummaryToJobProgress(summary);
  }

  // Final stdout summary block
  console.log("");
  console.log("═".repeat(60));
  console.log("Phase 3 source-asset extraction complete");
  console.log("═".repeat(60));
  for (const [k, v] of Object.entries(summary)) {
    if (k === "page_failures" || k === "match_method_distribution") continue;
    console.log(`  ${k.padEnd(35)} ${typeof v === "object" ? JSON.stringify(v) : v}`);
  }
  console.log("  match_method_distribution:");
  for (const [m, n] of Object.entries(summary.match_method_distribution)) {
    console.log(`    ${m.padEnd(32)} ${n}`);
  }
  if (summary.page_failures.length > 0) {
    console.log(`  page_failures: ${summary.page_failures.length}`);
    for (const f of summary.page_failures.slice(0, 5)) {
      console.log(`    page ${f.page} ${f.step}: ${f.error.slice(0, 80)}`);
    }
  }
}

async function loadQuizRowsByPage() {
  if (NO_DB) return new Map();
  const { data, error } = await supabase
    .from("quiz_questions")
    .select(
      "id, source_pdf, source_page, question_text, passage, passage_a, passage_b, passage_intro, answer_choices(letter, choice_text)"
    )
    .eq("source_pdf", SOURCE_PDF)
    .order("source_page")
    .order("id");
  if (error) throw error;

  // If not --force, skip rows already processed
  let rows = data ?? [];
  if (!FORCE) {
    const { data: processedRows } = await supabase
      .from("quiz_questions")
      .select("id")
      .eq("source_pdf", SOURCE_PDF)
      .not("source_assets_processed_at", "is", null);
    const processed = new Set((processedRows ?? []).map((r) => r.id));
    rows = rows.filter((r) => !processed.has(r.id));
  }

  const byPage = new Map();
  for (const r of rows) {
    if (r.source_page == null) continue;
    if (!byPage.has(r.source_page)) byPage.set(r.source_page, []);
    byPage.get(r.source_page).push(r);
  }
  return byPage;
}

async function pushSummaryToJobProgress(summary) {
  try {
    const { data: job, error: getErr } = await supabase
      .from("pdf_processing_jobs")
      .select("progress")
      .eq("id", JOB_ID)
      .maybeSingle();
    if (getErr || !job) return;
    const progress = job.progress ?? {};
    progress.crops_summary = summary;
    await supabase.from("pdf_processing_jobs").update({ progress }).eq("id", JOB_ID);
  } catch (err) {
    console.log(`  (job progress write failed, non-fatal: ${err.message ?? err})`);
  }
}

// Quiet the lint check — content_hash import is from node:crypto, used by future runs
void createHash;

main().catch((err) => {
  console.error("FATAL:", err.message);
  process.exit(1);
});
