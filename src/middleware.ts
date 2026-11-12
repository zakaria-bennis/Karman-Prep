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

import {
  clerkMiddleware,
  createRouteMatcher,
  type ClerkMiddlewareAuth,
} from "@clerk/nextjs/server";
import { NextResponse, type NextFetchEvent, type NextRequest } from "next/server";
import { KARMAN_AUTH_ROUTES } from "@/lib/auth/routes";
import { SITE_PAGES } from "@/components/site/routes";

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

/** Cal.com OAuth routes. Listed exactly (not a /api/cal prefix) so look-alike
 *  paths such as /api/calendar or /api/calls stay protected. Each route checks
 *  the signed-in tutor itself. The Cal.com webhook is /api/webhooks/cal. */
const CAL_OAUTH_ROUTES = [
  "/api/cal/oauth/start",
  "/api/cal/oauth/callback",
  "/api/cal/oauth/disconnect",
];

/** Routes always exempt from the maintenance gate AND auth check.
 *  Used for: the coming-soon page itself, sign-in flows, webhooks,
 *  cron triggers, public APIs that need to keep functioning. */
const isMaintenanceExempt = createRouteMatcher([
  "/coming-soon",
  "/auth/sign-in(.*)",
  "/auth/sign-up(.*)",
  "/api/stripe/webhook", // Stripe webhooks
  ...CAL_OAUTH_ROUTES,
  "/api/webhooks(.*)", // Slack/Zoom/etc.
  "/api/cron(.*)", // CF cron triggers (self-auth via CRON_SECRET)
  "/api/email/subscribe", // Coming-soon notify form posts here
  "/api/consent", // the session-replay consent banner, shown to signed-out visitors too
  "/api/track", // first-party usage events; the route applies the consent rules itself
  "/api/calendar/feed/(.*)", // Calendar apps fetch it; the secret token is the credential
]);

/** Routes that don't require auth in normal (post-launch) operation.
 *  Used only when NEXT_PUBLIC_KARMAN_LAUNCHED === "true". */
const isPublicRoute = createRouteMatcher([
  "/checkout/start", // pricing plan buttons: signed out goes to sign-up, then back here
  // the marketing site (src/components/site/routes.ts)
  "/",
  "/program",
  "/private-tutoring",
  "/free-practice-test",
  "/pricing",
  "/guarantee",
  "/faq",
  "/about",
  "/research",
  "/privacy",
  "/terms",
  "/refunds",
  "/cookies",
  // old marketing addresses, redirected in next.config.mjs
  "/free-diagnostic",
  "/plans",
  "/questions",
  "/blog(.*)",
  "/calculator",
  "/sitemap.xml",
  "/robots.txt",
  "/coming-soon",
  "/auth/sign-in(.*)",
  "/auth/sign-up(.*)",
  "/onboarding(.*)",
  "/api/stripe/webhook",
  ...CAL_OAUTH_ROUTES,
  "/api/webhooks(.*)",
  "/api/email/subscribe",
  "/api/consent",
  "/api/track",
  "/api/cron(.*)",
  "/api/calendar/feed/(.*)",
]);

const LAUNCHED = process.env.NEXT_PUBLIC_KARMAN_LAUNCHED === "true";

/** Bypass middleware — used only when DEV_AUTH_BYPASS_ACTIVE.
 *  Doesn't call any Clerk APIs, so a placeholder publishable key
 *  in CI doesn't crash the request pipeline. */
function bypassMiddleware(_request: NextRequest) {
  return NextResponse.next();
}

/** The marketing pages. Once launched they need nothing from Clerk on the server, so they skip its
 *  middleware: no handshake redirects for crawlers and link previews, and no auth headers. */
const isMarketingPage = createRouteMatcher([...SITE_PAGES, "/robots.txt", "/sitemap.xml"]);

/** The auth rules: maintenance gate, public routes, then Clerk protection. Exported for the tests. */
export const karmanAuth = async (auth: ClerkMiddlewareAuth, request: NextRequest) => {
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
};

/** Real middleware — Clerk auth + maintenance gate. */
/** Only karmanprep.com may present a Clerk session in production (Clerk's production guide:
 *  authorizedParties guards against session cookies leaking from another subdomain). Local
 *  development keeps Clerk's default so localhost still signs in. */
const AUTHORIZED_PARTIES =
  process.env.NODE_ENV === "production" ? ["https://karmanprep.com"] : undefined;

const realMiddleware = clerkMiddleware(karmanAuth, {
  ...KARMAN_AUTH_ROUTES,
  authorizedParties: AUTHORIZED_PARTIES,
});

/** After launch: one address (www goes to karmanprep.com), the retired coming-soon page goes home,
 *  marketing pages skip Clerk, everything else goes through it. */
function launchedMiddleware(request: NextRequest, event: NextFetchEvent) {
  if (request.headers.get("host") === "www.karmanprep.com") {
    const url = new URL(
      request.nextUrl.pathname + request.nextUrl.search,
      "https://karmanprep.com"
    );
    return NextResponse.redirect(url, 308);
  }
  if (request.nextUrl.pathname === "/coming-soon") {
    return NextResponse.redirect(new URL("/", request.url), 307);
  }
  if (isMarketingPage(request)) return NextResponse.next();
  return realMiddleware(request, event);
}

// Pick at module load — bypass branch skips Clerk's per-request
// publishable-key check entirely. Cannot fire in production.
export default DEV_AUTH_BYPASS_ACTIVE
  ? bypassMiddleware
  : LAUNCHED
    ? launchedMiddleware
    : realMiddleware;

export const config = {
  matcher: [
    // Skip Next.js internals and static assets
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest|mp4)).*)",
    "/(api|trpc)(.*)",
  ],
};
