#!/usr/bin/env node

// ============================================================
// classify-visual-relevance — v2 Phase 4.
//
// Classifies source_assets visuals as problem-required vs repeated
// calculator/sidebar/background artifacts. The script is conservative:
// it only marks a visual irrelevant when repetition + question text
// make that conclusion strong; ambiguous repeated visuals route to
// `relevance='uncertain'` and `use_in_solving=false`.
// ============================================================

import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";
import {
  MIN_REPEAT_COUNT,
  VISUAL_ASSET_TYPES,
  buildPhase4Metadata,
  buildVisualRelevanceUpsertPayload,
  classifyVisualAsset,
  groupByVisualSignature,
} from "../lib/visual-relevance-logic.mjs";

const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");
const FORCE = args.includes("--force");
const SOURCE_PDF_IDX = args.indexOf("--source-pdf");
const SOURCE_PDF =
  SOURCE_PDF_IDX >= 0 && args[SOURCE_PDF_IDX + 1] ? args[SOURCE_PDF_IDX + 1] : null;
const LIMIT_IDX = args.indexOf("--limit");
const LIMIT = LIMIT_IDX >= 0 && args[LIMIT_IDX + 1] ? Number(args[LIMIT_IDX + 1]) : null;
const MIN_REPEAT_IDX = args.indexOf("--min-repeat");
const MIN_REPEAT =
  MIN_REPEAT_IDX >= 0 && args[MIN_REPEAT_IDX + 1]
    ? Number(args[MIN_REPEAT_IDX + 1])
    : MIN_REPEAT_COUNT;

const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPA_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPA_URL || !SUPA_KEY) {
  console.error("Set NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const supabase = createClient(SUPA_URL, SUPA_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const ASSET_SELECT =
  "id, question_id, source_pdf, page_number, asset_type, asset_path, public_url, bbox, relevance, repeated_across_pages, use_in_solving, validation_status, notes, raw_metadata, created_at";

const QUESTION_SELECT =
  "id, question_text, passage_intro, passage, passage_a, passage_b, image_url, image_alt";

function usage() {
  console.log(`Usage:
  node --env-file=.env.local scripts/pdf-pipeline/classify-visual-relevance.mjs [options]

Options:
  --source-pdf <filename>  Classify only one imported PDF.
  --limit <n>             Limit assets, useful for smoke tests.
  --min-repeat <n>        Repeat threshold for artifact detection (default ${MIN_REPEAT_COUNT}).
  --dry-run               Print decisions without DB writes.
  --force                 Reclassify assets that already have phase4 metadata.
`);
}

if (args.includes("--help")) {
  usage();
  process.exit(0);
}

function chunk(items, size) {
  const chunks = [];
  for (let i = 0; i < items.length; i += size) chunks.push(items.slice(i, i + size));
  return chunks;
}

function phase4Metadata(rawMetadata) {
  if (!rawMetadata || typeof rawMetadata !== "object" || Array.isArray(rawMetadata)) return null;
  return rawMetadata.phase4_visual_relevance ?? null;
}

function mergeRawMetadata(rawMetadata, phase4) {
  const base =
    rawMetadata && typeof rawMetadata === "object" && !Array.isArray(rawMetadata)
      ? rawMetadata
      : {};
  return {
    ...base,
    phase4_visual_relevance: phase4,
  };
}

function dataUrlToBuffer(url) {
  const match = /^data:([^;,]+)?(;base64)?,(.*)$/i.exec(url);
  if (!match) return null;
  const payload = decodeURIComponent(match[3] ?? "");
  return match[2] ? Buffer.from(payload, "base64") : Buffer.from(payload, "utf-8");
}

async function loadImageBuffer(asset) {
  const url = asset.public_url || asset.asset_path;
  if (!url) return null;
  const dataBuf = dataUrlToBuffer(url);
  if (dataBuf) return dataBuf;
  if (!/^https?:\/\//i.test(url)) return null;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`image fetch ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

function toHex(bits) {
  let hex = "";
  for (let i = 0; i < bits.length; i += 4) {
    const nibble = bits.slice(i, i + 4).reduce((acc, bit) => (acc << 1) | bit, 0);
    hex += nibble.toString(16);
  }
  return hex;
}

async function averageHash(asset) {
  const existing = phase4Metadata(asset.raw_metadata)?.visual_signature;
  if (existing) return existing;
  const buf = await loadImageBuffer(asset);
  if (!buf) return null;
  const pixels = await sharp(buf).resize(16, 16, { fit: "fill" }).grayscale().raw().toBuffer();
  const avg = pixels.reduce((sum, value) => sum + value, 0) / pixels.length;
  const bits = [...pixels].map((value) => (value >= avg ? 1 : 0));
  return toHex(bits);
}

async function loadAssets() {
  let query = supabase
    .from("source_assets")
    .select(ASSET_SELECT)
    .in("asset_type", [...VISUAL_ASSET_TYPES])
    .order("source_pdf", { ascending: true })
    .order("page_number", { ascending: true });
  if (SOURCE_PDF) query = query.eq("source_pdf", SOURCE_PDF);
  if (LIMIT && Number.isFinite(LIMIT)) query = query.limit(LIMIT);
  const { data, error } = await query;
  if (error) throw error;
  const rows = data ?? [];
  return FORCE ? rows : rows.filter((asset) => !phase4Metadata(asset.raw_metadata));
}

async function loadQuestions(questionIds) {
  const ids = [...new Set(questionIds.filter(Boolean))];
  if (ids.length === 0) return new Map();
  const rows = [];
  for (const idChunk of chunk(ids, 100)) {
    const { data, error } = await supabase
      .from("quiz_questions")
      .select(QUESTION_SELECT)
      .in("id", idChunk);
    if (error) throw error;
    rows.push(...(data ?? []));
  }
  return new Map(rows.map((row) => [row.id, row]));
}

function summarize(tally, key) {
  tally[key] = (tally[key] ?? 0) + 1;
}

async function main() {
  console.log("Phase 4 visual relevance classification");
  if (SOURCE_PDF) console.log(`source_pdf=${SOURCE_PDF}`);
  if (DRY_RUN) console.log("dry-run: no DB writes");
  if (FORCE) console.log("force: reclassifying existing phase4 metadata");

  const assets = await loadAssets();
  console.log(`Loaded ${assets.length} visual source_asset row(s).`);
  if (assets.length === 0) return;

  const questionsById = await loadQuestions(assets.map((asset) => asset.question_id));
  const hashFailures = [];
  for (const asset of assets) {
    try {
      asset.visual_signature = await averageHash(asset);
    } catch (err) {
      hashFailures.push({
        id: asset.id,
        message: err instanceof Error ? err.message : String(err),
      });
      asset.visual_signature = phase4Metadata(asset.raw_metadata)?.visual_signature ?? null;
    }
  }

  const groups = groupByVisualSignature(assets.filter((asset) => asset.visual_signature));
  const repeatCountById = new Map();
  for (const group of groups) {
    for (const asset of group.assets) repeatCountById.set(asset.id, group.assets.length);
  }

  const tally = {};
  const examples = [];
  let updated = 0;

  // Build the per-asset update payloads first, then batch the
  // writes. The original code issued one UPDATE per asset in a
  // sequential for-loop — for a multi-PDF backfill across thousands
  // of rows that's thousands of sequential round trips. Batching by
  // 100 keeps each request well under Supabase's payload limit and
  // brings the backfill down to seconds.
  const pendingUpdates = [];

  for (const asset of assets) {
    const question = questionsById.get(asset.question_id) ?? {};
    const repeatCount = repeatCountById.get(asset.id) ?? 1;
    const classification = classifyVisualAsset({
      asset,
      question,
      repeatCount,
      minRepeatCount: MIN_REPEAT,
    });
    const phase4 = buildPhase4Metadata({
      asset,
      question,
      classification,
      visualSignature: asset.visual_signature,
      repeatCount,
    });

    summarize(tally, classification.visual_class);
    summarize(tally, `relevance:${classification.relevance}`);
    if (examples.length < 12) {
      examples.push({
        id: asset.id,
        q: asset.question_id,
        type: asset.asset_type,
        class: classification.visual_class,
        relevance: classification.relevance,
        repeatCount,
        reason: classification.reason,
      });
    }

    if (DRY_RUN) continue;

    // Build payload via shared helper so the NOT NULL passthroughs
    // are unit-tested in one place. See SOURCE_ASSETS_NOT_NULL_COLUMNS
    // in visual-relevance-logic.mjs for the locked contract.
    pendingUpdates.push(
      buildVisualRelevanceUpsertPayload({
        asset,
        classification,
        phase4Metadata: mergeRawMetadata(asset.raw_metadata, phase4),
      })
    );
  }

  // Write in batches of 100. We do an upsert keyed on `id`
  // (the PK) which acts as a multi-row update — Supabase will
  // reject any row whose id doesn't already exist, which can't
  // happen here because we selected the same ids in loadAssets().
  const BATCH_SIZE = 100;
  for (let i = 0; i < pendingUpdates.length; i += BATCH_SIZE) {
    const batch = pendingUpdates.slice(i, i + BATCH_SIZE);
    const { error } = await supabase.from("source_assets").upsert(batch, { onConflict: "id" });
    if (error) throw error;
    updated += batch.length;
  }

  console.log("");
  console.log("Classification tally:");
  for (const [key, count] of Object.entries(tally).sort()) {
    console.log(`  ${key.padEnd(36)} ${count}`);
  }
  if (hashFailures.length > 0) {
    console.log(`\nImage hash failures: ${hashFailures.length}`);
    for (const failure of hashFailures.slice(0, 5)) {
      console.log(`  ${failure.id}: ${failure.message}`);
    }
  }
  console.log("\nExamples:");
  for (const ex of examples) console.log(`  ${JSON.stringify(ex)}`);
  console.log("");
  console.log(DRY_RUN ? "Dry run complete." : `Updated ${updated} source_assets row(s).`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.stack || err.message : err);
  process.exit(1);
});
