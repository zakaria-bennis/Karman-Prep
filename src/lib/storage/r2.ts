// ============================================================
// R2 storage helper — uploads files to a Cloudflare R2 bucket
// using the S3-compatible API. Works identically in local dev
// (Node) and in production (CF Workers via OpenNext).
//
// Why S3 SDK and not the R2 binding directly: the binding only
// exists inside a CF Worker request handler. Anything that runs
// at build time, in a Node script, or from a non-Worker context
// (e.g. one-off admin scripts in /scripts/) can't see env.R2.
// The S3-compatible API works everywhere.
//
// Required env vars:
//   R2_ACCOUNT_ID            — your CF account id (for the endpoint URL)
//   R2_ACCESS_KEY_ID         — from the R2 API Token you generated
//   R2_SECRET_ACCESS_KEY     — same
//   R2_BUCKET_NAME           — e.g. "karmanprep-question-images"
//   R2_PUBLIC_URL            — e.g. "https://images.karmanprep.com"
//                              OR the default "https://pub-XXX.r2.dev"
// ============================================================

import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";

let _client: S3Client | null = null;

function client(): S3Client {
  if (_client) return _client;
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error(
      "R2 credentials missing — set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY in env."
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

function publicBase(): string {
  const u = process.env.R2_PUBLIC_URL;
  if (!u) throw new Error("R2_PUBLIC_URL missing in env.");
  return u.replace(/\/$/, "");
}

export interface R2UploadInput {
  /** Path within the bucket, e.g. "question-images/abc123/page-75.png". */
  key: string;
  body: ArrayBuffer | Uint8Array | Buffer;
  contentType: string;
  /** Cache-Control header on the object. Default: 1 hour. */
  cacheControl?: string;
}

export interface R2UploadResult {
  /** Full public URL clients can use to GET this object. */
  publicUrl: string;
  /** The key inside the bucket (for later deletion). */
  storagePath: string;
}

export async function uploadToR2(input: R2UploadInput): Promise<R2UploadResult> {
  const Body =
    input.body instanceof ArrayBuffer ? new Uint8Array(input.body) : input.body;

  await client().send(
    new PutObjectCommand({
      Bucket: bucket(),
      Key: input.key,
      Body: Body as Uint8Array,
      ContentType: input.contentType,
      CacheControl: input.cacheControl ?? "public, max-age=3600",
    })
  );

  return {
    publicUrl: `${publicBase()}/${input.key}`,
    storagePath: input.key,
  };
}

export async function deleteFromR2(storagePath: string): Promise<void> {
  await client().send(
    new DeleteObjectCommand({ Bucket: bucket(), Key: storagePath })
  );
}

/** Sanitize a user-supplied filename for safe use as an object key. */
export function safeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}
