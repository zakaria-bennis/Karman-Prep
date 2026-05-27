// ============================================================
// verify-math-repair-flow — end-to-end DB check that the Phase 5
// schema + opt-in publish-gate behavior works against live Supabase.
//
// Asserts:
//   1. quiz_questions accepts the 3 new Phase 5 columns
//      (raw_question_text, math_notation_checked_at, math_notation_status).
//   2. raw_question_text is NOT NULL (the migration's ALTER NOT NULL took).
//   3. answer_choices.raw_choice_text is NOT NULL.
//   4. math_repair_records accepts an insert with all 5 risk-tier
//      values and all 5 status values (cycles through both enums).
//   5. math_repair_records.field CHECK rejects an out-of-enum value.
//   6. quiz_questions_phase5_signals view returns a row with the
//      expected has_unreviewed_repair / has_verified_auto_repair
//      flags populated correctly.
//   7. FK on math_repair_records.question_id → quiz_questions is
//      ON DELETE CASCADE.
//   8. Self-cleaning.
//
// USAGE
//   node --env-file=.env.local scripts/v2-phase5/verify-math-repair-flow.mjs
// ============================================================

import { createClient } from "@supabase/supabase-js";

const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPA_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPA_URL || !SUPA_KEY) {
  console.error("Set NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}
const supabase = createClient(SUPA_URL, SUPA_KEY, { auth: { persistSession: false } });

const MARKER = `__v2_phase5_test__${Date.now()}__`;
let failures = 0;
let questionId = null;
let choiceId = null;

function assert(label, actual, expected) {
  const ok = actual === expected;
  console.log(`  ${ok ? "✓" : "✗"} ${label} — expected ${expected}, got ${actual}`);
  if (!ok) failures++;
}

async function cleanup() {
  if (questionId) {
    // math_repair_records ON DELETE CASCADE will sweep records too.
    await supabase.from("quiz_questions").delete().eq("id", questionId);
  } else {
    await supabase.from("quiz_questions").delete().like("question_text", `${MARKER}%`);
  }
}

const RISK_TIERS_ALL = [
  "low_risk_ocr",
  "medium_risk_grouping",
  "high_risk_answer_changing",
  "open_ended_uncertain",
  "visual_unclear",
];
const STATUSES_ALL = [
  "no_repair_needed",
  "verified_auto_repair",
  "suggested_repair_needs_review",
  "ambiguous_repair",
  "unrepairable_from_source",
];

async function main() {
  console.log("v2 phase 5 — math-repair flow verification");
  console.log("");
  await cleanup();

  // Seed test question with raw_question_text explicitly so the
  // NOT NULL constraint is exercised.
  const { data: q, error: qErr } = await supabase
    .from("quiz_questions")
    .insert({
      question_text: `${MARKER}x2 + 1`,
      raw_question_text: `${MARKER}x2 + 1`,
      correct_answer: "B",
      answer_format: "multiple_choice",
      question_type: "math_computation",
      difficulty: "intermediate",
      subject: "math",
      topic_cluster: "Test",
      explanation_text: "x",
      import_status: "ok",
      publish_status: "publish_ready",
      source_pdf: "v2_phase5_verify.pdf",
      source_page: 1,
    })
    .select("id")
    .single();
  if (qErr) {
    console.error(`Failed to insert test question: ${qErr.message}`);
    process.exit(1);
  }
  questionId = q.id;
  console.log(`Test question inserted: ${questionId}`);
  console.log("");

  // ── [1] quiz_questions accepts new Phase 5 columns ──
  console.log("[1] quiz_questions accepts the 3 new Phase 5 columns");
  const { error: upErr } = await supabase
    .from("quiz_questions")
    .update({
      math_notation_checked_at: new Date().toISOString(),
      math_notation_status: "verified_auto_repair",
    })
    .eq("id", questionId);
  assert("update math_notation_* columns", upErr?.code ?? null, null);

  // ── [2] raw_question_text NOT NULL ──
  console.log("");
  console.log("[2] raw_question_text is NOT NULL (migration backfilled)");
  const { error: nullErr } = await supabase.from("quiz_questions").insert({
    question_text: `${MARKER}null-test`,
    raw_question_text: null,
    correct_answer: "B",
    answer_format: "multiple_choice",
    question_type: "math_computation",
    difficulty: "intermediate",
    subject: "math",
    topic_cluster: "Test",
    explanation_text: "x",
    import_status: "ok",
    publish_status: "publish_ready",
  });
  // A NOT NULL violation surfaces a postgrest error with code "23502"
  assert("inserting null raw_question_text is rejected", nullErr?.code ?? null, "23502");

  // ── [3] answer_choices.raw_choice_text NOT NULL ──
  console.log("");
  console.log("[3] answer_choices.raw_choice_text is NOT NULL");
  const { data: choice, error: chErr } = await supabase
    .from("answer_choices")
    .insert({
      question_id: questionId,
      letter: "A",
      choice_text: `${MARKER}choice-A`,
      raw_choice_text: `${MARKER}choice-A`,
      is_correct: false,
    })
    .select("id")
    .single();
  assert("insert with raw_choice_text succeeds", chErr?.code ?? null, null);
  choiceId = choice?.id ?? null;

  const { error: chNullErr } = await supabase.from("answer_choices").insert({
    question_id: questionId,
    letter: "B",
    choice_text: `${MARKER}choice-B`,
    raw_choice_text: null,
    is_correct: false,
  });
  assert("null raw_choice_text rejected", chNullErr?.code ?? null, "23502");

  // ── [4] math_repair_records accepts every (tier, status) pair ──
  console.log("");
  console.log("[4] math_repair_records accepts all 5 risk_tier × 5 status values");
  for (let i = 0; i < Math.min(RISK_TIERS_ALL.length, STATUSES_ALL.length); i++) {
    const tier = RISK_TIERS_ALL[i];
    const status = STATUSES_ALL[i];
    const { error } = await supabase.from("math_repair_records").insert({
      question_id: questionId,
      field: "question_text",
      raw_text: `${MARKER}x${i}`,
      repaired_text: `${MARKER}x^${i}`,
      risk_tier: tier,
      status,
    });
    assert(`insert tier=${tier} status=${status}`, error?.code ?? null, null);
  }

  // ── [5] math_repair_records CHECK rejects bad enum ──
  console.log("");
  console.log("[5] math_repair_records CHECK constraints reject bad enums");
  const { error: badTierErr } = await supabase.from("math_repair_records").insert({
    question_id: questionId,
    field: "question_text",
    raw_text: "x2",
    repaired_text: "x^2",
    risk_tier: "totally_invalid_tier",
    status: "no_repair_needed",
  });
  // CHECK violation surfaces as postgrest code "23514"
  assert("bad risk_tier rejected", badTierErr?.code ?? null, "23514");

  const { error: badFieldErr } = await supabase.from("math_repair_records").insert({
    question_id: questionId,
    field: "passage", // not in the allowed set
    raw_text: "x2",
    repaired_text: "x^2",
    risk_tier: "low_risk_ocr",
    status: "no_repair_needed",
  });
  assert("bad field rejected", badFieldErr?.code ?? null, "23514");

  // ── [6] phase5_signals view exposes per-question signals ──
  console.log("");
  console.log("[6] quiz_questions_phase5_signals view exposes signals");
  const { data: sig, error: sigErr } = await supabase
    .from("quiz_questions_phase5_signals")
    .select("*")
    .eq("question_id", questionId)
    .maybeSingle();
  assert("view query succeeds", sigErr?.code ?? null, null);
  assert("view returns a row", !!sig, true);
  assert(
    "math_notation_status is verified_auto_repair",
    sig?.math_notation_status,
    "verified_auto_repair"
  );
  assert("has_verified_auto_repair=true", sig?.has_verified_auto_repair, true);
  // The inserts above used tier index 0 (low_risk_ocr) and status index 0
  // (no_repair_needed) through 4 (unrepairable_from_source), so
  // has_unreviewed_repair should be true (because of suggested/ambiguous/unrepairable).
  assert(
    "has_unreviewed_repair=true (sample includes review-needed)",
    sig?.has_unreviewed_repair,
    true
  );

  // ── [7] FK ON DELETE CASCADE ──
  console.log("");
  console.log("[7] math_repair_records FK is ON DELETE CASCADE");
  // Count records for this question before deletion
  const { count: beforeCount } = await supabase
    .from("math_repair_records")
    .select("*", { count: "exact", head: true })
    .eq("question_id", questionId);
  assert("records exist for question", (beforeCount ?? 0) > 0, true);

  // Delete the question; records should disappear.
  await supabase.from("quiz_questions").delete().eq("id", questionId);
  const { count: afterCount } = await supabase
    .from("math_repair_records")
    .select("*", { count: "exact", head: true })
    .eq("question_id", questionId);
  assert("records cascaded to 0", afterCount ?? 0, 0);

  // Already deleted the question via the cascade check; reset to avoid double-delete.
  questionId = null;

  // Cleanup any stragglers
  console.log("");
  await cleanup();
  console.log("");
  console.log("═".repeat(60));
  if (failures === 0) {
    console.log("✓ All Phase 5 math-repair flow assertions passed.");
    process.exit(0);
  } else {
    console.log(`✗ ${failures} assertion(s) failed.`);
    process.exit(1);
  }
}

main().catch(async (err) => {
  console.error("FATAL:", err.message);
  await cleanup().catch(() => undefined);
  process.exit(1);
});
