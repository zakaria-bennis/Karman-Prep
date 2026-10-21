import type { NextRequest } from "next/server";
import { figureFile, isFigureReviewEnabled, isLocalRequest } from "../../../review-data";

export const dynamic = "force-dynamic";

/** Serves a queued figure's original.png or its figure.svg (from figure.json). Dev and localhost only. */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; name: string }> }
) {
  if (!isFigureReviewEnabled() || !isLocalRequest(request.headers)) {
    return new Response("Not found", { status: 404 });
  }
  const { id, name } = await params;
  const file = await figureFile(id, name);
  if (!file) return new Response("Not found", { status: 404 });
  return new Response(file.body, {
    headers: {
      "content-type": file.type,
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
      "content-security-policy": "default-src 'none'; style-src 'unsafe-inline'; sandbox",
    },
  });
}
