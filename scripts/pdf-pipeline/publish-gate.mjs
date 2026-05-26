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
  let query = supabase
    .from("quiz_questions")
    .select(
      "id, source_pdf, source_page, publish_status, import_status, import_flag_type, " +
        "import_flag_reason, concept_slug, question_text, correct_answer, answer_format, " +
        "explanation_text, image_url, grader_votes, " +
        "answer_choices(letter, choice_text)"
    );
  if (QUESTION_ID) query = query.eq("id", QUESTION_ID);
  else if (SOURCE_PDF) query = query.eq("source_pdf", SOURCE_PDF);

  const { data: rows, error } = await query;
  if (error) throw error;

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
