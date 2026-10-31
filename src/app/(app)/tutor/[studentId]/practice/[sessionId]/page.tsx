import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { readEducatorPracticeReview } from "@/lib/educator-briefing/server";
import { BriefingAccessError } from "@/lib/educator-briefing/access";
import { BriefingUnavailable } from "@/components/tutor/briefing/BriefingViews";
import SavedPracticeReview from "@/components/tutor/briefing/SavedPracticeReview";

export const metadata: Metadata = { title: "Review saved practice — Tutor Portal" };
export const dynamic = "force-dynamic";
export default async function EducatorPracticeReviewPage({
  params,
}: {
  params: Promise<{ studentId: string; sessionId: string }>;
}) {
  const { studentId, sessionId } = await params;
  let review: Awaited<ReturnType<typeof readEducatorPracticeReview>> = null;
  let unavailable = false;
  try {
    review = await readEducatorPracticeReview(studentId, sessionId);
  } catch (error) {
    if (error instanceof BriefingAccessError) notFound();
    unavailable = true;
  }
  if (!review && !unavailable) notFound();
  return (
    <section className="mx-auto max-w-4xl space-y-6 px-4 py-8 sm:px-6">
      <Link
        href={`/tutor/${encodeURIComponent(studentId)}/briefing`}
        className="inline-flex min-h-11 items-center text-sm text-info underline"
      >
        Back to practice briefing
      </Link>
      <header>
        <h1 className="text-2xl font-bold text-ivory">Review as student</h1>
        {review && (
          <p className="mt-2 text-sm text-taupe">
            {review.skillLabel} ·{" "}
            {review.completedAt ? "Completed practice" : "Practice in progress"}
          </p>
        )}
      </header>
      {review ? <SavedPracticeReview review={review} /> : <BriefingUnavailable />}
    </section>
  );
}
