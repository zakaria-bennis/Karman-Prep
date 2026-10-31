import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { readStudentBriefing } from "@/lib/educator-briefing/server";
import { BriefingAccessError } from "@/lib/educator-briefing/access";
import {
  BriefingUnavailable,
  StudentBriefingView,
} from "@/components/tutor/briefing/BriefingViews";

export const metadata: Metadata = { title: "Practice briefing — Tutor Portal" };
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
    <section className="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-6">
      <Link
        href="/tutor/briefing"
        className="inline-flex min-h-11 items-center text-sm text-info underline"
      >
        Daily briefing
      </Link>
      <header>
        <h1 className="text-2xl font-bold text-ivory">Saved practice briefing</h1>
        {briefing && <p className="mt-2 break-words text-sm text-taupe">{briefing.studentEmail}</p>}
      </header>
      {briefing ? <StudentBriefingView briefing={briefing} /> : <BriefingUnavailable />}
    </section>
  );
}
