#!/usr/bin/env tsx
/*
 * The Math generator's per-template checks for one skill file, without the shared registry
 * (so one unfinished skill never blocks checking another). Same checks as
 * src/lib/generator/math/math-generator.test.ts.
 *   npx tsx scripts/generator/math-check-file.ts src/lib/generator/math/skills/circles.ts [seeds] [show]
 */
import { resolve } from "node:path";
import { parseNumericAnswer } from "@/lib/numeric-answer";
import { buildItem, isItem } from "@/lib/generator/math/core/build";
import { renderIssues } from "@/lib/generator/math/core/render";
import type { MathItem, Template } from "@/lib/generator/math/core/types";

function recheck(item: MathItem): string[] {
  const out: string[] = [];
  if (item.format === "mc") {
    if (item.choices.length !== 4) out.push("not four choices");
    if (item.choices.filter((c) => c.correct).length !== 1)
      out.push("not exactly one right choice");
    if (new Set(item.choices.map((c) => c.text.replace(/\s+/g, ""))).size !== 4)
      out.push("two choices read the same");
    for (const c of item.choices)
      if (!c.correct && !item.explanation.includes(c.text))
        out.push(`wrong choice ${c.text} not explained`);
  } else if (parseNumericAnswer(item.key) === null) out.push(`key ${item.key} does not parse`);
  for (const part of ["What it asks:", "\n1. ", "Check:", "Tip:"])
    if (!item.explanation.includes(part)) out.push(`lacks ${part.trim()}`);
  for (const t of [item.stem, item.explanation, item.hint, ...item.choices.map((c) => c.text)]) {
    for (const i of renderIssues(t)) out.push(`${i.problem}: ${i.text}`);
  }
  if (item.hint.length > 220) out.push("hint too long");
  return out;
}

async function main() {
  const [file, seedsArg, showArg] = process.argv.slice(2);
  const seeds = Number(seedsArg ?? 1000);
  const show = Number(showArg ?? 0);
  const mod = (await import(resolve(file))) as { TEMPLATES: Template[] };
  let bad = 0;
  for (const t of mod.TEMPLATES) {
    let built = 0;
    const stems = new Set<string>();
    const problems: string[] = [];
    const failed: string[] = [];
    for (let seed = 1; seed <= seeds; seed++) {
      const r = buildItem(t, seed);
      if (!isItem(r)) {
        failed.push(`seed ${seed}: ${r.reasons.slice(-1)[0] ?? "drew again every time"}`);
        continue;
      }
      built++;
      stems.add(r.stem + r.choices.map((c) => c.text).join("|") + JSON.stringify(r.figure));
      if (r.difficulty < t.difficulty[0] || r.difficulty > t.difficulty[1])
        problems.push(`seed ${seed}: difficulty ${r.difficulty}`);
      problems.push(...recheck(r).map((p) => `seed ${seed}: ${p}`));
      if (built <= show) {
        console.log(
          `\n===== ${t.id} seed ${seed} ${r.format} key ${r.key} d${r.difficulty}\n${r.stem}`
        );
        for (const c of r.choices)
          console.log(`${c.letter}) ${c.text}${c.correct ? "  <- right" : ""}`);
        console.log(`hint: ${r.hint}\n${r.explanation}`);
      }
    }
    const det = JSON.stringify(buildItem(t, 7)) === JSON.stringify(buildItem(t, 7));
    const ok =
      built / seeds >= 0.97 &&
      problems.length === 0 &&
      stems.size / Math.max(1, built) >= 0.9 &&
      det;
    if (!ok) bad++;
    console.log(
      `${ok ? "PASS" : "FAIL"} ${t.id}: built ${built}/${seeds}, distinct ${(stems.size / Math.max(1, built)).toFixed(3)}, deterministic ${det}${problems.length ? `, ${problems.length} problems e.g. ${problems[0]}` : ""}${built / seeds < 0.97 ? `, e.g. ${failed[0]}` : ""}`
    );
  }
  process.exit(bad ? 1 : 0);
}
main();
