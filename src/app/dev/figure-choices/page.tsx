// ============================================================
// /dev/figure-choices: a dev-only fixture page for figure answer choices.
// Renders made-up graph, chart and shape choices through the real
// CatalogQuestion so tests/visual/figures.spec.ts can check the phone, tablet
// and laptop layouts in light and dark without signing in or seeded data.
// Production builds return 404 (NODE_ENV is fixed at build time).
// ============================================================

import { notFound } from "next/navigation";
import type { Metadata } from "next";
import FigureChoicesFixtures from "./FigureChoicesFixtures";

export const metadata: Metadata = {
  title: "Figure choices (dev)",
  robots: { index: false, follow: false },
};

export default function FigureChoicesDevPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <FigureChoicesFixtures />;
}
