// ============================================================
// trigger-rerun — re-dispatch the PDF pipeline against an
// existing R2 object without re-uploading.
//
// Reads a prior pdf_processing_jobs row by UUID, creates a fresh
// job row with the same source_pdf + pdf_storage_path (same R2
// key), then exits printing the new job_id. The caller dispatches
// the workflow via `gh workflow run process-pdf.yml -f job_id=…`.
//
// Why a new row instead of resetting the old one: the orchestrator
// writes stage progress + stats into the row over the run. Reusing
// the old row would lose the audit trail of the prior (broken) run.
//
// USAGE
//   node --env-file=.env.local scripts/v2-phase8/trigger-rerun.mjs <prior-job-uuid>
// ============================================================

import { createClient } from "@supabase/supabase-js";

const priorJobId = process.argv[2];
if (!priorJobId) {
  console.error("usage: node scripts/v2-phase8/trigger-rerun.mjs <prior-job-uuid>");
  process.exit(1);
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

// Step 1: read the prior job
const { data: prior, error: readErr } = await supabase
  .from("pdf_processing_jobs")
  .select("*")
  .eq("id", priorJobId)
  .single();
if (readErr || !prior) {
  console.error(`Could not read prior job ${priorJobId}: ${readErr?.message ?? "not found"}`);
  process.exit(1);
}

console.log("Prior job state:");
console.log(`  id:                ${prior.id}`);
console.log(`  source_pdf:        ${prior.source_pdf}`);
console.log(`  pdf_storage_path:  ${prior.pdf_storage_path}`);
console.log(
  `  pdf_size_bytes:    ${prior.pdf_size_bytes} (${(prior.pdf_size_bytes / 1024 / 1024).toFixed(2)} MB)`
);
console.log(`  prior status:      ${prior.status}`);
console.log("");

// Step 2: insert a fresh row pointing at the same R2 object
const { data: created, error: insErr } = await supabase
  .from("pdf_processing_jobs")
  .insert({
    source_pdf: prior.source_pdf,
    pdf_storage_path: prior.pdf_storage_path,
    pdf_size_bytes: prior.pdf_size_bytes,
    uploaded_by_user_id: prior.uploaded_by_user_id,
    status: "queued",
    progress: {
      stage: "queued",
      stage_label: "Queued (rerun via terminal)",
      percent: 0,
      message: "Awaiting GitHub Actions runner",
      updated_at: new Date().toISOString(),
    },
  })
  .select("id")
  .single();
if (insErr || !created) {
  console.error(`Failed to create new job row: ${insErr?.message}`);
  process.exit(1);
}

console.log("New job row created:");
console.log(`  id: ${created.id}`);
console.log("");
console.log("Now dispatch the workflow:");
console.log(`  gh workflow run process-pdf.yml -f job_id=${created.id}`);
console.log("");
console.log("Watch progress:");
console.log(`  gh run watch  (then pick the most recent process-pdf run)`);
