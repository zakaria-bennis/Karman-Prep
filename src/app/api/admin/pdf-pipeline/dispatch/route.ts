// ============================================================
// POST /api/admin/pdf-pipeline/dispatch
//
// The replacement for the deleted /api/admin/pdf-upload route.
// Differences from the deleted version:
//   · After uploading the PDF + creating the job row, this route
//     calls the GitHub API to dispatch the `process-pdf` workflow
//     with the new job_id in client_payload. That kicks off the
//     real pipeline on Actions infrastructure (binaries + memory
//     that Cloudflare Workers cannot provide).
//   · Single PDF per request (the old route batched; the new flow
//     keeps each upload one focused action with its own job row).
//
// Returns: { job_id, source_pdf, status: "dispatched" }
//
// On failure to dispatch the workflow, the job row is still
// created (so the UI shows it as queued) but with an error message
// so the user knows to retry the dispatch manually.
// ============================================================

import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { requireRole } from "@/lib/supabase/queries/admin";
import { createAdminClient } from "@/lib/supabase/server";
import { uploadToR2, safeFilename } from "@/lib/storage/r2";

export const runtime = "nodejs";

const MAX_FILE_BYTES = 100 * 1024 * 1024; // 100 MB
const GITHUB_OWNER = "zakaria-bennis";
const GITHUB_REPO = "Karman-Prep";
const WORKFLOW_EVENT_TYPE = "process-pdf";

/** Upload via R2 binding when available; fall back to AWS SDK
 *  (matches the pattern in the deleted pdf-upload route). */
async function putToR2(
  key: string,
  body: ArrayBuffer,
  contentType: string,
  cacheControl: string
): Promise<void> {
  try {
    const ctx = await getCloudflareContext({ async: true });
    type R2PutOpts = { httpMetadata?: { contentType?: string; cacheControl?: string } };
    type R2BucketLike = {
      put: (key: string, value: ArrayBuffer | Uint8Array, opts?: R2PutOpts) => Promise<unknown>;
    };
    const env = ctx?.env as { R2?: R2BucketLike } | undefined;
    if (env?.R2) {
      await env.R2.put(key, body, { httpMetadata: { contentType, cacheControl } });
      return;
    }
  } catch {
    // not in CF context; fall through to S3 SDK
  }
  await uploadToR2({ key, body, contentType, cacheControl });
}

/** Trigger the process-pdf workflow on GitHub Actions. Reads
 *  GITHUB_PAT from env (set via `wrangler secret put GITHUB_PAT`
 *  on Cloudflare, or .env.local for local dev). */
async function dispatchWorkflow(
  jobId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const pat = process.env.GITHUB_PAT;
  if (!pat) {
    return {
      ok: false,
      error:
        "GITHUB_PAT not set. Set via: wrangler secret put GITHUB_PAT  (or add to .env.local for local dev). Token needs `actions:write` scope.",
    };
  }
  const res = await fetch(
    `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/dispatches`,
    {
      method: "POST",
      headers: {
        accept: "application/vnd.github+json",
        authorization: `Bearer ${pat}`,
        "x-github-api-version": "2022-11-28",
        "user-agent": "karmanprep-pdf-dispatcher",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        event_type: WORKFLOW_EVENT_TYPE,
        client_payload: { job_id: jobId },
      }),
    }
  );
  if (res.ok || res.status === 204) {
    return { ok: true };
  }
  const body = await res.text();
  return { ok: false, error: `GitHub HTTP ${res.status}: ${body.slice(0, 200)}` };
}

export async function POST(request: Request) {
  // Auth
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const isAdmin = await requireRole(userId, ["admin"]);
  if (!isAdmin) return NextResponse.json({ error: "Admin role required" }, { status: 403 });

  // Parse multipart
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch (err) {
    return NextResponse.json(
      { error: `Invalid multipart body: ${err instanceof Error ? err.message : "unknown"}` },
      { status: 400 }
    );
  }
  const file = formData.get("pdf");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Expected a `pdf` form field with a file" }, { status: 400 });
  }
  if (!file.name.toLowerCase().endsWith(".pdf")) {
    return NextResponse.json({ error: `"${file.name}" is not a .pdf` }, { status: 400 });
  }
  if (file.size > MAX_FILE_BYTES) {
    return NextResponse.json(
      { error: `"${file.name}" exceeds the ${MAX_FILE_BYTES / 1024 / 1024} MB upload limit.` },
      { status: 413 }
    );
  }

  // Pre-allocate the job row to get a UUID for the R2 key prefix.
  const supabase = createAdminClient();
  const { data: row, error: insErr } = await supabase
    .from("pdf_processing_jobs")
    .insert({
      source_pdf: file.name,
      pdf_storage_path: "pending",
      pdf_size_bytes: file.size,
      uploaded_by_user_id: userId,
      status: "queued",
      progress: {
        stage: "queued",
        stage_label: "Queued",
        percent: 0,
        message: "Awaiting GitHub Actions runner",
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

  // Upload PDF to R2
  const storagePath = `pdf-inbox/${row.id}/${safeFilename(file.name)}`;
  try {
    const buf = await file.arrayBuffer();
    await putToR2(storagePath, buf, "application/pdf", "private, max-age=604800");
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await supabase
      .from("pdf_processing_jobs")
      .update({ status: "failed", error_message: `R2 upload failed: ${msg}` })
      .eq("id", row.id);
    return NextResponse.json({ error: `R2 upload failed: ${msg}` }, { status: 500 });
  }

  // Finalize the storage path on the job row.
  await supabase
    .from("pdf_processing_jobs")
    .update({ pdf_storage_path: storagePath })
    .eq("id", row.id);

  // Dispatch the workflow.
  const dispatch = await dispatchWorkflow(row.id);
  if (!dispatch.ok) {
    await supabase
      .from("pdf_processing_jobs")
      .update({
        status: "failed",
        error_message: `Dispatch failed: ${dispatch.error}`,
      })
      .eq("id", row.id);
    return NextResponse.json(
      {
        error: `PDF was uploaded but the GitHub Actions dispatch failed. ${dispatch.error}`,
        job_id: row.id,
      },
      { status: 502 }
    );
  }

  return NextResponse.json({
    job_id: row.id,
    source_pdf: file.name,
    status: "dispatched",
  });
}
