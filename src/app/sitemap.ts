// sitemap.xml from the public marketing pages in src/lib/marketing/public-pages.ts.

import type { MetadataRoute } from "next";
import { PUBLIC_SITEMAP_PATHS, siteOrigin } from "@/lib/marketing/public-pages";

export default function sitemap(): MetadataRoute.Sitemap {
  const origin = siteOrigin();
  return PUBLIC_SITEMAP_PATHS.map((path) => ({ url: origin + path }));
}
