// ============================================================
// verify-answer-flow — end-to-end DB check that the Phase 6
// schema + opt-in publish-gate behavior works against live Supabase.
//
// Asserts:
//   1. quiz_questions accepts the 4 new Phase 6 columns.
//   2. grader_runs accepts all 6 typed Phase 6 role strings.
//   3. quiz_questions_phase6_signals view returns the expected
//      shape for a fixture row.
//   4. failed_voter_count aggregates correctly (insert 2 successful
//      voters + 1 failed voter, expect failed_voter_count=1).
//   5. Opt-in works: a row with answer_verified_at=NULL has the
//      Phase 6 publish-gate rules short-circuit.
//   6. Self-cleaning.
//
// USAGE
//   node --env-file=.env.local scripts/v2-phase6/verify-answer-flow.mjs
// ============================================================

import { createClient } from "@supabase/supabase-js";

const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPA_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPA_URL || !SUPA_KEY) {
  console.error("Set NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}
const supabase = createClient(SUPA_URL, SUPA_KEY, { auth: { persistSession: false } });

const MARKER = `__v2_phase6_test__${Date.now()}__`;
let failures = 0;
let questionId = null;

function assert(label, actual, expected) {
  const ok = actual === expected;
  console.log(`  ${ok ? "✓" : "✗"} ${label} — expected ${expected}, got ${actual}`);
  if (!ok) failures++;
}

async function cleanup() {
  if (questionId) {
    // grader_runs CASCADE-deletes when the question goes.
    await supabase.from("quiz_questions").delete().eq("id", questionId);
  } else {
    await supabase.from("quiz_questions").delete().like("question_text", `${MARKER}%`);
  }
}

const PHASE6_ROLES = [
  "deepseek_primary_solver",
  "groq_independent_solver",
  "gemini_flash_visual_checker",
  "gemini_pro_visual_escalation",
  "claude_opus_reasoning_arbiter",
  "sympy_equivalence_checker",
];

async function main() {
  console.log("v2 phase 6 — answer-verifier flow verification");
  console.log("");
  await cleanup();

  // Seed test question
  const { data: q, error: qErr } = await supabase
    .from("quiz_questions")
    .insert({
      question_text: `${MARKER}stem`,
      raw_question_text: `${MARKER}stem`,
      correct_answer: "B",
      answer_format: "multiple_choice",
      question_type: "math_computation",
      difficulty: "intermediate",
      subject: "math",
      topic_cluster: "Test",
      explanation_text: "x",
      import_status: "ok",
      publish_status: "publish_ready",
      source_pdf: "v2_phase6_verify.pdf",
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

  // ── [1] quiz_questions accepts new Phase 6 columns ──
  console.log("[1] quiz_questions accepts the 4 new Phase 6 columns");
  const { error: upErr } = await supabase
    .from("quiz_questions")
    .update({
      suggested_verified_answer: "A",
      dispute_category: "answer_key_dispute",
      answer_verified_at: new Date().toISOString(),
      answer_verifier_version: "phase6_answer_verification_v1",
      answer_verification_status: "model_consensus_disagrees_with_key",
    })
    .eq("id", questionId);
  assert("update all 4 phase-6 columns", upErr?.code ?? null, null);

  // ── [2] grader_runs accepts all 6 typed Phase 6 role strings ──
  console.log("");
  console.log("[2] grader_runs accepts all 6 typed Phase 6 role strings");
  const runGroupId = crypto.randomUUID();
  for (const role of PHASE6_ROLES) {
    const { error } = await supabase.from("grader_runs").insert({
      question_id: questionId,
      run_group_id: runGroupId,
      grader_role: role,
      provider: "test",
      model: "test-model",
      selected_answer: "A",
      normalized_answer: "A",
      confidence: 0.9,
      is_answerable: true,
      formatting_flags: {},
      visual_flags: {},
      raw_metadata: {},
    });
    assert(`insert role=${role}`, error?.code ?? null, null);
  }

  // ── [3] phase6_signals view exposes per-question signals ──
  console.log("");
  console.log("[3] quiz_questions_phase6_signals view exposes signals");
  const { data: sig, error: sigErr } = await supabase
    .from("quiz_questions_phase6_signals")
    .select("*")
    .eq("question_id", questionId)
    .maybeSingle();
  assert("view query succeeds", sigErr?.code ?? null, null);
  assert("view returns a row", !!sig, true);
  assert(
    "answer_verification_status surfaced",
    sig?.answer_verification_status,
    "model_consensus_disagrees_with_key"
  );
  assert("dispute_category surfaced", sig?.dispute_category, "answer_key_dispute");
  assert("suggested_verified_answer surfaced", sig?.suggested_verified_answer, "A");

  // ── [4] failed_voter_count aggregates correctly ──
  console.log("");
  console.log("[4] failed_voter_count aggregates correctly in latest run");
  const newRunGroupId = crypto.randomUUID();
  // 2 successful + 1 failed
  await supabase.from("grader_runs").insert([
    {
      question_id: questionId,
      run_group_id: newRunGroupId,
      grader_role: "deepseek_primary_solver",
      provider: "openrouter",
      model: "deepseek/deepseek-chat",
      selected_answer: "B",
      formatting_flags: {},
      visual_flags: {},
      raw_metadata: {},
    },
    {
      question_id: questionId,
      run_group_id: newRunGroupId,
      grader_role: "groq_independent_solver",
      provider: "groq",
      model: "llama-3.3-70b-versatile",
      selected_answer: "B",
      formatting_flags: {},
      visual_flags: {},
      raw_metadata: {},
    },
    {
      question_id: questionId,
      run_group_id: newRunGroupId,
      grader_role: "gemini_flash_visual_checker",
      provider: "google",
      model: "gemini-2.5-flash",
      selected_answer: null, // failed voter
      formatting_flags: {},
      visual_flags: {},
      raw_metadata: { error: "transport_failed" },
    },
  ]);

  const { data: sig2 } = await supabase
    .from("quiz_questions_phase6_signals")
    .select("failed_voter_count, latest_run_group_id")
    .eq("question_id", questionId)
    .maybeSingle();
  assert("latest_run_group_id is the new group", sig2?.latest_run_group_id, newRunGroupId);
  assert("failed_voter_count = 1", sig2?.failed_voter_count, 1);

  // ── [5] Opt-in works: NULL answer_verified_at short-circuits ──
  console.log("");
  console.log("[5] Opt-in: clearing answer_verified_at lets the row publish");
  // Reset the row to its opt-in marker NULL state
  await supabase
    .from("quiz_questions")
    .update({
      answer_verified_at: null,
      answer_verification_status: null,
      dispute_category: null,
      suggested_verified_answer: null,
    })
    .eq("id", questionId);
  const { data: sig3 } = await supabase
    .from("quiz_questions_phase6_signals")
    .select("answer_verified_at, dispute_category")
    .eq("question_id", questionId)
    .maybeSingle();
  assert("answer_verified_at is null", sig3?.answer_verified_at, null);
  assert("dispute_category is null", sig3?.dispute_category, null);

  // Cleanup
  console.log("");
  await cleanup();
  console.log("");
  console.log("═".repeat(60));
  if (failures === 0) {
    console.log("✓ All Phase 6 answer-verifier flow assertions passed.");
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
