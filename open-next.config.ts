// ============================================================
// open-next.config.ts — OpenNext for Cloudflare configuration.
//
// This file controls how OpenNext builds the Next.js app into a
// Cloudflare-deployable artifact under .open-next/. The defaults
// are sensible for our setup; we only override when we want to
// move caches off the in-memory default onto durable storage.
//
// The marketing pages (src/app/(site)) are built once at build
// time, but no incremental cache can serve them yet: Next 16.3
// asks the cache for keys shaped /route-cache/APP_PAGE/<hash>/$/…
// while OpenNext 1.19.4 stores the prerendered pages under
// <buildId>/<path>.cache, so every adapter (static assets, R2, KV)
// misses and the Worker renders the page (about 60 to 130 ms warm).
// The edge keeps each page for a day (next.config.mjs headers and
// the Cloudflare cache rule), which is what hides a cold Worker.
// Revisit when OpenNext supports those keys.
//
// Future upgrade path:
//   - For ISR-style page caching, swap incrementalCache to the R2
//     adapter (`r2IncrementalCache`) once we have pages we actually
//     want to cache between requests.
//   - For tag-based cache invalidation, add a tagCache adapter.
//   - For edge-revalidation queues, configure a queue adapter.
//
// See https://opennext.js.org/cloudflare for the full options.
// ============================================================

import { defineCloudflareConfig } from "@opennextjs/cloudflare";

export default defineCloudflareConfig({});
