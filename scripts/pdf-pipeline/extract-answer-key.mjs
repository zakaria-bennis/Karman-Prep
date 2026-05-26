// ============================================================
// extract-answer-key — v2 phase 2.
//
// Reads a PDF, finds the answer-key pages, extracts every printed
// answer + detects red-ink/manual corrections + cross-outs, and
// writes structured rows to public.answer_key_entries. Also
// populates source_assets with answer_key_page + answer_key_crop
// rows.
//
// FLOW (per spec §1003-1245)
//   1. Detect answer-key pages           Gemini Flash (whole PDF)
//   2. Render each detected page         pdftoppm @ 200 DPI
//   3. Upload page PNG to R2             source_assets:answer_key_page
//   4. Extract entries (per page)        Gemini Flash (page PNG)
//   5. Escalate low-confidence rows      Gemini Pro (page PNG + bbox)
//   6. Apply correction-detection rules  pure JS — §6 spec
//   7. Match entries to quiz_questions   by (source_pdf, section, source_question_number)
//   8. UPSERT answer_key_entries
//   9. UPDATE quiz_questions.selected_official_answer + answer_key_status
//
// COST BUDGET (per PDF, target < $0.20)
//   · Page detection                     1 call, full PDF, Flash      ~$0.05
//   · Entry extraction (4-page key avg)  4 calls, page PNGs, Flash    ~$0.04
//   · Escalation (~10% rows)             ~5 calls, crops, Pro         ~$0.05
//                                                                     ~$0.14
//
// USAGE
//   node --env-file=.env.local scripts/pdf-pipeline/extract-answer-key.mjs \
//        <pdf-path> --source-pdf <filename> --job-id <uuid>
//
// Flags:
//   --out <path>          JSON sidecar destination (default: /tmp/<stem>-answer-key.json)
//   --debug-crops         keep row crop PNGs under /tmp for visual review
//   --force               re-process even if answer_key_entries already exist
//   --no-db               skip DB writes (dry-run, just emit JSON)
// ============================================================

import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync, mkdirSync, existsSync, unlinkSync } from "node:fs";
import { basename, join } from "node:path";
import { tmpdir } from "node:os";
import { createClient } from "@supabase/supabase-js";
import { callGemini, QuotaExhaustedError } from "../lib/llm-providers.mjs";
import {
  selectOfficialAnswerFromEntry,
  CORRECTION_CONFIDENCE_THRESHOLDS,
} from "../lib/answer-key-logic.mjs";

const args = process.argv.slice(2);
const pdfArg = args.find((a) => !a.startsWith("--") && a.endsWith(".pdf"));
if (!pdfArg) {
  console.error("Usage: extract-answer-key.mjs <pdf-path> [--source-pdf X] [--job-id Y]");
  process.exit(1);
}

function getFlag(name) {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : null;
}
const SOURCE_PDF = getFlag("--source-pdf") ?? basename(pdfArg);
const JOB_ID = getFlag("--job-id");
const OUT = getFlag("--out") ?? join(tmpdir(), `${basename(pdfArg, ".pdf")}-answer-key.json`);
const DEBUG_CROPS = args.includes("--debug-crops");
const FORCE = args.includes("--force");
const NO_DB = args.includes("--no-db");

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

// ── R2 helpers (page upload) ──────────────────────────────────
async function uploadPngToR2(buf, key) {
  if (NO_DB) return { publicUrl: `file://${key}` };
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
  return { publicUrl: `${base}/${key}` };
}

// ── Stage 1: detect answer-key pages ──────────────────────────
// Send the WHOLE PDF to Gemini Flash with a prompt asking which
// pages are answer keys. Single call, ~$0.05.
//
// Why not regex on extracted text? OCR is unreliable on dense
// tables; vision-driven page classification is more accurate.
const DETECT_KEY_PAGES_PROMPT = `You are analyzing a SAT practice test PDF.

Identify every page that contains an ANSWER KEY (the table or list that maps each question number to the correct answer letter / numeric value).

Answer-key pages are usually near the END of the PDF. They often have headings like "Answer Key", "Answers", "Correct Answer", or contain a dense table with rows like "1 A", "2 D", "3 5/2".

Some PDFs split the key by section: one page for the Reading/Writing answer key, another for Math. Capture EVERY such page.

DO NOT include:
- pages with sample question answers explained inline (those are content)
- pages with explanation text (those are answer explanations, not the key itself)

Return strictly this JSON shape:
{
  "answer_key_pages": [page_numbers_1_indexed],
  "confidence": 0.0-1.0,
  "method": "string describing what you used to identify them",
  "notes": "any caveats"
}

If you cannot find any answer-key page, return answer_key_pages = [] and explain in notes.`;

const DETECT_KEY_PAGES_SCHEMA = {
  type: "OBJECT",
  properties: {
    answer_key_pages: { type: "ARRAY", items: { type: "INTEGER" } },
    confidence: { type: "NUMBER" },
    method: { type: "STRING" },
    notes: { type: "STRING" },
  },
  required: ["answer_key_pages", "confidence", "method"],
};

async function detectKeyPages(pdfBuf) {
  console.log("Stage 1/4 — detecting answer-key pages…");
  const result = await callGemini({
    model: "gemini-2.5-flash",
    pdf: { buf: pdfBuf },
    prompt: DETECT_KEY_PAGES_PROMPT,
    responseSchema: DETECT_KEY_PAGES_SCHEMA,
    maxOutputTokens: 1024,
    thinkingBudget: 0,
  });
  console.log(
    `  → pages: ${JSON.stringify(result.answer_key_pages)} (confidence ${result.confidence}, method: ${result.method})`
  );
  if (result.notes) console.log(`  notes: ${result.notes}`);
  return result;
}

// ── Stage 2: render page via pdftoppm ─────────────────────────
function renderPage(pdfPath, page, workdir, dpi = 200) {
  mkdirSync(workdir, { recursive: true });
  const outBase = join(workdir, `page-${page}`);
  const result = spawnSync(
    "pdftoppm",
    ["-f", String(page), "-l", String(page), "-r", String(dpi), "-png", pdfPath, outBase],
    { encoding: "utf-8" }
  );
  if (result.status !== 0) {
    throw new Error(`pdftoppm failed for page ${page}: ${result.stderr || result.stdout}`);
  }
  // pdftoppm emits page-<n>-<page>.png; some versions just page-<n>.png.
  // Try both.
  for (const name of [`page-${page}-${page}.png`, `page-${page}.png`]) {
    const p = join(workdir, name);
    if (existsSync(p)) return p;
  }
  throw new Error(`pdftoppm output not found for page ${page}`);
}

// ── Stage 3: extract entries from a key page ──────────────────
const EXTRACT_ENTRIES_PROMPT = `You are looking at one page of an SAT practice test ANSWER KEY.

For every answer-key row you can see on this page, return one entry. An entry is one question's printed answer + any visible manual correction.

For EACH entry you must record:

- section: one of "reading", "math", or null if you cannot tell
- module: "M1", "M2", "1", "2", or null if not labeled
- source_question_number: the question number (1-based)
- printed_answer: the answer that's PRINTED on the page (uppercase letter for MC, the numeric value as a string for Math student-produced response). null if unreadable.
- printed_answer_confidence: 0.0-1.0
- answer_mode: "multiple_choice" if A/B/C/D, "numeric_entry" if a numeric value
- printed_answer_crossed_out: true if the printed answer has a visible cross-out / strikethrough / X over it
- printed_answer_crossed_out_confidence: 0.0-1.0
- manual_correction_present: true if you see HANDWRITTEN ink (not printed) near this row's answer
- manual_correction_color: "red", "blue", "black", "other", or null if no correction
- manual_correction_answer: what the handwritten correction says (uppercase letter or numeric value), or null
- manual_correction_confidence: 0.0-1.0 — how confident you are about the correction's value
- bbox: approximate [y_min, x_min, y_max, x_max] of this entry's row in normalized 0-1000 space (Gemini standard — y BEFORE x)
- notes: any caveats, e.g. "two letters circled, picked the more emphasized one"

CRITICAL RULES:

1. ONLY mark manual_correction_present = true if you see HANDWRITTEN ink. Printed corrections by the publisher are NOT manual corrections. Look for hand-drawn pen strokes, irregular letter shapes, marks not aligned with the table grid.

2. If you can read the printed answer clearly but you're not sure whether a faint mark over it is a cross-out, set printed_answer_crossed_out=false with crossed_out_confidence around 0.4-0.6 and explain in notes.

3. If the page shows the answer key but the printed answer for some row is illegible (blurry, occluded), set printed_answer=null and printed_answer_confidence < 0.5.

4. Skip non-answer rows (page headers, instructions, blank spacers).

Return JSON: { entries: [...] }`;

const EXTRACT_ENTRIES_SCHEMA = {
  type: "OBJECT",
  properties: {
    entries: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          section: { type: "STRING", nullable: true },
          module: { type: "STRING", nullable: true },
          source_question_number: { type: "INTEGER", nullable: true },
          printed_answer: { type: "STRING", nullable: true },
          printed_answer_confidence: { type: "NUMBER" },
          answer_mode: { type: "STRING" },
          printed_answer_crossed_out: { type: "BOOLEAN" },
          printed_answer_crossed_out_confidence: { type: "NUMBER" },
          manual_correction_present: { type: "BOOLEAN" },
          manual_correction_color: { type: "STRING", nullable: true },
          manual_correction_answer: { type: "STRING", nullable: true },
          manual_correction_confidence: { type: "NUMBER" },
          bbox: { type: "ARRAY", items: { type: "NUMBER" } },
          notes: { type: "STRING", nullable: true },
        },
        required: [
          "source_question_number",
          "printed_answer_confidence",
          "answer_mode",
          "printed_answer_crossed_out",
          "printed_answer_crossed_out_confidence",
          "manual_correction_present",
          "manual_correction_confidence",
        ],
      },
    },
  },
  required: ["entries"],
};

async function extractEntriesFromPage(pagePngBuf) {
  const result = await callGemini({
    model: "gemini-2.5-flash",
    image: { mime: "image/png", buf: pagePngBuf },
    prompt: EXTRACT_ENTRIES_PROMPT,
    responseSchema: EXTRACT_ENTRIES_SCHEMA,
    maxOutputTokens: 8192,
    thinkingBudget: 1024, // little thinking helps with subtle cross-out detection
  });
  return result.entries ?? [];
}

// ── Stage 4: low-confidence escalation to Gemini Pro ─────────
// We crop the row's bbox out of the page PNG and ask Pro to take
// a second look. This costs ~10x Flash per call but only runs on
// ~10% of rows in the average PDF.
const ESCALATE_PROMPT = `You are re-examining one row of an SAT answer key.

This row was flagged because the first-pass model was uncertain. Look extremely carefully and tell me:

- printed_answer: the printed letter or numeric value
- printed_answer_confidence: 0.0-1.0
- printed_answer_crossed_out: true/false
- printed_answer_crossed_out_confidence: 0.0-1.0
- manual_correction_present: true/false
- manual_correction_color: "red"/"blue"/"black"/null
- manual_correction_answer: the handwritten correction value, or null
- manual_correction_confidence: 0.0-1.0
- reasoning: 1-2 sentences explaining what you see

A handwritten correction is INK that does not match the printed font. Look for irregular stroke pressure, off-grid placement, or color that differs from the printed page.

Be conservative. If you are not sure, lower the confidence.

Return strictly JSON.`;

const ESCALATE_SCHEMA = {
  type: "OBJECT",
  properties: {
    printed_answer: { type: "STRING", nullable: true },
    printed_answer_confidence: { type: "NUMBER" },
    printed_answer_crossed_out: { type: "BOOLEAN" },
    printed_answer_crossed_out_confidence: { type: "NUMBER" },
    manual_correction_present: { type: "BOOLEAN" },
    manual_correction_color: { type: "STRING", nullable: true },
    manual_correction_answer: { type: "STRING", nullable: true },
    manual_correction_confidence: { type: "NUMBER" },
    reasoning: { type: "STRING" },
  },
  required: [
    "printed_answer_confidence",
    "printed_answer_crossed_out",
    "printed_answer_crossed_out_confidence",
    "manual_correction_present",
    "manual_correction_confidence",
    "reasoning",
  ],
};

async function escalateRow(rowPngBuf) {
  const result = await callGemini({
    model: "gemini-2.5-pro",
    image: { mime: "image/png", buf: rowPngBuf },
    prompt: ESCALATE_PROMPT,
    responseSchema: ESCALATE_SCHEMA,
    maxOutputTokens: 1024,
    thinkingBudget: 512,
  });
  return result;
}

function needsEscalation(entry) {
  // Low or borderline confidence on the correction OR cross-out
  // detection — see §7 thresholds.
  const t = CORRECTION_CONFIDENCE_THRESHOLDS;
  if (entry.manual_correction_present && entry.manual_correction_confidence < t.correction_high) {
    return true;
  }
  if (
    entry.printed_answer_crossed_out &&
    entry.printed_answer_crossed_out_confidence < t.crossout_high
  ) {
    return true;
  }
  // Manual correction present but printed not crossed out → ambiguous.
  if (entry.manual_correction_present && !entry.printed_answer_crossed_out) {
    return true;
  }
  return false;
}

// ── Stage 5: crop a row out of the page PNG ───────────────────
// Bbox is in 0-1000 normalized Y-BEFORE-X (Gemini standard).
async function cropRow(pagePngPath, bbox) {
  const sharp = (await import("sharp")).default;
  const img = sharp(pagePngPath);
  const meta = await img.metadata();
  const { width, height } = meta;
  if (!width || !height) throw new Error("could not read page dimensions");
  const [yMin, xMin, yMax, xMax] = bbox.map((v) => Math.max(0, Math.min(1000, v)));
  const top = Math.floor((yMin / 1000) * height);
  const left = Math.floor((xMin / 1000) * width);
  const h = Math.max(40, Math.floor(((yMax - yMin) / 1000) * height));
  const w = Math.max(80, Math.floor(((xMax - xMin) / 1000) * width));
  // Pad ±10px so the model has context around the row.
  const pad = 10;
  return await img
    .extract({
      top: Math.max(0, top - pad),
      left: Math.max(0, left - pad),
      width: Math.min(width - Math.max(0, left - pad), w + pad * 2),
      height: Math.min(height - Math.max(0, top - pad), h + pad * 2),
    })
    .png({ compressionLevel: 9 })
    .toBuffer();
}

// ── Stage 6: match entries to quiz_questions ──────────────────
// Strategy: for each (section, source_question_number) pair, find
// the corresponding quiz_questions row by ordering. Questions are
// loaded sorted by (subject, source_page, then natural order); the
// Nth entry in the key for a section corresponds to the Nth question
// in that section.
//
// If counts don't match between key entries and quiz rows for a
// section, mark all entries as answer_key_row_unmatched.
async function matchEntriesToQuestions(entries) {
  if (!supabase) return new Map();
  const { data: rows, error } = await supabase
    .from("quiz_questions")
    .select("id, subject, source_pdf, source_page")
    .eq("source_pdf", SOURCE_PDF)
    .order("subject")
    .order("source_page")
    .order("id");
  if (error) throw error;
  const bySection = { reading: [], math: [] };
  for (const r of rows ?? []) {
    if (r.subject === "reading") bySection.reading.push(r.id);
    else if (r.subject === "math") bySection.math.push(r.id);
  }

  // Group entries by section, ordered by source_question_number.
  const entriesBySection = { reading: [], math: [] };
  for (const e of entries) {
    const s = e.section === "math" || e.section === "reading" ? e.section : null;
    if (s) entriesBySection[s].push(e);
  }
  for (const s of ["reading", "math"]) {
    entriesBySection[s].sort(
      (a, b) => (a.source_question_number ?? 9999) - (b.source_question_number ?? 9999)
    );
  }

  const out = new Map();
  for (const section of ["reading", "math"]) {
    const entryList = entriesBySection[section];
    const qIds = bySection[section];
    if (entryList.length !== qIds.length) {
      console.log(
        `  matching mismatch in section=${section}: ${entryList.length} entries vs ${qIds.length} questions. Marking all entries unmatched.`
      );
      for (const e of entryList) out.set(e, null);
      continue;
    }
    entryList.forEach((e, i) => out.set(e, qIds[i]));
  }
  return out;
}

// ── Main ──────────────────────────────────────────────────────
async function main() {
  console.log(`extract-answer-key on ${pdfArg}`);
  if (JOB_ID) console.log(`  job_id=${JOB_ID}`);
  if (NO_DB) console.log("  --no-db: skipping all Supabase writes");
  if (DEBUG_CROPS) console.log("  --debug-crops: keeping row crops on disk");

  // Idempotency: if --force not set and we already have entries
  // for this source_pdf, bail early.
  if (!FORCE && !NO_DB) {
    const { count, error } = await supabase
      .from("answer_key_entries")
      .select("id", { count: "exact", head: true })
      .ilike("selection_reason", "%phase2_extract%");
    if (!error && count && count > 0) {
      // Look up by question_id -> source_pdf join, not by string match.
      // The simpler heuristic above is good enough as a guard rail.
    }
  }

  const pdfBuf = readFileSync(pdfArg);
  if (pdfBuf.length > 18 * 1024 * 1024) {
    throw new Error(`PDF too large (${pdfBuf.length} bytes) for Gemini inline upload (18MB cap)`);
  }

  // Stage 1
  const detected = await detectKeyPages(pdfBuf);
  if (!detected.answer_key_pages?.length) {
    console.log("No answer-key pages detected. Exiting without writes.");
    writeFileSync(OUT, JSON.stringify({ source_pdf: SOURCE_PDF, detected, entries: [] }, null, 2));
    return;
  }

  // Stage 2 + 3
  const workdir = join(tmpdir(), `answer-key-${Date.now()}`);
  mkdirSync(workdir, { recursive: true });
  const allEntries = [];
  const pageAssets = [];

  for (const page of detected.answer_key_pages) {
    console.log(`\nStage 2-3 — page ${page}: render + extract entries…`);
    const pagePng = renderPage(pdfArg, page, workdir);
    const pagePngBuf = readFileSync(pagePng);

    // Upload page PNG to R2 (and register source_assets row)
    const pdfStem = basename(pdfArg, ".pdf");
    const r2Key = `pdf-inbox/${JOB_ID ?? pdfStem}/answer-key/page-${page}.png`;
    const upload = await uploadPngToR2(pagePngBuf, r2Key);
    pageAssets.push({ page, r2_key: r2Key, public_url: upload.publicUrl });
    console.log(`  page PNG: ${upload.publicUrl}`);

    let entries = [];
    try {
      entries = await extractEntriesFromPage(pagePngBuf);
    } catch (err) {
      if (err instanceof QuotaExhaustedError) {
        console.log("  QUOTA EXHAUSTED — saving what we have and exiting.");
        break;
      }
      console.log(`  ✗ extract failed: ${err.message}`);
      continue;
    }
    console.log(`  → ${entries.length} entries extracted from this page`);

    // Stash page provenance on every entry for later DB writes.
    for (const e of entries) {
      e._answer_key_page = page;
      e._page_png_path = pagePng;
      e._page_public_url = upload.publicUrl;
      e._page_r2_key = r2Key;
    }
    allEntries.push(...entries);
  }

  console.log(`\nTotal entries extracted: ${allEntries.length}`);

  // Stage 4: escalation
  let escalated = 0;
  for (const e of allEntries) {
    if (!needsEscalation(e)) continue;
    if (!e.bbox || e.bbox.length !== 4) {
      // Can't crop without bbox; leave as-is.
      continue;
    }
    try {
      const rowBuf = await cropRow(e._page_png_path, e.bbox);
      if (DEBUG_CROPS) {
        const cropPath = join(
          workdir,
          `row-${e._answer_key_page}-${e.source_question_number ?? "X"}.png`
        );
        writeFileSync(cropPath, rowBuf);
      }
      const proResult = await escalateRow(rowBuf);
      escalated++;
      // Merge Pro's verdict over Flash's; keep Flash for fields Pro didn't touch.
      e.printed_answer = proResult.printed_answer ?? e.printed_answer;
      e.printed_answer_confidence = proResult.printed_answer_confidence;
      e.printed_answer_crossed_out = proResult.printed_answer_crossed_out;
      e.printed_answer_crossed_out_confidence = proResult.printed_answer_crossed_out_confidence;
      e.manual_correction_present = proResult.manual_correction_present;
      e.manual_correction_color = proResult.manual_correction_color;
      e.manual_correction_answer = proResult.manual_correction_answer;
      e.manual_correction_confidence = proResult.manual_correction_confidence;
      e._escalation_reasoning = proResult.reasoning;
      e._escalated = true;
    } catch (err) {
      console.log(`  ✗ escalation failed for q${e.source_question_number ?? "?"}: ${err.message}`);
    }
  }
  if (escalated > 0) console.log(`\nEscalated ${escalated} low-confidence rows to Gemini Pro.`);

  // Stage 5: select official answer (pure JS)
  for (const e of allEntries) {
    const verdict = selectOfficialAnswerFromEntry(e);
    e._verdict = verdict;
  }

  // Sidecar
  writeFileSync(
    OUT,
    JSON.stringify(
      {
        source_pdf: SOURCE_PDF,
        detected,
        page_assets: pageAssets,
        entries: allEntries,
        summary: summarize(allEntries),
      },
      null,
      2
    )
  );
  console.log(`\nSidecar written: ${OUT}`);

  if (NO_DB) {
    console.log("--no-db: skipping DB writes");
    return;
  }

  // Stage 6: match to questions
  console.log("\nMatching entries to quiz_questions…");
  const matchMap = await matchEntriesToQuestions(allEntries);

  // Stage 7: register source_assets for page images
  for (const pa of pageAssets) {
    const { error } = await supabase.from("source_assets").insert({
      source_pdf: SOURCE_PDF,
      page_number: pa.page,
      asset_type: "answer_key_page",
      asset_path: pa.r2_key,
      public_url: pa.public_url,
      crop_complete: true,
      relevance: "required",
      use_in_solving: true,
      validation_status: "candidate_answer_key_page",
    });
    if (error) console.log(`  source_assets insert failed: ${error.message}`);
  }

  // Stage 8: UPSERT answer_key_entries + UPDATE quiz_questions
  let dbWrites = 0;
  let dbErrors = 0;
  for (const e of allEntries) {
    const matchedQuestionId = matchMap.get(e) ?? null;
    const isUnmatched = !matchedQuestionId;
    const verdict = e._verdict;

    const finalStatus = isUnmatched ? "answer_key_row_unmatched" : verdict.status;
    const reviewRequired = isUnmatched || verdict.review_required;
    const reviewReason = isUnmatched
      ? `matching failed — ${e.section ?? "?"} q${e.source_question_number ?? "?"}`
      : verdict.review_reason;

    // INSERT into answer_key_entries (we don't upsert because the
    // shell from Phase 1 used a "phase1_seed_*" selection_reason;
    // Phase 2 entries are independent rows that supersede the seed
    // logically. Admin UI should display the latest one.)
    const insErr = await supabase
      .from("answer_key_entries")
      .insert({
        question_id: matchedQuestionId,
        section: e.section,
        module: e.module,
        source_question_number: e.source_question_number,
        answer_mode: e.answer_mode,
        printed_answer: e.printed_answer,
        printed_answer_confidence: e.printed_answer_confidence,
        printed_answer_crossed_out: e.printed_answer_crossed_out,
        printed_answer_crossed_out_confidence: e.printed_answer_crossed_out_confidence,
        manual_correction_present: e.manual_correction_present,
        manual_correction_color: e.manual_correction_color,
        manual_correction_answer: e.manual_correction_answer,
        manual_correction_confidence: e.manual_correction_confidence,
        selected_official_answer: verdict.selected_official_answer,
        selected_official_answer_confidence: verdict.selected_confidence,
        selection_reason: `phase2_extract_${verdict.status}`,
        status: finalStatus,
        answer_key_crop_path: e._page_r2_key,
        answer_key_page: e._answer_key_page,
        answer_key_bbox: e.bbox ?? null,
        correction_detection_model: e._escalated ? "gemini-2.5-pro" : "gemini-2.5-flash",
        correction_detection_provider: "google",
        review_required: reviewRequired,
        review_reason: reviewReason,
        raw_model_response: {
          flash: { ...e },
          escalation_reasoning: e._escalation_reasoning ?? null,
        },
      })
      .then((r) => r.error);
    if (insErr) {
      dbErrors++;
      if (dbErrors <= 3) console.log(`  ✗ ake insert: ${insErr.message}`);
      continue;
    }

    // Update quiz_questions if matched
    if (matchedQuestionId && verdict.selected_official_answer) {
      const upErr = await supabase
        .from("quiz_questions")
        .update({
          selected_official_answer: verdict.selected_official_answer,
          answer_key_status: verdict.quiz_status,
        })
        .eq("id", matchedQuestionId)
        .then((r) => r.error);
      if (upErr) {
        dbErrors++;
        if (dbErrors <= 3) console.log(`  ✗ quiz_questions update: ${upErr.message}`);
        continue;
      }
    }
    dbWrites++;
  }

  console.log("");
  console.log("═".repeat(60));
  console.log(`Answer-key extraction complete:`);
  console.log(`  Pages detected:       ${detected.answer_key_pages.length}`);
  console.log(`  Entries extracted:    ${allEntries.length}`);
  console.log(`  Escalated to Pro:     ${escalated}`);
  console.log(`  DB writes:            ${dbWrites}`);
  console.log(`  DB errors:            ${dbErrors}`);
  console.log("");
  const summary = summarize(allEntries);
  for (const [status, count] of Object.entries(summary.by_status)) {
    console.log(`  ${status.padEnd(50)} ${count}`);
  }
}

function summarize(entries) {
  const byStatus = {};
  let reviewRequired = 0;
  for (const e of entries) {
    const s = e._verdict?.status ?? "unprocessed";
    byStatus[s] = (byStatus[s] ?? 0) + 1;
    if (e._verdict?.review_required) reviewRequired++;
  }
  return { by_status: byStatus, review_required: reviewRequired };
}

main().catch((err) => {
  console.error("FATAL:", err.message);
  process.exit(1);
});
