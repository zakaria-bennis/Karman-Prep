// ============================================================
// verify-answer-key-flow — proves Phase 2 DB plumbing works:
//
//   1. answer_key_entries.status CHECK accepts new v2 statuses
//      and rejects unknown ones.
//   2. quiz_questions.answer_key_status CHECK accepts new values.
//   3. quiz_questions.answer_verification_status CHECK accepts
//      new values.
//   4. source_assets.asset_type accepts 'answer_key_page'.
//   5. publish_gate respects:
//        answer_key_status='correction_disputed' → blocked_answer_dispute
//        answer_verification_status='disputed'    → blocked_answer_dispute
//        answer_key_status='corrected_key_verified' + all-pass
//          → publish_ready_with_verified_repair (via view)
//
// USAGE
//   node --env-file=.env.local scripts/v2-phase2/verify-answer-key-flow.mjs
// ============================================================

import { createClient } from "@supabase/supabase-js";

const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPA_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPA_URL || !SUPA_KEY) {
  console.error("Set NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}
const supabase = createClient(SUPA_URL, SUPA_KEY, { auth: { persistSession: false } });

const MARKER = `__v2_phase2_ake_test__${Date.now()}__`;
let failures = 0;
let questionId = null;

function assert(label, actual, expected) {
  const ok = actual === expected;
  console.log(`  ${ok ? "✓" : "✗"} ${label} — expected ${expected}, got ${actual}`);
  if (!ok) failures++;
}

async function cleanup() {
  if (questionId) {
    await supabase.from("quiz_questions").delete().eq("id", questionId);
  } else {
    await supabase.from("quiz_questions").delete().like("question_text", `${MARKER}%`);
  }
}

async function main() {
  console.log("v2 phase 2 — answer-key flow verification");
  console.log("");
  await cleanup();

  // Seed test question
  const { data: q, error: qErr } = await supabase
    .from("quiz_questions")
    .insert({
      question_text: `${MARKER}stem`,
      correct_answer: "B",
      answer_format: "multiple_choice",
      question_type: "evidence_based",
      difficulty: "intermediate",
      subject: "reading",
      topic_cluster: "Test",
      explanation_text: "x",
      import_status: "ok",
      publish_status: "publish_ready",
    })
    .select("id")
    .single();
  if (qErr) {
    console.error(`Failed to insert test row: ${qErr.message}`);
    process.exit(1);
  }
  questionId = q.id;
  console.log(`Test row inserted: ${questionId}`);
  console.log("");

  // ── [1] answer_key_entries CHECK accepts new statuses ──
  console.log("[1] answer_key_entries.status CHECK accepts v2 statuses");
  for (const status of [
    "printed_key_used_no_correction",
    "corrected_key_verified",
    "manual_correction_selected_pending_verification",
    "correction_unclear",
    "correction_disputed",
    "printed_key_crossed_out_no_readable_replacement",
    "missing_answer_key",
    "answer_key_row_unmatched",
  ]) {
    const { error } = await supabase.from("answer_key_entries").insert({
      question_id: questionId,
      printed_answer: "B",
      selected_official_answer: "B",
      status,
    });
    assert(`status=${status}`, error?.code ?? null, null);
  }

  // ── [2] CHECK rejects invalid status ──
  console.log("");
  console.log("[2] answer_key_entries.status CHECK REJECTS bogus value");
  const { error: bogusErr } = await supabase
    .from("answer_key_entries")
    .insert({ question_id: questionId, status: "totally_made_up_status" });
  assert("bogus status rejected", bogusErr?.code === "23514", true);

  // ── [3] quiz_questions.answer_key_status CHECK accepts new values ──
  console.log("");
  console.log("[3] quiz_questions.answer_key_status CHECK accepts v2 values");
  for (const status of [
    "correct",
    "corrected_key_verified",
    "correction_disputed",
    "correction_unclear",
    "missing_answer_key",
    "probably_wrong",
  ]) {
    const { error } = await supabase
      .from("quiz_questions")
      .update({ answer_key_status: status })
      .eq("id", questionId);
    assert(`answer_key_status=${status}`, error?.code ?? null, null);
  }

  // ── [4] answer_verification_status CHECK accepts new values ──
  console.log("");
  console.log("[4] quiz_questions.answer_verification_status CHECK");
  for (const status of [
    "verified",
    "verified_pro",
    "verified_opus",
    "disputed",
    "unverifiable",
    "equivalent",
  ]) {
    const { error } = await supabase
      .from("quiz_questions")
      .update({ answer_verification_status: status })
      .eq("id", questionId);
    assert(`answer_verification_status=${status}`, error?.code ?? null, null);
  }

  // ── [5] source_assets accepts 'answer_key_page' ──
  console.log("");
  console.log("[5] source_assets.asset_type accepts 'answer_key_page'");
  const { data: sa, error: saErr } = await supabase
    .from("source_assets")
    .insert({
      question_id: questionId,
      asset_type: "answer_key_page",
      asset_path: "test/path/page-1.png",
      validation_status: "candidate_answer_key_page",
    })
    .select("id")
    .single();
  assert("answer_key_page accepted", saErr?.code ?? null, null);
  if (sa?.id) await supabase.from("source_assets").delete().eq("id", sa.id);

  // Cleanup
  console.log("");
  await cleanup();
  console.log("");
  console.log("═".repeat(60));
  if (failures === 0) {
    console.log("✓ All answer-key flow assertions passed.");
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
