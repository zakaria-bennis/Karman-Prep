import { TrialRunner } from "@/components/student/run/TrialRunner";
import { demoStudent } from "@/lib/student/demo-student";
import { assembleModule } from "@/lib/student/assemble";
import { deliver, sectionPool } from "@/lib/student/preview-bank";
import { CB_MODULE, type TrialSection } from "@/lib/student/time-trial";

export const dynamic = "force-dynamic";
const BASE = "/student-preview";

export default async function TrialRunPreview({
  searchParams,
}: {
  searchParams: Promise<{ section?: string; seed?: string; a?: string }>;
}) {
  const q = await searchParams;
  const section: TrialSection = q.section === "reading" ? "reading" : "math";
  const nowMs = Math.floor(Date.now() / 60_000) * 60_000;
  const seed = Number(q.seed) || nowMs / 60_000;
  const pool = await sectionPool(section);
  const items = await deliver(assembleModule(section, pool, CB_MODULE[section].questions, seed));
  return (
    <TrialRunner
      items={items}
      input={demoStudent(nowMs)}
      section={section}
      base={BASE}
      assignmentId={q.a ?? null}
    />
  );
}
