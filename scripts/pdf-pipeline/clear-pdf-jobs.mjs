// ============================================================
// clear-pdf-jobs.mjs — clears every row from pdf_processing_jobs
// so /admin/jobs starts empty. Used to wipe the failure history
// from prior Claude-engine runs before testing the new Gemini
// engine.
//
// Does NOT touch R2-stored PDFs (pdf-inbox/<jobId>/source.pdf
// objects become orphans but cost ~nothing). Doesn't touch
// quiz_questions or any other table.
//
// Usage:
//   node --env-file=.env.local scripts/clear-pdf-jobs.mjs
// ============================================================

import { createClient } from "@supabase/supabase-js";

const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPA_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPA_URL || !SUPA_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const supabase = createClient(SUPA_URL, SUPA_KEY, {
  auth: { persistSession: false },
});

async function main() {
  const { data: before, error: e0 } = await supabase
    .from("pdf_processing_jobs")
    .select("id, source_pdf, status, error_message");
  if (e0) throw e0;
  console.log(`Before: ${before.length} job(s)`);
  for (const r of before) {
    console.log(`  ${r.id}  ${r.status.padEnd(10)}  ${r.source_pdf}`);
    if (r.error_message) console.log(`    ↳ ${r.error_message.slice(0, 100)}`);
  }

  if (before.length === 0) {
    console.log("Nothing to clear.");
    return;
  }

  const ALL = "00000000-0000-0000-0000-000000000000";
  const { error: e1 } = await supabase.from("pdf_processing_jobs").delete().neq("id", ALL);
  if (e1) throw new Error(`delete failed: ${e1.message}`);

  const { count } = await supabase
    .from("pdf_processing_jobs")
    .select("id", { count: "exact", head: true });
  console.log(`\nAfter:  ${count ?? 0} job(s) — /admin/jobs is now empty.`);
}

main().catch((err) => {
  console.error("FATAL:", err.message);
  process.exit(1);
});
