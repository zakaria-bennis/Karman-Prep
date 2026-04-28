// ============================================================
// open-next.config.ts — OpenNext for Cloudflare configuration.
//
// This file controls how OpenNext builds the Next.js app into a
// Cloudflare-deployable artifact under .open-next/. The defaults
// are sensible for our setup; we only override when we want to
// move caches off the in-memory default onto durable storage.
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
