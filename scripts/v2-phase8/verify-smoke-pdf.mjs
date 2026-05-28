#!/usr/bin/env node

// ============================================================
// verify-smoke-pdf — post-pipeline DB inspection for the
// Phase 8.3 parity smoke test.
//
// Given a pdf_processing_jobs UUID, dumps:
//   1. Job row final state (status, stats, duration)
//   2. quiz_questions count + publish_status distribution
//   3. answer_choices + source_assets counts
//   4. question_findings count by (category, severity) — the
//      Phase 8.3-specific signal we're validating
//   5. v1+v2 audit column completeness (answer_verified_at,
//      explanation_v2_filled_at, math_notation_checked_at)
//   6. Sample of 3 'needs_human_review' rows with their gating
//      reason (which finding kicked them there)
//
// Read-only — never writes anything. Safe to re-run.
//
// USAGE
//   node --env-file=.env.local \
//     scripts/v2-phase8/verify-smoke-pdf.mjs <job-uuid>
// ============================================================

import { createClient } from "@supabase/supabase-js";

const jobId = process.argv[2];
if (!jobId) {
  console.error("Usage: node scripts/v2-phase8/verify-smoke-pdf.mjs <job-uuid>");
  process.exit(1);
}

const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPA_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPA_URL || !SUPA_KEY) {
  console.error("Set NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}
const supabase = createClient(SUPA_URL, SUPA_KEY, { auth: { persistSession: false } });

function pct(n, total) {
  return total === 0 ? "  0.0%" : `${((n / total) * 100).toFixed(1).padStart(5)}%`;
}
function bar(n, max, width = 30) {
  if (max === 0) return "";
  const filled = Math.round((n / max) * width);
  return "█".repeat(filled) + "·".repeat(width - filled);
}

async function main() {
  // ── 1. Job row ─────────────────────────────────────────────
  const { data: job, error: jobErr } = await supabase
    .from("pdf_processing_jobs")
    .select("*")
    .eq("id", jobId)
    .maybeSingle();
  if (jobErr) throw jobErr;
  if (!job) {
    console.error(`No job found with id ${jobId}`);
    process.exit(1);
  }

  console.log("═".repeat(66));
  console.log(`Smoke-test verification — job ${jobId.slice(0, 8)}…`);
  console.log("═".repeat(66));
  console.log(`Source PDF:    ${job.source_pdf}`);
  console.log(`Status:        ${job.status}`);
  console.log(`PDF size:      ${(job.pdf_size_bytes / 1024 / 1024).toFixed(2)} MB`);
  if (job.created_at && job.updated_at) {
    const start = new Date(job.created_at);
    const end = new Date(job.updated_at);
    const mins = ((end - start) / 1000 / 60).toFixed(1);
    console.log(`Wall-clock:    ${mins} min`);
  }
  if (job.error_message) {
    console.log(`Error msg:     ${job.error_message}`);
  }
  if (job.stats) {
    console.log(`Stats:         ${JSON.stringify(job.stats)}`);
  }

  // ── 2. quiz_questions for this PDF ─────────────────────────
  const { data: questions, error: qErr } = await supabase
    .from("quiz_questions")
    .select(
      "id, publish_status, import_status, answer_verified_at, explanation_v2_filled_at, " +
        "math_notation_checked_at, source_assets_processed_at, concept_slug, image_url"
    )
    .eq("source_pdf", job.source_pdf);
  if (qErr) throw qErr;

  const total = questions.length;
  console.log("");
  console.log("─".repeat(66));
  console.log(`quiz_questions rows: ${total}`);
  console.log("─".repeat(66));

  const publishTally = {};
  for (const q of questions) {
    publishTally[q.publish_status] = (publishTally[q.publish_status] ?? 0) + 1;
  }
  const maxPub = Math.max(...Object.values(publishTally), 1);
  console.log("publish_status distribution:");
  for (const [s, n] of Object.entries(publishTally).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${s.padEnd(40)} ${String(n).padStart(4)} ${pct(n, total)}  ${bar(n, maxPub)}`);
  }

  // ── 3. Audit-column completeness ───────────────────────────
  const v1v2 = {
    math_notation_checked_at: questions.filter((q) => q.math_notation_checked_at != null).length,
    answer_verified_at: questions.filter((q) => q.answer_verified_at != null).length,
    explanation_v2_filled_at: questions.filter((q) => q.explanation_v2_filled_at != null).length,
    source_assets_processed_at: questions.filter((q) => q.source_assets_processed_at != null)
      .length,
    has_concept_slug: questions.filter((q) => q.concept_slug && q.concept_slug.length > 0).length,
    has_image_url: questions.filter((q) => q.image_url && q.image_url.length > 0).length,
  };
  console.log("");
  console.log("Per-phase opt-in markers:");
  for (const [k, n] of Object.entries(v1v2)) {
    console.log(`  ${k.padEnd(40)} ${String(n).padStart(4)} / ${total}  ${pct(n, total)}`);
  }

  // ── 4. answer_choices + source_assets counts ───────────────
  const qIds = questions.map((q) => q.id);
  let choiceCount = 0;
  let assetCount = 0;
  if (qIds.length > 0) {
    // Chunk to avoid URL length limits on the IN() clause
    const CHUNK = 100;
    for (let i = 0; i < qIds.length; i += CHUNK) {
      const slice = qIds.slice(i, i + CHUNK);
      const [{ count: c1 }, { count: c2 }] = await Promise.all([
        supabase
          .from("answer_choices")
          .select("*", { count: "exact", head: true })
          .in("question_id", slice),
        supabase
          .from("source_assets")
          .select("*", { count: "exact", head: true })
          .in("question_id", slice),
      ]);
      choiceCount += c1 ?? 0;
      assetCount += c2 ?? 0;
    }
  }
  console.log("");
  console.log(`answer_choices rows:   ${choiceCount}  (expected: ~${total * 4} for all MC)`);
  console.log(`source_assets rows:    ${assetCount}`);

  // ── 5. Phase 8.3 — question_findings ──────────────────────
  console.log("");
  console.log("─".repeat(66));
  console.log("Phase 8.3 — question_findings (THE PARITY SIGNAL)");
  console.log("─".repeat(66));

  let findings = [];
  if (qIds.length > 0) {
    const CHUNK = 100;
    for (let i = 0; i < qIds.length; i += CHUNK) {
      const slice = qIds.slice(i, i + CHUNK);
      const { data, error } = await supabase
        .from("question_findings")
        .select("question_id, category, severity, code, message, detail")
        .in("question_id", slice);
      if (error) throw error;
      findings.push(...(data ?? []));
    }
  }
  console.log(`Total findings rows:   ${findings.length}`);
  console.log("");

  if (findings.length === 0) {
    console.log("⚠ NO findings were written. Phase 8.3 audit modules may not have run.");
    console.log("  Expected at least well_formedness findings for any extracted rows.");
  } else {
    // By category × severity
    const matrix = {};
    for (const f of findings) {
      const key = `${f.category}/${f.severity}`;
      matrix[key] = (matrix[key] ?? 0) + 1;
    }
    console.log("findings by (category, severity):");
    for (const [k, n] of Object.entries(matrix).sort((a, b) => b[1] - a[1])) {
      console.log(`  ${k.padEnd(45)} ${String(n).padStart(4)}`);
    }

    // Which audit categories did we see?
    const expectedCategories = [
      "well_formedness",
      "slug_alignment",
      "figure_coherence",
      "explanation_consistency",
    ];
    const seenCategories = new Set(findings.map((f) => f.category));
    console.log("");
    console.log("audit module coverage:");
    for (const c of expectedCategories) {
      const seen = seenCategories.has(c);
      console.log(`  ${seen ? "✓" : "✗"}  ${c}  ${seen ? "(wrote findings)" : "(NO findings)"}`);
    }
  }

  // ── 6. Sample 'needs_human_review' rows + their findings ──
  const reviewIds = questions
    .filter((q) => q.publish_status === "needs_human_review")
    .slice(0, 3)
    .map((q) => q.id);
  if (reviewIds.length > 0) {
    console.log("");
    console.log("─".repeat(66));
    console.log("Sample needs_human_review rows + their gating findings:");
    console.log("─".repeat(66));
    for (const id of reviewIds) {
      const { data: f } = await supabase
        .from("question_findings")
        .select("category, severity, code, message")
        .eq("question_id", id)
        .eq("severity", "BLOCKING")
        .limit(3);
      console.log(`  ${id.slice(0, 8)}…`);
      if (!f || f.length === 0) {
        console.log(`    (no BLOCKING findings — gated by v1/v2 logic, not Phase 8.3)`);
      } else {
        for (const r of f) {
          console.log(`    ${r.category}/${r.code}: ${r.message?.slice(0, 80) ?? ""}`);
        }
      }
    }
  }

  console.log("");
  console.log("═".repeat(66));
  console.log("Verification complete.");
  console.log("═".repeat(66));
}

main().catch((err) => {
  console.error("FATAL:", err.message);
  process.exit(1);
});
