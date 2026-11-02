// Search and share details for each marketing page: a unique title, description and canonical address,
// and the opening frame of the home film as the share image.
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
      images: [{ url: "/site/film/day.jpg", width: 1440, height: 810, alt: "Karman Prep" }],
    },
    twitter: { card: "summary_large_image", title, description, images: ["/site/film/day.jpg"] },
  };
}

/** JSON-LD for search engines (design rules, SEO). Our own constant data, so it is safe to inline. */
export function jsonLd(data: object): { __html: string } {
  return { __html: JSON.stringify(data).replace(/</g, "\\u003c") };
}
