import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { isLocalRequest } from "../figure-review/review-data";
import QaQuestion from "./QaQuestion";
import { isQaRenderEnabled, loadQaQuestion } from "./qa-data";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "QA render", robots: { index: false } };

/** Dev-only: one live question in the real catalog question screen, unanswered, for the
 *  live-question QA audit. 404 in production, off this machine, or without QA_RENDER_EXPORT. */
export default async function QaRenderPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  if (!isQaRenderEnabled()) notFound();
  if (!isLocalRequest(await headers())) notFound();
  const { id } = await searchParams;
  const question = id ? await loadQaQuestion(id) : null;
  if (!question) notFound();
  return <QaQuestion question={question} />;
}
