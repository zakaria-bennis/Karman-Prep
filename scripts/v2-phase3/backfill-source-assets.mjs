// ============================================================
// backfill-source-assets — operator script for running Phase 3
// source-asset extraction on an existing v1 PDF.
//
// v1 rows in the bank have no source_assets:page_image /
// question_crop / expanded_question_crop entries — they predate
// Phase 3. Running this script on a PDF whose source file is
// still in R2 brings those rows under Phase 3's jurisdiction
// (sets source_assets_processed_at) and creates the lineage
// evidence.
//
// USAGE
//   node --env-file=.env.local scripts/v2-phase3/backfill-source-assets.mjs \
//        --source-pdf <filename> [--limit N] [--force]
//
// Flow:
//   1. Look up pdf_processing_jobs row by source_pdf (most recent).
//   2. Refuse to run if status='running' (concurrent pipeline).
//   3. Download the PDF from R2 to a tempfile.
//   4. spawn extract-question-crops.mjs against that tempfile.
//   5. Clean up the tempfile.
// ============================================================

import { spawnSync } from "node:child_process";
import { writeFileSync, mkdirSync, unlinkSync, existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { createClient } from "@supabase/supabase-js";

const args = process.argv.slice(2);
function getFlag(name) {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : null;
}
const SOURCE_PDF = getFlag("--source-pdf");
const LIMIT = getFlag("--limit");
const FORCE = args.includes("--force");

if (!SOURCE_PDF) {
  console.error("Usage: backfill-source-assets.mjs --source-pdf <filename> [--limit N] [--force]");
  process.exit(1);
}

const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPA_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPA_URL || !SUPA_KEY) {
  console.error("Set NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}
const supabase = createClient(SUPA_URL, SUPA_KEY, { auth: { persistSession: false } });

async function main() {
  console.log(`backfill-source-assets for source_pdf=${SOURCE_PDF}`);

  // Find most-recent pdf_processing_jobs row for this filename
  const { data: jobs, error: jobErr } = await supabase
    .from("pdf_processing_jobs")
    .select("id, source_pdf, pdf_storage_path, status, uploaded_at")
    .eq("source_pdf", SOURCE_PDF)
    .order("uploaded_at", { ascending: false })
    .limit(1);
  if (jobErr) throw jobErr;
  const job = jobs?.[0];
  if (!job) {
    console.error(`No pdf_processing_jobs row found for source_pdf="${SOURCE_PDF}".`);
    console.error(
      `This PDF was likely imported via the older CSV path which doesn't store the source PDF in R2.`
    );
    console.error(`Backfill not possible without the original PDF.`);
    process.exit(1);
  }
  console.log(
    `  found job ${job.id} (status=${job.status}, uploaded ${job.uploaded_at}, key=${job.pdf_storage_path})`
  );
  if (job.status === "running") {
    console.error(`Job is currently 'running' — refusing to backfill concurrently.`);
    console.error(`Wait for the live pipeline to finish or fail, then re-run.`);
    process.exit(1);
  }

  // Download from R2
  const { S3Client, GetObjectCommand } = await import("@aws-sdk/client-s3");
  const r2 = new S3Client({
    region: "auto",
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
  });
  console.log(`  downloading r2://${process.env.R2_BUCKET_NAME}/${job.pdf_storage_path}…`);
  const r2Resp = await r2.send(
    new GetObjectCommand({ Bucket: process.env.R2_BUCKET_NAME, Key: job.pdf_storage_path })
  );
  const chunks = [];
  for await (const ch of r2Resp.Body) chunks.push(ch);
  const buf = Buffer.concat(chunks);
  console.log(`  downloaded ${(buf.length / 1024 / 1024).toFixed(2)} MB`);

  // Write to tempfile
  const workdir = join(tmpdir(), `backfill-${job.id}`);
  mkdirSync(workdir, { recursive: true });
  const pdfPath = join(workdir, SOURCE_PDF);
  writeFileSync(pdfPath, buf);

  // Call extract-question-crops as a child process so this stays
  // a thin orchestrator
  const childArgs = [
    "--env-file=.env.local",
    "scripts/pdf-pipeline/extract-question-crops.mjs",
    pdfPath,
    "--source-pdf",
    SOURCE_PDF,
    "--job-id",
    job.id,
  ];
  if (FORCE) childArgs.push("--force");
  // The child script doesn't natively support --limit; if the user
  // passes --limit, we just log and ignore (it's the caller's job
  // to scope manually for now).
  if (LIMIT) {
    console.log(
      `  --limit ${LIMIT} requested; extract-question-crops processes all rows for the PDF (per-row limiting deferred)`
    );
  }

  console.log("");
  console.log("─".repeat(60));
  console.log(`Spawning: node ${childArgs.slice(1).join(" ")}`);
  console.log("─".repeat(60));
  const result = spawnSync("node", existsSync(".env.local") ? childArgs : childArgs.slice(1), {
    stdio: "inherit",
    env: process.env,
  });

  // Cleanup
  try {
    unlinkSync(pdfPath);
  } catch {
    /* fine */
  }

  if (result.status !== 0) {
    console.error(`extract-question-crops failed with exit ${result.status}.`);
    process.exit(result.status ?? 1);
  }
  console.log("");
  console.log("✓ Backfill complete.");
}

main().catch((err) => {
  console.error("FATAL:", err.message);
  process.exit(1);
});
