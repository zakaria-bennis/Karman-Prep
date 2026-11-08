import { StudentHome } from "@/components/student/StudentHome";
import { demoStudent } from "@/lib/student/demo-student";
import { sectionPool } from "@/lib/student/preview-bank";

export const dynamic = "force-dynamic";

export default function StudentPreviewHome() {
  const nowMs = Math.floor(Date.now() / 60_000) * 60_000;
  // Warm the read-only bank cache so the first run opens quickly. Not awaited.
  void sectionPool("math").catch(() => undefined);
  void sectionPool("reading").catch(() => undefined);
  return <StudentHome input={demoStudent(nowMs)} nowMs={nowMs} base="/student-preview" />;
}
