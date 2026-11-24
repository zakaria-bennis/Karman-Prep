// Saves the local test sign-in pick (see ../page.tsx) and opens that person's portal.
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { DEV_AS_COOKIE, isDevAuthBypassActive } from "@/lib/auth/dev-auth";

const Who = z.string().regex(/^dev_seed_[a-z0-9_]+$/);

export function GET(request: NextRequest) {
  if (process.env.NODE_ENV === "production" || !isDevAuthBypassActive())
    return new NextResponse(null, { status: 404 });
  const who = Who.safeParse(request.nextUrl.searchParams.get("who"));
  if (!who.success) return new NextResponse("Unknown test account", { status: 400 });
  const res = NextResponse.redirect(new URL("/portal", request.url));
  res.cookies.set(DEV_AS_COOKIE, who.data, { path: "/", httpOnly: true, sameSite: "lax" });
  return res;
}
