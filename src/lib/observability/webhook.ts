// ============================================================
// Webhook observability helper — wraps webhook handlers so each
// invocation lands in Sentry with the same metadata shape.
//
// Mirrors withCronInstrumentation (src/lib/observability/cron.ts)
// but for routes called by external systems (Stripe, Cal, Zoom,
// Slack, Fireflies, etc.). Same payout: a consistent
// `webhook.name` tag so dashboards/alerts can filter by which
// provider is misbehaving.
//
// Why a separate helper from cron's: webhooks have semantically
// different alerting needs (per-provider error rates, signature
// failures distinct from app errors) and the tag namespace keeps
// the Sentry filters clean.
//
// Each wrapped handler:
//   - Sets the Sentry tag `webhook.name` (stable slug — alert
//     rules key off it).
//   - Captures exceptions with the webhook name attached.
//   - Sends a Sentry breadcrumb on success with duration_ms.
//   - Promotes self-reported 5xx to Sentry exceptions (some
//     webhooks return 200 even on partial failure).
//   - Catches handler throws and returns 200 to the provider so
//     it doesn't retry-loop on a broken handler — the Sentry
//     capture is the paging signal.
//
// Alerting rules live in the Sentry UI (e.g. "page when more
// than 5 webhook.name:stripe errors in 15min"). The code only
// needs to surface the data consistently.
// ============================================================

import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";

export type WebhookHandler = (request: Request) => Promise<Response>;

/** Wrap a Next.js webhook handler with Sentry instrumentation.
 *  `name` should be the provider slug (stripe, stripe-connect, cal,
 *  zoom, slack, fireflies-transcript, seminar-overflow). Keep
 *  stable — alert rules key off it.
 *
 *  Pre-existing 401/403 responses from signature-verification
 *  failures still flow through unmodified; we don't want Sentry
 *  pages for invalid-signature attempts (those are noise — providers
 *  occasionally fire with stale secrets after key rotation). */
export function withWebhookInstrumentation(name: string, handler: WebhookHandler): WebhookHandler {
  return async (request: Request) => {
    const start = performance.now();
    Sentry.setTag("webhook.name", name);
    try {
      const res = await handler(request);
      const durationMs = Math.round(performance.now() - start);

      Sentry.addBreadcrumb({
        category: "webhook",
        message: `${name} → ${res.status}`,
        level: res.status >= 500 ? "error" : "info",
        data: { name, status: res.status, durationMs },
      });

      // Promote 5xx self-reported errors to actual Sentry
      // exceptions. A non-zero status from a webhook handler is
      // a strong signal we want paged on — the alternative is
      // accumulating silent 500s in Cloudflare logs.
      if (res.status >= 500) {
        Sentry.captureMessage(`webhook ${name} returned ${res.status}`, "error");
      }

      return res;
    } catch (err) {
      const durationMs = Math.round(performance.now() - start);
      Sentry.captureException(err, {
        tags: { "webhook.name": name },
        extra: { durationMs },
      });
      // Return 200 so the provider doesn't retry-loop on a
      // broken handler. Stripe / Cal / Zoom all retry on
      // non-2xx, and for non-idempotent events a retry could
      // double-process. The Sentry capture above is the page.
      return NextResponse.json({ error: "webhook_threw", name, durationMs }, { status: 200 });
    }
  };
}
