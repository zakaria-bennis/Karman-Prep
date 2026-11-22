#!/usr/bin/env tsx
/*
 * Print generated Math questions and the reasons any seed failed, for reading as a tutor would.
 *   npx tsx scripts/generator/math-preview.ts --skill m-circles --show 3 --seeds 500
 *   npx tsx scripts/generator/math-preview.ts --template circ.arc-length --show 5
 * --show N prints the first N questions of each template in full; --seeds N builds N seeds per
 * template and reports how many built, the formats, the difficulties and the top failure reasons.
 */
import { buildItem, isItem } from "@/lib/generator/math/core/build";
import { MATH_TEMPLATES } from "@/lib/generator/math/registry";

const args = process.argv.slice(2);
const arg = (name: string, fallback?: string) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : fallback;
};
const skill = arg("skill");
const only = arg("template");
const show = Number(arg("show", "2"));
const seeds = Number(arg("seeds", "300"));
const from = Number(arg("from", "1"));

const templates = MATH_TEMPLATES.filter(
  (t) => (!skill || t.skill === skill) && (!only || t.id === only)
);
if (!templates.length) {
  console.error("no template matches");
  process.exit(1);
}

for (const t of templates) {
  let built = 0;
  const formats: Record<string, number> = {};
  const difficulty: Record<number, number> = {};
  const reasons = new Map<string, number>();
  const stems = new Set<string>();
  for (let seed = from; seed < from + seeds; seed++) {
    const r = buildItem(t, seed);
    if (!isItem(r)) {
      for (const x of r.reasons.slice(-3)) {
        const k = x.replace(/^attempt \d+: /, "").slice(0, 160);
        reasons.set(k, (reasons.get(k) ?? 0) + 1);
      }
      continue;
    }
    built++;
    stems.add(r.stem + r.choices.map((c) => c.text).join("|"));
    formats[r.format] = (formats[r.format] ?? 0) + 1;
    difficulty[r.difficulty] = (difficulty[r.difficulty] ?? 0) + 1;
    if (built <= show) {
      console.log(
        `\n===== ${t.id}  seed ${seed}  ${r.format}  key ${r.key}  difficulty ${r.difficulty}`
      );
      console.log(r.stem);
      if (r.figure)
        console.log(`[figure: ${r.figure.type}, ${JSON.stringify(r.figure).length} bytes]`);
      for (const c of r.choices)
        console.log(`${c.letter}) ${c.text}${c.correct ? "   <- right" : ""}`);
      console.log(`--- hint: ${r.hint}`);
      console.log(r.explanation);
    }
  }
  console.log(
    `\n## ${t.id} (${t.skill}): built ${built}/${seeds}, distinct ${stems.size}, formats ${JSON.stringify(formats)}, difficulty ${JSON.stringify(difficulty)}`
  );
  for (const [k, v] of [...reasons.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6)) {
    console.log(`   ${v} x ${k}`);
  }
}
