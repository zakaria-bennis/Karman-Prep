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
//   importing    v2 phase 8.1 — JSON → quiz_questions / answer_choices /
//                answer_key_entries / source_assets directly, via the
//                shared import-core module. CSV is now debug-only.
//   answer_key   v2 phase 2 — detect key pages, extract printed answers +
//                red-ink corrections, write answer_key_entries +
//                quiz_questions.selected_official_answer
//   crops        v2 phase 3 — per-page render, per-question bbox detection
//                via Gemini Flash, source_assets:page_image + question_crop
//                + expanded_question_crop with match_method + crop_complete
//   visuals      v2 phase 4 — classify problem-required visuals vs
//                repeated calculator/sidebar/background artifacts
//   math_repair  v2 phase 5 — detect OCR-mangled math notation,
//                auto-repair only low-risk cases that clear the
//                8-condition gate; route everything else to review.
//   grading      v2 phase 6 — typed answer verifier (DeepSeek primary,
//                Groq independent, Gemini Flash visual; Pro/Opus/SymPy
//                escalation by typed dispute category). Writes
//                grader_runs append-only + Phase 6 verdict columns.
//                Never auto-flips selected_official_answer.
//                MOVED UP in Phase 7 reorder — runs BEFORE explanation
//                generation so we don't polish broken/disputed rows.
//   fill_gate    v2 phase 7 — pre-fill eligibility gate. Marks broken,
//                disputed, or visually-incomplete rows skipped_not_eligible
//                with an admin-facing diagnostic note. Eligible rows
//                continue to the next stage.
//   filling      v2 phase 7 — generates explanation_v2 JSONB (tiered
//                Sonnet/Opus) for eligible rows. Mirrors compatible
//                fields back to legacy explanation_text /
//                explanation_per_choice / desmos_strategy.
//   qa_filling   v2 phase 7 — schema-validate + LLM critic on each
//                explanation_v2 bundle. One bounded repair-retry on
//                fixable critic failures. Writes explanation_qa_records.
//   auditing     v2 phase 8.3 — run four typed audit modules
//                (well-formedness, slug-alignment, figure-coherence,
//                explanation-consistency). Findings land in
//                question_findings. Publish-gate reads BLOCKING
//                findings and routes affected rows to review.
//   validating   v2 phase 1 — strict server-side KaTeX validation
//   publishing   v2 phase 1+2+3+5+6+7 — publish-gate (now with phase
//                3 source-evidence gates + phase 5 math-notation gates
//                + phase 6 verifier gates + phase 7 explanation gates,
//                all opt-in per their respective processed_at markers)
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
//
// runner: "node" (default) or "tsx" — TypeScript stages (e.g. Phase
// 8.1's import-json-direct.ts) run via `npx tsx` so they can import
// from the @/ TS aliases without a separate build step.
function runStage(label, stage, script, scriptArgs, { runner = "node" } = {}) {
  console.log("");
  console.log("─".repeat(72));
  console.log(`▶ ${label}`);
  console.log("─".repeat(72));
  const cmd = runner === "tsx" ? "npx" : "node";
  const cmdArgs =
    runner === "tsx"
      ? [
          "tsx",
          ...(existsSync(".env.local") ? ["--env-file=.env.local"] : []),
          script,
          ...scriptArgs,
        ]
      : [...(existsSync(".env.local") ? ["--env-file=.env.local"] : []), script, ...scriptArgs];
  const result = spawnSync(cmd, cmdArgs, { stdio: "inherit", env: process.env });
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

  try {
    // Stage 1: extract structure
    await job.setStage("extracting", { message: `Claude Sonnet 4.6 on ${basename(pdfPath)}` });
    runStage(
      "Stage 1/14 — extract structure (Claude Sonnet 4.6)",
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
      "Stage 2/14 — extract figures",
      "figures",
      "scripts/pdf-pipeline/extract-figures.mjs",
      [pdfPath, jsonOut]
    );
    if (existsSync(jsonOut)) {
      const updated = JSON.parse(readFileSync(jsonOut, "utf-8"));
      const figs = updated.filter((r) => r.image_url).length;
      await job.patchStats({ figures_extracted: figs });
    }

    // Stage 3: import JSON directly to DB (v2 phase 8.1)
    //
    // Replaces the previous Stage 3 (emit CSV) + Stage 4 (import CSV)
    // combo. JSON output from extract-with-gemini.mjs goes straight
    // to quiz_questions / answer_choices / answer_key_entries /
    // source_assets via the shared import-core module. CSV is now a
    // debug-only export (json-to-import-csv.mjs stays in repo).
    await job.setStage("importing", {
      message: "Writing rows to quiz_questions + answer_choices (JSON-direct)",
    });
    // The import script REQUIRES pdfPath so it can inject
    // source_pdf = basename(pdfPath) into every row. Without that,
    // every downstream stage (4-14) would silently no-op because
    // they all filter by source_pdf. Caught by the 8.3 smoke test.
    runStage(
      "Stage 3/14 — import JSON to database (v2 phase 8.1)",
      "importing",
      "scripts/pdf-pipeline/import-json-direct.ts",
      [jsonOut, pdfPath],
      { runner: "tsx" }
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
      "Stage 4/14 — extract answer key (v2 phase 2)",
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
      "Stage 5/14 — extract question crops (v2 phase 3)",
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
      "Stage 6/14 — classify visual relevance (v2 phase 4)",
      "visuals",
      "scripts/pdf-pipeline/classify-visual-relevance.mjs",
      ["--source-pdf", sourcePdfBasename]
    );

    // v2 phase 5: math notation repair. Runs AFTER phase 3 (because the
    // 8-condition gate checks the question_crop visually) and BEFORE
    // grading (so the grader scores the repaired text, not the OCR-
    // mangled raw). Cautious by design — only low-risk repairs that
    // clear ALL 8 conditions auto-apply; everything else routes to
    // human review via math_notation_status.
    await job.setStage("math_repair", {
      message: "Detecting OCR-mangled math notation",
    });
    runStage(
      "Stage 7/14 — repair math notation (v2 phase 5)",
      "math_repair",
      "scripts/pdf-pipeline/repair-math-notation.mjs",
      ["--source-pdf", sourcePdfBasename]
    );

    // Stage 9: v2 phase 6 — typed answer verifier.
    //
    // Phase 7 REORDER: verify now runs BEFORE explanation fill so
    // we don't generate polished explanations for broken/disputed
    // rows. Same script + same audit-log shape as before.
    await job.setStage("grading", {
      message: "Typed verifier panel — DeepSeek + Groq + Flash → Pro/Opus/SymPy",
    });
    runStage(
      "Stage 8/14 — verify answers (v2 phase 6)",
      "grading",
      "scripts/question-audit/verify-answers.mjs",
      ["--from-db", "--source-pdf", sourcePdfBasename]
    );

    // Stage 10: v2 phase 7 — pre-fill eligibility gate.
    //
    // Marks rows that are broken / disputed / visually incomplete
    // as skipped_not_eligible (with an admin-facing diagnostic
    // note). Eligible rows pass through unchanged.
    await job.setStage("fill_gate", {
      message: "Phase 7 pre-fill eligibility gate",
    });
    runStage(
      "Stage 9/14 — check fill eligibility (v2 phase 7)",
      "fill_gate",
      "scripts/pdf-pipeline/check-fill-eligibility.mjs",
      ["--source-pdf", sourcePdfBasename]
    );

    // Stage 11: v2 phase 7 — generate explanation_v2 for eligible rows.
    //
    // Replaces the legacy fill-all.mjs call. Tiered Sonnet → Opus
    // generator. Produces the canonical explanation_v2 JSONB bundle
    // and mirrors compatible fields into the legacy explanation_text /
    // explanation_per_choice / desmos_strategy columns.
    await job.setStage("filling", {
      message: "Phase 7 explanation_v2 generation (Sonnet/Opus tiered)",
    });
    runStage(
      "Stage 10/14 — fill explanations v2 (v2 phase 7)",
      "filling",
      "scripts/pdf-pipeline/fill-explanations-v2.mjs",
      ["--source-pdf", sourcePdfBasename]
    );

    // Stage 12: v2 phase 7 — QA the generated explanations.
    //
    // Hybrid: deterministic schema-validate first, then Sonnet
    // critic. One bounded repair-retry on fixable critic failures
    // (with Opus generator on the retry). Writes explanation_qa_records.
    await job.setStage("qa_filling", {
      message: "Phase 7 explanation QA (schema + LLM critic)",
    });
    runStage(
      "Stage 11/14 — qa explanations (v2 phase 7)",
      "qa_filling",
      "scripts/pdf-pipeline/qa-explanations.mjs",
      ["--source-pdf", sourcePdfBasename]
    );

    // Stage 12: v2 phase 8.3 — audit explanations & alignment.
    //
    // Runs four typed audit modules in sequence (well-formedness,
    // slug-alignment, figure-coherence, explanation-consistency)
    // with per-module eligibility guards. Findings land in
    // question_findings; the publish-gate at Stage 14 reads
    // unresolved BLOCKING findings and routes the affected rows
    // to needs_human_review (or the suggested_publish_status the
    // finding's detail carries).
    await job.setStage("auditing", {
      message: "Phase 8.3 audit — well-formedness + slug + figure + explanation",
    });
    runStage(
      "Stage 12/14 — audit explanations & alignment (v2 phase 8.3)",
      "auditing",
      "scripts/pdf-pipeline/audit/run-audits.mjs",
      ["--source-pdf", sourcePdfBasename]
    );

    // Stage 13: strict server-side KaTeX validation
    await job.setStage("validating", {
      message: "Strict server-side KaTeX validation",
    });
    runStage(
      "Stage 13/14 — validate KaTeX",
      "validating",
      "scripts/question-audit/validate-katex.mjs",
      ["--source-pdf", sourcePdfBasename, "--apply-blocks"]
    );

    // Stage 14: publish-gate — promote rows to publish_ready
    // The central enforcement of v2 phase 1. New rows arrived as
    // 'draft' from stage 4; this stage flips them to publish_ready
    // ONLY when every gate passes (KaTeX, grader, slug, required
    // fields, explanation present, import_status ok, phase 5/6/7
    // status gates clean).
    await job.setStage("publishing", {
      message: "Publish-gate evaluation (promote draft → publish_ready)",
    });
    runStage("Stage 14/14 — publish gate", "publishing", "scripts/pdf-pipeline/publish-gate.mjs", [
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
