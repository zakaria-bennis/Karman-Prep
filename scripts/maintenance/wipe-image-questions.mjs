// ============================================================
// wipe-image-questions.mjs — destructive, narrow.
//
// Deletes ONLY quiz_questions rows where image_url IS NOT NULL.
// Text-only questions (no figure) survive untouched. Cascades to
// answer_choices, flagged_questions, question_responses via FK
// ON DELETE CASCADE.
//
// Use case: the old whole-page-screenshot images need to be
// replaced with vision-cropped + polished figures from the
// updated KarmanGPT pipeline. Run this, re-run each listed PDF
// through the updated Custom GPT, and re-upload the resulting
// CSVs. Text-only rows in those CSVs will be skipped as
// duplicates by content_hash; only the image-bearing rows
// will insert fresh with the new figures.
//
// Note: this leaves the corresponding R2 objects orphaned.
// They don't cost meaningful money in a pre-launch dev bucket
// and can be GC'd later via an R2 lifecycle rule or one-off
// cleanup.
//
// Usage:
//   node --env-file=.env.local scripts/wipe-image-questions.mjs
// ============================================================

import { createClient } from "@supabase/supabase-js";

const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPA_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPA_URL || !SUPA_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  console.error("Run with: node --env-file=.env.local scripts/wipe-image-questions.mjs");
  process.exit(1);
}

const supabase = createClient(SUPA_URL, SUPA_KEY, {
  auth: { persistSession: false },
});

async function main() {
  // ── 1. Inventory ─────────────────────────────────────────
  const { data: targets, error: selErr } = await supabase
    .from("quiz_questions")
    .select("id, source_pdf, source_page, subject")
    .not("image_url", "is", null);

  if (selErr) {
    console.error("select failed:", selErr.message);
    process.exit(1);
  }

  if (!targets || targets.length === 0) {
    console.log("No image-bearing questions in the bank. Nothing to do.");
    return;
  }

  console.log(`Found ${targets.length} image-bearing questions across these PDFs:\n`);

  const byPdf = new Map();
  for (const t of targets) {
    const key = t.source_pdf || "(unknown source_pdf)";
    byPdf.set(key, (byPdf.get(key) || 0) + 1);
  }

  // Sort descending by count for a useful summary.
  const sorted = [...byPdf.entries()].sort((a, b) => b[1] - a[1]);
  for (const [pdf, count] of sorted) {
    console.log(`  ${count.toString().padStart(3)}  ${pdf}`);
  }

  // ── 2. Total bank context ────────────────────────────────
  const { count: totalBefore } = await supabase
    .from("quiz_questions")
    .select("id", { count: "exact", head: true });
  console.log(`\nBank total before delete: ${totalBefore}`);
  console.log(`After delete:             ${(totalBefore ?? 0) - targets.length} (text-only rows preserved)`);

  // ── 3. Delete in batches ─────────────────────────────────
  // Supabase .in() can choke on very long ID lists. Batch to be safe.
  const ids = targets.map((t) => t.id);
  const BATCH = 500;
  let deleted = 0;
  for (let i = 0; i < ids.length; i += BATCH) {
    const slice = ids.slice(i, i + BATCH);
    const { error: delErr } = await supabase
      .from("quiz_questions")
      .delete()
      .in("id", slice);
    if (delErr) {
      console.error(`\ndelete failed at batch ${i}-${i + slice.length}:`, delErr.message);
      process.exit(1);
    }
    deleted += slice.length;
    process.stdout.write(`\rDeleted ${deleted}/${ids.length}…`);
  }
  process.stdout.write("\n");

  // ── 4. Confirm ───────────────────────────────────────────
  const { count: totalAfter } = await supabase
    .from("quiz_questions")
    .select("id", { count: "exact", head: true });
  console.log(`\nDone. Bank now has ${totalAfter} questions.`);
  console.log("\nNext steps:");
  console.log("  1. In your Custom GPT, replace the Knowledge file with the");
  console.log("     updated KarmanGPT.txt (it now includes vision-cropping +");
  console.log("     polish_figure cleanup).");
  console.log("  2. Re-run each PDF listed above through the GPT.");
  console.log("  3. Upload each resulting CSV via /admin/questions/import.");
  console.log("     Text-only rows will be skipped as duplicates; image-bearing");
  console.log("     rows will insert fresh with the new clean figures.");
}

main().catch((err) => {
  console.error("FATAL:", err.message);
  process.exit(1);
});
