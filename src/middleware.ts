// ============================================================
// Clerk middleware — protects platform routes.
//
// Public marketing / auth / webhook routes pass through; every other
// route requires a signed-in user (auth.protect()).
//
// NOTE: the pre-launch "coming soon" maintenance gate was removed —
// the site is openly accessible now. NEXT_PUBLIC_KARMAN_LAUNCHED is no
// longer consulted. (To re-introduce a launch gate later, restore the
// rewrite-to-/coming-soon branch from git history.)
// ============================================================

import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse, type NextRequest } from "next/server";

/** Dev-only auth bypass. When NODE_ENV !== "production" and
 *  DEV_IMPERSONATE_CLERK_ID is set, the entire Clerk gate is
 *  short-circuited so the developer (or a smoke-test harness)
 *  can view authenticated pages without going through sign-in.
 *  See src/lib/auth/dev-auth.ts for the page-level companion.
 *
 *  IMPORTANT: when this is active we skip `clerkMiddleware()`
 *  entirely, not just call NextResponse.next() inside it.
 *  `clerkMiddleware` validates `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
 *  on every request even if the handler short-circuits, which
 *  fails when CI runs with a placeholder key (E2E workflow). */
const DEV_AUTH_BYPASS_ACTIVE =
  process.env.NODE_ENV !== "production" && (process.env.DEV_IMPERSONATE_CLERK_ID ?? "").length > 0;

/** Routes that don't require auth (marketing pages, auth flows,
 *  webhooks, cron triggers, public APIs). Everything else is
 *  protected. */
const isPublicRoute = createRouteMatcher([
  "/",
  "/faq",
  "/about",
  "/blog(.*)",
  "/guarantee",
  "/privacy",
  "/terms",
  "/refunds",
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

/** Bypass middleware — used only when DEV_AUTH_BYPASS_ACTIVE.
 *  Doesn't call any Clerk APIs, so a placeholder publishable key
 *  in CI doesn't crash the request pipeline. */
function bypassMiddleware(_request: NextRequest) {
  return NextResponse.next();
}

/** Real middleware — Clerk auth. */
const realMiddleware = clerkMiddleware(async (auth, request) => {
  if (isPublicRoute(request)) {
    return NextResponse.next();
  }
  await auth.protect();
  return NextResponse.next();
});

// Pick at module load — bypass branch skips Clerk's per-request
// publishable-key check entirely. Cannot fire in production.
export default DEV_AUTH_BYPASS_ACTIVE ? bypassMiddleware : realMiddleware;

export const config = {
  matcher: [
    // Skip Next.js internals and static assets
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
