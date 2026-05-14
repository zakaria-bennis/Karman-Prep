import { withSentryConfig } from "@sentry/nextjs";

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Cloudflare Workers (via OpenNext) needs the Node.js runtime
  // compatibility flag — set in wrangler.toml.
  // See: https://opennext.js.org/cloudflare/get-started
  experimental: {
    serverActions: {
      // Default is 1 MB. Bulk question imports send a parsed CSV in
      // the request body; when figures are inlined as base64 data
      // URLs (~190 KB per image), a typical SAT PDF's CSV runs
      // 3–5 MB. 25 MB gives us plenty of headroom for the worst
      // PDFs and is well under Cloudflare Workers' request body cap.
      bodySizeLimit: "25mb",
    },
  },
  images: {
    // CF Workers don't run the default Next.js Image Optimization API;
    // serve images unoptimized (R2-hosted images are already PNG/WebP).
    // We can swap to a CF Image Resizing later if we want on-the-fly
    // transforms, but for static figure cards this is fine.
    unoptimized: true,
    remotePatterns: [
      { protocol: "https", hostname: "**.r2.dev" },
      { protocol: "https", hostname: "**.r2.cloudflarestorage.com" },
      // Optional R2 custom domain (e.g. images.karmanprep.com)
      { protocol: "https", hostname: "images.karmanprep.com" },
      // Legacy Supabase Storage bucket — keep until migration is done.
      { protocol: "https", hostname: "**.supabase.co" },
      // Clerk avatar host — mirrored into users.avatar_url via the
      // sync-user route. Verified via prod DB: 100% of stored
      // avatar_url hostnames are img.clerk.com.
      { protocol: "https", hostname: "img.clerk.com" },
    ],
  },
};

// Conditionally activate the OpenNext dev tooling so local `next dev`
// behaves identically to production. Only loaded in dev to avoid
// affecting build performance.
if (process.env.NODE_ENV === "development") {
  await import("@opennextjs/cloudflare/init")
    .then((m) => m.initOpenNextCloudflareForDev?.())
    .catch(() => {});
}

// Wrap with Sentry to enable runtime error capture + source-map upload.
// Source-map upload requires SENTRY_AUTH_TOKEN — if absent (e.g. local dev,
// CI without secrets), the Sentry plugin skips upload but still wires up
// runtime error capture via the sentry.*.config.ts files + instrumentation.ts.
export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  silent: !process.env.CI,
  widenClientFileUpload: true,
  hideSourceMaps: true,
  // Disable telemetry to Sentry about the Sentry plugin itself
  telemetry: false,
});
