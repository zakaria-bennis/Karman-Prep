/*
 * A student's skill levels, from two places:
 *   - `student_skill_levels`: the levels the quiz flows save as the Daily 10, practice sets and
 *     Domain quizzes are answered (claude/overnight-quiz-7856ae, rules in src/lib/levels/).
 *     Read when the table exists; decay is applied as of now.
 *   - catalog practice answers saved before those flows (catalog_practice_sessions +
 *     catalog_practice_responses), turned into levels with `levels.ts` (the same rule).
 * Each skill shows the higher of the two. The older lesson map (learn_node_status) is keyed by
 * legacy node ids, not catalog skills, so it is not mapped.
 */
import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/server";
import { clampLevel } from "@/components/portal/skill-levels";
import { decay, levelFromAnswers, type LevelAnswer, type SkillLevel } from "./levels";

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
  // The generated types predate the catalog practice tables, so read them untyped.
  const db = createAdminClient() as unknown as SupabaseClient;
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

/** Levels the quiz flows saved, with decay applied. Empty when the table isn't there yet. */
export async function loadStoredLevels(
  clerkId: string,
  nowMs = Date.now()
): Promise<Map<string, SkillLevel>> {
  const out = new Map<string, SkillLevel>();
  try {
    const db = createAdminClient() as unknown as SupabaseClient;
    const { data, error } = await db
      .from("student_skill_levels")
      .select("skill_id, level, last_practiced_at")
      .eq("student_id", clerkId)
      .limit(500);
    if (error || !data) return out;
    for (const r of data as {
      skill_id: string;
      level: number;
      last_practiced_at: string | null;
    }[]) {
      const last = r.last_practiced_at ? Date.parse(r.last_practiced_at) : null;
      out.set(r.skill_id, decay(clampLevel(r.level), Number.isFinite(last) ? last : null, nowMs));
    }
  } catch {
    /* No table yet: only catalog practice counts. */
  }
  return out;
}

/** The higher level of each skill from the two sources. */
export function withStored(
  computed: ReadonlyMap<string, SkillLevel>,
  stored: ReadonlyMap<string, SkillLevel>
): Map<string, SkillLevel> {
  const out = new Map(computed);
  for (const [skill, level] of stored)
    out.set(skill, Math.max(out.get(skill) ?? 0, level) as SkillLevel);
  return out;
}

export async function loadSkillLevels(clerkId: string): Promise<Map<string, SkillLevel>> {
  const [answers, stored] = await Promise.all([
    loadSkillAnswers(clerkId),
    loadStoredLevels(clerkId),
  ]);
  return withStored(levelsBySkill(answers), stored);
}
