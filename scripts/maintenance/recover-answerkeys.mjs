// ============================================================
// recover-answerkeys.mjs — for one or more already-processed PDFs
// whose answer keys were missed/empty, re-run the answer-key
// vision (permissive prompt) + stage 2 + reset job + delegate
// finalize to the existing finalize-pdf-job.mjs script.
//
// Usage:
//   node --env-file=.env.local scripts/recover-answerkeys.mjs <pdf-stem> [<pdf-stem> ...]
// ============================================================

import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const stems = process.argv.slice(2);
if (stems.length === 0) {
  console.error("usage: node scripts/recover-answerkeys.mjs <pdf-stem> [...]");
  process.exit(1);
}

const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPA_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPA_URL || !SUPA_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const supabase = createClient(SUPA_URL, SUPA_KEY, { auth: { persistSession: false } });

function runChild(cmd, argv, opts = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, argv, {
      stdio: ["ignore", "pipe", "pipe"],
      cwd: process.cwd(),
      env: process.env,
      ...opts,
    });
    let stdout = "",
      stderr = "";
    child.stdout.on("data", (c) => {
      stdout += c;
      process.stdout.write(c);
    });
    child.stderr.on("data", (c) => {
      stderr += c;
      process.stderr.write(c);
    });
    child.on("error", reject);
    child.on("exit", (code) => resolve({ code: code ?? -1, stdout, stderr }));
  });
}

async function findJobForStem(stem) {
  // pdf basename in Supabase keeps original spaces/extension. Try a few
  // variants of the stem.
  const candidates = [
    stem + ".pdf",
    stem.replace(/_/g, " ") + ".pdf",
    stem.replace(/_/g, "-") + ".pdf",
  ];
  const { data } = await supabase
    .from("pdf_processing_jobs")
    .select("id, source_pdf, status")
    .in("source_pdf", candidates);
  if (data && data.length > 0) return data[0];
  // Fuzzy fallback: ilike on the prefix.
  const { data: fuzzy } = await supabase
    .from("pdf_processing_jobs")
    .select("id, source_pdf, status")
    .ilike("source_pdf", `${stem.replace(/_/g, " ")}%`);
  return (fuzzy && fuzzy[0]) || null;
}

async function main() {
  for (const stem of stems) {
    const extractDir = path.join("question-imports", "extract-out", stem);
    if (!existsSync(extractDir)) {
      console.error(`[skip] ${stem}: extract-out dir not found`);
      continue;
    }
    console.log(`\n━━━ ${stem} ━━━`);

    // 1. Permissive answer-key vision recovery.
    console.log("  1/5  Re-running answer-key vision (permissive)…");
    const r1 = await runChild("python3", ["/tmp/recover_answerkey_v2.py", extractDir]);
    if (r1.code !== 0) {
      console.error(`  ✗ answer-key recovery exited ${r1.code} — skipping rest of this PDF`);
      continue;
    }

    // 2. Re-run stage 2 to re-classify with the new answer-key.
    console.log("\n  2/5  Re-running stage 2…");
    const r2 = await runChild("python3", ["question-imports/stage2_classify.py", extractDir], {
      env: {
        ...process.env,
        GEMINI_MODEL: process.env.GEMINI_MODEL || "gemini-2.5-flash",
        CHUNK_PAGES: process.env.CHUNK_PAGES || "10",
      },
    });
    if (r2.code !== 0) {
      console.error(`  ✗ stage 2 exited ${r2.code} — skipping rest of this PDF`);
      continue;
    }

    // 3. Find the matching job row.
    const job = await findJobForStem(stem);
    if (!job) {
      console.error(`  ✗ no job row matching stem "${stem}"`);
      continue;
    }
    console.log(`\n  3/5  Wiping bank rows for ${job.source_pdf}…`);
    const { count: wiped, error: e1 } = await supabase
      .from("quiz_questions")
      .delete({ count: "exact" })
      .eq("source_pdf", job.source_pdf);
    if (e1) console.error(`    ✗ wipe failed: ${e1.message}`);
    else console.log(`    ✓ deleted ${wiped} stale rows`);

    // 4. Reset the job back to "running" so finalize-pdf-job will accept it.
    console.log(`\n  4/5  Resetting job ${job.id} to running…`);
    const { error: e2 } = await supabase
      .from("pdf_processing_jobs")
      .update({
        status: "running",
        csv_storage_paths: {},
        imported_counts: {},
        completed_at: null,
        error_message: null,
        progress: {
          stage: "finalizing",
          message: "Recovery: re-uploading CSVs",
          updated_at: new Date().toISOString(),
        },
      })
      .eq("id", job.id);
    if (e2) {
      console.error(`    ✗ reset failed: ${e2.message}`);
      continue;
    }

    // 5. Delegate finalize (uploads CSVs to R2, sets csv_storage_paths,
    //    pings the ingest cron) — battle-tested, no R2 SDK weirdness.
    console.log(`\n  5/5  Running finalize-pdf-job.mjs ${job.id} ${extractDir}…`);
    const r5 = await runChild("node", [
      "--env-file=.env.local",
      "scripts/pdf-pipeline/finalize-pdf-job.mjs",
      job.id,
      extractDir,
    ]);
    if (r5.code !== 0) {
      console.error(`  ✗ finalize exited ${r5.code}`);
      continue;
    }
    console.log(`  ✓ done with ${stem}`);
  }

  console.log(
    "\n\nAll PDFs processed. The cron ping at the end of each finalize\nshould have re-imported the rows. Check /admin/jobs to confirm."
  );
}

main().catch((err) => {
  console.error("FATAL:", err.message);
  process.exit(1);
});
