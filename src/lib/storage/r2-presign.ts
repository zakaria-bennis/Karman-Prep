// ============================================================
// R2 presigned URLs — for browser-direct large-file uploads.
//
// Why this exists:
//   Cloudflare Workers cap the request body at 100 MB on Standard
//   plan and 128 MB on Workers memory. A 200 MB PDF can't make it
//   to the Worker at all, much less get streamed to R2 from there.
//   The standard serverless pattern is to skip the Worker entirely:
//   browser asks the Worker for a presigned URL, then PUTs directly
//   to R2 over that URL. The Worker only sees a small JSON
//   "I'm done, here's the key" call afterwards.
//
//   R2 is S3-compatible at the API level, so we use the same
//   `@aws-sdk/s3-request-presigner` package the AWS SDK uses for
//   real S3 buckets.
//
// Browser-side flow:
//   1. POST /api/admin/pdf-pipeline/init-upload (small JSON)
//      → server returns { job_id, upload_url, storage_path }
//   2. PUT <upload_url> with the file body (direct to R2)
//   3. POST /api/admin/pdf-pipeline/dispatch with { job_id }
//
// SECURITY: the presigned URL is single-use, scoped to ONE object
// key, expires in `expiresInSeconds` (default 15 min). It does NOT
// allow uploading to any other key or reading anything from R2.
// Even if leaked, an attacker can only overwrite the same path
// that we already pre-allocated for this job.
// ============================================================

import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

let _client: S3Client | null = null;

function client(): S3Client {
  if (_client) return _client;
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error(
      "R2 credentials missing — set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY."
    );
  }
  _client = new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });
  return _client;
}

function bucket(): string {
  const b = process.env.R2_BUCKET_NAME;
  if (!b) throw new Error("R2_BUCKET_NAME missing in env.");
  return b;
}

export interface PresignedPutOptions {
  /** Object key (path within bucket) to allow PUT to. */
  key: string;
  /** Content-Type the browser MUST send in its PUT. Locked at sign time. */
  contentType: string;
  /** How long the presigned URL is valid for. Default 900 (15 min). */
  expiresInSeconds?: number;
}

export interface PresignedPutResult {
  uploadUrl: string;
  expiresAt: string;
  expiresInSeconds: number;
}

export async function createPresignedPutUrl(
  opts: PresignedPutOptions
): Promise<PresignedPutResult> {
  const expiresInSeconds = opts.expiresInSeconds ?? 900;
  const cmd = new PutObjectCommand({
    Bucket: bucket(),
    Key: opts.key,
    ContentType: opts.contentType,
  });
  // getSignedUrl has a known type-mismatch with S3Client when the
  // installed @aws-sdk/client-s3 and @aws-sdk/s3-request-presigner
  // versions resolve different copies of the shared smithy types
  // (npm dedupe should help but doesn't fully on Cloudflare's
  // override resolutions). Cast is safe — at runtime the methods are
  // structurally compatible.
  const uploadUrl = await getSignedUrl(
    client() as unknown as Parameters<typeof getSignedUrl>[0],
    cmd,
    {
      expiresIn: expiresInSeconds,
    }
  );
  const expiresAt = new Date(Date.now() + expiresInSeconds * 1000).toISOString();
  return { uploadUrl, expiresAt, expiresInSeconds };
}

/**
 * HEAD an object to verify it exists at the expected key + has the
 * expected size. Used by the dispatch endpoint after the browser
 * reports the direct upload is done — confirms the file actually
 * landed in R2 before we kick off the GH Actions workflow.
 */
export async function r2ObjectExists(
  key: string
): Promise<{ exists: boolean; sizeBytes?: number; contentType?: string }> {
  try {
    const { HeadObjectCommand } = await import("@aws-sdk/client-s3");
    const out = await client().send(new HeadObjectCommand({ Bucket: bucket(), Key: key }));
    return {
      exists: true,
      sizeBytes: out.ContentLength,
      contentType: out.ContentType,
    };
  } catch (err) {
    if (err && typeof err === "object" && "$metadata" in err) {
      const meta = (err as { $metadata?: { httpStatusCode?: number } }).$metadata;
      if (meta?.httpStatusCode === 404) return { exists: false };
    }
    throw err;
  }
}
