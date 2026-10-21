import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import {
  DecisionError,
  FIGURE_ID,
  SHA256,
  decide,
  isFigureReviewEnabled,
  isLocalRequest,
  loadQueue,
} from "../review-data";

export const dynamic = "force-dynamic";

const NO_STORE = { "cache-control": "no-store" };

const DecisionBody = z.object({
  id: z.string().regex(FIGURE_ID),
  decision: z.enum(["approved", "rejected", "undo"]),
  round: z.number().int().min(1).max(1000),
  fileSha256: z.string().regex(SHA256),
  note: z.string().max(2000).optional(),
});

function notFound() {
  return new NextResponse("Not found", { status: 404, headers: NO_STORE });
}

/** Dev only, and only from this machine. */
function allowed(request: NextRequest) {
  return isFigureReviewEnabled() && isLocalRequest(request.headers);
}

/** The review queue: figures waiting for the founder, and the counts. */
export async function GET(request: NextRequest) {
  if (!allowed(request)) return notFound();
  return NextResponse.json(await loadQueue(), { headers: NO_STORE });
}

/** One founder decision (approve, reject with a note, undo), written to status.json at once. */
export async function POST(request: NextRequest) {
  if (!allowed(request)) return notFound();
  const origin = request.headers.get("origin");
  if (!origin || origin !== `http://${request.headers.get("host")}`) {
    return NextResponse.json(
      { error: "same-origin requests only" },
      { status: 403, headers: NO_STORE }
    );
  }
  if (!(request.headers.get("content-type") ?? "").startsWith("application/json")) {
    return NextResponse.json({ error: "send JSON" }, { status: 415, headers: NO_STORE });
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "body is not JSON" }, { status: 400, headers: NO_STORE });
  }
  const parsed = DecisionBody.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid decision" }, { status: 400, headers: NO_STORE });
  }
  try {
    const status = await decide(parsed.data);
    return NextResponse.json(
      { ok: true, status: status.status, round: status.round },
      { headers: NO_STORE }
    );
  } catch (e) {
    if (e instanceof DecisionError) {
      return NextResponse.json({ error: e.message }, { status: e.status, headers: NO_STORE });
    }
    throw e;
  }
}
