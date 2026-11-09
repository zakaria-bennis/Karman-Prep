/*
 * A student's skill levels, from two places:
 *   - `student_skill_levels`: the levels the quiz flows save as the Daily 10, practice sets and
 *     Domain quizzes are answered (claude/overnight-quiz-7856ae, rules in src/lib/levels/).
 *     Read when the table exists; decay is applied as of now.
 *   - catalog practice answers saved before those flows (catalog_practice_sessions +
 *     catalog_practice_responses), turned into levels with `levels.ts` (the same rule).
 * Each skill shows the higher of the two. The older lesson map (learn_node_status) is keyed by
 * legacy node ids, not catalog skills, so it is not mapped.
 *
 * Levels are per SUB-SKILL (founder, 2026-11-08): every answer carries its question id, and the
 * stored map (src/lib/subskills/map.ts) says which sub-skill that question belongs to. A catalog
 * skill with one sub-skill keeps its own id, so older saved levels for it still count.
 */
import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/server";
import { clampLevel } from "@/components/portal/skill-levels";
import { subSkillOfQuestion } from "@/lib/subskills/map";
import { decay, levelFromAnswers, type LevelAnswer, type SkillLevel } from "./levels";

export interface SkillAnswer extends LevelAnswer {
  skillId: string;
  /** Where the answer's level lives: its question's sub-skill. */
  subSkillId: string;
  seconds: number;
  sessionId: string;
}

type SessionRow = { id: string; skill_id: string };
type ResponseRow = {
  session_id: string;
  question_id: string;
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
      .select("session_id, question_id, is_correct, answered_at, response_time_seconds")
      .in("session_id", ids.slice(i, i + 200))
      .limit(5000);
    rows.push(...((data ?? []) as ResponseRow[]));
  }
  return rows
    .map((r) => ({
      skillId: bySession.get(r.session_id) ?? "",
      subSkillId: subSkillOfQuestion(r.question_id ?? "", bySession.get(r.session_id) ?? ""),
      sessionId: r.session_id,
      correct: r.is_correct,
      at: r.answered_at,
      seconds: r.response_time_seconds,
    }))
    .filter((a) => a.skillId)
    .sort((a, b) => Date.parse(a.at as string) - Date.parse(b.at as string));
}

type RunAnswerRow = {
  run_id: string;
  question_id: string;
  skill_id: string;
  is_correct: boolean;
  used_hint: boolean;
  answered_at: string;
  response_time_seconds: number;
};

/**
 * Answers from the quiz flows' practice sets, Daily 10s and Domain quizzes (`quiz_run_responses`),
 * oldest first, each run as one session. For the mistake log, time spent and personal bests.
 * Levels read these too: runs saved before sub-skills stored their level against the whole
 * skill, so the answers are what place them in sub-skills.
 */
export async function loadRunAnswers(clerkId: string): Promise<SkillAnswer[]> {
  const db = createAdminClient() as unknown as SupabaseClient;
  const { data, error } = await db
    .from("quiz_run_responses")
    .select(
      "run_id, question_id, skill_id, is_correct, used_hint, answered_at, response_time_seconds, quiz_runs!inner(student_id, kind)"
    )
    .eq("quiz_runs.student_id", clerkId)
    .in("quiz_runs.kind", ["daily-ten", "practice-set", "domain-quiz"])
    .order("answered_at", { ascending: true })
    .limit(5000);
  if (error || !data) return [];
  return (data as unknown as RunAnswerRow[]).map((r) => ({
    skillId: r.skill_id,
    subSkillId: subSkillOfQuestion(r.question_id ?? "", r.skill_id),
    sessionId: r.run_id,
    correct: r.is_correct,
    hint: r.used_hint,
    at: r.answered_at,
    seconds: r.response_time_seconds,
  }));
}

/** Levels by sub-skill id. Sub-skills with no answers are absent (read them as 0). */
export function levelsBySubSkill(
  answers: readonly Pick<SkillAnswer, "subSkillId" | "correct" | "at" | "hint">[],
  nowMs = Date.now()
): Map<string, SkillLevel> {
  const grouped = new Map<string, LevelAnswer[]>();
  for (const a of answers) {
    const list = grouped.get(a.subSkillId) ?? [];
    list.push(a);
    grouped.set(a.subSkillId, list);
  }
  const out = new Map<string, SkillLevel>();
  for (const [id, list] of grouped) {
    const time = (at: string | number) => (typeof at === "number" ? at : Date.parse(at));
    const sorted = [...list].sort((x, y) => time(x.at) - time(y.at));
    out.set(id, levelFromAnswers(sorted, nowMs));
  }
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

/** Every sub-skill's level: practice and run answers, and the levels the quiz flows saved. */
export async function loadSkillLevels(clerkId: string): Promise<Map<string, SkillLevel>> {
  const [answers, runs, stored] = await Promise.all([
    loadSkillAnswers(clerkId),
    loadRunAnswers(clerkId),
    loadStoredLevels(clerkId),
  ]);
  return withStored(levelsBySubSkill([...answers, ...runs]), stored);
}
