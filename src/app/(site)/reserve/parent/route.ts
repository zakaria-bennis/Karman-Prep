// GET /reserve/parent?p=<parent token>: the parents' own link, from the landing page and the welcome
// email. Signed out, the parent makes an account and comes back here; signed in, the account becomes a
// parent account on this seat and the parent portal opens. It opens for two parent accounts, so the
// buyer can forward it to a second parent. It never takes the student's seat.
import { NextRequest, NextResponse } from "next/server";
import { safeAuth } from "@/lib/auth/dev-auth";
import { joinAsParent } from "@/lib/reserve/service";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { origin, searchParams } = request.nextUrl;
  const token = searchParams.get("p") ?? "";

  const { userId } = await safeAuth();
  if (!userId) {
    const signUp = new URL("/auth/sign-up", origin);
    signUp.searchParams.set("redirect_url", `/reserve/parent?p=${encodeURIComponent(token)}`);
    return NextResponse.redirect(signUp, 303);
  }
  try {
    const outcome = await joinAsParent(token, userId);
    if (outcome === "joined")
      return NextResponse.redirect(new URL("/dashboard/parent?welcome=1", origin), 303);
    console.warn(`[reserve/parent] ${outcome}`);
  } catch (e) {
    console.error("[reserve/parent] failed", e);
  }
  // not joined (the link is used up, or this account is a student's): the student portal sends each kind of account to its own home
  return NextResponse.redirect(new URL("/dashboard/student", origin), 303);
}
