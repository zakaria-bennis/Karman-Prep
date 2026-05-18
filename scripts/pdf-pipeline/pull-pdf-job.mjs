// ============================================================
// pull-pdf-job — local hybrid-runner step 1 of 2.
//
// Run on your Mac to pull the oldest queued PDF from the
// /admin/jobs queue and save it locally for processing with
// Claude Code.
//
// Modes:
//   one-shot (default):
//     node --env-file=.env.local scripts/pdf-pipeline/pull-pdf-job.mjs
//       → pulls one queued job, prints next-step command, exits.
//
//   watch (continuous, Hybrid Full default):
//     node --env-file=.env.local scripts/pdf-pipeline/pull-pdf-job.mjs --watch [--interval=30]
//       → polls Supabase every N seconds (default 30).
//       → AUTO-PROCESSES end-to-end: pulls queued PDFs, spawns
//         `claude --print` on each one with the routine prompt,
//         waits for completion, calls finalize-pdf-job.mjs, ingests
//         to bank, repeats.
//       → only one PDF in flight at a time (claude binary is single-
//         threaded against your Claude Max subscription anyway).
//       → sends macOS notifications at start, on success, on failure.
//       → pass --no-auto-process to fall back to download-only
//         (Hybrid Lite mode — you run Claude Code yourself).
//
// Workflow (Hybrid Full — fully automated):
//   1. You upload a PDF on https://karmanprep.com/admin/questions/import
//   2. The watch loop pulls it on the next tick, spawns claude with
//      the routine prompt against question-imports/incoming/<jobId>/.
//   3. claude exits, the loop detects the new question-imports/runs/<ts>/
//      directory and shells out to finalize-pdf-job.mjs which uploads
//      CSVs to R2 csv-inbox/ and pings the cron route.
//   4. Cron route imports CSVs into the bank.
//   5. Loop polls again — next queued PDF flows through.
//
// Workflow (Hybrid Lite — manual Claude Code, used when --no-auto-process):
//   1. Watch (or one-shot) downloads question-imports/incoming/<jobId>/<filename>
//      and flips the job row to "running".
//   2. You open Claude Code on this Mac and run the routine in
//      question-imports/ROUTINE_PROMPT.md against the downloaded PDF.
//   3. When the routine finishes, you run scripts/pdf-pipeline/finalize-pdf-job.mjs
//      <jobId> <runs-dir>. That flips "running" → "complete", which
//      unblocks the watcher to pull the next queued PDF.
//
// Required env vars (set in .env.local):
//   NEXT_PUBLIC_SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY
//   R2_ACCOUNT_ID
//   R2_ACCESS_KEY_ID
//   R2_SECRET_ACCESS_KEY
//   R2_BUCKET_NAME
// ============================================================

import { createClient } from "@supabase/supabase-js";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { mkdir, writeFile, readdir, stat } from "node:fs/promises";
import { spawn } from "node:child_process";
import path from "node:path";

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
  console.error("Set them in .env.local and run with --env-file=.env.local.");
  process.exit(1);
}

const supabase = createClient(SUPA_URL, SUPA_KEY, { auth: { persistSession: false } });
const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${R2_ACCOUNT}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: R2_KEY, secretAccessKey: R2_SECRET },
});

// ── CLI args ──────────────────────────────────────────────────
const args = process.argv.slice(2);
const WATCH = args.includes("--watch");
const intervalArg = args.find((a) => a.startsWith("--interval="));
const POLL_INTERVAL_SECONDS = intervalArg
  ? Math.max(5, Number.parseInt(intervalArg.split("=")[1], 10) || 30)
  : 30;
const NOTIFY = !args.includes("--no-notify");
// Hybrid Full default — auto-spawn `claude` on each pulled PDF and
// finalize automatically. Disable with --no-auto-process to fall back
// to Hybrid Lite (download-only; you run Claude Code yourself).
const AUTO_PROCESS = WATCH && !args.includes("--no-auto-process");
const CLAUDE_BIN = process.env.CLAUDE_BIN || "claude";

async function findRunningCount() {
  const { count, error } = await supabase
    .from("pdf_processing_jobs")
    .select("id", { count: "exact", head: true })
    .eq("status", "running");
  if (error) throw new Error(`Supabase running-count query failed: ${error.message}`);
  return count ?? 0;
}

async function findQueuedJob() {
  const { data, error } = await supabase
    .from("pdf_processing_jobs")
    .select("*")
    .eq("status", "queued")
    .order("uploaded_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(`Supabase query failed: ${error.message}`);
  return data;
}

async function pullOneJob(job) {
  console.log(`Pulling job ${job.id}`);
  console.log(`  source_pdf: ${job.source_pdf}`);
  console.log(`  uploaded_at: ${job.uploaded_at}`);
  console.log(`  pdf_storage_path: ${job.pdf_storage_path}`);

  // CAS update: only flip if still queued, so a parallel run can't double-pull.
  const { data: claimed, error: updErr } = await supabase
    .from("pdf_processing_jobs")
    .update({
      status: "running",
      started_at: new Date().toISOString(),
    })
    .eq("id", job.id)
    .eq("status", "queued")
    .select("id")
    .maybeSingle();
  if (updErr) throw new Error(`Failed to mark job running: ${updErr.message}`);
  if (!claimed) {
    console.log(`  job ${job.id} was already claimed by another runner — skipping`);
    return null;
  }

  const localDir = path.join("question-imports", "incoming", job.id);
  await mkdir(localDir, { recursive: true });
  const localPdfPath = path.join(localDir, sanitizeFilename(job.source_pdf));

  console.log(`  downloading from r2://${R2_BUCKET}/${job.pdf_storage_path}`);
  const obj = await r2.send(
    new GetObjectCommand({
      Bucket: R2_BUCKET,
      Key: job.pdf_storage_path,
    })
  );
  if (!obj.Body) throw new Error("R2 object body was empty");
  const chunks = [];
  for await (const chunk of obj.Body) {
    chunks.push(chunk);
  }
  const buf = Buffer.concat(chunks.map((c) => (Buffer.isBuffer(c) ? c : Buffer.from(c))));
  await writeFile(localPdfPath, buf);
  console.log(`  saved → ${localPdfPath} (${(buf.length / 1024 / 1024).toFixed(1)} MB)`);

  await setProgress(job.id, "pulled", `Downloaded ${(buf.length / 1024 / 1024).toFixed(1)} MB`);

  return { jobId: job.id, sourcePdf: job.source_pdf, localPdfPath };
}

function printNextSteps({ jobId, localPdfPath }) {
  console.log("");
  console.log("─".repeat(64));
  console.log("Next steps:");
  console.log("");
  console.log("1. Open Claude Code on this Mac and run the routine in");
  console.log("   question-imports/ROUTINE_PROMPT.md against this PDF:");
  console.log("");
  console.log(`   ${localPdfPath}`);
  console.log("");
  console.log("2. When the routine finishes, finalize the job:");
  console.log("");
  console.log(`   node --env-file=.env.local scripts/pdf-pipeline/finalize-pdf-job.mjs \\`);
  console.log(`     ${jobId} <path-to-runs-dir>`);
  console.log("─".repeat(64));
}

/** Fire a macOS Notification Center banner so the operator notices
 *  a new PDF is ready without having to watch the terminal. */
function macNotify(title, body) {
  if (!NOTIFY || process.platform !== "darwin") return;
  // osascript escapes its own string args; we wrap with single quotes,
  // then escape any single quotes inside the message.
  const escape = (s) => String(s).replace(/'/g, "\\'");
  const cmd = `display notification '${escape(body)}' with title '${escape(title)}' sound name 'Ping'`;
  const child = spawn("osascript", ["-e", cmd], { stdio: "ignore" });
  child.on("error", () => {
    /* osascript missing / sandbox — ignore */
  });
}

function sanitizeFilename(name) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_") || "source.pdf";
}

// ─────────────────────────────────────────────────────────────
// Hybrid Full helpers — auto-process pulled PDFs by spawning
// `claude --print` with the routine prompt, then finalize.
// ─────────────────────────────────────────────────────────────

async function fileExists(p) {
  try {
    await stat(p);
    return true;
  } catch {
    return false;
  }
}

async function listRunsDirs() {
  // Used by the snapshot-diff that detects which runs/<ts> directory
  // claude created during a job. We DON'T filter by timestamp format —
  // the compact "20260428T120000Z" form is the routine's spec, but
  // claude has variously emitted "2026-04-28T120000Z" or "2026-04-28T12-00-00Z"
  // depending on how it interpreted the prompt. The snapshot diff
  // already isolates the one new entry, so any non-hidden directory
  // counts.
  try {
    const root = path.join("question-imports", "runs");
    const entries = await readdir(root);
    const out = [];
    for (const e of entries) {
      if (e.startsWith(".")) continue;
      const s = await stat(path.join(root, e));
      if (s.isDirectory()) out.push(e);
    }
    return out;
  } catch {
    return [];
  }
}

async function markJobFailed(jobId, message) {
  await supabase
    .from("pdf_processing_jobs")
    .update({
      status: "failed",
      module_status: {
        key: "failed",
        m1: "failed",
        m2: "failed",
        m3: "failed",
        m4: "failed",
      },
      error_message: message.slice(0, 1000),
      progress: {
        stage: "failed",
        message: message.slice(0, 200),
        updated_at: new Date().toISOString(),
      },
    })
    .eq("id", jobId);
}

/** Patch the progress JSONB on a job row. Best-effort — failures here
 *  are logged but never abort the daemon, since progress is purely a
 *  UI signal, not a correctness requirement. */
async function setProgress(jobId, stage, message = null) {
  const { error } = await supabase
    .from("pdf_processing_jobs")
    .update({
      progress: {
        stage,
        message,
        updated_at: new Date().toISOString(),
      },
    })
    .eq("id", jobId);
  if (error) {
    console.warn(`[progress] failed to update job ${jobId} → ${stage}: ${error.message}`);
  }
}

/** Find a "running" job that has not yet been claimed by a Claude
 *  Code session (module_status.key === "pending"). The daemon
 *  CAS-claims one of these per tick. */
async function findClaimableJob() {
  const { data, error } = await supabase
    .from("pdf_processing_jobs")
    .select("*")
    .eq("status", "running")
    .filter("module_status->>key", "eq", "pending")
    .order("started_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(`claimable-job query failed: ${error.message}`);
  return data;
}

/** CAS update: only flip module_status.key from "pending" → "in_progress"
 *  when it's still pending, so concurrent watcher runs can't double-claim. */
async function claimJob(job) {
  const next = { ...(job.module_status ?? {}), key: "in_progress" };
  const { data, error } = await supabase
    .from("pdf_processing_jobs")
    .update({ module_status: next })
    .eq("id", job.id)
    .filter("module_status->>key", "eq", "pending")
    .select("id")
    .maybeSingle();
  if (error) throw new Error(`CAS claim failed: ${error.message}`);
  return !!data;
}

/** Locate the locally-downloaded PDF for a job. Returns null if missing. */
async function findLocalPdfForJob(job) {
  const dir = path.join("question-imports", "incoming", job.id);
  const candidates = [
    path.join(dir, sanitizeFilename(job.source_pdf)),
    path.join(dir, job.source_pdf),
  ];
  for (const c of candidates) {
    if (await fileExists(c)) return c;
  }
  // Fall back: any .pdf file in the directory
  try {
    const entries = await readdir(dir);
    const pdf = entries.find((e) => e.toLowerCase().endsWith(".pdf"));
    if (pdf) return path.join(dir, pdf);
  } catch {
    /* dir doesn't exist */
  }
  return null;
}

/** Spawn a child process and resolve with its exit code; capture
 *  stdout/stderr (also tee to our stdout/stderr for live tailing). */
function runChild(cmd, argv, opts = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, argv, {
      stdio: ["ignore", "pipe", "pipe"],
      cwd: process.cwd(),
      env: process.env,
      ...opts,
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (c) => {
      stdout += c;
      process.stdout.write(c);
    });
    child.stderr.on("data", (c) => {
      stderr += c;
      process.stderr.write(c);
    });
    child.on("error", (err) => reject(err));
    child.on("exit", (code, signal) => {
      resolve({ code: code ?? -1, signal, stdout, stderr });
    });
  });
}

/** Full extract-then-finalize cycle for one job.
 *  Caller must have already CAS-claimed the job (key → in_progress).
 *
 *  Engine: two local Python scripts that go PDF → 30-column CSV
 *  via Tesseract OCR + Gemini Flash structured-JSON output.
 *  Replaces the prior `claude --print` engine, which hit Claude
 *  Max rate limits, took 30–90 min, and silently produced no
 *  output dir on bad days. Gemini path is ~5 min/PDF, no
 *  Claude quota in play, deterministic exit codes. */
async function processWithGemini(job, localPdfPath) {
  const startTs = Date.now();
  console.log(`[gemini] processing job ${job.id} (${job.source_pdf})`);
  macNotify(
    "Karman: started processing",
    `Gemini pipeline is processing ${job.source_pdf}. ~5 min.`
  );

  // Stage 1: PDF → per-page text + per-page PNG + answer-key JSON.
  // The script writes to question-imports/extract-out/<pdf-stem>/.
  await setProgress(job.id, "processing", "Stage 1: extracting text + answer key");
  const stage1 = await runChild("python3", ["question-imports/stage1_extract.py", localPdfPath], {
    env: { ...process.env }, // inherits GEMINI_API_KEY for answer-key vision call
  });
  if (stage1.code !== 0) {
    const tail = stage1.stderr.slice(-500) || stage1.stdout.slice(-500);
    await markJobFailed(job.id, `stage1_extract.py exited ${stage1.code}: ${tail}`);
    macNotify("Karman: processing failed", `Stage 1 failed for ${job.source_pdf}.`);
    return false;
  }

  // The extract dir name is the PDF stem. The PDF basename may have
  // been sanitize-renamed at download time (sanitizeFilename strips
  // unsafe chars), so rebuild the stem from the actual local path.
  const pdfStem = path.basename(localPdfPath, path.extname(localPdfPath));
  const extractDir = path.join("question-imports", "extract-out", pdfStem);
  console.log(`[gemini] stage 1 done; extract dir: ${extractDir}`);

  // Stage 2: extract dir → questions.csv + questions_needs_review.csv
  // via Gemini Flash structured-JSON output. CHUNK_PAGES=5 keeps each
  // call under the 65k output-token cap so chunks don't truncate.
  // gemini-2.5-flash-lite has a higher daily quota than gemini-2.5-flash
  // on the free tier (and works equally well for structured extraction).
  await setProgress(job.id, "processing", "Stage 2: classifying via Gemini");
  const stage2 = await runChild("python3", ["question-imports/stage2_classify.py", extractDir], {
    env: {
      ...process.env,
      // Default to gemini-2.5-flash. Free-tier daily request quota is 20
      // RPD on each of -flash and -flash-lite; using -flash here keeps
      // the smaller -lite quota free as a manual fallback if -flash
      // exhausts mid-day. Override with GEMINI_MODEL=... in .env.local.
      GEMINI_MODEL: process.env.GEMINI_MODEL || "gemini-2.5-flash",
      // CHUNK_PAGES=10 keeps a 99-page PDF at ~10 chunks (~half daily
      // quota), with headroom for one truncation-retry per PDF. Drop
      // to 5 if you see chunks failing JSON parsing.
      CHUNK_PAGES: process.env.CHUNK_PAGES || "10",
    },
  });
  if (stage2.code !== 0) {
    const tail = stage2.stderr.slice(-500) || stage2.stdout.slice(-500);
    await markJobFailed(job.id, `stage2_classify.py exited ${stage2.code}: ${tail}`);
    macNotify("Karman: processing failed", `Stage 2 failed for ${job.source_pdf}.`);
    return false;
  }
  console.log(`[gemini] stage 2 done`);

  // Stage 3: figure extraction via Gemini vision. Reads each
  // page-NNN.png + the two CSVs from stage 2, asks Gemini for
  // spatial figure bboxes (not figure contents — RECITATION-safe),
  // crops with Pillow, base64-encodes into image_url. The CSV
  // grows from 30 → 32 columns. Optional: set SKIP_STAGE3=true
  // in .env.local to skip (e.g. to ingest fast on PDFs that
  // contain no figures, like instructions-only docs).
  if (process.env.SKIP_STAGE3 === "true") {
    console.log(`[gemini] stage 3 skipped (SKIP_STAGE3=true)`);
  } else {
    await setProgress(job.id, "processing", "Stage 3: extracting figures via vision");
    const stage3 = await runChild("python3", ["question-imports/stage3_figures.py", extractDir], {
      env: {
        ...process.env,
        GEMINI_VISION_MODEL: process.env.GEMINI_VISION_MODEL || "gemini-2.5-flash",
        BBOX_PADDING_PCT: process.env.BBOX_PADDING_PCT || "0.5",
      },
    });
    if (stage3.code !== 0) {
      const tail = stage3.stderr.slice(-500) || stage3.stdout.slice(-500);
      // Non-fatal: the CSVs still have all the text. We just lose
      // image attachments for this PDF. Operator can re-run stage 3
      // standalone after fixing whatever broke (usually quota).
      console.log(`[gemini] stage 3 FAILED (non-fatal): ${tail}`);
      macNotify(
        "Karman: figures missing",
        `Stage 3 failed for ${job.source_pdf}. Text imported; figures not attached.`
      );
    } else {
      console.log(`[gemini] stage 3 done`);
    }
  }

  await setProgress(job.id, "finalizing", "Uploading CSVs to R2");

  // finalize-pdf-job.mjs reads questions.csv and questions_needs_review.csv
  // from any directory we hand it — it doesn't care about the runs/<ts>/
  // shape the old Claude engine produced. extractDir already contains
  // both files, so we pass it directly.
  const finResult = await runChild("node", [
    "--env-file=.env.local",
    "scripts/pdf-pipeline/finalize-pdf-job.mjs",
    job.id,
    extractDir,
  ]);
  if (finResult.code !== 0) {
    const tail = finResult.stderr.slice(-500) || finResult.stdout.slice(-500);
    await markJobFailed(job.id, `finalize-pdf-job exited ${finResult.code}: ${tail}`);
    macNotify(
      "Karman: finalize failed",
      `finalize-pdf-job exited ${finResult.code} on ${job.source_pdf}.`
    );
    return false;
  }

  const elapsedMin = Math.round((Date.now() - startTs) / 60000);
  console.log(`[gemini] job ${job.id} complete in ${elapsedMin} min`);
  await setProgress(job.id, "complete", `Done in ${elapsedMin} min`);
  macNotify(
    "Karman: PDF processed",
    `${job.source_pdf} done in ${elapsedMin} min. Questions imported into bank.`
  );
  return true;
}

async function oneShot() {
  const job = await findQueuedJob();
  if (!job) {
    console.log("No queued PDF jobs. The bank queue is empty.");
    return;
  }
  const result = await pullOneJob(job);
  if (result) printNextSteps(result);
}

async function watchLoop() {
  console.log(`[watch] polling every ${POLL_INTERVAL_SECONDS}s. Ctrl-C to stop.`);
  console.log(
    AUTO_PROCESS
      ? `[watch] AUTO_PROCESS on — Gemini pipeline (stage1+stage2) on each pulled PDF, then finalize automatically.`
      : `[watch] AUTO_PROCESS off — pulls only; run question-imports/stage{1,2}_*.py yourself.`
  );
  // Track the last "no-op" reason so we don't spam logs every interval.
  let lastReason = "";

  for (;;) {
    try {
      // ── Step 1: auto-process any claimable running job ─────
      // (jobs in status="running" with module_status.key="pending" —
      // i.e., pulled but not yet handed to claude). On the first
      // tick after a fresh deploy, this picks up jobs that were
      // pulled by the previous Hybrid-Lite watcher.
      if (AUTO_PROCESS) {
        const claimable = await findClaimableJob();
        if (claimable) {
          const localPdf = await findLocalPdfForJob(claimable);
          if (!localPdf) {
            console.warn(
              `[watch] job ${claimable.id} is running but local PDF missing — marking failed`
            );
            await markJobFailed(claimable.id, "Local PDF not found in incoming/.");
          } else if (await claimJob(claimable)) {
            lastReason = "";
            // Long-running call: blocks the loop until claude + finalize finish.
            // Serializes processing — only one claude session at a time.
            await processWithGemini(claimable, localPdf);
            // Loop again immediately to pick up the next queued PDF.
            continue;
          }
        }
      }

      // ── Step 2: pull next queued job if nothing is running ─
      const running = await findRunningCount();
      if (running > 0) {
        if (lastReason !== "running") {
          console.log(`[watch] ${running} job(s) still running — waiting before pulling next`);
          lastReason = "running";
        }
      } else {
        const job = await findQueuedJob();
        if (!job) {
          if (lastReason !== "empty") {
            console.log("[watch] queue empty — waiting for upload");
            lastReason = "empty";
          }
        } else {
          lastReason = "";
          const result = await pullOneJob(job);
          if (result) {
            console.log(`[watch] downloaded ${result.sourcePdf} for job ${result.jobId}`);
            if (AUTO_PROCESS) {
              // Loop again immediately so step 1 picks this up and
              // hands it to claude on the next iteration.
              continue;
            }
            macNotify(
              "Karman: PDF ready to process",
              `${result.sourcePdf} downloaded. Open Claude Code on this PDF, then run finalize-pdf-job.mjs.`
            );
            printNextSteps(result);
          }
        }
      }
    } catch (err) {
      console.error(`[watch] error: ${err instanceof Error ? err.message : err}`);
      lastReason = ""; // log fresh state next iteration
    }
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_SECONDS * 1000));
  }
}

if (WATCH) {
  watchLoop(); // never resolves — runs until SIGINT
} else {
  oneShot().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
