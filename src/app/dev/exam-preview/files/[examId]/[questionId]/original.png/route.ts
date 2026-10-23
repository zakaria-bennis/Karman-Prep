import type { NextRequest } from "next/server";
import { isLocalRequest } from "../../../../../figure-review/review-data";
import { isExamPreviewEnabled, originalFile } from "../../../../exam-data";

export const dynamic = "force-dynamic";

/** Serves one captured question's original.png. Dev and localhost only. */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ examId: string; questionId: string }> }
) {
  if (!isExamPreviewEnabled() || !isLocalRequest(request.headers)) {
    return new Response("Not found", { status: 404 });
  }
  const { examId, questionId } = await params;
  const body = await originalFile(examId, questionId);
  if (!body) return new Response("Not found", { status: 404 });
  return new Response(body as Uint8Array<ArrayBuffer>, {
    headers: {
      "content-type": "image/png",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
    },
  });
}
