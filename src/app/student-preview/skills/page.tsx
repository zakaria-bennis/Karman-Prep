import { SkillsPage } from "@/components/student/SkillsPage";
import { demoStudent } from "@/lib/student/demo-student";

export const dynamic = "force-dynamic";

export default function SkillsPreview() {
  const nowMs = Math.floor(Date.now() / 60_000) * 60_000;
  return <SkillsPage input={demoStudent(nowMs)} nowMs={nowMs} base="/student-preview" />;
}
