/*
 * Which sub-skill a question belongs to, from the stored map (src/data/curriculum/
 * sub-skill-map.json, built offline by scripts/subskills/build-map.ts from the bank, read only).
 * A question that isn't in the map yet (published after the map was built) goes to its catalog
 * skill's catch-all sub-skill, so it still counts and is still served.
 * Server only: the map is about 150 KB.
 */
import "server-only";
import map from "@/data/curriculum/sub-skill-map.json";
import { fallbackSubSkill, getSubSkill } from "./taxonomy";

const PREFIX = map.prefix;
let byQuestion: Map<string, string> | null = null;
let counts: Map<string, number> | null = null;

function index() {
  if (byQuestion) return byQuestion;
  byQuestion = new Map();
  counts = new Map();
  for (const [sub, list] of Object.entries(map.subSkills as Record<string, string>)) {
    const ids = list ? list.split(" ") : [];
    counts.set(sub, ids.length);
    for (const p of ids) byQuestion.set(p, sub);
  }
  return byQuestion;
}

/** The sub-skill of a question in a catalog skill. Never throws. */
export function subSkillOfQuestion(questionId: string, skillId: string): string {
  const found = index().get(questionId.slice(0, PREFIX));
  if (found && getSubSkill(found)?.skillId === skillId) return found;
  return fallbackSubSkill(skillId);
}

/** How many live questions each sub-skill had when the map was built. */
export function subSkillQuestionCount(subSkillId: string): number {
  index();
  return counts?.get(subSkillId) ?? 0;
}
