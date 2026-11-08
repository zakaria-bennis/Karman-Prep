import { notFound } from "next/navigation";
import { CATALOG_SKILLS } from "@/data/curriculum/skill-catalog";
import { PracticeRun } from "@/components/student/run/PracticeRun";
import { demoStudent } from "@/lib/student/demo-student";
import { seededRandom } from "@/lib/student/assemble";
import { deliver, skillQuestions } from "@/lib/student/preview-bank";

export const dynamic = "force-dynamic";
const BASE = "/student-preview";

export default async function SkillPracticePreview({
  params,
}: {
  params: Promise<{ skillId: string }>;
}) {
  const { skillId } = await params;
  const skill = CATALOG_SKILLS.find((s) => s.id === skillId);
  if (!skill) notFound();
  const nowMs = Math.floor(Date.now() / 60_000) * 60_000;
  const rand = seededRandom(nowMs / 60_000);
  // Ten questions spread easy to hard: one random pick from each tenth of the sorted pool.
  const pool = (await skillQuestions(skill.id)).sort(
    (a, b) => a.difficulty_level - b.difficulty_level
  );
  const n = Math.min(10, pool.length);
  const picks = Array.from({ length: n }, (_, i) => {
    const lo = Math.floor((i * pool.length) / n);
    const hi = Math.floor(((i + 1) * pool.length) / n);
    const q = pool[lo + Math.floor(rand() * Math.max(1, hi - lo))];
    return { id: q.id, skillId: skill.id, difficulty: q.difficulty_level };
  });
  const items = await deliver(picks);
  return (
    <PracticeRun
      items={items}
      input={demoStudent(nowMs)}
      nowMs={nowMs}
      base={BASE}
      kind="practice"
      title={skill.label}
      section={skill.domainLabel}
    />
  );
}
