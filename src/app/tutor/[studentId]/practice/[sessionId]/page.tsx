import type { Metadata } from "next";
import { Card, MoreLink, SectionHeader } from "@/components/portal";
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
    <Card>
      <SectionHeader
        title="Review as student"
        note={
          review
            ? `${review.skillLabel}, ${review.completedAt ? "completed" : "in progress"}`
            : undefined
        }
      />
      {review ? <SavedPracticeReview review={review} /> : <BriefingUnavailable />}
      <MoreLink href={`/tutor/${encodeURIComponent(studentId)}/briefing`}>
        Back to practice briefing
      </MoreLink>
    </Card>
  );
}
