/*
 * Server reads of the bank's 72-skill tags (see ./skills72.ts). A failed read returns an empty map,
 * so callers fall back to what they showed before.
 */
import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { countsByName, skillNamesByQuestion, type Skill72Count, type Skill72Tag } from "./skills72";

/** Live questions behind each of the 72, by skill name (the skill72_live_counts view). */
export async function loadSkill72Counts(db: SupabaseClient): Promise<Map<string, number>> {
  try {
    const { data, error } = await db.from("skill72_live_counts").select("skill_id, questions");
    return error || !data ? new Map() : countsByName(data as Skill72Count[]);
  } catch {
    return new Map();
  }
}

/** The skill name of each of these questions that has a tag (read 200 at a time). */
export async function loadSkill72OfQuestions(
  db: SupabaseClient,
  questionIds: readonly string[]
): Promise<Map<string, string>> {
  const rows: Skill72Tag[] = [];
  const ids = [...new Set(questionIds)];
  for (let i = 0; i < ids.length; i += 200) {
    try {
      const { data, error } = await db
        .from("question_skills72")
        .select("question_id, skill_id")
        .in("question_id", ids.slice(i, i + 200));
      if (!error && data) rows.push(...(data as Skill72Tag[]));
    } catch {
      // keep what was read
    }
  }
  return skillNamesByQuestion(rows);
}
