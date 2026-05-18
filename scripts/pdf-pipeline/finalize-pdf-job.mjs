// ============================================================
// finalize-pdf-job — local hybrid-runner step 2 of 2.
//
// Usage:
//   node --env-file=.env.local scripts/pdf-pipeline/finalize-pdf-job.mjs <jobId> <runs-dir>
//
// Example:
//   node --env-file=.env.local scripts/pdf-pipeline/finalize-pdf-job.mjs \
//     7a3b1c9d-2e7f-4a8b-9c1d-abcdef012345 \
//     question-imports/runs/20260428T210000Z
//
// What it does:
//   1. Reads questions.csv and questions_needs_review.csv from <runs-dir>.
//   2. Uploads both to R2 at csv-inbox/<jobId>/{questions,needs_review}.csv.
//   3. Updates the pdf_processing_jobs row:
//        · csv_storage_paths populated
//        · imported_counts set (placeholder — actual import is done by
//          the folder-watch cron in PR 3)
//        · module_status: marks all five sub-tasks "complete"
//          (Hybrid Lite processes the whole PDF in one Claude Code session,
//           so there's no per-module breakdown to track)
//        · status flips to "complete"
//
// At this point the CSVs are in csv-inbox/. The folder-watch cron
// (cf. /api/cron/import-csv-inbox in PR 3) picks them up within ~5 min
// and runs them through actionBulkImport so they land in the bank.
// ============================================================

import { createClient } from "@supabase/supabase-js";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";

const [, , JOB_ID, RUNS_DIR] = process.argv;
if (!JOB_ID || !RUNS_DIR) {
  console.error("Usage: node scripts/pdf-pipeline/finalize-pdf-job.mjs <jobId> <runs-dir>");
  console.error(
    "Example: node scripts/pdf-pipeline/finalize-pdf-job.mjs 7a3b... question-imports/runs/20260428T210000Z"
  );
  process.exit(1);
}

const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPA_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const R2_ACCOUNT = process.env.R2_ACCOUNT_ID;
const R2_KEY = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET = process.env.R2_BUCKET_NAME;

const missing = [
  ["NEXT_PUBLIC_SUPABASE_URL", SUPA_URL],
  ["SUPABASE_SERVICE_ROLE_KEY", SUPA_KEY],
  ["R2_ACCOUNT_ID", R2_ACCOUNT],
  ["R2_ACCESS_KEY_ID", R2_KEY],
  ["R2_SECRET_ACCESS_KEY", R2_SECRET],
  ["R2_BUCKET_NAME", R2_BUCKET],
]
  .filter(([, v]) => !v)
  .map(([k]) => k);
if (missing.length) {
  console.error(`Missing env vars: ${missing.join(", ")}`);
  process.exit(1);
}

const supabase = createClient(SUPA_URL, SUPA_KEY, { auth: { persistSession: false } });
const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${R2_ACCOUNT}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: R2_KEY, secretAccessKey: R2_SECRET },
});

async function main() {
  // 1. Verify the job row exists and is in "running" state.
  const { data: job, error: fetchErr } = await supabase
    .from("pdf_processing_jobs")
    .select("*")
    .eq("id", JOB_ID)
    .maybeSingle();
  if (fetchErr) {
    console.error("Supabase query failed:", fetchErr.message);
    process.exit(1);
  }
  if (!job) {
    console.error(`Job ${JOB_ID} not found.`);
    process.exit(1);
  }
  if (job.status === "complete") {
    console.error(`Job ${JOB_ID} is already complete. Refusing to overwrite.`);
    process.exit(1);
  }

  // 2. Find the CSVs in <runs-dir>.
  await assertDir(RUNS_DIR);

  const okCsvPath = path.join(RUNS_DIR, "questions.csv");
  const flaggedCsvPath = path.join(RUNS_DIR, "questions_needs_review.csv");

  const okExists = await fileExists(okCsvPath);
  const flaggedExists = await fileExists(flaggedCsvPath);

  if (!okExists && !flaggedExists) {
    console.error(`No CSVs found in ${RUNS_DIR}.`);
    console.error(`  Expected: questions.csv or questions_needs_review.csv`);
    process.exit(1);
  }

  console.log(`Finalizing job ${JOB_ID}`);
  console.log(`  Source dir: ${RUNS_DIR}`);
  if (okExists) console.log(`    found questions.csv`);
  if (flaggedExists) console.log(`    found questions_needs_review.csv`);
  console.log("");

  // 3. Upload to R2 csv-inbox/<jobId>/.
  //    The cron route /api/cron/ingest-csv-inbox picks these up and
  //    populates imported_counts with the actual insert/skipped/flagged
  //    breakdown after running them through actionBulkImport. We just
  //    log a rough row count here for the operator.
  const csvStoragePaths = {};
  if (okExists) {
    const buf = await readFile(okCsvPath);
    const key = `csv-inbox/${JOB_ID}/questions.csv`;
    await r2.send(
      new PutObjectCommand({
        Bucket: R2_BUCKET,
        Key: key,
        Body: buf,
        ContentType: "text/csv",
      })
    );
    const rows = countCsvRows(buf.toString("utf-8"));
    console.log(`  uploaded → r2://${R2_BUCKET}/${key} (~${rows} rows)`);
    csvStoragePaths.questions = key;
  }
  if (flaggedExists) {
    const buf = await readFile(flaggedCsvPath);
    const key = `csv-inbox/${JOB_ID}/questions_needs_review.csv`;
    await r2.send(
      new PutObjectCommand({
        Bucket: R2_BUCKET,
        Key: key,
        Body: buf,
        ContentType: "text/csv",
      })
    );
    const rows = countCsvRows(buf.toString("utf-8"));
    console.log(`  uploaded → r2://${R2_BUCKET}/${key} (~${rows} rows)`);
    csvStoragePaths.needs_review = key;
  }

  // 4. Mark all 5 module_status sub-tasks complete (Lite mode).
  //    Per-module tracking is reserved for the future Hybrid Full daemon
  //    that runs each module in its own Claude Code session.
  const moduleStatus = {
    key: "complete",
    m1: "complete",
    m2: "complete",
    m3: "complete",
    m4: "complete",
  };

  // 5. Update the job row. imported_counts stays empty — the cron
  //    populates it after actually running the rows through the bank.
  const { error: updErr } = await supabase
    .from("pdf_processing_jobs")
    .update({
      status: "complete",
      module_status: moduleStatus,
      csv_storage_paths: csvStoragePaths,
      completed_at: new Date().toISOString(),
      progress: {
        stage: "ingesting",
        message: "CSVs uploaded — waiting for bank import",
        updated_at: new Date().toISOString(),
      },
    })
    .eq("id", JOB_ID);
  if (updErr) {
    console.error("Failed to update job row:", updErr.message);
    process.exit(1);
  }

  console.log("");
  console.log(`Job ${JOB_ID} marked complete.`);
  console.log(`  CSVs in r2://${R2_BUCKET}/csv-inbox/${JOB_ID}/`);

  // 6. Best-effort: poke the ingest endpoint so CSVs flow into the
  //    bank immediately rather than waiting for the next cron tick.
  //    Failure here is non-fatal — the cron will catch the row.
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  const cronSecret = process.env.CRON_SECRET;
  if (!appUrl || !cronSecret) {
    console.log(`  Set NEXT_PUBLIC_APP_URL + CRON_SECRET in .env.local for instant ingest.`);
    console.log(`  Otherwise the next folder-watch cron tick will import them.`);
  } else {
    try {
      const res = await fetch(`${appUrl.replace(/\/$/, "")}/api/cron/ingest-csv-inbox`, {
        method: "POST",
        headers: { Authorization: `Bearer ${cronSecret}` },
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        console.log(`  Ingest endpoint returned ${res.status}: ${body.error ?? "unknown"}`);
        console.log(`  The cron will retry on its next tick.`);
      } else {
        const me = body.jobs?.find?.((j) => j.job_id === JOB_ID);
        if (me) {
          console.log(
            `  Ingested into bank: ${me.inserted} ok, ${me.flagged_for_review} flagged${me.skipped_duplicates ? `, ${me.skipped_duplicates} duplicates skipped` : ""}${me.errored ? `, ${me.errored} errors` : ""}.`
          );
        } else {
          console.log(`  Ingest run completed (this job may be in a later batch).`);
        }
      }
    } catch (err) {
      console.log(
        `  Could not reach ingest endpoint: ${err instanceof Error ? err.message : "unknown"}`
      );
      console.log(`  The cron will retry on its next tick.`);
    }
  }

  console.log(`  Track at: /admin/jobs`);
}

async function assertDir(p) {
  try {
    const s = await stat(p);
    if (!s.isDirectory()) throw new Error("not a directory");
  } catch {
    console.error(`Runs directory not found: ${p}`);
    process.exit(1);
  }
}

async function fileExists(p) {
  try {
    const s = await stat(p);
    return s.isFile();
  } catch {
    return false;
  }
}

/** Rough row count: lines minus the header, ignoring blank trailing line.
 *  CSV cells can contain newlines inside quoted fields, so this overcounts
 *  for multi-line cells — that's OK as a "did the routine produce output?"
 *  signal; the real count comes from actionBulkImport in the folder watcher. */
function countCsvRows(text) {
  const lines = text.split("\n").filter((l) => l.trim() !== "");
  return Math.max(0, lines.length - 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
