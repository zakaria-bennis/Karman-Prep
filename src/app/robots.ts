// robots.txt: public pages are indexable; portals, admin, auth and API routes are not.

import type { MetadataRoute } from "next";
import { siteOrigin } from "@/lib/marketing/public-pages";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/admin",
        "/api/",
        "/auth/",
        "/billing",
        "/dashboard",
        "/diagnostic",
        "/learn",
        "/onboarding",
        "/tutor",
      ],
    },
    sitemap: `${siteOrigin()}/sitemap.xml`,
  };
}
