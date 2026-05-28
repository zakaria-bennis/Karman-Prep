// Live peek at pdf_processing_jobs.progress for an in-flight job.
// The orchestrator updates this between stages, so polling gives
// real-time visibility without waiting for GH log flush.
//
// USAGE: node --env-file=.env.local scripts/v2-phase8/peek-job-progress.mjs <job-uuid>
import { createClient } from "@supabase/supabase-js";

const jobId = process.argv[2];
if (!jobId) {
  console.error("usage: peek-job-progress.mjs <job-uuid>");
  process.exit(1);
}
const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

const { data: job, error } = await sb
  .from("pdf_processing_jobs")
  .select("*")
  .eq("id", jobId)
  .single();
if (error) {
  console.error("err:", error.message);
  process.exit(1);
}

console.log(`Job:       ${job.id.slice(0, 8)}…`);
console.log(`Status:    ${job.status}`);
console.log(`Source:    ${job.source_pdf}`);
if (job.error_message) console.log(`Error:     ${job.error_message}`);
console.log(`Progress:  ${JSON.stringify(job.progress, null, 2)}`);
console.log("");
console.log("All columns:");
for (const k of Object.keys(job)) {
  if (k === "progress") continue;
  const v = job[k];
  const s = v === null ? "null" : typeof v === "object" ? JSON.stringify(v) : String(v);
  console.log(`  ${k.padEnd(28)} ${s.slice(0, 80)}`);
}
