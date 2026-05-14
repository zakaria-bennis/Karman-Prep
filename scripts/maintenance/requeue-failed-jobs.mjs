// ============================================================
// requeue-failed-jobs.mjs — flips every status='failed' job back
// to status='queued' and clears the error so the daemon picks it
// up again on the next 30s tick.
//
// Use after fixing whatever caused the failure (e.g. updating
// Gemini quota / billing, fixing a daemon bug). Doesn't touch
// quiz_questions or anything else.
//
// Usage:
//   node --env-file=.env.local scripts/requeue-failed-jobs.mjs
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
  const { data: failed, error: e0 } = await supabase
    .from("pdf_processing_jobs")
    .select("id, source_pdf, status")
    .eq("status", "failed");
  if (e0) throw e0;
  console.log(`Found ${failed.length} failed job(s):`);
  for (const r of failed) console.log(`  ${r.id}  ${r.source_pdf}`);
  if (failed.length === 0) return;

  const reset = {
    status: "queued",
    started_at: null,
    completed_at: null,
    error_message: null,
    module_status: {
      key: "pending",
      m1: "pending",
      m2: "pending",
      m3: "pending",
      m4: "pending",
    },
    progress: {
      stage: "queued",
      message: "Re-queued after upstream fix",
      updated_at: new Date().toISOString(),
    },
    csv_storage_paths: {},
    imported_counts: {},
  };

  const { error: e1 } = await supabase
    .from("pdf_processing_jobs")
    .update(reset)
    .eq("status", "failed");
  if (e1) throw new Error(`requeue failed: ${e1.message}`);

  console.log(`\nRe-queued ${failed.length} job(s). The daemon will pick them up within 30s.`);
}

main().catch((err) => {
  console.error("FATAL:", err.message);
  process.exit(1);
});
