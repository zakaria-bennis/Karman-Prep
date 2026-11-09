import { SITE_PAGES } from "@/components/site/routes";

// The public marketing pages that sitemap.xml lists (docs/design-rules.md, SEO requirements).
// Every path here is public in src/middleware.ts; portals, admin, auth and API routes stay out.

export const PUBLIC_SITEMAP_PATHS = [...SITE_PAGES, "/calculator"] as const;

/** The site origin for absolute sitemap and robots URLs, without a trailing slash. */
export function siteOrigin(): string {
  return (process.env.NEXT_PUBLIC_APP_URL ?? "https://karmanprep.com").replace(/\/+$/, "");
}
