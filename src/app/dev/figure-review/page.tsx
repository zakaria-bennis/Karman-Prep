import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import FigureReviewClient from "./FigureReviewClient";
import { isFigureReviewEnabled, isLocalRequest, loadQueue } from "./review-data";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Figure review", robots: { index: false } };

/** Dev-only: the founder checks every rebuilt figure against its source. 404 in production. */
export default async function FigureReviewPage() {
  if (!isFigureReviewEnabled()) notFound();
  if (!isLocalRequest(await headers())) notFound();
  return <FigureReviewClient initial={await loadQueue()} />;
}
