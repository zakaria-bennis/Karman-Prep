// ============================================================
// Sentry — client-side init.
// Loaded by Next.js automatically on every page.
// DSN is the same one used by the server-side init (sentry.server.config.ts).
// ============================================================

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  // 10% sampling for normal traces; ramp up to 100% temporarily when
  // debugging a specific user-flow regression.
  tracesSampleRate: 0.1,
  // Capture errors only — replay sessions are off by default
  // (paid feature on free tier; we'll opt in if/when needed).
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 0,
  // Don't send PII (Clerk session IDs, etc.) without consent.
  sendDefaultPii: false,
  environment: process.env.NODE_ENV ?? "development",
  // Skip noisy dev-mode errors (HMR, fast-refresh quirks).
  enabled: process.env.NODE_ENV === "production",
});
