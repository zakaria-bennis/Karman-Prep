// ============================================================
// Clerk middleware — protects platform routes AND enforces
// pre-launch maintenance gating.
//
// Maintenance mode (default while NEXT_PUBLIC_KARMAN_LAUNCHED !== "true"):
//   · Every non-essential URL is rewritten to /coming-soon for
//     visitors who aren't signed in.
//   · Sign-in/sign-up routes stay reachable so the operator can
//     log in. Once authenticated, all routes work normally.
//   · Webhooks, cron handlers, and Clerk's own auth APIs stay
//     reachable so external integrations don't break.
//
// To go live publicly: set NEXT_PUBLIC_KARMAN_LAUNCHED="true" in
// the Cloudflare Worker env (Settings → Variables and Secrets) and
// redeploy. The gate switches off; the homepage + marketing pages
// become public again.
// ============================================================

import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

/** Routes always exempt from the maintenance gate AND auth check.
 *  Used for: the coming-soon page itself, sign-in flows, webhooks,
 *  cron triggers, public APIs that need to keep functioning. */
const isMaintenanceExempt = createRouteMatcher([
  "/coming-soon",
  "/auth/sign-in(.*)",
  "/auth/sign-up(.*)",
  "/api/stripe/webhook", // Stripe webhooks
  "/api/cal(.*)", // Cal.com webhooks
  "/api/webhooks(.*)", // Slack/Zoom/etc.
  "/api/cron(.*)", // CF cron triggers (self-auth via CRON_SECRET)
  "/api/email/subscribe", // Coming-soon notify form posts here
]);

/** Routes that don't require auth in normal (post-launch) operation.
 *  Used only when NEXT_PUBLIC_KARMAN_LAUNCHED === "true". */
const isPublicRoute = createRouteMatcher([
  "/",
  "/faq",
  "/about",
  "/blog(.*)",
  "/guarantee",
  "/privacy",
  "/terms",
  "/refunds",
  "/coming-soon",
  "/auth/sign-in(.*)",
  "/auth/sign-up(.*)",
  "/onboarding(.*)",
  "/api/stripe/webhook",
  "/api/cal(.*)",
  "/api/webhooks(.*)",
  "/api/email/subscribe",
  "/api/diagnostic/sample",
  "/api/cron(.*)",
]);

const LAUNCHED = process.env.NEXT_PUBLIC_KARMAN_LAUNCHED === "true";

export default clerkMiddleware(async (auth, request) => {
  // ── Pre-launch maintenance gate ────────────────────────────
  if (!LAUNCHED && !isMaintenanceExempt(request)) {
    const { userId } = await auth();
    if (!userId) {
      // Show the coming-soon page in place of the requested URL,
      // preserving the URL bar (rewrite, not redirect) so direct
      // links don't bounce away.
      const url = request.nextUrl.clone();
      url.pathname = "/coming-soon";
      url.search = "";
      return NextResponse.rewrite(url);
    }
    // Signed in → fall through to the normal auth checks below.
  }

  // ── Normal auth flow ───────────────────────────────────────
  if (isPublicRoute(request)) {
    return NextResponse.next();
  }
  await auth.protect();
  return NextResponse.next();
});

export const config = {
  matcher: [
    // Skip Next.js internals and static assets
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
