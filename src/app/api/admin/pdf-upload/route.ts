// ============================================================
// POST /api/admin/pdf-upload
//
// Accepts a multipart/form-data body with one or more `pdfs`
// fields, each an uploaded PDF. For every file:
//   1. Generates a job UUID.
//   2. Uploads the PDF to R2 at pdf-inbox/<jobId>/source.pdf.
//   3. Inserts a pdf_processing_jobs row in status="queued".
//
// Returns: { jobs: [{ id, source_pdf, pdf_storage_path }, ...] }
//
// The local hybrid runner polls this queue separately (see
// scripts/pdf-pipeline/pull-pdf-job.mjs) — this route only
// enqueues; it does not invoke the runner or process anything.
// ============================================================

import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { requireRole } from "@/lib/supabase/queries/admin";
import { createAdminClient } from "@/lib/supabase/server";
import { uploadToR2, safeFilename } from "@/lib/storage/r2";
import type { PdfProcessingJob } from "@/types/pdf-job";

export const runtime = "nodejs";

const MAX_FILE_BYTES = 100 * 1024 * 1024; // 100 MB per PDF (Cloudflare Workers hard request-body cap)

/** Upload bytes to R2 from a Worker-runtime route. Prefers the
 *  native R2 binding (env.R2) because the AWS S3 SDK pulls in
 *  Node-only `fs.readFile` paths that unenv refuses to polyfill
 *  ("[unenv] fs.readFile is not implemented yet!"). Falls back to
 *  the S3 SDK helper for `next dev` runs where the binding may
 *  not be wired up. */
async function putToR2(
  key: string,
  body: ArrayBuffer,
  contentType: string,
  cacheControl: string
): Promise<void> {
  try {
    const ctx = await getCloudflareContext({ async: true });
    // The R2 binding is declared in wrangler.toml ([[r2_buckets]] binding="R2")
    // and exposed on env at runtime. We type it locally to avoid pulling in
    // @cloudflare/workers-types just for this single call site.
    type R2PutOpts = { httpMetadata?: { contentType?: string; cacheControl?: string } };
    type R2BucketLike = {
      put: (key: string, value: ArrayBuffer | Uint8Array, opts?: R2PutOpts) => Promise<unknown>;
    };
    const env = ctx?.env as { R2?: R2BucketLike } | undefined;
    if (env?.R2) {
      await env.R2.put(key, body, {
        httpMetadata: { contentType, cacheControl },
      });
      return;
    }
  } catch {
    // getCloudflareContext throws when not in a CF context.
    // Fall through to the S3-SDK path.
  }
  await uploadToR2({ key, body, contentType, cacheControl });
}

export async function POST(request: Request) {
  // ── Auth ────────────────────────────────────────────────
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const isAdmin = await requireRole(userId, ["admin"]);
  if (!isAdmin) {
    return NextResponse.json({ error: "Admin role required" }, { status: 403 });
  }

  // ── Parse multipart ─────────────────────────────────────
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch (err) {
    return NextResponse.json(
      { error: `Invalid multipart body: ${err instanceof Error ? err.message : "unknown"}` },
      { status: 400 }
    );
  }

  const files = formData.getAll("pdfs").filter((v): v is File => v instanceof File);
  if (files.length === 0) {
    return NextResponse.json(
      { error: "No PDFs in upload (expected one or more `pdfs` form fields)" },
      { status: 400 }
    );
  }

  // ── Validate ────────────────────────────────────────────
  for (const f of files) {
    if (!f.name.toLowerCase().endsWith(".pdf")) {
      return NextResponse.json({ error: `"${f.name}" is not a .pdf file.` }, { status: 400 });
    }
    if (f.size > MAX_FILE_BYTES) {
      return NextResponse.json(
        { error: `"${f.name}" exceeds the ${MAX_FILE_BYTES / 1024 / 1024} MB upload limit.` },
        { status: 413 }
      );
    }
  }

  // ── Upload + insert ─────────────────────────────────────
  const supabase = createAdminClient();
  const created: Array<Pick<PdfProcessingJob, "id" | "source_pdf" | "pdf_storage_path">> = [];

  for (const f of files) {
    // Pre-allocate the row to get a UUID we can use as the R2 key prefix.
    const { data: row, error: insErr } = await supabase
      .from("pdf_processing_jobs")
      .insert({
        source_pdf: f.name,
        pdf_storage_path: "pending", // overwritten below once we know the key
        pdf_size_bytes: f.size,
        uploaded_by_user_id: userId,
        status: "queued",
      })
      .select("id")
      .single();

    if (insErr || !row) {
      return NextResponse.json(
        { error: `Failed to create job row for "${f.name}": ${insErr?.message ?? "unknown"}` },
        { status: 500 }
      );
    }

    const jobId = row.id as string;
    const key = `pdf-inbox/${jobId}/${safeFilename(f.name)}`;

    try {
      const buf = await f.arrayBuffer();
      await putToR2(key, buf, f.type || "application/pdf", "private, max-age=31536000");
    } catch (err) {
      // Roll back the job row so the queue stays clean.
      await supabase.from("pdf_processing_jobs").delete().eq("id", jobId);
      return NextResponse.json(
        {
          error: `R2 upload failed for "${f.name}": ${err instanceof Error ? err.message : "unknown"}`,
        },
        { status: 502 }
      );
    }

    // Patch the row with the final R2 key.
    const { error: updErr } = await supabase
      .from("pdf_processing_jobs")
      .update({ pdf_storage_path: key })
      .eq("id", jobId);
    if (updErr) {
      return NextResponse.json(
        { error: `Failed to record storage path: ${updErr.message}` },
        { status: 500 }
      );
    }

    created.push({ id: jobId, source_pdf: f.name, pdf_storage_path: key });
  }

  return NextResponse.json({ jobs: created }, { status: 201 });
}
