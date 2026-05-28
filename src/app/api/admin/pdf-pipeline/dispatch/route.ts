// ============================================================
// POST /api/admin/pdf-pipeline/dispatch
//
// Second step of the two-stage upload flow (the first being
// /init-upload). The browser has already uploaded the PDF bytes
// directly to R2 over the presigned URL it got from /init-upload.
// This endpoint:
//   1. Verifies the job row exists + is still in 'queued' state
//   2. Verifies the R2 object actually landed (HEAD the key, check
//      that size matches what /init-upload was told to expect)
//   3. Dispatches the GitHub Actions process-pdf workflow with
//      client_payload.job_id
//
// PRE-LARGE-PDF NOTE: the old version of this endpoint accepted a
// multipart form-data upload directly and proxied to R2. It was
// replaced because:
//   · Cloudflare Workers cap request body at 100 MB (Standard plan)
//   · Worker memory cap is 128 MB even when streaming
//   · So anything over ~80 MB couldn't make it to R2 via the Worker
//
// Returns: { job_id, source_pdf, status: "dispatched" }
// ============================================================

import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@clerk/nextjs/server";
import { requireRole } from "@/lib/supabase/queries/admin";
import { createAdminClient } from "@/lib/supabase/server";
import { r2ObjectExists } from "@/lib/storage/r2-presign";

export const runtime = "nodejs";

const GITHUB_OWNER = "zakaria-bennis";
const GITHUB_REPO = "Karman-Prep";
const WORKFLOW_EVENT_TYPE = "process-pdf";

// Tolerance for size mismatch between what /init-upload was told
// and what actually landed in R2. We allow ZERO drift — the browser
// PUT either succeeded with the full file or didn't. R2's
// Content-Length on a successful PUT is exact.
const SIZE_TOLERANCE_BYTES = 0;

const RequestSchema = z.object({
  job_id: z.string().uuid(),
});

/** Trigger the process-pdf workflow on GitHub Actions. */
async function dispatchWorkflow(
  jobId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const pat = process.env.GITHUB_PAT;
  if (!pat) {
    return {
      ok: false,
      error:
        "GITHUB_PAT not set. Set via: wrangler secret put GITHUB_PAT  (or .env.local for local dev). Token needs Contents:write on the repo.",
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

  // Verify job row exists + is in 'queued' state
  const supabase = createAdminClient();
  const { data: job, error: readErr } = await supabase
    .from("pdf_processing_jobs")
    .select("id, status, pdf_storage_path, pdf_size_bytes, source_pdf")
    .eq("id", body.job_id)
    .maybeSingle();
  if (readErr) {
    return NextResponse.json({ error: `Failed to read job: ${readErr.message}` }, { status: 500 });
  }
  if (!job) {
    return NextResponse.json({ error: `Job ${body.job_id} not found` }, { status: 404 });
  }
  if (job.status !== "queued") {
    return NextResponse.json(
      { error: `Job ${body.job_id} is in status='${job.status}', expected 'queued'.` },
      { status: 409 }
    );
  }
  if (!job.pdf_storage_path || job.pdf_storage_path === "pending") {
    return NextResponse.json(
      {
        error: `Job ${body.job_id} has no R2 storage path. Did you call /init-upload first?`,
      },
      { status: 409 }
    );
  }

  // Verify the R2 object actually landed — guards against the
  // browser saying "I'm done" but never actually PUTing the bytes,
  // OR a presign-URL leak being used to upload to a different key.
  let r2Check;
  try {
    r2Check = await r2ObjectExists(job.pdf_storage_path);
  } catch (err) {
    return NextResponse.json(
      {
        error: `R2 HEAD check failed: ${err instanceof Error ? err.message : "unknown"}`,
      },
      { status: 502 }
    );
  }
  if (!r2Check.exists) {
    await supabase
      .from("pdf_processing_jobs")
      .update({
        status: "failed",
        error_message:
          "Browser reported upload complete but R2 object does not exist at expected path.",
      })
      .eq("id", body.job_id);
    return NextResponse.json(
      {
        error:
          "R2 object not found at expected path. Upload may have been interrupted; please retry from /init-upload.",
      },
      { status: 409 }
    );
  }
  // Size check — the PUT either delivered the full file or didn't.
  if (
    typeof r2Check.sizeBytes === "number" &&
    typeof job.pdf_size_bytes === "number" &&
    Math.abs(r2Check.sizeBytes - job.pdf_size_bytes) > SIZE_TOLERANCE_BYTES
  ) {
    await supabase
      .from("pdf_processing_jobs")
      .update({
        status: "failed",
        error_message: `R2 size mismatch: expected ${job.pdf_size_bytes}, got ${r2Check.sizeBytes}.`,
      })
      .eq("id", body.job_id);
    return NextResponse.json(
      {
        error: `R2 size mismatch: expected ${job.pdf_size_bytes}, got ${r2Check.sizeBytes}. Upload may have been truncated.`,
      },
      { status: 409 }
    );
  }

  // Dispatch the workflow.
  const dispatch = await dispatchWorkflow(body.job_id);
  if (!dispatch.ok) {
    await supabase
      .from("pdf_processing_jobs")
      .update({
        status: "failed",
        error_message: `Dispatch failed: ${dispatch.error}`,
      })
      .eq("id", body.job_id);
    return NextResponse.json(
      {
        error: `PDF was uploaded but the GitHub Actions dispatch failed. ${dispatch.error}`,
        job_id: body.job_id,
      },
      { status: 502 }
    );
  }

  // Update job row with the github_run note for status visibility.
  await supabase
    .from("pdf_processing_jobs")
    .update({
      progress: {
        stage: "queued",
        stage_label: "Queued for GitHub Actions",
        percent: 0,
        message: "Workflow dispatched; awaiting runner",
        updated_at: new Date().toISOString(),
      },
    })
    .eq("id", body.job_id);

  return NextResponse.json({
    job_id: body.job_id,
    source_pdf: job.source_pdf,
    status: "dispatched",
  });
}
