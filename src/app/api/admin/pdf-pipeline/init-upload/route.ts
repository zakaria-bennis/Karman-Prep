// ============================================================
// POST /api/admin/pdf-pipeline/init-upload
//
// Part of the large-PDF support change. Browser calls this BEFORE
// uploading a PDF — gets back a presigned R2 PUT URL it can write
// the bytes to directly, bypassing the Cloudflare Worker entirely.
//
// Why direct-to-R2:
//   · Worker request-body cap (100 MB on Standard plan) blocks
//     anything bigger.
//   · Worker memory cap (128 MB) means even smaller-than-100 MB
//     files don't fit in memory when buffered for re-upload.
//   · R2's S3-compatible API supports presigned PUTs natively.
//
// Flow:
//   1. Browser: POST /init-upload { filename, size, contentType }
//   2. Server: validate, create pdf_processing_jobs row, sign URL
//   3. Server: respond { job_id, upload_url, storage_path, expires_at }
//   4. Browser: PUT bytes to upload_url (direct to R2)
//   5. Browser: POST /dispatch { job_id }  → triggers GH Actions
//
// Returns: { job_id, upload_url, storage_path, expires_at, max_bytes }
// ============================================================

import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@clerk/nextjs/server";
import { requireRole } from "@/lib/supabase/queries/admin";
import { createAdminClient } from "@/lib/supabase/server";
import { createPresignedPutUrl } from "@/lib/storage/r2-presign";
import { safeFilename } from "@/lib/storage/r2";

export const runtime = "nodejs";

// 250 MB cap — matches the dispatch endpoint + the UI client.
// Raise here AND in the UI + dispatch + extract-with-gemini.mjs
// together if you ever need to bump it.
const MAX_FILE_BYTES = 250 * 1024 * 1024;

const RequestSchema = z.object({
  filename: z.string().min(1).max(255),
  size: z.number().int().positive().max(MAX_FILE_BYTES),
  contentType: z.literal("application/pdf"),
});

export async function POST(request: Request) {
  // Auth
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const isAdmin = await requireRole(userId, ["admin"]);
  if (!isAdmin) {
    return NextResponse.json({ error: "Admin role required" }, { status: 403 });
  }

  // Parse + validate
  let body: z.infer<typeof RequestSchema>;
  try {
    const json = await request.json();
    body = RequestSchema.parse(json);
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof z.ZodError
            ? `Invalid request: ${err.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")}`
            : `Invalid JSON body: ${err instanceof Error ? err.message : "unknown"}`,
      },
      { status: 400 }
    );
  }

  if (!body.filename.toLowerCase().endsWith(".pdf")) {
    return NextResponse.json({ error: `"${body.filename}" is not a .pdf` }, { status: 400 });
  }

  // Pre-allocate the job row to get a UUID for the R2 key prefix.
  // Same as the old dispatch endpoint did — the prefix is the job
  // id so concurrent uploads can't collide on the same path.
  const supabase = createAdminClient();
  const { data: row, error: insErr } = await supabase
    .from("pdf_processing_jobs")
    .insert({
      source_pdf: body.filename,
      pdf_storage_path: "pending",
      pdf_size_bytes: body.size,
      uploaded_by_user_id: userId,
      status: "queued",
      progress: {
        stage: "awaiting_upload",
        stage_label: "Awaiting browser → R2 upload",
        percent: 0,
        message: `Presigned URL issued; expecting PUT of ${body.size} bytes`,
        updated_at: new Date().toISOString(),
      },
    })
    .select("id")
    .single();
  if (insErr || !row) {
    return NextResponse.json(
      { error: `Failed to create job row: ${insErr?.message ?? "no row returned"}` },
      { status: 500 }
    );
  }

  // Sign a PUT URL scoped to ONE object key. The key is locked at
  // sign time — even if the URL leaks, an attacker can only
  // overwrite this same path, which we'll verify after the PUT.
  const storagePath = `pdf-inbox/${row.id}/${safeFilename(body.filename)}`;
  let presigned;
  try {
    presigned = await createPresignedPutUrl({
      key: storagePath,
      contentType: body.contentType,
      expiresInSeconds: 900, // 15 min
    });
  } catch (err) {
    // If signing failed, the job row exists but with status='queued'
    // and no upload happening. Mark it failed so it doesn't sit
    // forever in the queue.
    await supabase
      .from("pdf_processing_jobs")
      .update({
        status: "failed",
        error_message: `Presign failed: ${err instanceof Error ? err.message : String(err)}`,
      })
      .eq("id", row.id);
    return NextResponse.json(
      { error: `Failed to issue presigned URL: ${err instanceof Error ? err.message : "unknown"}` },
      { status: 500 }
    );
  }

  // Stamp the storage path on the job row so the dispatch endpoint
  // can verify against it (without trusting client-supplied path).
  await supabase
    .from("pdf_processing_jobs")
    .update({ pdf_storage_path: storagePath })
    .eq("id", row.id);

  return NextResponse.json({
    job_id: row.id,
    upload_url: presigned.uploadUrl,
    storage_path: storagePath,
    expires_at: presigned.expiresAt,
    max_bytes: MAX_FILE_BYTES,
  });
}
