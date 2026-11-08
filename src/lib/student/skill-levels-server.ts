/*
 * Reads a student's saved practice answers and turns them into skill levels with
 * `levels.ts`. Source: catalog practice (catalog_practice_sessions + catalog_practice_responses),
 * which is what skill practice, Domain quizzes and check-ins write. The older lesson map
 * (learn_node_status) is keyed by legacy node ids, not catalog skills, so it is not mapped.
 */
import "server-only";
import { createAdminClient } from "@/lib/supabase/server";
import { levelFromAnswers, type LevelAnswer, type SkillLevel } from "./levels";

export interface SkillAnswer extends LevelAnswer {
  skillId: string;
  seconds: number;
  sessionId: string;
}

type SessionRow = { id: string; skill_id: string };
type ResponseRow = {
  session_id: string;
  is_correct: boolean;
  answered_at: string;
  response_time_seconds: number;
};

/** Every saved catalog practice answer for a student (Clerk id), oldest first. */
export async function loadSkillAnswers(clerkId: string): Promise<SkillAnswer[]> {
  const db = createAdminClient();
  const { data: sessions, error } = await db
    .from("catalog_practice_sessions")
    .select("id, skill_id")
    .eq("student_id", clerkId)
    .limit(2000);
  if (error || !sessions?.length) return [];
  const bySession = new Map((sessions as SessionRow[]).map((s) => [s.id, s.skill_id]));
  const ids = [...bySession.keys()];
  const rows: ResponseRow[] = [];
  for (let i = 0; i < ids.length; i += 200) {
    const { data } = await db
      .from("catalog_practice_responses")
      .select("session_id, is_correct, answered_at, response_time_seconds")
      .in("session_id", ids.slice(i, i + 200))
      .limit(5000);
    rows.push(...((data ?? []) as ResponseRow[]));
  }
  return rows
    .map((r) => ({
      skillId: bySession.get(r.session_id) ?? "",
      sessionId: r.session_id,
      correct: r.is_correct,
      at: r.answered_at,
      seconds: r.response_time_seconds,
    }))
    .filter((a) => a.skillId)
    .sort((a, b) => Date.parse(a.at as string) - Date.parse(b.at as string));
}

/** Levels by catalog skill id. Skills with no answers are absent (read them as 0). */
export function levelsBySkill(
  answers: readonly SkillAnswer[],
  nowMs = Date.now()
): Map<string, SkillLevel> {
  const grouped = new Map<string, SkillAnswer[]>();
  for (const a of answers) {
    const list = grouped.get(a.skillId) ?? [];
    list.push(a);
    grouped.set(a.skillId, list);
  }
  const out = new Map<string, SkillLevel>();
  for (const [skillId, list] of grouped) out.set(skillId, levelFromAnswers(list, nowMs));
  return out;
}

export async function loadSkillLevels(clerkId: string): Promise<Map<string, SkillLevel>> {
  return levelsBySkill(await loadSkillAnswers(clerkId));
}
