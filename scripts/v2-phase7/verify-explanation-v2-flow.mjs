// ============================================================
// verify-explanation-v2-flow — end-to-end DB check that the
// Phase 7 schema works against live Supabase.
//
// Asserts:
//   1. quiz_questions accepts the 3 new Phase 7 columns
//      (explanation_v2, explanation_v2_filled_at,
//       explanation_v2_status).
//   2. explanation_qa_records accepts every valid (schema_result,
//      critic_result, outcome) combination + rejects bad enum.
//   3. attempt_number CHECK rejects 3.
//   4. quiz_questions_phase7_signals view exposes the latest
//      attempt for a row.
//   5. FK to quiz_questions is ON DELETE CASCADE.
//   6. Opt-in works: a row with explanation_v2_filled_at=NULL is
//      NOT surfaced by phase7_signals as having a verdict.
//   7. Self-cleaning.
//
// USAGE
//   node --env-file=.env.local scripts/v2-phase7/verify-explanation-v2-flow.mjs
// ============================================================

import { createClient } from "@supabase/supabase-js";

const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPA_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPA_URL || !SUPA_KEY) {
  console.error("Set NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}
const supabase = createClient(SUPA_URL, SUPA_KEY, { auth: { persistSession: false } });

const MARKER = `__v2_phase7_test__${Date.now()}__`;
let failures = 0;
let questionId = null;

function assert(label, actual, expected) {
  const ok = actual === expected;
  console.log(`  ${ok ? "✓" : "✗"} ${label} — expected ${expected}, got ${actual}`);
  if (!ok) failures++;
}

async function cleanup() {
  if (questionId) {
    // explanation_qa_records CASCADE-deletes via FK.
    await supabase.from("quiz_questions").delete().eq("id", questionId);
  } else {
    await supabase.from("quiz_questions").delete().like("question_text", `${MARKER}%`);
  }
}

async function main() {
  console.log("v2 phase 7 — explanation-v2 flow verification");
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
      question_type: "evidence_based",
      difficulty: "intermediate",
      subject: "reading",
      topic_cluster: "Test",
      explanation_text: "x",
      import_status: "ok",
      publish_status: "publish_ready",
      source_pdf: "v2_phase7_verify.pdf",
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

  // ── [1] quiz_questions accepts the 3 new Phase 7 columns ──
  console.log("[1] quiz_questions accepts the 3 new Phase 7 columns");
  const explanationV2Bundle = {
    version: "explanation_v2_v1",
    generated_at: new Date().toISOString(),
    generator_role: "explanation_v2_generator_sonnet",
    generator_model: "claude-sonnet-4-6",
    status: "qa_passed",
    correct_reasoning: "Test reasoning",
    choices: {
      A: { explanation: "x", evidence: "y", misconception_note: null, internal_category: null },
      B: { explanation: "x", evidence: "y", misconception_note: null, internal_category: null },
      C: { explanation: "x", evidence: "y", misconception_note: null, internal_category: null },
      D: { explanation: "x", evidence: "y", misconception_note: null, internal_category: null },
    },
    normal_tip: null,
    desmos_tip: null,
    slug_alignment: { slug: "test", confidence: 0.9, reason: "test" },
  };
  const { error: upErr } = await supabase
    .from("quiz_questions")
    .update({
      explanation_v2: explanationV2Bundle,
      explanation_v2_filled_at: new Date().toISOString(),
      explanation_v2_status: "qa_passed",
    })
    .eq("id", questionId);
  assert("update all 3 phase-7 cols", upErr?.code ?? null, null);

  // ── [2] explanation_qa_records: valid enums accepted ──
  console.log("");
  console.log("[2] explanation_qa_records accepts valid (schema_result, critic_result, outcome)");
  const validCombos = [
    { schema: "pass", critic: "pass", outcome: "qa_passed" },
    { schema: "pass", critic: "fail_fixable", outcome: "will_retry" },
    { schema: "pass", critic: "fail_serious", outcome: "qa_failed" },
    { schema: "fail", critic: null, outcome: "qa_failed" },
    { schema: "pass", critic: null, outcome: "needs_human_review" },
  ];
  for (const c of validCombos) {
    const { error } = await supabase.from("explanation_qa_records").insert({
      question_id: questionId,
      attempt_number: 1,
      generator_role: "test_generator",
      generator_model: "test-model",
      schema_result: c.schema,
      critic_result: c.critic,
      outcome: c.outcome,
      raw_metadata: {},
    });
    assert(
      `combo schema=${c.schema} critic=${c.critic ?? "null"} outcome=${c.outcome}`,
      error?.code ?? null,
      null
    );
  }

  // ── [3] CHECK rejects bad enum + attempt_number out of range ──
  console.log("");
  console.log("[3] CHECK constraints reject bad values");
  const { error: badSchema } = await supabase.from("explanation_qa_records").insert({
    question_id: questionId,
    attempt_number: 1,
    generator_role: "x",
    generator_model: "x",
    schema_result: "not_a_value",
    outcome: "qa_passed",
    raw_metadata: {},
  });
  assert("bad schema_result rejected", badSchema?.code ?? null, "23514");

  const { error: badAttempt } = await supabase.from("explanation_qa_records").insert({
    question_id: questionId,
    attempt_number: 3, // out of [1, 2]
    generator_role: "x",
    generator_model: "x",
    schema_result: "pass",
    outcome: "qa_passed",
    raw_metadata: {},
  });
  assert("attempt_number=3 rejected", badAttempt?.code ?? null, "23514");

  const { error: badOutcome } = await supabase.from("explanation_qa_records").insert({
    question_id: questionId,
    attempt_number: 1,
    generator_role: "x",
    generator_model: "x",
    schema_result: "pass",
    outcome: "not_a_real_outcome",
    raw_metadata: {},
  });
  assert("bad outcome rejected", badOutcome?.code ?? null, "23514");

  // ── [4] phase7_signals view exposes latest attempt ──
  console.log("");
  console.log("[4] quiz_questions_phase7_signals exposes latest attempt");
  // Insert one more recent attempt to ensure "latest" picks the
  // newest by created_at.
  await supabase.from("explanation_qa_records").insert({
    question_id: questionId,
    attempt_number: 2,
    generator_role: "explanation_v2_generator_opus",
    generator_model: "claude-opus-4-7",
    schema_result: "pass",
    critic_result: "pass",
    outcome: "qa_passed",
    raw_metadata: { final: true },
  });
  const { data: sig, error: sigErr } = await supabase
    .from("quiz_questions_phase7_signals")
    .select("*")
    .eq("question_id", questionId)
    .maybeSingle();
  assert("view query succeeds", sigErr?.code ?? null, null);
  assert("view returns a row", !!sig, true);
  assert("explanation_v2_status surfaced", sig?.explanation_v2_status, "qa_passed");
  assert("latest_qa_attempt_number = 2 (newest by created_at)", sig?.latest_qa_attempt_number, 2);
  assert("latest_qa_outcome = qa_passed", sig?.latest_qa_outcome, "qa_passed");

  // ── [5] FK ON DELETE CASCADE ──
  console.log("");
  console.log("[5] explanation_qa_records FK ON DELETE CASCADE");
  const { count: beforeCount } = await supabase
    .from("explanation_qa_records")
    .select("*", { count: "exact", head: true })
    .eq("question_id", questionId);
  assert("records exist for question", (beforeCount ?? 0) > 0, true);
  await supabase.from("quiz_questions").delete().eq("id", questionId);
  const { count: afterCount } = await supabase
    .from("explanation_qa_records")
    .select("*", { count: "exact", head: true })
    .eq("question_id", questionId);
  assert("records cascaded to 0", afterCount ?? 0, 0);
  questionId = null;

  // ── [6] Opt-in: NULL explanation_v2_filled_at short-circuits ──
  console.log("");
  console.log("[6] Opt-in: NULL explanation_v2_filled_at returns null status in view");
  const { data: q2 } = await supabase
    .from("quiz_questions")
    .insert({
      question_text: `${MARKER}stem2`,
      raw_question_text: `${MARKER}stem2`,
      correct_answer: "A",
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
  questionId = q2?.id;
  const { data: sig2 } = await supabase
    .from("quiz_questions_phase7_signals")
    .select("explanation_v2_filled_at, explanation_v2_status, latest_qa_outcome")
    .eq("question_id", questionId)
    .maybeSingle();
  assert("explanation_v2_filled_at is null", sig2?.explanation_v2_filled_at, null);
  assert("explanation_v2_status is null", sig2?.explanation_v2_status, null);
  assert("latest_qa_outcome is null (no records)", sig2?.latest_qa_outcome, null);

  // Cleanup
  console.log("");
  await cleanup();
  console.log("");
  console.log("═".repeat(60));
  if (failures === 0) {
    console.log("✓ All Phase 7 explanation-v2 flow assertions passed.");
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
