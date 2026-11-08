import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { isLocalRequest } from "../../figure-review/review-data";
import { isExamPreviewEnabled, loadExam } from "../exam-data";
import ExamPreviewClient from "../ExamPreviewClient";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Exam preview", robots: { index: false } };

/** Dev-only: the founder takes a captured exam like a student, before it is in the database.
 *  404 in production and to anything but this machine. */
export default async function ExamPreviewPage({ params }: { params: Promise<{ examId: string }> }) {
  if (!isExamPreviewEnabled()) notFound();
  if (!isLocalRequest(await headers())) notFound();
  const exam = await loadExam((await params).examId);
  if (!exam) notFound();
  return <ExamPreviewClient exam={exam} />;
}
