// ============================================================
// POST /api/consent — write the visitor's session-recording
// consent choice as an httpOnly cookie.
//
// The cookie is set with effectively-no TTL (max-age 100 years)
// per the product decision: never re-prompt once the user has
// chosen. If we later need to align with stricter EU guidance,
// shorten max-age here and the banner will re-show on expiry.
// ============================================================

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { CONSENT_COOKIE } from "@/lib/consent/server";

const bodySchema = z.object({
  choice: z.enum(["yes", "no"]),
});

const HUNDRED_YEARS_SECONDS = 60 * 60 * 24 * 365 * 100;

export async function POST(req: Request) {
  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_body", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const c = await cookies();
  // NOT httpOnly: sentry.client.config.ts reads this cookie at init
  // time via document.cookie to gate replay sampling. The value
  // ("yes" / "no") isn't a secret and exposing it to JS doesn't
  // weaken any auth surface.
  c.set({
    name: CONSENT_COOKIE,
    value: parsed.data.choice,
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: HUNDRED_YEARS_SECONDS,
  });

  return NextResponse.json({ ok: true, choice: parsed.data.choice });
}
