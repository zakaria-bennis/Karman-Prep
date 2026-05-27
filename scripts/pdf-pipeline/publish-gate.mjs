// ============================================================
// publish-gate — promote rows to publish_ready ONLY after they
// pass every required check.
//
// This is the central enforcement point for v2 phase 1's
// "import_status ≠ student visibility" rule. New rows enter as
// 'draft' (import-csv-direct sets this). This script reads each
// row's current state + audit signals and computes the correct
// publish_status:
//
//   publish_ready             — all gates pass
//   needs_human_review        — at least one soft issue
//   blocked_katex_error       — KaTeX validation failed
//   blocked_answer_dispute    — grader_votes verdict is bad
//   blocked_slug_uncertain    — concept_slug not in canonical 89
//   blocked_missing_visual    — has_figure hint but no image_url
//                              OR Phase 4 says attached visual is an artifact
//
// The script never DEMOTES from publish_ready (admins can manually
// flip a row back to needs_human_review via /admin/questions/preview).
// It only PROMOTES from 'draft' or from a blocked_* status that no
// longer applies.
//
// USAGE
//   node --env-file=.env.local scripts/pdf-pipeline/publish-gate.mjs
//   ... --source-pdf 202603asia.pdf       # just one PDF (the orch path)
//   ... --question-id <uuid>              # just one row
//   ... --dry-run                         # report only, no writes
//
// COST: zero — pure DB reads + writes.
// ============================================================

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { computePublishStatus } from "../lib/publish-gate-logic.mjs";

const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");
const SOURCE_PDF_IDX = args.indexOf("--source-pdf");
const SOURCE_PDF =
  SOURCE_PDF_IDX >= 0 && args[SOURCE_PDF_IDX + 1] ? args[SOURCE_PDF_IDX + 1] : null;
const QUESTION_ID_IDX = args.indexOf("--question-id");
const QUESTION_ID =
  QUESTION_ID_IDX >= 0 && args[QUESTION_ID_IDX + 1] ? args[QUESTION_ID_IDX + 1] : null;

const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPA_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPA_URL || !SUPA_KEY) {
  console.error("Set NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const supabase = createClient(SUPA_URL, SUPA_KEY, { auth: { persistSession: false } });
const IN_CHUNK_SIZE = 100;
const VISUAL_ASSET_TYPES = [
  "figure_crop",
  "table_crop",
  "chart_crop",
  "graph_crop",
  "calculator_artifact",
  "background_ui_artifact",
];

function chunk(items, size = IN_CHUNK_SIZE) {
  const chunks = [];
  for (let i = 0; i < items.length; i += size) chunks.push(items.slice(i, i + size));
  return chunks;
}

function hasPhase4Metadata(rawMetadata) {
  return Boolean(
    rawMetadata &&
    typeof rawMetadata === "object" &&
    !Array.isArray(rawMetadata) &&
    rawMetadata.phase4_visual_relevance
  );
}

function aggregatePhase4VisualSignals(assets) {
  const checked = assets.some((asset) => hasPhase4Metadata(asset.raw_metadata));
  let required = 0;
  let irrelevant = 0;
  let uncertain = 0;
  let repeated = 0;
  for (const asset of assets) {
    if (asset.relevance === "required" && asset.use_in_solving) required++;
    if (asset.relevance === "irrelevant") irrelevant++;
    if (asset.relevance === "uncertain") uncertain++;
    if (asset.repeated_across_pages) repeated++;
  }
  return {
    phase4_visual_relevance_checked: checked,
    required_visual_asset_count: required,
    irrelevant_visual_asset_count: irrelevant,
    uncertain_visual_asset_count: uncertain,
    repeated_visual_asset_count: repeated,
  };
}

// ── Build canonical 89-slug set ───────────────────────────────
// Regex-parse the curriculum source file so this script doesn't
// need tsx. Mirrors what import-csv-direct.mjs does. If the file
// is missing (lean CI), we skip the slug check.
const VALID_SLUGS = new Set();
try {
  const curr = readFileSync("src/data/curriculum.ts", "utf-8");
  const re = /concept_slug:\s*"([a-z0-9-]+)"/g;
  let m;
  while ((m = re.exec(curr)) !== null) VALID_SLUGS.add(m[1]);
} catch {
  // ENOENT — leave VALID_SLUGS empty; slug gate becomes a no-op.
}

// Gate functions live in scripts/lib/publish-gate-logic.mjs so they
// can be unit-tested without standing up a Supabase fixture. This
// script just orchestrates I/O around computePublishStatus().

async function main() {
  console.log("Loading rows for publish-gate evaluation…");
  // v2 phase 3: also fetch source-evidence signals from the
  // quiz_questions_phase3_signals view so the new gates can read
  // has_question_crop, match_confidence, has_orphan_crops_on_page,
  // etc. without an N+1 join.
  let query = supabase.from("quiz_questions").select(
    "id, source_pdf, source_page, publish_status, import_status, import_flag_type, " +
      "import_flag_reason, concept_slug, question_text, correct_answer, answer_format, " +
      "explanation_text, image_url, grader_votes, " +
      "answer_key_status, answer_verification_status, selected_official_answer, " +
      "source_assets_processed_at, source_assets_processed_status, " +
      // v2 phase 5: opt-in marker + per-question repair status.
      "math_notation_checked_at, math_notation_status, " +
      // v2 phase 6: opt-in marker + typed verifier verdict.
      "answer_verified_at, answer_verifier_version, dispute_category, " +
      "suggested_verified_answer, " +
      "answer_choices(letter, choice_text)"
  );
  if (QUESTION_ID) query = query.eq("id", QUESTION_ID);
  else if (SOURCE_PDF) query = query.eq("source_pdf", SOURCE_PDF);

  const { data: baseRows, error } = await query;
  if (error) throw error;

  // Hydrate each row with the Phase 3 view's signals. We could fetch
  // from the view directly, but the view doesn't include answer_choices
  // or the v1+v2 columns above. Easiest: fetch the view's columns for
  // the same id set and merge in JS.
  let signalsByQid = new Map();
  if (baseRows.length > 0) {
    const ids = baseRows.map((r) => r.id);
    const signals = [];
    for (const idChunk of chunk(ids)) {
      const { data, error: signalErr } = await supabase
        .from("quiz_questions_phase3_signals")
        .select("*")
        .in("question_id", idChunk);
      if (signalErr) throw signalErr;
      signals.push(...(data ?? []));
    }
    signalsByQid = new Map((signals ?? []).map((s) => [s.question_id, s]));
  }

  // Phase 4 visual relevance signals are stored on source_assets.
  // Hydrate per-question counts once here so the pure gate can stay
  // DB-agnostic and testable.
  let phase4ByQid = new Map();
  if (baseRows.length > 0) {
    const ids = baseRows.map((r) => r.id);
    const assetsByQid = new Map();
    for (const idChunk of chunk(ids)) {
      const { data: assets, error: assetErr } = await supabase
        .from("source_assets")
        .select(
          "question_id, asset_type, relevance, repeated_across_pages, use_in_solving, raw_metadata"
        )
        .in("question_id", idChunk)
        .in("asset_type", VISUAL_ASSET_TYPES);
      if (assetErr) throw assetErr;
      for (const asset of assets ?? []) {
        if (!asset.question_id) continue;
        const list = assetsByQid.get(asset.question_id) ?? [];
        list.push(asset);
        assetsByQid.set(asset.question_id, list);
      }
    }
    phase4ByQid = new Map(
      [...assetsByQid.entries()].map(([questionId, assets]) => [
        questionId,
        aggregatePhase4VisualSignals(assets),
      ])
    );
  }

  const rows = baseRows.map((r) => ({
    ...r,
    // Merge Phase 3 view signals (have_question_crop, match_method, etc.)
    ...(signalsByQid.get(r.id) ?? {}),
    // Merge Phase 4 source-asset visual relevance counts.
    ...(phase4ByQid.get(r.id) ?? {}),
  }));

  console.log(`Evaluating ${rows.length} rows…`);
  const tally = {};
  let promoted = 0;
  let skipped = 0;
  let errored = 0;
  const decisions = [];

  for (const q of rows) {
    const decision = computePublishStatus(q, VALID_SLUGS);
    tally[decision.suggestedStatus] = (tally[decision.suggestedStatus] ?? 0) + 1;
    decisions.push({ id: q.id, source_pdf: q.source_pdf, ...decision });

    // Don't change rows that are already in their target state.
    if (q.publish_status === decision.suggestedStatus) {
      skipped++;
      continue;
    }
    // SAFETY: never demote a row that's already publish_ready.
    // Admin may have manually moved it there. If a gate now fails,
    // surface the issue via a finding (TODO phase 2) but leave the
    // status alone.
    if (
      q.publish_status === "publish_ready" &&
      decision.suggestedStatus !== "publish_ready" &&
      decision.suggestedStatus !== "publish_ready_with_verified_repair"
    ) {
      skipped++;
      continue;
    }

    if (DRY_RUN) {
      promoted++;
      continue;
    }
    const { error: upErr } = await supabase
      .from("quiz_questions")
      .update({ publish_status: decision.suggestedStatus })
      .eq("id", q.id);
    if (upErr) {
      errored++;
      if (errored <= 3) console.log(`  ✗ ${q.id.slice(0, 8)}: ${upErr.message}`);
    } else {
      promoted++;
    }
  }

  console.log("");
  console.log("═".repeat(60));
  console.log("Final publish_status tally:");
  for (const [s, n] of Object.entries(tally).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${s.padEnd(45)} ${n}`);
  }
  console.log("");
  console.log(`Updated: ${promoted}${DRY_RUN ? " (dry-run)" : ""}`);
  console.log(`Skipped (already in target state): ${skipped}`);
  console.log(`Errored: ${errored}`);

  // Show a small sample of non-trivial decisions for log readability.
  const interesting = decisions.filter(
    (d) => d.suggestedStatus !== "publish_ready" && d.suggestedStatus !== "needs_human_review"
  );
  if (interesting.length > 0) {
    console.log("");
    console.log("Sample of blocked rows (first 5):");
    for (const d of interesting.slice(0, 5)) {
      console.log(
        `  ${d.source_pdf ?? "?"} ${d.id.slice(0, 8)}: ${d.suggestedStatus} (${d.reason})`
      );
    }
  }
}

main().catch((err) => {
  console.error("FATAL:", err.message);
  process.exit(1);
});
