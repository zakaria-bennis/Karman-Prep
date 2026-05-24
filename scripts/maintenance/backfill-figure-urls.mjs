// ============================================================
// backfill-figure-urls — patches image_url + image_alt onto
// quiz_questions rows whose figures already live in R2 but
// whose DB image_url was dropped by the buggy version of
// import-csv-direct.mjs (which never wrote those fields).
//
// HOW IT WORKS
//   1. Lists objects in the R2 bucket under "question-figures/"
//   2. Each object is named like "<pdf-stem>/p<page>-<i>.png"
//   3. Matches source_pdf = "<pdf-stem>.pdf" and source_page = <page>
//   4. For each match, UPDATEs the row with the public R2 URL
//   5. Doesn't touch image_alt (we lost it — the per-figure
//      alt-text was only in /tmp on the GitHub Actions runner).
//      The figure-extraction pipeline going forward writes both
//      via the fixed import script.
//
// USAGE
//   Dry-run (default — prints what it would do):
//     node --env-file=.env.local \
//       scripts/maintenance/backfill-figure-urls.mjs
//   Commit:
//     node --env-file=.env.local \
//       scripts/maintenance/backfill-figure-urls.mjs --commit
// ============================================================

import { createClient } from "@supabase/supabase-js";
import { S3Client, ListObjectsV2Command } from "@aws-sdk/client-s3";

const COMMIT = process.argv.includes("--commit");

const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPA_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const R2_ACCOUNT = process.env.R2_ACCOUNT_ID;
const R2_KEY = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET = process.env.R2_BUCKET_NAME;
const R2_PUBLIC = (process.env.R2_PUBLIC_URL ?? "").replace(/\/$/, "");

for (const [k, v] of Object.entries({
  NEXT_PUBLIC_SUPABASE_URL: SUPA_URL,
  SUPABASE_SERVICE_ROLE_KEY: SUPA_KEY,
  R2_ACCOUNT_ID: R2_ACCOUNT,
  R2_ACCESS_KEY_ID: R2_KEY,
  R2_SECRET_ACCESS_KEY: R2_SECRET,
  R2_BUCKET_NAME: R2_BUCKET,
  R2_PUBLIC_URL: R2_PUBLIC,
})) {
  if (!v) {
    console.error(`Missing env var: ${k}`);
    process.exit(1);
  }
}

const supabase = createClient(SUPA_URL, SUPA_KEY, { auth: { persistSession: false } });
const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${R2_ACCOUNT}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: R2_KEY, secretAccessKey: R2_SECRET },
});

// ── List all objects under question-figures/ ──
async function listAllFigures() {
  const items = [];
  let token;
  do {
    const out = await r2.send(
      new ListObjectsV2Command({
        Bucket: R2_BUCKET,
        Prefix: "question-figures/",
        ContinuationToken: token,
      })
    );
    for (const obj of out.Contents ?? []) items.push(obj.Key);
    token = out.IsTruncated ? out.NextContinuationToken : undefined;
  } while (token);
  return items;
}

// ── Parse "question-figures/<stem>/p<page>-<i>.png" into parts ──
function parseKey(key) {
  // e.g. "question-figures/202405us/p17-5.png"
  const m = /^question-figures\/([^/]+)\/p(\d+)-(\d+)\.png$/.exec(key);
  if (!m) return null;
  return { stem: m[1], page: parseInt(m[2], 10), idx: parseInt(m[3], 10) };
}

async function main() {
  console.log(`Mode: ${COMMIT ? "COMMIT" : "DRY-RUN"}`);
  console.log("Listing figure objects in R2…");
  const keys = await listAllFigures();
  console.log(`Found ${keys.length} figures in R2 under question-figures/`);

  // Group by (pdf-stem, page) — the first figure on each page wins
  // for the DB update. Most pages have only one figure-bearing question;
  // multi-figure pages are rare and surface in needs_review anyway.
  const byPage = new Map(); // "stem|page" → URL
  for (const key of keys) {
    const parsed = parseKey(key);
    if (!parsed) continue;
    const k = `${parsed.stem}|${parsed.page}`;
    if (!byPage.has(k)) {
      byPage.set(k, `${R2_PUBLIC}/${key}`);
    }
  }
  console.log(`Mapped to ${byPage.size} unique (pdf-stem, page) keys`);

  let updates = 0;
  let skips = 0;
  let errors = 0;
  for (const [key, url] of byPage.entries()) {
    const [stem, pageStr] = key.split("|");
    const page = parseInt(pageStr, 10);
    const sourcePdf = `${stem}.pdf`;

    const { data: rows, error } = await supabase
      .from("quiz_questions")
      .select("id, image_url")
      .eq("source_pdf", sourcePdf)
      .eq("source_page", page);
    if (error) {
      errors++;
      console.log(`  ✗ ${sourcePdf} p${page}: query error ${error.message}`);
      continue;
    }
    if (!rows || rows.length === 0) {
      skips++;
      continue;
    }
    // Only patch rows that don't already have an image_url
    const needs = rows.filter((r) => !r.image_url);
    if (needs.length === 0) {
      skips++;
      continue;
    }

    if (!COMMIT) {
      console.log(`  [dry] ${sourcePdf} p${page} → ${needs.length} row(s) would get ${url}`);
      updates += needs.length;
      continue;
    }

    for (const r of needs) {
      const { error: upErr } = await supabase
        .from("quiz_questions")
        .update({ image_url: url })
        .eq("id", r.id);
      if (upErr) {
        errors++;
        console.log(`  ✗ ${r.id}: ${upErr.message}`);
      } else {
        updates++;
      }
    }
  }

  console.log("");
  console.log("═".repeat(72));
  console.log(`R2 figures listed:    ${keys.length}`);
  console.log(`Unique pdf+page keys: ${byPage.size}`);
  console.log(`Rows updated:         ${updates}${COMMIT ? "" : " (dry-run)"}`);
  console.log(`Skipped (no row match or already has URL): ${skips}`);
  console.log(`Errors:               ${errors}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
