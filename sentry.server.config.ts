// ============================================================
// Sentry — server-side init (Node.js + edge runtimes).
// Loaded via instrumentation.ts on every server start.
// ============================================================

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1,
  sendDefaultPii: false,
  environment: process.env.NODE_ENV ?? "development",
  enabled: process.env.NODE_ENV === "production",
});
