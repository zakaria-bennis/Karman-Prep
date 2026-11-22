/*
 * The question bank's real 72-skill tags (question_skills72, written by the Bank stream on
 * 2026-11-22: two independent classifiers per question, a judge when they disagreed), read for the
 * portal. Pure helpers, safe anywhere; the database reads are in ./skills72-read.ts.
 */
import { SKILLS72, skill72 } from "@/lib/skills/ids72";

export type Skill72Tag = { question_id: string; skill_id: string };
export type Skill72Count = { skill_id: string; questions: number };

const ID_OF_NAME = new Map(SKILLS72.map((s) => [s.name, s.id]));

/** The skill ID behind one of the Library's skill names, or null. */
export const skill72IdOfName = (name: string): string | null => ID_OF_NAME.get(name) ?? null;

/** Live questions per skill, by the Library's skill names; unknown IDs are dropped. */
export function countsByName(rows: readonly Skill72Count[]): Map<string, number> {
  const out = new Map<string, number>();
  for (const r of rows) {
    const name = skill72(r.skill_id)?.name;
    if (name && Number.isFinite(r.questions)) out.set(name, (out.get(name) ?? 0) + r.questions);
  }
  return out;
}

/** Which of the 72 (by name) each tagged question belongs to; unknown IDs are dropped. */
export function skillNamesByQuestion(rows: readonly Skill72Tag[]): Map<string, string> {
  const out = new Map<string, string>();
  for (const r of rows) {
    const name = skill72(r.skill_id)?.name;
    if (name) out.set(r.question_id, name);
  }
  return out;
}
