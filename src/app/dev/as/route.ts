// Switches the local test copy to one of its seeded accounts (src/lib/auth/test-accounts.ts) and opens
// that account's portal. Settings links here from "Test accounts"; "Get started" comes here as a new
// student. The pick is a cookie read by safeAuth (src/lib/auth/dev-auth.ts). Production returns 404.
import { NextResponse, type NextRequest } from "next/server";
import { DEV_AS_COOKIE, isDevAuthBypassActive } from "@/lib/auth/dev-auth";
import { safeNext } from "@/lib/auth/portal-home";
import { isTestAccountId } from "@/lib/auth/test-accounts";

export function GET(request: NextRequest) {
  if (process.env.NODE_ENV === "production" || !isDevAuthBypassActive())
    return new NextResponse(null, { status: 404 });
  const who = request.nextUrl.searchParams.get("who");
  if (!isTestAccountId(who)) return new NextResponse("Unknown test account", { status: 400 });
  // "Get started" on the local copy goes on to the sign-up questions, as a new account does
  const to = safeNext(request.nextUrl.searchParams.get("to"));
  const res = NextResponse.redirect(new URL(to, request.url));
  res.cookies.set(DEV_AS_COOKIE, who, { path: "/", httpOnly: true, sameSite: "lax" });
  return res;
}
