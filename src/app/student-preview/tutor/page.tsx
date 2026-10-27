import { TutorUnlocks } from "@/components/student/TutorUnlocks";
import { demoStudent } from "@/lib/student/demo-student";

export const dynamic = "force-dynamic";

export default function TutorPreview() {
  const nowMs = Math.floor(Date.now() / 60_000) * 60_000;
  return <TutorUnlocks input={demoStudent(nowMs)} nowMs={nowMs} base="/student-preview" />;
}
