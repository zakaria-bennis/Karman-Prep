// ============================================================
// recover-domain-bug.mjs — one-shot fix for the "domain dashes
// instead of underscores" bug that snuck into every PDF processed
// today. For each completed pdf_processing_job:
//   1. Read the local CSVs at extract-out/<pdf-stem>/.
//   2. Rewrite each row's `domain` column converting dashes back
//      to underscores (info-ideas → info_ideas, etc).
//   3. Upload the fixed CSVs back to R2 (overwrite).
//   4. Reset imported_counts to {} so the cron re-runs ingestion.
//
// The bank's (source_pdf, content_hash) unique index makes
// re-ingestion idempotent — already-imported rows skip as
// duplicates, the previously-rejected ones now insert cleanly.
//
// Usage:
//   node --env-file=.env.local scripts/recover-domain-bug.mjs
// ============================================================

import { createClient } from "@supabase/supabase-js";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { readFileSync, existsSync } from "node:fs";
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
  process.exit(1);
}

const supabase = createClient(SUPA_URL, SUPA_KEY, { auth: { persistSession: false } });
const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${R2_ACCOUNT}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: R2_KEY, secretAccessKey: R2_SECRET },
});

const VALID_DOMAINS = [
  "algebra",
  "advanced_math",
  "geometry",
  "data_analysis",
  "info_ideas",
  "craft_structure",
  "expression_ideas",
  "conventions",
];

/** Convert any dash-form variant of a valid domain back to underscore form.
 *  Leaves already-correct values untouched. */
function fixDomain(s) {
  const norm = (s || "").trim().toLowerCase().replace(/-/g, "_").replace(/\s+/g, "_");
  return VALID_DOMAINS.includes(norm) ? norm : s || "";
}

/** Minimal CSV parser/writer (RFC-4180-ish — quotes + double-quote escapes,
 *  handles embedded newlines inside quoted fields). Avoids pulling a dep. */
function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let i = 0;
  let inQuotes = false;
  while (i < text.length) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i++;
        continue;
      }
      cell += ch;
      i++;
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
      i++;
      continue;
    }
    if (ch === ",") {
      row.push(cell);
      cell = "";
      i++;
      continue;
    }
    if (ch === "\r") {
      i++;
      continue;
    }
    if (ch === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
      i++;
      continue;
    }
    cell += ch;
    i++;
  }
  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

function writeCsv(rows) {
  const esc = (v) => {
    const s = String(v ?? "");
    return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  return rows.map((r) => r.map(esc).join(",")).join("\n") + "\n";
}

async function fixAndReuploadCsv(localPath, r2Key) {
  if (!existsSync(localPath)) {
    console.log(`    ✗ local CSV not found: ${localPath}`);
    return null;
  }
  const text = readFileSync(localPath, "utf-8");
  const rows = parseCsv(text);
  if (rows.length === 0) return { rows: 0, fixed: 0 };
  const header = rows[0];
  const data = rows.slice(1).filter((r) => r.length > 0 && r.some((c) => c.trim() !== ""));
  const domainIdx = header.indexOf("domain");
  if (domainIdx < 0) {
    console.log(`    ✗ no domain column in ${localPath}`);
    return null;
  }
  let fixed = 0;
  for (const row of data) {
    const before = row[domainIdx];
    const after = fixDomain(before);
    if (before !== after) {
      row[domainIdx] = after;
      fixed++;
    }
  }
  const newCsv = writeCsv([header, ...data]);
  // Write back locally first, then upload to R2.
  await import("node:fs/promises").then((fs) => fs.writeFile(localPath, newCsv));
  await r2.send(
    new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: r2Key,
      Body: newCsv,
      ContentType: "text/csv",
    })
  );
  return { rows: data.length, fixed };
}

async function main() {
  // Find every job that has CSV paths AND completed ingestion (so the
  // cron has already touched it). We'll reset imported_counts so the
  // cron re-processes.
  const { data: jobs, error } = await supabase
    .from("pdf_processing_jobs")
    .select("id, source_pdf, csv_storage_paths, imported_counts")
    .not("csv_storage_paths", "is", null);
  if (error) throw error;

  const targets = (jobs || []).filter(
    (j) =>
      j.csv_storage_paths &&
      Object.keys(j.csv_storage_paths).length > 0 &&
      j.imported_counts &&
      Object.keys(j.imported_counts).length > 0
  );
  console.log(`Found ${targets.length} previously-ingested job(s) to recover.\n`);
  if (targets.length === 0) return;

  for (const job of targets) {
    console.log(`▶ ${job.source_pdf}  (${job.id})`);
    const stem = path.basename(job.source_pdf, path.extname(job.source_pdf));
    // The local extract-out dir uses the PDF stem (sometimes sanitized).
    // Try a few candidates.
    const candidates = [stem, stem.replace(/\s+/g, "_"), stem.replace(/\s+/g, "")];
    let extractDir = null;
    for (const c of candidates) {
      const p = path.join("question-imports", "extract-out", c);
      if (existsSync(p)) {
        extractDir = p;
        break;
      }
    }
    if (!extractDir) {
      console.log(`    ✗ no local extract-out dir for ${stem} (looked: ${candidates.join(", ")})`);
      continue;
    }

    let totalFixed = 0;
    for (const [csvKey, r2Path] of Object.entries(job.csv_storage_paths)) {
      if (!r2Path) continue;
      const localFile = csvKey === "questions" ? "questions.csv" : "questions_needs_review.csv";
      const localPath = path.join(extractDir, localFile);
      const result = await fixAndReuploadCsv(localPath, r2Path);
      if (result) {
        console.log(
          `    ${csvKey}: ${result.fixed}/${result.rows} rows had domain dashes → fixed + reuploaded`
        );
        totalFixed += result.fixed;
      }
    }

    // Reset imported_counts so the cron re-processes this job.
    const { error: e1 } = await supabase
      .from("pdf_processing_jobs")
      .update({ imported_counts: {} })
      .eq("id", job.id);
    if (e1) console.log(`    ✗ reset imported_counts: ${e1.message}`);
    else console.log(`    ↻ imported_counts reset → cron will re-ingest`);
    console.log();
  }

  console.log("Done. Run the ingest cron next:");
  console.log(
    "  curl -X POST $APP_URL/api/cron/ingest-csv-inbox -H 'authorization: Bearer $CRON_SECRET'"
  );
  console.log("Or wait for the scheduled tick.");
}

main().catch((err) => {
  console.error("FATAL:", err.message);
  process.exit(1);
});
