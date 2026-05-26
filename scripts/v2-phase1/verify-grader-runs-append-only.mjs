// ============================================================
// verify-grader-runs-append-only — proves that re-running the
// grader on the same question APPENDS new grader_runs rows
// rather than overwriting old ones.
//
// This is Phase 1 spec §809-813. Unit tests can't cover this
// because it depends on real INSERT behavior + the table's
// schema.
//
// What it asserts:
//   1. Inserting 3 grader_runs rows for one question succeeds.
//   2. Inserting 3 MORE rows for the SAME question succeeds.
//   3. SELECT count for that question === 6.
//   4. The two batches have different run_group_ids.
//   5. Cleanup removes only our test rows.
//
// USAGE
//   node --env-file=.env.local scripts/v2-phase1/verify-grader-runs-append-only.mjs
// ============================================================

import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";

const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPA_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPA_URL || !SUPA_KEY) {
  console.error("Set NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const supabase = createClient(SUPA_URL, SUPA_KEY, { auth: { persistSession: false } });

const MARKER = `__v2_phase1_grader_runs_test__${Date.now()}__`;
let failures = 0;
let questionId = null;

function assert(label, actual, expected) {
  const ok = actual === expected;
  console.log(`  ${ok ? "✓" : "✗"} ${label} — expected ${expected}, got ${actual}`);
  if (!ok) failures++;
}

async function cleanup() {
  if (questionId) {
    // grader_runs ON DELETE CASCADE removes the rows automatically.
    await supabase.from("quiz_questions").delete().eq("id", questionId);
  } else {
    await supabase.from("quiz_questions").delete().like("question_text", `${MARKER}%`);
  }
}

async function main() {
  console.log("v2 phase 1 — grader_runs append-only verification");
  console.log("");
  await cleanup();

  // ── Insert a test question to hang grader_runs off ──
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
      publish_status: "draft",
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

  // ── Round 1: 3 grader_runs ──
  console.log("[1] First grader sweep — insert 3 rows (flash + deepseek + llama)");
  const group1 = randomUUID();
  const r1 = await supabase.from("grader_runs").insert([
    {
      question_id: questionId,
      run_group_id: group1,
      grader_role: "gemini_flash_solver",
      provider: "google",
      model: "gemini-2.5-flash",
      selected_answer: "B",
      answer_key_match: true,
    },
    {
      question_id: questionId,
      run_group_id: group1,
      grader_role: "deepseek_solver",
      provider: "openrouter",
      model: "deepseek-chat",
      selected_answer: "B",
      answer_key_match: true,
    },
    {
      question_id: questionId,
      run_group_id: group1,
      grader_role: "groq_llama_solver",
      provider: "groq",
      model: "llama-3.3-70b-versatile",
      selected_answer: "C",
      answer_key_match: false,
    },
  ]);
  if (r1.error) {
    console.error(`Round 1 insert failed: ${r1.error.message}`);
    process.exit(1);
  }
  const { count: c1 } = await supabase
    .from("grader_runs")
    .select("id", { count: "exact", head: true })
    .eq("question_id", questionId);
  assert("count after round 1 = 3", c1, 3);

  // ── Round 2: 3 MORE grader_runs (different run_group_id) ──
  console.log("");
  console.log("[2] Re-grade — insert 3 NEW rows with a different run_group_id");
  const group2 = randomUUID();
  const r2 = await supabase.from("grader_runs").insert([
    {
      question_id: questionId,
      run_group_id: group2,
      grader_role: "gemini_flash_solver",
      provider: "google",
      model: "gemini-2.5-flash",
      selected_answer: "B",
    },
    {
      question_id: questionId,
      run_group_id: group2,
      grader_role: "gemini_pro_tiebreaker",
      provider: "google",
      model: "gemini-2.5-pro",
      selected_answer: "B",
    },
    {
      question_id: questionId,
      run_group_id: group2,
      grader_role: "claude_opus_arbiter",
      provider: "anthropic",
      model: "claude-opus-4-7",
      selected_answer: "B",
      confidence: 0.95,
    },
  ]);
  if (r2.error) {
    console.error(`Round 2 insert failed: ${r2.error.message}`);
    process.exit(1);
  }

  // ── Assertion 3: count is now 6, not 3 ──
  const { count: c2 } = await supabase
    .from("grader_runs")
    .select("id", { count: "exact", head: true })
    .eq("question_id", questionId);
  assert("count after round 2 = 6 (append, not overwrite)", c2, 6);

  // ── Assertion 4: two distinct run_group_ids ──
  const { data: rows, error: selErr } = await supabase
    .from("grader_runs")
    .select("run_group_id")
    .eq("question_id", questionId);
  if (selErr) throw selErr;
  const groupIds = new Set(rows.map((r) => r.run_group_id));
  assert("two distinct run_group_ids", groupIds.size, 2);
  assert("group1 still present", groupIds.has(group1), true);
  assert("group2 present", groupIds.has(group2), true);

  // ── Cleanup ──
  console.log("");
  await cleanup();
  console.log("");
  console.log("═".repeat(60));
  if (failures === 0) {
    console.log("✓ All grader_runs append-only assertions passed.");
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
