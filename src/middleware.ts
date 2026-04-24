// ============================================================
// Clerk middleware — protects platform routes
// Public routes: landing page, auth pages, API webhooks
// Protected routes: /dashboard/*, /diagnostic, /billing, etc.
// ============================================================

import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

/** Routes that do NOT require authentication */
const isPublicRoute = createRouteMatcher([
  "/",                         // Landing page
  "/faq",                      // FAQ page
  "/about",                    // About page
  "/blog(.*)",                 // Blog
  "/guarantee",                // Score guarantee terms
  "/privacy",                  // Privacy policy
  "/terms",                    // Terms of service
  "/refunds",                  // Refund policy
  "/auth/sign-in(.*)",
  "/auth/sign-up(.*)",
  "/onboarding(.*)",
  "/api/stripe/webhook",       // Stripe webhooks bypass auth
  "/api/email/subscribe",      // Email capture
  "/api/diagnostic/sample",    // Sample quiz (no account needed)
  "/api/cron(.*)",             // Vercel Cron — routes self-auth via CRON_SECRET header
]);

export default clerkMiddleware(async (auth, request) => {
  // Allow public routes without auth check
  if (isPublicRoute(request)) {
    return NextResponse.next();
  }

  // Require authentication for all other routes
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
