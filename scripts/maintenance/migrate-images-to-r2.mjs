// ============================================================
// One-off: migrate question_images.image_url values that point at
// Supabase Storage to Cloudflare R2.
//
// Run from /Users/zakariabennis/Karman-Prep after R2 credentials are
// in .env.local:
//   node --env-file=.env.local scripts/migrate-images-to-r2.mjs
//
// For each row whose image_storage_path does NOT start with
// "question-images/" (legacy Supabase Storage layout):
//   1. Fetch the bytes from Supabase Storage
//   2. Upload to R2 under question-images/<question_id>/<filename>
//   3. Update the row's image_url + image_storage_path to the R2 path
//   4. Delete the Supabase Storage copy (cost savings)
//
// Idempotent — already-migrated rows (image_storage_path starts
// with "question-images/") are skipped.
// ============================================================

import { createClient } from "@supabase/supabase-js";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPA_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const R2_ACCOUNT = process.env.R2_ACCOUNT_ID;
const R2_KEY = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET = process.env.R2_BUCKET_NAME;
const R2_PUBLIC = process.env.R2_PUBLIC_URL;

const missing = [
  ["NEXT_PUBLIC_SUPABASE_URL", SUPA_URL],
  ["SUPABASE_SERVICE_ROLE_KEY", SUPA_KEY],
  ["R2_ACCOUNT_ID", R2_ACCOUNT],
  ["R2_ACCESS_KEY_ID", R2_KEY],
  ["R2_SECRET_ACCESS_KEY", R2_SECRET],
  ["R2_BUCKET_NAME", R2_BUCKET],
  ["R2_PUBLIC_URL", R2_PUBLIC],
]
  .filter(([_, v]) => !v)
  .map(([k]) => k);
if (missing.length) {
  console.error(`Missing env vars: ${missing.join(", ")}`);
  console.error("Fill these in .env.local then re-run.");
  process.exit(1);
}

const supabase = createClient(SUPA_URL, SUPA_KEY, { auth: { persistSession: false } });
const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${R2_ACCOUNT}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: R2_KEY, secretAccessKey: R2_SECRET },
});

async function main() {
  const { data: rows, error } = await supabase
    .from("quiz_questions")
    .select("id, image_url, image_storage_path")
    .not("image_storage_path", "is", null);
  if (error) throw error;

  const todo = (rows ?? []).filter(
    (r) => r.image_storage_path && !r.image_storage_path.startsWith("question-images/")
  );

  console.log(`${rows?.length ?? 0} total rows with images, ${todo.length} need migration.`);
  if (todo.length === 0) {
    console.log("Nothing to do.");
    return;
  }

  for (const row of todo) {
    const oldPath = row.image_storage_path;
    console.log(`\n[${row.id}] ${oldPath}`);

    // 1. Download from Supabase Storage
    const { data: blob, error: dlErr } = await supabase.storage
      .from("question-images")
      .download(oldPath);
    if (dlErr || !blob) {
      console.warn(`  download failed (${dlErr?.message ?? "no data"}) — skipping`);
      continue;
    }
    const bytes = new Uint8Array(await blob.arrayBuffer());
    const contentType = blob.type || "image/png";

    // 2. Upload to R2 under the new key layout
    const filename = oldPath.split("/").pop() ?? `${Date.now()}.png`;
    const newKey = `question-images/${row.id}/${filename}`;
    await r2.send(
      new PutObjectCommand({
        Bucket: R2_BUCKET,
        Key: newKey,
        Body: bytes,
        ContentType: contentType,
        CacheControl: "public, max-age=3600",
      })
    );
    const newUrl = `${R2_PUBLIC.replace(/\/$/, "")}/${newKey}`;
    console.log(`  uploaded → ${newUrl}`);

    // 3. Patch the row
    const { error: upErr } = await supabase
      .from("quiz_questions")
      .update({
        image_url: newUrl,
        image_storage_path: newKey,
        updated_at: new Date().toISOString(),
      })
      .eq("id", row.id);
    if (upErr) {
      console.warn(`  row patch failed (${upErr.message}) — leaving Supabase copy in place`);
      continue;
    }

    // 4. Delete the Supabase copy
    const { error: rmErr } = await supabase.storage.from("question-images").remove([oldPath]);
    if (rmErr) {
      console.warn(`  Supabase delete failed (${rmErr.message}) — orphan left at ${oldPath}`);
    } else {
      console.log(`  Supabase copy deleted`);
    }
  }

  console.log(`\nDone. Migrated ${todo.length} image(s) to R2.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
