// ============================================================
// Cron observability helper — wraps cron handlers so each
// invocation lands in Sentry with the same metadata shape.
//
// Closes audit M3 — before this, /api/cron/* routes had no
// alerting. A regression that caused, say, retry-failed-emails
// to throw on every 5-min tick would just rack up errors in
// the Cloudflare log without paging anyone.
//
// Each wrapped handler:
//   - Sets the Sentry tag `cron.name` so dashboards/alerts can
//     filter by which cron is misbehaving.
//   - Captures exceptions with the cron name attached.
//   - Sends a Sentry breadcrumb on success with duration_ms.
//
// Alerting rules live in the Sentry UI (e.g. "page when more
// than 3 cron.name:retry-failed-emails errors in 1h"). The code
// only needs to surface the data consistently.
// ============================================================

import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";

export type CronHandler = (request: Request) => Promise<Response>;

/** Wrap a Next.js API route handler with Sentry instrumentation.
 *  `name` should be the URL slug (sync-sat-dates, retry-failed-emails,
 *  cohort-setup-reminder, ingest-csv-inbox). Keep stable — alert
 *  rules key off it.
 *
 *  Pre-existing 401 / unauthorized responses still flow through
 *  unmodified; we don't want Sentry pages for bad-token attempts. */
export function withCronInstrumentation(name: string, handler: CronHandler): CronHandler {
  return async (request: Request) => {
    const start = performance.now();
    Sentry.setTag("cron.name", name);
    try {
      const res = await handler(request);
      const durationMs = Math.round(performance.now() - start);

      // Add a breadcrumb so Sentry's "issue context" includes
      // the cron run when something else fires later.
      Sentry.addBreadcrumb({
        category: "cron",
        message: `${name} → ${res.status}`,
        level: res.status >= 500 ? "error" : "info",
        data: { name, status: res.status, durationMs },
      });

      // Promote 5xx self-reported errors to actual Sentry
      // exceptions — many cron routes return 200 even on
      // partial failure (see audit S14), so a non-zero status
      // is a strong signal we want paged on.
      if (res.status >= 500) {
        Sentry.captureMessage(`cron ${name} returned ${res.status}`, "error");
      }

      return res;
    } catch (err) {
      const durationMs = Math.round(performance.now() - start);
      Sentry.captureException(err, {
        tags: { "cron.name": name },
        extra: { durationMs },
      });
      // Keep returning 200 to the cron dispatcher so it doesn't
      // retry-loop on a broken handler. The Sentry capture above
      // is what pages us.
      return NextResponse.json({ error: "cron_threw", name, durationMs }, { status: 200 });
    }
  };
}
