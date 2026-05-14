// ============================================================
// POST /api/admin/upload-textbook-image
//
// Receives a multipart form with one `image` field — a PNG/JPG
// pasted from clipboard or dropped from the OS — and uploads it
// to R2 under textbook-images/<nodeId>/<ts>-pasted.<ext>.
// Returns { publicUrl } the editor inlines into the markdown.
//
// Mirrors /api/admin/pdf-upload's R2-binding pattern so we don't
// hit the unenv `fs.readFile` failure that bites the AWS S3 SDK
// inside Cloudflare Workers.
// ============================================================

import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { requireRole } from "@/lib/supabase/queries/admin";
import { uploadToR2, safeFilename } from "@/lib/storage/r2";

export const runtime = "nodejs";

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB per pasted image
const ALLOWED_TYPES = new Set(["image/png", "image/jpeg", "image/gif", "image/webp"]);

async function putToR2(key: string, body: ArrayBuffer, contentType: string): Promise<void> {
  // Prefer the native R2 binding (no fs.readFile path); fall back
  // to the S3 SDK helper for `next dev` or non-CF runtimes.
  try {
    const ctx = await getCloudflareContext({ async: true });
    type R2BucketLike = {
      put: (
        key: string,
        value: ArrayBuffer,
        opts?: {
          httpMetadata?: { contentType?: string; cacheControl?: string };
        }
      ) => Promise<unknown>;
    };
    const env = ctx?.env as { R2?: R2BucketLike } | undefined;
    if (env?.R2) {
      await env.R2.put(key, body, {
        httpMetadata: {
          contentType,
          cacheControl: "public, max-age=31536000, immutable",
        },
      });
      return;
    }
  } catch {
    // Not in CF context — fall through to S3 SDK.
  }
  await uploadToR2({ key, body, contentType });
}

function publicUrlFor(key: string): string {
  const base = process.env.R2_PUBLIC_URL?.replace(/\/$/, "") ?? "";
  return `${base}/${key}`;
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

  const nodeId = (formData.get("nodeId") as string | null)?.trim();
  if (!nodeId) {
    return NextResponse.json({ error: "Missing nodeId" }, { status: 400 });
  }

  const file = formData.get("image");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing image file" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: `Image exceeds the ${MAX_BYTES / 1024 / 1024} MB limit.` },
      { status: 413 }
    );
  }
  const contentType = file.type || "image/png";
  if (!ALLOWED_TYPES.has(contentType)) {
    return NextResponse.json(
      { error: `Unsupported content type "${contentType}". Use PNG, JPEG, GIF, or WebP.` },
      { status: 415 }
    );
  }

  // ── Upload ──────────────────────────────────────────────
  const ext = contentType.split("/")[1] === "jpeg" ? "jpg" : contentType.split("/")[1];
  const safeName = safeFilename(file.name || `pasted.${ext}`);
  const key = `textbook-images/${safeFilename(nodeId)}/${Date.now()}-${safeName}`;

  try {
    const buf = await file.arrayBuffer();
    await putToR2(key, buf, contentType);
  } catch (err) {
    return NextResponse.json(
      { error: `R2 upload failed: ${err instanceof Error ? err.message : "unknown"}` },
      { status: 502 }
    );
  }

  return NextResponse.json({ publicUrl: publicUrlFor(key), storagePath: key }, { status: 201 });
}
