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
//   extracting   Claude Sonnet → structured JSON
//   figures      Page render + bbox + R2 upload per figure
//   csv          JSON → 32-column CSV
//   importing    CSV → quiz_questions + answer_choices (publish_status='draft')
//   answer_key   v2 phase 2 — detect key pages, extract printed answers +
//                red-ink corrections, write answer_key_entries +
//                quiz_questions.selected_official_answer
//   crops        v2 phase 3 — per-page render, per-question bbox detection
//                via Gemini Flash, source_assets:page_image + question_crop
//                + expanded_question_crop with match_method + crop_complete
//   visuals      v2 phase 4 — classify problem-required visuals vs
//                repeated calculator/sidebar/background artifacts
//   filling      Sonnet explanation_text + per-choice + Haiku Desmos
//   grading      Multi-vote audit (uses selected_official_answer when set);
//                writes grader_runs append-only + answer_verification_status
//   validating   v2 phase 1 — strict server-side KaTeX validation
//   publishing   v2 phase 1+2+3 — publish-gate (now with phase 3 source-
//                evidence gates, all opt-in per source_assets_processed_at)
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
      "Stage 1/11 — extract structure (Claude Sonnet 4.6)",
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
    runStage(
      "Stage 2/11 — extract figures",
      "figures",
      "scripts/pdf-pipeline/extract-figures.mjs",
      [pdfPath, jsonOut]
    );
    if (existsSync(jsonOut)) {
      const updated = JSON.parse(readFileSync(jsonOut, "utf-8"));
      const figs = updated.filter((r) => r.image_url).length;
      await job.patchStats({ figures_extracted: figs });
    }

    // Stage 3: emit CSV
    await job.setStage("csv", { message: "Generating 32-column import CSV" });
    runStage("Stage 3/11 — generate CSV", "csv", "scripts/pdf-pipeline/json-to-import-csv.mjs", [
      jsonOut,
      pdfPath,
      csvOut,
    ]);

    // Stage 4: import to DB
    await job.setStage("importing", { message: "Writing rows to quiz_questions + answer_choices" });
    runStage(
      "Stage 4/11 — import to database",
      "importing",
      "scripts/pdf-pipeline/import-csv-direct.mjs",
      [csvOut]
    );

    // v2 phase 1: every per-job stage from here on filters to JUST
    // the rows for THIS PDF. Without --source-pdf the fill + grader
    // ran across the whole bank on every import, making per-job
    // cost + wall-time unpredictable.
    const sourcePdfBasename = basename(pdfPath);

    // v2 phase 2: extract answer key (with red-ink correction
    // awareness) BEFORE the grader runs so the grader compares
    // against selected_official_answer not raw correct_answer.
    await job.setStage("answer_key", {
      message: "Detecting answer-key pages + extracting corrections",
    });
    runStage(
      "Stage 5/11 — extract answer key (v2 phase 2)",
      "answer_key",
      "scripts/pdf-pipeline/extract-answer-key.mjs",
      [pdfPath, "--source-pdf", sourcePdfBasename, ...(job.jobId ? ["--job-id", job.jobId] : [])]
    );

    // v2 phase 3: per-question source-asset extraction. Renders every
    // page that has a quiz_questions row on it, detects question bboxes
    // via Gemini Flash, crops tight + expanded per question, writes
    // source_assets rows with match_method + match_confidence.
    // Sets quiz_questions.source_assets_processed_at — this is the
    // opt-in marker for the Phase 3 publish-gate rules below.
    await job.setStage("crops", {
      message: "Per-question source-asset extraction",
    });
    runStage(
      "Stage 6/11 — extract question crops (v2 phase 3)",
      "crops",
      "scripts/pdf-pipeline/extract-question-crops.mjs",
      [pdfPath, "--source-pdf", sourcePdfBasename, ...(job.jobId ? ["--job-id", job.jobId] : [])]
    );

    // v2 phase 4: classify source visual assets before any downstream
    // solver/explainer uses them. This is intentionally after crops
    // because repeated page/sidebar artifacts are easiest to spot once
    // the source_assets registry is populated.
    await job.setStage("visuals", {
      message: "Classifying visual relevance",
    });
    runStage(
      "Stage 7/11 — classify visual relevance (v2 phase 4)",
      "visuals",
      "scripts/pdf-pipeline/classify-visual-relevance.mjs",
      ["--source-pdf", sourcePdfBasename]
    );

    // Stage 8: fill explanations (Sonnet + Haiku) — scoped to this PDF
    await job.setStage("filling", {
      message: "Sonnet explanation_text + per-choice + Haiku Desmos",
    });
    runStage(
      "Stage 8/11 — fill explanations",
      "filling",
      "scripts/content-generation/fill-all.mjs",
      ["--source-pdf", sourcePdfBasename]
    );

    // Stage 9: multi-vote grader — uses selected_official_answer
    await job.setStage("grading", {
      message: "Flash + DeepSeek + Llama → Pro → Opus consensus check",
    });
    runStage(
      "Stage 9/11 — multi-vote grader",
      "grading",
      "scripts/question-audit/multi-vote-grader.mjs",
      ["--from-db", "--source-pdf", sourcePdfBasename]
    );

    // Stage 10: strict server-side KaTeX validation
    await job.setStage("validating", {
      message: "Strict server-side KaTeX validation",
    });
    runStage(
      "Stage 10/11 — validate KaTeX",
      "validating",
      "scripts/question-audit/validate-katex.mjs",
      ["--source-pdf", sourcePdfBasename, "--apply-blocks"]
    );

    // Stage 11: publish-gate — promote rows to publish_ready
    // The central enforcement of v2 phase 1. New rows arrived as
    // 'draft' from stage 4; this stage flips them to publish_ready
    // ONLY when every gate passes (KaTeX, grader, slug, required
    // fields, explanation present, import_status ok).
    await job.setStage("publishing", {
      message: "Publish-gate evaluation (promote draft → publish_ready)",
    });
    runStage("Stage 11/11 — publish gate", "publishing", "scripts/pdf-pipeline/publish-gate.mjs", [
      "--source-pdf",
      sourcePdfBasename,
    ]);

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
