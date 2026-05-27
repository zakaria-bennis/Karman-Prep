#!/usr/bin/env node

// ============================================================
// check-fill-eligibility — v2 Phase 7 Stage 10.
//
// Pre-fill gate. Runs AFTER verify-answers (Phase 6) and BEFORE
// fill-explanations-v2. For every candidate question, hydrates
// Phase 2/3/4/5/6 signals and asks scripts/lib/explanation-
// eligibility.mjs whether Phase 7 should fill this row.
//
// Behavior:
//   eligible row  → no DB write (will be filled at Stage 11).
//   blocked row   → write explanation_v2_status='skipped_not_eligible'
//                   + explanation_v2 = { admin_diagnostic_note, ... }
//                   + explanation_v2_filled_at = NOW.
//                   Legacy explanation_text / explanation_per_choice
//                   / desmos_strategy are NOT touched.
//
// CLI flags mirror prior phases:
//   --source-pdf <file>  scope to one PDF
//   --question-id <uuid> single question
//   --limit <n>          cap inspected rows
//   --dry-run            no DB writes
//   --force              re-evaluate rows already marked
// ============================================================

import { createClient } from "@supabase/supabase-js";
import { checkFillEligibility, categorizeReason } from "../lib/explanation-eligibility.mjs";
import { EXPLANATION_V2_VERSION, EXPLANATION_V2_STATUSES } from "../lib/explanation-categories.mjs";

const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");
const FORCE = args.includes("--force");
const SOURCE_PDF_IDX = args.indexOf("--source-pdf");
const SOURCE_PDF =
  SOURCE_PDF_IDX >= 0 && args[SOURCE_PDF_IDX + 1] ? args[SOURCE_PDF_IDX + 1] : null;
const QUESTION_ID_IDX = args.indexOf("--question-id");
const QUESTION_ID =
  QUESTION_ID_IDX >= 0 && args[QUESTION_ID_IDX + 1] ? args[QUESTION_ID_IDX + 1] : null;
const LIMIT_IDX = args.indexOf("--limit");
const LIMIT = LIMIT_IDX >= 0 && args[LIMIT_IDX + 1] ? Number(args[LIMIT_IDX + 1]) : null;

if (args.includes("--help")) {
  console.log(`Usage:
  node --env-file=.env.local scripts/pdf-pipeline/check-fill-eligibility.mjs [options]

Options:
  --source-pdf <filename>  Scope to one PDF.
  --question-id <uuid>     Single question.
  --limit <n>              Cap inspected rows.
  --dry-run                Print decisions; no DB writes.
  --force                  Re-evaluate rows already marked by Phase 7.
  --help                   Show this message.
`);
  process.exit(0);
}

const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPA_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPA_URL || !SUPA_KEY) {
  console.error("Set NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}
const supabase = createClient(SUPA_URL, SUPA_KEY, { auth: { persistSession: false } });

// ── Selection ────────────────────────────────────────────────

const QUESTION_SELECT = [
  "id",
  "question_text",
  "subject",
  "answer_format",
  "concept_slug",
  "publish_status",
  "import_status",
  "correct_answer",
  "selected_official_answer",
  "answer_key_status",
  "math_notation_status",
  "answer_verification_status",
  "answer_verified_at",
  "explanation_v2_filled_at",
  "explanation_v2_status",
  "image_url",
  "source_pdf",
  "source_page",
  "source_assets_processed_at",
  "answer_choices(letter, choice_text)",
].join(", ");

async function selectCandidates() {
  let q = supabase.from("quiz_questions").select(QUESTION_SELECT);
  if (QUESTION_ID) q = q.eq("id", QUESTION_ID);
  else if (SOURCE_PDF) q = q.eq("source_pdf", SOURCE_PDF);
  if (!FORCE && !QUESTION_ID) {
    q = q.is("explanation_v2_filled_at", null);
  }
  if (LIMIT) q = q.limit(LIMIT);
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

// Phase 4 visual-relevance counts live on source_assets.raw_metadata,
// same hydration the publish-gate does. Lifted here so the
// eligibility gate can read required_visual_asset_count without
// querying the view (which doesn't carry this).
async function hydratePhase4Counts(questionIds) {
  if (questionIds.length === 0) return new Map();
  const out = new Map();
  const CHUNK = 100;
  for (let i = 0; i < questionIds.length; i += CHUNK) {
    const slice = questionIds.slice(i, i + CHUNK);
    const { data, error } = await supabase
      .from("source_assets")
      .select("question_id, relevance, use_in_solving, raw_metadata")
      .in("question_id", slice);
    if (error) throw error;
    for (const a of data ?? []) {
      if (!a.question_id) continue;
      const acc = out.get(a.question_id) ?? { required: 0 };
      if (a.relevance === "required" && a.use_in_solving) acc.required++;
      out.set(a.question_id, acc);
    }
  }
  return out;
}

// ── DB write for blocked rows ───────────────────────────────

async function writeSkippedRow({ questionId, reason, diagnosticNote }) {
  const explanationV2 = {
    version: EXPLANATION_V2_VERSION,
    generated_at: new Date().toISOString(),
    generator_role: "phase7_eligibility_gate",
    generator_model: "none",
    status: EXPLANATION_V2_STATUSES.SKIPPED_NOT_ELIGIBLE,
    admin_diagnostic_note: diagnosticNote,
    skip_reason: reason,
  };
  if (DRY_RUN) {
    console.log(
      `  [dry-run] would mark ${questionId.slice(0, 8)} skipped_not_eligible (${reason})`
    );
    return;
  }
  const { error } = await supabase
    .from("quiz_questions")
    .update({
      explanation_v2: explanationV2,
      explanation_v2_filled_at: explanationV2.generated_at,
      explanation_v2_status: EXPLANATION_V2_STATUSES.SKIPPED_NOT_ELIGIBLE,
    })
    .eq("id", questionId);
  if (error) {
    console.warn(`  ✗ write skipped for ${questionId.slice(0, 8)}: ${error.message}`);
  }
}

// ── Main ─────────────────────────────────────────────────────

async function main() {
  console.log("Phase 7 — fill eligibility gate");
  console.log(
    `  source_pdf=${SOURCE_PDF ?? "<all>"} limit=${LIMIT ?? "<none>"} dry-run=${DRY_RUN} force=${FORCE}`
  );
  const candidates = await selectCandidates();
  console.log(`  ${candidates.length} candidate(s)`);
  if (candidates.length === 0) return;

  const phase4 = await hydratePhase4Counts(candidates.map((c) => c.id));

  const tally = { eligible: 0 };
  for (const c of candidates) {
    const hydrated = {
      ...c,
      required_visual_asset_count: phase4.get(c.id)?.required ?? 0,
    };
    const decision = checkFillEligibility(hydrated);
    if (decision.eligible) {
      tally.eligible = (tally.eligible ?? 0) + 1;
      continue;
    }
    const category = categorizeReason(decision.reason);
    tally[category] = (tally[category] ?? 0) + 1;
    if ((tally[category] ?? 0) <= 5) {
      console.log(
        `  ✗ ${c.id.slice(0, 8)} ${c.subject ?? "?"}/${c.answer_format ?? "?"}: ${decision.reason}`
      );
    }
    await writeSkippedRow({
      questionId: c.id,
      reason: decision.reason,
      diagnosticNote: decision.diagnostic_note,
    });
  }

  console.log("");
  console.log("─".repeat(56));
  console.log("Eligibility tally");
  for (const [k, v] of Object.entries(tally).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${k.padEnd(20)} ${v}`);
  }
}

main().catch((err) => {
  console.error("FATAL:", err);
  process.exit(1);
});
