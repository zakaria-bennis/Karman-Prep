import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import QuizPane from "../QuizPane";
import { isFigureReviewEnabled, isLocalRequest, loadItem } from "../review-data";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Figure render", robots: { index: false } };

/** Dev-only: only the quiz render of one queued figure, for `k figures snapshot`. 404 in production. */
export default async function FigureRenderPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  if (!isFigureReviewEnabled()) notFound();
  if (!isLocalRequest(await headers())) notFound();
  const { id } = await searchParams;
  const item = id ? await loadItem(id) : null;
  if (!item) notFound();
  return (
    <div id="figure-render" className="w-[1280px]">
      <QuizPane q={item.question} />
    </div>
  );
}
