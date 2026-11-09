import type { Metadata } from "next";
import { Card, MoreLink, SectionHeader } from "@/components/portal";
import { notFound } from "next/navigation";
import { readStudentBriefing } from "@/lib/educator-briefing/server";
import { BriefingAccessError } from "@/lib/educator-briefing/access";
import {
  BriefingUnavailable,
  StudentBriefingView,
} from "@/components/tutor/briefing/BriefingViews";

export const metadata: Metadata = { title: "Practice briefing" };
export const dynamic = "force-dynamic";
export default async function StudentBriefingPage({
  params,
}: {
  params: Promise<{ studentId: string }>;
}) {
  const { studentId } = await params;
  let briefing: Awaited<ReturnType<typeof readStudentBriefing>> = null;
  let unavailable = false;
  try {
    briefing = await readStudentBriefing(studentId);
  } catch (error) {
    if (error instanceof BriefingAccessError) notFound();
    unavailable = true;
  }
  if (!briefing && !unavailable) notFound();
  return (
    <Card>
      <SectionHeader title="Saved practice" note={briefing?.studentEmail} />
      {briefing ? <StudentBriefingView briefing={briefing} /> : <BriefingUnavailable />}
      <MoreLink href="/tutor/briefing">Daily briefing</MoreLink>
    </Card>
  );
}
