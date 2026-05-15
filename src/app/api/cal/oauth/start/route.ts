// ============================================================
// GET /api/cal/oauth/start
//
// Kicks off the Cal.com OAuth handshake for the signed-in tutor.
// Generates a random `state` (anti-CSRF), stores it in a short-lived
// HTTP-only cookie, and redirects to Cal's authorize page. The
// callback verifies the cookie matches the ?state= it gets back.
//
// Only tutors can start the flow. Admins / students get 403.
// ============================================================

import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { randomBytes } from "node:crypto";
import { fetchUserRole } from "@/lib/supabase/queries/admin";
import { getAuthorizeUrl } from "@/lib/integrations/cal/oauth";

export const runtime = "nodejs";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = await fetchUserRole(userId);
  if (role !== "tutor" && role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const state = randomBytes(24).toString("base64url");
  let url: string;
  try {
    url = getAuthorizeUrl(state);
  } catch (err) {
    console.error("[cal/oauth/start] env not configured:", err);
    return NextResponse.json({ error: "Cal OAuth is not configured yet" }, { status: 500 });
  }

  const res = NextResponse.redirect(url);
  // 10 minutes is plenty for the round-trip to Cal's consent screen.
  res.cookies.set("cal_oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 600,
  });
  return res;
}
