// ============================================================
// wipe-bank.mjs — destructive: clears every imported question
// and every student attempt/response/flag tied to it.
//
// Preserves: curriculum_nodes, pdf_processing_jobs, users, all
// other infra. Curriculum tree (the 89 concept slugs) and the
// /admin/jobs queue history both survive untouched.
//
// Usage:
//   node --env-file=.env.local scripts/wipe-bank.mjs
//
// Required env (same set the other scripts use):
//   NEXT_PUBLIC_SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY
//
// Tables affected (in order):
//   quiz_attempts    → cascades to question_responses (FK ON DELETE CASCADE)
//   quiz_questions   → cascades to answer_choices    (FK ON DELETE CASCADE)
//                       and flagged_questions        (FK ON DELETE CASCADE)
// ============================================================

import { createClient } from "@supabase/supabase-js";

const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPA_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPA_URL || !SUPA_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  console.error("Run with: node --env-file=.env.local scripts/wipe-bank.mjs");
  process.exit(1);
}

const supabase = createClient(SUPA_URL, SUPA_KEY, {
  auth: { persistSession: false },
});

// Tables we care about — counted before & after to confirm impact.
const TABLES = [
  "quiz_questions",
  "answer_choices",
  "question_responses",
  "quiz_attempts",
  "flagged_questions",
  // sanity checks — should NOT decrease
  "pdf_processing_jobs",
];

async function count(table) {
  const { count, error } = await supabase
    .from(table)
    .select("id", { count: "exact", head: true });
  if (error) {
    return `error: ${error.message}`;
  }
  return count ?? 0;
}

async function snapshot(label) {
  console.log(`${label}:`);
  for (const t of TABLES) {
    const c = await count(t);
    console.log(`  ${t.padEnd(24)} ${c}`);
  }
}

async function main() {
  await snapshot("Before wipe");

  // The supabase JS client refuses an unfiltered .delete() to
  // prevent accidents. neq("id", "<random uuid>") is the standard
  // idiom for "delete every row".
  const ALL = "00000000-0000-0000-0000-000000000000";

  console.log("\nWiping quiz_attempts (cascades → question_responses)…");
  const { error: e1 } = await supabase
    .from("quiz_attempts")
    .delete()
    .neq("id", ALL);
  if (e1) throw new Error(`quiz_attempts delete failed: ${e1.message}`);

  console.log("Wiping quiz_questions (cascades → answer_choices, flagged_questions)…");
  const { error: e2 } = await supabase
    .from("quiz_questions")
    .delete()
    .neq("id", ALL);
  if (e2) throw new Error(`quiz_questions delete failed: ${e2.message}`);

  console.log("");
  await snapshot("After wipe");

  console.log("\nDone. Curriculum tree and PDF job history preserved.");
}

main().catch((err) => {
  console.error("FATAL:", err.message);
  process.exit(1);
});
