// GET /reserve/claim?r=<claim token>: the button on the welcome page. Signed out, the student is sent to
// create an account and comes back here; signed in, the paid seat is attached to the account and the
// platform opens. A seat can be attached to one account only.
import { NextRequest, NextResponse } from "next/server";
import { safeAuth } from "@/lib/auth/dev-auth";
import { claimReservation } from "@/lib/reserve/service";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { origin, searchParams } = request.nextUrl;
  const token = searchParams.get("r") ?? "";
  const welcome = new URL(`/reserve/welcome?r=${encodeURIComponent(token)}`, origin);

  const { userId } = await safeAuth();
  if (!userId) {
    const signUp = new URL("/auth/sign-up", origin);
    signUp.searchParams.set("redirect_url", `/reserve/claim?r=${encodeURIComponent(token)}`);
    return NextResponse.redirect(signUp, 303);
  }
  try {
    const outcome = await claimReservation(token, userId);
    if (outcome === "claimed" || outcome === "yours")
      return NextResponse.redirect(new URL("/dashboard/student?welcome=1", origin), 303);
    console.warn(`[reserve/claim] ${outcome}`);
  } catch (e) {
    console.error("[reserve/claim] failed", e);
  }
  return NextResponse.redirect(welcome, 303);
}
