// ============================================================
// verify-live-view-safety — end-to-end DB check that the new
// quiz_questions_live view ACTUALLY filters on publish_status.
//
// This is the "tests or scripts proving live view safety"
// deliverable from Phase 1 spec §851. Unit tests cover the
// publish-gate decision logic (publish-gate-logic.test.ts);
// THIS script proves the VIEW behaves as documented.
//
// What it asserts:
//   1. A row inserted with publish_status='draft' is NOT in
//      quiz_questions_live (even when import_status='ok').
//   2. The same row, flipped to publish_status='publish_ready',
//      IS in quiz_questions_live.
//   3. publish_status='needs_human_review' is NOT in the view.
//   4. publish_status='publish_ready_with_verified_repair' IS.
//   5. The row is automatically cleaned up.
//
// USAGE
//   node --env-file=.env.local scripts/v2-phase1/verify-live-view-safety.mjs
//
// REQUIRES
//   NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
//   The migration 20260525000000_pdf_ingestion_v2_phase1.sql applied.
//
// Exit code 0 on all pass, 1 on any fail.
// ============================================================

import { createClient } from "@supabase/supabase-js";

const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPA_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPA_URL || !SUPA_KEY) {
  console.error("Set NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const supabase = createClient(SUPA_URL, SUPA_KEY, { auth: { persistSession: false } });

// Use a marker question_text so cleanup can find this row even if
// the test fails mid-way and the id is lost.
const MARKER = `__v2_phase1_live_view_test__${Date.now()}__`;

let failures = 0;
let testId = null;

function assert(label, actual, expected) {
  const ok = actual === expected;
  console.log(`  ${ok ? "✓" : "✗"} ${label} — expected ${expected}, got ${actual}`);
  if (!ok) failures++;
}

async function isInLiveView(id) {
  const { data, error } = await supabase
    .from("quiz_questions_live")
    .select("id")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return !!data;
}

async function cleanup() {
  // Delete anything matching our marker, even from prior runs.
  const { error } = await supabase
    .from("quiz_questions")
    .delete()
    .like("question_text", `${MARKER}%`);
  if (error) console.log(`  cleanup warning: ${error.message}`);
}

async function main() {
  console.log("v2 phase 1 — live-view safety verification");
  console.log("");

  await cleanup(); // sweep stale marker rows from prior crashed runs

  // ── INSERT test row with import_status='ok' but publish_status='draft' ──
  const { data: inserted, error: insErr } = await supabase
    .from("quiz_questions")
    .insert({
      question_text: `${MARKER}sample stem`,
      correct_answer: "A",
      answer_format: "multiple_choice",
      question_type: "evidence_based",
      difficulty: "intermediate",
      subject: "reading",
      topic_cluster: "Test",
      explanation_text: "test explanation",
      import_status: "ok",
      publish_status: "draft",
    })
    .select("id")
    .single();
  if (insErr) {
    console.error(`Failed to insert test row: ${insErr.message}`);
    process.exit(1);
  }
  testId = inserted.id;
  console.log(`Test row inserted: ${testId}`);
  console.log("");

  // ── ASSERT 1: draft + import_status=ok → NOT in live view ──
  console.log("[1] publish_status='draft' (with import_status='ok')");
  let inView = await isInLiveView(testId);
  assert("NOT in quiz_questions_live", inView, false);

  // ── ASSERT 2: publish_ready → IN live view ──
  console.log("");
  console.log("[2] publish_status='publish_ready'");
  await supabase
    .from("quiz_questions")
    .update({ publish_status: "publish_ready" })
    .eq("id", testId);
  inView = await isInLiveView(testId);
  assert("IN quiz_questions_live", inView, true);

  // ── ASSERT 3: needs_human_review → NOT in live view ──
  console.log("");
  console.log("[3] publish_status='needs_human_review'");
  await supabase
    .from("quiz_questions")
    .update({ publish_status: "needs_human_review" })
    .eq("id", testId);
  inView = await isInLiveView(testId);
  assert("NOT in quiz_questions_live", inView, false);

  // ── ASSERT 4: publish_ready_with_verified_repair → IN live view ──
  console.log("");
  console.log("[4] publish_status='publish_ready_with_verified_repair'");
  await supabase
    .from("quiz_questions")
    .update({ publish_status: "publish_ready_with_verified_repair" })
    .eq("id", testId);
  inView = await isInLiveView(testId);
  assert("IN quiz_questions_live", inView, true);

  // ── ASSERT 5: blocked_katex_error → NOT in live view ──
  console.log("");
  console.log("[5] publish_status='blocked_katex_error'");
  await supabase
    .from("quiz_questions")
    .update({ publish_status: "blocked_katex_error" })
    .eq("id", testId);
  inView = await isInLiveView(testId);
  assert("NOT in quiz_questions_live", inView, false);

  // ── Cleanup ──
  console.log("");
  await cleanup();
  console.log("");
  console.log("═".repeat(60));
  if (failures === 0) {
    console.log("✓ All 5 live-view safety assertions passed.");
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
