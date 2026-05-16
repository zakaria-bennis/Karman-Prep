// ============================================================
// Sentry — client-side init.
// Loaded by Next.js automatically on every page.
// DSN is the same one used by the server-side init (sentry.server.config.ts).
//
// Session-replay consent gating:
//   - The "karman_replay_consent" cookie is set by the bottom
//     slide-up banner (src/components/consent/ReplayConsentBanner.tsx)
//     for visitors in EU/EEA/UK + US-CA. Visitors outside those
//     regions never see the banner and replay sampling is governed
//     purely by the rates below.
//   - This init runs in the browser, where we CAN read the cookie
//     via document.cookie. When we flip replay sampling ≥ 0 in the
//     future, gate the integration on a `hasConsent()` helper that
//     reads the cookie + returns false outside regulated regions.
// ============================================================

import * as Sentry from "@sentry/nextjs";

/** True if a non-regulated visitor (no banner shown) OR a regulated
 *  visitor who clicked "Allow". False for regulated visitors before
 *  they answer. Read via document.cookie because this file runs in
 *  the browser. */
function hasReplayConsent(): boolean {
  if (typeof document === "undefined") return false;
  return /(?:^|;\s*)karman_replay_consent=yes(?:;|$)/.test(document.cookie);
}

// Currently replay is OFF everywhere. When we flip it on, swap
// these `0`s for production rates AND keep the consent guard so
// regulated users without consent stay at zero sampling.
const REPLAY_SESSION_RATE = 0;
const REPLAY_ERROR_RATE = 0;

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  // 10% sampling for normal traces; ramp up to 100% temporarily when
  // debugging a specific user-flow regression.
  tracesSampleRate: 0.1,
  // Replay sample rates are explicitly gated on consent so that
  // flipping the rate above doesn't silently capture EU/CA users
  // who haven't opted in.
  replaysSessionSampleRate: hasReplayConsent() ? REPLAY_SESSION_RATE : 0,
  replaysOnErrorSampleRate: hasReplayConsent() ? REPLAY_ERROR_RATE : 0,
  // Don't send PII (Clerk session IDs, etc.) without consent.
  sendDefaultPii: false,
  environment: process.env.NODE_ENV ?? "development",
  // Skip noisy dev-mode errors (HMR, fast-refresh quirks).
  enabled: process.env.NODE_ENV === "production",
});
