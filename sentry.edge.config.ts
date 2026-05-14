// ============================================================
// Sentry — edge runtime init (middleware, edge API routes).
// Loaded via instrumentation.ts when EDGE_RUNTIME is detected.
// ============================================================

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1,
  sendDefaultPii: false,
  environment: process.env.NODE_ENV ?? "development",
  enabled: process.env.NODE_ENV === "production",
});
