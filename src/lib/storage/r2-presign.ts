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
// Why aws4fetch (NOT @aws-sdk):
//   The AWS SDK's *Node* runtime config eagerly wires up fs-based
//   config loaders (shared ini files, defaultsMode, etc.). On the
//   Cloudflare Workers runtime those throw
//   "[unenv] fs.readFile is not implemented yet!" the moment you
//   call getSignedUrl / client.send(). aws4fetch is a ~5 KB SigV4
//   signer built on fetch + WebCrypto with ZERO Node dependencies,
//   so it signs cleanly on the Worker. R2 is S3-compatible, so the
//   same SigV4 query-signing works against it unchanged.
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

import { AwsClient } from "aws4fetch";

let _aws: AwsClient | null = null;

/** Lazily-built SigV4 signer for R2. region "auto" + service "s3" are the
 *  R2 conventions. Credentials come from the Cloudflare Worker env. */
function aws(): AwsClient {
  if (_aws) return _aws;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  if (!accessKeyId || !secretAccessKey) {
    throw new Error("R2 credentials missing — set R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY.");
  }
  _aws = new AwsClient({ accessKeyId, secretAccessKey, service: "s3", region: "auto" });
  return _aws;
}

function bucket(): string {
  const b = process.env.R2_BUCKET_NAME;
  if (!b) throw new Error("R2_BUCKET_NAME missing in env.");
  return b;
}

/** Path-style R2 object URL:
 *  https://<account>.r2.cloudflarestorage.com/<bucket>/<key> */
function objectUrl(key: string): URL {
  const accountId = process.env.R2_ACCOUNT_ID;
  if (!accountId) throw new Error("R2_ACCOUNT_ID missing in env.");
  const u = new URL(`https://${accountId}.r2.cloudflarestorage.com`);
  // Assigning pathname percent-encodes each segment while keeping the key's
  // own slashes as path separators.
  u.pathname = `/${bucket()}/${key}`;
  return u;
}

export interface PresignedPutOptions {
  /** Object key (path within bucket) to allow PUT to. */
  key: string;
  /** Advisory Content-Type the browser is expected to send. Not bound into
   *  the signature (host-only signing), so the browser may send it as an
   *  unsigned header and R2 stores it — avoids SigV4 header-mismatch 403s. */
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
  const url = objectUrl(opts.key);
  url.searchParams.set("X-Amz-Expires", String(expiresInSeconds));
  // Query-signed (presigned) PUT URL. Host-only signing: the browser's
  // Content-Type rides along as an unsigned header, which R2 accepts and
  // stores. The key is pre-allocated, so a leaked URL can only overwrite
  // this one object.
  const signed = await aws().sign(new Request(url, { method: "PUT" }), {
    aws: { signQuery: true },
  });
  const expiresAt = new Date(Date.now() + expiresInSeconds * 1000).toISOString();
  return { uploadUrl: signed.url, expiresAt, expiresInSeconds };
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
  const signed = await aws().sign(new Request(objectUrl(key), { method: "HEAD" }));
  const res = await fetch(signed);
  // R2 returns 404 for a missing key (403 in some bucket policies).
  if (res.status === 404 || res.status === 403) return { exists: false };
  if (!res.ok) throw new Error(`R2 HEAD ${key} failed: HTTP ${res.status}`);
  const len = res.headers.get("content-length");
  return {
    exists: true,
    sizeBytes: len ? Number(len) : undefined,
    contentType: res.headers.get("content-type") ?? undefined,
  };
}
