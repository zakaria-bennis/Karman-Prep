// ============================================================
// orchestrate — single entry point for the full web-based PDF
// pipeline. Designed to be invoked from a GitHub Actions
// workflow with JOB_ID set so progress streams back to the
// website via pdf_processing_jobs.progress.
//
// MODES
//   Local:     node orchestrate.mjs path/to/file.pdf
//              Runs the pipeline against a local PDF. No job-id,
//              progress is just console-logged.
//
//   Remote:    JOB_ID=<uuid> node orchestrate.mjs --from-r2
//              Reads pdf_processing_jobs row, downloads PDF from
//              R2, runs the pipeline, writes status updates back
//              to Supabase as it goes. This is the GitHub Actions
//              path.
//
// STAGES (status: stage in pdf_processing_jobs.progress)
//   extracting  Gemini Flash → structured JSON
//   figures     Page render + bbox + R2 upload per figure
//   csv         JSON → 32-column CSV
//   importing   CSV → quiz_questions + answer_choices
//   filling     Sonnet explanation_text + per-choice + Haiku Desmos
//   grading     Multi-vote answer-key audit
//   done | failed
//
// FAILURES
//   Any stage that exits non-zero marks the job failed with the
//   stage name + last stdout line. The orchestrator does NOT
//   continue past a failure.
// ============================================================

import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { basename, resolve, join } from "node:path";
import { tmpdir } from "node:os";
import { JobStatus } from "../lib/job-status.mjs";

const args = process.argv.slice(2);
const FROM_R2 = args.includes("--from-r2");
const pdfArg = args.find((a) => !a.startsWith("--"));

if (!FROM_R2 && !pdfArg) {
  console.error("Usage:");
  console.error("  Local:  node orchestrate.mjs path/to/file.pdf");
  console.error("  Remote: JOB_ID=<uuid> node orchestrate.mjs --from-r2");
  process.exit(1);
}

const job = new JobStatus();

// ── Resolve the PDF path (download from R2 if --from-r2) ────
async function resolvePdfPath() {
  if (!FROM_R2) {
    return resolve(pdfArg);
  }
  if (!job.jobId) {
    console.error("--from-r2 requires JOB_ID env var");
    process.exit(1);
  }
  console.log(`Job: ${job.jobId}, fetching PDF from R2…`);
  const supa = await job._supabase();
  if (!supa) {
    console.error("Supabase not configured; cannot fetch job row");
    process.exit(1);
  }
  const { data: row, error } = await supa
    .from("pdf_processing_jobs")
    .select("source_pdf, pdf_storage_path")
    .eq("id", job.jobId)
    .single();
  if (error || !row) {
    console.error(`Job row not found: ${error?.message ?? "no row"}`);
    process.exit(1);
  }
  const { S3Client, GetObjectCommand } = await import("@aws-sdk/client-s3");
  const r2 = new S3Client({
    region: "auto",
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
  });
  const result = await r2.send(
    new GetObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: row.pdf_storage_path,
    })
  );
  const chunks = [];
  for await (const ch of result.Body) chunks.push(ch);
  const buf = Buffer.concat(chunks);
  const workdir = join(tmpdir(), `pdf-job-${job.jobId}`);
  mkdirSync(workdir, { recursive: true });
  const pdfPath = join(workdir, row.source_pdf);
  writeFileSync(pdfPath, buf);
  console.log(
    `Downloaded ${row.source_pdf} (${(buf.length / 1024 / 1024).toFixed(2)} MB) → ${pdfPath}`
  );
  return pdfPath;
}

// ── Run a sub-script with stdio inherit; fail the job if it exits non-zero ──
function runStage(label, stage, script, scriptArgs) {
  console.log("");
  console.log("─".repeat(72));
  console.log(`▶ ${label}`);
  console.log("─".repeat(72));
  const result = spawnSync(
    "node",
    [...(existsSync(".env.local") ? ["--env-file=.env.local"] : []), script, ...scriptArgs],
    { stdio: "inherit", env: process.env }
  );
  if (result.status !== 0) {
    throw Object.assign(new Error(`${label} failed with exit ${result.status}`), {
      stage,
    });
  }
}

async function main() {
  const pdfPath = await resolvePdfPath();
  const pdfStem = basename(pdfPath).replace(/\.pdf$/i, "");
  const outputDir = process.env.OUTPUT_DIR ?? tmpdir();
  const jsonOut = join(outputDir, `${pdfStem}-gemini-extracted.json`);
  const csvOut = join(outputDir, `${pdfStem}-import.csv`);

  try {
    // Stage 1: extract structure
    await job.setStage("extracting", { message: `Claude Sonnet 4.6 on ${basename(pdfPath)}` });
    runStage(
      "Stage 1/6 — extract structure (Claude Sonnet 4.6)",
      "extracting",
      "scripts/pdf-pipeline/extract-with-gemini.mjs",
      [pdfPath]
    );
    if (existsSync(jsonOut)) {
      const extracted = JSON.parse(readFileSync(jsonOut, "utf-8"));
      await job.patchStats({ questions_extracted: extracted.length });
    }

    // Stage 2: extract figures
    await job.setStage("figures", { message: "Vision-driven bbox crop + R2 upload" });
    runStage("Stage 2/6 — extract figures", "figures", "scripts/pdf-pipeline/extract-figures.mjs", [
      pdfPath,
      jsonOut,
    ]);
    if (existsSync(jsonOut)) {
      const updated = JSON.parse(readFileSync(jsonOut, "utf-8"));
      const figs = updated.filter((r) => r.image_url).length;
      await job.patchStats({ figures_extracted: figs });
    }

    // Stage 3: emit CSV
    await job.setStage("csv", { message: "Generating 32-column import CSV" });
    runStage("Stage 3/6 — generate CSV", "csv", "scripts/pdf-pipeline/json-to-import-csv.mjs", [
      jsonOut,
      pdfPath,
      csvOut,
    ]);

    // Stage 4: import to DB
    await job.setStage("importing", { message: "Writing rows to quiz_questions + answer_choices" });
    runStage(
      "Stage 4/6 — import to database",
      "importing",
      "scripts/pdf-pipeline/import-csv-direct.mjs",
      [csvOut]
    );

    // Stage 5: fill explanations (Sonnet + Haiku)
    await job.setStage("filling", {
      message: "Sonnet explanation_text + per-choice + Haiku Desmos",
    });
    runStage(
      "Stage 5/6 — fill explanations",
      "filling",
      "scripts/content-generation/fill-all.mjs",
      []
    );

    // Stage 6: multi-vote grader (answer-key audit)
    await job.setStage("grading", {
      message: "Flash + DeepSeek + Llama → Pro → Opus consensus check",
    });
    runStage(
      "Stage 6/6 — multi-vote grader",
      "grading",
      "scripts/question-audit/multi-vote-grader.mjs",
      ["--from-db"]
    );

    await job.complete();
    console.log("");
    console.log("═".repeat(72));
    console.log("✓ Pipeline complete");
    console.log("═".repeat(72));
  } catch (err) {
    const stage = err.stage ?? job.currentStage;
    const msg = err instanceof Error ? err.message : String(err);
    console.error("");
    console.error("═".repeat(72));
    console.error(`✗ FAILED at stage "${stage}": ${msg}`);
    console.error("═".repeat(72));
    await job.fail(msg, { error_stage: stage });
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
