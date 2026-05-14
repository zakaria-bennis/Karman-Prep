// ============================================================
// R2 storage helper — uploads files to a Cloudflare R2 bucket.
//
// Two code paths inside uploadToR2():
//   1. Native R2 binding (env.R2.put) when running inside a CF
//      Worker request. This is the production path. The binding
//      avoids the AWS S3 SDK entirely, which matters because the
//      SDK pulls in Node-only `fs.readFile` paths that unenv
//      refuses to polyfill on Workers ("[unenv] fs.readFile is
//      not implemented yet!").
//   2. AWS S3 SDK fallback for `next dev` runs and Node scripts
//      in /scripts/ where the binding isn't reachable.
//
// Required env vars (S3 fallback only — binding mode reads none):
//   R2_ACCOUNT_ID            — your CF account id (for the endpoint URL)
//   R2_ACCESS_KEY_ID         — from the R2 API Token you generated
//   R2_SECRET_ACCESS_KEY     — same
//   R2_BUCKET_NAME           — e.g. "karmanprep-question-images"
//   R2_PUBLIC_URL            — e.g. "https://images.karmanprep.com"
//                              OR the default "https://pub-XXX.r2.dev"
// (R2_PUBLIC_URL is also read in binding mode to build publicUrl.)
// ============================================================

import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getCloudflareContext } from "@opennextjs/cloudflare";

type R2PutOpts = { httpMetadata?: { contentType?: string; cacheControl?: string } };
type R2BucketLike = {
  put: (key: string, value: ArrayBuffer | Uint8Array, opts?: R2PutOpts) => Promise<unknown>;
  delete: (key: string) => Promise<unknown>;
};

async function r2Binding(): Promise<R2BucketLike | null> {
  try {
    const ctx = await getCloudflareContext({ async: true });
    const env = ctx?.env as { R2?: R2BucketLike } | undefined;
    return env?.R2 ?? null;
  } catch {
    // getCloudflareContext throws when not in a CF context.
    return null;
  }
}

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
  const cacheControl = input.cacheControl ?? "public, max-age=3600";

  // Prefer the R2 binding (no fs.readFile path on Workers).
  const binding = await r2Binding();
  if (binding) {
    const body =
      input.body instanceof Buffer
        ? new Uint8Array(input.body.buffer, input.body.byteOffset, input.body.byteLength)
        : input.body;
    await binding.put(input.key, body as ArrayBuffer | Uint8Array, {
      httpMetadata: { contentType: input.contentType, cacheControl },
    });
    return {
      publicUrl: `${publicBase()}/${input.key}`,
      storagePath: input.key,
    };
  }

  // Fallback: AWS S3 SDK (next dev, Node scripts).
  const body =
    input.body instanceof ArrayBuffer ? new Uint8Array(input.body) : input.body;
  await client().send(
    new PutObjectCommand({
      Bucket: bucket(),
      Key: input.key,
      Body: body as Uint8Array,
      ContentType: input.contentType,
      CacheControl: cacheControl,
    })
  );
  return {
    publicUrl: `${publicBase()}/${input.key}`,
    storagePath: input.key,
  };
}

export async function deleteFromR2(storagePath: string): Promise<void> {
  const binding = await r2Binding();
  if (binding) {
    await binding.delete(storagePath);
    return;
  }
  await client().send(
    new DeleteObjectCommand({ Bucket: bucket(), Key: storagePath })
  );
}

/** Sanitize a user-supplied filename for safe use as an object key. */
export function safeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}
