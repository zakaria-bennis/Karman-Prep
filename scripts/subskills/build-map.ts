/*
 * Builds src/data/curriculum/sub-skill-map.json: which sub-skill each live question belongs to.
 * Read only: it takes the export from scripts/subskills/export-questions.sh (the local database)
 * and the rules in src/lib/subskills/rules.ts. It never writes to a database.
 *   scripts/subskills/export-questions.sh > /tmp/questions.json
 *   npx tsx scripts/subskills/build-map.ts /tmp/questions.json [--tally]
 * Questions are stored by their first 13 characters (unique across the bank; checked here).
 */
import { readFileSync, writeFileSync } from "node:fs";
import { subSkillKey, type SubSkillQuestion } from "../../src/lib/subskills/rules";
import { SUB_SKILLS, subSkillId, subSkillsOfSkill } from "../../src/lib/subskills/taxonomy";

interface Row extends SubSkillQuestion {
  id: string;
  skill: string;
  passage?: string;
}

const [file, flag] = process.argv.slice(2);
if (!file) throw new Error("usage: build-map.ts <questions.json> [--tally]");
const rows = JSON.parse(readFileSync(file, "utf8")) as Row[];
export const PREFIX = 13;

const groups = new Map<string, string[]>(SUB_SKILLS.map((s) => [s.id, []]));
const prefixes = new Set<string>();
for (const r of rows) {
  const key = subSkillKey(r.skill, {
    text: `${r.text} ${r.passage ?? ""}`,
    correct: r.correct,
    figure: r.figure,
  });
  const single = subSkillsOfSkill(r.skill).length === 1;
  const id = subSkillId(r.skill, key, single);
  const list = groups.get(id);
  if (!list) throw new Error(`unknown sub-skill ${id}`);
  const p = r.id.slice(0, PREFIX);
  if (prefixes.has(p)) throw new Error(`question id prefix ${p} is not unique`);
  prefixes.add(p);
  list.push(p);
}

if (flag === "--tally") {
  for (const s of SUB_SKILLS)
    console.log(
      String(groups.get(s.id)!.length).padStart(5),
      s.officialLabel.slice(0, 28).padEnd(28),
      s.label
    );
  console.log(SUB_SKILLS.length, "sub-skills,", rows.length, "questions");
} else {
  const out: Record<string, string> = {};
  for (const [id, list] of groups) out[id] = list.sort().join(" ");
  writeFileSync(
    "src/data/curriculum/sub-skill-map.json",
    JSON.stringify({ prefix: PREFIX, questions: rows.length, subSkills: out }, null, 2) + "\n"
  );
  console.log(`wrote ${SUB_SKILLS.length} sub-skills, ${rows.length} questions`);
}
