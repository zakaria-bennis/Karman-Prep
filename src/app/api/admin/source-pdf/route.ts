// ============================================================
// GET /api/admin/source-pdf?file=<filename>
//
// Streams the source PDF for a given quiz_questions.source_pdf
// filename back to the browser, content-type application/pdf.
// Used by the preview-page PDF panel to embed the source PDF
// in an <iframe> with #page=N so the admin can compare the
// rendered question against the original.
//
// Resolution:
//   1. Look up pdf_processing_jobs WHERE source_pdf = <file>
//      ORDER BY created_at DESC LIMIT 1 to get the R2 key.
//   2. Fetch that R2 object via the binding (production) or
//      the S3 SDK (next dev fallback).
//   3. Stream the bytes back as application/pdf with a long
//      cache header — PDFs are immutable per-import.
//
// Auth: admin only. No public access — pdf-inbox bucket isn't
// public, and we don't want to leak signed URLs.
// ============================================================

import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { requireRole } from "@/lib/supabase/queries/admin";
import { createAdminClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

async function fetchPdfFromR2(key: string): Promise<Uint8Array> {
  // Prefer the native R2 binding (works inside Cloudflare Workers).
  try {
    const ctx = await getCloudflareContext({ async: true });
    type R2ObjectLike = { arrayBuffer: () => Promise<ArrayBuffer> } | null;
    type R2BucketLike = { get: (key: string) => Promise<R2ObjectLike> };
    const env = ctx?.env as { R2?: R2BucketLike } | undefined;
    if (env?.R2) {
      const obj = await env.R2.get(key);
      if (!obj) throw new Error(`R2 object not found: ${key}`);
      const buf = await obj.arrayBuffer();
      return new Uint8Array(buf);
    }
  } catch (err) {
    if (err instanceof Error && err.message.includes("not found")) throw err;
    // Otherwise fall through to S3 SDK.
  }

  // S3 SDK fallback (next dev, Node scripts).
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucket = process.env.R2_BUCKET_NAME;
  if (!accountId || !accessKeyId || !secretAccessKey || !bucket) {
    throw new Error("R2 env vars missing");
  }
  const s3 = new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });
  const obj = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
  if (!obj.Body) throw new Error(`R2 object empty: ${key}`);
  const chunks: Uint8Array[] = [];
  // The AWS SDK types Body as a few different stream shapes
  // depending on Node version + lib.d.ts; cast to a plain
  // AsyncIterable<Uint8Array> so this works across Node 22+.
  const body = obj.Body as unknown as AsyncIterable<Uint8Array>;
  for await (const chunk of body) {
    chunks.push(chunk instanceof Uint8Array ? chunk : new Uint8Array(chunk));
  }
  const total = chunks.reduce((n, c) => n + c.length, 0);
  const out = new Uint8Array(total);
  let off = 0;
  for (const c of chunks) {
    out.set(c, off);
    off += c.length;
  }
  return out;
}

export async function GET(request: Request) {
  // ── Auth ──────────────────────────────────────────────────
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const isAdmin = await requireRole(userId, ["admin"]);
  if (!isAdmin) {
    return NextResponse.json({ error: "Admin role required" }, { status: 403 });
  }

  // ── Input ─────────────────────────────────────────────────
  const url = new URL(request.url);
  const file = url.searchParams.get("file");
  if (!file) {
    return NextResponse.json({ error: "Missing ?file=<filename>" }, { status: 400 });
  }
  // Defense in depth: filenames should be simple (no slashes,
  // no parent-dir traversal). They come from quiz_questions.source_pdf
  // which is set by the importer from basename() — so a malformed
  // value would indicate a bug, not a user-supplied path.
  if (file.includes("/") || file.includes("..") || file.length > 200) {
    return NextResponse.json({ error: "Invalid filename" }, { status: 400 });
  }

  // ── Lookup the R2 key via pdf_processing_jobs ─────────────
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("pdf_processing_jobs")
    .select("pdf_storage_path, source_pdf, uploaded_at")
    .eq("source_pdf", file)
    .order("uploaded_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data || !data.pdf_storage_path) {
    return NextResponse.json(
      {
        error: `No upload job found for "${file}". The PDF may have been imported via the older CSV path (which doesn't store the source PDF in R2).`,
      },
      { status: 404 }
    );
  }

  // ── Fetch + stream ────────────────────────────────────────
  let bytes: Uint8Array;
  try {
    bytes = await fetchPdfFromR2(data.pdf_storage_path);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `R2 fetch failed: ${msg}` }, { status: 502 });
  }

  return new Response(bytes as BodyInit, {
    status: 200,
    headers: {
      "content-type": "application/pdf",
      // PDFs are immutable per-import. Cache for a day on the
      // browser; private since this is admin-gated.
      "cache-control": "private, max-age=86400",
      // Tell the browser to display, not download.
      "content-disposition": `inline; filename="${file}"`,
    },
  });
}
