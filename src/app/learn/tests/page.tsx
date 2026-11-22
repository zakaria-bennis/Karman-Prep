// The full-length exams: twenty adaptive exams, opening on Saturdays from 6 am to midnight in the
// student's own time zone (founder, 2026-11-22). Replaces the old list of four practice tests.
import type { Metadata } from "next";
import { FlowStage } from "@/components/quiz-flows/FlowStage";
import { ExamList } from "@/components/learn/exam/ExamList";
import { mayTest } from "@/lib/exams/access";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Full-length exams" };

export default async function TestsPage() {
  return (
    <FlowStage back={{ href: "/dashboard/student?page=library", label: "Library" }}>
      <ExamList canTest={await mayTest()} />
    </FlowStage>
  );
}
