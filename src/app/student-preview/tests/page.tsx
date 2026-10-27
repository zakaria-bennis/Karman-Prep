import { TestsPage } from "@/components/student/TestsPage";
import { demoStudent } from "@/lib/student/demo-student";

export const dynamic = "force-dynamic";

export default function TestsPreview() {
  const nowMs = Math.floor(Date.now() / 60_000) * 60_000;
  return <TestsPage input={demoStudent(nowMs)} nowMs={nowMs} base="/student-preview" />;
}
