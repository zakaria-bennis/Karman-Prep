// ============================================================
// Dev-only auth bypass — pretend to be a real user without
// actually going through Clerk's sign-in flow.
//
// PROBLEM: every user-facing page is gated by Clerk auth, so
// any local visual smoke test bounces to /auth/sign-in. The
// developer (or an automated harness) can't see what real
// users see without typing real credentials.
//
// SOLUTION: in development only, if the env var
// DEV_IMPERSONATE_CLERK_ID is set, `safeAuth()` returns a
// synthetic Clerk auth result with that clerk_id. Every page
// downstream is none the wiser.
//
// SAFETY:
//   - Honored ONLY when NODE_ENV !== "production". The check
//     happens here in code; even if someone leaked the env var
//     to a prod Cloudflare Worker, this branch can't fire.
//   - Honored ONLY when the env var has a non-empty value. An
//     empty/unset value falls through to real Clerk.
//   - safeAuth() is intentionally a thin wrapper around
//     `@clerk/nextjs/server`'s auth() so call sites can swap
//     1:1 without other changes.
//
// USAGE: in .env.local set
//   DEV_IMPERSONATE_CLERK_ID=user_2abc123... (any real Clerk
//                                              id from your DB)
// Restart `npm run dev:next`. Every page now renders as that
// user. Unset / clear the var to go back to normal Clerk auth.
// ============================================================

import { auth } from "@clerk/nextjs/server";

const DEV_IMPERSONATE_ENV = "DEV_IMPERSONATE_CLERK_ID";

/** True when the dev bypass is active for the current process. */
export function isDevAuthBypassActive(): boolean {
  return (
    process.env.NODE_ENV !== "production" && (process.env[DEV_IMPERSONATE_ENV] ?? "").length > 0
  );
}

/** Clerk id the bypass should pretend to be, or null when off. */
export function devBypassClerkId(): string | null {
  if (!isDevAuthBypassActive()) return null;
  return process.env[DEV_IMPERSONATE_ENV] ?? null;
}

/** Drop-in replacement for `auth()` from `@clerk/nextjs/server`.
 *  In production, identical to Clerk's auth(). In development
 *  with `DEV_IMPERSONATE_CLERK_ID` set, returns a synthetic
 *  auth result so the page renders as that user. */
export async function safeAuth(): Promise<{ userId: string | null }> {
  const overrideId = devBypassClerkId();
  if (overrideId) {
    return { userId: overrideId };
  }
  const real = await auth();
  return { userId: real.userId };
}
