import { TestRunner, type TestModule } from "@/components/student/run/TestRunner";
import { assembleModule } from "@/lib/student/assemble";
import { deliver, sectionPool } from "@/lib/student/preview-bank";
import { CB_MODULE } from "@/lib/student/time-trial";
import { demoStudent } from "@/lib/student/demo-student";

export const dynamic = "force-dynamic";

export default async function TestRunPreview({
  searchParams,
}: {
  searchParams: Promise<{ a?: string }>;
}) {
  const { a } = await searchParams;
  const seed = Math.floor(Date.now() / 60_000);
  const [reading, math] = await Promise.all([sectionPool("reading"), sectionPool("math")]);
  const plan = [
    {
      id: "rw1",
      title: "Reading and Writing, Module 1",
      section: "reading" as const,
      pool: reading,
    },
    {
      id: "rw2",
      title: "Reading and Writing, Module 2",
      section: "reading" as const,
      pool: reading,
    },
    { id: "m1", title: "Math, Module 1", section: "math" as const, pool: math },
    { id: "m2", title: "Math, Module 2", section: "math" as const, pool: math },
  ];
  const used = new Set<string>();
  const modules: TestModule[] = [];
  for (const [i, p] of plan.entries()) {
    const picks = assembleModule(p.section, p.pool, CB_MODULE[p.section].questions, seed + i, used);
    picks.forEach((x) => used.add(x.id));
    modules.push({ id: p.id, title: p.title, section: p.section, items: await deliver(picks) });
  }
  return (
    <TestRunner
      modules={modules}
      accommodation="standard"
      base="/student-preview"
      input={demoStudent(seed * 60_000)}
      assignmentId={a ?? null}
    />
  );
}
