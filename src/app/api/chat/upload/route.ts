// ============================================================
// POST /api/chat/upload   — multipart form-data: { file: File }
//
// Validates the file (image MIME, ≤5MB), uploads to the chat-media
// Supabase Storage bucket under `<clerk_id>/<uuid>.<ext>`, and
// returns a long-lived signed URL the client passes back as part
// of /api/chat/send's mediaUrls array.
//
// Bucket is private; clients can't read these URLs without the
// signature. Slack's auto-unfurl handles the inline-image render
// when the URL is posted to a channel.
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createAdminClient } from "@/lib/supabase/server";

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIME = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "image/heic",
  "image/heif",
]);
const SIGNED_URL_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days

function extFor(mime: string): string {
  switch (mime) {
    case "image/png": return "png";
    case "image/jpeg": return "jpg";
    case "image/webp": return "webp";
    case "image/gif": return "gif";
    case "image/heic": return "heic";
    case "image/heif": return "heif";
    default: return "bin";
  }
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "Expected multipart/form-data" }, { status: 400 });

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing file field" }, { status: 400 });
  }
  if (file.size === 0) {
    return NextResponse.json({ error: "Empty file" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: `File exceeds ${MAX_BYTES} bytes` }, { status: 400 });
  }
  if (!ALLOWED_MIME.has(file.type)) {
    return NextResponse.json(
      { error: `Unsupported file type ${file.type}. Images only.` },
      { status: 400 }
    );
  }

  const ext = extFor(file.type);
  const objectPath = `${userId}/${crypto.randomUUID()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const supa = createAdminClient();
  const { error: upErr } = await supa.storage
    .from("chat-media")
    .upload(objectPath, buffer, {
      contentType: file.type,
      upsert: false,
    });
  if (upErr) {
    console.error("[api/chat/upload] upload failed:", upErr);
    return NextResponse.json({ error: "Failed to store file" }, { status: 500 });
  }

  const { data: signed, error: sigErr } = await supa.storage
    .from("chat-media")
    .createSignedUrl(objectPath, SIGNED_URL_TTL_SECONDS);
  if (sigErr || !signed) {
    console.error("[api/chat/upload] sign failed:", sigErr);
    return NextResponse.json({ error: "Failed to sign URL" }, { status: 500 });
  }

  return NextResponse.json({ url: signed.signedUrl, path: objectPath });
}
