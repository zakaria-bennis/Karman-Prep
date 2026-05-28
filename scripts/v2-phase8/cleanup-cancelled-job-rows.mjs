// ============================================================
// cleanup-cancelled-job-rows — remove rows that came from a
// cancelled / partial pipeline run, scoped to one source_pdf +
// a created_at window.
//
// Used after a workflow is cancelled mid-stage. quiz_questions
// has cascade FKs on answer_choices + source_assets +
// question_findings, so deleting the parent rows cleans up
// everything.
//
// USAGE
//   node --env-file=.env.local \
//     scripts/v2-phase8/cleanup-cancelled-job-rows.mjs \
//     202406asiav2.pdf '2026-05-28T03:39:00Z'             # dry run
//   ... --confirm                                          # actually delete
// ============================================================

import { createClient } from "@supabase/supabase-js";

const sourcePdf = process.argv[2];
const since = process.argv[3];
const CONFIRM = process.argv.includes("--confirm");
if (!sourcePdf || !since) {
  console.error(
    "usage: cleanup-cancelled-job-rows.mjs <source_pdf> <iso-since-timestamp> [--confirm]"
  );
  process.exit(1);
}

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

const { data: rows, error } = await sb
  .from("quiz_questions")
  .select("id, created_at, source_page, question_text")
  .eq("source_pdf", sourcePdf)
  .gte("created_at", since)
  .order("created_at", { ascending: true });
if (error) throw error;

console.log(`Found ${rows.length} rows from ${sourcePdf} since ${since}`);
console.log("");
for (const r of rows.slice(0, 5)) {
  console.log(
    `  ${r.id.slice(0, 8)}… ${r.created_at}  p${r.source_page}  "${(r.question_text ?? "").slice(0, 60)}…"`
  );
}
if (rows.length > 5) console.log(`  … and ${rows.length - 5} more`);
console.log("");

if (rows.length === 0) {
  console.log("Nothing to delete.");
  process.exit(0);
}

if (!CONFIRM) {
  console.log("DRY RUN — pass --confirm to delete.");
  process.exit(0);
}

const ids = rows.map((r) => r.id);
const { error: delErr, count } = await sb
  .from("quiz_questions")
  .delete({ count: "exact" })
  .in("id", ids);
if (delErr) throw delErr;
console.log(`Deleted ${count} rows. FK cascades handled children.`);
