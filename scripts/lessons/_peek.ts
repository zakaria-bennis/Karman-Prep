import type { Lesson } from "../../src/lib/lessons/types";
async function main() {
  for (const id of process.argv.slice(2)) {
    const l: Lesson = (await import(`../../src/lib/lessons/skills/${id}.ts`)).default;
    console.log(`\n## ${id}  traps: ${l.traps.map((t) => t.name).join(" | ")}`);
    l.examples.forEach((e, i) => {
      console.log(`EX${i}: ${e.title}`);
      if (e.passage) console.log(`  P: ${e.passage}`);
      console.log(`  Q: ${e.problem}`);
      e.choices?.forEach((c, k) => console.log(`  ${k === e.right ? "*" : " "}${k}: ${c}`));
    });
  }
}
void main();
