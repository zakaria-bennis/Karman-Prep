// ============================================================
// POST /api/track — Karman's own usage events (src/lib/analytics/client.ts sends them).
//
// Validated with Zod (src/lib/analytics/events.ts), at most 16 KB and 25 events a request,
// rate-limited per visit, and gated per event by src/lib/analytics/consent.ts: public-site
// events need the visitor's analytics consent and no Do Not Track / Global Privacy Control
// signal; portal events need a signed-in user. The IP address is never read or stored.
// Answers 200 whether or not anything was kept, so the browser learns nothing about the gate.
// ============================================================

import { NextResponse } from "next/server";
import { cookies, headers } from "next/headers";
import { safeAuth } from "@/lib/auth/dev-auth";
import { CONSENT_COOKIE, getVisitorRegion } from "@/lib/consent/server";
import { ingest } from "@/lib/analytics/ingest";
import { insertRows, pruneOldEvents } from "@/lib/analytics/server";
import { MAX_BODY_BYTES } from "@/lib/analytics/shared";

export const dynamic = "force-dynamic";

async function signedInUser(): Promise<string | null> {
  try {
    return (await safeAuth()).userId;
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  const declared = Number(req.headers.get("content-length") ?? 0);
  if (declared > MAX_BODY_BYTES) return NextResponse.json({ ok: false }, { status: 413 });

  const body = await req.text();
  const h = await headers();
  const c = await cookies();
  const result = ingest({
    body,
    userId: await signedInUser(),
    consentCookie: c.get(CONSENT_COOKIE)?.value ?? null,
    region: await getVisitorRegion(),
    dnt: h.get("dnt"),
    gpc: h.get("sec-gpc"),
  });
  if (result.status !== 200) return NextResponse.json({ ok: false }, { status: result.status });

  await insertRows(result.rows);
  await pruneOldEvents();
  return NextResponse.json({ ok: true });
}
