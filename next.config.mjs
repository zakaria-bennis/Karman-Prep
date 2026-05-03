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

export default nextConfig;
