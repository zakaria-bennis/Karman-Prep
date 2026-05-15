// ============================================================
// POST /api/cron/ingest-csv-inbox
//
// Folder-watcher (BUGS.md #4). Scans pdf_processing_jobs for rows
// with status="complete" + csv_storage_paths populated + empty
// imported_counts, downloads each CSV from R2, parses it, and
// runs every row through bulkImportRows() so questions land in
// quiz_questions. Updates imported_counts on each job after the
// run so a re-trigger is idempotent.
//
// Lives under /api/cron/* so Clerk middleware exempts it from the
// browser-auth gate (see src/middleware.ts isPublicRoute matcher).
// Self-auths via Bearer CRON_SECRET.
//
// Designed to be poked by:
//   · The Cloudflare Worker scheduled handler injected by
//     scripts/patch-cf-worker.mjs (every 5 min via wrangler.toml
//     [triggers].crons).
//   · scripts/finalize-pdf-job.mjs after a CSV upload (immediate
//     ingest without waiting for the next cron tick).
//   · Manual curl from a developer for testing.
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { bulkImportRows } from "@/lib/question-bank/bulk-import";
import type { PdfProcessingJob } from "@/types/pdf-job";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Single source of truth for CSV parsing + row-coercion lives in
// `src/lib/question-bank/csv-parser.ts` so this cron + the admin's
// BulkImportPanel can't drift (audit #9). Both import the same
// pure functions; React stays out of this server-only route.
import { parseCsv, toBulkRows } from "@/lib/question-bank/csv-parser";

/** Download a UTF-8 text object from R2. Prefers the native env.R2
 *  binding (works inside Cloudflare Workers) and falls back to the
 *  AWS S3 SDK only when getCloudflareContext returns no env (i.e.
 *  local `next dev` without binding emulation).
 *
 *  This avoids the "[unenv] fs.readFile is not implemented yet!"
 *  error the S3 SDK throws inside the deployed worker — the same
 *  bug we fixed on the PDF upload route. */
async function downloadFromR2(s3: S3Client, bucket: string, key: string): Promise<string> {
  // Try the binding first.
  try {
    const ctx = await getCloudflareContext({ async: true });
    type R2ObjectLike = { text: () => Promise<string> } | null;
    type R2BucketLike = { get: (key: string) => Promise<R2ObjectLike> };
    const env = ctx?.env as { R2?: R2BucketLike } | undefined;
    if (env?.R2) {
      const obj = await env.R2.get(key);
      if (!obj) throw new Error(`R2 object not found: ${key}`);
      return await obj.text();
    }
  } catch (err) {
    // Re-throw "not found" so the caller sees it; otherwise fall through.
    if (err instanceof Error && err.message.includes("not found")) throw err;
  }

  // Fallback: S3 SDK (works in Node, breaks in CF Worker).
  const obj = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
  if (!obj.Body) throw new Error(`R2 object empty: ${key}`);
  const chunks: Uint8Array[] = [];
  // @ts-expect-error — Body is a stream-like; iterate without coupling to specific typing
  for await (const chunk of obj.Body) {
    chunks.push(chunk instanceof Uint8Array ? chunk : new Uint8Array(chunk));
  }
  const total = chunks.reduce((n, c) => n + c.length, 0);
  const buf = new Uint8Array(total);
  let off = 0;
  for (const c of chunks) {
    buf.set(c, off);
    off += c.length;
  }
  return new TextDecoder("utf-8").decode(buf);
}

interface PerJobResult {
  job_id: string;
  source_pdf: string;
  inserted: number;
  skipped_duplicates: number;
  flagged_for_review: number;
  errored: number;
  errors: Array<{ row: number; message: string }>;
}

export async function POST(req: NextRequest) {
  // ── Auth ────────────────────────────────────────────────
  const authHeader = req.headers.get("authorization");
  const expected = `Bearer ${process.env.CRON_SECRET ?? ""}`;
  if (!process.env.CRON_SECRET || authHeader !== expected) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // ── Env / R2 client ─────────────────────────────────────
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucket = process.env.R2_BUCKET_NAME;
  if (!accountId || !accessKeyId || !secretAccessKey || !bucket) {
    return NextResponse.json({ error: "R2 env vars missing" }, { status: 500 });
  }
  const r2 = new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });

  // ── Find jobs ready for ingestion ───────────────────────
  // Criteria: status='complete', csv_storage_paths populated, imported_counts empty.
  const supabase = createAdminClient();
  const { data: jobs, error: queryErr } = await supabase
    .from("pdf_processing_jobs")
    .select("*")
    .eq("status", "complete")
    .order("completed_at", { ascending: true })
    .limit(20); // bounded per run; the cron can pick up the rest next tick

  if (queryErr) {
    return NextResponse.json({ error: queryErr.message }, { status: 500 });
  }

  const candidates = ((jobs ?? []) as unknown as PdfProcessingJob[]).filter((j) => {
    const hasPaths = j.csv_storage_paths && Object.keys(j.csv_storage_paths).length > 0;
    const alreadyIngested = j.imported_counts && Object.keys(j.imported_counts).length > 0;
    return hasPaths && !alreadyIngested;
  });

  if (candidates.length === 0) {
    return NextResponse.json({ ok: true, processed: 0, jobs: [] });
  }

  // ── Process each job ────────────────────────────────────
  const results: PerJobResult[] = [];
  for (const job of candidates) {
    const perJob: PerJobResult = {
      job_id: job.id,
      source_pdf: job.source_pdf,
      inserted: 0,
      skipped_duplicates: 0,
      flagged_for_review: 0,
      errored: 0,
      errors: [],
    };
    const importedCounts: Record<string, number> = {};

    try {
      for (const [csvKey, r2Path] of Object.entries(job.csv_storage_paths)) {
        if (!r2Path) continue;
        const csvText = await downloadFromR2(r2, bucket, r2Path);
        const parsed = parseCsv(csvText);
        const rows = toBulkRows(parsed);
        if (rows.length === 0) {
          importedCounts[csvKey] = 0;
          continue;
        }
        const r = await bulkImportRows(null, null, rows);
        importedCounts[csvKey] = r.inserted + r.flagged_for_review;
        perJob.inserted += r.inserted;
        perJob.skipped_duplicates += r.skipped_duplicates;
        perJob.flagged_for_review += r.flagged_for_review;
        perJob.errored += r.errored;
        perJob.errors.push(...r.errors);
      }

      const totalImported = perJob.inserted + perJob.flagged_for_review;
      await supabase
        .from("pdf_processing_jobs")
        .update({
          imported_counts: importedCounts,
          progress: {
            stage: "complete",
            message: `${totalImported} questions imported (${perJob.inserted} ok, ${perJob.flagged_for_review} flagged)`,
            updated_at: new Date().toISOString(),
          },
        })
        .eq("id", job.id);
    } catch (err) {
      perJob.errored += 1;
      perJob.errors.push({
        row: 0,
        message: err instanceof Error ? err.message : String(err),
      });
      // Mark progress=failed so the UI shows the error fast.
      await supabase
        .from("pdf_processing_jobs")
        .update({
          progress: {
            stage: "failed",
            message: err instanceof Error ? err.message.slice(0, 200) : String(err).slice(0, 200),
            updated_at: new Date().toISOString(),
          },
        })
        .eq("id", job.id);
      // Don't update imported_counts so the next run retries this job.
    }

    results.push(perJob);
  }

  return NextResponse.json({
    ok: true,
    processed: results.length,
    jobs: results,
  });
}
