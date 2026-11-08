import { PracticeRun } from "@/components/student/run/PracticeRun";
import { demoStudent } from "@/lib/student/demo-student";
import { buildStudentHome } from "@/lib/student/home-model";
import { assembleDaily } from "@/lib/student/assemble";
import { deliver, sectionPool } from "@/lib/student/preview-bank";

export const dynamic = "force-dynamic";
const BASE = "/student-preview";

export default async function DailyPreview() {
  const nowMs = Math.floor(Date.now() / 60_000) * 60_000;
  const input = demoStudent(nowMs);
  const weak = buildStudentHome(input, nowMs, BASE).weakest.map((k) => k.id);
  const day = Number(new Date(nowMs).toISOString().slice(0, 10).replaceAll("-", ""));
  const [reading, math] = await Promise.all([sectionPool("reading"), sectionPool("math")]);
  const items = await deliver([
    ...assembleDaily(reading, weak, 5, day),
    ...assembleDaily(math, weak, 5, day + 1),
  ]);
  return (
    <PracticeRun
      items={items}
      input={input}
      nowMs={nowMs}
      base={BASE}
      kind="daily"
      title="Your Daily 10"
      section="Your Daily 10"
    />
  );
}
