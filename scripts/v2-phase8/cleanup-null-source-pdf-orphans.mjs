// ============================================================
// cleanup-null-source-pdf-orphans — one-shot cleanup for the
// Phase 8.1 source_pdf=NULL bug.
//
// Deletes quiz_questions rows where source_pdf IS NULL. Foreign-
// key cascades handle:
//   · answer_choices  (question_id FK, CASCADE)
//   · source_assets   (question_id FK, CASCADE)
//   · question_findings (question_id FK, CASCADE)
//   · math_repair_records (question_id FK, CASCADE)
//   · grader_runs     (question_id FK, CASCADE)
//   · explanation_qa_records (question_id FK, CASCADE)
//
// Safety: pass --confirm to actually delete. Default is dry-run.
//
// USAGE
//   node --env-file=.env.local \
//     scripts/v2-phase8/cleanup-null-source-pdf-orphans.mjs            # dry run
//   node --env-file=.env.local \
//     scripts/v2-phase8/cleanup-null-source-pdf-orphans.mjs --confirm  # do it
// ============================================================

import { createClient } from "@supabase/supabase-js";

const CONFIRM = process.argv.includes("--confirm");

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

// Step 1 — count the targets
const { count: nullCount, error: countErr } = await supabase
  .from("quiz_questions")
  .select("*", { count: "exact", head: true })
  .is("source_pdf", null);
if (countErr) throw countErr;

const { count: totalCount } = await supabase
  .from("quiz_questions")
  .select("*", { count: "exact", head: true });

console.log(`Total quiz_questions rows:             ${totalCount}`);
console.log(`Rows with source_pdf IS NULL:          ${nullCount}`);
console.log(`Rows that WILL be kept:                ${totalCount - nullCount}`);
console.log("");

if (nullCount === 0) {
  console.log("Nothing to clean up. Exiting.");
  process.exit(0);
}

// Step 2 — show the affected ids so the operator can spot-check
const { data: sample } = await supabase
  .from("quiz_questions")
  .select("id, created_at, source_page, question_text")
  .is("source_pdf", null)
  .order("created_at", { ascending: false })
  .limit(5);

console.log("Sample of rows that will be deleted (5 most recent):");
for (const r of sample ?? []) {
  console.log(
    `  ${r.id.slice(0, 8)}… ${r.created_at}  p${r.source_page}  "${(r.question_text ?? "").slice(0, 60)}…"`
  );
}
console.log("");

if (!CONFIRM) {
  console.log("DRY RUN — no rows deleted. Re-run with --confirm to actually delete.");
  process.exit(0);
}

// Step 3 — actually delete
console.log("Deleting all rows with source_pdf IS NULL …");
const { error: delErr, count: deletedCount } = await supabase
  .from("quiz_questions")
  .delete({ count: "exact" })
  .is("source_pdf", null);
if (delErr) throw delErr;

console.log(`Deleted ${deletedCount} rows. Foreign-key cascades handled children.`);

// Step 4 — verify
const { count: remaining } = await supabase
  .from("quiz_questions")
  .select("*", { count: "exact", head: true })
  .is("source_pdf", null);
console.log(`Remaining rows with source_pdf IS NULL: ${remaining}`);
