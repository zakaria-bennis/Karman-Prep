// Search and share details for each marketing page: a unique title, description and canonical address,
// and the share picture: the site's own landscape with the Karman name on it (public/site/share.jpg).
import type { Metadata } from "next";

export function pageMeta(path: string, title: string, description: string): Metadata {
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: path },
    openGraph: {
      type: "website",
      siteName: "Karman Prep",
      url: path,
      title,
      description,
      images: [{ url: "/site/share.jpg", width: 1200, height: 630, alt: "Karman Prep" }],
    },
    twitter: { card: "summary_large_image", title, description, images: ["/site/share.jpg"] },
    /* The site draws its own light and dark. "darkreader-lock" tells the Dark Reader extension to leave
       the page alone, and declaring both colour schemes stops a browser's forced dark mode from
       inverting the painting (founder, 2026-11-11). */
    other: { "darkreader-lock": "true", "color-scheme": "light dark" },
  };
}

/** JSON-LD for search engines (design rules, SEO). Our own constant data, so it is safe to inline. */
export function jsonLd(data: object): { __html: string } {
  return { __html: JSON.stringify(data).replace(/</g, "\\u003c") };
}
