import { TrialSetup } from "@/components/student/TrialSetup";
import { demoStudent } from "@/lib/student/demo-student";

export const dynamic = "force-dynamic";

export default function TimeTrialPreview() {
  const nowMs = Math.floor(Date.now() / 60_000) * 60_000;
  return <TrialSetup input={demoStudent(nowMs)} nowMs={nowMs} base="/student-preview" />;
}
