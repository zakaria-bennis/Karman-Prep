// ============================================================
// GET /api/cal/oauth/callback?code=...&state=...
//
// Cal redirects the tutor back here after consent. We:
//   1. Verify the state cookie matches ?state= (CSRF guard).
//   2. Exchange the auth code for access + refresh tokens.
//   3. Fetch the tutor's event-types using the new access token.
//   4. Auto-match by keyword ("karman" / "sat" in title or slug).
//      If exactly one matches → save it as the Karman event-type.
//      Otherwise → leave it unset; the settings page will show a
//      picker dropdown.
//   5. Redirect back to /tutor/settings/booking with a status query.
//
// Errors redirect to /tutor/settings/booking?cal_error=... so the
// UI can render the failure inline instead of dumping JSON.
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { fetchUserRole } from "@/lib/supabase/queries/admin";
import { getUserUuidByClerkId } from "@/lib/supabase/queries/bookings";
import {
  exchangeCodeForTokens,
  listEventTypes,
  pickEventTypeByKeyword,
} from "@/lib/integrations/cal/oauth";
import { storeCalConnection } from "@/lib/supabase/queries/cal-oauth";

export const runtime = "nodejs";

function redirectToSettings(req: NextRequest, params: Record<string, string>): NextResponse {
  const url = new URL("/tutor/settings/booking", req.nextUrl.origin);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = NextResponse.redirect(url);
  // Clear the state cookie regardless of success / failure.
  res.cookies.set("cal_oauth_state", "", { path: "/", maxAge: 0 });
  return res;
}

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.redirect(new URL("/auth/sign-in", req.nextUrl.origin));
  }
  const role = await fetchUserRole(userId);
  if (role !== "tutor" && role !== "admin") {
    return redirectToSettings(req, { cal_error: "forbidden" });
  }

  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  const stateCookie = req.cookies.get("cal_oauth_state")?.value;

  if (!code || !state || !stateCookie || state !== stateCookie) {
    return redirectToSettings(req, { cal_error: "bad_state" });
  }

  const tutorUuid = await getUserUuidByClerkId(userId);
  if (!tutorUuid) return redirectToSettings(req, { cal_error: "no_profile" });

  let tokens;
  try {
    tokens = await exchangeCodeForTokens(code);
  } catch (err) {
    console.error("[cal/oauth/callback] token exchange failed:", err);
    return redirectToSettings(req, { cal_error: "exchange_failed" });
  }

  // Auto-match against the tutor's event-types. Failure here is
  // non-fatal — we still save the tokens and let the tutor pick
  // manually from the settings dropdown.
  let pickedEventType = null;
  try {
    const eventTypes = await listEventTypes(tokens.accessToken);
    pickedEventType = pickEventTypeByKeyword(eventTypes);
  } catch (err) {
    console.error("[cal/oauth/callback] listEventTypes failed (non-fatal):", err);
  }

  try {
    await storeCalConnection({ tutorUserId: tutorUuid, tokens, pickedEventType });
  } catch (err) {
    console.error("[cal/oauth/callback] store failed:", err);
    return redirectToSettings(req, { cal_error: "store_failed" });
  }

  return redirectToSettings(req, {
    cal_connected: "1",
    ...(pickedEventType ? { auto_picked: pickedEventType.title } : { needs_pick: "1" }),
  });
}
