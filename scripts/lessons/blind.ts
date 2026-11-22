// Prints a lesson's questions WITHOUT their answers, for the second writer who works every answer out
// blind (src/lib/lessons/checks/). Usage: npx tsx scripts/lessons/blind.ts <skill-id>
import { pathToFileURL } from "node:url";
import { join } from "node:path";
import type { Lesson } from "../../src/lib/lessons/types";

const id = process.argv[2];
if (!id) {
  console.error("usage: npx tsx scripts/lessons/blind.ts <skill-id>");
  process.exit(1);
}
async function main(id: string) {
  const file = join(process.cwd(), "src/lib/lessons/skills", `${id}.ts`);
  const lesson = ((await import(pathToFileURL(file).href)) as { default: Lesson }).default;

  const out = {
    id,
    note: "Work out each answer yourself. Examples without choices need their final answer's value.",
    examples: lesson.examples.map((e, i) => ({
      example: i,
      passage: e.passage,
      problem: e.problem,
      choices: e.choices,
    })),
    check: {
      passage: lesson.check.passage,
      problem: lesson.check.text,
      choices: lesson.check.choices,
    },
    quiz: lesson.quiz.map((q, i) => ({
      question: i,
      passage: q.passage,
      problem: q.text,
      choices: q.choices,
    })),
  };
  console.log(JSON.stringify(out, null, 2));
}

void main(id);
