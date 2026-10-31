// ============================================================
// /dev/figure-render: a dev-only page that draws one FigureSpec, or one set
// of figure answer choices, through the real CatalogQuestion, so
// scripts/figures/render-all.ts can check every figure at phone, tablet and
// laptop widths in light and dark without signing in or seeded data.
//
// The figure comes from window.__FIGURE_RENDER__ (set by the render script
// before the page loads; specs with samples are too large for a URL), or from
// ?spec=<base64url JSON> for a quick look at a small spec.
// Production builds return 404 (NODE_ENV is fixed at build time).
// ============================================================

import { notFound } from "next/navigation";
import type { Metadata } from "next";
import FigureRender from "./FigureRender";

export const metadata: Metadata = {
  title: "Figure render (dev)",
  robots: { index: false, follow: false },
};

export default function FigureRenderDevPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <FigureRender />;
}
